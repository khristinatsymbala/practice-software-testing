# QA Learning Plan — навчальний петпроєкт із менторським рев'ю та AI QA Toolkit

> Дата: 2026-10-24. Статус: **v5 — Junior з практикою, фокус на ШІ / API / SQL / автоматизації**.
> Технічна ціль — у [QA_PROJECT_PLAN.md](QA_PROJECT_PLAN.md) (обсяги в цьому документі мають пріоритет), факти про застосунок — у [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md).
> Зміни у v3: скіли покривають більшість ручної роботи; на кожну активність вручну виконується лише один еталонний приклад.
> Зміни у v5 (2026-10-26): фокус на ШІ, API, SQL, автоматизації; M2 — lean (прибрано 2.4, 2.5, 2.9, 2.10); журнал ШІ — CSV з поділом полів (ШІ — факти, я — судження), нова задача 1.8 (скіл `ai-log`); stretch 6.6 (MCP).
> Зміни у v4: модель «Покажи → разом → сама»; рівні допомоги для Junior; обсяги зменшено (якість важливіша за кількість); `qa-reviewer` і `task-start/finish` перенесено після першого досвіду рев'ю; додано 1.7 (перегляд CLAUDE.md) і 5.0 (основи TypeScript); найскладніші інструменти — stretch (P3).

## 1. Як працює процес

**Цикл задачі:**
`Backlog → Ready → In Progress → Mentor Review → Done`

1. **Ready:** залежності закриті.
2. **In Progress:** скіл `task-start` створює гілку, переводить статус і показує мету та acceptance criteria задачі.
3. **Mentor Review:** скіл `task-finish` проганяє валідатори, викликає `qa-reviewer` і відкриває PR за шаблоном.
   - Для ★-задач фідбек перевірки обов'язковий. На кожне зауваження — відповідь: виправлено або відхилено з причиною.
   - Approve ментора — за бажанням. Поле `Mentor Review`: `Approved` / `Skipped` / `Not needed`.
4. **Done:** merge PR. Умови: виконано acceptance criteria, відмічено self-review, для ★ — опрацьовано фідбек.

**Модель навчання для Junior — «Покажи → разом → сама»:**
1. **Покажи (I do):** Claude показує приклад на **іншому** об'єкті (не на моїй задачі) і пояснює кожен крок.
2. **Разом (We do):** виконую першу частину задачі за каркасом / шаблоном, Claude підказує.
3. **Сама (You do):** решту роблю самостійно, Claude робить рев'ю.

Кроки — маленькі (≤ 1–2 год). Нові терміни пояснюються при першій появі й потрапляють у конспект.

**Рівні допомоги ШІ:**

| Рівень | Що робить ШІ | Чого НЕ робить | Коли |
|---|---|---|---|
| L0 Concept | Пояснює теорію + приклад на іншому об'єкті | Не виконує мою задачу | Старт задачі (за замовчуванням) |
| L1 Hint | Дає каркас / шаблон і навідні питання для конкретного кроку | Не заповнює каркас за мене | Застрягла > 20–30 хв |
| L2 Review | Що добре + **не більше 3** ключових зауважень; решта — у список «наступний рівень» | Не виправляє сам | Після моєї спроби |
| L3 Solution | Повне рішення з поясненням кожного рядка | — | Лише на явний запит |

**Принцип «еталон → скіл → масштаб»:**
1. Один приклад роботи виконую вручну — це еталон.
2. Створюю скіл (або агент / скрипт), який відтворює еталон.
3. Скілом виконую решту обсягу, а результати рецензую сама.

**Definition of Done для 🤖-задач:**
1. Файл у `.claude/skills/` / `.claude/agents/` / `scripts/` / `.claude/settings.json`.
2. Перевірено на ≥ 2 входах; порівняно з еталоном; результат записано в `docs/ai/ai-log.csv`.
3. Запис у `docs/ai/toolkit.md`: призначення, входи, виходи, обмеження, як перевірено.
4. Детермінована логіка (підрахунок, валідація, запуск, парсинг) — у скриптах, а не в промпті.
5. Скіл не вигадує факти: кожне твердження про застосунок має посилання на файл або результат запиту.

