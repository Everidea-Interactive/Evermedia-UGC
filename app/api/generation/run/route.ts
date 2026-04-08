import { NextResponse } from 'next/server'

import {
  parseGenerationFormData,
  submitGenerationRequest,
} from '@/lib/generation/kie'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const parsedRequest = parseGenerationFormData(formData)
    const response = await submitGenerationRequest(parsedRequest)

    return NextResponse.json(response)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start generation.'

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message.includes('KIE_API_KEY') || message.includes('configured')
            ? 500
            : 400,
      },
    )
  }
}
