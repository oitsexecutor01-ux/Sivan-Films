import defaults from '../config/default-content.json' with {type:'json'};
export function validate(input:any){
 const fail=(m:string):never=>{throw Error(m)};
 const str=(v:any,label:string,max=4000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max?v.trim():fail('Check '+label);
 const arr=(v:any,max:number,label:string)=>Array.isArray(v)&&v.length>0&&v.length<=max?v:fail('Check '+label);
 const media=(v:any)=>{const s=str(v,'media URL',1500);if(/^\.?\/assets\/[a-zA-Z0-9_./%-]+$/.test(s)&&!s.includes('..'))return s;try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)return s;}catch{}return fail('Media must use an existing /assets/ path or an HTTPS file URL');};
 const rooms=arr(input?.rooms,5,'rooms').map((r:any,i:number)=>{if(r.id!==defaults.rooms[i].id)fail('Room IDs and order must stay unchanged');return {id:r.id,...Object.fromEntries(['name','short','kicker','description','intro'].map(k=>[k,str(r[k],k,k==='name'?80:4000)])),services:arr(r.services,30,'room services').map((v:any)=>str(v,'service',500))};});if(rooms.length!==5)fail('Keep all five rooms');
 const contact={phone:str(input.contact?.phone,'phone',30),email:str(input.contact?.email,'email',200),locations:str(input.contact?.locations,'locations',200),director:str(input.contact?.director,'director',100),logo:media(input.contact?.logo)};
 if(!/^\+?[0-9 ()-]{7,25}$/.test(contact.phone)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(contact.email))fail('Enter a valid phone and email');
 const legal=Object.fromEntries(['terms','privacy'].map(key=>{const page=input.legal?.[key]??defaults.legal[key];const updatedAt=str(page.updatedAt,'policy date',10);if(!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)||!Number.isFinite(Date.parse(updatedAt))||new Date(updatedAt).toISOString().slice(0,10)!==updatedAt)fail('Enter a valid policy date (YYYY-MM-DD)');return [key,{title:str(page.title,'policy title',100),updatedAt,body:str(page.body,'policy content',18000)}];}));
 const categoryList=input.serviceCategories??defaults.serviceCategories;
 if(!Array.isArray(categoryList)||categoryList.length>40)fail('Use up to 40 service categories');
 const ids=new Set();
 const serviceCategories=categoryList.map((category:any)=>{
  const id=str(category.id,'category ID',80);
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||ids.has(id))fail('Category IDs must be unique');
  ids.add(id);
  if(!Array.isArray(category.images)||category.images.length>50)fail('Use up to 50 images per category');
  return {id,name:str(category.name,'category name',100),images:category.images.map(media)};
 });
 return {rooms,contact,legal,serviceCategories,gardenVideos:arr(input.gardenVideos,12,'garden playlist').map(media),metaverseVideos:arr(input.metaverseVideos,12,'Metaverse playlist').map(media),gallery:arr(input.gallery,7,'gallery').map(media),brands:arr(input.brands,10,'TV brands').map((b:any)=>({name:str(b.name,'TV brand',80),logo:media(b.logo)})),industries:arr(input.industries,40,'industries').map((v:any)=>str(v,'industry',200)),additional:arr(input.additional,15,'other services').map((v:any)=>({title:str(v.title,'service title',100),text:str(v.text,'service description'),items:arr(v.items,30,'service items').map((i:any)=>str(i,'service item',500))}))};
}
