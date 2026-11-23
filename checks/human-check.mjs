import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../frontend/public/assets/three.module.js';
const publicURL=new URL('../frontend/public/',import.meta.url);
const threeURL=new URL('assets/three.module.js',publicURL).href;
const modules=new Map();
async function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 let source=await readFile(url,'utf8');
 for(const match of [...source.matchAll(/^import\s[\s\S]*?from ['"]([^'"]+)['"]/gm)]){
  const specifier=match[1];
  const target=specifier==='three'?threeURL:await moduleURL(new URL(specifier,url));
  source=source.replace(match[0],match[0].replace(specifier,target));
 }
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
const {GLTFLoader}=await import(await moduleURL(new URL('assets/GLTFLoader.js',publicURL)));
const {createStudioHuman,humanBone,seatStudioHuman,createHumanMotion,updateHumanMotion}=await import(await moduleURL(new URL('studio-human.js',publicURL)));
async function model(name){
 const file=await readFile(new URL('assets/'+(name.endsWith('.glb')?name:name+'-human.glb'),publicURL));
 const jsonLength=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+jsonLength));
 // Geometry/rig checks need no image decoder. Browser QA covers original textures.
 delete json.images;delete json.textures;
 for(const material of json.materials){
  delete material.extensions;
  for(const key of Object.keys(material))if(key.endsWith('Texture'))delete material[key];
  for(const key of Object.keys(material.pbrMetallicRoughness||{}))if(key.endsWith('Texture'))delete material.pbrMetallicRoughness[key];
 }
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const binary=file.subarray(20+jsonLength),output=Buffer.alloc(20+padded.length+binary.length);
 file.copy(output,0,0,12);output.writeUInt32LE(output.length,8);output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);binary.copy(output,20+padded.length);
 return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.length),'');
}
const [male,female,reception]=await Promise.all([model('thanh'),model('tham'),model('Michelle.glb')]);
const actors=['director','camera','light','reception','performer'].map(role=>createStudioHuman(['reception','performer'].includes(role)?female:male,role));
for(const actor of [...actors,createStudioHuman(reception,'reception')]){
 const box=new THREE.Box3().setFromObject(actor,true);
 assert.ok(Math.abs(box.min.y)<.03,actor.name+' feet are grounded');
 assert.ok(box.max.y>1.7&&box.max.y<1.9,actor.name+' has human scale');
 actor.traverse(o=>{if(o.isSkinnedMesh){assert.ok(o.skeleton.bones.every(b=>actor.getObjectById(b.id)===b),'skin uses its own rig');}});
}
const wrist=(actor,side)=>humanBone(actor,side+'Hand').getWorldPosition(new THREE.Vector3());
assert.ok(wrist(actors[0],'Left').distanceTo(new THREE.Vector3(.16,1.08,.3))<.01,'director reaches clipboard');
assert.ok(wrist(actors[1],'Right').distanceTo(new THREE.Vector3(-.24,1.13,.12))<.01,'camera operator reaches pan handle');
const untouched=humanBone(actors[1],'LeftArm').quaternion.clone();
humanBone(actors[0],'LeftArm').rotateX(.4);assert.ok(humanBone(actors[1],'LeftArm').quaternion.equals(untouched),'posed clones are independent');
// The contact host must bend forward and plant its lower legs downward at any yaw.
for(const template of [male,female])for(const yaw of [0,Math.PI/2]){
 const seated=createStudioHuman(template,'assistant');seated.position.set(9.45,0,-30.9);seated.rotation.y=yaw;seatStudioHuman(seated);
 const forward=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
 for(const side of ['Left','Right']){
  const hip=humanBone(seated,side+'UpLeg').getWorldPosition(new THREE.Vector3());
  const knee=humanBone(seated,side+'Leg').getWorldPosition(new THREE.Vector3());
  const ankle=humanBone(seated,side+'Foot').getWorldPosition(new THREE.Vector3());
  assert.ok(knee.clone().sub(hip).dot(forward)>.25,'seated knees face forward');
  assert.ok(ankle.y<knee.y-.35,'seated shins point down');
  assert.ok(ankle.y>.12&&ankle.y<.3,'feet stay near the studio floor');
  const hand=seated.worldToLocal(humanBone(seated,side+'Hand').getWorldPosition(new THREE.Vector3()));
  const pelvis=seated.worldToLocal(humanBone(seated,'Hips').getWorldPosition(new THREE.Vector3()));
  assert.ok(Math.abs(hand.y-pelvis.y)<.08&&hand.z>pelvis.z+.2,'hands rest over the lap');
 }
 assert.ok(Math.abs(humanBone(seated,'Hips').getWorldPosition(new THREE.Vector3()).y-.8)<.001,'host sits at chair height');
}
console.log('PASS: five role rigs, scale, ground contact, skin ownership, prop reach, clone isolation and seated host.');

