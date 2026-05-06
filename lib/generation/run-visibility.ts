import type {
  GenerationExperience,
  GenerationRun,
  WorkspaceTab,
} from '@/lib/generation/types'

export function isRunVisibleForExperience(
  run: GenerationRun,
  experience: GenerationExperience,
  workspace: WorkspaceTab,
) {
  return run.experience === experience && run.workspace === workspace
}
