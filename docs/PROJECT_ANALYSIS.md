# Project Analysis — Practice Software Testing (Toolshop)

> Етап 1 QA-петпроєкту. Дата: 2026-10-23.
> Позначки: **[F]** — підтверджений факт (перевірено у файлі), **[A]** — припущення / потребує перевірки запуском.
> Корінь застосунку: `practice-software-testing-main/` (далі — `APP/`). Усі шляхи нижче відносні до нього.

---

## 1. Стек і архітектура

| Шар | Технологія | Джерело |
|---|---|---|
| Frontend | Angular 20.0.5, Bootstrap 5.3, Transloco (i18n), ngx-toastr, chart.js **[F]** | `sprint5/UI/package.json` |
| Backend | Laravel `^13.0`, PHP 8.3 (php:8.3-fpm-alpine) **[F]** | `sprint5/API/composer.json`, `_docker/api.docker` |
| API | REST (OpenAPI через `l5-swagger`) + GraphQL (Lighthouse) **[F]** | `sprint5/API/routes/api.php`, `sprint5/API/graphql/schema.graphql` |
| Auth | JWT (`tymon/jwt-auth`), TOTP 2FA (`google2fa`), OAuth Google/GitHub (`socialite`) **[F]** | `sprint5/API/config/auth.php`, `routes/api.php` |
| БД | MariaDB 10.6.11, БД `toolshop` **[F]** | `docker-compose.yml` |
| Черги / кеш | `QUEUE_CONNECTION=database`, `CACHE_DRIVER=file` у локальному `.env` **[F]**; Redis згадано в docs, але сервісу в compose немає | `sprint5/API/.env` (лише ключі), `docs/architecture.md` |
| Інфраструктура | Docker Compose: `laravel-api`, `angular-ui`, `web` (nginx), `composer`, `mariadb`; optional: `cron`, `phpmyadmin`, `mailcatcher` **[F]** | `docker-compose.yml`, `docker-compose.override.yml` |

**Архітектура:** SPA (Angular) → REST/GraphQL API (Laravel) → MariaDB. Довгі задачі (email, PDF-інвойси, оновлення залишків) — через jobs (`app/Jobs/`). Є SSE-стрім продажів (`/sales-stream`).

**Мультиверсійність [F]:** репозиторій містить 8 версій застосунку (`sprint1`…`sprint5`, `sprint5-with-bugs`, `sprint5-holtesting`, `sprint5-performance`), кожна з власними `API/` та `UI/`. Активна версія обирається змінною `SPRINT` у кореневому `.env` (зараз `sprint5`).

## 2. Ключові файли та модулі

| Що | Де |
|---|---|
| Маршрути REST API (323 рядки) | `sprint5/API/routes/api.php` |
| Контролери / Requests (валідація) | `sprint5/API/app/Http/Controllers/`, `app/Http/Requests/` |
| Моделі (22 шт.: Product, Brand, Category, User, Cart, CartItem, Invoice, Invoiceline, Payment + 5 типів деталей оплати, Favorite, ContactRequests тощо) | `sprint5/API/app/Models/` |
| Міграції (31), сідери (11), фабрики (11) | `sprint5/API/database/` |
| GraphQL-схема | `sprint5/API/graphql/schema.graphql` |
| Angular-модулі: `auth`, `account`, `admin`, `products`, `checkout`, `contact`, `chat-widget`, guards | `sprint5/UI/src/app/` |
| Документація продукту (фічі по версіях, архітектура, user stories) | `docs/features.md`, `docs/architecture.md`, `docs/user-stories/v5.md`, `docs/sprints/` |
| Матеріали для exploratory testing + **список із 94 відомих багів** | `sprint5-with-bugs/testSessions/` (`listOfBugs.md`, `bugReports/`, `exploratoryTesting-tours.md`, `userStories/`) |
| User stories sprint0 (login, register, contact, forgot password, edit profile) | `_user-stories/sprint0/` |

## 3. Локальний запуск і виявлені проблеми

**Інструкція [F]** (`README.md`, `docs/getting-started.md`):
```bash
docker compose up -d                                         # з override (mailcatcher, phpmyadmin, cron)
docker compose exec laravel-api php artisan migrate:fresh --seed
```
URL: UI `:4200`, API `:8091`, Swagger `:8091/api/documentation`, MailCatcher `:1080`, phpMyAdmin `:8000`. Тестові акаунти (admin / 3 customers) — у `README.md`.

**Середовище [F]:** Docker 29.9.2, Compose v5.6.1, Node v26.1.0 встановлені. Застосунок **не запускався** (за правилами етапу).

