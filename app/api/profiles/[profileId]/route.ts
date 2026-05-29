import { NextResponse } from 'next/server'
import { updateProfileEducation, type ProfileEducationUpdate } from '@/lib/db/profiles'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params
  let body: ProfileEducationUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await updateProfileEducation(profileId, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
