import { z } from 'zod'
import {
  CompanySizeEnum,
  IndustryEnum,
  SchemaVersionLiteral,
  WorkStyleEnum,
} from './enums'

export const SurveyDataSchema = z.object({
  schema_version: SchemaVersionLiteral,
  industry_interests: z.array(IndustryEnum),
  career_goals: z.object({
    one_year_goal: z.string(),
    three_year_goal: z.string(),
    what_i_dont_want: z.string().nullable(),
  }),
  constraints: z.object({
    geographic_availability: z.array(z.string()),
    weekly_study_hours: z.string().nullable(),
    training_budget: z.string().nullable(),
    other_constraints: z.string().nullable(),
  }),
  work_preferences: z.object({
    company_size: z.array(CompanySizeEnum),
    work_languages: z.array(z.string()),
    work_style: WorkStyleEnum.nullable(),
    other_preferences: z.string().nullable(),
  }),
})

export type SurveyData = z.infer<typeof SurveyDataSchema>