## 2. Структура AI QA Toolkit

```
.claude/
├── skills/<name>/SKILL.md     # інструкції; викликають scripts/
├── agents/<name>.md           # субагенти з мінімальними tools (read-only, де можливо)
└── settings.json              # hooks, permissions
scripts/                       # bash / Node помічники: їх викликають скіли, CI і я
scripts/eval/                  # harness для оцінки інструментів (M6)
docs/ai/
├── toolkit.md                 # каталог
├── ai-log.csv                 # журнал використання та верифікації
└── toolkit-eval.md            # метрики якості (M6)
```

### Покриття ручної роботи інструментами

| Активність | Вручну (еталон) | Інструмент |
|---|---|---|
| Запуск / seed / перемикання sprint | — | `qa-env` + `env.sh` |
| Старт і завершення задачі, PR | — | `task-start`, `task-finish`, `qa-reviewer` |
| Журнал ШІ | 3 колонки (перевірка, рішення, прогалина) | `ai-log` + `ai-log-metrics.js` |
| Аналіз вимог | 1 фіча | `requirements-analyst` |
| Ризик-аналіз і test strategy | — (рецензія, мої рішення) | `risk-assessment` |
| Чеклісти | 1 фіча | `checklist` |
| Тест-кейси | 5–8 критичних (Auth) | `test-case-design` |
| Exploratory | сама сесія | `exploratory-session` |
| Bug reports | 1 звіт | `bug-report` + `validate-bug-reports.js`, `bug-evidence` |
| Traceability matrix | — | `traceability` + `build-traceability.js` |
| Summary report, звірка з відомими багами | мапінг багів | `test-summary` + `compare-known-bugs.js` |
| Дослідження API | 2 ресурси | `api-explorer`, `api-coverage` |
| Postman-запити та CRUD | Auth + Brand CRUD | `api-test` + `lint-postman.js` |
| JSON schema | — | `json-schema` |
| Негативні API-кейси | — (рецензія) | `api-negative-matrix` |
| Схема БД | ER-нотатки | `db-schema-analyst` |
| SQL-запити та перевірки | SELECT / JOIN / частина integrity | `sql-check` + `run-sql.sh` |
| Side effects API в БД | — | `db-snapshot`, `api-db-verify` |
| Page Objects | Base / Header / Login | `page-object` |
| Testability (відсутні `data-test`) | — | `locator-audit.js` |
| E2E-тести | smoke + каталог | `test-from-case` |
| Рев'ю тестів | — | `e2e-test-reviewer` + хук |
| Аналіз падінь і flaky | рецензія тріажу | `failure-triager`, `flaky-check.sh` |
| Звіти та метрики | — | `report-summary.js`, `collect-metrics.js` |

## 3. Milestones та Issues

Легенда:
- ★ — потрібен фідбек перевірки;
- 🤖 — задача тулкіта;
- **Deps** — номери задач, які мають бути закриті до старту;
- P1 — критично, P2 — бажано, P3 — опційно.

### M1. AI QA Toolkit Foundation