**Виявлені проблеми / розбіжності:**

| # | Проблема | Статус |
|---|---|---|
| 1 | Робоча тека та `APP/` **не є git-репозиторієм**: `APP/.git` — порожня тека (ймовірно, розпакований zip). `angular-ui` монтує `./.git`; `set-version.js` має fallback на `dev`, тож запуск не має зламатися | [F] / [A] |
| 2 | `.github/workflows/` лежить у `APP/`, а не в корені робочої теки → GitHub Actions не спрацює, якщо репозиторієм стане верхня тека | [F] |
| 3 | `start-app.sh` використовує застарілий `docker-compose` (v1); README використовує ім'я контейнера `pst-laravel-api-1`, а CI — `docker compose exec laravel-api` | [F] |
| 4 | Docs vs код: docs кажуть Laravel 12 / Node 20 / MailHog / Redis; насправді `laravel/framework ^13`, `node:22-alpine`, образ `dockage/mailcatcher`, Redis-сервісу немає | [F] |
| 5 | Порт `3306` публікується назовні — конфлікт, якщо локально запущено MySQL | [A] |
| 6 | У `sprint5/UI/node_modules` та `sprint5/API/vendor` вже є залежності, встановлені на хості (macOS). Контейнер UI робить `npm install --force` поверх змонтованої теки → можливі конфлікти нативних бінарників | [A] |
| 7 | Перший запуск ~5 хв, образи ~1.5 GB; CI чекає готовності через `sleep` + polling | [F] |

## 4. API, база даних та наявні тести

### API (REST, sprint5) [F]
Ресурси та основні операції (`routes/api.php`):

- **Products** — `GET /products`, `/products/search`, `/products/{id}`, `/products/{id}/related`; `POST`, `PUT`, `PATCH`, `DELETE`. Підтримується нестандартний HTTP-метод `QUERY` (`docs/http-query-method.md`).
- **Brands**, **Categories** (`/categories/tree`) — повний CRUD + search.
- **Users** — `POST /users/login`, `/register`, `/forgot-password`, `/change-password`; `GET /users/me`, `/refresh`, `/logout`; CRUD для admin.
- **Carts** — створення кошика, додавання товару, зміна кількості, видалення товару / кошика.
- **Invoices** — `POST /invoices`, `POST /invoices/guest`, список, search, статус, PDF (`/download-pdf`, `/download-pdf-status`).
- **Payment** — `POST /payment/check` (bank transfer, credit card, gift card, BNPL, cash on delivery).
- **Favorites**, **Messages** (контакт-форма, вкладення файлу, відповіді, статус), **Product specs**, **Images**.
- **Reports** (admin, з throttle) — 7 аналітичних ендпоїнтів (продажі по роках / країнах, top-10 тощо).
- **TOTP** — setup / verify / login; **Social auth** — Google / GitHub callbacks; `/postcode-lookup`, `/status`.
- **GraphQL** — `/graphql` + GraphiQL-плейграунд (за `docs/architecture.md`).

Swagger генерується з анотацій (`app/Swagger/`, `php artisan l5-swagger:generate`).

### База даних [F]
- MariaDB, ORM — Eloquent, 31 міграція. Основні таблиці: `users` (включно з `role`, `enabled`, `failed_login_attempts`, `totp_*`), `products`, `brands`, `categories`, `product_images`, `product_specs`, `carts`, `cart_items`, `invoices`, `invoice_items`, `payments` + 5 таблиць `payment_*_details`, `favorites`, `contact_requests`, `contact_request_replies`, `downloads`, `jobs`, `jobs_information`.
- Схема-діаграма: `docs/images/database-model.png`.
- Дані наповнюються сідерами (`database/seeders/`). Доступ для SQL-практики: phpMyAdmin (`:8000`) або напряму `localhost:3306`.
- Цікаво для SQL-перевірок: денормалізовані поля інвойсу (`subtotal`, `total`, `additional_discount_*`, billing-адреса), статуси замовлень, `failed_login_attempts`.

### Наявні тести [F]
| Тип | Де | Обсяг |
|---|---|---|
| Backend feature-тести (Pest) | `sprint5/API/tests/Feature/` | 14 файлів, ~190 тест-кейсів; БД — **SQLite in-memory** (`phpunit.xml`), а не MariaDB |
| Contract (Pact) | `sprint5/API/pacts/`, `pact-php` | не досліджувалося |
| Frontend unit (Karma/Jasmine) + mutation (Stryker) | `sprint5/UI/` | 7 `*.spec.ts` — мінімально |
| E2E Playwright | `APP/tests/login.spec.ts`, `APP/playwright.config.ts` | **1 тест** (login), без POM, без npm-скриптів |
| CI | `.github/workflows/run-tests.yml` | піднімає Docker, сідить БД, запускає Playwright, вивантажує HTML-звіт |

