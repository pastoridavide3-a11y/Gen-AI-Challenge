import { createClient } from './client'
import type { ConversationRow, MessageRow, MessageRole } from './rows'

export async function getConversationsForProfile(profileId: string): Promise<ConversationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mentor_conversations')
    .select('*')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`getConversationsForProfile(${profileId}): ${error.message}`)
  return (data ?? []) as ConversationRow[]
}

export async function getMessagesForConversation(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mentor_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getMessagesForConversation(${conversationId}): ${error.message}`)
  return (data ?? []) as MessageRow[]
}

// ---- Writes (mirror cvs.ts / analyses.ts: insert → select → single, throw on error) ----

// Builds a short sidebar title from the first user message. Seeded conversations
// keep their hand-written labels; new chats get this so the sidebar shows
// something meaningful instead of the "Chat senza titolo" fallback.
export function deriveLabel(firstMessage: string, maxLength = 40): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`
}

// Creates a conversation row. Called ONLY by the chat route on the first message
// of a brand-new chat — never by the "New chat" button, which is a local reset.
export async function createConversation(args: {
  profileId: string
  label: string | null
}): Promise<ConversationRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mentor_conversations')
    .insert({ profile_id: args.profileId, label: args.label })
    .select('*')
    .single()

  if (error) throw new Error(`createConversation: ${error.message}`)
  return data as ConversationRow
}

// Appends a single message. `mentor_messages` has no status column in Phase 0 —
// a message either exists (possibly a partial mentor reply) or it doesn't.
export async function appendMessage(args: {
  conversationId: string
  role: MessageRole
  content: string
}): Promise<MessageRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mentor_messages')
    .insert({
      conversation_id: args.conversationId,
      role: args.role,
      content: args.content,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`appendMessage(${args.conversationId}, ${args.role}): ${error.message}`)
  }
  return data as MessageRow
}

// Bumps `updated_at` after a message is saved so the sidebar's recency ordering
// and Today/Yesterday/This-week grouping (bundle.ts `dateGroup`) stay correct.
export async function touchConversation(conversationId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mentor_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) throw new Error(`touchConversation(${conversationId}): ${error.message}`)
}

// Permanently deletes a conversation and all its messages. Messages are removed
// first to satisfy the mentor_messages → mentor_conversations foreign key (no
// reliance on ON DELETE CASCADE). Throws if the conversation doesn't exist.
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('mentor_conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle()

  if (fetchError) throw new Error(`deleteConversation(fetch ${conversationId}): ${fetchError.message}`)
  if (!existing) throw new Error(`deleteConversation: conversation ${conversationId} not found.`)

  const { error: messagesError } = await supabase
    .from('mentor_messages')
    .delete()
    .eq('conversation_id', conversationId)

  if (messagesError) {
    throw new Error(`deleteConversation(messages ${conversationId}): ${messagesError.message}`)
  }

  const { error: conversationError } = await supabase
    .from('mentor_conversations')
    .delete()
    .eq('id', conversationId)

  if (conversationError) {
    throw new Error(`deleteConversation(${conversationId}): ${conversationError.message}`)
  }
}
