import { NextResponse } from 'next/server'
import { deleteCv } from '@/lib/db/cvs'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'CV id is required.' }, { status: 400 })
    }

    const result = await deleteCv(id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('DELETE /api/cvs/[id] failed:', error)
    const message =
      error instanceof Error ? error.message : 'Unexpected error while deleting the CV.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
