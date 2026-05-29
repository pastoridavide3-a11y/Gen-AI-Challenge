import { createClient } from './client'
import type { SurveyData } from '@/lib/types'

export async function getSurveyForProfile(profileId: string): Promise<SurveyData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('data')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw new Error(`getSurveyForProfile(${profileId}): ${error.message}`)
  return (data?.data as SurveyData | undefined) ?? null
}

export async function updateSurvey(profileId: string, surveyData: SurveyData): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('surveys')
    .update({ data: surveyData })
    .eq('profile_id', profileId)

  if (error) throw new Error(`updateSurvey(${profileId}): ${error.message}`)
}
