"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/lib/profile-context";
import type { ConversationBundle } from "@/lib/db/rows";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, Send, Clock, Bookmark, MessageCircle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// One conversation row in the sidebar: a click-to-open button plus a trash
// button (revealed on hover) that asks the page to confirm deletion.
function ConversationItem({
  conv,
  isActive,
  showStar,
  disabled,
  onSelect,
  onRequestDelete,
}: {
  conv: ConversationBundle;
  isActive: boolean;
  showStar?: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="group/item relative">
      <button
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg py-2.5 pl-3 pr-9 text-left text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
        )}
      >
        <div className="flex items-center gap-2">
          {showStar && (
            <Star className="h-3.5 w-3.5 flex-shrink-0 fill-current text-warning" />
          )}
          <span className="truncate font-medium">{conversationTitle(conv)}</span>
        </div>
      </button>
      <button
        type="button"
        aria-label="Elimina conversazione"
        title="Elimina conversazione"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
        className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-background hover:text-destructive group-hover/item:block disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// The in-flight optimistic turn: the user's message plus the mentor reply as it
// streams in. `error` keeps the user message visible after a failed send so the
// user can retry (the server already persisted the user message).
type PendingTurn = {
  userContent: string;
  mentorContent: string;
  status: "streaming" | "error";
};

function conversationTitle(conv: ConversationBundle): string {
  return conv.conversation.label ?? "Chat senza titolo";
}

