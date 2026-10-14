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

Email and S3 are optional in development: with `SMTP_HOST` blank, OTP codes and order emails are printed to the backend console instead of sent.

## Tests

```bash
cd backend && npm test        # needs the sheshape_test database from step 1
```

The suites cover registration, OTP verification, login and sessions, password reset, the admin guard, rate limiting, order creation with stock reservation, and order lookup rules. CI runs them on every push against MariaDB 10.3.

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
| `SMTP_*` | Transactional email. Blank in development prints emails to the console. |
| `SENTRY_DSN` | Optional error reporting. Nothing is loaded without it. |
| `AUTH_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_MAX` | Per-IP request budgets for auth routes and the contact form. |

## Operations checklist

- Database backups: enable them in cPanel and restore one into a local MariaDB container at least once to prove they work.
- Error reporting: create a free Sentry project and set `SENTRY_DSN` to hear about production errors before customers do.
- Email deliverability: shared-host SMTP often lands in spam. If signups look low, check OTP delivery first.
