import * as THREE from 'three';

// Quest controllers use the standard WebXR target-ray and xr-standard gamepad APIs.
export function createStudioVR({renderer,scene,camera,rooms,button,getPose,setPose,move,canWalk,blocked,prepare,visit,interact,interactive,notify}) {
 renderer.xr.enabled=true;
 renderer.xr.setReferenceSpaceType('local-floor');
 renderer.xr.setFramebufferScaleFactor(.85);
 const rig=new THREE.Group();rig.name='VR player rig';scene.add(rig);
 const menu=new THREE.Group();menu.name='VR room directory';menu.visible=false;scene.add(menu);
 const targets=[],controllers=[],ray=new THREE.Raycaster(),rotation=new THREE.Matrix4();
 const head=new THREE.Vector3(),direction=new THREE.Vector3(),before=new THREE.Vector3();
 const floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),landing=new THREE.Vector3();
 const marker=new THREE.Mesh(new THREE.RingGeometry(.18,.25,32),new THREE.MeshBasicMaterial({color:'#84efbb',side:THREE.DoubleSide,depthWrite:false}));
 marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
 let savedProjection=null,savedShadows=true,turnReady=true,starting=false,ready=false;
 const active=()=>renderer.xr.isPresenting;
 const syncRig=()=>{const p=getPose();rig.position.set(p.x,0,p.z);rig.rotation.y=p.yaw;rig.updateMatrixWorld(true);};
 function label(text,width=.78,height=.17,action=null) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=224;
  const c=canvas.getContext('2d');c.fillStyle=action?'#f4f1e8':'#203d38';c.fillRect(0,0,1024,224);
  c.fillStyle=action?'#203d38':'#ffffff';c.textAlign='center';c.textBaseline='middle';
  let size=64;c.font=`600 ${size}px Arial`;while(c.measureText(text).width>960){size-=2;c.font=`600 ${size}px Arial`;}
  c.fillText(text,512,112);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));
  menu.add(mesh);if(action){mesh.userData.action=action;targets.push(mesh);}return mesh;
 }
 label('SIVAN FILMS · VR STUDIO',1.65,.19).position.y=.55;
 label('Trigger: select / teleport · Grip: show menu',1.65,.13).position.y=.37;
 label('Left stick: walk · Right stick: snap turn',1.65,.13).position.y=.23;
 const destinations=[{id:'reception',name:'Reception'},...rooms,{id:'outside',name:'Garden'}];
 destinations.forEach((r,i)=>{
  label(r.name,.79,.15,async()=>{menu.visible=false;await visit(r.id);syncRig();}).position.set(i%2?.43:-.43,.04-Math.floor(i/2)*.19,0);
 });
 label('Close menu',.79,.15,()=>{menu.visible=false;}).position.set(-.43,-.79,0);
 label('Exit VR',.79,.15,()=>renderer.xr.getSession()?.end()).position.set(.43,-.79,0);
 function showMenu(){
  if(menu.visible){menu.visible=false;return;}
  const view=renderer.xr.getCamera();head.setFromMatrixPosition(view.matrixWorld);direction.set(0,0,-1).transformDirection(view.matrixWorld);direction.y=0;
  if(direction.lengthSq()<.01)direction.set(0,0,-1);direction.normalize();
  menu.position.copy(head).addScaledVector(direction,1.7);menu.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(head,menu.position,new THREE.Vector3(0,1,0)));
  menu.visible=true;menu.updateMatrixWorld(true);
 }
 function aim(controller){
  controller.updateWorldMatrix(true,false);rotation.extractRotation(controller.matrixWorld);
  ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rotation);ray.far=12;
  if(menu.visible){const hit=ray.intersectObjects(targets,false)[0];return hit?{distance:hit.distance,action:hit.object.userData.action}:null;}
  const object=ray.intersectObjects(interactive().filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}),false)[0];
  const hitFloor=ray.ray.direction.y<-.08&&ray.ray.intersectPlane(floor,landing);
  const distance=hitFloor?ray.ray.origin.distanceTo(landing):Infinity;
  if(object&&object.distance<distance)return {distance:object.distance,action:()=>interact(object.object)};
  head.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
  if(hitFloor&&distance<12&&!blocked(landing.x,landing.z)&&canWalk({x:head.x,z:head.z},{x:landing.x,z:landing.z}))return {distance,point:landing.clone()};
  return null;
 }
 for(let i=0;i<2;i++){
  const controller=renderer.xr.getController(i);rig.add(controller);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:'#d3bd8c'}));
  line.scale.z=6;controller.add(line);
  controller.addEventListener('connected',e=>{controller.userData.source=e.data;});
  controller.addEventListener('disconnected',()=>{delete controller.userData.source;});
  controller.addEventListener('squeezestart',()=>{if(active())showMenu();});
  controller.addEventListener('select',async()=>{
   if(!active()||renderer.xr.getSession()?.visibilityState!=='visible')return;const hit=aim(controller);if(!hit)return;
   try{
    if(hit.action)await hit.action();
    else if(hit.point){
     head.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);const p=getPose();
     setPose(p.x+hit.point.x-head.x,p.z+hit.point.z-head.z,p.yaw);syncRig();
    }
   }catch(error){notify('VR action could not finish. Exit VR and try again.');console.warn(error);}
  });
  controllers.push({controller,line});
 }
 function restore(){
  menu.visible=false;menu.userData.openOnFrame=false;marker.visible=false;scene.attach(camera);
  if(savedProjection){Object.assign(camera,savedProjection);camera.updateProjectionMatrix();}rig.position.set(0,0,0);rig.rotation.set(0,0,0);
  renderer.shadowMap.enabled=savedShadows;document.body.classList.remove('in-vr');
  button.textContent='Enter VR';button.disabled=!ready;turnReady=true;
 }
 renderer.xr.addEventListener('sessionstart',()=>{button.textContent='Exit VR';button.disabled=false;document.body.classList.add('in-vr');});
 renderer.xr.addEventListener('sessionend',restore);
 button.onclick=async()=>{
  if(active()){await renderer.xr.getSession().end();return;}if(starting||!ready)return;
  starting=true;button.disabled=true;savedProjection={fov:camera.fov,aspect:camera.aspect,zoom:camera.zoom};savedShadows=renderer.shadowMap.enabled;let session;
  try{
   session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
   prepare();renderer.shadowMap.enabled=false;
   rig.add(camera);camera.position.set(0,0,0);camera.rotation.set(0,0,0);syncRig();
   await renderer.xr.setSession(session);renderer.xr.setFoveation(1);
   // Open the directory after the first tracked frame, not at the desktop camera pose.
   menu.userData.openOnFrame=true;
  }catch(error){if(session)await session.end().catch(()=>{});restore();notify('VR could not start. Allow immersive VR in Quest Browser and try again.');console.warn(error);}
  finally{starting=false;button.disabled=!ready;}
 };
 async function enable(){
  ready=true;
  if(!window.isSecureContext||!navigator.xr)return;
  try{if(await navigator.xr.isSessionSupported('immersive-vr')){button.hidden=false;button.disabled=false;}}
  catch{notify('VR availability could not be checked. You can still explore on screen.');}
 }
 function update(dt){
  if(!active())return;
  syncRig();renderer.xr.updateCamera(camera);const view=renderer.xr.getCamera();
  if(menu.userData.openOnFrame&&view.matrixWorld.elements[13]>.1){menu.userData.openOnFrame=false;showMenu();}
  const session=renderer.xr.getSession();
  if(session.visibilityState!=='visible'){marker.visible=false;return;}
  for(const source of session.inputSources){
   const axes=source.gamepad?.axes;if(!axes)continue;
   const x=axes.length>=4?axes[2]:axes[0]||0,y=axes.length>=4?axes[3]:axes[1]||0;
   if(source.handedness==='left'&&!menu.visible){
    const sx=Math.abs(x)>.18?x:0,sy=Math.abs(y)>.18?y:0;
    if(sx||sy){
     direction.set(0,0,-1).transformDirection(view.matrixWorld);direction.y=0;direction.normalize();
     const speed=1.5*dt/Math.max(1,Math.hypot(sx,sy));
     const dx=(direction.x*-sy-direction.z*sx)*speed,dz=(direction.z*-sy+direction.x*sx)*speed;
     head.setFromMatrixPosition(view.matrixWorld);
     if(canWalk({x:head.x,z:head.z},{x:head.x+dx,z:head.z+dz}))move(dx,dz);
    }
   }
   if(source.handedness==='right'){
    if(Math.abs(x)<.25)turnReady=true;
    if(Math.abs(x)>.7&&turnReady&&!menu.visible){
     turnReady=false;before.setFromMatrixPosition(view.matrixWorld);const p=getPose(),angle=-Math.sign(x)*Math.PI/6;
     const dx=before.x-p.x,dz=before.z-p.z;
     setPose(before.x-(dx*Math.cos(angle)+dz*Math.sin(angle)),before.z-(-dx*Math.sin(angle)+dz*Math.cos(angle)),p.yaw+angle);
    }
   }
  }
  syncRig();renderer.xr.updateCamera(camera);marker.visible=false;
  for(const {controller,line} of controllers){
   if(!controller.userData.source)continue;
   const hit=aim(controller);line.scale.z=hit?.distance||6;line.material.color.set(hit?'#84efbb':'#d3bd8c');
   if(hit?.point){marker.position.set(hit.point.x,.035,hit.point.z);marker.visible=true;}
  }
 }
 return {enable,update,active};
}