Особливості Playwright-конфігу: 3 браузери, `screenshot: 'on'` і `video: 'on'` для кожного тесту (важкі артефакти), `baseURL: http://localhost:4200`, немає `webServer`, немає `.env`-конфігурації середовищ.
**Локатори:** у шаблонах UI ~447 атрибутів `data-test` — сильна основа для стабільних селекторів.

## 5. Можливості QA-покриття

**Ключові користувацькі сценарії [F]:** реєстрація / логін / блокування після невдалих спроб / 2FA / forgot password → пошук, фільтр, сортування, пагінація каталогу → картка товару, related, favorites → кошик (кількість, видалення) → checkout (адреса, 5 способів оплати, гість чи авторизований) → інвойси та PDF → контакт-форма з файлом → профіль і зміна пароля → admin CRUD і звіти → i18n.

| Напрям | Придатність | Обґрунтування |
|---|---|---|
| **Manual QA** | ★★★★★ | Готові user stories, feature-матриця, `sprint5-with-bugs` з 94 задокументованими багами — можна писати тест-кейси на sprint5 та прогоняти їх на with-bugs (еталон для оцінки якості bug reports) |
| **API (Postman)** | ★★★★★ | Повний CRUD, JWT-auth, ролі (admin/user), валідація, Swagger як джерело контракту, нестандартний `QUERY`, rate limiting |
| **SQL** | ★★★★☆ | Багата реляційна схема (замовлення → рядки → оплати → користувачі), прямий доступ до MariaDB; перевірки після API-операцій (cart → invoice → payment) |
| **Playwright + TS + POM** | ★★★★★ | `data-test`-локатори, Playwright і faker уже в `devDependencies`, працюючий CI-шаблон; є куди рости (зараз 1 тест) |
| **AI-assisted QA** | ★★★★☆ | Можна генерувати кейси з user stories / Swagger, порівнювати з `listOfBugs.md` як ground truth, аналізувати падіння тестів за trace |
| **CI** | ★★★★☆ | Готовий workflow; потребує переносу в корінь репозиторію та облегшення артефактів |

## 6. Невідомі питання та ризики

**Ризики:**
1. **Ліцензія [F]** (`APP/LICENSE`): дозволено лише приватне некомерційне використання; **заборонено публічно хостити або поширювати копії чи похідні роботи**. Публічний GitHub-репозиторій з кодом застосунку для портфоліо, ймовірно, порушує ліцензію. Варіант: окремий репозиторій лише з QA-артефактами (тести, документація, Postman, SQL), застосунок підтягується локально / через `docker-compose.prod.yml` з готовими образами або тести йдуть проти хостингових версій. **Потрібне рішення перед Етапом 2.**
2. Дубляж: 8 копій API/UI — легко випадково аналізувати / змінювати не ту версію. Фокус: `sprint5` (+ `sprint5-with-bugs` для пошуку багів).
3. Тести бекенду ганяються на SQLite, а прод — MariaDB: поведінкові розбіжності не покриті.
4. Хостингові версії (`practicesoftwaretesting.com`) — спільне середовище; прогони write-тестів там можуть конфліктувати з даними інших користувачів.

**Невідомо (потребує запуску або точкового читання):**
- Чи стартує стек «з коробки» на цій машині (Apple Silicon? `phpmyadmin` має `platform: linux/amd64`).
- Повнота Swagger-документації vs фактичні ендпоїнти — перевірити на `:8091/api/documentation`.
- Бізнес-правила (знижки — geo / eco / combined products, блокування акаунта, валідація оплати) — потрібне читання `app/Http/Controllers/`, `app/Http/Requests/`, `docs/gift-card-validation.md`.
- Чи працюють email / PDF-генерація локально (черга `database` + `cron` з override).
- Вміст `pacts/` і стан Pact-тестів.
- Чи `sprint5-with-bugs` використовує ту саму схему БД (для перевикористання SQL-запитів).

**Файли для наступного дослідження (за потреби):**
`sprint5/API/app/Http/Controllers/{UserController,InvoiceController,CartController,PaymentController}.php`, `sprint5/API/app/Http/Requests/`, `sprint5/API/database/seeders/DatabaseSeeder.php`, `sprint5/API/graphql/schema.graphql`, `docs/user-stories/v5.md`, `sprint5-with-bugs/testSessions/listOfBugs.md` (повністю), `sprint5/UI/src/app/app-routing.module.ts`.
