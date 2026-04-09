import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const projects = pgTable(
  'projects',
  {
    configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    id: text('id').primaryKey(),
    lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
    name: text('name').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => ({
    userLookup: index('projects_user_id_idx').on(table.userId, table.updatedAt),
  }),
)

export const projectAssets = pgTable(
  'project_assets',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    fileSize: integer('file_size').notNull(),
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    label: text('label').notNull(),
    mimeType: text('mime_type').notNull(),
    originalName: text('original_name').notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    slotKey: text('slot_key'),
    storagePath: text('storage_path').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => ({
    projectLookup: index('project_assets_project_id_idx').on(
      table.projectId,
      table.kind,
      table.slotKey,
    ),
    userLookup: index('project_assets_user_id_idx').on(table.userId, table.createdAt),
  }),
)

export const generationRuns = pgTable(
  'generation_runs',
  {
    assetManifest: jsonb('asset_manifest').$type<Record<string, unknown>[]>().notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    cancelRequestedAt: timestamp('cancel_requested_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    id: text('id').primaryKey(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    leaseOwner: text('lease_owner'),
    model: text('model').notNull(),
    parentRunId: text('parent_run_id').references(
      (): AnyPgColumn => generationRuns.id,
      {
        onDelete: 'set null',
      },
    ),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    promptSnapshot: text('prompt_snapshot').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull(),
    uploadedAssets: jsonb('uploaded_assets')
      .$type<Record<string, unknown>[]>()
      .notNull(),
    userId: text('user_id').notNull(),
    workspace: text('workspace').notNull(),
  },
  (table) => ({
    projectLookup: index('generation_runs_project_id_idx').on(
      table.projectId,
      table.createdAt,
    ),
    runnableLookup: index('generation_runs_runnable_idx').on(
      table.status,
      table.leaseExpiresAt,
      table.createdAt,
    ),
    userLookup: index('generation_runs_user_id_idx').on(table.userId, table.createdAt),
  }),
)

export const generationVariants = pgTable(
  'generation_variants',
  {
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    error: text('error'),
    id: text('id').primaryKey(),
    isHero: boolean('is_hero').default(false).notNull(),
    profile: text('profile').notNull(),
    prompt: text('prompt').notNull(),
    reviewNotes: text('review_notes'),
    reviewStatus: text('review_status').default('pending').notNull(),
    resultAssetId: text('result_asset_id').references(() => projectAssets.id, {
      onDelete: 'set null',
    }),
    runId: text('run_id')
      .notNull()
      .references(() => generationRuns.id, { onDelete: 'cascade' }),
    selectedForDelivery: boolean('selected_for_delivery').default(false).notNull(),
    status: text('status').notNull(),
    taskId: text('task_id'),
    variantIndex: integer('variant_index').notNull(),
  },
  (table) => ({
    runLookup: index('generation_variants_run_id_idx').on(
      table.runId,
      table.variantIndex,
    ),
    taskLookup: index('generation_variants_task_id_idx').on(table.taskId),
  }),
)
