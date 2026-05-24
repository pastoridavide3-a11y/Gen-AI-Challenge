import type {
  TargetRole,
  Industry,
  CompanySize,
  WorkStyle,
  Priority,
  GapCategory,
  SkillStrength,
  ActionType,
  CvSection,
} from '@/lib/types'

export const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  data_analyst: 'Data Analyst',
  digital_marketing: 'Digital Marketing',
  software_developer: 'Software Developer',
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  tech: 'Tech',
  finance: 'Finance',
  consulting: 'Consulting',
  marketing_advertising: 'Marketing & Advertising',
  manufacturing: 'Manufacturing',
  energy: 'Energy',
  healthcare: 'Healthcare',
  retail_ecommerce: 'Retail & E-commerce',
  luxury: 'Luxury',
  fashion: 'Fashion',
  food_beverage: 'Food & Beverage',
}

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  startup: 'Startup',
  scale_up: 'Scale-up',
  large_enterprise: 'Large Enterprise',
  consulting_firm: 'Consulting Firm',
  agency: 'Agency',
}

export const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

export function targetRoleLabel(role: TargetRole | null): string {
  return role ? TARGET_ROLE_LABELS[role] : '—'
}

// ---- Analysis labels (presentational, Italian) ----

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
}

export const GAP_CATEGORY_LABELS: Record<GapCategory, string> = {
  technical_skill: 'Competenza tecnica',
  tool: 'Strumento',
  certification: 'Certificazione',
  experience: 'Esperienza',
  soft_signal: 'Soft skill',
}

export const SKILL_STRENGTH_LABELS: Record<SkillStrength, string> = {
  strong: 'Solida',
  moderate: 'Discreta',
  basic: 'Base',
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  course: 'Corso',
  project: 'Progetto',
  certification: 'Certificazione',
  reading: 'Lettura',
  networking: 'Networking',
  other: 'Attività',
}

export const CV_SECTION_LABELS: Record<CvSection, string> = {
  personal_info: 'Dati personali',
  education: 'Formazione',
  work_experience: 'Esperienza',
  projects: 'Progetti',
  extracurriculars: 'Attività extra',
  additional_info: 'Competenze',
  overall: 'Generale',
}
