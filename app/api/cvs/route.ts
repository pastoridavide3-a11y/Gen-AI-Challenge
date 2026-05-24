import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client'
import { saveCv } from '@/lib/db/cvs'
import { ParsedCvSchema, TargetRoleEnum } from '@/lib/types'

export const runtime = 'nodejs'

const STORAGE_BUCKET = 'cvs'

export async function POST(request: Request) {
  try {
    const form = await request.formData()

    const profileId = form.get('profile_id')
    if (typeof profileId !== 'string' || !profileId) {
      return NextResponse.json({ error: 'profile_id is required.' }, { status: 400 })
    }

    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'The original PDF file is required.' }, { status: 400 })
    }

    const parsedDataRaw = form.get('parsed_data')
    if (typeof parsedDataRaw !== 'string') {
      return NextResponse.json({ error: 'parsed_data is required.' }, { status: 400 })
    }

    const parsedResult = ParsedCvSchema.safeParse(JSON.parse(parsedDataRaw))
    if (!parsedResult.success) {
      return NextResponse.json(
        { error: 'parsed_data does not match the expected schema.', issues: parsedResult.error.issues },
        { status: 400 },
      )
    }

    const rawTextValue = form.get('raw_text')
    const rawText = typeof rawTextValue === 'string' && rawTextValue.length > 0 ? rawTextValue : null

    const targetRoleValue = form.get('target_role')
    const targetRoleResult =
      typeof targetRoleValue === 'string' && targetRoleValue
        ? TargetRoleEnum.safeParse(targetRoleValue)
        : null
    const targetRole = targetRoleResult?.success ? targetRoleResult.data : null

    // Generate the id up front so the Storage path is known before the row is
    // inserted (the task requires file_path to be available at insert time).
    const cvId = crypto.randomUUID()
    const filePath = `${profileId}/${cvId}.pdf`

    const supabase = await createClient()

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('CV PDF upload failed:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload the PDF: ${uploadError.message}` },
        { status: 500 },
      )
    }

    const cv = await saveCv({
      id: cvId,
      profileId,
      targetRole,
      rawText,
      parsedData: parsedResult.data,
      filePath,
    })

    return NextResponse.json({ cv }, { status: 201 })
  } catch (error) {
    console.error('POST /api/cvs failed:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error while saving the CV.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