const welcoming=createStudioHuman(reception,'reception');welcoming.position.set(-7,0,8);
const motion=createHumanMotion(welcoming,'reception');
const restingHand=humanBone(welcoming,'RightHand').getWorldPosition(new THREE.Vector3());
const head=humanBone(welcoming,'Head'),headRest=head.quaternion.clone();
const foot=humanBone(welcoming,'RightFoot'),footRest=foot.quaternion.clone();
updateHumanMotion(motion,1,{waveElapsed:1});welcoming.updateMatrixWorld(true);
assert.ok(humanBone(welcoming,'RightHand').getWorldPosition(new THREE.Vector3()).y>restingHand.y+.3,'welcome wave raises the hand');
assert.ok(!head.quaternion.equals(headRest),'head has idle movement');
assert.ok(foot.quaternion.equals(footRest),'idle and waving preserve planted feet');
const sampled=head.quaternion.clone();
for(let i=0;i<200;i++)updateHumanMotion(motion,1,{waveElapsed:1});
assert.ok(head.quaternion.equals(sampled),'animation does not accumulate pose drift');
updateHumanMotion(motion,8,{waveElapsed:8});welcoming.updateMatrixWorld(true);
assert.ok(humanBone(welcoming,'RightHand').getWorldPosition(new THREE.Vector3()).distanceTo(restingHand)<.01,'wave returns hand to rest');
updateHumanMotion(motion,1,{reducedMotion:true,waveElapsed:1});
for(const [bone,base] of motion.rest){assert.ok(bone.quaternion.equals(base.rotation)&&bone.scale.equals(base.scale),'reduced motion restores the exact rest pose');}
console.log('PASS: welcome wave, idle movement, planted feet, no drift, wave recovery and reduced motion.');

const operator=createStudioHuman(male,'camera');operator.position.set(-12,0,1.55);operator.rotation.y=Math.PI;
const operating=createHumanMotion(operator,'camera');
operator.updateMatrixWorld(true);
const focus=humanBone(operator,'LeftHand'),focusRest=focus.quaternion.clone();
const focusPosition=focus.getWorldPosition(new THREE.Vector3());
const pan=humanBone(operator,'RightHand').getWorldPosition(new THREE.Vector3());
const ankleRest=humanBone(operator,'RightFoot').getWorldPosition(new THREE.Vector3());
let maxFocusTravel=0,maxPanTravel=0,changed=false;
for(let i=0;i<=240;i++){
 updateHumanMotion(operating,i/10);operator.updateMatrixWorld(true);
 changed ||= focus.quaternion.angleTo(focusRest)>.05;
 maxFocusTravel=Math.max(maxFocusTravel,focus.getWorldPosition(new THREE.Vector3()).distanceTo(focusPosition));
 maxPanTravel=Math.max(maxPanTravel,humanBone(operator,'RightHand').getWorldPosition(new THREE.Vector3()).distanceTo(pan));
 assert.ok(humanBone(operator,'RightFoot').getWorldPosition(new THREE.Vector3()).distanceTo(ankleRest)<.0001,'camera operator keeps feet planted');
}
assert.ok(changed,'camera operator adjusts the focus wrist');
assert.ok(maxFocusTravel<.025&&maxPanTravel<.01,'camera hands stay beside lens and pan controls');
updateHumanMotion(operating,2);const cameraPose=focus.quaternion.clone();
for(let i=0;i<100;i++)updateHumanMotion(operating,2);
assert.ok(focus.quaternion.equals(cameraPose),'camera movement has no accumulated drift');
updateHumanMotion(operating,2,{reducedMotion:true});
for(const [bone,base] of operating.rest)assert.ok(bone.quaternion.equals(base.rotation)&&bone.scale.equals(base.scale),'reduced motion stops camera adjustments');
console.log('PASS: camera focus movement, control reach, planted feet, stable loop and reduced motion.');
