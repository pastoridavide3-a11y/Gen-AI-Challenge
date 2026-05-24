import { z } from 'zod'
import { CvSectionEnum, PriorityEnum, SchemaVersionLiteral } from './enums'

const DimensionScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
})

const StrengthSchema = z.object({
  title: z.string(),
  detail: z.string(),
})

const ImprovementSuggestionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  priority: PriorityEnum,
  target_section: CvSectionEnum,
})

const WritingIssueSchema = z.object({
  section: CvSectionEnum,
  issue: z.string(),
  example: z.string().nullable(),
})

export const FormalEvaluationSchema = z.object({
  schema_version: SchemaVersionLiteral,
  dimension_scores: z.object({
    completeness: DimensionScoreSchema,
    action_impact: DimensionScoreSchema,
    clarity: DimensionScoreSchema,
  }),
  strengths: z.array(StrengthSchema),
  improvement_suggestions: z.array(ImprovementSuggestionSchema),
  writing_issues: z.array(WritingIssueSchema),
})

export type FormalEvaluation = z.infer<typeof FormalEvaluationSchema>