**Навички:** анатомія Claude Code (CLAUDE.md, skills, subagents, hooks, permissions), `gh` CLI, bash.
**Критерії завершення:** застосунок піднімається однією командою; повний цикл задачі (start → PR → фідбек) працює через скіли.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 1.1 | `CLAUDE.md`, рівні L0–L3, журнал ШІ | `CLAUDE.md`, `docs/ai/ai-log.csv` | Контекст, команди, правила, обмеження | — | P1 |
| 1.2 ★🤖 | Скіл `qa-env` + `scripts/env.sh` (start / seed / status / switch-sprint) | скіл + скрипт | `status` перевіряє UI, API, DB; руйнівні дії питають підтвердження | 1.1 | P1 |
| 1.3 ★🤖 | Агент `qa-reviewer` (read-only): PR vs acceptance criteria + конвенції → фідбек без виправлень. Виконується **паралельно з M2**: до цього рев'ю робить Claude напряму (L2) | `.claude/agents/qa-reviewer.md` | Зауваження з посиланнями на рядки на реальному PR | 2.7 | P1 |
| 1.4 🤖 | Скіли `task-start` / `task-finish` (`gh`: branch, Status, валідатори, `qa-reviewer`, PR). Лише після ≥ 3 ручних Git-циклів | 2 скіли | Повний цикл виконано на самій задачі 1.4 | 1.3 | P1 |
| 1.5 | Каталог тулкіта та шаблон нового інструменту | `docs/ai/toolkit.md` | Описано наявні інструменти | 1.2 | P1 |
| 1.6 | Рефлексія M1 | issue | — | 1.5 | P2 |
| 1.7 | Перегляд `CLAUDE.md` після аналізу вимог (зауваження «наступного рівня» з рев'ю 1.1) | `CLAUDE.md` v2 | Немає дублів і неперевірюваних правил; є DoD для змін | 2.1 | P2 |
| 1.8 🤖 | Скіл `ai-log` + `scripts/ai-log-metrics.js`: Claude додає рядок у `docs/ai/ai-log.csv` (факти), я — 3 колонки (перевірка, рішення, прогалина) | скіл + скрипт | Запис додається однією командою; скрипт рахує % accepted / corrected / rejected | 1.1 | P1 |

### M2. Manual QA (lean)

**Фокус:** ручне тестування в мінімальному обсязі — як **тест-база для автоматизації** і **еталон для оцінки ШІ**. Базу ручного QA вже маю з роботи, тож теорія коротка, акцент на AI-інструментах і скриптах.
**Навички:** AI-асистований аналіз вимог і тест-дизайн, рев'ю результатів ШІ, bug reports на with-bugs, генерація трасування і метрик.
**Критерії завершення:** ≥ 4 чеклісти (згенеровані), ≥ 15 тест-кейсів (5–8 вручну), ≥ 4 bug reports, матриця згенерована.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 2.1 | Аналіз вимог вручну: фіча Auth (~30 хв) | `docs/manual/requirements-analysis.md` | ≥ 3 питання / неоднозначності | 1.2 | P1 |
| 2.2 🤖 | Агент `requirements-analyst` → решта фіч зі scope | агент + доповнений аналіз | На Auth порівняно з 2.1: додатково знайдене / пропущене / вигадане | 2.1 | P1 |
| 2.3 ★🤖 | Скіл `risk-assessment` → ризик-матриця + one-page test strategy (чернетка ШІ, моє рев'ю) | скіл, `risk-matrix.md`, `test-strategy.md` | Оцінки ризиків переглянуто; scope in/out і пріоритети — мої рішення | 2.2 | P1 |
| 2.6 🤖 | Скіл `checklist`: еталон Auth вручну (~15 хв) → чеклісти решти фіч | скіл + `checklists/*.md` | ≥ 4 фічі; на Auth порівняно з еталоном | 2.3 | P1 |
| 2.7 ★ | Тест-дизайн вручну: 5–8 критичних кейсів Auth (EP / BVA, state transition для lockout) | `test-cases/auth.md` | Для кожного кейсу — техніка; є граничні значення | 2.6 | P1 |
| 2.8 🤖 | Скіл `test-case-design` → Cart, Checkout (decision table оплат), Account | скіл + 3 файли | ≥ 10 кейсів; частка прийнятого без правок у ai-log | 2.7 | P1 |
| 2.11 🤖 | Скіл `exploratory-session`: charter з турів → нотатки → findings | скіл | Використано в 2.12 | 2.8 | P2 |
| 2.12 | Exploratory-сесія на sprint5-with-bugs | `docs/manual/exploratory/*.md` | ≥ 1 сесія з charter | 2.11 | P1 |
| 2.13 🤖 | 1 bug report вручну → скіл `bug-report` + `scripts/validate-bug-reports.js` | скіл + скрипт | Валідатор ловить неповний звіт | 2.12 | P1 |
| 2.14 ★ | Bug reports через скіл | `docs/manual/bug-reports/` | ≥ 4 звіти; валідатор зелений; кожен відтворено особисто | 2.13 | P1 |
| 2.15 🤖 | `scripts/build-traceability.js` + скіл `traceability` | скрипт + скіл + `traceability-matrix.md` | Матрицю згенеровано, а не написано вручну | 2.14 | P1 |
| 2.16 🤖 | Скіл `test-summary` + `scripts/compare-known-bugs.js` | скіл + скрипт + `test-summary-report.md` | Метрика «знайдено X з 94»; мапінг перевірено вручну | 2.15 | P1 |
| 2.17 | Рефлексія M2 | issue | — | 2.16 | P2 |

Прибрано у v5 (issues закрито як not planned): 2.4 (злито з 2.3), 2.5 (злито з 2.6), 2.9–2.10 (ручне виконання тест-кейсів — є на роботі).

### M3. API Testing (Postman)

**Навички:** HTTP, REST, JWT, CRUD, змінні та скрипти Postman, assertions, JSON schema, Newman, покриття API.
**Критерії завершення:** ≥ 35 запитів з assertions, ≥ 25 % негативних, CRUD для ≥ 2 сутностей, покриття ендпоїнтів виміряне.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 3.1 | HTTP-основи; Swagger вручну для Auth і Products | `api/notes/endpoints-map.md` | Розбіжності Swagger vs routes зафіксовано | 1.2 | P1 |
| 3.2 🤖 | Агент `api-explorer`: ендпоїнт → controller → FormRequest → правила та статуси з посиланнями | агент | 3 ендпоїнти звірено з реальними відповідями | 3.1 | P1 |
| 3.3 🤖 | `scripts/api-coverage.js` + скіл `api-coverage`: routes / Swagger vs колекція → покриття ендпоїнтів і методів | скрипт + скіл | Звіт покриття генерується; використовується в 3.12 | 3.2 | P1 |
| 3.4 | Postman: environment, структура, змінні | `api/postman/*.json` | Без хардкоду | 3.1 | P1 |
| 3.5 ★ | Auth-flow вручну (JWT, скрипти) | папка `Auth` | Пояснено JWT, refresh, logout | 3.4 | P1 |
| 3.6 | CRUD Brand вручну | папка `Brands` | C → R → U → D → 404 | 3.5 | P1 |
| 3.7 🤖 | Скіл `api-test` + `scripts/lint-postman.js` → CRUD Category і Product, сценарій покупця | скіл + скрипт + запити | Лінтер зелений; запити відрецензовано | 3.6 | P1 |
| 3.8 🤖 | Скіл `json-schema`: реальна відповідь → JSON schema → assertion у колекції | скіл | Schema-перевірки для ≥ 3 ресурсів; одну навмисно зламано для перевірки | 3.7 | P3 |
| 3.9 🤖 | Скіл `api-negative-matrix`: правила з `api-explorer` → матриця (missing / invalid type / boundary / auth / role) → запити через `api-test` | скіл + `api/notes/negative-matrix.md` | Кожен рядок матриці має джерело правила | 3.7, 3.2 | P1 |
| 3.10 ★ | Негативні сценарії | папки `Negative` | ≥ 25 % негативних; пояснено 401 vs 403 vs 422 | 3.9 | P1 |
| 3.11 | Newman локально | `api/postman/README.md` | Проходить після `migrate:fresh --seed` | 3.10 | P1 |
| 3.12 | Рефлексія M3 (з метрикою покриття з 3.3) | issue | — | 3.11 | P2 |

### M4. Database Testing (SQL)

**Навички:** ER-схема, SELECT, JOIN, GROUP BY / HAVING, підзапити, integrity, звірка API ↔ БД, side effects.
**Критерії завершення:** ≥ 15 запитів, ≥ 5 integrity-перевірок, ключові API-сценарії підтверджено в БД.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 4.1 ★ | Підключення до БД, ER-нотатки вручну | `sql/README.md` | Пояснено ключові зв'язки | 1.2 | P1 |
| 4.2 🤖 | Агент `db-schema-analyst`: міграції → ER (mermaid), «де зберігається X» | агент | ER звірено з `database-model.png` і 4.1 | 4.1 | P3 |
| 4.3 | SELECT вручну | `sql/01-select-basics.sql` | ≥ 4 запити | 4.1 | P1 |
| 4.4 | JOIN вручну | `sql/02-joins.sql` | ≥ 4 запити | 4.3 | P1 |
| 4.5 🤖 | `scripts/run-sql.sh` (PASS / FAIL за правилом «0 рядків») + скіл `sql-check` (питання → запит з поясненням → виконання) | скрипт + скіл | Запити 4.3–4.4 проганяються runner'ом | 4.4 | P1 |
| 4.6 | Агрегації та звірка з `/reports/*` (сама, скіл — для рев'ю) | `sql/03-aggregations.sql` | ≥ 1 звіт API підтверджено або спростовано | 4.5, 3.4 | P1 |
| 4.7 ★ | Integrity: 2 перевірки вручну, решта через `sql-check` | `sql/04-integrity-checks.sql` | ≥ 5 перевірок; аномалії → bug report | 4.5 | P1 |
| 4.8 🤖 | `scripts/db-snapshot.sh` + скіл `db-snapshot`: кількість рядків / контрольні суми до і після операції → diff | скрипт + скіл | Diff показує side effects 1 checkout | 4.5 | P1 |
| 4.9 🤖 | Скіл `api-db-verify`: Postman-сценарій / ID → відповідні post-API перевірки + snapshot diff | скіл | Працює для register, CRUD, checkout | 4.8, 3.7 | P1 |
| 4.10 | Перевірки після API-операцій | `sql/05-post-api-checks.sql` | Посилання в матриці | 4.9 | P1 |
| 4.11 | Рефлексія M4 | issue | — | 4.10 | P2 |

### M5. Playwright + TypeScript + POM

**Навички:** TypeScript, конфіг, локатори, web-first assertions, POM, fixtures, faker, trace viewer, flaky-аналіз, testability.
**Критерії завершення:** ≥ 12 тестів, 0 flaky у 3 прогонах, без `waitForTimeout`; тести мають теги TC-ID.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 5.0 | Основи TypeScript для тестувальника: типи, `async/await`, класи, модулі | `notes/05-playwright/typescript-basics.md` + вправи в пісочниці | Можу пояснити `async/await` і написати клас із методом | 1.2 | P1 |
| 5.1 | Ініціалізація (потрібне погодження на встановлення) | `package.json`, `playwright.config.ts` | Перший тест проходить | 5.0 | P1 |
| 5.2 | Smoke вручну: локатори й assertions | `smoke.spec.ts` | Лише `getByTestId` / `getByRole` | 5.1 | P1 |
| 5.3 ★ | POM вручну: BasePage, Header, LoginPage | `e2e/pages/*` | Без assertions у page objects | 5.2 | P1 |
| 5.4 🤖 | Скіл `page-object`: Angular-шаблон → `data-test` → POM за конвенціями 5.3 | скіл | ≥ 3 сторінки; кожен локатор існує в шаблоні | 5.3 | P1 |
| 5.5 🤖 | `scripts/locator-audit.js`: інтерактивні елементи без `data-test` → testability-звіт | скрипт + звіт | Знахідки переглянуто; значущі → bug reports | 5.4 | P3 |
| 5.6 | Fixtures + API-логін (`storageState`) | `e2e/fixtures/*` | Авторизовані тести без UI-логіну | 5.4, 3.5 | P1 |
| 5.7 | Тестові дані: faker, data-driven | `e2e/data/*` | Параметризовані негативні кейси | 5.6 | P1 |
| 5.8 | Каталог вручну | `catalog.spec.ts` | P1-кейси каталогу | 5.7 | P1 |
| 5.9 🤖 | Скіл `test-from-case`: TC-ID → spec на наявних POM / fixtures з тегом `@TC-…` → cart, checkout, account | скіл + spec-файли | ≥ 6 тестів; теги підхоплює `build-traceability.js` | 5.8, 2.8 | P1 |
| 5.10 🤖 | Агент `e2e-test-reviewer` + хук `PostToolUse` (`tsc --noEmit`, заборонені патерни) | агент + `settings.json` | Хук блокує `waitForTimeout`; зауваження опрацьовано | 5.9 | P1 |
| 5.11 🤖 | Агент `failure-triager`: JSON-звіт / trace / error-context → app bug / test bug / flaky / env | агент | Класифікацію перевірено на ≥ 5 падіннях | 5.9 | P1 |
| 5.12 🤖 | Скіл `bug-evidence` + `scripts/capture-evidence.ts`: кроки → скриншот, console, HAR → вкладення до bug report | скіл + скрипт | Доповнено ≥ 3 bug reports з M2 | 5.6, 2.14 | P3 |
| 5.13 🤖 | `scripts/flaky-check.sh`: `--repeat-each` + підсумок нестабільних тестів | скрипт | Звіт генерується | 5.9 | P1 |
| 5.14 ★ | Діагностика: flaky-check на sprint5 + прогін на with-bugs із тріажем | `docs/automation/failure-analysis.md` | 0 flaky; падіння зіставлено з bug reports | 5.11, 5.13 | P1 |
| 5.15 | Рефлексія M5 | issue | — | 5.14 | P2 |

### M6. AI QA Toolkit: Evaluation & Packaging

**Навички:** оцінка AI-інструментів (golden datasets, precision / recall), ітеративне покращення, пакування.
**Критерії завершення:** метрики до і після покращення; plugin встановлюється в чистий проєкт.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 6.1 🤖 | Eval harness `scripts/eval/`: прогін інструменту на фікстурах → порівняння з golden (ручні еталони) → метрики | harness | Працює для ≥ 1 інструменту | 2.16, 5.11 | P1 |
| 6.2 ★ | Оцінка ≥ 3 інструментів (наприклад, `requirements-analyst`, `test-case-design`, `failure-triager`) | `docs/ai/toolkit-eval.md` | Метрики та перелік «галюцинацій» | 6.1 | P1 |
| 6.3 🤖 | Покращення 2 найслабших + повторний замір | оновлені інструменти | Метрики до / після | 6.2 | P1 |
| 6.4 🤖 | Plugin `qa-toolkit/` (skills, agents, hooks, scripts) без дублювання з `.claude/` | `qa-toolkit/.claude-plugin/plugin.json` | Встановлено в порожній проєкт, ≥ 3 інструменти працюють | 6.3 | P3 |
| 6.5 | Рефлексія M6 | issue | — | 6.4 | P2 |
| 6.6 🤖 | MCP: підключити зовнішній сервіс до Claude Code на реальній задачі (кандидати: Playwright MCP для дослідження UI, MCP до БД, Google Sheets) | конфіг MCP + приклад у `ai-log` | Пояснено, коли MCP кращий за скрипт / скіл; є приклад використання | 6.3 | P3 |

### M7. CI & Portfolio

**Навички:** GitHub Actions (jobs, кеш, artifacts, тригери, secrets), звіти, документація, презентація.
**Критерії завершення:** зелений CI зі звітами; README дає змогу запустити проєкт з нуля.

| # | Задача | Deliverable | Acceptance | Deps | P |
|---|---|---|---|---|---|
| 7.1 | Статичні перевірки: typecheck, `lint-postman`, `validate-bug-reports`, `build-traceability --check` | `qa.yml` (v1) | Запуск на push / PR | 5.1, 3.7, 2.15 | P1 |
| 7.2 | Підняття застосунку в CI через `scripts/env.sh` (checkout upstream, compose, seed, healthcheck) | `qa.yml` (v2) | API та UI відповідають | 7.1 | P1 |
| 7.3 ★ | Jobs API (Newman) + E2E + SQL integrity + artifacts | `qa.yml` (v3) | Звіти завантажуються при падінні | 7.2, 3.11, 4.7, 5.14 | P1 |
| 7.4 🤖 | `scripts/report-summary.js`: JUnit / JSON → markdown у `$GITHUB_STEP_SUMMARY` | скрипт | Summary видно в Actions | 7.3 | P1 |
| 7.5 🤖 | Claude у PR-рев'ю через GitHub Action з `qa-reviewer` (secret `ANTHROPIC_API_KEY`, платно) | workflow | Коментар рев'ю на PR | 7.3, 1.3 | P3 |
| 7.6 🤖 | `scripts/collect-metrics.js` → таблиця метрик для README | скрипт | Метрики генеруються | 7.3 | P2 |
| 7.7 | README-портфоліо з розділом AI QA Toolkit | `README.md`, `docs/images/` | Метрики, приклади, обмеження | 7.6, 6.2 | P1 |
| 7.8 ★ | Фінальна презентація | `docs/final-presentation.md` | 10-хвилинне демо | 7.7 | P1 |
| 7.9 | Підсумкова рефлексія | issue | — | 7.8 | P1 |

**Підсумок:** 75 активних issues, з них 🤖 — 35, ★ — 14. Stretch (P3, за бажанням): 3.8, 4.2, 5.5, 5.12, 6.4, 6.6, 7.5.

**Підтримка Junior у 🤖-задачах:** для скриптів Claude дає каркас з `TODO` і пояснює структуру; для скілів / агентів — приклад іншого інструменту як зразок.

**Точки перевірки (★):** 1.2, 1.3, 2.3, 2.7, 2.14, 3.5, 3.10, 4.1, 4.7, 5.3, 5.14, 6.2, 7.3, 7.8.

**Критичний шлях:** M1 → M2 → M3 → (M4 ∥ M5) → M6 → 7.3 → 7.8. M4 (4.1–4.5) можна починати паралельно з M3 одразу після 1.2.

## 4. GitHub-ресурси

**Kanban (Projects v2):**
- Поле `Status`: Backlog, Ready, In Progress, Mentor Review, Done.
- Додаткові поля:
  - `Mentor Review`: Approved / Skipped / Not needed;
  - `Size`: S / M / L.
- Автоматизації вмикаються в UI Projects: item added → Backlog; PR merged / item closed → Done. Статуси In Progress і Mentor Review виставляють `task-start` / `task-finish`.

**Milestones:** M1 AI QA Toolkit Foundation, M2 Manual QA, M3 API Testing, M4 Database Testing, M5 Playwright & POM, M6 AI Toolkit Evaluation & Packaging, M7 CI & Portfolio.

**Labels:**
- напрям: `area:manual`, `area:api`, `area:sql`, `area:e2e`, `area:ai-toolkit`, `area:ci`, `area:portfolio`;
- пріоритет: `priority:P1`, `priority:P2`, `priority:P3`;
- тип: `type:learning`, `type:toolkit` (🤖), `type:reflection`;
- перевірка: `review-feedback` (★).

**Шаблони:**

| Файл | Призначення |
|---|---|
| `.github/ISSUE_TEMPLATE/learning-task.md` | 11 розділів у компактному вигляді |
| `.github/ISSUE_TEMPLATE/toolkit-task.md` | Learning Goal, ручний еталон, дизайн інструменту (tools, входи / виходи, скрипти), перевірка на ≥ 2 входах, запис у каталог, Self-Review, Reflection |
| `.github/ISSUE_TEMPLATE/reflection.md` | Рефлексія milestone / проєкту |
| `.github/PULL_REQUEST_TEMPLATE.md` | Підхід, альтернативи, що перевірила сама, AI usage та верифікація, фідбек перевірки (виправлено / відхилено), відкриті проблеми, наступна ітерація; «Mentor approve: отримано / пропущено» |

Правило захисту гілки з обов'язковим approve не вмикається.

## 5. Підготовка (після погодження, кожен крок — з моїм підтвердженням)

1. Встановити `gh` (`brew install gh`) — зараз відсутній.
2. `gh auth login` — виконую сама; scopes `repo`, `project`, `workflow`.
3. `git init` у корені, `.gitignore` (виключає `practice-software-testing-main/`, `node_modules/`, звіти, `.env`), перший коміт: `docs/` + шаблони.
4. Створити репозиторій (назва та видимість — моє рішення), push.
5. Labels → milestones → Project із полями → 75 issues із залежностями.
6. За бажанням — ментор як collaborator.
