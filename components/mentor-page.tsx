"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { MentorConversation } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Send, Clock, Bookmark, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function MentorPage() {
  const { currentProfile } = useProfile();
  const [selectedConversation, setSelectedConversation] = useState<MentorConversation>(
    currentProfile.mentorConversations[0]
  );
  const [inputValue, setInputValue] = useState("");

  const bookmarkedConversations = currentProfile.mentorConversations.filter(c => c.isBookmarked);
  const recentConversations = currentProfile.mentorConversations;

  // Group recent conversations by date category
  const groupedRecent = recentConversations.reduce((acc, conv) => {
    const group = conv.date;
    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {} as Record<string, MentorConversation[]>);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6">
      {/* Left Sidebar - Conversations */}
      <div className="w-72 flex-shrink-0 overflow-y-auto">
        {/* Saved/Bookmarked */}
        {bookmarkedConversations.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" />
              Saved Moments
            </div>
            <div className="space-y-1">
              {bookmarkedConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    selectedConversation.id === conv.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-current text-warning" />
                    <span className="truncate font-medium">{conv.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Recent
          </div>
          <div className="space-y-4">
            {Object.entries(groupedRecent).map(([dateGroup, conversations]) => (
              <div key={dateGroup}>
                <div className="mb-1 px-3 text-xs text-muted-foreground">{dateGroup}</div>
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        selectedConversation.id === conv.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate font-medium">{conv.label}</span>
                    </button>
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
                <div className="font-semibold text-foreground">Career Mentor</div>
                <div className="text-xs text-muted-foreground">
                  Your AI-powered career companion
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{selectedConversation.label}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {selectedConversation.messages.map((message, i) => (
              <div
                key={i}
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
                  {/* Save button on hover for mentor messages */}
                  {message.role === "mentor" && (
                    <button className="absolute -right-8 top-2 hidden rounded p-1 text-muted-foreground hover:bg-muted hover:text-warning group-hover:block">
                      <Star className="h-4 w-4" />
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
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask your mentor anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue.trim()) {
                  // Mock - would send message in real app
                  setInputValue("");
                }
              }}
            />
            <Button 
              size="icon"
              disabled={!inputValue.trim()}
              onClick={() => setInputValue("")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            This is a prototype. Messages are not actually sent.
          </p>
        </div>
      </Card>
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
