import {env} from 'cloudflare:workers';
import {adminUser,defaults} from '../../../lib/studio';
export const dynamic='force-dynamic';
export async function GET(request:Request){const preview=new URL(request.url).searchParams.get('preview')==='1';if(preview&&!await adminUser())return Response.json({error:'Admin sign-in required'},{status:403});try{const row=env.DB?await env.DB.prepare('SELECT draft,published FROM studio_settings WHERE id=?').bind('site').first<{draft:string,published:string}>():null;return Response.json(row?JSON.parse(preview?row.draft:row.published):defaults,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json(defaults,{headers:{'Cache-Control':'no-store'}});}}
