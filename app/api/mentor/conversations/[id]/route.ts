import { NextResponse } from 'next/server'
import { deleteConversation } from '@/lib/db/mentor'

export const runtime = 'nodejs'

// Permanently deletes a mentor conversation (and its messages). Mirrors
// app/api/cvs/[id]/route.ts.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Conversation id is required.' }, { status: 400 })
    }

    await deleteConversation(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/mentor/conversations/[id] failed:', error)
    const message =
      error instanceof Error ? error.message : 'Unexpected error while deleting the conversation.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
