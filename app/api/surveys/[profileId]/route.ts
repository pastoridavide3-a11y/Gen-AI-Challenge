import { NextResponse } from 'next/server'
import { updateSurvey } from '@/lib/db/surveys'
import type { SurveyData } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params
  let body: SurveyData

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await updateSurvey(profileId, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
