# Wateen-MVP

A working MVP of an AI-powered back-of-house platform for restaurants and F&B groups, modelled on [Wateen](https://wateen.ai/en). It replicates the three services the business runs on: inventory with recipe costing, e-procurement with approvals and RFQs, and a supplier marketplace with reporting that ties them together.

Built end to end with an AI coding agent. See [BUILD_LOG.md](BUILD_LOG.md) for the timeline and time taken.

> Demonstration product. POS imports and supplier fulfilment are simulated. Not affiliated with Wateen.

![Landing page](docs/screenshots/landing.png)

## The three core features

| Feature | Who uses it | What it does |
| --- | --- | --- |
| Inventory and recipe costing | Branch managers, owners | Live stock per branch, POS sales that deduct recipes, waste and transfers, stock counts with variance in riyals, digital cookbook with plate cost, calories and allergens |
| E-procurement | Purchasers, managers, owners | Smart reorder suggestions, purchase orders with a SAR approval threshold, RFQ quote comparison and award, receiving that flags short deliveries and price rises |
| Supplier marketplace and reports | Buyers, suppliers, owners | Catalogue ordering, supplier portal (confirm/ship/quote), food cost vs actual, menu engineering, supplier scorecards and ranked insights |

Also included: a marketing website (landing, services, pricing, FAQ, demo request), English and Arabic with full right-to-left layout, role-based access, and a JSON REST API.

## Screenshots

| | |
| --- | --- |
| ![Persona login](docs/screenshots/login.png) Persona login | ![Manager dashboard](docs/screenshots/dashboard-manager.png) Branch manager dashboard |
| ![Inventory](docs/screenshots/inventory.png) Live inventory | ![Purchasing](docs/screenshots/procurement.png) Smart reorder and purchase orders |
| ![Reports](docs/screenshots/reports.png) Owner reports and insights | ![Supplier portal](docs/screenshots/supplier.png) Supplier portal |
| ![Arabic RTL](docs/screenshots/dashboard-arabic.png) Arabic, right-to-left | |

## How the pieces fit

```mermaid
flowchart LR
  pos[POS sales] --> recipes[Recipe deduction]
  recipes --> stock[Branch stock]
  stock --> suggest[Reorder suggestions]
  suggest --> po[Purchase orders]
  market[Marketplace / RFQ] --> po
  po --> approve[Approval if above limit]
  approve --> supplier[Supplier confirm and ship]
  supplier --> receive[Receiving with variance]
  receive --> stock
  stock --> count[Stock counts]
  count --> reports[Food cost and insights]
  po --> reports
```

## Demo personas

| Persona | Role | Try this |
| --- | --- | --- |
| Noura Al Qahtani | Branch manager, Olaya | Import sample POS sales, log waste, run a stock count, receive a delivery |
| Khalid Al Harbi | Purchasing | Approve orders above SAR 5,000, send RFQs, award the best quote |
| Saad Al Dosari | Supplier, Fresh Farms | Confirm and ship orders, update catalogue prices |
| Hassan Al Zahrani | Supplier, Gulf Seafood | Quote on the open shrimp RFQ |
| Faisal Al Otaibi | Owner | Food cost, variance, menu engineering and ranked insights across 3 branches |
| Sara Al Mutairi | Platform admin | Follow up demo leads from the marketing site |

## A five-minute pitch script

1. Open the marketing site. Walk the inventory, procurement, marketplace and reporting services, then request a demo.
2. Log in as Noura. Import sample POS sales at Olaya and watch chicken drop below its reorder point.
3. Create the suggested Fresh Farms order. Log in as Khalid and approve the large pending dry-goods order.
4. Log in as Saad, confirm and ship the chicken order. Back as Noura, receive it short and more expensive — flags appear.
5. Post a stock count that is 6 kg short on chicken. Open Reports as Faisal: theoretical vs actual food cost and ranked insights.
6. As Hassan, quote the shrimp RFQ. As Khalid, award the cheapest quote and show the purchase order created.
7. Switch to Arabic to show the full right-to-left interface.

## Tech stack

- Next.js 15 (App Router, React Server Components, Server Actions), TypeScript in strict mode
- Tailwind CSS v4, Wateen-inspired palette, Tajawal typeface
- PostgreSQL with Prisma ORM (Neon in production, embedded PGlite for local development)
- Zod validation, signed JWT sessions with `jose`
- Vitest unit tests and a bash end-to-end API smoke test

Business rules live in `src/lib/*` and `src/server/*` and are shared by the UI (server actions) and the REST API.

```
src/
  app/(marketing)/   landing, services, pricing, FAQ, demo, login
  app/(app)/         dashboard, inventory, recipes, counts, sales, procurement, marketplace, RFQ, reports, supplier portal, leads
  app/api/v1/        REST API
  server/            domain services: inventory, procurement, marketplace, reports, leads
  lib/               costing, inventory maths, procurement state machine, insights, i18n, session
  content/           marketing copy (EN/AR)
prisma/              schema and demo seed
```

## Run locally

Requires Node.js 20+. No Docker needed; the database is an embedded Postgres. Default local ports: Postgres `5434`, Next.js `3100` if `3000` is already in use.

```bash
npm install
cp .env.example .env
npm run db:local        # terminal 1: Postgres on port 5434
npm run db:push && npm run db:seed
npm run dev -- -p 3100  # terminal 2
```

Local `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@127.0.0.1:5434/postgres?sslmode=disable&connection_limit=1"
SESSION_SECRET="any-long-random-string"
```

Checks:

```bash
npm run typecheck && npm run lint && npm test
BASE=http://localhost:3100 ./scripts/smoke.sh
```

## REST API

All responses use `{ "data": ... }` or `{ "error": { "message", "status" } }`. Authenticate with a bearer token:

```bash
TOKEN=$(curl -s -X POST localhost:3100/api/v1/auth/demo-login \
  -H 'content-type: application/json' -d '{"email":"noura@alnakheel.sa"}' | jq -r .data.token)
curl -s localhost:3100/api/v1/stock -H "authorization: Bearer $TOKEN"
```

| Method | Path | Role |
| --- | --- | --- |
| GET | `/api/v1/health` | public |
| POST | `/api/v1/leads` | public marketing lead capture |
| POST | `/api/v1/auth/demo-login` | public |
| GET | `/api/v1/me` | any |
| GET | `/api/v1/stock` | buyer |
| POST | `/api/v1/sales` | manager, owner |
| POST | `/api/v1/waste` | manager, owner |
| GET | `/api/v1/suggestions` | buyer |
| GET, POST | `/api/v1/purchase-orders` | buyer / create |
| POST | `/api/v1/purchase-orders/:id/actions` | approve, reject, confirm, ship |
| POST | `/api/v1/purchase-orders/:id/receive` | manager, owner |
| POST | `/api/v1/counts`, `/api/v1/counts/:id/post` | manager, owner |
| GET, POST | `/api/v1/rfqs` | purchasing |
| POST | `/api/v1/rfqs/:id/quotes` | supplier |
| POST | `/api/v1/rfqs/:id/award` | purchasing |
| PATCH | `/api/v1/catalog/:id` | supplier |
| GET | `/api/v1/reports/summary`, `/api/v1/insights` | owner, purchaser, admin |

## Deploy (Vercel and Neon)

1. Create a Neon Postgres database, either at neon.tech or through the Vercel Marketplace integration.
2. Import the GitHub repo in Vercel and add `SESSION_SECRET` (the Neon integration adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you).
3. Load the schema and demo data once from your machine:
   `DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx prisma db push && npm run db:seed`
4. Deploy. Run `npm run db:seed` again any time to reset the demo.
