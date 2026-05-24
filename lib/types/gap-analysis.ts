import { z } from 'zod'
import {
  GapCategoryEnum,
  PriorityEnum,
  ReframingTargetSectionEnum,
  SchemaVersionLiteral,
  SkillStrengthEnum,
  TargetRoleEnum,
} from './enums'

const DimensionScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
})

const PossessedSkillSchema = z.object({
  skill: z.string(),
  evidence: z.string(),
  strength: SkillStrengthEnum,
})

const GapSchema = z.object({
  title: z.string(),
  detail: z.string(),
  priority: PriorityEnum,
  category: GapCategoryEnum,
})

const ReframingSuggestionSchema = z.object({
  target_section: ReframingTargetSectionEnum,
  current_text: z.string(),
  suggested_text: z.string(),
  rationale: z.string(),
})

export const GapAnalysisSchema = z.object({
  schema_version: SchemaVersionLiteral,
  target_role: TargetRoleEnum,
  dimension_scores: z.object({
    market_fit: DimensionScoreSchema,
    relevance: DimensionScoreSchema,
  }),
  match_summary: z.string(),
  possessed_skills: z.array(PossessedSkillSchema),
  gaps: z.array(GapSchema),
  reframing_suggestions: z.array(ReframingSuggestionSchema),
})

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>
