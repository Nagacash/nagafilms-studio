import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

/** App users (Auth.js compatible + role) */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);

export const creditWallets = pgTable('credit_wallets', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    stripeSessionId: text('stripe_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    generationId: uuid('generation_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('credit_tx_user_created_idx').on(t.userId, t.createdAt),
    stripeSessionUniq: uniqueIndex('credit_tx_stripe_session_uniq').on(t.stripeSessionId),
  })
);

export const generations = pgTable(
  'generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    modality: text('modality').notNull().default('image'),
    prompt: text('prompt'),
    params: jsonb('params'),
    status: text('status').notNull().default('pending'),
    costCredits: integer('cost_credits').notNull().default(0),
    heldCredits: integer('held_credits').notNull().default(0),
    muapiRequestId: text('muapi_request_id'),
    resultUrls: jsonb('result_urls'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (t) => ({
    userCreatedIdx: index('generations_user_created_idx').on(t.userId, t.createdAt),
    muapiReqIdx: index('generations_muapi_req_idx').on(t.muapiRequestId),
  })
);

/** FilmCraft handoff projects (beta) */
export const editorProjects = pgTable(
  'editor_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status').notNull().default('draft'),
    filmcraftRef: text('filmcraft_ref'),
    packagePath: text('package_path'),
    exportUrl: text('export_url'),
    exportError: text('export_error'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('editor_projects_user_created_idx').on(t.userId, t.createdAt),
  })
);

export const editorAssets = pgTable(
  'editor_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorProjects.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id').references(() => generations.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').notNull().default('video'),
    sourceUrl: text('source_url').notNull(),
    localName: text('local_name').notNull(),
    durationMs: integer('duration_ms'),
    sortOrder: integer('sort_order').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    projectOrderIdx: index('editor_assets_project_order_idx').on(t.projectId, t.sortOrder),
  })
);
