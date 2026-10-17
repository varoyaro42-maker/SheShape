# She Shape Wellness

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

Email is optional in development: with neither `BREVO_API_KEY` nor `SMTP_HOST` set, every email (OTP codes, order updates, booking replies, newsletter confirmations) is printed to the backend console instead of sent. Uploads land in `backend/uploads/` (git-ignored), so nothing else needs configuring.

## Fonts

The brand fonts are self-hosted from `frontend/public/fonts` as Latin-subset woff2 files (about 20 KB each), declared at the top of `frontend/src/index.css`:

| Family | Role | Weights shipped |
|---|---|---|
| Aeonik | Headlines, brand name | 400, 400 italic, 500, 700 |
| Sofia Pro | Body text, buttons, forms | 400, 400 italic, 500, 600, 700 |
| Bicyclette | Labels, numbers, the shop wordmark | 400, 700, 900 |

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

## Uploads and the landing video

Photos, logos, avatars and program videos are stored on the server itself, under `backend/uploads/` (or wherever `UPLOADS_DIR` points), and served at `/uploads/...` with long cache headers. Every uploader in the app follows the same two steps: `POST .../prepare` with the file's type and size, then a multipart `POST .../file`. The deploy folder never includes `uploads/`, so files survive redeploys; include that folder in the cPanel backups.

When an image or video is removed or replaced in admin (site content, product photos, program covers and videos, blog covers, avatars, or a deleted customer) the file is deleted from the server as well. Uploads that never got saved are swept by `npm run uploads:prune` (add `--dry-run` to preview); it skips anything referenced in the database or younger than an hour, so it is safe to run from a cPanel cron job once a day.

Limits: images 5 MB (JPEG, PNG, WebP), videos 1 GB (MP4, MOV, WebM). On cPanel the web server may cap request bodies lower than that; if a large video fails to upload, raise `LimitRequestBody` or upload the file over FTP into `uploads/videos/` and paste its `/uploads/videos/...` path into the admin field.

The brand film ships with the site in `frontend/public/media/landing/` (1080p and a 720p copy for phones, plus the poster) and the partner logos in `frontend/public/partners/`; the defaults in `backend/src/utils/homeContent.js` point at them, so a fresh install shows them without any upload. Replacing the film later is done from admin → **Site content** → **Hero**, which uploads to the server instead. The landing video plays at the top of the home page. It starts with sound where the browser allows it; otherwise it starts silent and switches the sound on at the visitor's first tap or key press anywhere on the page ("Tap for sound"). It pauses while scrolled out of view and resumes when it is back. Encode as 16:9 H.264 + AAC, 1080p at 30 fps (about 40 MB for two minutes), and optionally upload a 720p copy for phones:

```bash
ffmpeg -i "she shape online.mov" -vf "scale=-2:1080,fps=30" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart she-shape-online-1080p.mp4
ffmpeg -i "she shape online.mov" -vf "scale=-2:720,fps=30"  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -c:a aac -b:a 96k  -movflags +faststart she-shape-online-720p.mp4
```

Setting `STORAGE_DRIVER=s3` with the `AWS_*` variables switches uploads to a bucket instead; the browser then PUTs straight to S3 with a presigned URL.

## Email (Brevo)

Transactional email goes through Brevo's HTTPS API, which works on shared hosting where outbound SMTP is often blocked.

1. In Brevo, verify the sender address you put in `MAIL_FROM_EMAIL` (ideally on the sheshapewellness.com domain, with the SPF and DKIM records Brevo gives you).
2. Create an API key and set `BREVO_API_KEY`.
3. Create a contact list for the newsletter and set `BREVO_LIST_ID` to its numeric id. Confirmed subscribers are added to it automatically and removed when they unsubscribe, so campaigns are sent from Brevo itself.

The newsletter uses double opt-in: a signup is stored as pending and only counts once the person taps the confirmation link in the email. Admins see and export the list under **Newsletter** in the dashboard.

## Payments

Cash on delivery is always offered. Online payment runs through XentriPay, configured by the admin under **Payment settings**:

- **XentriPay on.** Mobile money becomes a push prompt: the customer enters their phone number at checkout, XentriPay sends the approval prompt, and the order page waits and updates itself. Card payments open XentriPay's secure page and return to the order page. Failed attempts can be retried from the order page.
- **XentriPay off.** Mobile money falls back to a manual transfer to the shop's MoMo number, which the admin confirms by hand.

Setup, following XentriPay's integration pack:

1. Create an API key in the merchant dashboard. Use the sandbox (merchant.test.xentripay.com) first, then live (xentripay.com). Paste it into Payment settings, pick the environment, and turn online payment on.
2. Register the webhook `https://<your-domain>/api/payments/xentripay/webhook` for the events `COLLECTION_SUCCESSFUL` and `COLLECTION_FAILED`, and paste the `secretHash` it returns into the webhook secret field. Webhooks are verified with HMAC-SHA256 over the raw body (`X-Xentripay-Signature: sha256=…`). Without the secret the site still confirms payments by polling XentriPay's status endpoint.
3. Choose who pays the XentriPay fee. "We do" keeps the customer's total exact; "the customer" lets XentriPay add the fee on top.

The adapter lives in `backend/src/utils/payments/xentripay.js` and is covered by `backend/tests/xentripay.test.js`, which runs the full flow against a mock of XentriPay's API: MoMo prompt, card redirect, status polling, failure and retry, signed webhooks.

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
| `UPLOADS_DIR` | Where uploaded files live. Defaults to `backend/uploads`. |
| `STORAGE_DRIVER`, `AWS_*`, `S3_BUCKET`, `S3_PUBLIC_URL` | Only when uploads should go to S3 instead of the server. |
| `BREVO_API_KEY`, `BREVO_LIST_ID` | Brevo transactional email and the newsletter list. |
| `SMTP_*` | Fallback SMTP transport if Brevo is not used. |
| `XENTRIPAY_API_KEY`, `XENTRIPAY_WEBHOOK_SECRET`, `XENTRIPAY_ENVIRONMENT`, `XENTRIPAY_ENABLED` | XentriPay credentials when you prefer env vars over the admin screen (a key saved in admin wins). |
| `XENTRIPAY_LIVE_URL`, `XENTRIPAY_SANDBOX_URL` | XentriPay base URLs; only override if XentriPay says so. |
| `SENTRY_DSN` | Optional error reporting. Nothing is loaded without it. |
| `AUTH_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_MAX`, `NEWSLETTER_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_MAX` | Per-IP request budgets for the public forms. |

## Operations checklist

- Database backups: enable them in cPanel and restore one into a local MariaDB container at least once to prove they work.
- Error reporting: create a free Sentry project and set `SENTRY_DSN` to hear about production errors before customers do.
- Email deliverability: authenticate the sending domain in Brevo (SPF and DKIM). If signups look low, check OTP delivery first.
- Content: the admin **Site content** screen edits the landing video, the hero slideshow photos, the scrolling words, partner logos, the Instagram strip, and the hero, numbers, tips, member quotes, coaches, about story, app section, newsletter copy and contact details. Programs carry price, schedule, location and coach.
