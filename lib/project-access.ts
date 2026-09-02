import 'server-only'
import { hashToken } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

export type Project = {
  id: string
  name: string
  client_name: string
  client_email?: string
  drive_account_id: string
  drive_folder_id: string
  storage_limit_bytes?: number
  expires_at: string
  disabled_at?: string
}

export async function getProjectByToken(token: string): Promise<Project | null> {
  if (!token || token.length < 32) return null
  const rows = await supabase<Project[]>(`projects?access_token_hash=eq.${encodeURIComponent(hashToken(token))}&select=id,name,client_name,client_email,drive_account_id,drive_folder_id,storage_limit_bytes,expires_at,disabled_at&limit=1`)
  const project = rows[0]
  if (!project || project.disabled_at || new Date(project.expires_at).getTime() <= Date.now()) return null
  return project
}
