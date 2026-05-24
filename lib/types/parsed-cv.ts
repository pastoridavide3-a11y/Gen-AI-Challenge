import { z } from 'zod'
import { SchemaVersionLiteral, WorkExperienceTypeEnum } from './enums'

const PersonalInfoSchema = z.object({
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  github_url: z.string().nullable(),
  portfolio_url: z.string().nullable(),
})

const EducationItemSchema = z.object({
  institution: z.string(),
  location: z.string().nullable(),
  degree: z.string(),
  field_of_study: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  expected: z.boolean(),
  gpa: z.string().nullable(),
  honors: z.array(z.string()),
  relevant_courses: z.array(z.string()),
})

const WorkExperienceItemSchema = z.object({
  role: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  type: WorkExperienceTypeEnum.nullable(),
  bullets: z.array(z.string()),
})

const ProjectItemSchema = z.object({
  name: z.string(),
  context: z.string().nullable(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  technologies: z.array(z.string()),
  url: z.string().nullable(),
  bullets: z.array(z.string()),
})

const ExtracurricularItemSchema = z.object({
  title: z.string(),
  organization: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  bullets: z.array(z.string()),
})

const LanguageItemSchema = z.object({
  name: z.string(),
  level: z.string().nullable(),
})

const CertificationItemSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
})

const AdditionalInfoSchema = z.object({
  technical_skills: z.array(z.string()),
  languages: z.array(LanguageItemSchema),
  certifications: z.array(CertificationItemSchema),
  interests: z.array(z.string()),
})

export const ParsedCvSchema = z.object({
  schema_version: SchemaVersionLiteral,
  personal_info: PersonalInfoSchema,
  education: z.array(EducationItemSchema),
  work_experience: z.array(WorkExperienceItemSchema),
  projects: z.array(ProjectItemSchema),
  extracurriculars: z.array(ExtracurricularItemSchema),
  additional_info: AdditionalInfoSchema,
})

export type ParsedCv = z.infer<typeof ParsedCvSchema>
