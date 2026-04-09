import { StudioWorkspace } from '@/components/dashboard/studio-workspace'
import { requireAuthenticatedUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  await requireAuthenticatedUser('/')

  return <StudioWorkspace />
}
