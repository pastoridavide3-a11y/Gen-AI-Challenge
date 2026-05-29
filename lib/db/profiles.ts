import { createClient } from './client'
import type { ProfileRow } from './rows'

export async function listProfiles(): Promise<ProfileRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`listProfiles: ${error.message}`)
  return (data ?? []) as ProfileRow[]
}

export async function getProfileBySlug(slug: string): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`getProfileBySlug(${slug}): ${error.message}`)
  return (data as ProfileRow | null) ?? null
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getProfileById(${id}): ${error.message}`)
  return (data as ProfileRow | null) ?? null
}

export type ProfileEducationUpdate = {
  university: string | null
  course: string | null
  year: string | null
}

export async function updateProfileEducation(
  id: string,
  fields: ProfileEducationUpdate,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(fields).eq('id', id)
  if (error) throw new Error(`updateProfileEducation(${id}): ${error.message}`)
}
