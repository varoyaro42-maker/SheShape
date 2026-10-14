# She Shape

Women's fitness in Kigali: coaching programs, a shop for activewear and supplements, a journal, and an admin area to run it all.

- `frontend/` React 19 + Vite storefront, customer dashboard and admin dashboard.
- `backend/` Express 5 + Sequelize API on MySQL/MariaDB. In production it also serves the built frontend from `backend/public/`.

## Run it locally

Requirements: Node 20, Docker (for the database).

```bash
# 1. Database (MariaDB 10.3, same version as production)
docker run -d --name sheshape-db \
  -e MARIADB_ROOT_PASSWORD=sheshape -e MARIADB_DATABASE=sheshape \
  -e MARIADB_USER=sheshape -e MARIADB_PASSWORD=sheshape \
  -p 3306:3306 mariadb:10.3
docker exec sheshape-db mysql -uroot -psheshape \
  -e "CREATE DATABASE IF NOT EXISTS sheshape_test; GRANT ALL ON sheshape_test.* TO 'sheshape'@'%';"

# 2. Backend
cd backend
cp .env.example .env          # then fill in JWT_SECRET, ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:sync               # creates the tables
npm run db:seed               # sample categories and products
npm run seed:programs         # the four programs
npm run dev                   # http://localhost:5000 (the admin account is created on first boot)

# 3. Frontend
cd ../frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to the backend
```

On macOS, AirPlay already listens on port 5000. Set `PORT=5001` in `backend/.env` and create `frontend/.env.local` with `VITE_API_PROXY_TARGET=http://localhost:5001`.

Email and S3 are optional in development: with neither `BREVO_API_KEY` nor `SMTP_HOST` set, every email (OTP codes, order updates, booking replies, newsletter confirmations) is printed to the backend console instead of sent.

## Fonts

The brand fonts are self-hosted from `frontend/public/fonts` as Latin-subset woff2 files (about 20 KB each), declared at the top of `frontend/src/index.css`:

| Family | Role | Weights shipped |
|---|---|---|
| Aeonik | Headlines, brand name | 400, 400 italic, 500, 700 |
| Sofia Pro | Body text, buttons, forms | 400, 400 italic, 500, 600, 700 |
| Bicyclette | Labels, numbers, the Nkondo Active wordmark | 400, 700, 900 |

To add a weight, subset the original file with fontTools and drop in a matching `@font-face` rule:

```bash
python3 -m fontTools.subset "Aeonik-Light.ttf" --output-file=frontend/public/fonts/Aeonik-Light.woff2 \
  --flavor=woff2 --layout-features='*' --unicodes="U+0000-00FF,U+2000-206F,U+20AC,U+2122"
```

The original font archives are not in the repository; keep them with the brand assets.

## Tests

```bash
cd backend && npm test        # needs the sheshape_test database from step 1
```

The suites cover registration, OTP verification, login and sessions, password reset, the admin guard, rate limiting, order creation with stock reservation, mobile money and online payment rules, the XentriPay webhook, newsletter double opt-in, and program booking requests. CI runs them on every push against MariaDB 10.3.

## Deploying to cPanel

Production is a shared cPanel account running the backend as a Passenger Node.js app. The frontend is built ahead of time and shipped inside `backend/public/`. Never build on the server.

```bash
npm run build:deploy          # from the repo root
```

This builds the frontend and assembles `deploy/`, a copy of `backend/` with the build in `public/` and without `node_modules`, tests, or local env files. Then:

1. Upload the contents of `deploy/` to the Node.js app directory in cPanel (replace existing files).
2. Confirm the environment variables in cPanel's Node.js app screen match `backend/.env.example`. `NODE_ENV` must be `production`.
3. Click **Run NPM Install**, then **Restart**.
4. Open `/api/health` on the live domain. It should report the database as connected.

CI also produces the same folder as a downloadable artifact named `sheshape-deploy` on every push to `main`.

### Schema changes

Tables are created and altered with `npm run db:sync` (`sequelize.sync({ alter: true })`). Before running it against production, take a database backup in cPanel. Proper migrations are the next step on the roadmap.

## Email (Brevo)

Transactional email goes through Brevo's HTTPS API, which works on shared hosting where outbound SMTP is often blocked.

1. In Brevo, verify the sender address you put in `MAIL_FROM_EMAIL` (ideally on the sheshapewellness.com domain, with the SPF and DKIM records Brevo gives you).
2. Create an API key and set `BREVO_API_KEY`.
3. Create a contact list for the newsletter and set `BREVO_LIST_ID` to its numeric id. Confirmed subscribers are added to it automatically and removed when they unsubscribe, so campaigns are sent from Brevo itself.

The newsletter uses double opt-in: a signup is stored as pending and only counts once the person taps the confirmation link in the email. Admins see and export the list under **Newsletter** in the dashboard.

## Payments

Cash on delivery is always offered. Two more methods are configured by the admin under **Payment settings**:

- **Mobile money (manual).** Enter the shop's MoMo number and registered name. Customers who choose it get the number and their order number as the reference, on screen and by email. An admin marks the order paid once the money arrives.
- **XentriPay (online).** Enter the API key from the XentriPay merchant dashboard, pick sandbox or live, and turn the option on. Orders redirect to XentriPay's checkout; the webhook at `/api/payments/xentripay/webhook` marks them paid, and the order page also polls XentriPay as a fallback.

XentriPay does not publish its endpoint reference; the integration pack comes from the Centrika account manager. The adapter in `backend/src/utils/payments/xentripay.js` follows the common request shape and reads every path and header name from the environment (`XENTRIPAY_*` in `.env.example`), so adjusting it to the pack is a config change plus, at most, the request body in one function.

## Bookings

Customers ask to join a program from its page (or send a general enquiry from the programs page). The request is emailed to `ADMIN_EMAIL` and acknowledged to the customer. Admins confirm or decline under **Bookings**, with a note that goes into the customer's email. Signed-in customers see their requests under **My bookings**.

## Environment variables

See `backend/.env.example`. The ones that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Signs session cookies. Long random string. |
| `ENCRYPTION_KEY` | 32 random bytes, base64. Encrypts Stripe keys stored by admins. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created or promoted on boot. |
| `CLIENT_URL` | Public site URL, used in emails and CORS. |
| `AWS_*`, `S3_BUCKET`, `S3_PUBLIC_URL` | Media uploads. |
| `BREVO_API_KEY`, `BREVO_LIST_ID` | Brevo transactional email and the newsletter list. |
| `SMTP_*` | Fallback SMTP transport if Brevo is not used. |
| `XENTRIPAY_*` | Base URLs, endpoint paths and signature header for the XentriPay adapter. |
| `SENTRY_DSN` | Optional error reporting. Nothing is loaded without it. |
| `AUTH_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_MAX`, `NEWSLETTER_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_MAX` | Per-IP request budgets for the public forms. |

## Operations checklist

- Database backups: enable them in cPanel and restore one into a local MariaDB container at least once to prove they work.
- Error reporting: create a free Sentry project and set `SENTRY_DSN` to hear about production errors before customers do.
- Email deliverability: authenticate the sending domain in Brevo (SPF and DKIM). If signups look low, check OTP delivery first.
- Content: the admin **Home page** screen edits the hero, numbers, tips, member quotes, coaches, about story, app section, newsletter copy and contact details. Programs carry price, schedule, location and coach.
