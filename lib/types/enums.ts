import { z } from 'zod'

export const SchemaVersionLiteral = z.literal('1.0')
export type SchemaVersion = z.infer<typeof SchemaVersionLiteral>

export const TargetRoleEnum = z.enum([
  'data_analyst',
  'digital_marketing',
  'software_developer',
])
export type TargetRole = z.infer<typeof TargetRoleEnum>

export const IndustryEnum = z.enum([
  'tech',
  'finance',
  'consulting',
  'marketing_advertising',
  'manufacturing',
  'energy',
  'healthcare',
  'retail_ecommerce',
  'luxury',
  'fashion',
  'food_beverage',
])
export type Industry = z.infer<typeof IndustryEnum>

export const ScoreDimensionEnum = z.enum([
  'completeness',
  'action_impact',
  'clarity',
  'market_fit',
  'relevance',
])
export type ScoreDimension = z.infer<typeof ScoreDimensionEnum>

export const PriorityEnum = z.enum(['high', 'medium', 'low'])
export type Priority = z.infer<typeof PriorityEnum>

export const CompanySizeEnum = z.enum([
  'startup',
  'scale_up',
  'large_enterprise',
  'consulting_firm',
  'agency',
])
export type CompanySize = z.infer<typeof CompanySizeEnum>

export const WorkStyleEnum = z.enum(['remote', 'hybrid', 'onsite'])
export type WorkStyle = z.infer<typeof WorkStyleEnum>

export const WorkExperienceTypeEnum = z.enum([
  'internship',
  'full_time',
  'part_time',
  'freelance',
  'contract',
])
export type WorkExperienceType = z.infer<typeof WorkExperienceTypeEnum>

export const CvSectionEnum = z.enum([
  'personal_info',
  'education',
  'work_experience',
  'projects',
  'extracurriculars',
  'additional_info',
  'overall',
])
export type CvSection = z.infer<typeof CvSectionEnum>

export const ReframingTargetSectionEnum = z.enum([
  'education',
  'work_experience',
  'projects',
  'extracurriculars',
  'additional_info',
])
export type ReframingTargetSection = z.infer<typeof ReframingTargetSectionEnum>

export const SkillStrengthEnum = z.enum(['strong', 'moderate', 'basic'])
export type SkillStrength = z.infer<typeof SkillStrengthEnum>

export const GapCategoryEnum = z.enum([
  'technical_skill',
  'tool',
  'certification',
  'experience',
  'soft_signal',
])
export type GapCategory = z.infer<typeof GapCategoryEnum>

export const ActionTypeEnum = z.enum([
  'course',
  'project',
  'certification',
  'reading',
  'networking',
  'other',
])
export type ActionType = z.infer<typeof ActionTypeEnum>
