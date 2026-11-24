import * as THREE from 'three';
import {GLTFLoader} from './assets/GLTFLoader.js';
import {clone as cloneRig} from './assets/SkeletonUtils.js';
import {RoomEnvironment} from './assets/RoomEnvironment.js';
import {FontLoader} from './assets/FontLoader.js';
import {TextGeometry} from './assets/TextGeometry.js';
import {createCameraman} from './cameraman.js';
import {createStudioHuman,humanBone,seatStudioHuman,createHumanMotion,updateHumanMotion} from './studio-human.js';
import {createStudioVR} from './vr.js';
import {rooms,additional,industries,brandStations,contact,mediaConfig,phoneDigits,billboardVideos,gardenShowreelVideos} from './content.js';

const officeLocations=[
 {city:'Chennai',area:'KK Nagar',phone:'+91 9884004788',tel:'+919884004788'},
 {city:'Bengaluru',area:'Electronic City',phone:'+91 80950 54455',tel:'+918095054455'},
 {city:'Salem',area:'Fairlands',phone:'+91 9884100313',tel:'+919884100313'}
];

function boot(){
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const mobile=matchMedia('(pointer:coarse)').matches;
let qualityAuto=true,smoothedFrameTime=1/60;
let reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,sound=false,entered=false,current='outside',mode='office',yaw=-.34,pitch=-.09,teleporting=false,frame=0;
const issues=[],actors=[],mascots=[],hotspots=[],interactive=[],walls=[],propColliders=[],office=new THREE.Group(),jewellery=new THREE.Group();
let guideBeacon=null,guideBook=null,guideCover=null,guideLeaf=null,guideOpenAmount=0,guideOpening=false,guideOpenTimer=null,roomWalk=null;
const visitedRooms=new Set();
try{const saved=JSON.parse(localStorage.getItem('sivan-studio-visits-v1')||'[]');if(Array.isArray(saved))saved.forEach(id=>{if(rooms.some(r=>r.id===id))visitedRooms.add(id);});}catch{}
function updateGuidePassport(){
 const count=visitedRooms.size;
 $('guide-progress').textContent=count===rooms.length?'Your studio passport is complete!':`${count} of ${rooms.length} rooms explored`;
 $('guide-progress-bar').max=rooms.length;$('guide-progress-bar').value=count;
 document.querySelectorAll('[data-guide-room]').forEach(b=>{const visited=visitedRooms.has(b.dataset.guideRoom);b.classList.toggle('visited',visited);const stamp=b.querySelector('.guide-stamp');if(stamp)stamp.hidden=!visited;});
 const stamp=$('guide-detail-stamp');if(stamp)stamp.hidden=!visitedRooms.has(stamp.dataset.room);
}
function recordRoomVisit(id){
 if(!entered||visitedRooms.has(id)||!rooms.some(r=>r.id===id))return;
 visitedRooms.add(id);try{localStorage.setItem('sivan-studio-visits-v1',JSON.stringify([...visitedRooms]));}catch{}
 updateGuidePassport();
}
function drawGuidePreview(r){
 const canvas=$('guide-preview');if(!canvas)return;
 const previewCamera=new THREE.PerspectiveCamera(70,16/9,.1,160);
 previewCamera.position.set(r?(r.spawnX??r.x):0,1.8,r?r.z+4.5:12);
 previewCamera.rotation.order='YXZ';previewCamera.rotation.set(-.06,r?.yaw||0,0);
 const officeVisible=office.visible,jewelleryVisible=jewellery.visible;
 try{office.visible=true;jewellery.visible=false;renderer.render(scene,previewCamera);canvas.getContext('2d').drawImage(renderer.domElement,0,0,canvas.width,canvas.height);}
 finally{office.visible=officeVisible;jewellery.visible=jewelleryVisible;renderer.render(scene,camera);}
}
let jewelleryLoaded=false,jewelleryLoading=false,jewelleryColliders=[],actorTemplate=null,crewTemplate=null,receptionTemplate=null,sculptLetters=[],billboardObjects=[],receptionist=null,subtitleTimer,toastTimer;
const position=new THREE.Vector3(2,1.67,31),keys=new Set(),touchMove={x:0,y:0},pointer=new THREE.Vector2(),ray=new THREE.Raycaster(),clock=new THREE.Clock();
let scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,160),renderer;
try{renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});}catch(e){$('loader').innerHTML='<h2>Explore Sivan Films</h2><p>Your browser cannot start the 3D view.</p><button id="fallback-services">Read our services</button>';$('fallback-services').onclick=()=>catalog();throw e;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.6));renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.outputColorSpace=THREE.SRGBColorSpace;$('world').appendChild(renderer.domElement);
scene.background=new THREE.Color('#87CEEB');scene.fog=new THREE.Fog('#87CEEB',65,145);scene.add(office,jewellery);jewellery.visible=false;
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
const hemi=new THREE.HemisphereLight('#e3efff','#77775a',2.0);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d5',3.0);sun.position.set(38,32,-65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-37;sun.shadow.camera.right=37;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);
const fill=new THREE.DirectionalLight('#eff7ff',1.1);fill.position.set(20,15,-20);scene.add(fill);
function progress(n,label){$('loading-bar').style.width=n+'%';$('loading-label').textContent=label;}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4700);}
function canvasTex(w,h,draw){let c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
// Lightweight sky sprites: depth-tested so roofs correctly hide the sky indoors.
const sky=new THREE.Group();sky.name='Studio sky';office.add(sky);
const cloudTexture=canvasTex(512,256,(c)=>{
 const puffs=[[106,151,60],[166,112,76],[244,91,83],[322,124,74],[394,153,54],[253,158,94]];
 for(const [x,y,r] of puffs){
  const g=c.createRadialGradient(x,y-r*.24,r*.12,x,y,r);
  g.addColorStop(0,'rgba(255,255,255,.97)');g.addColorStop(.6,'rgba(255,255,255,.93)');
  g.addColorStop(.83,'rgba(235,245,252,.65)');g.addColorStop(1,'rgba(235,245,252,0)');
  c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }
});
const cloudMaterial=new THREE.SpriteMaterial({map:cloudTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false});
for(const [x,y,z,w,h] of [[-45,25,-65,31,14],[-8,31,-83,35,16],[65,29,-70,29,13],[-66,36,-20,36,16],[68,39,8,32,15],[-39,35,62,34,15],[18,32,77,38,16]]){
 const cloud=new THREE.Sprite(cloudMaterial);cloud.position.set(x,y,z);cloud.scale.set(w,h,1);sky.add(cloud);
}
const sunTexture=canvasTex(256,256,(c)=>{
 const g=c.createRadialGradient(128,128,0,128,128,128);
 g.addColorStop(0,'rgba(255,253,230,1)');g.addColorStop(.23,'rgba(255,249,210,1)');
 g.addColorStop(.26,'rgba(255,239,173,.95)');g.addColorStop(.3,'rgba(255,232,155,.35)');
 g.addColorStop(.55,'rgba(255,233,173,.12)');g.addColorStop(1,'rgba(255,233,173,0)');
 c.fillStyle=g;c.fillRect(0,0,256,256);
});
const sunDisc=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false}));
sunDisc.name='Sun and soft halo';sunDisc.position.copy(sun.position);sunDisc.scale.set(19,19,1);sky.add(sunDisc);
let seed=48309;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const wood=canvasTex(512,512,(c,w,h)=>{c.fillStyle='#6a503b';c.fillRect(0,0,w,h);for(let i=0;i<1400;i++){let x=rnd()*w;c.strokeStyle=`rgba(${rnd()>.5?'211,173,117':'27,17,11'},${rnd()*.12})`;c.lineWidth=rnd()*2+.3;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+10,160,x-12,350,x+5,h);c.stroke();}for(let x=0;x<512;x+=64){c.fillStyle='#30291e55';c.fillRect(x,0,2,512);}});wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(2,1);
const stone=canvasTex(1024,1024,(c,w,h)=>{c.fillStyle='#faf9f5';c.fillRect(0,0,w,h);for(let i=0;i<18;i++){let x=rnd()*w,y=rnd()*h;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+170,y+60,x-40,y+330,x+300,y+480);c.strokeStyle=i%4===0?'rgba(176,151,105,.18)':'rgba(127,134,133,.17)';c.lineWidth=.5+rnd()*2.5;c.stroke();}c.strokeStyle='#c8c8c2';c.lineWidth=3;c.strokeRect(1.5,1.5,w-3,h-3);});stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.repeat.set(1,1);
const grandTiles=new THREE.MeshPhysicalMaterial({map:stone,color:'#ffffff',roughness:.18,metalness:.04,clearcoat:.8,clearcoatRoughness:.12});
const grass=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#223d25';c.fillRect(0,0,w,h);for(let i=0;i<7000;i++){c.strokeStyle=`rgba(${40+rnd()*80},${60+rnd()*75},${25+rnd()*45},.45)`;let x=rnd()*w,y=rnd()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+rnd()*3,y-rnd()*6);c.stroke();}});grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(18,18);
const M={plaster:new THREE.MeshStandardMaterial({color:'#A8B5A2',roughness:.43,metalness:.28}),stone:new THREE.MeshStandardMaterial({map:stone,roughness:.38,metalness:.06}),wood:new THREE.MeshStandardMaterial({color:'#264B49',roughness:.85,metalness:0}),charcoal:new THREE.MeshStandardMaterial({color:'#252a24',roughness:.66}),metal:new THREE.MeshStandardMaterial({color:'#5c6058',metalness:.8,roughness:.3}),black:new THREE.MeshStandardMaterial({color:'#111713',roughness:.5}),gold:new THREE.MeshStandardMaterial({color:'#af9663',metalness:.78,roughness:.3}),glass:new THREE.MeshPhysicalMaterial({color:'#bad9d2',metalness:.1,roughness:.08,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),fabric:new THREE.MeshStandardMaterial({color:'#9c9e8c',roughness:.96}),cream:new THREE.MeshStandardMaterial({color:'#e8dfc9',roughness:.5}),green:new THREE.MeshStandardMaterial({color:'#3e5839',roughness:.85}),grass:new THREE.MeshStandardMaterial({map:grass,roughness:1}),light:new THREE.MeshBasicMaterial({color:'#fff0d5'})};
const boxCache=new Map();function roundGeo(w,h,d,r=.04){let key=[w,h,d,r].join();if(boxCache.has(key))return boxCache.get(key);r=Math.min(r,w/3,h/3);const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1,curveSegments:3});g.translate(0,0,-d/2);boxCache.set(key,g);return g;}
function mesh(geo,mat,x,y,z,parent=office){let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,mat,x,y,z,parent=office,round=false){return mesh(round?roundGeo(w,h,d):new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
function cyl(rt,rb,h,mat,x,y,z,parent=office,n=20){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z,parent);}
function collider(x,z,w,d,name='furniture',array=propColliders){array.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,name});}
function wall(x,z,w,d){box(w,4.4,d,M.plaster,x,2.2,z);collider(x,z,w,d,'wall',walls);box(w,.10,d+.025,M.gold,x,.05,z);box(w,.035,d+.018,M.gold,x,3.95,z);}
function textTexture(title,sub='',dark=true,w=1024,h=512){return canvasTex(w,h,(c,W,H)=>{
 c.fillStyle=dark?'#273129':'#edece3';c.fillRect(0,0,W,H);const pad=W*.065,available=W-2*pad;
 const titleLines=title.split('\n'),subs=sub?sub.split('\n'):[];
 let size=Math.min(H*(subs.length?.27:.43),W*.085);c.font=`500 ${size}px Arial`;
 const widest=Math.max(...titleLines.map(t=>c.measureText(t).width),1);size=Math.min(size,size*available/widest);
 c.font=`500 ${size}px Arial`;c.fillStyle=dark?'#f5f1e4':'#293126';c.textBaseline='middle';
 const center=subs.length?H*.39:H*.5;titleLines.forEach((t,i)=>c.fillText(t,pad,center+(i-(titleLines.length-1)/2)*size*1.18));
 if(subs.length){let fs=Math.min(H*.11,size*.38);c.font=`${fs}px Arial`;const max=Math.max(...subs.map(t=>c.measureText(t).width),1);fs=Math.min(fs,fs*available/max);c.font=`${fs}px Arial`;c.fillStyle=dark?'#b8c2b3':'#697661';subs.forEach((t,i)=>c.fillText(t,pad,H*.78+(i-(subs.length-1)/2)*fs*1.25));}
 });}

function bannerTexture(title,sub,w,h){return canvasTex(w,h,(c,W,H)=>{
 const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#163b38');bg.addColorStop(.6,'#244e48');bg.addColorStop(1,'#102c2a');c.fillStyle=bg;c.fillRect(0,0,W,H);
 const inset=Math.min(W,H)*.045,pad=W*.075,available=W-2*pad;
 c.strokeStyle='#c7a56b';c.lineWidth=Math.max(1.5,H*.006);c.strokeRect(inset,inset,W-2*inset,H-2*inset);
 c.save();c.beginPath();c.rect(inset,inset,W-2*inset,H-2*inset);c.clip();
 c.strokeStyle='#d9c39218';c.lineWidth=H*.012;
 for(let i=0;i<5;i++){c.beginPath();c.arc(W*1.03,H*.95,H*(.28+i*.18),0,Math.PI*2);c.stroke();}c.restore();
 c.fillStyle='#d8bd86';c.fillRect(pad,H*.16,W*.065,H*.012);
 c.font=`600 ${Math.min(H*.055,W*.024)}px Arial`;c.textBaseline='middle';c.fillText('SIVAN FILMS  /  THE LIVING STUDIO',pad+W*.085,H*.166);
 let size=Math.min(H*.21,W*.072),lines=[];
 function wrap(){lines=[];c.font=`600 ${size}px Arial`;for(const paragraph of title.split('\n')){let line='';for(const word of paragraph.split(' ')){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>available){lines.push(line);line=word;}else line=next;}lines.push(line);}}
 wrap();while((lines.length*size*1.15>H*.43||lines.some(line=>c.measureText(line).width>available))&&size>10){size*=.94;wrap();}
 c.fillStyle='#faf2df';c.font=`600 ${size}px Arial`;lines.forEach((line,i)=>c.fillText(line,pad,H*.46+(i-(lines.length-1)/2)*size*1.15));
 c.fillStyle='#d8bd86';c.fillRect(pad,H*.73,W*.13,H*.006);
 if(sub){let fs=Math.min(H*.067,W*.029);c.font=`500 ${fs}px Arial`;fs=Math.min(fs,fs*available/Math.max(1,c.measureText(sub).width));c.font=`500 ${fs}px Arial`;c.fillText(sub,pad,H*.84);}
 });}

