import * as THREE from 'three';
import {clone as cloneRig} from './assets/SkeletonUtils.js';

export function humanBone(root,name){
 return root.getObjectByName(name)||root.getObjectByName('mixamorig'+name)||root.getObjectByName('mixamorig:'+name);
}

// Aim in world space so differing bind-pose bone axes do not affect the pose.
function aim(bone,child,target){
 const start=bone.getWorldPosition(new THREE.Vector3());
 const from=child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
 const to=target.clone().sub(start).normalize();
 const world=bone.getWorldQuaternion(new THREE.Quaternion());
 const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(from,to).multiply(world)));
 bone.updateWorldMatrix(false,true);
}

function poseArm(root,side,wrist,hint,fingers=[0,-.10,.01]){
 const upper=humanBone(root,side+'Arm'),lower=humanBone(root,side+'ForeArm'),hand=humanBone(root,side+'Hand');
 if(!upper||!lower||!hand)return;
 root.updateMatrixWorld(true);
 const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=lower.getWorldPosition(new THREE.Vector3());
 const end=hand.getWorldPosition(new THREE.Vector3()),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(end);
 const target=root.localToWorld(new THREE.Vector3(...wrist)),direction=target.clone().sub(shoulder);
 const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(a-b)+.001,a+b-.001);direction.normalize();
 target.copy(shoulder).addScaledVector(direction,distance);
 const along=(a*a-b*b+distance*distance)/(2*distance);
 const bend=root.localToWorld(new THREE.Vector3(...hint)).sub(shoulder);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
 const joint=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
 aim(upper,lower,joint);aim(lower,hand,target);
 // Fingers follow the forearm instead of retaining the original spread-hand pose.
 const finger=humanBone(root,side+'HandMiddle1');
 if(finger)aim(hand,finger,target.clone().add(new THREE.Vector3(...fingers).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()))));
 for(const digit of ['Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){
  const bone=humanBone(root,side+'Hand'+digit+i);if(bone)bone.rotateX(.12);
 }
 root.updateMatrixWorld(true);
}

export function createStudioHuman(template,role){
 const root=new THREE.Group();root.name='Studio '+role;
 root.userData.modelSource=template.userData?.modelSource||'hmthanh/3d-human-model';root.userData.role=role;
 const model=cloneRig(template.scene);root.add(model);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model,true),height=role==='director'?1.82:1.75;
 const scale=height/(bounds.max.y-bounds.min.y);model.scale.multiplyScalar(scale);
 model.position.y=-bounds.min.y*scale;model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
  const prepare=m=>{const copy=m.clone();copy.roughness=Math.max(copy.roughness??.8,.7);copy.metalness=0;
   if(copy.name==='Wolf3D_Outfit_Top')copy.color.set(role==='director'?'#567c83':role==='light'?'#ac8867':role==='camera'?'#68717a':'#ffffff');
   return copy;};o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
 }});
 const director=role==='director',camera=role==='camera',light=role==='light';
 if(camera){poseArm(root,'Left',[.18,1.46,.57],[.33,1.11,.18],[0,.04,.10]);poseArm(root,'Right',[-.24,1.13,.12],[-.34,1.08,.16],[0,.04,.10]);}
 else if(director){poseArm(root,'Left',[.16,1.08,.30],[.32,1.06,.10],[0,.10,.04]);poseArm(root,'Right',[-.16,1.08,.30],[-.32,1.06,.10],[0,.10,.04]);}
 else if(light){poseArm(root,'Left',[.22,1.31,.22],[.32,1.08,.12],[0,.10,0]);poseArm(root,'Right',[-.23,.86,.07],[-.3,1.09,.01]);}
 else{poseArm(root,'Left',[.23,.88,.12],[.32,1.13,.04]);poseArm(root,'Right',[-.23,.88,.12],[-.32,1.13,.04]);}
 const dark=new THREE.MeshStandardMaterial({color:'#20282d',roughness:.75});
 const paper=new THREE.MeshStandardMaterial({color:'#f4edda',roughness:.9});
 function block(name,size,position,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;root.add(mesh);return mesh;}
 if(director){
  block('Director clipboard',[.30,.25,.025],[0,1.15,.34],dark);
  block('Script pages',[.265,.205,.004],[0,1.15,.355],paper);
  block('Clipboard clip',[.08,.022,.012],[0,1.268,.36],dark);
  for(let i=0;i<5;i++)block('Script line',[.18,.003,.002],[0,1.21-i*.025,.359],dark);
 }
 if(light){
  // Attach the radio to the posed hand so it follows future rig changes.
  const hand=humanBone(root,'LeftHand');
  const radio=block('Lighting technician radio',[.055,.12,.035],[0,0,0],dark);
  hand.attach(radio);radio.position.set(0,.065,.025);radio.quaternion.identity();
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.09,8),dark);antenna.position.set(0,.1,0);radio.add(antenna);
 }
 root.updateMatrixWorld(true);return root;
}

