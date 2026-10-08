import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });
config(); // fallback .env

const sql = neon(process.env.DATABASE_URL);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL required');
  }

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      email text NOT NULL UNIQUE,
      email_verified timestamptz,
      image text,
      password_hash text,
      role text NOT NULL DEFAULT 'user',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL,
      provider text NOT NULL,
      provider_account_id text NOT NULL,
      refresh_token text,
      access_token text,
      expires_at integer,
      token_type text,
      scope text,
      id_token text,
      session_state text,
      PRIMARY KEY (provider, provider_account_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      session_token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires timestamptz NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier text NOT NULL,
      token text NOT NULL,
      expires timestamptz NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS credit_wallets (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount integer NOT NULL,
      reason text NOT NULL,
      stripe_session_id text,
      stripe_payment_intent_id text,
      generation_id uuid,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_stripe_session_uniq ON credit_transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS credit_tx_user_created_idx ON credit_transactions (user_id, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS generations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model text NOT NULL,
      modality text NOT NULL DEFAULT 'image',
      prompt text,
      params jsonb,
      status text NOT NULL DEFAULT 'pending',
      cost_credits integer NOT NULL DEFAULT 0,
      held_credits integer NOT NULL DEFAULT 0,
      muapi_request_id text,
      result_urls jsonb,
      error_message text,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS generations_user_created_idx ON generations (user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS generations_muapi_req_idx ON generations (muapi_request_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS editor_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      filmcraft_ref text,
      package_path text,
      export_url text,
      export_error text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS editor_assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
      generation_id uuid REFERENCES generations(id) ON DELETE SET NULL,
      kind text NOT NULL DEFAULT 'video',
      source_url text NOT NULL,
      local_name text NOT NULL,
      duration_ms integer,
      sort_order integer NOT NULL DEFAULT 0,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS editor_projects_user_created_idx ON editor_projects (user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS editor_assets_project_order_idx ON editor_assets (project_id, sort_order)`;

  console.log('Migration complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
