#!/usr/bin/env node
// Creates labels, milestones, issues and the Projects v2 board from issues.mjs.
// Idempotent: existing labels are updated, existing milestones / issues / items are skipped.
// Usage: node scripts/setup/github-bootstrap.mjs [--dry-run] [--only=labels,milestones,issues,project]
import { execFileSync } from 'node:child_process';
import { milestones, issues } from './issues.mjs';

const REPO = 'khristinatsymbala/practice-software-testing';
const OWNER = REPO.split('/')[0];
const PROJECT_TITLE = 'QA Learning Project';
const DRY = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : ['labels', 'milestones', 'issues', 'project'];

const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] }).trim();
const ghJson = (args) => JSON.parse(gh(args) || 'null');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const LABELS = [
  ['area:manual', '1d76db', 'Manual QA'],
  ['area:api', '0e8a16', 'API testing'],
  ['area:sql', 'fbca04', 'Database testing'],
  ['area:e2e', '5319e7', 'Playwright / UI automation'],
  ['area:ai-toolkit', 'd93f0b', 'Claude Code skills, agents, hooks, scripts'],
  ['area:ci', '006b75', 'GitHub Actions'],
  ['area:portfolio', 'c5def5', 'README, presentation'],
  ['priority:P1', 'b60205', 'Critical for milestone'],
  ['priority:P2', 'e99695', 'Nice to have'],
  ['priority:P3', 'f9d0c4', 'Optional'],
  ['type:learning', 'bfdadc', 'Learning task'],
  ['type:toolkit', 'fef2c0', 'Toolkit task 🤖'],
  ['type:reflection', 'd4c5f9', 'Reflection'],
  ['review-feedback', '000000', '★ qa-reviewer feedback required; mentor approve optional'],
];

const milestoneOf = (id) => milestones[Number(id.split('.')[0]) - 1];
const issueTitle = (it) => `[${it.id}] ${it.type === 'T' ? '🤖 ' : ''}${it.review ? '★ ' : ''}${it.title}`;
const labelsOf = (it) => {
  const m = milestoneOf(it.id);
  const set = new Set([`area:${it.area || m.area}`, `priority:${it.p}`]);
  set.add({ L: 'type:learning', T: 'type:toolkit', R: 'type:reflection' }[it.type]);
  if (it.type === 'T') set.add('area:ai-toolkit');
  if (it.review) set.add('review-feedback');
  return [...set];
};

const AI_HELP = {
  L: '- L0 — пояснення концепцій з розділу Theory на старті.\n- L1 — підказка, якщо застрягла > 20–30 хв.\n- L2 — рев\'ю після власної спроби. L3 — лише на явний запит.\n- Кожне використання L1+ записати в PR (розділ «AI usage»).',
  T: '- Дизайн інструменту (входи, виходи, tools, що винести у скрипт) — сама.\n- L0 — анатомія skill / agent / hook; L2 — рев\'ю промпту та скрипту.\n- Порівняння з ручним еталоном — сама.',
  R: '- ШІ можна використати лише для структурування вже написаних думок.',
};
const INDEPENDENT = {
  L: 'Виконати задачу самостійно; ШІ — лише за рівнями з розділу AI Assistance.',
  T: 'Ручний еталон (з попередньої задачі), дизайн інструменту, перевірка результату на ≥ 2 входах.',
  R: 'Повністю самостійно.',
};
const SELF_REVIEW = {
  L: ['Усі acceptance criteria виконано та перевірено особисто', 'Факти про застосунок підтверджені файлом / запитом / UI', 'Немає секретів і коду з practice-software-testing-main/', 'Можу пояснити рішення без підглядання'],
  T: ['Перевірено на ≥ 2 входах і порівняно з еталоном (ai-log.md)', 'Запис у docs/ai/toolkit.md', 'Детермінована логіка — у скрипті, мінімальні tools / permissions', 'Інструмент не вигадує ендпоїнти, таблиці, правила'],
  R: ['Чесно описано помилки та їх причини', 'Є конкретні дії на наступну ітерацію'],
};

