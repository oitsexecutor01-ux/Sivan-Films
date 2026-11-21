import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as Three from '../dist/assets/three.module.js';
import {GLTFLoader as RealGLTFLoader} from '../dist/assets/GLTFLoader.js';
import {FontLoader as RealFontLoader} from '../dist/assets/FontLoader.js';
import {TextGeometry} from '../dist/assets/TextGeometry.js';
import {clone as cloneRig} from '../dist/assets/SkeletonUtils.js';
import {rooms,additional,industries,brandStations,welcomeLine} from '../dist/content.js';
const require=createRequire(import.meta.url);const{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));
const base=new URL('../dist/',import.meta.url);
class GLTFLoader extends RealGLTFLoader{async loadAsync(path){const b=await fs.readFile(new URL(path,base));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}}
class FontLoader{load(path,ok,_progress,fail){fs.readFile(new URL(path,base),'utf8').then(s=>ok(new RealFontLoader().parse(JSON.parse(s)))).catch(fail);}}
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:true,textContent:'',innerHTML:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){return false}},appendChild(){},addEventListener(){},setAttribute(){},focus(){},querySelectorAll(){return[]},play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true},getContext(){return null},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:1440,height:900}},close(){this.open=false},showModal(){this.open=true}});return nodes.get(id);}
const doc={getElementById:node,createElement:t=>t==='canvas'?createCanvas(32,32):node('new-'+Math.random()),querySelector:node,querySelectorAll:()=>[],body:node('body'),documentElement:node('html'),addEventListener(){},hidden:false};
class Renderer{constructor(){this.domElement=node('canvas');this.shadowMap={};this.info={render:{}}}setSize(){}setPixelRatio(){}render(scene){scene.updateMatrixWorld(true)}}
class PMREM{fromScene(){return{texture:null}}}
const context={console,document:doc,window:{addEventListener(){},speechSynthesis:{speaking:false}},speechSynthesis:{speaking:false,cancel(){},getVoices(){return[]},speak(){}},matchMedia:()=>({matches:false}),innerWidth:1440,innerHeight:900,devicePixelRatio:1,location:{search:''},URLSearchParams,requestAnimationFrame:cb=>{if(cb.name!=='render')queueMicrotask(()=>cb(0));},setTimeout,clearTimeout,performance,fetch:async path=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL(path,base),'utf8'))}),THREE:{...Three,WebGLRenderer:Renderer,PMREMGenerator:PMREM,TextureLoader:class{load(path,ok,_p,fail){let t=new Three.Texture();fs.readFile(new URL(path,base)).then(loadImage).then(img=>{t.image=img;ok?.(t);}).catch(fail);return t;}async loadAsync(path){let t=new Three.Texture();t.image=await loadImage(await fs.readFile(new URL(path,base)));return t;}}},GLTFLoader,FontLoader,RoomEnvironment:Three.Group,TextGeometry,cloneRig,rooms,additional,industries,brandStations,welcomeLine};context.globalThis=context;
let source=(await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');source=source.replace('init();','globalThis.studio={scene,office,collision,actors,mascots,sculptLetters,goRoom,loadJewellery,teleport,getPosition:()=>position,getMode:()=>mode,updateLocation,setMusic,getSound:()=>sound};init();');
vm.runInNewContext(source,context,{filename:'app.js'});
const deadline=Date.now()+15000;while(node('welcome').hidden&&Date.now()<deadline)await new Promise(r=>setTimeout(r,30));
assert.equal(node('welcome').hidden,false,'scene init completes');
const s=context.studio;assert.ok(s);assert.equal(rooms.length,5);assert.equal(s.actors.length,8);assert.equal(s.mascots.length,0);assert.ok(!s.actors.some(a=>a.role==='sculpt'));assert.equal(rooms[4].id,'about');assert.equal(s.sculptLetters.length,9);let meshes=0,skinned=0,bones=0;s.office.traverse(o=>{if(o.isMesh)meshes++;if(o.isSkinnedMesh)skinned++;if(o.isBone)bones++;});assert.ok(skinned>=8);assert.ok(bones>100);assert.ok(s.actors.every(a=>a.completeHuman));
for(const r of rooms){assert.equal(s.collision(r.spawnX??r.x,r.z+3),false,r.name+' spawn must be clear');assert.equal(s.collision(Math.sign(r.x)*3,r.z),false,r.name+' door must be clear');assert.equal(s.collision(Math.sign(r.x)*3,r.z+4),true,r.name+' wall must collide');}
assert.equal(s.collision(3,-29),true,'removed sixth room has no doorway');
assert.equal(s.collision(-7,9),true,'reception desk collision');assert.equal(s.collision(-12,-3.5),true,'product plinth collision');assert.equal(s.collision(0,14.3),false,'front entrance open');
// Check all seating against its table and all parallel sign planes for overlap.
s.scene.updateMatrixWorld(true);
let seatCount=0;const displays=[];
s.office.traverse(o=>{if(o.userData.tableTarget){seatCount++;const target=o.userData.tableTarget;const facing=new Three.Vector3(0,0,1).applyQuaternion(o.quaternion);const toward=new Three.Vector3(target.x-o.position.x,0,target.z-o.position.z).normalize();assert.ok(facing.dot(toward)>.999,'chair faces table');}if(o.userData.wallDisplay)displays.push(o);});
assert.equal(seatCount,6);
for(let i=0;i<displays.length;i++)for(let j=i+1;j<displays.length;j++){
 const a=displays[i],b=displays[j],qa=a.getWorldQuaternion(new Three.Quaternion()),qb=b.getWorldQuaternion(new Three.Quaternion());
 const na=new Three.Vector3(0,0,1).applyQuaternion(qa),nb=new Three.Vector3(0,0,1).applyQuaternion(qb);
 if(na.dot(nb)<.999)continue;
 const delta=b.getWorldPosition(new Three.Vector3()).sub(a.getWorldPosition(new Three.Vector3()));if(Math.abs(delta.dot(na))>.3)continue;
 const ax=new Three.Vector3(1,0,0).applyQuaternion(qa),ay=new Three.Vector3(0,1,0).applyQuaternion(qa);
 const ap=a.geometry.parameters,bp=b.geometry.parameters;
 assert.ok(Math.abs(delta.dot(ax))>=(ap.width+bp.width)/2-.01||Math.abs(delta.dot(ay))>=(ap.height+bp.height)/2-.01,'wall posters overlap: '+a.userData.wallDisplay.title+' / '+b.userData.wallDisplay.title);
}
s.setMusic(true);assert.equal(s.getSound(),true);assert.equal(node('background-music').paused,false);s.setMusic(false);assert.equal(node('background-music').paused,true);
assert.ok(!source.includes('speechSynthesis.speak'),'no spoken welcome');
// Check actual character skin poses, including 1.75m scale and hand location.
const a=s.actors[0];s.scene.updateMatrixWorld(true);for(const actor of s.actors){const bounds=new Three.Box3().setFromObject(actor.actor);assert.ok(bounds.max.y<2.5&&bounds.max.y>1.2,'character height realistic: '+bounds.max.y);}const get=n=>{const b=a.bones[n].bone;return b.getWorldPosition(new Three.Vector3()).toArray().map(x=>+x.toFixed(3));};
await s.loadJewellery();const deadline2=Date.now()+1000;while(s.getMode()!=='jewellery'&&Date.now()<deadline2)await new Promise(r=>setTimeout(r,25));assert.equal(s.getMode(),'jewellery');assert.equal(s.collision(0,5.7),false,'jewellery spawn clear');for(const [name,x] of [['Gold',-10],['Silver',0],['Diamond',10]]){for(let z=0;z>=-4.5;z-=.1)assert.equal(s.collision(x,z),false,name+' entrance must be walkable at '+z.toFixed(1));}assert.equal(s.collision(-5,-3),true,'jewellery partition remains solid');assert.equal(s.collision(-12.6,-4.1),true,'jewellery display case remains solid');await s.teleport(10,2,0);assert.equal(s.getMode(),'office');assert.equal(s.getPosition().x,10);
for(const b of brandStations){const data=await fs.readFile(new URL(b.logo,base));assert.ok(data.length>100,b.name+' supplied logo exists');}assert.equal(brandStations.length,10);const contact=await fs.readFile(new URL('contact.html',base),'utf8');assert.ok(contact.includes("get('channel')"));
const out={passed:true,roomCount:rooms.length,officeMeshes:meshes,skinnedMeshes:skinned,bones,characters:s.actors.length,mascots:s.mascots.length,sculptureLetters:s.sculptLetters.length,characterPose:{leftArm:get('LeftArm'),leftForearm:get('LeftForeArm'),rightArm:get('RightArm'),rightForearm:get('RightForeArm')},checks:['All six chairs face their tables','Parallel wall displays do not overlap','Music play/mute controls and no speech','Scene initialisation','All five room spawns','All five open doorways','Sixth room removed and closed','Wall and furniture collisions','Eight production/reception characters; no sculptor or media mascots','Recovered jewellery GLB load','Jewellery entry and return','Gold, Silver and Diamond doorway traversal; walls and cases remain solid'],limits:['No WebGL rendering in this check','No physical mobile testing','No physical audio listening test']};await fs.writeFile(new URL('../CHECK-RESULTS.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
