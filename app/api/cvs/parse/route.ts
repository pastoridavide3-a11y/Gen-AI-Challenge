import { NextResponse } from 'next/server'
import { extractTextFromPdf, structureCvText } from '@/lib/llm/parse-cv'

// pdf-parse needs the Node runtime (Buffer, no edge). maxDuration covers the
// ~5-10s structuring call.
export const runtime = 'nodejs'
export const maxDuration = 60

const MIN_TEXT_LENGTH = 30

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 })
    }
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractTextFromPdf(buffer)

    if (rawText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            'Could not extract text from this PDF. It may be a scanned image — try a text-based PDF.',
        },
        { status: 422 },
      )
    }

    const parsedData = await structureCvText(rawText)

    return NextResponse.json({ raw_text: rawText, parsed_data: parsedData })
  } catch (error) {
    console.error('POST /api/cvs/parse failed:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error while parsing the CV.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
