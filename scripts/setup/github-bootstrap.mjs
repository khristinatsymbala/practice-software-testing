#!/usr/bin/env node
// Creates labels, milestones, issues and the Projects v2 board from issues.mjs.
// Idempotent: existing labels are updated, existing milestones / issues / items are skipped.
// --update also rewrites title, body, labels and milestone of existing issues and milestone descriptions.
// Usage: node scripts/setup/github-bootstrap.mjs [--dry-run] [--update] [--only=labels,milestones,issues,project]
import { execFileSync } from 'node:child_process';
import { milestones, issues } from './issues.mjs';

const REPO = 'khristinatsymbala/practice-software-testing';
const OWNER = REPO.split('/')[0];
const PROJECT_TITLE = 'QA Learning Project';
const DRY = process.argv.includes('--dry-run');
const UPDATE = process.argv.includes('--update');
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
const JUNIOR = {
  L: '1. **Покажи:** Claude пояснює теорію і показує приклад на іншому об\'єкті.\n2. **Разом:** першу частину виконую за каркасом / шаблоном.\n3. **Сама:** решту — самостійно, потім рев\'ю (L2: що добре + не більше 3 зауважень).',
  T: '1. **Покажи:** Claude показує зразок іншого інструменту і пояснює його будову.\n2. **Разом:** для скрипта — каркас із `TODO`, які заповнюю сама.\n3. **Сама:** перевірка на реальних входах і порівняння з еталоном.',
  R: 'Якщо важко почати — попроси Claude поставити 3 навідні питання.',
};
const SELF_REVIEW = {
  L: ['Усі acceptance criteria виконано та перевірено особисто', 'Факти про застосунок підтверджені файлом / запитом / UI', 'Немає секретів і коду з practice-software-testing-main/', 'Можу пояснити рішення без підглядання'],
  T: ['Перевірено на ≥ 2 входах і порівняно з еталоном (ai-log.csv)', 'Запис у docs/ai/toolkit.md', 'Детермінована логіка — у скрипті, мінімальні tools / permissions', 'Інструмент не вигадує ендпоїнти, таблиці, правила'],
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
    `## ✅ Tasks\n${it.type === 'R' ? '- [ ] Заповнити розділи за шаблоном `.github/ISSUE_TEMPLATE/reflection.md`' : it.type === 'T' ? '- [ ] Ручний еталон готовий\n- [ ] Дизайн інструменту\n- [ ] Реалізація\n- [ ] Перевірка на ≥ 2 входах\n- [ ] Запис у toolkit.md і ai-log.csv' : '- [ ] Розібрати теорію\n- [ ] Виконати\n- [ ] Самоперевірка\n- [ ] PR через task-finish'}`,
    `## 🤖 AI Assistance\n${AI_HELP[it.type]}`,
    `## 🧠 Independent Work\n${INDEPENDENT[it.type]}`,
    `## 🌱 Підтримка Junior\n${JUNIOR[it.type]}`,
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
  const existing = DRY ? [] : ghJson(['api', `repos/${REPO}/milestones?state=all&per_page=100`]);
  for (const m of milestones) {
    const description = `Навички: ${m.skills}. Завершено, коли: ${m.done}.`;
    const found = existing.find((x) => x.title === m.title);
    if (found) {
      if (UPDATE && found.description !== description) {
        gh(['api', '-X', 'PATCH', `repos/${REPO}/milestones/${found.number}`, '-f', `description=${description}`]);
        log(`milestone updated: ${m.title}`);
      } else log(`milestone exists: ${m.title}`);
      continue;
    }
    log(`milestone ${m.title}`);
    if (!DRY) gh(['api', `repos/${REPO}/milestones`, '-f', `title=${m.title}`, '-f', `description=${description}`]);
  }
}

