# QA Project Plan — Toolshop (Practice Software Testing)

> Етап 2. Дата: 2026-10-23 (обсяги скориговано під Junior 2026-10-24). Основа — [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md). Навчальний процес і задачі — [LEARNING_PLAN.md](LEARNING_PLAN.md).
> **[F]** — підтверджено у файлах, **[A]** — припущення, яке перевіряється у відповідному етапі.

## 0. Ключові рішення

| Рішення | Обґрунтування |
|---|---|
| QA-проєкт — окремий репозиторій у корені `practice-software-testing/`; `practice-software-testing-main/` (далі `APP/`) — в `.gitignore`, не змінюється | Ліцензія `APP/LICENSE` забороняє публікувати копії та похідні роботи [F]. У QA-репо — лише власні артефакти |
| Об'єкт тестування — `sprint5`; пошук багів — `sprint5-with-bugs` | `sprint5` — повна еталонна версія; with-bugs має 94 відомі дефекти як ground truth [F] |
| Застосунок піднімається інфраструктурою `APP/` (compose, сідери), власного Docker у QA-репо немає | Не дублюємо наявну інфраструктуру [F: `docker-compose*.yml`, `init-data.sh`] |
| Не копіюємо вміст `APP/` (тест-кейси, `listOfBugs.md`, user stories) — лише посилаємося на них | Ліцензія; уникнення дублювання |
| Перед кожним прогоном, що змінює дані, — `migrate:fresh --seed` | Детерміновані дані з сідерів і відомі акаунти з `APP/README.md` [F] |
| Існуючі `APP/tests/login.spec.ts` і `APP/playwright.config.ts` — референс, не переносяться | Свій конфіг з POM, середовищами й легшими артефактами |

## 1. Структура QA-репозиторію

```
practice-software-testing/            # корінь QA-репо (git init — у Етапі 6)
├── practice-software-testing-main/   # APP: upstream, у .gitignore, read-only
├── README.md                         # Етап 7
├── CLAUDE.md                         # Етап 3 (організація Claude Code)
├── .gitignore                        # APP/, node_modules/, playwright-report/, test-results/, .env
├── .env.example                      # BASE_URL, API_URL, DB_* — без реальних значень
├── package.json                      # Етап 4: @playwright/test, typescript, faker; Етап 2/6: newman
├── playwright.config.ts
├── tsconfig.json
├── docs/
│   ├── PROJECT_ANALYSIS.md
│   ├── QA_PROJECT_PLAN.md
│   ├── manual/
│   │   ├── test-strategy.md
│   │   ├── checklists/               # <feature>.md
│   │   ├── test-cases/               # <feature>.md, ID: TC-<AREA>-NNN
│   │   ├── bug-reports/              # BUG-NNN.md + screenshots/
│   │   ├── test-summary-report.md
│   │   └── traceability-matrix.md    # US/фіча → TC → API/SQL/E2E → BUG
│   └── ai/
│       ├── prompts.md                # повторювані промпти
│       └── ai-log.csv                 # що згенеровано, що виправлено вручну
├── api/
│   └── postman/
│       ├── toolshop.postman_collection.json
│       ├── local.postman_environment.json
│       └── README.md                 # як запускати (Postman / newman)
├── sql/
│   ├── README.md                     # як підключитися (phpMyAdmin / docker exec)
│   ├── 01-select-basics.sql
│   ├── 02-joins.sql
│   ├── 03-aggregations.sql
│   ├── 04-integrity-checks.sql       # кожен запит повертає 0 рядків = PASS
│   └── 05-post-api-checks.sql        # перевірки після сценаріїв Postman
├── e2e/
│   ├── pages/                        # POM: BasePage, HeaderComponent, LoginPage, ...
│   ├── fixtures/                     # test.extend: pages, authenticated user, API client
│   ├── data/                         # users.ts (сідовані акаунти), factories (faker)
│   ├── helpers/                      # api-auth.ts (логін через API → storageState)
│   └── tests/                        # <feature>.spec.ts
└── .github/workflows/qa.yml          # Етап 6
```

Принципи: одна точка налаштування середовища (`.env`), тести не залежать від порядку виконання, жодних даних або коду з `APP/` у репо.

## 2. Етапи

### Етап 1. Manual QA

**Мета:** продемонструвати повний цикл ручного тестування: стратегія → дизайн тестів → виконання → дефекти → трасування.

