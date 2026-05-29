import { format, isToday, isYesterday, isThisWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { listProfiles } from './profiles'
import { listCvsForProfile } from './cvs'
import { getSurveyForProfile } from './surveys'
import { getLatestAnalysisForCv } from './analyses'
import { getConversationsForProfile, getMessagesForConversation } from './mentor'
import { computeOverallScore, buildScoreBreakdown } from '@/lib/scoring'
import { cvVersionLabel, cvUploadedLabel } from '@/lib/cv-label'
import type {
  ProfileRow,
  ProfileBundle,
  CvBundle,
  ConversationBundle,
  ActivityItem,
  ScorePoint,
} from './rows'

function dateGroup(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Oggi'
  if (isYesterday(d)) return 'Ieri'
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'Questa settimana'
  return format(d, 'd MMM yyyy', { locale: it })
}

function buildRecentActivity(
  cvs: CvBundle[],
  conversations: ConversationBundle[],
): ActivityItem[] {
  const dated: { ts: number; item: ActivityItem }[] = []

  for (const c of cvs) {
    dated.push({
      ts: new Date(c.cv.uploaded_at).getTime(),
      item: {
        id: `cv-${c.cv.id}`,
        type: 'cv_upload',
        description: 'Nuovo CV caricato',
        date: format(new Date(c.cv.uploaded_at), 'd MMM yyyy', { locale: it }),
      },
    })
  }

  for (const c of conversations) {
    dated.push({
      ts: new Date(c.conversation.updated_at).getTime(),
      item: {
        id: `conv-${c.conversation.id}`,
        type: 'mentor_chat',
        description: c.conversation.label ?? 'Conversazione con il mentor',
        date: format(new Date(c.conversation.updated_at), 'd MMM yyyy', { locale: it }),
      },
    })
  }

  return dated
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 6)
    .map((d) => d.item)
}

async function buildBundle(profile: ProfileRow): Promise<ProfileBundle> {
  const [survey, cvRows, conversationRows] = await Promise.all([
    getSurveyForProfile(profile.id),
    listCvsForProfile(profile.id),
    getConversationsForProfile(profile.id),
  ])

  // Assign version numbers by sorting CVs oldest-first. "Versione 1" is always
  // the earliest upload, "Versione N" the most recent, regardless of gaps
  // left by deletions. The DB `version` column is intentionally ignored here.
  const sortedAscending = [...cvRows].sort(
    (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime(),
  )
  const versionNumber = new Map(sortedAscending.map((cv, i) => [cv.id, i + 1]))

  const cvs: CvBundle[] = await Promise.all(
    cvRows.map(async (cv) => {
      const analysis = await getLatestAnalysisForCv(cv.id)
      const formal = analysis?.formal_evaluation ?? null
      const gap = analysis?.gap_analysis ?? null
      return {
        cv,
        analysis,
        score: computeOverallScore(formal, gap),
        scoreBreakdown: buildScoreBreakdown(formal, gap),
        uploadedLabel: cvUploadedLabel(cv.uploaded_at),
        title: cvVersionLabel(versionNumber.get(cv.id) ?? 0),
      }
    }),
  )

  const activeCv = cvs.find((c) => c.cv.status === 'active') ?? cvs[0] ?? null

  // Oldest CV first, so the line chart reads left-to-right over time.
  const scoreHistory: ScorePoint[] = [...cvs]
    .reverse()
    .filter((c): c is CvBundle & { score: number } => c.score !== null)
    .map((c) => ({
      date: format(new Date(c.cv.uploaded_at), 'MMM yyyy', { locale: it }),
      score: c.score,
    }))

  const conversations: ConversationBundle[] = await Promise.all(
    conversationRows.map(async (conversation) => {
      const messages = await getMessagesForConversation(conversation.id)
      return {
        conversation,
        messages,
        isBookmarked: messages.some((m) => m.is_bookmarked),
        dateGroup: dateGroup(conversation.updated_at),
      }
    }),
  )

  return {
    profile,
    survey,
    cvs,
    activeCv,
    latestAnalysis: activeCv?.analysis ?? null,
    conversations,
    careerScore: activeCv?.score ?? null,
    scoreBreakdown: activeCv?.scoreBreakdown ?? null,
    scoreHistory,
    recentActivity: buildRecentActivity(cvs, conversations),
  }
}

// Assembles every profile with all the data the four screens need, derived
// scores included. Called once on the server (root layout) and hydrated into
// the client ProfileProvider so switching profiles stays instant.
export async function getAllProfileBundles(): Promise<ProfileBundle[]> {
  const profiles = await listProfiles()
  return Promise.all(profiles.map(buildBundle))
}