// Render the supplied gold logo on a white background.
function companyLogoMaterial(texture){
 const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float logoBrightness=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
   float logoMask=smoothstep(0.025,0.16,logoBrightness);
   diffuseColor.rgb=mix(vec3(1.0),diffuseColor.rgb,logoMask);
  `);
 };
 material.customProgramCacheKey=()=> 'sivan-white-background-logo-v1';
 return material;
}

function sign(title,sub,x,y,z,w=3,h=1.5,rot=0,action=null,dark=true,parent=office){let mat=new THREE.MeshBasicMaterial({map:dark&&w>=2&&h>=.6&&parent===office?bannerTexture(title,sub,Math.max(128,Math.round(1536*w/Math.max(w,h))),Math.max(64,Math.round(1536*h/Math.max(w,h)))):textTexture(title,sub,dark,Math.max(128,Math.round(1024*w/Math.max(w,h))),Math.max(64,Math.round(1024*h/Math.max(w,h)))),side:THREE.FrontSide});let m=mesh(new THREE.PlaneGeometry(w,h),mat,x,y,z,parent);m.rotation.y=rot;m.castShadow=false;m.userData.wallDisplay={title};if(action){m.userData={wallDisplay:{title},action,label:title.replaceAll('\n',' ')};interactive.push(m);}return m;}
// Carved timber room plaques with raised borders and individual brass chain links.
function roomNameBoard(r){
 const g=new THREE.Group();g.scale.setScalar(.75);g.position.set(Math.sign(r.x)*2.72,2.55,r.z-3);g.rotation.y=r.x<0?Math.PI/2:-Math.PI/2;office.add(g);
 const shape=new THREE.Shape();
 shape.moveTo(-1.48,-.52);shape.lineTo(-.85,-.52);shape.quadraticCurveTo(0,-1.02,.85,-.52);shape.lineTo(1.48,-.52);shape.lineTo(1.48,.52);shape.lineTo(.85,.52);shape.quadraticCurveTo(0,1.02,-.85,.52);shape.lineTo(-1.48,.52);shape.closePath();
 const timber=new THREE.MeshStandardMaterial({color:'#6c351c',roughness:.7});
 const body=mesh(new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.025,curveSegments:24}),timber,0,0,0,g);
 const texture=canvasTex(1536,800,(c,w,h)=>{
  const grain=c.createLinearGradient(0,0,w,h);grain.addColorStop(0,'#c38850');grain.addColorStop(.45,'#a45f32');grain.addColorStop(.7,'#d49a60');grain.addColorStop(1,'#b4713d');c.fillStyle=grain;c.fillRect(0,0,w,h);
  for(let i=0;i<220;i++){const y=i*h/220;c.beginPath();c.moveTo(0,y);for(let x=0;x<=w;x+=16)c.lineTo(x,y+Math.sin(x*.009+i*.32)*5+Math.sin(x*.003+i)*9);c.strokeStyle=i%3?'#57301922':'#ffe0a430';c.lineWidth=i%4===0?2:1;c.stroke();}
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#32190f';
  c.font='500 32px Georgia';c.fillText('S I V A N   F I L M S',w/2,205);
  let size=112;c.font=`italic ${size}px Georgia`;size=Math.min(size,112*(w-160)/Math.max(1,c.measureText(r.name).width));c.font=`italic ${size}px Georgia`;c.fillText(r.name,w/2,390);
  c.strokeStyle='#482719';c.lineWidth=3;c.beginPath();c.moveTo(200,500);c.lineTo(w-200,500);c.stroke();
  for(const x of [200,w-200]){c.beginPath();c.arc(x,500,6,0,TAU);c.fill();}
  c.font='28px Georgia';c.fillText('ROOM '+r.n,w/2,570);
  for(const side of [-1,1]){c.save();c.translate(w/2+side*260,270);c.scale(side,1);c.strokeStyle='#482719';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(60,16,115,-8);c.stroke();for(let j=0;j<5;j++){c.beginPath();c.ellipse(20+j*18,j<3?0:-3,13,4,-.6,0,TAU);c.fill();}c.restore();}
 });
 const faceGeometry=new THREE.ShapeGeometry(shape,32),coords=faceGeometry.attributes.position;
 const uv=[];for(let i=0;i<coords.count;i++)uv.push((coords.getX(i)+1.52)/3.04,(coords.getY(i)+.8)/1.6);faceGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const face=mesh(faceGeometry,new THREE.MeshStandardMaterial({map:texture,roughness:.66}),0,0,.139,g);
 // Follow the carved silhouette with a dark inset and a fine brass outer trim.
 for(const [scale,color,width] of [[.96,'#382a20',.018],[.91,'#d8ad70',.009]]){
  const points=shape.getPoints(64).map(p=>new THREE.Vector3(p.x*scale,p.y*scale,.15));
  const curve=new THREE.CatmullRomCurve3(points,true);mesh(new THREE.TubeGeometry(curve,180,width,5,true),new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.42}),0,0,0,g);
 }
 for(const side of [-1,1]){
  const start=new THREE.Vector3(side*1.3,.52,.07),end=new THREE.Vector3(side*.83,1.28,.04);
  for(let i=0;i<15;i++){const p=start.clone().lerp(end,i/14);const link=mesh(new THREE.TorusGeometry(.038,.009,5,12),M.gold,p.x,p.y,p.z,g);link.rotation.z=-side*.55;if(i%2)link.rotation.y=Math.PI/2;}
  mesh(new THREE.SphereGeometry(.035,10,8),M.gold,end.x,end.y,end.z,g);
 }
 for(const part of [body,face]){part.userData={label:r.name+' · Discover this room',action:()=>showRoom(r)};interactive.push(part);}
}
function plant(x,z,s=1,parent=office){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);
 const ceramic=new THREE.MeshPhysicalMaterial({color:'#d5cec0',roughness:.38,metalness:.03,clearcoat:.25});
 const profile=[[.235,.025],[.25,.04],[.275,.14],[.31,.52],[.32,.61],[.318,.65],[.292,.66],[.285,.63],[.28,.57],[.265,.12]].map(([r,y])=>new THREE.Vector2(r,y));
 mesh(new THREE.LatheGeometry(profile,48),ceramic,0,0,0,g);
 cyl(.278,.278,.025,new THREE.MeshStandardMaterial({color:'#30241c',roughness:1}),0,.603,0,g);
 for(let j=0;j<18;j++){let a=j*2.4,r=.23*Math.sqrt(rnd());let peb=mesh(new THREE.SphereGeometry(.018,6,4),new THREE.MeshStandardMaterial({color:j%2?'#544437':'#796858',roughness:1}),Math.cos(a)*r,.624,Math.sin(a)*r,g);peb.scale.y=.45;}
 const stemMat=new THREE.MeshStandardMaterial({color:'#38532b',roughness:.8});
 for(let i=0;i<11;i++){
  const angle=i*2.39996, length=.65+rnd()*.58, reach=.25+rnd()*.38, base=new THREE.Vector3(Math.cos(angle)*.045,.61,Math.sin(angle)*.045);
  const tip=new THREE.Vector3(Math.cos(angle)*reach,.7+length,Math.sin(angle)*reach),mid=base.clone().lerp(tip,.5);mid.y+=.17;
  const curve=new THREE.QuadraticBezierCurve3(base,mid,tip);mesh(new THREE.TubeGeometry(curve,12,.008,5,false),stemMat,0,0,0,g);
  const verts=[],uv=[],idx=[],side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)),width=.055+rnd()*.035;
  for(let j=0;j<=16;j++){let t=j/16,c=curve.getPoint(t),w=Math.pow(Math.sin(Math.PI*t),.8)*width;for(let k=0;k<3;k++){let q=c.clone().addScaledVector(side,(k-1)*w);q.y-=Math.abs(k-1)*w*.25;verts.push(q.x,q.y,q.z);uv.push(k/2,t);}}
  for(let j=0;j<16;j++)for(let k=0;k<2;k++){let n=j*3+k;idx.push(n,n+3,n+1,n+1,n+3,n+4);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.26+rnd()*.045,.4,.18+rnd()*.09),side:THREE.DoubleSide,roughness:.52}),0,0,0,g);
 }
 if(parent===office)collider(x,z,.65*s,.65*s,'planter');
}
let treeCrownGeometry;
function tree(x,z,s=1){
 const bark=new THREE.MeshStandardMaterial({color:'#4a382b',roughness:1});cyl(.12*s,.24*s,2.8*s,bark,x,1.4*s,z,office,16);
 if(!treeCrownGeometry){treeCrownGeometry=new THREE.BufferGeometry();const positions=[],normals=[];for(let i=0;i<330;i++){let a=rnd()*TAU,r=Math.sqrt(rnd()),yy=(rnd()-.5)*1.5,xx=Math.cos(a)*r,zz=Math.sin(a)*r;let dx=.08+rnd()*.13,dz=.04+rnd()*.06;positions.push(xx-dx,yy,zz,xx,yy+.06,zz-dz,xx+dx,yy,zz,xx-dx,yy,zz,xx+dx,yy,zz,xx,yy-.025,zz+dz);}treeCrownGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));treeCrownGeometry.computeVertexNormals();}
 for(let i=0;i<9;i++){let a=i*2.4,px=x+Math.cos(a)*.78*s,pz=z+Math.sin(a)*.78*s,py=(2.5+(i%3)*.53)*s;let end=new THREE.Vector3(px,py,pz),start=new THREE.Vector3(x,1.8*s,z),d=end.clone().sub(start),branch=mesh(new THREE.CylinderGeometry(.025*s,.07*s,d.length(),8),bark,0,0,0);branch.position.copy(start).add(end).multiplyScalar(.5);branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());const crown=mesh(treeCrownGeometry,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.29+rnd()*.035,.48,.095+rnd()*.055),roughness:.88,side:THREE.DoubleSide}),px,py,pz);crown.scale.setScalar(s*.85);}
 collider(x,z,.6*s,.6*s,'tree');}

function chair(x,z,rot=0){let g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;office.add(g);box(.62,.12,.62,M.fabric,0,.49,0,g,true);box(.62,.65,.12,M.fabric,0,.82,-.27,g,true);for(let dx of[-.22,.22])for(let dz of[-.22,.22])cyl(.022,.022,.43,M.metal,dx,.23,dz,g,8);collider(x,z,.65,.7,'chair');return g;}
function chairAtTable(x,z,tx,tz){const g=chair(x,z,Math.atan2(tx-x,tz-z));g.userData.tableTarget={x:tx,z:tz};return g;}
function table(x,z,w=2,d=1){box(w,.12,d,M.wood,x,.82,z,office,true);for(let dx of[-w*.4,w*.4])for(let dz of[-d*.35,d*.35])box(.065,.8,.065,M.charcoal,x+dx,.4,z+dz);collider(x,z,w,d,'table');}
function laptop(x,z,rot=0){let g=new THREE.Group();g.position.set(x,.9,z);g.rotation.y=rot;office.add(g);box(.48,.025,.34,M.metal,0,0,0,g,true);let screen=box(.48,.30,.02,M.black,0,.14,-.15,g,true);screen.rotation.x=-.2;let p=sign('SIVAN','CREATIVE WORKSPACE',0,.15,-.133,.44,.25,0,null,true,g);p.rotation.x=-.2;return g;}
function softbox(x,z,y=2.6,rot=0){cyl(.018,.028,y,M.metal,x,y/2,z);for(let a=0;a<3;a++){let leg=box(.025,.025,.7,M.charcoal,x,.13,z);leg.rotation.y=a*TAU/3;}let head=box(.9,.65,.16,M.black,x,y,z,office,true);head.rotation.y=rot;let glow=box(.84,.59,.01,M.light,0,0,.09,head,true);collider(x,z,.7,.7,'light stand');}
function cameraRig(x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;office.add(g);
 const alloy=new THREE.MeshStandardMaterial({color:'#363b3d',metalness:.8,roughness:.32}),rubber=new THREE.MeshStandardMaterial({color:'#111315',roughness:.8});
 const rod=(a,b,r,mat)=>{const d=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),12),mat,0,0,0,g);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());};
 for(let i=0;i<3;i++){const a=i*TAU/3,foot=new THREE.Vector3(Math.sin(a)*.44,.04,Math.cos(a)*.44),top=new THREE.Vector3(Math.sin(a)*.08,1.19,Math.cos(a)*.08);rod(foot,top,.025,alloy);rod(foot.clone().lerp(top,.23),top,.034,rubber);rod(foot.clone().lerp(top,.48),new THREE.Vector3(0,.54,0),.012,alloy);cyl(.045,.045,.035,rubber,foot.x,.035,foot.z,g);}
 cyl(.10,.12,.15,alloy,0,1.22,0,g);box(.28,.065,.42,alloy,0,1.34,0,g,true);rod(new THREE.Vector3(.10,1.28,.05),new THREE.Vector3(.24,1.13,.43),.015,alloy);
 box(.31,.26,.39,rubber,0,1.51,0,g,true);box(.22,.25,.12,rubber,0,1.50,.25,g,true);box(.06,.32,.28,rubber,.19,1.50,.01,g,true);
 for(const [zz,r,len] of [[-.25,.105,.12],[-.34,.125,.09],[-.43,.13,.08]]){const o=cyl(r,r,len,alloy,0,1.51,zz,g,32);o.rotation.x=Math.PI/2;}
 const glass=cyl(.11,.11,.008,new THREE.MeshPhysicalMaterial({color:'#192c37',metalness:.65,roughness:.08,clearcoat:1}),0,1.51,-.475,g,32);glass.rotation.x=Math.PI/2;
 box(.34,.25,.045,rubber,0,1.51,-.50,g,true);box(.245,.16,.008,new THREE.MeshStandardMaterial({color:'#152b34',metalness:.7,roughness:.09}),0,1.51,-.527,g);
 rod(new THREE.Vector3(-.10,1.65,.10),new THREE.Vector3(-.10,1.78,.10),.015,alloy);rod(new THREE.Vector3(-.10,1.78,.10),new THREE.Vector3(-.10,1.78,-.15),.018,rubber);
 box(.22,.15,.035,rubber,.28,1.72,.03,g,true);box(.18,.11,.008,new THREE.MeshBasicMaterial({color:'#55747a'}),.28,1.72,.053,g);
 for(let i=0;i<4;i++)box(.13,.012,.008,alloy,-.04,1.47+i*.035,.202,g);
 collider(x,z,.9,.9,'camera tripod');return g;}

function hotspot(x,z,label,action){const g=new THREE.Group();g.position.set(x,.115,z);office.add(g);let ring=new THREE.Mesh(new THREE.RingGeometry(.27,.31,36),new THREE.MeshBasicMaterial({color:'#b3935c',side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;g.add(ring);let hit=new THREE.Mesh(new THREE.CircleGeometry(.50,24),new THREE.MeshBasicMaterial({transparent:true,opacity:.015,depthWrite:false}));hit.rotation.x=-Math.PI/2;hit.userData={label,action};g.add(hit);interactive.push(hit);hotspots.push(g);let mark=sign('↗','',0,.005,0,.32,.16,0,null,false,g);mark.rotation.x=-Math.PI/2;return g;}
function officeLight(x,z,w=3){box(w,.025,.12,M.light,x,4.12,z);const light=new THREE.PointLight('#fff1d7',12,16,2);light.position.set(x,3.5,z);office.add(light);}

function gardenShowreel(){
 const x=7,z=17.5,y=3.0,w=7.2,h=4.05;
 box(w+.3,h+.3,.25,M.charcoal,x,y,z,office,true);
 for(const dx of[-2.8,2.8]){box(.16,.95,.16,M.metal,x+dx,.55,z);box(.8,.14,.65,M.charcoal,x+dx,.15,z);}
 const clips=mediaConfig.gardenVideos;
 const video=document.createElement('video');video.crossOrigin='anonymous';video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');video.preload='metadata';let index=0;
 const play=()=>{video.src=clips[index];video.play().catch(()=>{});};video.addEventListener('ended',()=>{index=(index+1)%clips.length;play();});video.addEventListener('error',()=>{if(!issues.includes('Garden showreel video could not load'))issues.push('Garden showreel video could not load');});
 const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const screen=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),x,y,z+.14);screen.userData.label='Sivan Films garden showreel';
 video.addEventListener('loadedmetadata',()=>{const ar=video.videoWidth/video.videoHeight;screen.scale.set(ar>16/9?1:(ar/(16/9)),ar>16/9?(16/9)/ar:1,1);});
 document.addEventListener('pointerdown',()=>{if(video.paused)video.play().catch(()=>{});});play();
 collider(x,z,w+.3,.35,'garden showreel display');
 sign('SIVAN FILMS · SHOWREEL','ADVERTISING · CORPORATE FILMS · ANIMATION',x,.55,z+.17,w,.50,0);
}
function buildOffice(){gardenShowreel();
 progress(12,'Laying out the garden and six-room studio…');
 box(130,.3,140,M.grass,0,-.25,-5);box(46,.16,59,M.stone,0,-.08,-8);box(6,.10,24,M.stone,0,-.015,25);
 box(40,.18,37,grandTiles,0,0,-4);box(40,.18,14,grandTiles,0,0,-29.5);buildGrandTileJoints();wall(-20,-11,.35,51);wall(20,-11,.35,51);wall(0,-36.5,40,.35);
 wall(-3,-21,.24,2.24);wall(3,-21.25,.25,2.74);
 // Reception glazing leaves a six-metre open entrance.
 for(let side of[-1,1]){box(17,3.5,.10,M.glass,side*11.5,1.9,14.3);collider(side*11.5,14.3,17,.1,'front glass',walls);for(let x of[3,11,20])box(.07,4.4,.12,M.metal,side*x,2.2,14.3);box(17,.85,.5,M.charcoal,side*11.5,4.3,14.3);}
 box(40,.3,37,M.plaster,0,4.55,-4);box(40,.3,14,M.plaster,0,4.55,-29.5);box(42,.22,3.2,M.charcoal,0,4.55,14.5);box(7,.12,2.9,M.wood,0,4.35,15);
 
 // Central corridor and room divisions. Doorways are genuine collision gaps.
 for(let r of rooms){let side=Math.sign(r.x),z=r.z;
   wall(side*3,z-4.25,.22,5.5);wall(side*3,z+4.25,.22,5.5);box(.24,1.1,3,M.wood,side*3,3.85,z);
   for(let dz of[-1.5,1.5])box(.3,3.3,.12,M.wood,side*3,1.65,z+dz);
 }
 for(let z of[6,-8,-22])for(let side of[-1,1])wall(side*11.5,z,17,.24);
 for(let r of rooms){
   // Each room has dedicated wall displays; avoid duplicate header planes.
   buildRoomCeiling(r);if(r.id!=='media')plant(r.x+6,r.z-5,.9);hotspot(Math.sign(r.x)*5,r.z,'Enter '+r.name,()=>goRoom(r.id));
   if(r.reserved){box(7,.1,5,M.fabric,r.x,.12,r.z);sign('The next chapter.','ROOM THEME AWAITING CONFIRMATION',r.x,1.8,r.z-4,4.8,2.2,0,()=>showRoom(r));table(r.x+4,r.z+3,1.6,.8);chairAtTable(r.x+4,r.z+4,r.x+4,r.z+3);}
 }
 buildReceptionCeiling();buildCorridorCeiling();
 // Base trim and a planted, comfortable reception.
 for(let x of[-18,18])for(let z of[10,0,-14,-28]){if(x>3&&z<=-14)continue;plant(x,z,1.2);}
 box(5.0,1.1,1.05,M.wood,-7,.55,9,office,true);box(5.12,.12,1.15,M.cream,-7,1.12,9,office,true);collider(-7,9,5.2,1.2,'reception desk');
 sign('SIVAN FILMS','WELCOME TO THE LIVING STUDIO',-7,.68,9.55,3.4,.65,0,()=>about());laptop(-7,8.9);buildGuideBook();sign('Advertising comes first.','SINCE 2003 · DIRECTOR RAMESH',-14.5,2.65,6.2,4.0,1.8,0,()=>about());
 for(let x of[8,12]){box(3,.35,1.3,M.fabric,x,.4,10,office,true);box(3,.75,.25,M.fabric,x,.75,9.45,office,true);for(let side of[-1,1])box(.24,.6,1.3,M.fabric,x+side*1.4,.65,10,office,true);collider(x,10,3,1.4,'sofa');}
 table(10,12,2,.7);plant(16,11,1.2);
 buildEntranceMural();
 sign('Creative work.\nReal connections.','CHENNAI · SALEM · BENGALURU',14,2.5,6.2,4.6,2.0,0,()=>about());
 sign('A studio for every industry.','JEWELLERY · HEALTHCARE · EDUCATION · RETAIL',-19.8,2.1,10,4,2,Math.PI/2,()=>industryPanel());
 // Three editorial service walls in the corridor.
 additional.forEach((s,i)=>sign(s.title,'DISCOVER MORE ↗',-2.84,2.0,-7-i*14,2.5,1.25,Math.PI/2,()=>extraPanel(s)));
 hotspot(0,12,'Walk into reception',()=>teleport(0,10,0));hotspot(0,5,'Explore the service corridor',()=>teleport(0,3,0));hotspot(0,-12,'Continue through the studio',()=>teleport(0,-12,0));hotspot(0,-26,'Explore About Sivan Films',()=>teleport(0,-26,0));
 // Garden, paving, water feature, planting and outdoor production.
 for(let side of[-1,1])for(let z of[20,28,37]){tree(side*(18+rnd()*4),z,1+rnd()*.5);box(11,.18,7,new THREE.MeshStandardMaterial({map:grass,color:'#304c2e',roughness:1}),side*14,-.12,z);}
 for(let x of[-24,24])for(let z=-28;z<35;z+=12)tree(x,z,1.3);
 for(let z of[19,23,27])for(let side of[-1,1]){cyl(.06,.06,.75,M.charcoal,side*3.4,.38,z);cyl(.075,.075,.07,M.light,side*3.4,.75,z);}
 box(6,.25,3,M.charcoal,11,.12,23,office,true);const water=box(5.7,.02,2.7,new THREE.MeshPhysicalMaterial({color:'#62847c',roughness:.12,metalness:.48,transparent:true,opacity:.8}),11,.25,23);collider(11,23,6,3,'water feature');
 table(13,30,2,1);chairAtTable(11.5,30,13,30);chairAtTable(14.5,30,13,30);
 // Freestanding garden LED banner: clear of the entrance walkway.
 box(7.6,2.4,.20,M.charcoal,10,2.3,28,office,true);box(7.35,2.16,.035,M.black,10,2.3,28.12);
 for(const x of[7.3,12.7]){box(.16,1.1,.16,M.metal,x,.65,28,office,true);box(.8,.12,.7,M.charcoal,x,.1,28);}
 sign('SIVAN FILMS','ADVERTISING · CREATIVE MEDIA · IMMERSIVE EXPERIENCES',11.7,2.3,28.17,3.5,1.35,0,about);
 collider(10,28,7.6,.45,'garden LED banner');
 // Outdoor campaign set.
 box(7,.08,6,M.wood,-11,.04,23);box(5,3,.16,M.cream,-11,1.55,20.2,office,true);collider(-11,20.2,5,.16,'shoot backdrop');
 sign('Made to be remembered.','SIVAN FILMS · ON LOCATION',-11,2.2,20.3,4,.9,0,()=>showRoom(rooms[0]));
 cyl(.6,.6,1.0,M.cream,-11,.55,22);shootProduct(-11,1.05,22);collider(-11,22,1.3,1.3,'product plinth');
 cameraRig(-10.8,25.5);softbox(-14.3,23,2.8,.6);softbox(-7.5,22.7,2.5,-.5);
 let reflector=mesh(new THREE.CircleGeometry(.65,32),new THREE.MeshStandardMaterial({color:'#f8f8eb',metalness:.3,roughness:.5}),-14.7,1.6,21.8);reflector.rotation.y=.7;
 sign('On set.\nIdeas in the making.','EXPLORE ADVERTISING ↗',-5.1,1.4,24,2.1,1.7,.35,()=>showRoom(rooms[0]));hotspot(-5,26,'Visit the garden film shoot',()=>teleport(-5,26,.8));
 buildCorridorGallery();buildFilm();buildMetaverse();buildAnimation();buildMedia();buildAbout();buildContact();progress(42,'Furnishing the production rooms…');
}
function shootProduct(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);office.add(g);
 const bottle=new THREE.MeshPhysicalMaterial({color:'#d4e6d5',roughness:.25,clearcoat:.8}),cap=new THREE.MeshStandardMaterial({color:'#f3f0e7',roughness:.35});
 cyl(.145,.15,.40,bottle,0,.22,0,g,40);const shoulder=mesh(new THREE.SphereGeometry(.145,32,16),bottle,0,.42,0,g);shoulder.scale.y=.4;
 cyl(.065,.075,.09,cap,0,.49,0,g,28);box(.16,.045,.075,cap,.035,.55,0,g,true);box(.08,.027,.045,cap,.13,.535,0,g,true);
 const label=canvasTex(512,512,(c,W,H)=>{c.fillStyle='#f6f3eb';c.fillRect(0,0,W,H);c.textAlign='center';c.fillStyle='#284c37';c.font='bold 54px Arial';c.fillText('BOTANICAL',W/2,150);c.font='36px Arial';c.fillText('DAILY LOTION',W/2,225);c.font='26px Arial';c.fillText('HYDRATE & CARE',W/2,310);c.fillText('200 ml',W/2,410);});
 mesh(new THREE.PlaneGeometry(.20,.26),new THREE.MeshBasicMaterial({map:label}),0,.25,.15,g);
 box(.19,.43,.15,cap,.3,.215,-.045,g,true);sign('DAILY LOTION','BOTANICAL SKINCARE',.3,.25,.036,.17,.30,0,null,false,g);
}
function buildFilmWallpaper(){
 const texture=canvasTex(2048,640,(c,w,h)=>{
  c.fillStyle='#f3f0e9';c.fillRect(0,0,w,h);
  const vine=(x,reach,flip=1)=>{
   c.save();c.translate(x,-12);c.scale(flip,1);c.strokeStyle='#777e69';c.lineWidth=2.3;c.lineCap='round';
   c.beginPath();c.moveTo(0,0);c.bezierCurveTo(25,reach*.32,-35,reach*.62,20,reach);c.stroke();
   for(let j=0;j<8;j++){
    const y=32+j*reach/9,side=j%2?1:-1,dx=side*(45+j%3*8);
    c.beginPath();c.moveTo(7,y);c.bezierCurveTo(dx*.4,y-30,dx,y-24,dx,y-48);
    c.bezierCurveTo(dx+side*18,y-9,dx*.45,y+8,7,y);c.fillStyle=j%3?'#a0aa90':'#86957b';c.fill();
    c.strokeStyle='#6f7967';c.stroke();c.beginPath();c.moveTo(7,y);c.lineTo(dx,y-48);c.stroke();
    if(j%3===1){c.fillStyle='#b7a0b3';for(let k=0;k<4;k++){c.beginPath();c.ellipse(dx+Math.cos(k*Math.PI/2)*9,y-48+Math.sin(k*Math.PI/2)*9,8,5,k*Math.PI/2,0,TAU);c.fill();}}
   }
   c.restore();
  };
  [[100,365,1],[365,510,-1],[700,330,1],[1010,480,-1],[1340,390,1],[1660,495,-1],[1950,350,1]].forEach(v=>vine(...v));
  const bird=(x,y,s,flip=1)=>{c.save();c.translate(x,y);c.scale(s*flip,s);c.fillStyle='#79634d';c.strokeStyle='#51483b';c.lineWidth=2;
   c.beginPath();c.ellipse(0,0,26,18,-.25,0,TAU);c.fill();c.stroke();
   c.beginPath();c.ellipse(-7,-6,15,9,-.65,0,TAU);c.fillStyle='#9b8164';c.fill();c.stroke();
   c.beginPath();c.arc(23,-17,10,0,TAU);c.fillStyle='#79634d';c.fill();c.stroke();
   c.beginPath();c.moveTo(30,-19);c.lineTo(46,-15);c.lineTo(30,-12);c.fillStyle='#c1a270';c.fill();
   c.beginPath();c.moveTo(-21,6);c.quadraticCurveTo(-58,40,-75,110);c.quadraticCurveTo(-35,66,-7,16);c.fillStyle='#665542';c.fill();
   c.fillStyle='#1d2019';c.beginPath();c.arc(26,-20,2,0,TAU);c.fill();c.restore();};
  bird(245,310,1.1);bird(910,370,.85,-1);bird(1510,275,1);bird(1910,430,.8,-1);
 });
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide});
 const wallpaper=(width,x,z,rotation=0)=>{
  const wall=mesh(new THREE.PlaneGeometry(width,3.78),material,x,2.03,z);
  wall.rotation.y=rotation;wall.castShadow=false;
 };
 wallpaper(13.7,-19.79,-1,Math.PI/2);
 wallpaper(16.7,-11.5,-7.86);
 wallpaper(16.7,-11.5,5.86);
 // The corridor-facing wall has a real doorway between these two sections.
 wallpaper(5.45,-3.14,-5.25,-Math.PI/2);
 wallpaper(5.45,-3.14,3.25,-Math.PI/2);
}
function buildReceptionCeiling(){
 const plaster=new THREE.MeshStandardMaterial({color:'#f1f0e9',roughness:.88});
 const sage=new THREE.MeshStandardMaterial({color:'#8b9e9c',roughness:.86});
 const timber=new THREE.MeshStandardMaterial({color:'#76614c',roughness:.78});
 const light=new THREE.MeshBasicMaterial({color:'#ffdda8',toneMapped:false});
 // A wide, welcoming tray spans only the reception, clear of the open entrance.
 box(39.5,.11,8.1,plaster,0,4.2,9.85);
 box(31,.055,5.6,sage,0,4.105,9.85);
 for(const x of [-17.1,17.1])box(5.3,.17,8.1,plaster,x,4.035,9.85);
 for(const z of [6.55,13.15])box(29,.17,1.5,plaster,0,4.035,z);
 for(const x of [-14.5,14.5]){
  box(.19,.085,5.9,timber,x,3.935,9.85);
  box(.065,.026,5.8,light,x+(x<0?.17:-.17),4.005,9.85);
 }
 for(const z of [6.98,12.72]){
  box(29.1,.085,.19,timber,0,3.935,z);
  box(28.9,.026,.06,light,0,4.005,z+(z<9.85?.17:-.17));
 }
 // Timber accents echo the reception desk and lead toward the studio corridor.
 for(const x of [-10,-6,6,10])box(.08,.035,5.2,timber,x,4.065,9.85);
 for(const x of [-18,-9,0,9,18])for(const z of [6.35,13.35]){
  cyl(.14,.14,.025,timber,x,3.92,z,office,24);
  cyl(.09,.09,.03,light,x,3.899,z,office,20);
 }
 for(const x of [-10,10]){const glow=new THREE.PointLight('#ffe2b6',10,13,2);glow.position.set(x,3.4,9.85);office.add(glow);}
}
function buildCorridorCeiling(){
 const plaster=new THREE.MeshStandardMaterial({color:'#f1f0e9',roughness:.88});
 const blue=new THREE.MeshStandardMaterial({color:'#687f8c',roughness:.88});
 const timber=new THREE.MeshStandardMaterial({color:'#76614c',roughness:.78});
 const light=new THREE.MeshBasicMaterial({color:'#ffdda8',toneMapped:false});
 // A slim, continuous tray gives the six room entrances a clear visual route.
 box(5.55,.10,41.3,plaster,0,4.2,-15.25);
 box(3.65,.045,39.7,blue,0,4.11,-15.25);
 for(const x of [-2.25,2.25]){
  box(.55,.15,41,plaster,x,4.015,-15.25);
  box(.10,.06,40.7,timber,x+(x<0?.27:-.27),3.925,-15.25);
  box(.055,.025,40.4,light,x+(x<0?.36:-.36),3.965,-15.25);
 }
 // Short cross beams mark the room pairs without narrowing their doorways.
 for(const z of [4.5,-8.5,-22.5,-35.1]){
  box(4.55,.09,.17,timber,0,3.935,z);
  box(4.2,.027,.065,light,0,3.985,z-.16);
  for(const x of [-1.25,1.25]){
   cyl(.12,.12,.026,timber,x,3.88,z+1.1,office,20);
   cyl(.08,.08,.03,light,x,3.86,z+1.1,office,18);
  }
 }
 for(const z of [1,-12,-26,-34]){const glow=new THREE.PointLight('#ffe1b5',8,12,2);glow.position.set(0,3.45,z);office.add(glow);}
}
function buildRoomCeiling(room){
 const cx=Math.sign(room.x)*11.5,cz=room.z;
 const white=new THREE.MeshStandardMaterial({color:'#f1f0e9',roughness:.85});
 const blue=new THREE.MeshStandardMaterial({color:'#687f8c',roughness:.88});
 const warm=new THREE.MeshBasicMaterial({color:'#ffdaa0',toneMapped:false});
 const trim=new THREE.MeshStandardMaterial({color:'#d7d9d4',roughness:.6});
 // A recessed blue-grey centre sits above the white perimeter soffit.
 box(16.65,.10,13.65,white,cx,4.2,cz);
 box(12.5,.07,9.5,blue,cx,4.115,cz);
 for(const dx of [-7.3,7.3])box(2.05,.22,13.65,white,cx+dx,4.0,cz);
 for(const dz of [-5.8,5.8])box(12.6,.22,2.05,white,cx,4.0,cz+dz);
 const ring=(w,d,y,width,height,material)=>{
  for(const dz of [-d/2,d/2])box(w+width,height,width,material,cx,y,cz+dz);
  for(const dx of [-w/2,w/2])box(width,height,d,material,cx+dx,y,cz);
 };
 ring(12.7,9.7,3.9,.25,.07,blue);
 ring(12.27,9.27,3.94,.09,.045,white);
 ring(12.08,9.08,4.005,.09,.025,warm);
 for(const dx of [-7.35,7.35])for(const dz of [-5.5,0,5.5]){
  cyl(.12,.12,.025,trim,cx+dx,3.875,cz+dz,office,24);
  cyl(.085,.085,.027,warm,cx+dx,3.858,cz+dz,office,20);
 }
 for(const dx of [-3.8,3.8])for(const dz of [-5.8,5.8]){
  cyl(.12,.12,.025,trim,cx+dx,3.875,cz+dz,office,24);
  cyl(.085,.085,.027,warm,cx+dx,3.858,cz+dz,office,20);
 }
 // Soft actual room illumination accompanies the visible cove strips.
 const ambient=new THREE.PointLight('#fff0da',16,18,2);ambient.position.set(cx,3.55,cz);office.add(ambient);
 for(const dx of [-5.5,5.5]){const cove=new THREE.PointLight('#ffdb9e',5,9,2);cove.position.set(cx+dx,3.98,cz);office.add(cove);}
}
function filmShowreel(x,label,startIndex){
 const w=4.05,h=w*9/16,y=2.35,z=-6.35;
 box(w+.14,h+.14,.08,M.charcoal,x,y,z-.06,office,true);
 const playlist=[...new Set([...mediaConfig.gardenVideos,...mediaConfig.metaverseVideos,
  ...gardenShowreelVideos,
  ...billboardVideos])];
 const video=document.createElement('video');
 video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
 video.setAttribute('playsinline','');video.crossOrigin='anonymous';video.hidden=true;
 video.dataset.filmScreen=label;document.body.appendChild(video);
 let index=startIndex%playlist.length,failures=0;
 const play=()=>{video.src=playlist[index];video.play().catch(()=>{});};
 const next=()=>{index=(index+1)%playlist.length;play();};
 video.addEventListener('ended',next);
 video.addEventListener('playing',()=>{failures=0;});
 video.addEventListener('error',()=>{
  if(++failures<playlist.length)next();
  else if(!issues.includes(label+' showreel failed to load'))issues.push(label+' showreel failed to load');
 });
 const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const screen=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),x,y,z);
 screen.userData.label=label+' AD Film showreel';
 video.addEventListener('loadedmetadata',()=>{
  const aspect=video.videoWidth/video.videoHeight,target=w/h;
  screen.scale.set(Math.min(1,aspect/target),Math.min(1,target/aspect),1);
 });
 document.addEventListener('pointerdown',()=>{if(video.paused&&!video.ended&&failures<playlist.length)video.play().catch(()=>{});});
 play();
}
function buildFilm(){let r=rooms[0];buildFilmWallpaper();box(9,.10,6,M.charcoal,-12,.13,-3);box(9,3.3,.18,M.cream,-12,1.8,-6.5,office,true);collider(-12,-6.5,9,.18,'cyclorama');
 filmShowreel(-14.2,'Left',0);filmShowreel(-9.8,'Right',3);
 cyl(.65,.7,1,M.cream,-12,.65,-3.5);shootProduct(-12,1.15,-3.5);collider(-12,-3.5,1.4,1.4,'film plinth');
 cameraRig(-12,1.0);softbox(-16,-2,2.8,.6);softbox(-8,-2,2.6,-.6);table(-17,3.5,3,1);laptop(-17,3.5);chairAtTable(-17,4.5,-17,3.5);sign('From concept\nto final cut.','ADVERTISING FILMS · TVCs · BRAND STORIES',-19.78,2.5,-1,4.6,2.5,Math.PI/2,()=>showRoom(r));
 sign('Your next campaign\nstarts with a conversation.','EXPLORE PRODUCTION SERVICES ↗',-5.6,1.9,-6.8,3.7,2.3,0,()=>showRoom(r));}
function vrHeadset(x,y,z){let g=new THREE.Group();g.position.set(x,y,z);office.add(g);box(.44,.20,.19,M.cream,0,0,0,g,true);box(.37,.14,.1,M.black,0,-.01,.09,g,true);for(let dx of[-.12,0,.12])mesh(new THREE.SphereGeometry(.02,10,8),M.black,dx,0,-.103,g);const strap=mesh(new THREE.TorusGeometry(.20,.018,8,24),M.fabric,0,0,.12,g);strap.rotation.x=Math.PI/2;return g;}
function buildMetaverseWallpaper(){
 const texture=canvasTex(2048,640,(c,w,h)=>{
  const palette=['#c99a38','#829079','#253f4c','#b5b1a7','#d3cec1','#9da68c'];
  // Split the wall into irregular painted polygons with cream seams.
  let polygons=[[[0,0],[w,0],[w,h],[0,h]]];
  const cuts=[[.06,-.2,.36,1.2],[.32,-.2,.03,1.2],[.47,-.2,.78,1.2],[.82,-.2,.47,1.2],[.97,-.2,.72,1.2],[-.1,.7,1.1,.25]];
  for(const [ax,ay,bx,by] of cuts){
   const a={x:ax*w,y:ay*h},b={x:bx*w,y:by*h};
   const distance=p=>(b.x-a.x)*(p[1]-a.y)-(b.y-a.y)*(p[0]-a.x);
   const split=(polygon,sign)=>{
    const result=[];
    for(let i=0;i<polygon.length;i++){
     const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=distance(p)*sign,dq=distance(q)*sign;
     if(dp>=0)result.push(p);
     if((dp<0)!==(dq<0)){const t=dp/(dp-dq);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
    }
    return result;
   };
   polygons=polygons.flatMap(p=>[split(p,1),split(p,-1)].filter(p=>p.length>=3));
  }
  c.fillStyle='#f4eddd';c.fillRect(0,0,w,h);
  polygons.forEach((polygon,i)=>{c.beginPath();polygon.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=palette[(i*5+Math.floor(i/3))%palette.length];c.fill();c.strokeStyle='#f4eddd';c.lineWidth=9;c.lineJoin='round';c.stroke();});
 });
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.95});
 const wall=(width,x,z,rotation=0)=>{const panel=mesh(new THREE.PlaneGeometry(width,3.78),material,x,2.03,z);panel.rotation.y=rotation;panel.castShadow=false;};
 wall(13.7,19.79,-1,-Math.PI/2);
 wall(16.7,11.5,-7.86);
 wall(16.7,11.5,5.86,Math.PI);
 wall(5.45,3.14,-5.25,Math.PI/2);
 wall(5.45,3.14,3.25,Math.PI/2);
}
function buildMetaverse(){buildMetaverseWallpaper();let r=rooms[1];for(let x of[7,12,17]){cyl(.8,.8,.9,M.cream,x,.55,2);collider(x,2,1.6,1.6,'demo pedestal');vrHeadset(x,1.2,2);}
 sign('Other worlds.\nReal possibilities.','360° TOURS · VR · AR · VIRTUAL EXPO',19.78,2.5,0,5,2.5,-Math.PI/2,()=>showRoom(r));
 box(6,2.6,.18,M.charcoal,12,1.9,-5.4,office,true);let screen=sign('SIVAN JEWELLERY','CLICK TO EXPLORE OUR VIRTUAL SIVAN JEWELLERY ↗',12,1.9,-5.29,5.7,2.3,0,()=>loadJewellery());screen.userData.label='Explore virtual Sivan Jewellery';
 box(4,2.6,.18,M.black,6.5,2,-5.4,office,true);
 const playlist=mediaConfig.metaverseVideos;
 const video=document.createElement('video');video.crossOrigin='anonymous';video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('playsinline','');let clip=0;
 const playClip=()=>{video.src=playlist[clip];video.play().catch(()=>{});};video.addEventListener('ended',()=>{clip=(clip+1)%playlist.length;playClip();});video.addEventListener('error',()=>{if(!issues.includes('Billboard video failed to load'))issues.push('Billboard video failed to load');});
 const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const display=box(3.8,2.1375,.03,new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),6.5,2,-5.29);display.userData.label='3D Billboard video display';
 playClip();document.addEventListener('pointerdown',()=>{if(video.paused)video.play().catch(()=>{});});
 sign('3D Billboard','',6.5,.47,-5.2,3.6,.52,0,()=>showRoom(r));hotspot(12,-1,'Explore Sivan Jewellery',()=>loadJewellery());}
function buildAnimationWallpaper(){
 const diamond=canvasTex(256,512,(c,w,h)=>{
  c.fillStyle='#e4e6dc';c.fillRect(0,0,w,h);
  c.fillStyle='#78928f';
  c.beginPath();c.moveTo(w/2,0);c.lineTo(w,h/2);c.lineTo(w/2,h);c.lineTo(0,h/2);c.closePath();c.fill();
 });
 diamond.wrapS=diamond.wrapT=THREE.RepeatWrapping;
 const wall=(width,x,z,rotation=0)=>{
  const texture=diamond.clone();texture.repeat.set(width/.8,3.78/1.4);texture.needsUpdate=true;
  const panel=mesh(new THREE.PlaneGeometry(width,3.78),new THREE.MeshStandardMaterial({map:texture,roughness:1}),x,2.03,z);
  panel.rotation.y=rotation;panel.castShadow=false;
 };
 wall(13.7,-19.79,-15,Math.PI/2);
 wall(16.7,-11.5,-21.86);
 wall(16.7,-11.5,-8.14,Math.PI);
 wall(5.45,-3.14,-19.25,-Math.PI/2);
 wall(5.45,-3.14,-10.75,-Math.PI/2);
}
function buildAnimation(){buildAnimationWallpaper();let r=rooms[2];box(10,.2,4,M.charcoal,-12,.15,-17);collider(-12,-17,10,4,'sculpture stage');
 sign('Make the impossible\nfeel tangible.','PRODUCT · MEDICAL · INDUSTRIAL · ARCHITECTURE',-19.78,2.4,-15,4.6,2.5,Math.PI/2,()=>showRoom(r));
 table(-8,-11,3,1);laptop(-8,-11);chairAtTable(-8,-10,-8,-11);table(-17,-11,2,1);laptop(-17,-11);chairAtTable(-17,-10,-17,-11);
 sign('Ideas in motion','ANIMATION · VISUAL PRODUCTION',-12,3.0,-21.84,5.5,1,0,()=>showRoom(r));
 const loader=new FontLoader();loader.load('./assets/helvetiker_regular.typeface.json',font=>{let letters='ANIMATION',total=0,parts=[];for(let ch of letters){let g=new TextGeometry(ch,{font,size:.85,depth:.23,curveSegments:5,bevelEnabled:true,bevelThickness:.035,bevelSize:.018,bevelSegments:2});g.computeBoundingBox();let width=g.boundingBox.max.x;parts.push({g,width});total+=width+.10;}
 let x=-12-total/2;parts.forEach((p,i)=>{let m=mesh(p.g,M.cream,x,.32,-16.2);m.userData.index=i;sculptLetters.push(m);x+=p.width+.1;});},undefined,()=>issues.push('Sculpture typeface failed to load'));
}
function limb(parent,x,y,z,length,mat){const bones=[],geo=new THREE.CylinderGeometry(.045,.055,length,8,8),pos=geo.attributes.position,ids=[],weights=[];geo.translate(0,-length/2,0);for(let i=0;i<pos.count;i++){let t=Math.max(0,Math.min(1,-pos.getY(i)/length));ids.push(0,1,0,0);weights.push(1-t,t,0,0);}geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));let a=new THREE.Bone(),b=new THREE.Bone();a.position.set(x,y,z);b.position.y=-length;a.add(b);let sk=new THREE.SkinnedMesh(geo,mat);sk.add(a);sk.bind(new THREE.Skeleton([a,b]));parent.add(sk);return {a,b,mesh:sk};}
function openChannelContact(b){rememberView();window.location.href='./contact.html?channel='+encodeURIComponent(b.name);}
function addChannelDisplay(b,x,z,rot){let g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;office.add(g);box(2.1,2.7,.09,M.cream,0,2.15,0,g,true);let texture=new THREE.TextureLoader().load(b.logo,tex=>{tex.colorSpace=THREE.SRGBColorSpace;let image=tex.image,w=image?.width||1,h=image?.height||1,ratio=w/h;logo.scale.set(ratio>1?1:.86*ratio,ratio>1?.86/ratio:.86,1);},undefined,()=>issues.push('Channel logo failed: '+b.name));texture.colorSpace=THREE.SRGBColorSpace;let logo=mesh(new THREE.PlaneGeometry(1.7,1.7),new THREE.MeshBasicMaterial({map:texture}),0,2.65,.06,g);logo.scale.set(1,.76,1);logo.userData={label:b.name+' · Need to advertise here?',action:()=>openChannelContact(b)};interactive.push(logo);sign(b.name,'',0,1.53,.065,1.95,.48,0,()=>openChannelContact(b),false,g);let question=sign('Need to advertise here?','CONTACT SIVAN FILMS ↗',0,.97,.07,1.95,.52,0,()=>openChannelContact(b),true,g);question.userData.label='Need to advertise here? '+b.name;}
function buildMediaWallpaper(){
 const stripe=canvasTex(256,512,(c,w,h)=>{
  c.fillStyle='#eee8d7';c.fillRect(0,0,w,h);
  c.fillStyle='#8e9a80';c.fillRect(0,0,w/2,h);
 });
 stripe.wrapS=THREE.RepeatWrapping;
 const wall=(width,x,z,rotation=0)=>{
  const texture=stripe.clone();texture.repeat.set(width/1.25,1);texture.needsUpdate=true;
  const panel=mesh(new THREE.PlaneGeometry(width,3.78),new THREE.MeshStandardMaterial({map:texture,roughness:1}),x,2.03,z);
  panel.rotation.y=rotation;panel.castShadow=false;
 };
 wall(13.7,19.79,-15,-Math.PI/2);
 wall(16.7,11.5,-21.86);
 wall(16.7,11.5,-8.14,Math.PI);
 wall(5.45,3.14,-19.25,Math.PI/2);
 wall(5.45,3.14,-10.75,Math.PI/2);
}
function buildMedia(){buildMediaWallpaper();brandStations.forEach((b,i)=>{if(i<5)addChannelDisplay(b,5.2+i*3.05,-21.78,0);else addChannelDisplay(b,19.78,-19.1+(i-5)*2.35,-Math.PI/2);});}
function aboutGallery(){
 const slots=[[-19.76,1.65,-25,Math.PI/2],[-19.76,1.65,-29.5,Math.PI/2],[-19.76,1.65,-34,Math.PI/2],[-16,1.65,-36.27,0],[-11,1.65,-36.27,0],[-6,1.65,-36.27,0],[-11,1.65,-22.17,Math.PI]];
 slots.slice(0,mediaConfig.gallery.length).forEach(([x,y,z,rot],i)=>{
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;office.add(g);
  box(3.96,2.46,.07,M.gold,0,0,0,g);box(3.8,2.30,.035,M.black,0,0,.045,g);
  new THREE.TextureLoader().load(mediaConfig.gallery[i],t=>{t.colorSpace=THREE.SRGBColorSpace;const aspect=t.image.width/t.image.height,w=Math.min(3.64,2.14*aspect),h=w/aspect;const photo=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}),0,0,.07,g);photo.userData.wallDisplay={title:'About gallery photo '+(i+1)};},undefined,()=>issues.push('About gallery photo '+(i+1)+' failed to load'));
 });
}
function buildAboutInteriors(){
 // Large, soft geometric colour blocks inspired by the supplied reference.
 const wall=(width,x,z,rotation=0)=>{
  const texture=canvasTex(Math.round(width*160),640,(c,w,h)=>{
   c.fillStyle='#eee7df';c.fillRect(0,0,w,h);
   const polygon=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();c.fill();};
   polygon('#729b9a',[[0,0],[.6,0],[.25,.68],[0,.37]]);
   polygon('#dfbdb1',[[.6,0],[1,.55],[1,1],[0,1]]);
   polygon('#b9adb0',[[.6,0],[1,0],[1,.27],[.76,.27]]);
   polygon('#f1e9e5',[[.76,.27],[1,.27],[1,.55]]);
   polygon('#e5ddd0',[[0,.37],[.25,.68],[0,1]]);
  });
  const panel=mesh(new THREE.PlaneGeometry(width,3.78),new THREE.MeshStandardMaterial({map:texture,roughness:.9}),x,2.03,z);panel.rotation.y=rotation;panel.castShadow=false;
 };
 wall(13.7,-19.79,-29.4,Math.PI/2);
 wall(16.7,-11.5,-36.30);
 wall(16.7,-11.5,-22.14,Math.PI);
 wall(5.45,-3.14,-33.25,-Math.PI/2);
 wall(5.45,-3.14,-24.75,-Math.PI/2);
 const warm=new THREE.MeshBasicMaterial({color:'#ffe4b5'});
 for(const x of[-18.8,-4.1]){
  box(.07,.03,13.1,M.gold,x,4.08,-29.4);
  box(.045,.016,13.1,warm,x,4.055,-29.4);
 }
 // Brass detail frames the company name without covering the existing photos.
 box(7.4,.035,.035,M.gold,-11,3.94,-35.94);
 box(7.4,.035,.035,M.gold,-11,2.88,-35.94);
}
function buildAbout(){buildAboutInteriors();aboutGallery();const r=rooms.find(r=>r.id==='about');sign('SIVAN FILMS','ADVERTISING COMES FIRST · ESTABLISHED 2003',-11,3.4,-35.9,7,.85,0,about);sign('Across South India.',contact.locations,-3.18,2.3,-33,4.0,2.0,-Math.PI/2,about);table(-15,-25,2.6,1);chairAtTable(-15,-23.8,-15,-25);plant(-18,-34,1.2);hotspot(-11,-31,'Read about Sivan Films',about);}
function contactWhatsApp(message='Hello Sivan Films! I would like to discuss a project.'){
 window.open('https://wa.me/'+phoneDigits+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
}
function contactMapURL(){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(contact.address||'Sivan Films '+contact.locations);}
function buildContact(){
 const sage=new THREE.MeshStandardMaterial({color:'#e8e3db',roughness:.9});
 const oak=new THREE.MeshStandardMaterial({color:'#98734e',roughness:.72});
 const upholstery=new THREE.MeshStandardMaterial({color:'#167b78',roughness:1});
 // Opaque teal plaques keep contact details legible over the wallpaper.
 const card=(title,sub,x,y,z,w,h,rot=0,action=contactLounge,plain=false)=>{
  const texture=canvasTex(1536,Math.round(1536*h/w),(c,W,H)=>{
   c.fillStyle='#123d3d';c.fillRect(0,0,W,H);
   c.fillStyle='#27a7a0';c.fillRect(0,0,14,H);
   const pad=W*.055,iconSize=Math.min(H*.46,W*.12),cy=H*.5;
   c.fillStyle='#225655';c.beginPath();c.arc(pad+iconSize*.5,cy,iconSize*.5,0,Math.PI*2);c.fill();
   c.strokeStyle='#b8e7df';c.fillStyle='#b8e7df';c.lineWidth=Math.max(3,H*.025);
   const cx=pad+iconSize*.5,r=iconSize*.27;
   if(title==='Email'){
    c.strokeRect(cx-r,cy-r*.65,r*2,r*1.3);c.beginPath();c.moveTo(cx-r,cy-r*.65);c.lineTo(cx,cy+r*.12);c.lineTo(cx+r,cy-r*.65);c.stroke();
   }else if(title==='Call'){
    c.beginPath();c.arc(cx,cy,r,Math.PI*.2,Math.PI*1.3);c.stroke();
    c.fillRect(cx-r,cy-r,r*.65,r*.5);c.fillRect(cx+r*.3,cy+r*.35,r*.65,r*.5);
   }else{
    c.beginPath();c.roundRect(cx-r,cy-r*.75,r*2,r*1.4,r*.3);c.stroke();
    c.beginPath();c.moveTo(cx-r*.4,cy+r*.65);c.lineTo(cx-r*.65,cy+r);c.lineTo(cx+r*.15,cy+r*.65);c.stroke();
   }
   const left=pad+iconSize+W*.035,available=W-left-pad;
   c.textAlign='left';c.fillStyle='#ffffff';c.font=`600 ${Math.min(W*.066,H*.26)}px Arial`;
   c.fillText(title.replaceAll('\n',' '),left,H*(sub ? .43 : .58),available);
   c.fillStyle='#c5ded8';c.font=`${Math.min(W*.037,H*.18)}px Arial`;
   c.fillText(sub,left,H*.74,available);
  });
  const face=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),x,y,z);face.rotation.y=rot;face.castShadow=false;
  face.userData={wallDisplay:{title},label:title.replaceAll('\n',' '),action};if(action)interactive.push(face);return face;
 };
 box(16.6,3.8,.08,sage,11.5,2.05,-36.23);
 // Off-white wallpaper with alternating black and teal sunburst motifs.
 const mural=canvasTex(2048,1024,(c,W,H)=>{
  c.fillStyle='#e8e3db';c.fillRect(0,0,W,H);
  const burst=(x,y,r,color)=>{
   c.fillStyle=color;
   for(let i=0;i<18;i++){
    const angle=i*Math.PI*2/18,half=.11;
    c.beginPath();c.moveTo(x+Math.cos(angle-half)*r*.1,y+Math.sin(angle-half)*r*.1);
    c.lineTo(x+Math.cos(angle-half)*r,y+Math.sin(angle-half)*r);
    c.lineTo(x+Math.cos(angle+half)*r,y+Math.sin(angle+half)*r);
    c.lineTo(x+Math.cos(angle+half)*r*.1,y+Math.sin(angle+half)*r*.1);c.closePath();c.fill();
   }
  };
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){
   burst(col*256+64,row*256+64,66,'#111311');
   burst(col*256+132,row*256+192,43,'#167b78');
  }
 });
 // Wrap the room interior; the corridor doorway remains open.
 const wallPanel=(w,x,z,rotation=0)=>{
  const texture=mural.clone();texture.repeat.x=w/8.1;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;
  const panel=mesh(new THREE.PlaneGeometry(w,3.65),new THREE.MeshStandardMaterial({map:texture,roughness:1}),x,2.12,z);panel.rotation.y=rotation;return panel;
 };
 wallPanel(16.6,11.5,-36.1);
 wallPanel(13.6,19.8,-29.25,-Math.PI/2);
 wallPanel(16.6,11.5,-22.16,Math.PI);
 for(const z of [-33.25,-24.75])wallPanel(5.4,3.14,z,Math.PI/2);
 // Overhead track lighting washing warm light onto the geometric accent wall
 box(7.6,.035,.035,M.cream,11.3,3.88,-35.3);
 for(const tx of [8.4,10.3,12.3,14.2]){
  cyl(.028,.036,.07,M.cream,tx,3.84,-35.3);
  const head=cyl(.035,.045,.11,oak,tx,3.78,-35.33,office,16);
  head.rotation.x=.42;
 }
 const trackWash=new THREE.SpotLight('#fff2dc',8,7,Math.PI/3.6,.75,1.6);
 trackWash.position.set(11.3,3.86,-35.1);
 trackWash.target.position.set(11.3,2.2,-36.1);
 office.add(trackWash,trackWash.target);
 // Warm timber floor and a woven rectangular rug anchor the seating area.
 box(16.5,.025,13.5,new THREE.MeshStandardMaterial({color:'#b59a77',roughness:.9}),11.5,.11,-29.4);
 for(let x=3.5;x<20;x+=.65)box(.012,.004,13.5,new THREE.MeshStandardMaterial({color:'#9b8468'}),x,.125,-29.4);
 const woven=canvasTex(1024,768,(c,W,H)=>{
  c.fillStyle='#e4ddcf';c.fillRect(0,0,W,H);
  // A framed diamond weave keeps the pattern visible around the furniture.
  c.strokeStyle='#383b3b';c.lineWidth=12;c.strokeRect(25,25,W-50,H-50);
  c.lineWidth=3;c.strokeRect(47,47,W-94,H-94);
  c.save();c.beginPath();c.rect(67,67,W-134,H-134);c.clip();
  c.strokeStyle='#575a57';c.lineWidth=6;
  for(let y=-70;y<H+140;y+=140)for(let x=-90;x<W+180;x+=180){
   c.beginPath();c.moveTo(x,y-56);c.lineTo(x+72,y);c.lineTo(x,y+56);c.lineTo(x-72,y);c.closePath();c.stroke();
  }
  c.restore();
  // Fine threads overlay the design so the mat still reads as woven fabric.
  c.lineWidth=1;
  for(let i=0;i<W;i+=4){c.strokeStyle=i%8?'#706c6222':'#ffffff35';c.beginPath();c.moveTo(i,0);c.lineTo(i,H);c.stroke();}
  for(let i=0;i<H;i+=4){c.strokeStyle=i%8?'#706c621a':'#ffffff30';c.beginPath();c.moveTo(0,i);c.lineTo(W,i);c.stroke();}
 });
 const rug=mesh(new THREE.PlaneGeometry(6.5,4.9),new THREE.MeshStandardMaterial({map:woven,roughness:1}),11.3,.132,-32.2);rug.rotation.x=-Math.PI/2;
 const linen=new THREE.MeshStandardMaterial({color:'#303436',roughness:1});
 const sofaZ=-34.2;
 for(const x of [9.2,13.4])for(const z of [-34.65,-33.65])cyl(.055,.045,.23,oak,x,.25,z,office,12);
 box(4.9,.35,1.45,linen,11.3,.52,sofaZ,office,true);
 box(4.7,1.0,.3,linen,11.3,1.12,sofaZ-.58,office,true);
 for(const x of [8.95,13.65])box(.32,.78,1.5,linen,x,.87,sofaZ,office,true);
 for(const x of [9.78,11.3,12.82])box(1.43,.22,1.12,linen,x,.79,sofaZ+.05,office,true);
 collider(11.3,sofaZ,5.05,1.5,'contact lounge sofa');
 for(const [x,color,angle] of [[9.5,'#faf9f6',-.18],[10.35,'#101214',.1],[12.3,'#101214',-.12],[13.05,'#faf9f6',.18]]){const cushion=box(.72,.7,.22,new THREE.MeshStandardMaterial({color,roughness:1}),x,1.18,sofaZ-.25,office,true);cushion.rotation.z=angle;cushion.rotation.x=-.13;}
 box(.75,.035,1.0,new THREE.MeshStandardMaterial({color:'#cec7b5',roughness:1}),12.65,.925,sofaZ+.25,office,true);
 box(.75,.55,.04,linen,12.65,.65,sofaZ+.77,office,true);
 // Round meeting table with two chairs, in front of the sofa.
 cyl(1.15,1.15,.12,oak,11.3,.94,-30.9,office,64);
 cyl(.20,.40,.72,M.charcoal,11.3,.52,-30.9,office,32);
 collider(11.3,-30.9,2.3,2.3,'contact meeting table');
 for(const x of [9.45,13.15]){
  const seat=chairAtTable(x,-30.9,11.3,-30.9);seat.position.y=.13;
  seat.children.slice(0,2).forEach(part=>part.material=upholstery);
 }
 enquirySign=card('Start Enquiry','TAKE A SEAT · ASK OUR ASSISTANT',13.15,1.85,-30.9,1.5,.45,0,startSeatedEnquiry);
 enquirySign.material.transparent=true;enquirySign.material.depthWrite=false;
 cyl(.12,.17,.28,M.cream,11.3,1.14,-31.65,office,32);
 for(const dx of [-.1,0,.1]){const stem=cyl(.009,.009,.36,oak,11.3+dx,1.43,-31.65,office,8);stem.rotation.z=dx*2;const leaf=mesh(new THREE.SphereGeometry(.1,12,8),upholstery,11.3+dx*2,1.58,-31.65);leaf.scale.set(.5,1.6,.22);leaf.rotation.z=-dx*4;}
 for(const x of [10.8,11.8]){cyl(.13,.13,.025,M.cream,x,1.015,-30.55,office,24);cyl(.07,.06,.12,M.cream,x,1.085,-30.55,office,24);}
 new THREE.TextureLoader().load(contact.logo,t=>{t.colorSpace=THREE.SRGBColorSpace;const ar=t.image.width/t.image.height;box(1.92,1.15,.08,oak,5.6,2.5,-36.04);mesh(new THREE.PlaneGeometry(1.8,Math.min(1.05,1.8/ar)),companyLogoMaterial(t),5.6,2.5,-35.98);});
 box(.9,.65,.8,oak,7.6,.48,-34.2,office,true);collider(7.6,-34.2,.95,.85,'side table');
 cyl(.13,.2,.4,M.cream,7.6,1,-34.2);cyl(.35,.27,.4,new THREE.MeshStandardMaterial({color:'#f0dfbc',emissive:'#eed5a1',emissiveIntensity:.3}),7.6,1.4,-34.2,office,32);
 const lamp=new THREE.PointLight('#ffe0a2',12,6,2);lamp.position.set(7.6,1.65,-34);office.add(lamp);
 card('Say hello','WE’D LOVE TO HEAR YOUR IDEA',3.18,3.15,-33,3.5,.7,Math.PI/2,contactLounge,true);
 for(const [i,title,subtitle,action] of [[0,'Call',contact.phone,()=>{location.href='tel:'+contact.phone;}],[1,'WhatsApp','Start a conversation',()=>contactWhatsApp()],[2,'Email',contact.email,()=>{location.href='mailto:'+contact.email;}]])card(title,subtitle,3.2,2.4-i*.72,-33,3.3,.59,Math.PI/2,action);
 card('Your next project','TELL US WHAT YOU HAVE IN MIND',19.77,2.65,-29,3.6,1.3,-Math.PI/2);
 card('Let’s talk','OPEN PROJECT FORM',19.75,1.55,-29,3.6,.64,-Math.PI/2);
 const openPolicy=path=>{rememberView();location.href=path+(new URLSearchParams(location.search).get('preview')==='1'?'?preview=1':'');};
 card('Terms & Conditions','',8.0,2.4,-22.22,5.6,1.05,Math.PI,()=>openPolicy('/terms-and-conditions'));
 card('Privacy Policy','',14.7,2.4,-22.22,5.6,1.05,Math.PI,()=>openPolicy('/privacy-policy'));
 officeLocations.forEach((location,i)=>card(`${location.city} (${location.area})`,location.phone,16.1,3.1-i*.8,-36.08,4.2,.66,0,showContacts));
 plant(5,-35,1.1);plant(18,-24,1.1);hotspot(15,-27,'Let’s Talk · project enquiry',contactLounge).position.y=.15;
}

let enquirySession=null,enquiryHost=null,enquiryRequest=null,enquirySign=null;
function initSeatedEnquiry(){
 const ui=document.createElement('section');ui.id='seated-enquiry';ui.hidden=true;ui.setAttribute('aria-label','Sivan Films enquiry assistant');
 ui.innerHTML='<div class="enquiry-chat-heading"><div><strong>Sivan Films Assistant</strong><small>Ask about our studio and services</small></div><button type="button" id="enquiry-stand" aria-label="End enquiry and stand up">×</button></div><div id="enquiry-messages" role="log" aria-live="polite" aria-label="Conversation"></div><form id="enquiry-chat-form"><label class="sr-only" for="enquiry-question">Your question</label><input id="enquiry-question" name="question" maxlength="1000" required autocomplete="off" placeholder="Ask your question…"><button type="submit">Send</button></form><p id="enquiry-chat-status" role="status"></p>';
 document.body.append(ui);
 $('enquiry-stand').onclick=()=>leaveEnquiry();
 $('enquiry-chat-form').onsubmit=async e=>{
  e.preventDefault();const input=$('enquiry-question'),question=input.value.trim();if(!question||enquiryRequest||!enquirySession)return;
  appendEnquiryMessage('user',question);input.value='';
  const controller=new AbortController();enquiryRequest=controller;
  const timeout=setTimeout(()=>controller.abort(),15000);
  const button=e.currentTarget.querySelector('button');button.disabled=true;$('enquiry-chat-status').textContent='Finding an answer…';
  try{
   const response=await fetch('/api/enquiry-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');
   if(enquiryRequest===controller&&enquirySession)appendEnquiryMessage('assistant',data.answer,data.source);
  }catch(error){if(enquiryRequest===controller&&enquirySession){appendEnquiryMessage('assistant','Unable to get an answer. Please try again or contact the studio.');input.value=question;}}
  finally{clearTimeout(timeout);if(enquiryRequest===controller){enquiryRequest=null;button.disabled=false;$('enquiry-chat-status').textContent='';input.focus();}}
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&enquirySession)leaveEnquiry();});
}
function appendEnquiryMessage(role,text,source){
 const message=document.createElement('div');message.className='enquiry-message '+role;
 const label=document.createElement('strong');label.textContent=role==='user'?'You':'Studio assistant';message.append(label);
 const body=document.createElement('p');body.textContent=text;message.append(body);
 if(source){const note=document.createElement('small');note.textContent='From: '+source;message.append(note);}
 $('enquiry-messages').append(message);message.scrollIntoView({block:'nearest'});
}
function startSeatedEnquiry(){
 if(!entered||detectRoom()!=='contact'||enquirySession)return;
 if(vr.active()){toast('Exit VR to use the seated enquiry chat.');return;}
 $('panel').close();closeStudioGuide();keys.clear();touchMove.x=touchMove.y=0;drag=null;
 walkToRoom(14.4,-30.9,Math.PI/2);
 if(!roomWalk)return;
 enquirySession={phase:'approach'};
 toast('Taking you to the second chair…');
}
function leaveEnquiry(immediate=false){
 if(!enquirySession)return;
 enquiryRequest?.abort();enquiryRequest=null;
 $('seated-enquiry').hidden=true;document.body.classList.remove('enquiry-seated');
 $('enquiry-chat-form').querySelector('button').disabled=false;$('enquiry-chat-status').textContent='';
 keys.clear();touchMove.x=touchMove.y=0;roomWalk=null;
 if(immediate){if(enquirySession.phase!=='approach')position.set(14.4,1.67,-30.9);enquirySession=null;return;}
 if(enquirySession.phase==='approach'){enquirySession=null;return;}
 enquirySession.phase='leaving';
}
function updateSeatedEnquiry(dt){
 if(!enquirySession)return;
 if(enquirySession.phase==='approach'){
  if(roomWalk)return;
  if(Math.hypot(position.x-14.4,position.z+30.9)>.4){leaveEnquiry(true);return;}
  enquirySession.phase='seating';
 }
 const leaving=enquirySession.phase==='leaving';
 if(enquirySession.phase==='active')return;
 const target=new THREE.Vector3(leaving?14.4:13.15,leaving?1.67:1.3,-30.9),alpha=1-Math.exp(-4*dt);
 position.lerp(target,alpha);const turn=Math.atan2(Math.sin(Math.PI/2-yaw),Math.cos(Math.PI/2-yaw));yaw+=turn*alpha;pitch+=(-.015-pitch)*alpha;
 if(position.distanceTo(target)<.015&&Math.abs(turn)<.015){
  position.copy(target);
  if(leaving){enquirySession=null;rememberView();return;}
  enquirySession.phase='active';document.body.classList.add('enquiry-seated');
  $('seated-enquiry').hidden=false;$('enquiry-messages').replaceChildren();
  appendEnquiryMessage('assistant','Vanakkam! Take a seat. Ask me about Sivan Films, our services, locations or contact details.');$('enquiry-question').focus();
 }
}
function createEnquiryHost(){
 const data=createActor(9.45,-30.9,'assistant',Math.PI/2);if(!data)return;
 enquiryHost=data;
 if(data.actor.userData.modelSource){seatStudioHuman(data.actor);return;}
 // Retain the original seated pose for the Michelle fallback.
 for(const side of ['Left','Right']){
  const thigh=findBone(data.actor,side+'UpLeg'),knee=findBone(data.actor,side+'Leg');
  if(thigh)thigh.rotation.x+=Math.PI/2;
  if(knee)knee.rotation.x-=Math.PI/2;
 }
 data.actor.updateMatrixWorld(true);
 const hips=findBone(data.actor,'Hips');
 if(hips){const point=new THREE.Vector3();hips.getWorldPosition(point);data.actor.position.y+=.95-point.y;}
}

function locationCards(){
 return `<div class="office-locations">${officeLocations.map(location=>`<article class="office-location"><h3>${esc(location.city)} <span>(${esc(location.area)})</span></h3><a href="tel:${location.tel}" aria-label="Call ${esc(location.city)} office at ${esc(location.phone)}">${esc(location.phone)} <span aria-hidden="true">↗</span></a></article>`).join('')}</div>`;
}
function showContacts(){
 panel('CONTACT / SIVAN FILMS',`<div class="contact-lounge"><p class="intro-line">LET’S START A CONVERSATION</p><h2>Contact us</h2><p>Connect with our team at any of our three locations.</p>${locationCards()}</div>`);
}
function contactLounge(){
 if(!entered||detectRoom()!=='contact')return;
 panel('06 / CONTACT US',`<div class="contact-lounge"><p class="intro-line">SIVAN FILMS · LET’S TALK</p><h2>Let’s create your<br>next big story.</h2><p>Pull up a chair. Tell us what you have in mind.</p>${locationCards()}<button type="button" class="panel-action" id="lounge-sit">Start seated enquiry ↗</button><div class="contact-grid"><a class="contact-primary" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><a href="tel:${esc(contact.phone)}">Call ${esc(contact.phone)}</a><a href="mailto:${esc(contact.email)}">Email ${esc(contact.email)}</a></div><h3>Tell us about your project</h3><form id="lounge-form"><label class="field">Your name<input name="name" autocomplete="name" required maxlength="100" placeholder="Your name"></label><label class="field">Company / organisation<input name="company" autocomplete="organization" maxlength="140" placeholder="Company name (optional)"></label><label class="field">Phone or email<input name="reply" autocomplete="email" required maxlength="160" placeholder="How can we reach you?"></label><label class="field">Service<select name="service">${['General enquiry',...rooms.filter(r=>!['about','contact'].includes(r.id)&&!r.reserved).map(r=>r.name),...additional.map(s=>s.title)].map(name=>`<option>${esc(name)}</option>`).join('')}</select></label><label class="field">Tell us about your project<textarea name="details" required maxlength="2000" rows="4" placeholder="Your idea, timeline and what you would like to create"></textarea></label><button class="panel-action" type="submit">Submit enquiry</button><p class="contact-note">Read our <a href="/privacy-policy">Privacy Policy</a> for how we use your enquiry details and our <a href="/terms-and-conditions">Terms &amp; Conditions</a>. Your enquiry will be sent to the Sivan Films team. You can also close this form using ×.</p><p id="lounge-result" role="status" aria-live="polite"></p></form><section class="lounge-visit"><h3>Visit our studio</h3><p>${esc(contact.locations)}</p><p>${contact.address?esc(contact.address):'Contact us to confirm the studio address and arrange your visit.'}<br>${contact.hours?esc(contact.hours):'Please call for visiting hours.'}</p><a href="${esc(contactMapURL())}" target="_blank" rel="noopener noreferrer">${contact.address?'Open in Google Maps':'Find Sivan Films on Google Maps'}</a></section></div>`);
 $('lounge-sit').onclick=startSeatedEnquiry;
 $('lounge-form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type="submit"]'),result=form.querySelector('#lounge-result');
  if(button.disabled)return;
  button.disabled=true;button.textContent='Sending…';result.textContent='';
  try{
   const response=await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to send your enquiry. Please try again.');
   result.textContent='Thank you! Your enquiry has been received. Our team will contact you.';form.reset();button.textContent='Enquiry submitted';
  }catch(error){result.textContent=error.message;button.disabled=false;button.textContent='Submit enquiry';}
 };
}

function buildGrandTileJoints(){const joint=new THREE.MeshStandardMaterial({color:'#c6c4bd',roughness:.6});for(let x=-20;x<=20;x+=2){let length=51,z=-11;box(.012,.004,length,joint,x,.094,z);}for(let z=-36.5;z<=14.5;z+=2){let width=40,x=0;box(width,.004,.012,joint,x,.094,z);}for(let x of[-2.3,2.3])box(.045,.005,49,M.gold,x,.097,-11);}

function findBone(obj,name){return humanBone(obj,name);}
// Set false to restore the corridor before the gallery design, keeping reception murals.
var corridorGalleryEnabled=true;
function buildCorridorGallery(){
 if(!corridorGalleryEnabled)return;
 const cream=new THREE.MeshStandardMaterial({color:'#eee9df',roughness:.88});
 const teal=new THREE.MeshStandardMaterial({color:'#264b49',roughness:.7});
 const warm=new THREE.MeshBasicMaterial({color:'#ffe3ac'});
 // Panels follow the existing solid wall segments, leaving every doorway open.
 for(const r of rooms){
  const side=Math.sign(r.x),rotation=side<0?Math.PI/2:-Math.PI/2;
  for(const dz of[-4.25,4.25]){
   box(.018,2.68,5.48,cream,side*2.875,2.55,r.z+dz);
   box(.035,1.04,5.48,teal,side*2.855,.65,r.z+dz);
   box(.045,.028,5.48,M.gold,side*2.83,1.19,r.z+dz);
   for(const offset of[-2,-1,0,1,2])box(.045,.88,.018,M.gold,side*2.83,.65,r.z+dz+offset);
  }
  const g=new THREE.Group();g.position.set(side*2.79,0,r.z+3.8);g.rotation.y=rotation;office.add(g);
  box(2.12,2.25,.055,M.gold,0,2.45,0,g);
  box(2.02,2.15,.035,teal,0,2.45,.04,g);
  sign('SIVAN FILMS','STUDIO GALLERY',0,3.26,.075,1.85,.35,0,()=>showRoom(r),true,g);
  const galleryIndex=rooms.indexOf(r)%Math.max(1,mediaConfig.gallery.length),src=mediaConfig.gallery[galleryIndex];
  if(src)new THREE.TextureLoader().load(src,t=>{
   t.colorSpace=THREE.SRGBColorSpace;
   const aspect=t.image.width/t.image.height,w=Math.min(1.82,1.35*aspect),h=w/aspect;
   const photo=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),0,2.46,.075,g);
   photo.castShadow=false;photo.userData={label:'View studio gallery photo',action:()=>panel('SIVAN FILMS / STUDIO GALLERY',`<h2>Inside Sivan Films</h2><img src="${esc(src)}" alt="Sivan Films studio gallery photo" style="width:100%;height:auto;border-radius:8px"><p>From the Sivan Films gallery.</p>`)};interactive.push(photo);
  },undefined,()=>issues.push('Corridor gallery photo failed to load'));
  sign(r.name,'EXPLORE THIS ROOM ↗',0,1.58,.075,1.85,.42,0,()=>showRoom(r),true,g);
  box(.7,.10,.22,teal,0,3.75,.15,g);box(.6,.025,.15,warm,0,3.69,.19,g);
  const light=new THREE.SpotLight('#ffe4b5',7,4,Math.PI/5,.7,2);light.position.set(0,3.65,.7);light.target.position.set(0,2.35,0);g.add(light,light.target);
  const icon=canvasTex(256,256,(c,w,h)=>{
   c.fillStyle='#264b49';c.fillRect(0,0,w,h);c.strokeStyle='#e5c690';c.fillStyle='#e5c690';c.lineWidth=7;c.lineJoin='round';
   if(r.id==='ad'){c.strokeRect(55,85,146,100);c.strokeRect(55,55,146,30);for(let x=65;x<190;x+=35){c.beginPath();c.moveTo(x,80);c.lineTo(x+22,57);c.stroke();}}
   else if(r.id==='animation'){c.beginPath();c.moveTo(128,45);c.lineTo(205,90);c.lineTo(205,175);c.lineTo(128,218);c.lineTo(51,175);c.lineTo(51,90);c.closePath();c.moveTo(51,90);c.lineTo(128,135);c.lineTo(205,90);c.moveTo(128,135);c.lineTo(128,218);c.moveTo(128,45);c.lineTo(128,135);c.stroke();}
   else if(r.id==='meta'){c.strokeRect(40,85,176,85);for(const x of[90,166]){c.beginPath();c.arc(x,126,23,0,TAU);c.stroke();}c.beginPath();c.moveTo(62,85);c.quadraticCurveTo(128,15,194,85);c.stroke();}
   else if(r.id==='media'){c.strokeRect(48,83,160,105);c.beginPath();c.moveTo(90,45);c.lineTo(128,80);c.lineTo(166,45);c.moveTo(92,212);c.lineTo(164,212);c.stroke();}
   else if(r.id==='contact'){c.strokeRect(42,70,172,120);c.beginPath();c.moveTo(42,70);c.lineTo(128,135);c.lineTo(214,70);c.stroke();}
   else {c.font='bold 125px Georgia';c.textAlign='center';c.fillText('i',128,170);}
  });
  const badge=mesh(new THREE.PlaneGeometry(.48,.48),new THREE.MeshBasicMaterial({map:icon}),side*2.75,1.6,r.z-1.98);badge.rotation.y=rotation;badge.userData={label:r.name,action:()=>showRoom(r)};interactive.push(badge);
 }
 for(const side of[-1,1]){
  box(.10,.035,41.8,teal,side*2.62,4.19,-15.1);
  box(.055,.016,41.8,warm,side*2.62,4.165,-15.1);
 }
 // A softly lit brand feature terminates the corridor.
 box(5.5,3.72,.025,cream,0,2.02,-36.30);
 box(4.55,2.85,.035,warm,0,2.18,-36.25);
 box(4.42,2.72,.055,teal,0,2.18,-36.20);
 new THREE.TextureLoader().load(contact.logo,t=>{t.colorSpace=THREE.SRGBColorSpace;const ar=t.image.width/t.image.height,w=Math.min(3.7,1.8*ar);const logo=mesh(new THREE.PlaneGeometry(w,w/ar),companyLogoMaterial(t),0,2.55,-36.16);logo.userData={label:'About Sivan Films',action:about};interactive.push(logo);},undefined,()=>issues.push('Corridor logo failed to load'));
 sign('Ideas into Impact','SIVAN FILMS · SINCE 2003',0,1.3,-36.15,3.9,.68,0,about,true);
}

function buildEntranceMural(){
 const artwork=canvasTex(2560,640,(c,w,h)=>{
   c.fillStyle='#eee9df';c.fillRect(0,0,w,h);
   const shapes=[['#aab4a0',220,160,260,210,-.3],['#d4aea0',620,270,210,340,-.4],['#c7bfae',1010,470,290,210,.35],['#a7b39e',1340,180,320,230,-.2],['#bdb4c2',1830,130,280,310,.25],['#c99d8e',2240,470,280,230,-.3],['#8eabb5',50,540,180,230,.25],['#ded1b6',2470,70,200,220,.3]];
   for(const [color,x,y,rx,ry,angle] of shapes){
     c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();
     c.moveTo(-rx*.8,-ry*.5);c.bezierCurveTo(-rx*.3,-ry*1.1,rx*.7,-ry,rx*.9,-ry*.25);
     c.bezierCurveTo(rx*1.2,ry*.5,rx*.3,ry,-rx*.35,ry*.8);c.bezierCurveTo(-rx,ry*.6,-rx*1.1,0,-rx*.8,-ry*.5);c.fill();c.restore();
   }
   function branch(x,y,scale,angle){
     c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.strokeStyle='#53584d';c.lineWidth=2.4;c.lineCap='round';
     c.beginPath();c.moveTo(0,0);c.bezierCurveTo(35,-110,-30,-240,0,-370);c.stroke();
     for(let i=0;i<6;i++)for(const side of[-1,1]){
       const sy=-55-i*47,ex=side*(85-i*8),ey=sy-72;
       c.beginPath();c.moveTo(0,sy);c.bezierCurveTo(side*12,sy-55,ex*.7,ey-15,ex,ey);
       c.bezierCurveTo(ex*.9,ey+40,side*26,sy-4,0,sy);c.stroke();
       c.beginPath();c.moveTo(0,sy);c.quadraticCurveTo(ex*.55,sy-35,ex,ey);c.stroke();
     }
     c.restore();
   }
   branch(360,680,1.35,-.22);branch(920,490,1.05,.35);branch(1500,680,1.3,.18);branch(2080,380,1.1,-.35);branch(2460,740,1.25,-.2);
   c.strokeStyle='#66665b';c.lineWidth=2;
   for(const offset of[0,24]){c.beginPath();c.moveTo(70+offset,-20);c.bezierCurveTo(330+offset,230,-170+offset,360,110+offset,670);c.stroke();}
 });
 const mural=mesh(new THREE.PlaneGeometry(16.7,3.76),new THREE.MeshStandardMaterial({map:artwork,roughness:1}),11.5,2.02,6.135);
 mural.castShadow=false;
 const sideArtwork=artwork.clone();
 sideArtwork.repeat.set(8.1/16.7,1);sideArtwork.offset.x=.5;sideArtwork.needsUpdate=true;
 const sideMural=mesh(new THREE.PlaneGeometry(8.1,3.76),new THREE.MeshStandardMaterial({map:sideArtwork,roughness:1}),19.81,2.02,10.2);
 sideMural.rotation.y=-Math.PI/2;sideMural.castShadow=false;
 const leftMural=mesh(mural.geometry,mural.material,-11.5,2.02,6.135);
 leftMural.castShadow=false;
 const leftSideMural=mesh(sideMural.geometry,sideMural.material,-19.81,2.02,10.2);
 leftSideMural.rotation.y=Math.PI/2;leftSideMural.castShadow=false;
}
function buildGuideBook(){
 const x=-5.55,z=9.13;
 const cover=new THREE.MeshStandardMaterial({color:'#233c30',roughness:.5});
 const pages=new THREE.MeshStandardMaterial({color:'#f5ecd7',roughness:.8});
 // Build upright in local coordinates: the cover faces the reception entrance (+Z).
 const book=new THREE.Group();book.position.set(x,1.82,z);office.add(book);guideBook=book;
 book.scale.setScalar(.5);
 const base=box(.72,.98,.035,cover,0,0,-.065,book,true);
 const paper=box(.67,.93,.095,pages,0,0,0,book,true);
 const hinge=new THREE.Group();hinge.position.set(-.36,0,.065);book.add(hinge);guideCover=hinge;
 const lid=box(.72,.98,.035,cover,.36,0,0,hinge,true);
 const artwork=canvasTex(768,1024,(c,w,h)=>{
   c.fillStyle='#233c30';c.fillRect(0,0,w,h);c.strokeStyle='#d9b969';c.lineWidth=6;c.strokeRect(35,35,w-70,h-70);
   c.textAlign='center';c.fillStyle='#eed795';c.font='500 44px Arial';c.fillText('SIVAN FILMS',w/2,180);
   c.font='bold 100px Arial';c.fillText('USE',w/2,370);c.fillText('GUIDE',w/2,495);c.fillText('BOOK',w/2,620);
   c.font='30px Arial';c.fillText('MAP · ROOMS · SERVICES',w/2,790);c.fillText('CLICK TO OPEN',w/2,890);
 });
 // Keep the printed face beyond the cover's bevel so the solid cover cannot hide it.
 const top=mesh(new THREE.PlaneGeometry(.69,.95),new THREE.MeshBasicMaterial({map:artwork,toneMapped:false}),.36,0,.029,hinge);
 top.castShadow=false;
 const inside=sign('STUDIO GUIDE','SIX ROOMS · YOUR NEXT STORY',0,0,.055,.6,.84,0,null,false,book);
 guideLeaf=new THREE.Group();guideLeaf.position.set(-.32,0,.056);book.add(guideLeaf);
 const leaf=mesh(new THREE.PlaneGeometry(.63,.9),new THREE.MeshBasicMaterial({color:'#f4ecd9',side:THREE.DoubleSide}),.315,0,0,guideLeaf);leaf.castShadow=false;
 const glow=new THREE.MeshBasicMaterial({color:'#f4ca68',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
 guideBeacon=mesh(new THREE.RingGeometry(.59,.62,48),glow,0,0,-.1,book);
 for(const part of [base,paper,lid,top,guideBeacon]){part.userData={label:'Use Guide Book',action:openStudioGuide};if(!interactive.includes(part))interactive.push(part);}

}
function closeStudioGuide(){
 clearTimeout(guideOpenTimer);guideOpenTimer=null;guideOpening=false;
 const guide=$('studio-guide');guide.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
 guide.hidden=true;$('guide-open').focus();
}
$('guide-open').onclick=openStudioGuide;
function openStudioGuide(){
 if(guideOpening||!$('studio-guide').hidden)return;
 keys.clear();touchMove.x=touchMove.y=0;roomWalk=null;guideOpening=true;
 if(reduced){revealStudioGuide();return;}
 guideOpenTimer=setTimeout(()=>{guideOpenTimer=null;revealStudioGuide();},480);
}
function revealStudioGuide(){
 keys.clear();touchMove.x=touchMove.y=0;
 roomWalk=null;const guide=$('studio-guide');guide.hidden=false;
 $('guide-map').innerHTML=rooms.map(r=>`<button class="guide-map-room" data-guide-room="${esc(r.id)}" style="grid-column:${r.x<0?1:3};grid-row:${Math.round((r.z+29)/14)+1}"><small>${esc(r.n)}</small>${esc(r.name)}<span class="guide-stamp" hidden>✓ Visited</span></button>`).join('')+'<div class="guide-corridor">CORRIDOR</div><button class="guide-reception" data-guide-room="reception">RECEPTION / ENTRANCE</button><span id="guide-player" role="img" aria-label="You are here" title="You are here"></span>';
 guide.querySelectorAll('[data-guide-room]').forEach(b=>b.onclick=()=>selectGuideRoom(b.dataset.guideRoom));
 $('guide-close').onclick=closeStudioGuide;
 selectGuideRoom(rooms.some(r=>r.id===current)?current:'reception');updateGuidePassport();updateGuideLocation();$('guide-close').focus();
 if(!reduced){
  guide.animate([{opacity:0,transform:'perspective(1400px) rotateY(-18deg) scale(.88)'},{opacity:1,transform:'perspective(1400px) rotateY(0) scale(1)'}],{duration:600,easing:'cubic-bezier(.2,.75,.25,1)'});
  guide.querySelector('.guide-map-page')?.animate([{opacity:0,transform:'perspective(1000px) rotateY(45deg)'},{opacity:1,transform:'perspective(1000px) rotateY(0)'}],{duration:650,easing:'ease-out'});
  $('guide-details').animate([{opacity:0,transform:'perspective(1000px) rotateY(-65deg)'},{opacity:1,transform:'perspective(1000px) rotateY(0)'}],{duration:800,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
}

function updateGuideLocation(){
 if($('studio-guide').hidden)return;
 const map=$('guide-map'),dot=$('guide-player');if(!dot)return;
 const id=detectRoom(),r=rooms.find(room=>room.id===id);
 const label='You are here · '+(r?.name||({outside:'Garden / entrance',corridor:'Corridor',jewellery:'Sivan Jewellery',reception:'Reception'}[id]||'Studio'));
 if($('guide-location-label').textContent!==label)$('guide-location-label').textContent=label;
 dot.hidden=mode!=='office';if(dot.hidden)return;
 const region=r?map.querySelector(`[data-guide-room="${r.id}"]`):id==='corridor'?map.querySelector('.guide-corridor'):map.querySelector('.guide-reception');
 if(!region)return;
 const bounds=map.getBoundingClientRect(),cell=region.getBoundingClientRect();
 const clamp=t=>Math.max(.1,Math.min(.9,t));
 let fx=.5,fy=.5;
 if(r){fx=clamp(r.x<0?(position.x+20)/17:(position.x-3)/17);fy=clamp((position.z-r.z+7)/14);}
 else if(id==='corridor'){fx=clamp((position.x+3)/6);fy=clamp((position.z+36)/42);}
 else{fx=clamp((position.x+20)/40);fy=clamp((position.z-5.5)/9);}
 dot.style.left=(cell.left-bounds.left-map.clientLeft+cell.width*fx)+'px';
 dot.style.top=(cell.top-bounds.top-map.clientTop+cell.height*fy)+'px';
 dot.setAttribute('aria-label',label);dot.title=label;
}
function selectGuideRoom(id){
 const r=rooms.find(room=>room.id===id),details=$('guide-details');
 document.querySelectorAll('[data-guide-room]').forEach(b=>{const active=b.dataset.guideRoom===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 if(r){
   details.innerHTML=`<figure class="guide-preview-frame"><canvas id="guide-preview" width="640" height="360" role="img" aria-label="${esc(r.name)} interior preview"></canvas><figcaption>Inside the studio · room preview</figcaption></figure><span class="guide-detail-stamp" id="guide-detail-stamp" data-room="${esc(r.id)}" hidden>✓ Visited</span><p class="guide-kicker">${esc(r.kicker)}</p><h3>${esc(r.name)}</h3><p>${esc(r.description||'')}</p><p>${esc(r.intro)}</p>${r.reserved?'<p>Reserved room · theme and content pending confirmation.</p>':list(r.services||[])}<button class="panel-action" id="guide-go">Go to room</button>`;
 }else{
   details.innerHTML='<figure class="guide-preview-frame"><canvas id="guide-preview" width="640" height="360" role="img" aria-label="Reception interior preview"></canvas><figcaption>Your visit starts here</figcaption></figure><h3>Reception</h3><p>Welcome to Sivan Films. Select a room on the map to explore its services and plan your visit.</p><button class="panel-action" id="guide-go">Go to reception</button>';
 }
 details.scrollTop=0;drawGuidePreview(r);updateGuidePassport();
 $('guide-go').onclick=()=>{if(r)goRoom(r.id);else walkToRoom(0,10,0);if(roomWalk)closeStudioGuide();};
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeStudioGuide();roomWalk=null;}});

function createActor(x,z,role,rot=0){
 const humanTemplate=role==='reception'?(receptionTemplate||actorTemplate):role==='assistant'?(crewTemplate||actorTemplate):role==='performer'?actorTemplate:crewTemplate;
 if(humanTemplate?.userData?.studioHuman){
  const actor=createStudioHuman(humanTemplate,role);actor.position.set(x,z>20?.08:0,z);actor.rotation.y=rot;office.add(actor);
  const data={actor,role,x,z,bones:{},completeHuman:true};actors.push(data);return data;
 }
 if(['camera','director','light'].includes(role)){
  const actor=createCameraman(role);actor.position.set(x,z>20?.08:0,z);actor.rotation.y=rot;office.add(actor);
  const data={actor,role,x,z,bones:{},completeHuman:true};actors.push(data);return data;
 }
 const template=role==='reception'?(receptionTemplate||actorTemplate):['performer','assistant'].includes(role)?actorTemplate:crewTemplate;if(!template)return null;
 const actor=cloneRig(template.scene),mixer=new THREE.AnimationMixer(actor);
 const idle=template.animations.find(c=>/^idle$/i.test(c.name));
 if(idle){const action=mixer.clipAction(idle);action.play();mixer.update(.3);action.paused=true;}
 else{const tp=template.animations.find(c=>/tpose/i.test(c.name));if(tp){mixer.clipAction(tp).play();mixer.update(.001);}for(const n of ['LeftArm','RightArm']){const arm=findBone(actor,n);if(arm)arm.rotateX(1.3);}}
 actor.updateMatrixWorld(true);const bound=new THREE.Box3().setFromObject(actor),factor=(role==='director'?1.82:1.75)/(bound.max.y-bound.min.y);actor.scale.multiplyScalar(factor);actor.position.set(x,-bound.min.y*factor,z);actor.rotation.y=rot;
 actor.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.roughness=.85;o.material.metalness=0;}}});office.add(actor);
 const bones={};for(const n of ['LeftArm','RightArm','LeftForeArm','RightForeArm','Head','Spine','LeftUpLeg','RightUpLeg','Hips']){const bone=findBone(actor,n);if(bone)bones[n]={bone,base:bone.quaternion.clone()};}
 const data={actor,mixer,bones,role,x,z,completeHuman:true};actors.push(data);return data;
}

function animateActors(t){
 const waveElapsed=greetingUntil>0?8-(greetingUntil-performance.now())/1000:-1;
 for(const data of actors){
  data.motion??=createHumanMotion(data.actor,data.role);
  updateHumanMotion(data.motion,t,{reducedMotion:reduced,waveElapsed:data===receptionist&&entered&&mode==='office'&&!vr.active()?waveElapsed:-1});
 }
}

const greetingAnchor=new THREE.Vector3(),greetingView=new THREE.Vector3();
let greetingEntryArmed=true,greetingUntil=0,greetingSpoken=false,greetingVoiceReady=false,greetingUtterance=null;
const greetingSpeech='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window?window.speechSynthesis:null;
function allowGreetingVoice(event){if(event.isTrusted){greetingVoiceReady=true;greetingSpeech?.getVoices();}}
document.addEventListener('pointerdown',allowGreetingVoice,{passive:true});
document.addEventListener('keydown',allowGreetingVoice);
function stopGreetingVoice(){if(greetingUtterance){greetingSpeech?.cancel();greetingUtterance=null;}}
function speakReceptionGreeting(){
 if(!greetingSpeech||!greetingVoiceReady||greetingSpoken||document.hidden)return;
 greetingSpoken=true;
 const utterance=new SpeechSynthesisUtterance('Welcome to Sivan Films');
 const voices=greetingSpeech.getVoices();
 const voice=voices.find(v=>/^en[-_]IN$/i.test(v.lang))||voices.find(v=>/^en[-_]/i.test(v.lang));
 if(voice)utterance.voice=voice;
 utterance.lang=voice?.lang||'en-IN';utterance.rate=.9;utterance.pitch=1;utterance.volume=1;
 utterance.onend=utterance.onerror=()=>{if(greetingUtterance===utterance)greetingUtterance=null;};
 greetingUtterance=utterance;
 greetingSpeech.speak(utterance);
}
addEventListener('pagehide',stopGreetingVoice);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopGreetingVoice();});
$('reception-greeting-close').onclick=()=>{greetingUntil=0;$('reception-greeting').hidden=true;stopGreetingVoice();};
function updateReceptionGreeting(){
 const bubble=$('reception-greeting');
 if(!bubble)return;
 if(!entered||mode!=='office'){bubble.hidden=true;stopGreetingVoice();return;}
 // The open entrance is at z=14.3. Re-arm only after returning outside.
 if(position.z>15.3){greetingEntryArmed=true;greetingUntil=0;greetingSpoken=false;}
 if(greetingEntryArmed&&position.z<=14.3){
   greetingEntryArmed=false;
   if(position.z>5.5&&Math.abs(position.x)<20){greetingUntil=performance.now()+8000;greetingSpoken=false;}
 }
 if(performance.now()>=greetingUntil){bubble.hidden=true;stopGreetingVoice();return;}
 if($('panel').open||teleporting||document.hidden){bubble.hidden=true;stopGreetingVoice();return;}
 bubble.hidden=false;
 speakReceptionGreeting();
 // Keep the greeting visible at entry even when the receptionist is off screen.
 if(!receptionist){bubble.style.left='50%';bubble.style.top='35%';return;}
 greetingAnchor.set(receptionist.x,2.15,receptionist.z);
 camera.updateMatrixWorld();
 greetingView.copy(greetingAnchor).applyMatrix4(camera.matrixWorldInverse);
 greetingAnchor.project(camera);
 const visible=greetingView.z<0&&Math.abs(greetingAnchor.x)<.95&&greetingAnchor.y>-.8&&greetingAnchor.y<.9&&greetingAnchor.z<1;
 if(!visible){bubble.style.left='50%';bubble.style.top='35%';return;}
 if(visible){
   const margin=Math.min(innerWidth/2,bubble.offsetWidth/2+16);
   const x=Math.max(margin,Math.min(innerWidth-margin,(greetingAnchor.x+1)*innerWidth/2));
   bubble.style.left=x+'px';
   bubble.style.top=Math.max(bubble.offsetHeight+35,(1-greetingAnchor.y)*innerHeight/2)+'px';
 }
}


function collision(x,z){if(mode==='office'){if(x<-25||x>25||z<-36||z>43)return true;return[...walls,...propColliders].some(b=>x>b.minX-.22&&x<b.maxX+.22&&z>b.minZ-.22&&z<b.maxZ+.22);}if(x<-17||x>17||z<-12.5||z>26)return true;return jewelleryColliders.some(b=>x>b.minX-.22&&x<b.maxX+.22&&z>b.minZ-.22&&z<b.maxZ+.22);}
function move(dx,dz){let nx=position.x+dx,nz=position.z+dz;if(!collision(nx,position.z))position.x=nx;if(!collision(position.x,nz))position.z=nz;}
// Shareable rooms and per-history-entry camera state keep enquiry returns in place.
const roomAliases={metaverse:'meta','ad-film':'ad','media-planning':'media'};
function roomURL(id){const u=new URL(location.href);u.searchParams.set('room',id);u.hash='';return u;}
function rememberView(){if(!entered)return;const view={x:position.x,z:position.z,yaw,pitch,mode,room:detectRoom()};history.replaceState({...history.state,studioView:view},'',roomURL(view.room));}
addEventListener('pagehide',rememberView);
document.addEventListener('click',e=>{if(e.target.closest('a[href*="contact.html"]'))rememberView();},true);
async function copyRoomLink(id){const link=roomURL(id);link.searchParams.delete('preview');const u=link.href;try{await navigator.clipboard.writeText(u);toast('Room link copied. Share it with your client.');}catch{prompt('Copy this room link',u);}}
function detectRoom(){if(mode==='jewellery')return'jewellery';if(position.z>14.5)return'outside';if(position.z>5.5)return'reception';if(Math.abs(position.x)<3)return'corridor';let r=rooms.find(r=>Math.sign(r.x)===Math.sign(position.x)&&Math.abs(r.z-position.z)<7);return r?.id||'corridor';}
function updateLocation(){let next=detectRoom();recordRoomVisit(next);if(next===current&&entered)return;current=next;if(entered&&next==='contact'){roomWalk=null;contactLounge();}if(entered)rememberView();const r=rooms.find(r=>r.id===current),meta=r||{n:current==='outside'?'00':'SF',name:current==='outside'?'The exterior':current==='jewellery'?'Sivan Jewellery':current==='corridor'?'The studio corridor':'Reception',description:current==='outside'?'A garden. A camera. A new perspective.':current==='jewellery'?'The original showroom, restored for your browser.':current==='corridor'?'Six doors. A different perspective behind each one.':'Advertising-led. Creatively driven. Since 2003.'};$('location-num').textContent=meta.n+' / '+meta.name.toUpperCase();$('location-title').textContent=r?r.name:meta.name;$('location-copy').textContent=meta.description;document.querySelectorAll('#map-svg .room').forEach(el=>el.classList.toggle('active',el.dataset.room===current));}
async function teleport(x,z,ry=0){if(enquirySession)leaveEnquiry(true);roomWalk=null;if(teleporting)return;teleporting=true;$('transition').classList.add('active');await new Promise(r=>setTimeout(r,reduced?0:170));if(mode==='jewellery'){mode='office';office.visible=true;jewellery.visible=false;$('jewellery-back').hidden=true;scene.background.set('#87CEEB');scene.fog=new THREE.Fog('#87CEEB',65,145);$('mini-map').hidden=false;}
 position.set(x,1.67,z);yaw=ry;pitch=0;keys.clear();updateLocation();$('transition').classList.remove('active');teleporting=false;}
// Plan on the same collision map used by manual walking, including furniture.
function clearWalkSegment(a,b){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05));
 for(let i=1;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   // Leave a small safety margin around corners between planning samples.
   if(collision(x,z)||collision(x-.04,z-.04)||collision(x+.04,z-.04)||collision(x-.04,z+.04)||collision(x+.04,z+.04))return false;
 }
 return true;
}
function planRoomWalk(start,target){
 const step=.5,minX=-24,minZ=-35.5,width=97,height=156,total=width*height;
 const point=i=>({x:minX+(i%width)*step,z:minZ+Math.floor(i/width)*step});
 const nearest=(p,needsSegment)=>{
   let best=-1,score=Infinity;
   for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){
     const x=Math.round((p.x-minX)/step)+dx,z=Math.round((p.z-minZ)/step)+dz;
     if(x<0||x>=width||z<0||z>=height)continue;
     const i=z*width+x,q=point(i),d=Math.hypot(q.x-p.x,q.z-p.z);
     if(d<score&&!collision(q.x,q.z)&&(!needsSegment||clearWalkSegment(p,q))){best=i;score=d;}
   }
   return best;
 };
 const first=nearest(start,true),last=nearest(target,false);if(first<0||last<0)return null;
 const parents=new Int32Array(total).fill(-1),queue=new Int32Array(total),blocked=new Int8Array(total);
 let head=0,tail=0;queue[tail++]=first;parents[first]=first;
 while(head<tail&&parents[last]===-1){
   const i=queue[head++],col=i%width,row=Math.floor(i/width);
   for(const [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1]]){
     if(col+dx<0||col+dx>=width||row+dz<0||row+dz>=height)continue;
     const n=i+dx+dz*width;if(parents[n]!==-1||blocked[n])continue;
     if(!clearWalkSegment(point(i),point(n))){blocked[n]=collision(point(n).x,point(n).z)?1:0;continue;}
     parents[n]=i;queue[tail++]=n;
   }
 }
 if(parents[last]===-1)return null;
 const path=[];for(let i=last;;i=parents[i]){path.push(point(i));if(i===first)break;}path.reverse();
 // Remove unnecessary grid corners where the full line is walkable.
 const route=[];let anchor=start,index=0;
 while(index<path.length){let next=index;while(next+1<path.length&&clearWalkSegment(anchor,path[next+1]))next++;route.push(path[next]);anchor=path[next];index=next+1;}
 if(!collision(target.x,target.z)&&clearWalkSegment(anchor,target))route.push(target);
 return route;
}
function walkToRoom(x,z,finalYaw=0){
 if(enquirySession)leaveEnquiry(true);
 if(teleporting)return;
 if(mode!=='office'){toast('Return to the studio before starting a guided walk.');return;}
 const path=planRoomWalk({x:position.x,z:position.z},{x,z});
 if(!path){toast('No clear walking route found. Move into an open area and try again.');return;}
 keys.clear();touchMove.x=touchMove.y=0;
 roomWalk={path,index:0,speed:0,finalYaw};
 toast('Walking to destination · use arrow keys or WASD to take control');
}
function updateRoomWalk(dt){
 if(!roomWalk||$('panel').open||teleporting)return;
 if(keys.size||Math.abs(touchMove.x)+Math.abs(touchMove.y)>.05){roomWalk=null;return;}
 const walk=roomWalk,goal=walk.path[walk.index];
 if(!goal){const angle=Math.atan2(Math.sin(walk.finalYaw-yaw),Math.cos(walk.finalYaw-yaw));yaw+=angle*(1-Math.exp(-5*dt));if(Math.abs(angle)<.015){roomWalk=null;rememberView();}return;}
 const dx=goal.x-position.x,dz=goal.z-position.z,distance=Math.hypot(dx,dz);
 if(distance<.000001){walk.index++;return;}
 walk.speed+=(3.4-walk.speed)*(1-Math.exp(-3*dt));
 const amount=Math.min(distance,walk.speed*dt),next={x:position.x+dx/distance*amount,z:position.z+dz/distance*amount};
 if(!clearWalkSegment(position,next)){roomWalk=null;toast('Walking stopped. Use the arrow keys to continue.');return;}
 position.x=next.x;position.z=next.z;
 const targetYaw=Math.atan2(-dx,-dz),angle=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
 yaw+=angle*(1-Math.exp(-5*dt));pitch+=(0-pitch)*(1-Math.exp(-4*dt));
}
function goRoom(id){const r=rooms.find(r=>r.id===id);if(!r)return;if(!entered)enter(false);if($('panel').open)$('panel').close();walkToRoom(r.spawnX??r.x,r.z+3,r.yaw||0);}
async function loadJewellery(){roomWalk=null;if(jewelleryLoading){toast('The showroom is still loading…');return;}if(!entered)enter(false);$('panel').close();if(!jewelleryLoaded){jewelleryLoading=true;toast('Opening the original Sivan Jewellery showroom…');try{let loader=new GLTFLoader();let [gltf,layout]=await Promise.all([loader.loadAsync('./assets/sivan-jewellery.glb'),fetch('./assets/jewellery-layout.json').then(r=>{if(!r.ok)throw Error('layout');return r.json();})]);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});jewellery.add(gltf.scene);jewelleryColliders=layout.colliders.filter(c=>{const bottom=c.center[1]-c.size[1]/2,top=c.center[1]+c.size[1]/2;return top>.6&&bottom<2.0;}).map(c=>({minX:c.center[0]-c.size[0]/2,maxX:c.center[0]+c.size[0]/2,minZ:-c.center[2]-c.size[2]/2,maxZ:-c.center[2]+c.size[2]/2}));for(let x of[-10,0,10]){let l=new THREE.PointLight('#fff0cf',35,18,2);l.position.set(x,3.5,-7);jewellery.add(l);}let l=new THREE.PointLight('#fff1dc',30,20,2);l.position.set(0,3,3);jewellery.add(l);jewelleryLoaded=true;}catch(e){issues.push('Jewellery showroom: '+e.message);toast('The showroom could not load. Please retry from the Metaverse Room.');jewelleryLoading=false;return;}jewelleryLoading=false;}
 $('transition').classList.add('active');setTimeout(()=>{mode='jewellery';office.visible=false;jewellery.visible=true;position.set(0,1.67,5.7);yaw=0;pitch=0;$('jewellery-back').hidden=false;$('mini-map').hidden=true;scene.background.set('#cfdae0');scene.fog=new THREE.Fog('#cfdae0',65,130);updateLocation();$('transition').classList.remove('active');toast('Sivan Jewellery · walk forward to explore. Return using the top-right button.');},170);}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function panel(kicker,html){$('panel').classList.toggle('contact-popup',kicker==='06 / CONTACT US'||kicker==='CONTACT / SIVAN FILMS');keys.clear();touchMove.x=touchMove.y=0;$('panel-kicker').textContent=kicker;$('service-content').innerHTML=html;if(!$('panel').open)$('panel').showModal();$('service-content').focus();}
const list=items=>'<ul class="service-list">'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';
function enquire(service='General enquiry'){panel('LET’S CREATE SOMETHING',`<p class="intro-line">SIVAN FILMS · SOUTH INDIA</p><h2>Your next story<br>starts here.</h2><p>Tell us a little about your project. Continue to WhatsApp to send your enquiry directly to Sivan Films.</p><form id="enquiry-form"><label class="field">Your name<input name="name" required maxlength="100" autocomplete="name" placeholder="Your name"></label><label class="field">Company / organisation<input name="company" maxlength="140" autocomplete="organization" placeholder="Company name"></label><label class="field">Required service<select name="service">${['General enquiry',...rooms.filter(r=>!r.reserved&&r.id!=='about'&&r.id!=='contact').map(r=>r.name),...additional.map(s=>s.title)].map(s=>`<option ${s===service?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label class="field">City / location<input name="city" maxlength="100" placeholder="Where is your project?"></label><label class="field">Project requirements<textarea name="details" required maxlength="2000" rows="4" placeholder="What would you like to create? Include your preferred timeline."></textarea></label><button class="panel-action" type="submit">Continue to WhatsApp <span>↗</span></button></form><div class="contact-grid"><a href="tel:${esc(contact.phone)}">Call ${esc(contact.phone)} ↗</a><a href="mailto:${esc(contact.email)}">${esc(contact.email)} ↗</a></div><p>${esc(contact.locations)}<br>Project quotations depend on scope and production requirements.</p>`);$('enquiry-form').onsubmit=e=>{e.preventDefault();let d=new FormData(e.currentTarget),text=`Hello Sivan Films!\nName: ${d.get('name')}\nCompany: ${d.get('company')}\nService: ${d.get('service')}\nLocation: ${d.get('city')}\nRequirement: ${d.get('details')}`;window.open('https://wa.me/'+phoneDigits+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');};}
function showRoom(r){if(r.id==='contact'){contactLounge();return;}panel('EXPLORE / '+r.n,`<p class="intro-line">${esc(r.kicker)}</p><h2>${esc(r.name)}</h2><p>${esc(r.intro)}</p>${r.reserved?'<p class="notice">Reserved room · theme and content pending confirmation.</p>':list(r.services)}${r.id==='media'?channelGallery():''}${r.id==='meta'?'<button class="panel-action" id="open-jewel-panel">Explore virtual Sivan Jewellery <span>↗</span></button>':''}<button class="panel-action" id="share-room">Copy direct room link <span>↗</span></button><button class="panel-action" id="walk-room">Walk into this room <span>↗</span></button>${r.id==='about'?'<button class="panel-action" id="read-about">Read about Sivan Films <span>↗</span></button>':''}${!r.reserved?'<button class="panel-action" id="enquire-room">Discuss a project <span>↗</span></button>':''}`);$('share-room').onclick=()=>copyRoomLink(r.id);$('walk-room').onclick=()=>goRoom(r.id);if($('read-about'))$('read-about').onclick=about;if($('enquire-room'))$('enquire-room').onclick=()=>enquire(r.name);if($('open-jewel-panel'))$('open-jewel-panel').onclick=loadJewellery;}
function directory(){panel('THE STUDIO / ROOM DIRECTORY',`<p class="intro-line">SIX ROOMS. A WORLD OF POSSIBILITIES.</p><h2>Choose your<br>next perspective.</h2><p>Walk through the studio, or go directly to a room.</p><div class="room-grid">${rooms.map(r=>`<button class="room-tile ${r.reserved?'reserved':''}" data-room="${r.id}"><small>${r.n} / ${r.reserved?'RESERVED':'EXPLORE'}</small><i>↗</i><strong>${esc(r.name)}</strong><span>${esc(r.short)}</span></button>`).join('')}</div><button class="panel-action" id="dir-reception">Return to reception <span>↗</span></button>`);document.querySelectorAll('.room-tile').forEach(b=>b.onclick=()=>goRoom(b.dataset.room));$('dir-reception').onclick=()=>{$('panel').close();if(!entered)enter(false);teleport(0,10,0);};}
function channelGallery(){return '<div class="channel-grid">'+brandStations.map(b=>`<article><img src="${esc(b.logo)}" alt="${esc(b.name)} logo"><h3>${esc(b.name)}</h3><a href="./contact.html?channel=${encodeURIComponent(b.name)}">Need to advertise here? ↗</a></article>`).join('')+'</div>';}
function catalog(){panel('SERVICES / SIVAN FILMS',`<p class="intro-line">ADVERTISING COMES FIRST.</p><h2>Creative thinking.<br>Complete experiences.</h2><p>From an advertising concept to an immersive brand experience, explore the capabilities of Sivan Films.</p><div class="room-grid">${rooms.filter(r=>!r.reserved&&r.id!=='about'&&r.id!=='contact').map(r=>`<button class="room-tile" data-detail="${r.id}"><small>${r.n} / SERVICES</small><i>↗</i><strong>${esc(r.name)}</strong><span>${esc(r.short)}</span></button>`).join('')}</div><h3>Television advertising</h3>${channelGallery()}${additional.map((s,i)=>`<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${list(s.items)}`).join('')}<h3>Industries we serve</h3>${list(industries)}<button id="catalog-enquire" class="panel-action">Discuss your requirement <span>↗</span></button>`);document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showRoom(rooms.find(r=>r.id===b.dataset.detail)));$('catalog-enquire').onclick=()=>enquire();}
function about(){const r=rooms.find(r=>r.id==='about');panel('ABOUT / SIVAN FILMS',`<p class="intro-line">ESTABLISHED 2003 · DIRECTOR ${esc(contact.director)}</p><h2>${esc(r.name)}</h2><p>${esc(r.intro)}</p><h3>${esc(contact.locations)}</h3>${list(r.services)}<button class="panel-action" id="about-contact">Start a conversation <span>↗</span></button><button class="panel-action" id="about-directory">Explore the studio <span>↗</span></button>`);$('about-contact').onclick=()=>enquire();$('about-directory').onclick=directory;}

function extraPanel(s){panel('MORE / SIVAN FILMS',`<h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>${list(s.items)}<button class="panel-action" id="extra-enquire">Discuss this service <span>↗</span></button>`);$('extra-enquire').onclick=()=>enquire(s.title);}
function industryPanel(){panel('INDUSTRIES / SIVAN FILMS','<h2>Different industries.<br>Individual stories.</h2><p>Creative communication and immersive experiences shaped around your business.</p>'+list(industries)+'<button class="panel-action" id="industry-enquire">Tell us about your business ↗</button>');$('industry-enquire').onclick=()=>enquire();}
function brandPanel(b){panel('MEDIA PLANNING / CHANNEL STATION',`<h2>${esc(b.name)}</h2><p>${esc(b.status)}. This is a configurable media-channel station. No booking rate or confirmed affiliation is represented.</p><p>Discuss your audience, advertising objective and preferred channels with Sivan Films.</p><button class="panel-action" id="brand-enquire">Discuss media planning <span>↗</span></button>`);$('brand-enquire').onclick=()=>enquire('Media Planning');}
function help(){panel('YOUR GUIDE / NAVIGATION',`<h2>Make yourself<br>at home.</h2>${list(['Walk: W A S D or arrow keys. Hold Shift for a quicker walk.','Look: drag the 3D scene. On mobile, drag the right side.','Mobile movement: use the round thumb control.','Explore: click a floor marker, wall display or demo station.','Jump between rooms: use the room directory or floor map.','Return: use the Reception button. In Jewellery, use Back to Metaverse.','Close any panel with Escape.'])}<h3>Your preferences</h3><label class="settings-row">Reduced motion<input id="reduce-motion" type="checkbox" ${reduced?'checked':''}></label><label class="settings-row">Rendering quality<select id="quality"><option value="auto">Adaptive</option><option value="low">Low / mobile</option><option value="high">High</option></select></label><p class="notice">Original ambient instrumental music plays after you enter with music. Use the Music button to mute or resume it. A browser voice says “Welcome to Sivan Films” when you enter through the studio entrance. Voice availability depends on your browser and device.</p><p class="notice">Human models: Thanh and TranThiNgocTham from hmthanh/3d-human-model, with custom studio poses and crew props. Reception uses Michelle from the Three.js sample collection (Mixamo). Original models and procedural crew are retained as loading fallbacks.</p><p>${issues.length?esc(issues.join(' · ')):'All initial scene assets loaded.'}</p>`);$('reduce-motion').onchange=e=>{reduced=e.target.checked;};$('quality').onchange=e=>{qualityAuto=e.target.value==='auto';let low=e.target.value==='low';renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,e.target.value==='high'?2:mobile?1.3:1.6));renderer.shadowMap.enabled=!low&&!mobile;renderer.setSize(innerWidth,innerHeight);};}
function setMusic(enabled){sound=enabled;const music=$('background-music');music.volume=.26;$('audio-btn').textContent=sound?'Mute music':'Play music';$('audio-btn').setAttribute('aria-pressed',String(sound));$('audio-btn').setAttribute('aria-label',sound?'Mute background music':'Play background music');if(sound){const playing=music.play();playing?.catch(()=>{setMusic(false);toast('Tap Play music to enable background music.');});}else music.pause();}
function toggleSound(){setMusic(!sound);}
function enter(withSound){entered=true;document.body.classList.add('exploring');$('welcome').hidden=true;for(let id of['location','bottom-bar','mini-map','scene-top','move-hint','guide-open'])$(id).hidden=false;$('credit').hidden=false;if(mobile)$('touch-controls').hidden=false;if(withSound!==sound)toggleSound();toast(mobile?'Use the left thumb control to walk. Drag the scene to look around.':'WASD / arrows to walk · drag to look · click a floor marker');updateLocation();}

function initMap(){let s=$('map-svg');s.innerHTML=`<rect x="5" y="4" width="150" height="183" rx="3" fill="#f4f1e8" stroke="#b8c0ab"/><rect x="68" y="8" width="24" height="150" fill="#d9dece"/>${rooms.map((r,i)=>{let x=r.x<0?10:96,y=14+(2-Math.floor(i/2))*46;return`<g><rect class="room" data-room="${r.id}" x="${x}" y="${y}" width="54" height="38" rx="2"/><text x="${x+6}" y="${y+14}">${r.n}</text><text x="${x+6}" y="${y+27}">${r.id==='contact'?'Contact':r.id==='about'?'About':r.id==='animation'?'Animation':r.id==='meta'?'Metaverse':r.id==='media'?'Media':'AD Film'}</text></g>`;}).join('')}<rect class="room" data-room="reception" x="10" y="157" width="140" height="24" rx="2"/><text x="57" y="173">Reception</text><text x="58" y="203">GARDEN</text><circle id="map-player" cx="80" cy="200" r="3" fill="#a86f3d"/>`;
 s.querySelectorAll('.room').forEach(el=>el.onclick=()=>{if(!entered)enter(false);el.dataset.room==='reception'?teleport(0,10,0):goRoom(el.dataset.room);});}

// Input is limited to the scene; editable controls retain ordinary keyboard behaviour.
window.addEventListener('keydown',e=>{if($('panel').open||!entered||enquirySession||e.target.closest?.('input,textarea,select,[contenteditable]'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touchMove.x=touchMove.y=0;});
let drag=null,dragDistance=0;renderer.domElement.addEventListener('pointerdown',e=>{if(enquirySession)return;roomWalk=null;drag={id:e.pointerId,x:e.clientX,y:e.clientY};pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);dragDistance=0;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{let rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);if(drag&&drag.id===e.pointerId){let dx=e.clientX-drag.x,dy=e.clientY-drag.y;dragDistance+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.0035;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-.8,.8);drag.x=e.clientX;drag.y=e.clientY;}});renderer.domElement.addEventListener('pointerup',e=>{if(enquirySession)return;if(dragDistance<9&&entered&&mode==='office'){ray.setFromCamera(pointer,camera);let hit=ray.intersectObjects(interactive,false).find(h=>h.distance<30);if(hit)hit.object.userData.action?.();}drag=null;});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
let joy=$('joystick');function joyUpdate(e){let r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,28/(len||1));dx*=scale;dy*=scale;touchMove.x=dx/28;touchMove.y=-dy/28;$('joystick-knob').style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{joy.setPointerCapture(e.pointerId);joyUpdate(e);});joy.addEventListener('pointermove',e=>{if(e.buttons)joyUpdate(e);});for(let event of['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,()=>{touchMove.x=touchMove.y=0;$('joystick-knob').style.transform='';});
$('enter-sound').onclick=()=>enter(true);$('enter-silent').onclick=()=>enter(false);$('services-btn').onclick=catalog;$('contact-btn').onclick=showContacts;$('directory-btn').onclick=directory;$('rooms-bottom').onclick=directory;$('project-btn').onclick=()=>enquire();$('close-panel').onclick=()=>$('panel').close();$('panel').addEventListener('click',e=>{if(e.target===$('panel')){let r=$('panel').getBoundingClientRect();if(e.clientX<r.left)$('panel').close();}});$('reception-btn').onclick=()=>mode==='office'?walkToRoom(0,10,0):teleport(0,10,0);$('audio-btn').onclick=toggleSound;$('fullscreen-btn').onclick=()=>{let p=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();p?.catch(()=>toast('Fullscreen is unavailable in this browser.'));};$('home').onclick=e=>{e.preventDefault();if(entered)teleport(2,31,0);};$('help-btn').onclick=help;$('room-details').onclick=()=>{if(current==='outside'||current==='reception')about();else if(current==='jewellery')toast('The restored Sivan Jewellery showroom · use Back to Metaverse to return.');else if(current==='corridor')directory();else showRoom(rooms.find(r=>r.id===current));};$('jewellery-back').onclick=()=>teleport(10,2,0);$('map-toggle').onclick=()=>{$('mini-map').classList.toggle('collapsed');$('map-toggle').textContent=$('mini-map').classList.contains('collapsed')?'+':'−';};document.querySelector('.skip').onclick=e=>{e.preventDefault();catalog();};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(!renderer.xr.isPresenting)renderer.setSize(innerWidth,innerHeight);});document.addEventListener('visibilitychange',()=>{keys.clear();touchMove.x=touchMove.y=0;clock.getDelta();});
// Interior occupancy lighting fades independently of the outdoor daylight.
const studioLights=[],studioSurfaces=[];
const roomLighting=new Map(rooms.map(room=>[room.id,{room,level:0,occupied:false}]));
function lightingZone(point){
 if(point.z>5.7||Math.abs(point.x)<3.2)return null;
 return rooms.find(room=>Math.sign(room.x)===Math.sign(point.x)&&Math.abs(room.z-point.z)<7)?.id||null;
}
let studioLightLevel=0,studioOccupied=false;
function prepareStudioLighting(){
 const materials=new Map(),worldPosition=new THREE.Vector3();
 office.updateMatrixWorld(true);
 office.traverse(object=>{
  object.getWorldPosition(worldPosition);
  if(worldPosition.z>14.3||Math.abs(worldPosition.x)>20.1)return;
  const zone=lightingZone(worldPosition);
  if(object.isLight){studioLights.push({light:object,intensity:object.intensity,zone});return;}
  if(!object.isMesh||!object.material)return;
  const copyMaterial=original=>{
   if(!original.color||original.map?.isVideoTexture||original.transparent)return original;
   if(!materials.has(zone))materials.set(zone,new Map());
   const zoneMaterials=materials.get(zone);
   if(zoneMaterials.has(original))return zoneMaterials.get(original);
   const material=original.clone();
   material.onBeforeCompile=original.onBeforeCompile;material.customProgramCacheKey=original.customProgramCacheKey;
   zoneMaterials.set(original,material);
   studioSurfaces.push({material,color:original.color.clone(),environment:original.envMapIntensity,zone});
   return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(copyMaterial):copyMaterial(object.material);
 });
 updateStudioLighting(0,true);
}
function updateStudioLighting(dt,initial=false){
 if(mode==='office'){
  if(position.z<14.1&&Math.abs(position.x)<20)studioOccupied=true;
  else if(position.z>14.7||Math.abs(position.x)>20.5)studioOccupied=false;
 }else studioOccupied=false;
 const target=studioOccupied?1:0;
 studioLightLevel=initial?target:THREE.MathUtils.lerp(studioLightLevel,target,1-Math.exp(-2.8*dt));
 for(const state of roomLighting.values()){
  const room=state.room,sameSide=Math.sign(position.x)===Math.sign(room.x);
  if(mode!=='office'||!studioOccupied||!sameSide||Math.abs(position.x)<3.05||Math.abs(position.z-room.z)>7)state.occupied=false;
  else if(Math.abs(position.x)>3.4&&Math.abs(position.z-room.z)<6.7)state.occupied=true;
  const target=state.occupied?1:0;
  state.level=initial?target:THREE.MathUtils.lerp(state.level,target,1-Math.exp(-2.8*dt));
 }
 const levelFor=zone=>zone?roomLighting.get(zone).level:studioLightLevel;
 for(const {light,intensity,zone} of studioLights)light.intensity=intensity*(.04+.96*levelFor(zone));
 for(const {material,color,environment,zone} of studioSurfaces){
  const level=levelFor(zone);
  material.color.copy(color).multiplyScalar(.48+.52*level);
  if(environment!==undefined)material.envMapIntensity=environment*(.35+.65*level);
 }
}
function render(){if(document.hidden&&!renderer.xr.isPresenting)return;let rawDt=clock.getDelta(),dt=Math.min(rawDt,.045),t=clock.elapsedTime;frame++;smoothedFrameTime=smoothedFrameTime*.97+Math.min(rawDt,.2)*.03;if(!renderer.xr.isPresenting&&frame%240===0&&qualityAuto&&smoothedFrameTime>.035&&renderer.getPixelRatio()>1){renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-.2));renderer.setSize(innerWidth,innerHeight);}
 if(!enquirySession&&!renderer.xr.isPresenting&&entered&&!$('panel').open&&!teleporting){let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touchMove.y,s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x;let len=Math.max(1,Math.hypot(f,s)),v=(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.2:2.5)*dt/len;move((-Math.sin(yaw)*f+Math.cos(yaw)*s)*v,(-Math.cos(yaw)*f-Math.sin(yaw)*s)*v);}
 updateRoomWalk(dt);updateSeatedEnquiry(dt);updateStudioLighting(dt);
 if(vr.active())vr.update(dt);else{camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}animateActors(t,dt);if(!vr.active())updateReceptionGreeting();
 guideOpenAmount=reduced?(guideOpening?1:0):THREE.MathUtils.damp(guideOpenAmount,guideOpening?1:0,8,dt);
 if(guideCover)guideCover.rotation.y=-guideOpenAmount*Math.PI*.85;
 if(guideLeaf)guideLeaf.rotation.y=-guideOpenAmount*Math.PI*.55;
 if(enquirySign){
  enquirySign.visible=!enquirySession;
  enquirySign.position.y=1.85+(reduced?0:Math.sin(t*2)*.1);
  // Keep the upright board facing the viewer from every side of the chair.
  const viewer=new THREE.Vector3();camera.getWorldPosition(viewer);
  enquirySign.rotation.y=Math.atan2(viewer.x-enquirySign.position.x,viewer.z-enquirySign.position.z);
  enquirySign.material.opacity=reduced?1:.68+.32*(Math.sin(t*3)+1)/2;
 }
 if(guideBook){guideBook.position.y=1.82+(reduced?0:Math.sin(t*2)*.12);}
 if(guideBeacon){const pulse=reduced?1:(Math.sin(t*4)+1)/2;guideBeacon.material.opacity=.3+pulse*.65;guideBeacon.scale.setScalar(1+pulse*.1);}
 for(let h of hotspots){let s=reduced?1:1+Math.sin(t*2+h.position.z)*.04;h.scale.setScalar(s);}
 for(let o of billboardObjects){if(!reduced){o.rotation.x=t*.35;o.rotation.y=t*.5;o.position.z=-4.95+Math.sin(t*.6)*.22;}}
 if(sculptLetters.length)sculptLetters.forEach(m=>m.scale.set(1,1,1));
 if(entered&&frame%6===0)updateGuideLocation();
 if(entered&&frame%12===0){updateLocation();const mp=$('map-player');if(mp){mp.setAttribute('cx',String(80+position.x*3.5));mp.setAttribute('cy',String(Math.max(6,Math.min(204,15+(position.z+36)*3.1))));}
 if(!vr.active()&&!drag&&mode==='office'&&!$('panel').open){ray.setFromCamera(pointer,camera);let hit=ray.intersectObjects(interactive,false).find(h=>h.distance<18);$('interaction-hint').hidden=!hit;if(hit)$('interaction-hint').textContent=hit.object.userData.label+' ↗';renderer.domElement.style.cursor=hit?'pointer':'grab';}else $('interaction-hint').hidden=true;}
 renderer.render(scene,camera);
}
const vr=createStudioVR({renderer,scene,camera,rooms,button:$('vr-enter'),
 getPose:()=>({x:position.x,z:position.z,yaw}),
 setPose:(x,z,angle)=>{roomWalk=null;position.x=x;position.z=z;yaw=angle;},
 move,canWalk:clearWalkSegment,blocked:collision,
 prepare:()=>{if(!entered)enter(false);keys.clear();touchMove.x=touchMove.y=0;roomWalk=null;closeStudioGuide();if($('panel').open)$('panel').close();},
 visit:async id=>{const r=rooms.find(r=>r.id===id);await teleport(r?(r.spawnX??r.x):0,r?r.z+3:id==='outside'?26:10,r?.yaw||0);},
 interactive:()=>interactive,
 interact:async object=>{await renderer.xr.getSession().end();object.userData.action?.();},notify:toast
});
async function init(){try{buildOffice();initMap();progress(58,'Preparing the skeletal character rigs…');try{const logo=await new THREE.TextureLoader().loadAsync(contact.logo);logo.colorSpace=THREE.SRGBColorSpace;for(const p of [[8.05,2.3,28.18,2.4,1.3],[-7,2.65,6.18,3.7,2]]){const m=mesh(new THREE.PlaneGeometry(p[3],p[4]),companyLogoMaterial(logo),p[0],p[1],p[2]);const ar=logo.image.width/logo.image.height;const fw=Math.min(p[3],p[4]*ar),fh=fw/ar;m.geometry.dispose();m.geometry=new THREE.PlaneGeometry(fw,fh);m.userData={label:'About Sivan Films',action:about};interactive.push(m);}}catch(e){issues.push('Company logo texture failed to load');}try{[actorTemplate,crewTemplate,receptionTemplate]=await Promise.all([
 new GLTFLoader().loadAsync('./assets/tham-human.glb').then(model=>{model.userData={studioHuman:true};return model;}).catch(async error=>{issues.push('Reception model fallback: '+error.message);return new GLTFLoader().loadAsync('./assets/Michelle.glb');}),
 new GLTFLoader().loadAsync('./assets/thanh-human.glb').then(model=>{model.userData={studioHuman:true};return model;}).catch(error=>{issues.push('Crew model fallback: '+error.message);return null;}),
 new GLTFLoader().loadAsync('./assets/Michelle.glb').then(model=>{model.userData={studioHuman:true,modelSource:'threejs/Michelle'};return model;}).catch(error=>{issues.push('Reception character fallback: '+error.message);return null;})
 ]);createActor(-13,24,'director',Math.atan2(3.3,-2.2));createActor(-10.8,26.05,'camera',Math.PI);createActor(-9.7,21.8,'performer',.3);createActor(-14.3,23.7,'light',Math.PI);receptionist=createActor(-7,8.0,'reception',0);createActor(-14,2,'director',Math.atan2(4,-5.5));createActor(-12,1.55,'camera',Math.PI);createActor(-10,-3.5,'performer',.2);}catch(e){issues.push('Character model failed to load: '+e.message);}
 createEnquiryHost();prepareStudioLighting();progress(92,'Opening the studio…');renderer.setAnimationLoop(render);await new Promise(r=>requestAnimationFrame(r));progress(100,'Your studio is ready.');$('welcome').hidden=false;
 const requested=new URLSearchParams(location.search).get('room'),id=roomAliases[requested]||requested;
 const saved=history.state?.studioView;
 if(saved&&[saved.x,saved.z,saved.yaw,saved.pitch].every(Number.isFinite)){
   enter(false);if(saved.mode==='jewellery')await loadJewellery();else await teleport(saved.x,saved.z,saved.yaw);yaw=saved.yaw;pitch=saved.pitch;rememberView();
 }else if(id==='jewellery'||id==='reception'||rooms.some(r=>r.id===id)){
   // Position the camera before revealing the first frame of a shared room.
   if(id==='jewellery'){enter(false);await loadJewellery();}else{const r=rooms.find(r=>r.id===id);position.set(r?(r.spawnX??r.x):0,1.67,r?r.z+3:10);yaw=r?.yaw||0;pitch=0;enter(false);rememberView();}
 }
 $('loader').hidden=true;vr.enable();

 }catch(e){console.error(e);$('loading-label').textContent='The 3D view could not start. You can still explore our services.';let b=document.createElement('button');b.className='primary';b.textContent='Read our services';b.onclick=catalog;$('loader').appendChild(b);}}
initSeatedEnquiry();init();

}
try{boot();}catch(error){console.error(error);document.getElementById('loader').innerHTML=`<div class="loading-mark"><img src="./assets/sivan-films-logo.jpg" alt="Sivan Films"><span>THE LIVING STUDIO</span></div><p>Your browser could not start the 3D view.</p><a class="primary" href="./services.html">Explore our services ↗</a><p>Try a browser with WebGL enabled to enter the studio.</p>`;for(const id of ['services-btn','directory-btn','project-btn'])document.getElementById(id).onclick=()=>location.href='./services.html';}
