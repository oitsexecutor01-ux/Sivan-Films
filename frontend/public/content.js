import * as base from './content-base.js';
let saved={};try{const r=await fetch('/api/studio-content'+(new URLSearchParams(location.search).get('preview')==='1'?'?preview=1':''),{cache:'no-store'});if(r.ok)saved=await r.json();}catch{}
export const rooms=base.rooms.map(r=>({...r,...(saved.rooms||[]).find(s=>s.id===r.id)}));
export const additional=saved.additional||base.additional,industries=saved.industries||base.industries,brandStations=saved.brands||base.brandStations,welcomeLine=base.welcomeLine;
export const serviceCategories=saved.serviceCategories??base.serviceCategories;
export const contact=saved.contact||{phone:'+919884004788',email:'info@sivanfilms.com',locations:'Chennai | Salem | Bengaluru',director:'Ramesh',logo:'./assets/sivan-films-logo.jpg'};
export const billboardVideos=[
  'https://res.cloudinary.com/xn6xqtlk/video/upload/v1795519035/video-1.mp4',
  'https://res.cloudinary.com/xn6xqtlk/video/upload/v1795519599/video-2.mp4',
  './assets/billboard/video-3.mp4',
];
export const gardenShowreelVideos=[
  './assets/garden-showreel/video-1.mp4',
  'https://res.cloudinary.com/xn6xqtlk/video/upload/v1795520207/video-2_1.mp4',
  'https://res.cloudinary.com/xn6xqtlk/video/upload/v1795520322/video-3_1.mp4',
];
const videoReplacements=new Map([
  ['/assets/billboard/video-1.mp4',billboardVideos[0]],
  ['/assets/billboard/video-2.mp4',billboardVideos[1]],
  ['/assets/garden-showreel/video-2.mp4',gardenShowreelVideos[1]],
  ['/assets/garden-showreel/video-3.mp4',gardenShowreelVideos[2]],
]);
const replaceLocalVideo=src=>videoReplacements.get(src.replace(/^\.\//,'/'))??src;
export const mediaConfig={
  gardenVideos:(saved.gardenVideos||gardenShowreelVideos.slice(1)).map(replaceLocalVideo),
  metaverseVideos:(saved.metaverseVideos||billboardVideos).map(replaceLocalVideo),
  gallery:saved.gallery||Array.from({length:7},(_,i)=>'./assets/about-gallery/photo-'+(i+1)+'.jpg'),
};
export const phoneDigits=contact.phone.replace(/\D/g,'');
// Update the shared page chrome as well as the 3D-room content.
document.querySelectorAll('img[src="./assets/sivan-films-logo.jpg"]').forEach(img=>{img.src=contact.logo;});
document.querySelectorAll('a[href^="tel:"]').forEach(a=>{a.href='tel:'+contact.phone;a.textContent='Call: '+contact.phone+' ↗';});
document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.href='mailto:'+contact.email;a.textContent=contact.email+' ↗';});
document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a=>{const u=new URL(a.href);u.pathname='/'+phoneDigits;a.href=u.href;});
