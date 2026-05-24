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
