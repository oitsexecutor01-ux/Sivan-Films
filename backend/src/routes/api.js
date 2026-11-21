import {randomBytes} from 'node:crypto';import {authorised,hash,sameSecret} from '../middleware/auth.js';import {db} from '../models/database.js';import {json,readBody} from '../utils/http.js';import {getState,adminState,update} from '../controllers/contentController.js';
const attempts=new Map();
export async function api(req,res,url){
 const trustedOrigin=()=>{try{return new URL(req.headers.origin).host===req.headers.host}catch{return false}};
 if(req.method==='POST'&&!trustedOrigin())return json(res,{error:'Invalid request origin'},403);
 if(url.pathname==='/api/auth/login'&&req.method==='POST'){const key=req.socket.remoteAddress;const entry=attempts.get(key)||{count:0,until:0};if(entry.until>Date.now())return json(res,{error:'Too many attempts. Try in 15 minutes.'},429);const b=await readBody(req);if(b.email!==process.env.ADMIN_EMAIL||!sameSecret(String(b.password||''),process.env.ADMIN_PASSWORD)){entry.count++;if(entry.count>=8)entry.until=Date.now()+900000;attempts.set(key,entry);return json(res,{error:'Invalid email or password'},401);}attempts.delete(key);const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?)').run(hash(token),Date.now()+21600000);res.setHeader('Set-Cookie',`sf_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=21600${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,{ok:true});}
 if(url.pathname==='/api/auth/logout'){res.setHeader('Set-Cookie','sf_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.writeHead(302,{Location:'/admin'});return res.end();}
 if(url.pathname==='/api/auth/me')return json(res,{user:authorised(req)?{email:process.env.ADMIN_EMAIL}:null});
 if(url.pathname==='/api/studio-content'&&req.method==='GET'){if(url.searchParams.get('preview')==='1'&&!authorised(req))return json(res,{error:'Admin access required'},403);const s=getState();return json(res,JSON.parse(url.searchParams.get('preview')==='1'?s.draft:s.published));}
 if(url.pathname==='/api/studio-admin'){if(!authorised(req))return json(res,{error:'Admin access required'},403);if(req.method==='GET')return json(res,adminState());if(req.method==='POST')return json(res,update(await readBody(req)));}
 return json(res,{error:'Not found'},404);
}