export function MentorPage() {
  const { current, applyMentorTurn, removeConversation } = useProfile();
  const conversations = current.conversations;
  const profileId = current.profile.id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  // Conversation queued for deletion (drives the confirmation dialog), plus the
  // id currently being deleted (drives the in-flight button state).
  const [pendingDelete, setPendingDelete] = useState<ConversationBundle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset the local chat state when the active profile changes, so a selection,
  // draft, or in-flight bubble from another profile never leaks across.
  useEffect(() => {
    setSelectedId(null);
    setDraftMode(false);
    setPendingTurn(null);
    setInputValue("");
  }, [profileId]);

  // In draft mode no conversation is shown (a fresh, empty thread). Otherwise
  // resolve against the current profile's conversations, falling back to the
  // most recent — so switching profiles never leaves a stale selection.
  const activeConversation = draftMode
    ? null
    : conversations.find((c) => c.conversation.id === selectedId) ??
      conversations[0] ??
      null;

  const baseMessages = activeConversation?.messages ?? [];

  const bookmarkedConversations = conversations.filter((c) => c.isBookmarked);

  // Group conversations by their date bucket (Today / Yesterday / This week / ...).
  const groupedRecent = conversations.reduce((acc, conv) => {
    const group = conv.dateGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {} as Record<string, ConversationBundle[]>);

  // Keep the latest message (and streaming tokens) in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [baseMessages.length, pendingTurn?.mentorContent, pendingTurn?.status]);

  const startNewChat = () => {
    if (isStreaming) return;
    setDraftMode(true);
    setSelectedId(null);
    setPendingTurn(null);
    setInputValue("");
  };

  const selectConversation = (id: string) => {
    if (isStreaming) return;
    setSelectedId(id);
    setDraftMode(false);
    setPendingTurn(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.conversation.id;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/mentor/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let msg = "Impossibile eliminare la conversazione.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // Non-JSON error body — keep the default message.
        }
        throw new Error(msg);
      }

      removeConversation(profileId, id);
      // If the deleted chat was the one on screen, fall back to the most recent.
      if (selectedId === id) setSelectedId(null);
      setDraftMode(false);
      setPendingDelete(null);
      toast.success("Conversazione eliminata.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore durante l'eliminazione.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    // No conversation_id on a brand-new chat (draft) or an empty profile — the
    // route creates the conversation on this first message.
    const conversationId = draftMode
      ? undefined
      : activeConversation?.conversation.id;

    setInputValue("");
    setPendingTurn({ userContent: text, mentorContent: "", status: "streaming" });
    setIsStreaming(true);

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          conversation_id: conversationId,
          message: text,
        }),
      });

      if (!res.ok || !res.body) {
        let errMsg = "Il mentor non è riuscito a rispondere. Riprova.";
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
        } catch {
          // Non-JSON error body — keep the default message.
        }
        throw new Error(errMsg);
      }

      // Adopt the conversation id (and, for a new chat, its server-derived label).
      const adoptedId =
        res.headers.get("X-Conversation-Id") ?? conversationId ?? null;
      const labelHeader = res.headers.get("X-Conversation-Label");
      const adoptedLabel = labelHeader ? decodeURIComponent(labelHeader) : null;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let mentorText = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        mentorText += decoder.decode(value, { stream: true });
        setPendingTurn({ userContent: text, mentorContent: mentorText, status: "streaming" });
      }
      mentorText += decoder.decode();

      // The exchange is persisted server-side; reconcile client state so the
      // sidebar updates instantly (no router.refresh over every profile).
      if (adoptedId) {
        applyMentorTurn({
          profileId,
          conversationId: adoptedId,
          label: adoptedLabel,
          userContent: text,
          mentorContent: mentorText,
        });
        setDraftMode(false);
        setSelectedId(adoptedId);
      }
      setPendingTurn(null);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore di connessione con il mentor.";
      toast.error(msg);
      // Keep the user's message visible so they can retry.
      setPendingTurn((prev) =>
        prev
          ? { ...prev, status: "error" }
          : { userContent: text, mentorContent: "", status: "error" },
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const headerTitle = activeConversation
    ? conversationTitle(activeConversation)
    : "Nuova chat";

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6">
      {/* Left Sidebar - Conversations */}
      <div className="w-72 flex-shrink-0 overflow-y-auto">
        <Button
          variant="outline"
          className="mb-4 w-full justify-start gap-2"
          onClick={startNewChat}
          disabled={isStreaming}
        >
          <Plus className="h-4 w-4" />
          Nuova chat
        </Button>

        {/* Saved/Bookmarked */}
        {bookmarkedConversations.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" />
              Momenti salvati
            </div>
            <div className="space-y-1">
              {bookmarkedConversations.map((conv) => (
                <ConversationItem
                  key={conv.conversation.id}
                  conv={conv}
                  isActive={activeConversation?.conversation.id === conv.conversation.id}
                  showStar
                  disabled={isStreaming}
                  onSelect={() => selectConversation(conv.conversation.id)}
                  onRequestDelete={() => setPendingDelete(conv)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Recenti
          </div>
          <div className="space-y-4">
            {Object.entries(groupedRecent).map(([dateGroup, convs]) => (
              <div key={dateGroup}>
                <div className="mb-1 px-3 text-xs text-muted-foreground">{dateGroup}</div>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <ConversationItem
                      key={conv.conversation.id}
                      conv={conv}
                      isActive={activeConversation?.conversation.id === conv.conversation.id}
                      disabled={isStreaming}
                      onSelect={() => selectConversation(conv.conversation.id)}
                      onRequestDelete={() => setPendingDelete(conv)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Mentor di Carriera</div>
                <div className="text-xs text-muted-foreground">
                  Il tuo assistente di carriera basato su AI
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{headerTitle}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {baseMessages.length === 0 && !pendingTurn && (
              <div className="pt-20 text-center text-sm text-muted-foreground">
                Inizia una nuova conversazione con il tuo mentor.
              </div>
            )}

            {baseMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "group relative max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {/* Save button on hover for mentor messages (decorative) */}
                  {message.role === "mentor" && (
                    <button
                      className={cn(
                        "absolute -right-8 top-2 rounded p-1 hover:bg-muted hover:text-warning",
                        message.is_bookmarked
                          ? "text-warning"
                          : "hidden text-muted-foreground group-hover:block"
                      )}
                    >
                      <Star className={cn("h-4 w-4", message.is_bookmarked && "fill-current")} />
                    </button>
                  )}

                  {/* Message content with markdown-like rendering */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {formatMessage(message.content)}
                  </div>

                  <div
                    className={cn(
                      "mt-1.5 text-xs",
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(new Date(message.created_at), "HH:mm")}
                  </div>
                </div>
              </div>
            ))}

            {/* Optimistic in-flight turn */}
            {pendingTurn && (
              <>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {formatMessage(pendingTurn.userContent)}
                    </div>
                  </div>
                </div>

                {pendingTurn.status === "error" ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                      Risposta non riuscita. Riprova.
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-foreground">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {pendingTurn.mentorContent ? (
                          formatMessage(pendingTurn.mentorContent)
                        ) : (
                          <span className="text-muted-foreground">…</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Chiedi qualsiasi cosa al tuo mentor..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              disabled={isStreaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || isStreaming}
              onClick={sendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Il mentor usa il tuo profilo, la survey, il CV attivo e l'ultima analisi per
            risposte su misura.
          </p>
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la conversazione?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${conversationTitle(pendingDelete)}" e tutti i suoi messaggi verranno eliminati definitivamente. Questa azione non può essere annullata.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deletingId !== null}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deletingId !== null ? "Eliminazione…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Simple markdown-like formatting for messages
function formatMessage(content: string): React.ReactNode {
  // Split by double newlines for paragraphs
  const paragraphs = content.split("\n\n");

  return paragraphs.map((para, pIndex) => {
    // Check if it's a numbered list
    const listMatch = para.match(/^\d+\./m);
    if (listMatch) {
      const items = para.split(/\n(?=\d+\.)/);
      return (
        <div key={pIndex} className="my-2 space-y-1">
          {items.map((item, iIndex) => (
            <div key={iIndex}>{formatInline(item)}</div>
          ))}
        </div>
      );
    }

    return (
      <p key={pIndex} className={pIndex > 0 ? "mt-3" : ""}>
        {formatInline(para)}
      </p>
    );
  });
}

function formatInline(text: string): React.ReactNode {
  // Bold text with **
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
