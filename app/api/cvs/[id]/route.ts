import { NextResponse } from 'next/server'
import { deleteCv, setActiveCv } from '@/lib/db/cvs'

export const runtime = 'nodejs'

// Promotes a CV to active. Body: { status: 'active' } — the only supported
// mutation. Archiving happens implicitly (the prior active CV is demoted).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'CV id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.status !== 'active') {
      return NextResponse.json(
        { error: "Unsupported update. Only { status: 'active' } is allowed." },
        { status: 400 },
      )
    }

    const result = await setActiveCv(id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('PATCH /api/cvs/[id] failed:', error)
    const message =
      error instanceof Error ? error.message : 'Unexpected error while updating the CV.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