function existingIssues() {
  if (DRY) return [];
  return ghJson(['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '300', '--json', 'number,title,labels,milestone'])
    .map((x) => ({ ...x, id: x.title.match(/^\[(\d+\.\d+)\]/)?.[1] }))
    .filter((x) => x.id);
}

function existingIssueNumbers() {
  return Object.fromEntries(existingIssues().map((x) => [x.id, x.number]));
}

function updateIssue(it, current, numbers) {
  const managed = new Set(LABELS.map(([name]) => name));
  const wanted = labelsOf(it);
  const have = current.labels.map((l) => l.name).filter((l) => managed.has(l));
  const args = ['issue', 'edit', String(current.number), '--repo', REPO, '--title', issueTitle(it), '--body-file', '-', '--milestone', milestoneOf(it.id).title];
  const add = wanted.filter((l) => !have.includes(l));
  const remove = have.filter((l) => !wanted.includes(l));
  if (add.length) args.push('--add-label', add.join(','));
  if (remove.length) args.push('--remove-label', remove.join(','));
  gh(args, body(it, numbers));
  log(`issue updated: #${current.number} ${it.id}`);
}

async function syncIssues() {
  const current = Object.fromEntries(existingIssues().map((x) => [x.id, x]));
  const numbers = Object.fromEntries(Object.values(current).map((x) => [x.id, x.number]));
  for (const it of issues) {
    if (numbers[it.id]) {
      if (UPDATE) { updateIssue(it, current[it.id], numbers); await sleep(700); }
      else log(`issue exists: #${numbers[it.id]} ${it.id}`);
      continue;
    }
    if (DRY) { if (it.id === '1.2') log(`\n--- preview ${issueTitle(it)}\nlabels: ${labelsOf(it)}\n\n${body(it, numbers)}\n---\n`); continue; }
    for (let attempt = 1; !numbers[it.id]; attempt++) {
      try {
        const url = gh(['issue', 'create', '--repo', REPO, '--title', issueTitle(it), '--body-file', '-', '--milestone', milestoneOf(it.id).title, '--label', labelsOf(it).join(',')], body(it, numbers));
        numbers[it.id] = Number(url.split('/').pop());
      } catch (e) {
        if (attempt >= 3) throw e;
        // The request may have succeeded server-side despite a network error: re-check before retrying.
        await sleep(5000 * attempt);
        Object.assign(numbers, existingIssueNumbers());
      }
    }
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
  // Read Status options via GraphQL (field-list may return stale data). Replacing options regenerates their IDs
  // and wipes every item's status, so this only runs on a fresh board that still has the default options.
  const status = ghJson(['api', 'graphql', '-f', `query={node(id:"${project.id}"){...on ProjectV2{field(name:"Status"){...on ProjectV2SingleSelectField{id options{name}}}}}}`]).data.node.field;
  const wanted = [['Backlog', 'GRAY'], ['Ready', 'BLUE'], ['In Progress', 'YELLOW'], ['Mentor Review', 'PURPLE'], ['Done', 'GREEN']];
  const missing = wanted.filter(([name]) => !status.options.some((o) => o.name === name));
  if (missing.length && !status.options.some((o) => o.name === 'Backlog')) {
    const opts = wanted.map(([name, color]) => `{name:${JSON.stringify(name)},color:${color},description:""}`).join(',');
    gh(['api', 'graphql', '-f', `query=mutation{updateProjectV2Field(input:{fieldId:"${status.id}",singleSelectOptions:[${opts}]}){projectV2Field{...on ProjectV2SingleSelectField{id}}}}`]);
    log('status options set');
  } else if (missing.length) {
    log(`WARNING: Status is missing ${missing.map((m) => m[0]).join(', ')} — add manually in the UI to keep existing statuses`);
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

  // `gh project item-list` lags behind right after changes, so membership is checked from the issue side.
  const [owner, name] = REPO.split('/');
  const onBoard = (n) => ghJson(['api', 'graphql', '-f', `query={repository(owner:"${owner}",name:"${name}"){issue(number:${n}){projectItems(first:10){nodes{project{number}}}}}}`])
    .data.repository.issue.projectItems.nodes.some((x) => String(x.project.number) === num);
  const numbers = existingIssueNumbers();
  for (const it of issues) {
    const n = numbers[it.id];
    if (!n || onBoard(n)) continue;
    const item = ghJson(['project', 'item-add', num, '--owner', OWNER, '--url', `https://github.com/${REPO}/issues/${n}`, '--format', 'json']);
    const edit = (f, opt) => gh(['project', 'item-edit', '--id', item.id, '--project-id', project.id, '--field-id', f.id, '--single-select-option-id', option(f, opt)]);
    edit(field('Status'), it.deps.length ? 'Backlog' : 'Ready');
    if (!it.review) edit(field('Mentor Review'), 'Not needed');
    log(`project item added #${n} ${it.id}`);
  }
  log(`board: https://github.com/users/${OWNER}/projects/${num}`);
}

if (ONLY.includes('labels')) await syncLabels();
if (ONLY.includes('milestones')) await syncMilestones();
if (ONLY.includes('issues')) await syncIssues();
if (ONLY.includes('project')) await syncProject();
log(`done (${DRY ? 'dry-run' : 'applied'}): ${issues.length} issues, ${milestones.length} milestones, ${LABELS.length} labels`);