function body(it, numbers) {
  const m = milestoneOf(it.id);
  const deps = it.deps.length
    ? it.deps.map((d) => `- [ ] ${numbers[d] ? `#${numbers[d]}` : d} — ${issues.find((x) => x.id === d).title}`).join('\n')
    : '- Немає';
  const list = (arr) => arr.map((x) => `- [ ] ${x}`).join('\n');
  const parts = [
    `> **Milestone:** ${m.title} · **Priority:** ${it.p} · **Type:** ${{ L: 'learning', T: 'toolkit 🤖', R: 'reflection' }[it.type]}${it.review ? ' · ★ review feedback' : ''}`,
    `## 🎯 Learning Goal\n${it.type === 'R' ? 'Осмислити результати milestone і сформулювати покращення.' : `${it.title}. Навички milestone: ${m.skills}.`}`,
    `## 📋 Prerequisites\n${deps}`,
  ];
  if (it.theory) parts.push(`## 📚 Theory\n${it.theory}. Попроси Claude L0-пояснення перед стартом.`);
  if (it.type === 'T') parts.push('## 🛠 Tool Design\n- **Входи:**\n- **Виходи:**\n- **Tools / permissions:**\n- **Детермінована частина (скрипт):**');
  parts.push(
    `## ✅ Tasks\n${it.type === 'R' ? '- [ ] Заповнити розділи за шаблоном `.github/ISSUE_TEMPLATE/reflection.md`' : it.type === 'T' ? '- [ ] Ручний еталон готовий\n- [ ] Дизайн інструменту\n- [ ] Реалізація\n- [ ] Перевірка на ≥ 2 входах\n- [ ] Запис у toolkit.md і ai-log.md' : '- [ ] Розібрати теорію\n- [ ] Виконати\n- [ ] Самоперевірка\n- [ ] PR через task-finish'}`,
    `## 🤖 AI Assistance\n${AI_HELP[it.type]}`,
    `## 🧠 Independent Work\n${INDEPENDENT[it.type]}`,
    `## 📦 Deliverables\n- ${it.deliverable}`,
    `## 🏁 Acceptance Criteria\n${list(it.ac)}`,
    `## 🔍 Self-Review\n${list(SELF_REVIEW[it.type])}`,
  );
  if (it.review) parts.push('## 🧑‍🏫 Mentor Review\n- [ ] Фідбек `qa-reviewer` отримано та опрацьовано (виправлено / відхилено з причиною)\n- [ ] Mentor approve: отримано / пропущено\n\nБудь готова пояснити: чому цей підхід; які альтернативи; що перевірила сама; де використала ШІ і як перевірила; що лишилось; що покращила б.');
  parts.push('## 💭 Reflection\n<!-- Після merge: що зрозуміла, які помилки зробила, що покращити -->');
  return parts.join('\n\n');
}

async function syncLabels() {
  for (const [name, color, description] of LABELS) {
    log(`label ${name}`);
    if (!DRY) gh(['label', 'create', name, '--repo', REPO, '--color', color, '--description', description, '--force']);
  }
}

async function syncMilestones() {
  const existing = DRY ? [] : ghJson(['api', `repos/${REPO}/milestones?state=all&per_page=100`]).map((x) => x.title);
  for (const m of milestones) {
    if (existing.includes(m.title)) { log(`milestone exists: ${m.title}`); continue; }
    log(`milestone ${m.title}`);
    if (!DRY) gh(['api', `repos/${REPO}/milestones`, '-f', `title=${m.title}`, '-f', `description=Навички: ${m.skills}. Завершено, коли: ${m.done}.`]);
  }
}

function existingIssueNumbers() {
  const numbers = {};
  if (DRY) return numbers;
  for (const x of ghJson(['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '300', '--json', 'number,title'])) {
    const id = x.title.match(/^\[(\d+\.\d+)\]/)?.[1];
    if (id) numbers[id] = x.number;
  }
  return numbers;
}

async function syncIssues() {
  const numbers = existingIssueNumbers();
  for (const it of issues) {
    if (numbers[it.id]) { log(`issue exists: #${numbers[it.id]} ${it.id}`); continue; }
    if (DRY) { if (it.id === '1.2') log(`\n--- preview ${issueTitle(it)}\nlabels: ${labelsOf(it)}\n\n${body(it, numbers)}\n---\n`); continue; }
    const url = gh(['issue', 'create', '--repo', REPO, '--title', issueTitle(it), '--body-file', '-', '--milestone', milestoneOf(it.id).title, '--label', labelsOf(it).join(',')], body(it, numbers));
    numbers[it.id] = Number(url.split('/').pop());
    log(`issue #${numbers[it.id]} ${it.id}`);
    await sleep(1500); // stay below secondary rate limits for content creation
  }
  return numbers;
}

async function syncProject() {
  if (DRY) { log('project: skipped in dry-run'); return; }
  let project = ghJson(['project', 'list', '--owner', OWNER, '--format', 'json', '--limit', '100']).projects.find((p) => p.title === PROJECT_TITLE);
  if (!project) {
    project = ghJson(['project', 'create', '--owner', OWNER, '--title', PROJECT_TITLE, '--format', 'json']);
    gh(['project', 'link', String(project.number), '--owner', OWNER, '--repo', REPO]);
    log(`project created #${project.number}`);
  }
  const num = String(project.number);
  let fields = ghJson(['project', 'field-list', num, '--owner', OWNER, '--format', 'json', '--limit', '50']).fields;
  const status = fields.find((f) => f.name === 'Status');
  const wanted = [['Backlog', 'GRAY'], ['Ready', 'BLUE'], ['In Progress', 'YELLOW'], ['Mentor Review', 'PURPLE'], ['Done', 'GREEN']];
  if (status.options.map((o) => o.name).join() !== wanted.map((w) => w[0]).join()) {
    const opts = wanted.map(([name, color]) => `{name:${JSON.stringify(name)},color:${color},description:""}`).join(',');
    gh(['api', 'graphql', '-f', `query=mutation{updateProjectV2Field(input:{fieldId:"${status.id}",singleSelectOptions:[${opts}]}){projectV2Field{...on ProjectV2SingleSelectField{id}}}}`]);
    log('status options updated');
  }
  for (const [name, options] of [['Mentor Review', 'Approved,Skipped,Not needed'], ['Size', 'S,M,L']]) {
    if (!fields.some((f) => f.name === name)) {
      gh(['project', 'field-create', num, '--owner', OWNER, '--name', name, '--data-type', 'SINGLE_SELECT', '--single-select-options', options]);
      log(`field created: ${name}`);
    }
  }
  fields = ghJson(['project', 'field-list', num, '--owner', OWNER, '--format', 'json', '--limit', '50']).fields;
  const field = (name) => fields.find((f) => f.name === name);
  const option = (f, name) => f.options.find((o) => o.name === name).id;

  const numbers = existingIssueNumbers();
  const items = ghJson(['project', 'item-list', num, '--owner', OWNER, '--format', 'json', '--limit', '300']).items;
  const byNumber = Object.fromEntries(items.filter((x) => x.content?.number).map((x) => [x.content.number, x]));
  for (const it of issues) {
    const n = numbers[it.id];
    if (!n) continue;
    let item = byNumber[n];
    if (!item) item = ghJson(['project', 'item-add', num, '--owner', OWNER, '--url', `https://github.com/${REPO}/issues/${n}`, '--format', 'json']);
    const edit = (f, opt) => gh(['project', 'item-edit', '--id', item.id, '--project-id', project.id, '--field-id', f.id, '--single-select-option-id', option(f, opt)]);
    if (!item.status) edit(field('Status'), it.deps.length ? 'Backlog' : 'Ready');
    if (!it.review && !item['mentor Review']) edit(field('Mentor Review'), 'Not needed');
    log(`project item #${n} ${it.id}`);
  }
  log(`board: https://github.com/users/${OWNER}/projects/${num}`);
}

if (ONLY.includes('labels')) await syncLabels();
if (ONLY.includes('milestones')) await syncMilestones();
if (ONLY.includes('issues')) await syncIssues();
if (ONLY.includes('project')) await syncProject();
log(`done (${DRY ? 'dry-run' : 'applied'}): ${issues.length} issues, ${milestones.length} milestones, ${LABELS.length} labels`);
