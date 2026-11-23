import {randomUUID} from 'node:crypto';
import {db} from '../models/database.js';
export function createClient(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid enquiry');
 const text=(key,max,required=false)=>{
  const value=body[key];
  if(value!==undefined&&typeof value!=='string')throw Error('Invalid '+key);
  const result=(value||'').trim();
  if((required&&!result)||result.length>max)throw Error('Please check '+key);
  return result;
 };
 const name=text('name',100,true),reply=text('reply',160,true),company=text('company',140),service=text('service',160,true),details=text('details',2000,true);
 const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 const phone=/^[+()\d\s.-]{7,30}$/;
 if(!email.test(reply)&&!(phone.test(reply)&&reply.replace(/\D/g,'').length>=7))throw Error('Enter a valid phone number or email');
 const id=randomUUID(),at=new Date().toISOString();
 db.prepare('INSERT INTO clients(id,name,reply,company,service,details,created_at) VALUES(?,?,?,?,?,?,?)').run(id,name,reply,company,service,details,at);
 return {ok:true,id};
}
export function listClients(offset=0){
 return {clients:db.prepare('SELECT * FROM clients ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?').all(offset),total:db.prepare('SELECT COUNT(*) AS count FROM clients').get().count};
}