**Задачі:**
1. Підняти `sprint5` локально, перевірити URL та акаунти з `APP/README.md`; зафіксувати проблеми запуску (закриває невідомі з аналізу).
2. Написати `test-strategy.md`: scope (in/out — mobile, social login, performance out), рівні та типи тестування, середовища, ризик-орієнтовані пріоритети, entry/exit criteria.
3. Визначити фічі для покриття на основі `APP/docs/features.md` і `APP/docs/user-stories/v5.md`: Auth (login, register, lockout, forgot password), Catalog (search, filter, sort, pagination), Product details & Favorites, Cart, Checkout (адреса, 5 методів оплати, гість), Account (profile, password, invoices), Contact form (з файлом), Admin CRUD (мінімально).
4. Чеклісти для кожної фічі (швидке smoke/sanity покриття).
5. Тест-кейси для критичних фіч (Auth, Cart, Checkout, Account) із застосуванням технік: EP/BVA (кількість, пароль, ціна-фільтр), decision table (методи оплати), state transition (блокування акаунта, статуси замовлення).
6. Прогнати тест-кейси на `sprint5` (базова лінія), потім на `sprint5-with-bugs` (`SPRINT=sprint5-with-bugs` у `APP/.env` — це локальна зміна конфігу, потребує погодження) + 1–2 exploratory сесії за турами з `APP/sprint5-with-bugs/testSessions/exploratoryTesting-tours.md`.
7. Оформити 10–15 bug reports (кроки, expected/actual, severity/priority, середовище, докази).
8. Порівняти знайдені баги з `listOfBugs.md` → метрика «знайдено X з 94» (без копіювання списку).
9. `traceability-matrix.md` та `test-summary-report.md`.

**Артефакти:** `docs/manual/*` (див. структуру).
**Критерії завершення:** стратегія погоджена; ≥ 5 чеклістів; ≥ 25 тест-кейсів з пріоритетами; прогін задокументовано (pass/fail); ≥ 6 bug reports; матриця покриває всі фічі зі scope.
**Залежності:** Етап 1 аналізу; робочий локальний стек.

### Етап 2. API Testing (Postman)

**Мета:** покрити REST API позитивними й негативними сценаріями з автоматичними assertions і повним CRUD.

**Задачі:**
1. Експортувати/вивчити Swagger (`:8091/api/documentation`), звірити з `APP/sprint5/API/routes/api.php` [F]; розбіжності — у bug reports.
2. Environment: `baseUrl`, облікові дані з `.env`/README, змінні для токенів та ID.
3. Структура колекції за папками: `Auth`, `Products`, `Brands`, `Categories`, `Cart`, `Invoices`, `Payment`, `Favorites`, `Messages`, `Users (admin)`.
4. Auth-flow: `POST /users/login` → збереження JWT у змінну; `/users/me`, `/refresh`, `/logout`; pre-request script для автологіну.
5. CRUD-ланцюжок (admin): Brand → Category → Product: create → read → update (PUT/PATCH) → delete → read (404); ID передаються через змінні.
6. E2E-ланцюжок покупця: create cart → add item → update quantity → `POST /payment/check` → `POST /invoices` → `GET /invoices/{id}`.
7. Негативні: без токена (401), токен customer на admin-ендпоїнті (403), невалідні payload (422 + повідомлення валідації), неіснуючий ID (404), граничні значення, блокування після невдалих логінів, rate limit на `/reports` [F: `throttle:reports`].
8. Assertions у кожному запиті: статус-код, час відповіді, наявність полів / JSON schema, типи, бізнес-значення (наприклад, total кошика).
9. Бонус: 2–3 запити `QUERY`-методу та 1–2 GraphQL-запити.
10. Перевірити запуск колекції через Newman (встановлення — після погодження).

**Артефакти:** `api/postman/*`.
**Критерії завершення:** ≥ 35 запитів, ≥ 1 assertion у кожному; повний CRUD мінімум для 2 сутностей; ≥ 25 % негативних сценаріїв; колекція проходить «з нуля» після `migrate:fresh --seed` у Runner/Newman без ручних дій.
**Залежності:** Етап 1 (фічі, пріоритети, акаунти).

### Етап 3. SQL і перевірки БД

**Мета:** уміти перевіряти дані напряму в БД і підтверджувати результати API-операцій.

