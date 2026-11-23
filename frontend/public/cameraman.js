import * as THREE from 'three';

// Original, lightweight character geometry inspired by the approved crew concept.
// Local +Z faces the camera; hands meet its focus control and pan handle.
export function createCameraman(role='camera'){
 const group=new THREE.Group();group.name='Studio '+role;
 const isCamera=role==='camera',isDirector=role==='director';
 const material=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
 const skin=material('#995f3e'),hair=material('#201c1a'),shirt=material(isDirector?'#355c60':isCamera?'#303234':'#8c6447'),pants=material(isDirector?'#343b43':'#565b3d'),seam=material('#444a32'),shoe=material('#282c2b'),sole=material('#727369'),equipment=material('#191d20'),metal=material('#707579',.45),white=material('#ded4c3');
 const sphere=new THREE.SphereGeometry(1,20,14);
 function oval(mat,pos,size){const m=new THREE.Mesh(sphere,mat);m.position.set(...pos);m.scale.set(...size);group.add(m);return m;}
 function block(mat,pos,size){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);group.add(m);return m;}
 function limb(a,b,r1,r2,mat){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,delta.length(),16),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());group.add(m);oval(mat,a,[r1,r1,r1]);oval(mat,b,[r2,r2,r2]);return m;}
 // Planted, slightly staggered feet and a forward-working stance.
 for(const side of [-1,1]){
  const hip=[side*.105,.89,0],knee=[side*.14,.52,.055],ankle=[side*.17,.13,side*.075-.035];
  limb(hip,knee,.105,.084,pants);limb(knee,ankle,.084,.064,pants);
  oval(sole,[ankle[0],.045,ankle[2]+.04],[.092,.04,.16]);
  oval(shoe,[ankle[0],.09,ankle[2]+.035],[.086,.065,.148]);
  block(seam,[side*.205,.67,.01],[.045,.17,.13]);
  block(pants,[side*.225,.735,.01],[.012,.036,.145]);
  for(let i=0;i<3;i++)block(metal,[ankle[0],.148,ankle[2]+.035+i*.027],[.075,.006,.008]);
 }
 oval(pants,[0,.88,0],[.215,.145,.13]);
 oval(shirt,[0,1.13,.045],[.235,.295,.145]);
 block(equipment,[0,.91,.015],[.38,.045,.24]);block(metal,[0,.91,.143],[.045,.035,.015]);
 block(equipment,[-.235,.85,-.025],[.09,.16,.09]);
 limb([0,1.33,.095],[0,1.47,.14],.073,.07,skin);
 // Face, ears, short sculpted hair and a close beard.
 oval(skin,[0,1.59,.16],[.112,.145,.105]);
 oval(skin,[-.112,1.585,.15],[.025,.043,.026]);oval(skin,[.112,1.585,.15],[.025,.043,.026]);
 oval(hair,[0,1.66,.135],[.117,.09,.103]);
 for(let i=0;i<5;i++)oval(hair,[-.075+i*.036,1.72+Math.sin(i)*.008,.17],[.042,.035,.056]);
 oval(hair,[0,1.505,.194],[.086,.054,.07]);
 oval(skin,[0,1.535,.225],[.065,.032,.041]);
 oval(skin,[0,1.58,.267],[.026,.035,.025]);
 for(const side of [-1,1]){
  oval(white,[side*.045,1.612,.249],[.024,.012,.008]);oval(hair,[side*.045,1.611,.256],[.009,.010,.005]);
  const brow=oval(hair,[side*.045,1.637,.244],[.031,.007,.009]);brow.rotation.z=side*.1;
 }
 oval(hair,[0,1.542,.258],[.039,.009,.006]);
 // Short sleeves, bent bare forearms, and hands on the existing rig.
 function hand(wrist,elbow,side,grip){
  const start=group.children.length;
  // Model fingers in a palm-local frame, then orient the wrist along the forearm.
  oval(skin,[0,.028,0],[.038,.047,.020]);
  for(let f=0;f<4;f++){
   const x=(f-1.5)*.019,length=[.057,.069,.064,.049][f];
   const base=[x,.055,0],knuckle=[x,.055+length*.53,grip?.018:.002],tip=[x,.055+length*(grip?.65:1),grip?.047:.008];
   limb(base,knuckle,.009,.008,skin);limb(knuckle,tip,.008,.0065,skin);
   if(!grip)oval(material('#bd9276'),[x,tip[1]-.006,-.006],[.005,.008,.002]);
  }
  limb([side*.028,.013,0],[side*.055,.038,.012],.013,.011,skin);
  limb([side*.055,.038,.012],[side*.048,.063,grip?.033:.017],.011,.008,skin);
  const parts=group.children.slice(start),palm=new THREE.Group();parts.forEach(o=>palm.add(o));
  palm.position.set(...wrist);if(!isDirector)palm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...wrist).sub(new THREE.Vector3(...elbow)).normalize());group.add(palm);
 }
 const shoulders=[[-.20,1.31,.06],[.20,1.31,.06]];
 const elbows=isCamera?[[-.29,1.10,.22],[.30,1.14,.23]]:isDirector?[[-.29,1.04,.12],[.29,1.04,.12]]:[[-.27,1.03,.03],[.29,1.16,.13]];
 const hands=isCamera?[[-.18,1.46,.48],[.24,1.13,.12]]:isDirector?[[-.16,1.015,.32],[.16,1.015,.32]]:[[-.25,.82,.05],[.21,1.38,.23]];
 shoulders.forEach((s,i)=>{const e=elbows[i],h=hands[i],c=s.map((v,j)=>v+(e[j]-v)*.55);limb(s,c,.087,.079,shirt);limb(c,e,.065,.051,skin);limb(e,h,.051,.030,skin);hand(h,e,i===0?-1:1,isCamera||isDirector||i===1);});
 if(isDirector){
  // Both palms support the side edges; fingers curl over the front.
  block(equipment,[0,1.10,.34],[.30,.25,.025]);
  block(white,[0,1.10,.355],[.265,.205,.004]);
  block(metal,[0,1.218,.36],[.08,.022,.012]);
  for(let i=0;i<5;i++)block(metal,[0,1.16-i*.025,.359],[.18,.003,.002]);
 }else if(!isCamera){
  block(equipment,[.21,1.43,.25],[.055,.12,.035]);limb([.21,1.49,.25],[.21,1.57,.25],.004,.004,equipment);
 }
 // Compact radio and cable on the belt.
 block(equipment,[.23,.91,-.025],[.068,.11,.05]);limb([.23,.96,-.025],[.23,1.065,-.025],.005,.005,equipment);
 group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return group;
}
