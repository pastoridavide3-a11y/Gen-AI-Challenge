import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCvById } from '@/lib/db/cvs'
import { runAnalysisPipeline } from '@/lib/analysis/pipeline'
import { TargetRoleEnum } from '@/lib/types'

// Sequential LLM calls (~20-30s) plus a possible retry per step. Node runtime for
// the Groq SDK; generous maxDuration so the whole run completes in one request.
export const runtime = 'nodejs'
export const maxDuration = 120

const BodySchema = z.object({
  profile_id: z.string().min(1),
  cv_id: z.string().min(1),
  target_role: TargetRoleEnum,
})

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body.', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const { profile_id, cv_id, target_role } = parsed.data

    // The CV must exist, belong to this profile, and be parsed before we analyze.
    const cv = await getCvById(cv_id)
    if (!cv) {
      return NextResponse.json({ error: 'CV not found.' }, { status: 404 })
    }
    if (cv.profile_id !== profile_id) {
      return NextResponse.json({ error: 'CV does not belong to this profile.' }, { status: 400 })
    }
    if (!cv.parsed_data) {
      return NextResponse.json(
        { error: 'This CV has not been parsed yet, so it cannot be analyzed.' },
        { status: 400 },
      )
    }

    const analysis = await runAnalysisPipeline({
      profileId: profile_id,
      cvId: cv_id,
      targetRole: target_role,
    })

    return NextResponse.json({ analysis }, { status: 201 })
  } catch (error) {
    console.error('POST /api/analyses failed:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error while analyzing the CV.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
