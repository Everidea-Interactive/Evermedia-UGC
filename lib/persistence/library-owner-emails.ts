import type {
  SavedIdeationHistoryEntry,
  SavedOutputHistoryEntry,
} from '@/lib/persistence/types'

export function applyOwnerEmailsToIdeations(
  ideations: SavedIdeationHistoryEntry[],
  ownerEmailsByUserId: Map<string, string>,
) {
  return ideations.map((ideation) => ({
    ...ideation,
    ownerEmail: ownerEmailsByUserId.get(ideation.userId) ?? null,
  }))
}

export function applyOwnerEmailsToOutputs(
  outputs: SavedOutputHistoryEntry[],
  ownerEmailsByUserId: Map<string, string>,
) {
  return outputs.map((entry) => ({
    ...entry,
    output: {
      ...entry.output,
      ownerEmail: ownerEmailsByUserId.get(entry.output.userId) ?? null,
    },
  }))
}
