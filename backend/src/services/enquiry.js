// Answers use public, published studio content only; no private client records.
export function answerEnquiry(content,question){
 if(typeof question!=='string'||!question.trim()||question.length>1000)throw Error('Enter a question of up to 1000 characters');
 const q=question.toLowerCase().trim(),contact=content.contact||{},rooms=content.rooms||[];
 const reply=(answer,source)=>({answer,source});
 const reach=()=>`Please contact Sivan Films${contact.phone?' on '+contact.phone:''}${contact.email?' or '+contact.email:''}.`;
 if(/^(hi|hello|hey|vanakkam|வணக்கம்)[!.\s]*$/.test(q))return reply('Vanakkam! Welcome to Sivan Films. Ask me about our services, company, locations or contact details.','Sivan Films');
 if(/price|pricing|cost|budget|rate|quote|quotation|evlo|evvalu|selavu|விலை/.test(q))return reply('A confirmed price is not available in our published information. Share your project requirements with our team for a quotation. '+reach(),'Company & contact');
 if(/timing|hours|open time|working time|eppo open/.test(q))return reply(contact.hours||'Visiting hours are not listed. Please call to arrange a studio visit. '+reach(),'Company & contact');
 if(/address|location|where|city|cities|enga|எங்க/.test(q))return reply([contact.address,contact.locations].filter(Boolean).join('\n')||reach(),'Company & contact');
 if(/phone|contact|email|whatsapp|number|call|reach/.test(q))return reply([contact.phone&&'Phone / WhatsApp: '+contact.phone,contact.email&&'Email: '+contact.email,contact.locations].filter(Boolean).join('\n'),'Company & contact');
 if(/director|ramesh|owner|founder/.test(q))return reply(contact.director?'Director: '+contact.director:reach(),'Company & contact');
 if(/industry|industries/.test(q))return reply((content.industries||[]).join(', ')||reach(),'Industries');
 if(/about|company|history|since|established|sivan films (enna|na)|who are/.test(q)){
  const about=rooms.find(r=>r.id==='about');return reply(about?.intro||reach(),about?.name||'Company & contact');
 }
 const aliases={ad:['ad film','advertis','tvc','corporate','production','shoot','script','editing'],meta:['metaverse','virtual','vr','ar','360','jewellery','billboard'],animation:['animation','animate','vfx','motion','3d product'],media:['media','television','tv','channel'],about:['sivan','film company'],contact:['enquiry','visit']};
 const words=q.replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!['the','and','for','you','your','what','how','can','tell','about','have','does','with','enna','iruka','pannunga','please'].includes(w));
 const candidates=[...rooms.filter(r=>r.id!=='contact').map(r=>({title:r.name,text:r.intro,items:r.services||[],id:r.id})),...(content.additional||[]).map(s=>({title:s.title,text:s.text,items:s.items||[],id:''}))];
 const scored=candidates.map(c=>{const text=[c.title,c.text,...c.items].join(' ').toLowerCase();let score=words.reduce((sum,w)=>sum+(text.includes(w)?1:0),0);for(const alias of aliases[c.id]||[]){if(new RegExp('(?:^|[^a-z0-9])'+alias+'(?:[a-z]*)(?:$|[^a-z0-9])').test(q))score+=4;}return {...c,score};}).sort((a,b)=>b.score-a.score);
 if(/^(what )?(services|service list)|enna service|services.*(offer|provide|iruk)/.test(q))return reply(candidates.filter(c=>c.id!=='about').map(c=>c.title).join('\n'),'Rooms & services');
 const best=scored[0];
 if(best?.score>=2)return reply([best.text,...best.items.map(item=>'• '+item)].filter(Boolean).join('\n'),best.title);
 return reply('I don’t have a confirmed answer to that in the published Sivan Films information. '+reach(),'Company & contact');
}
