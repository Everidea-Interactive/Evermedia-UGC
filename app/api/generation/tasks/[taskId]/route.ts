import { NextResponse } from 'next/server'

import { getTaskStatus } from '@/lib/generation/kie'
import type { GenerationProvider, WorkspaceTab } from '@/lib/generation/types'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') as GenerationProvider | null
    const workspace = searchParams.get('workspace') as WorkspaceTab | null
    const model = searchParams.get('model')

    if (!provider || (provider !== 'market' && provider !== 'veo')) {
      throw new Error('Missing or invalid provider query parameter.')
    }

    if (!workspace || (workspace !== 'image' && workspace !== 'video')) {
      throw new Error('Missing or invalid workspace query parameter.')
    }

    if (!model) {
      throw new Error('Missing model query parameter.')
    }

    const response = await getTaskStatus({
      model,
      provider,
      taskId,
      workspace,
    })

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to fetch generation status.',
      },
      {
        status: 400,
      },
    )
  }
}
