import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isAdmin } from '@/lib/admin-auth'
import { accessTokenFromRefreshToken, createDriveFolder, hashToken } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

function clean(value: unknown, max:number) {
  if (typeof value !== 'string') return null
  const v=value.trim()
  return v && v.length<=max && !/[\u0000-\u001f\u007f]/.test(v) ? v : null
}

export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}) {
  if (!(await isAdmin())) return NextResponse.json({error:'Unauthorized.'},{status:401})
  const {projectId}=await params
  const sourceRows=await supabase<Array<{id:string;name:string;client_name:string;client_email:string|null;storage_limit_bytes:number|null;expires_at:string;drive_account_id:string;drive_folder_id:string}>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,storage_limit_bytes,expires_at,drive_account_id,drive_folder_id&limit=1`)
  const source=sourceRows[0]
  if(!source)return NextResponse.json({error:'Project not found.'},{status:404})
  const body=await request.json().catch(()=>null) as {name?:string;clientName?:string;clientEmail?:string|null;expiresAt?:string}|null
  const name=clean(body?.name,160)||`${source.name} Copy`
  const clientName=clean(body?.clientName,160)||source.client_name
  const clientEmail=body?.clientEmail===null?null:(typeof body?.clientEmail==='string'?body.clientEmail.trim():source.client_email)
  if(clientEmail&&(clientEmail.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)))return NextResponse.json({error:'Invalid client email.'},{status:400})
  const sourceExpiry=new Date(source.expires_at).getTime();const defaultExpiry=new Date(Date.now()+Math.max(7,Math.min(90,Math.ceil(Math.max(0,sourceExpiry-Date.now())/86400000)||30))*86400000).toISOString()
  const expires=new Date(body?.expiresAt||defaultExpiry)
  if(Number.isNaN(expires.getTime())||expires.getTime()<=Date.now())return NextResponse.json({error:'A future expiry date is required.'},{status:400})
  const accounts=await supabase<Array<{id:string;refresh_token:string;root_folder_id:string|null}>>(`drive_accounts?id=eq.${encodeURIComponent(source.drive_account_id)}&select=id,refresh_token,root_folder_id&limit=1`)
  const account=accounts[0];if(!account)return NextResponse.json({error:'Storage account unavailable.'},{status:500})
  const root=account.root_folder_id||process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID||'root'
  const access=await accessTokenFromRefreshToken(account.refresh_token)
  const folder=await createDriveFolder(access.access_token,name,root)
  const token=crypto.randomBytes(32).toString('base64url')
  const rows=await supabase<Array<{id:string}>>('projects',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,client_name:clientName,client_email:clientEmail,access_token_hash:hashToken(token),drive_account_id:account.id,drive_folder_id:folder.id,storage_limit_bytes:source.storage_limit_bytes,expires_at:expires.toISOString(),delivery_status:'in_progress'})})
  const id=rows[0]?.id;if(!id)return NextResponse.json({error:'Duplicate project could not be created.'},{status:500})
  await supabase('audit_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({project_id:id,event_type:'project.duplicated',metadata:{sourceProjectId:source.id,sourceProjectName:source.name}})})
  await supabase('audit_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({project_id:source.id,event_type:'project.duplicated_from',metadata:{newProjectId:id,newProjectName:name}})}).catch(()=>undefined)
  return NextResponse.json({id,token,url:`${process.env.NEXT_PUBLIC_APP_URL||''}/u/${token}`},{status:201})
}