**Задачі:**
1. Підключення: phpMyAdmin `:8000` або `docker compose exec mariadb mariadb -uroot -p toolshop` (з `APP/`); задокументувати в `sql/README.md` без паролів.
2. Вивчити схему (`APP/docs/images/database-model.png`, міграції) та задокументувати ключові зв'язки: users → invoices → invoice_items → products; invoices → payments → payment_*_details; carts → cart_items.
3. `01-select-basics.sql`: фільтри, сортування, LIKE, NULL, LIMIT.
4. `02-joins.sql`: товари з брендом/категорією; інвойси з користувачем і рядками; LEFT JOIN — користувачі без замовлень, товари без зображень.
5. `03-aggregations.sql`: GROUP BY/HAVING — продажі за роками й країнами; top-10 товарів; звірити з відповідями `/reports/*` [F].
6. `04-integrity-checks.sql` (0 рядків = PASS): сирітські записи, `invoices.total` ≠ сума рядків з урахуванням знижки, дублікати email, від'ємні ціни/кількість, платежі без деталей, некоректні статуси.
7. `05-post-api-checks.sql`: після кожного Postman-ланцюжка (register, CRUD продукту, checkout) — запит, що підтверджує стан у БД; посилання на запит у колекції/матриці.

**Артефакти:** `sql/*.sql`, `sql/README.md`; оновлена traceability matrix.
**Критерії завершення:** ≥ 15 запитів; ≥ 5 integrity-перевірок; кожен ключовий API-сценарій має SQL-підтвердження; виявлені аномалії оформлено як bug reports.
**Залежності:** Етап 2 (сценарії, після яких перевіряється БД).

### Етап 4. Automation (Playwright + TypeScript + POM)

**Мета:** стабільний, підтримуваний E2E-набір на POM з фікстурами, керованими даними й зрозумілими звітами.

**Задачі:**
1. Ініціалізувати `package.json`, `tsconfig.json`, `playwright.config.ts` у корені (встановлення — після погодження): `baseURL` з `.env`, `testDir: e2e/tests`, reporters `html` + `list`, `trace/screenshot/video: retain-on-failure` (в `APP/` вони `on` для всіх тестів [F]), проєкти: chromium (основний), firefox/webkit — опціонально.
2. Локатори: пріоритет `data-test` (~447 у UI [F]) через `testIdAttribute: 'data-test'` → `getByTestId`; далі `getByRole`; без CSS/XPath-ланцюжків.
3. POM: `BasePage`, `HeaderComponent`, `LoginPage`, `RegisterPage`, `ProductListPage`, `ProductDetailsPage`, `CartPage`, `CheckoutPage`, `AccountPage`, `InvoicesPage`, `ContactPage`. Сторінки повертають дані/стан, assertions — у тестах.
4. Fixtures (`test.extend`): інстанси сторінок; `loggedInCustomer` через API-логін + `storageState` (швидше та стабільніше за UI-логін); API-клієнт для підготовки даних.
5. Тестові дані: сідовані акаунти в `e2e/data/users.ts` (паролі — з `.env`); faker для реєстрації та форм.
6. Сценарії (пріоритет з Етапу 1): smoke (головна, пошук, логін); auth (valid/invalid, lockout, register); catalog (filter, sort, search, pagination); cart (add, quantity, remove, total); checkout (авторизований + гість, 2–3 методи оплати); account (profile, invoices); contact form з файлом; data-driven негативні кейси форм.
7. Теги `@smoke` / `@regression`, npm-скрипти: `test`, `test:smoke`, `report`.
8. Прогін на `sprint5` — зелений; прогін на `sprint5-with-bugs` — падіння зіставити з bug reports.

**Артефакти:** `e2e/**`, `playwright.config.ts`, `package.json`, `tsconfig.json`, `.env.example`.
**Критерії завершення:** ≥ 12 E2E-тестів; 0 flaky у 3 послідовних прогонах на `sprint5`; жодних `waitForTimeout`; HTML-звіт із trace для падінь; тести незалежні й паралельні.
**Залежності:** Етап 1 (тест-кейси → автоматизація), Етап 2 (API для setup/teardown).

### Етап 5. AI-assisted QA (Claude Code)

**Мета:** показати контрольоване використання ШІ: прискорення роботи з обов'язковою людською верифікацією.

**Задачі (виконуються паралельно з Етапами 1–4, фіксуються в `docs/ai/ai-log.csv`):**
1. **Аналіз коду:** вивести бізнес-правила з контролерів/Requests (валідація реєстрації, оплати, знижки, lockout) → доповнити тест-кейси; кожне правило підтвердити посиланням на файл або перевіркою в UI/API.
2. **Генерація тестів:** тест-кейси з user stories; Postman-тести з Swagger; POM-класи та spec-файли з чеклістів. Фіксувати: що прийнято без змін / виправлено / відкинуто.
3. **Аналіз помилок:** розбір падінь Playwright (trace, error log) і Newman → гіпотеза: баг застосунку vs баг тесту vs flaky.
4. **Перевірка результатів ШІ:** порівняти AI-згенерований набір кейсів для `sprint5-with-bugs` з `listOfBugs.md` (precision/recall); виявляти «галюцинації» (неіснуючі ендпоїнти, поля, правила).
5. Зібрати перевірені промпти в `docs/ai/prompts.md`.

