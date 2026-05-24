import { z } from 'zod'
import { ActionTypeEnum, PriorityEnum, SchemaVersionLiteral } from './enums'

const ResourceSchema = z.object({
  label: z.string(),
  url: z.string().nullable(),
  note: z.string().nullable(),
})

const ActionSchema = z.object({
  id: z.string(),
  type: ActionTypeEnum,
  title: z.string(),
  description: z.string(),
  addresses_gaps: z.array(z.string()),
  estimated_effort: z.string(),
  estimated_cost: z.string().nullable(),
  priority: PriorityEnum,
  resources: z.array(ResourceSchema),
  outcome: z.string(),
})

export const LearningPathSchema = z.object({
  schema_version: SchemaVersionLiteral,
  intro: z.string(),
  actions: z.array(ActionSchema),
})

export type LearningPath = z.infer<typeof LearningPathSchema>
