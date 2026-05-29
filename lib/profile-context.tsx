"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { buildScoreBreakdown, computeOverallScore } from "@/lib/scoring";
import type {
  AnalysisRow,
  ConversationBundle,
  CvBundle,
  MessageRow,
  ProfileBundle,
  ProfileSummary,
  ScorePoint,
} from "@/lib/db/rows";

// A completed mentor exchange (one user message + one mentor reply) to merge
// into client state. The client carries the text + the server's conversation id;
// message ids/timestamps are synthesized here for rendering (the server is the
// source of truth on the next full load).
type MentorTurn = {
  profileId: string;
  conversationId: string;
  label: string | null; // used only when creating a new conversation bundle
  userContent: string;
  mentorContent: string;
};

type ProfileContextType = {
  current: ProfileBundle;
  setCurrentSlug: (slug: string) => void;
  summaries: ProfileSummary[];
  // Merges a freshly-run analysis row into client state so every screen updates
  // immediately, without a server round-trip or router.refresh().
  applyAnalysis: (analysis: AnalysisRow) => void;
  // Merges a completed mentor exchange into client state so the sidebar (recency
  // ordering, new conversation, date grouping) updates instantly — the mentor's
  // counterpart to applyAnalysis.
  applyMentorTurn: (turn: MentorTurn) => void;
  // Removes a deleted conversation from client state so the sidebar updates
  // instantly, without a server round-trip.
  removeConversation: (profileId: string, conversationId: string) => void;
  // Promotes a CV to active in client state — flips the statuses and recomputes
  // the active-CV-derived fields (career score, breakdown, latest analysis) so
  // the CV list, dashboard and sidebar update instantly, mirroring the server.
  setActiveCv: (profileId: string, cvId: string) => void;
  // Merges a saved survey into client state so the profile page reflects the
  // persisted data without a server round-trip.
  applySurvey: (profileId: string, survey: import('@/lib/types').SurveyData) => void;
  // Merges saved profile education fields into client state.
  applyProfile: (profileId: string, fields: Partial<import('@/lib/db/rows').ProfileRow>) => void;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({
  initialBundles,
  children,
}: {
  initialBundles: ProfileBundle[];
  children: ReactNode;
}) {
  if (initialBundles.length === 0) {
    throw new Error("ProfileProvider requires at least one profile bundle");
  }

  const [bundles, setBundles] = useState<ProfileBundle[]>(initialBundles);
  const [currentSlug, setCurrentSlug] = useState<string>(
    initialBundles[0].profile.slug,
  );

  // Adopt fresh server data when the layout re-renders (e.g. a CV upload calls
  // router.refresh()). `initialBundles` only changes reference on a real server
  // render, so this never clobbers client-side updates on ordinary re-renders.
  useEffect(() => {
    setBundles(initialBundles);
  }, [initialBundles]);

  // Recomputes the same derived fields bundle.ts produces on the server, but for
  // a single profile's just-updated CV — keeping client and server views aligned.
  const applyAnalysis = useCallback((analysis: AnalysisRow) => {
    setBundles((prev) =>
      prev.map((bundle) => {
        if (bundle.profile.id !== analysis.profile_id) return bundle;

        const cvs: CvBundle[] = bundle.cvs.map((cb) => {
          if (cb.cv.id !== analysis.cv_id) return cb;
          const formal = analysis.formal_evaluation;
          const gap = analysis.gap_analysis;
          return {
            ...cb,
            analysis,
            score: computeOverallScore(formal, gap),
            scoreBreakdown: buildScoreBreakdown(formal, gap),
          };
        });

        const activeCv = cvs.find((c) => c.cv.status === "active") ?? cvs[0] ?? null;

        const scoreHistory: ScorePoint[] = [...cvs]
          .reverse()
          .filter((c): c is CvBundle & { score: number } => c.score !== null)
          .map((c) => ({
            date: format(new Date(c.cv.uploaded_at), "MMM yyyy", { locale: it }),
            score: c.score,
          }));

        return {
          ...bundle,
          cvs,
          activeCv,
          latestAnalysis: activeCv?.analysis ?? null,
          careerScore: activeCv?.score ?? null,
          scoreBreakdown: activeCv?.scoreBreakdown ?? null,
          scoreHistory,
        };
      }),
    );
  }, []);

  // Merges a completed mentor turn into the matching profile's conversations:
  // appends the two messages to an existing conversation or prepends a new
  // bundle, bumps updated_at, and re-sorts by recency (mirrors
  // getConversationsForProfile's ordering on the server).
  const applyMentorTurn = useCallback((turn: MentorTurn) => {
    const now = new Date().toISOString();
    const mkMessage = (
      role: MessageRow["role"],
      content: string,
    ): MessageRow => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Math.random().toString(36).slice(2)}`,
      conversation_id: turn.conversationId,
      role,
      content,
      is_bookmarked: false,
      bookmark_label: null,
      created_at: now,
    });
    const newMessages = [
      mkMessage("user", turn.userContent),
      mkMessage("mentor", turn.mentorContent),
    ];

    setBundles((prev) =>
      prev.map((bundle) => {
        if (bundle.profile.id !== turn.profileId) return bundle;

        const exists = bundle.conversations.some(
          (c) => c.conversation.id === turn.conversationId,
        );

        let conversations: ConversationBundle[];
        if (exists) {
          conversations = bundle.conversations.map((c) =>
            c.conversation.id === turn.conversationId
              ? {
                  ...c,
                  conversation: { ...c.conversation, updated_at: now },
                  messages: [...c.messages, ...newMessages],
                  dateGroup: "Oggi",
                }
              : c,
          );
        } else {
          const created: ConversationBundle = {
            conversation: {
              id: turn.conversationId,
              profile_id: turn.profileId,
              label: turn.label,
              created_at: now,
              updated_at: now,
            },
            messages: newMessages,
            isBookmarked: false,
            dateGroup: "Oggi",
          };
          conversations = [created, ...bundle.conversations];
        }

        // Newest updated_at first, matching the server read order.
        conversations = [...conversations].sort(
          (a, b) =>
            new Date(b.conversation.updated_at).getTime() -
            new Date(a.conversation.updated_at).getTime(),
        );

        return { ...bundle, conversations };
      }),
    );
  }, []);

  // Drops a deleted conversation from the matching profile's bundle.
  const removeConversation = useCallback(
    (profileId: string, conversationId: string) => {
      setBundles((prev) =>
        prev.map((bundle) =>
          bundle.profile.id !== profileId
            ? bundle
            : {
                ...bundle,
                conversations: bundle.conversations.filter(
                  (c) => c.conversation.id !== conversationId,
                ),
              },
        ),
      );
    },
    [],
  );

  const applySurvey = useCallback(
    (profileId: string, survey: import('@/lib/types').SurveyData) => {
      setBundles((prev) =>
        prev.map((bundle) =>
          bundle.profile.id !== profileId ? bundle : { ...bundle, survey },
        ),
      );
    },
    [],
  );

  const applyProfile = useCallback(
    (profileId: string, fields: Partial<import('@/lib/db/rows').ProfileRow>) => {
      setBundles((prev) =>
        prev.map((bundle) =>
          bundle.profile.id !== profileId
            ? bundle
            : { ...bundle, profile: { ...bundle.profile, ...fields } },
        ),
      );
    },
    [],
  );

  // Flips the active CV within a profile: the chosen CV becomes active, every
  // other is archived (one-active-per-profile, matching setActiveCv on the
  // server). Per-CV score/breakdown are already on each bundle, so we only pick
  // the new active CV's values for the profile-level fields. scoreHistory is
  // independent of which CV is active, so it's left untouched.
  const setActiveCv = useCallback((profileId: string, cvId: string) => {
    setBundles((prev) =>
      prev.map((bundle) => {
        if (bundle.profile.id !== profileId) return bundle;

        const cvs: CvBundle[] = bundle.cvs.map((cb) => ({
          ...cb,
          cv: {
            ...cb.cv,
            status: cb.cv.id === cvId ? "active" : "archived",
          },
        }));

        const activeCv = cvs.find((c) => c.cv.status === "active") ?? cvs[0] ?? null;

        return {
          ...bundle,
          cvs,
          activeCv,
          latestAnalysis: activeCv?.analysis ?? null,
          careerScore: activeCv?.score ?? null,
          scoreBreakdown: activeCv?.scoreBreakdown ?? null,
        };
      }),
    );
  }, []);

  const current = bundles.find((b) => b.profile.slug === currentSlug) ?? bundles[0];

  const summaries: ProfileSummary[] = bundles.map((b) => ({
    slug: b.profile.slug,
    name: b.profile.name,
    avatar: b.profile.avatar,
    university: b.profile.university,
    year: b.profile.year,
    targetRole: b.profile.target_role,
  }));

  return (
    <ProfileContext.Provider
      value={{
        current,
        setCurrentSlug,
        summaries,
        applyAnalysis,
        applyMentorTurn,
        removeConversation,
        setActiveCv,
        applySurvey,
        applyProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