**Артефакти:** `docs/ai/prompts.md`, `docs/ai/ai-log.csv`, мітка «AI-assisted, reviewed» у відповідних артефактах.
**Критерії завершення:** ≥ 5 задокументованих кейсів використання ШІ з результатом верифікації; метрика якості генерації (частка прийнятого без правок); ≥ 1 приклад виявленої та виправленої помилки ШІ.
**Залежності:** артефакти Етапів 1–4 як вхід і як об'єкт перевірки.

### Етап 6. CI (GitHub Actions)

**Мета:** автоматичний прогін API та E2E тестів на кожен push з доступними звітами.

**Задачі:**
1. `git init` у корені, перевірити `.gitignore` (APP/ виключено) — потребує погодження перед першим push.
2. `.github/workflows/qa.yml` у корені QA-репо (workflow в `APP/` не спрацює [F]).
3. Підняття застосунку в CI без копіювання коду: `actions/checkout` upstream-репозиторію `testsmith-io/practice-software-testing` (зафіксований ref) у робочу теку → `SPRINT=sprint5` → `docker compose -f docker-compose.yml up -d` за зразком `APP/.github/workflows/run-tests.yml` [F] (або prebuilt-образи з `docker-compose.prod.yml` [F] — швидше; [A] перевірити, що сідування працює в цих образах) → healthcheck БД/API/UI → `migrate:fresh --seed`.
4. Jobs: `api` (Newman + JUnit/HTML-звіт), `e2e` (Playwright, кеш браузерів як в upstream workflow), опційно `sql` (integrity-перевірки через `docker compose exec mariadb`).
5. `actions/upload-artifact`: `playwright-report/`, Newman-звіт; `if: always()`.
6. Тригери: `push`, `pull_request`, `workflow_dispatch` (з вибором `smoke`/`regression`).
7. Бейдж статусу в README.

**Артефакти:** `.github/workflows/qa.yml`, звіти як artifacts.
**Критерії завершення:** зелений прогін на `main`; звіти завантажуються при падінні; час пайплайна зафіксовано; секрети не в коді.
**Залежності:** Етапи 2 і 4 (що запускати); Етап 3 — для опційного SQL-job.
**Ризик:** [A] запуск upstream-коду в CI розглядається як «run for private, non-commercial purposes» за ліцензією — перевірити формулювання й за потреби обмежитися ручним/локальним прогоном.

### Етап 7. Portfolio

**Мета:** зрозуміла презентація проєкту для рекрутера / технічного інтерв'юера за 2–3 хвилини.

**Задачі:**
1. `README.md`: мета, об'єкт тестування (з посиланням на upstream, з дотриманням ліцензії), стек QA, структура репо, як запустити (застосунок → API → E2E), бейдж CI.
2. Метрики: кількість чеклістів / TC / bug reports; «знайдено X з 94 відомих багів»; API-запити та % негативних; SQL-перевірки; E2E-тести, pass rate, час прогону; покриття фіч з traceability matrix.
3. Приклади результатів: скриншот HTML-звіту, приклад bug report, приклад SQL-перевірки, приклад AI-кейсу.
4. Відомі обмеження: out-of-scope (mobile, social login, performance), залежність від upstream, розбіжності docs vs код, ліцензійні обмеження.
5. Фінальний self-review репо: жодних секретів, жодного коду `APP/`, робочі посилання.

**Артефакти:** `README.md`, `docs/images/` (скриншоти звітів).
**Критерії завершення:** новий читач може запустити проєкт за інструкцією; усі метрики підкріплені артефактами.
**Залежності:** усі попередні етапи.

## 3. Порядок і залежності

```
Manual QA (1) ──► API (2) ──► SQL (3)
      │              │
      └──────────────┴──► Automation (4) ──► CI (6) ──► Portfolio (7)
AI (5) — наскрізно в 1–4, підсумок перед 7
```

## 4. Дії, що потребують погодження

- Зміна `SPRINT` у `APP/.env` (перемикання на `sprint5-with-bugs`).
- Встановлення залежностей: `@playwright/test`, `typescript`, `@faker-js/faker`, `newman` (+ reporter), браузери Playwright.
- `git init`, перший commit/push, створення GitHub-репозиторію.
- `migrate:fresh --seed` (стирає локальні дані БД).
