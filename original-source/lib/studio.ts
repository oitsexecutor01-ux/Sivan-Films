import defaults from '../source/default-content.json';
import {getChatGPTUser} from '../app/chatgpt-auth';
export {defaults};
export async function adminUser(){const u=await getChatGPTUser();return u&&['ramesh547747@gmail.com','oculixofficial@gmail.com','sivanfilms@gmail.com'].includes(u.email.toLowerCase())?u:null;}
export function validate(input:any){
 const fail=(m:string):never=>{throw Error(m)};
 const str=(v:any,label:string,max=4000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max?v.trim():fail('Check '+label);
 const arr=(v:any,max:number,label:string)=>Array.isArray(v)&&v.length>0&&v.length<=max?v:fail('Check '+label);
 const media=(v:any)=>{const s=str(v,'media URL',1500);if(/^\.?\/assets\/[a-zA-Z0-9_./%-]+$/.test(s)&&!s.includes('..'))return s;try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)return s;}catch{}return fail('Media must use an existing /assets/ path or an HTTPS file URL');};
 const rooms=arr(input?.rooms,5,'rooms').map((r:any,i:number)=>{if(r.id!==defaults.rooms[i].id)fail('Room IDs and order must stay unchanged');return {id:r.id,...Object.fromEntries(['name','short','kicker','description','intro'].map(k=>[k,str(r[k],k,k==='name'?80:4000)])),services:arr(r.services,30,'room services').map((v:any)=>str(v,'service',500))};});if(rooms.length!==5)fail('Keep all five rooms');
 const contact={phone:str(input.contact?.phone,'phone',30),email:str(input.contact?.email,'email',200),locations:str(input.contact?.locations,'locations',200),director:str(input.contact?.director,'director',100),logo:media(input.contact?.logo)};
 if(!/^\+?[0-9 ()-]{7,25}$/.test(contact.phone)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(contact.email))fail('Enter a valid phone and email');
 return {rooms,contact,gardenVideos:arr(input.gardenVideos,12,'garden playlist').map(media),metaverseVideos:arr(input.metaverseVideos,12,'Metaverse playlist').map(media),gallery:arr(input.gallery,7,'gallery').map(media),brands:arr(input.brands,10,'TV brands').map((b:any)=>({name:str(b.name,'TV brand',80),logo:media(b.logo)})),industries:arr(input.industries,40,'industries').map((v:any)=>str(v,'industry',200)),additional:arr(input.additional,15,'other services').map((v:any)=>({title:str(v.title,'service title',100),text:str(v.text,'service description'),items:arr(v.items,30,'service items').map((i:any)=>str(i,'service item',500))}))};
}
