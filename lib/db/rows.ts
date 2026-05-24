import type {
  ParsedCv,
  FormalEvaluation,
  GapAnalysis,
  LearningPath,
  SurveyData,
  TargetRole,
} from '@/lib/types'
import type { ScoreBreakdown } from '@/lib/scoring'

// ---- Raw table rows (jsonb columns typed against lib/types) ----

export type CvStatus = 'active' | 'archived'
export type AnalysisStatus = 'pending' | 'success' | 'failed'
export type MessageRole = 'user' | 'mentor'

export type ProfileRow = {
  id: string
  slug: string
  name: string
  avatar: string | null
  university: string | null
  course: string | null
  year: string | null
  target_role: TargetRole | null
  created_at: string
  updated_at: string
}

export type CvRow = {
  id: string
  profile_id: string
  version: number
  status: CvStatus
  target_role: TargetRole | null
  file_path: string | null
  raw_text: string | null
  parsed_data: ParsedCv | null
  uploaded_at: string
  created_at: string
  updated_at: string
}

export type AnalysisRow = {
  id: string
  profile_id: string
  cv_id: string
  target_role: TargetRole | null
  formal_evaluation: FormalEvaluation | null
  gap_analysis: GapAnalysis | null
  learning_path: LearningPath | null
  formal_evaluation_status: AnalysisStatus
  gap_analysis_status: AnalysisStatus
  learning_path_status: AnalysisStatus
  created_at: string
  updated_at: string
}

export type SurveyRow = {
  id: string
  profile_id: string
  data: SurveyData
  created_at: string
  updated_at: string
}

export type ConversationRow = {
  id: string
  profile_id: string
  label: string | null
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  is_bookmarked: boolean
  bookmark_label: string | null
  created_at: string
}

// ---- Composed view models (assembled on the server, hydrated into the client context) ----

export type CvBundle = {
  cv: CvRow
  analysis: AnalysisRow | null
  score: number | null
  scoreBreakdown: ScoreBreakdown | null
  uploadedLabel: string
}

export type ConversationBundle = {
  conversation: ConversationRow
  messages: MessageRow[]
  isBookmarked: boolean
  dateGroup: string
}

export type ActivityType = 'cv_upload' | 'mentor_chat' | 'analysis'

export type ActivityItem = {
  id: string
  type: ActivityType
  description: string
  date: string
}

export type ScorePoint = { date: string; score: number }

export type ProfileSummary = {
  slug: string
  name: string
  avatar: string | null
  university: string | null
  year: string | null
  targetRole: TargetRole | null
}

export type ProfileBundle = {
  profile: ProfileRow
  survey: SurveyData | null
  cvs: CvBundle[] // newest version first
  activeCv: CvBundle | null
  latestAnalysis: AnalysisRow | null
  conversations: ConversationBundle[]
  careerScore: number | null
  scoreBreakdown: ScoreBreakdown | null
  scoreHistory: ScorePoint[]
  recentActivity: ActivityItem[]
}
