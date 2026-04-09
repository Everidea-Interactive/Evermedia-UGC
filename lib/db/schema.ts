import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const generationRuns = pgTable(
  'generation_runs',
  {
    completedAt: timestamp('completed_at', { withTimezone: true }),
    configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    id: text('id').primaryKey(),
    model: text('model').notNull(),
    promptSnapshot: text('prompt_snapshot').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull(),
    userId: text('user_id').notNull(),
    workspace: text('workspace').notNull(),
  },
  (table) => ({
    userLookup: index('generation_runs_user_id_idx').on(table.userId, table.createdAt),
  }),
)

export const savedOutputs = pgTable(
  'saved_outputs',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    fileSize: integer('file_size').notNull(),
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    mimeType: text('mime_type').notNull(),
    originalName: text('original_name').notNull(),
    runId: text('run_id')
      .notNull()
      .references(() => generationRuns.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => ({
    runLookup: index('saved_outputs_run_id_idx').on(table.runId, table.createdAt),
    userLookup: index('saved_outputs_user_id_idx').on(table.userId, table.createdAt),
  }),
)

export const generationVariants = pgTable(
  'generation_variants',
  {
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    error: text('error'),
    id: text('id').primaryKey(),
    profile: text('profile').notNull(),
    prompt: text('prompt').notNull(),
    resultAssetId: text('result_asset_id').references(() => savedOutputs.id, {
      onDelete: 'set null',
    }),
    runId: text('run_id')
      .notNull()
      .references(() => generationRuns.id, { onDelete: 'cascade' }),
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