export function seatStudioHuman(root,hipHeight=.80){
 root.updateMatrixWorld(true);
 const rotation=root.getWorldQuaternion(new THREE.Quaternion());
 const offset=(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(rotation);
 for(const side of ['Left','Right']){
  const thigh=humanBone(root,side+'UpLeg'),shin=humanBone(root,side+'Leg'),foot=humanBone(root,side+'Foot'),toe=humanBone(root,side+'ToeBase');
  aim(thigh,shin,thigh.getWorldPosition(new THREE.Vector3()).add(offset(0,-.17,.40)));
  aim(shin,foot,shin.getWorldPosition(new THREE.Vector3()).add(offset(0,-.45,0)));
  if(toe)aim(foot,toe,foot.getWorldPosition(new THREE.Vector3()).add(offset(0,-.025,.15)));
 }
 const hips=humanBone(root,'Hips').getWorldPosition(new THREE.Vector3());root.position.y+=hipHeight-hips.y;root.updateMatrixWorld(true);
 const lap=root.worldToLocal(humanBone(root,'Hips').getWorldPosition(new THREE.Vector3()));
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  poseArm(root,side,[sign*.14,lap.y+.025,lap.z+.28],[sign*.30,lap.y+.13,lap.z+.03],[0,0,.10]);
 }
 root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();}});
}

// Capture after role/seated posing, then always animate from that pose.
export function createHumanMotion(root,role=root.userData.role){
 const rest=new Map();root.traverse(bone=>{if(bone.isBone)rest.set(bone,{rotation:bone.quaternion.clone(),scale:bone.scale.clone()});});
 const wave=new Map();
 if(role==='reception'&&humanBone(root,'RightHand')){
  poseArm(root,'Right',[-.38,1.48,.15],[-.40,1.12,.06],[0,.12,0]);
  for(const [bone,base] of rest){if(/^Right(Arm|ForeArm|Hand)/.test(bone.name.replace(/^mixamorig:?/,'')))wave.set(bone,bone.quaternion.clone());bone.quaternion.copy(base.rotation);}
  root.updateMatrixWorld(true);
 }
 return {root,rest,wave,role,head:humanBone(root,'Head'),chest:humanBone(root,'Spine1')||humanBone(root,'Spine'),
  focusArm:role==='camera'?humanBone(root,'LeftForeArm'):null,
  focusHand:role==='camera'?humanBone(root,'LeftHand'):null,
  panHand:role==='camera'?humanBone(root,'RightHand'):null};
}
const motionEuler=new THREE.Euler(),motionTurn=new THREE.Quaternion();
export function updateHumanMotion(motion,time,{reducedMotion=false,waveElapsed=-1}={}){
 const {root,rest,wave,head,chest}=motion;
 for(const [bone,base] of rest){bone.quaternion.copy(base.rotation);bone.scale.copy(base.scale);}
 if(reducedMotion)return;
 const phase=(root.position.x*1.7+root.position.z*.43);
 if(chest)chest.scale.y*=1+Math.sin(time*1.65+phase)*.004;
 if(head){motionTurn.setFromEuler(motionEuler.set(Math.sin(time*.85+phase)*.012,Math.sin(time*.51+phase)*.025,0));head.quaternion.multiply(motionTurn);}
 if(motion.role==='camera'){
  // A slow focus check: small elbow travel keeps the hands beside the controls.
  const cycle=time*.95+phase,adjust=Math.sin(cycle),checking=(1-Math.cos(cycle*.5))*.5;
  if(motion.focusArm)motion.focusArm.rotateX(adjust*.035);
  if(motion.focusHand){motion.focusHand.rotateY(adjust*.16);motion.focusHand.rotateZ(Math.sin(cycle*1.7)*.045);}
  if(motion.panHand)motion.panHand.rotateX(Math.sin(cycle*.8)*.055);
  if(head){motionTurn.setFromEuler(motionEuler.set(checking*.075,-checking*.055,Math.sin(cycle)*.015));head.quaternion.multiply(motionTurn);}
 }
 if(waveElapsed>=0&&waveElapsed<4){
  const weight=THREE.MathUtils.smoothstep(waveElapsed,0,.6)*(1-THREE.MathUtils.smoothstep(waveElapsed,3.2,4));
  for(const [bone,target] of wave)bone.quaternion.slerp(target,weight);
  const hand=humanBone(root,'RightHand');
  if(hand){motionTurn.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.sin(waveElapsed*8)*.24*weight);hand.quaternion.multiply(motionTurn);}
 }
}
