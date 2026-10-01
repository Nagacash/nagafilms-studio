# SaaS setup (auth · credits · Stripe · MuAPI)

Functional backend for pack-only prepaid credits. Visual redesign comes later.

## 1. Env

Copy `.env.example` → `.env.local` and fill:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe secret (test `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard endpoint (not CLI) for production |
| `STRIPE_PRICE_STARTER` / `_CREATOR` / `_PRO` | One-time Price IDs (mode=payment) |
| `ORDER_NOTIFY_EMAIL` | Owner inbox for pack alerts (default `chosenfewrecords@hotmail.de`) |
| `RESEND_API_KEY` | Resend API key — required to email order alerts |
| `RESEND_FROM_EMAIL` | Optional verified from-address (else Resend onboarding sender) |
| `ORDER_NOTIFY_WEBHOOK_URL` | Optional Discord/Slack webhook fallback |
| `MUAPI_API_KEY` | Your server MuAPI key |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |

## 2. Database

```bash
pnpm db:migrate
```

## 3. Stripe packs

Create three **one-time** Prices in Stripe (not recurring). Put Price IDs in env.

Local webhook:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Production webhook (Stripe Dashboard → Developers → Webhooks):

- URL: `https://naga-films.com/api/webhooks/stripe` (or your Vercel URL)
- Event: `checkout.session.completed` only
- Copy the **endpoint signing secret** (`whsec_…`) into Vercel `STRIPE_WEBHOOK_SECRET`
- Do **not** use a `stripe listen` CLI secret in production — that rejects every Dashboard delivery

If the webhook fails, `/credits?success=1&session_id=…` also calls `POST /api/credits/confirm` so the buyer still gets credits. Admin repair: `POST /api/admin/orders/reconcile` with `{ "email": "…" }`.

Owner alerts (email): create a free [Resend](https://resend.com) API key, set `RESEND_API_KEY` on Vercel, and `ORDER_NOTIFY_EMAIL=chosenfewrecords@hotmail.de`. Until you verify a domain, Resend’s `onboarding@resend.dev` can only send to the email on your Resend account — sign up with that Hotmail address (or verify `naga-films.com` and set `RESEND_FROM_EMAIL`).

## 4. Run

```bash
pnpm install
pnpm dev
```

## Routes

- `/` landing (signup / credits CTAs)
- `/signup` `/login` auth
- `/credits` pack checkout
- `/studio` session or BYO key
- `POST /api/auth/signup` — create account + empty wallet
- `GET /api/me` — user + credit balance
- `POST /api/credits/topup` — Stripe Checkout
- `POST /api/credits/confirm` — unlock credits after redirect (webhook fallback)
- `POST /api/webhooks/stripe` — unlock credits after payment
- `POST /api/admin/orders/reconcile` — admin re-apply paid sessions
- `POST /api/generate` — image gen with credit hold
- `GET /api/generations` — history
- `/api/v1/*` — session-aware MuAPI proxy

## Auth modes in Studio

1. **SaaS** — log in → server uses `MUAPI_API_KEY`; header shows credits; empty wallet blocks POST (402).
2. **BYO key** — paste MuAPI key (legacy); shows MuAPI USD balance.

Fine-grained credit debit for all studio models continues via `POST /api/generate` (image MVP first).
