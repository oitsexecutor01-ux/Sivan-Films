const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_eager_nehzno.sql','utf8').replaceAll('--> statement-breakpoint',''));
const store={prepare(sql){let values=[];return{bind(...v){values=v;return this},async first(){return db.prepare(sql).get(...values)||null},async all(){return{results:db.prepare(sql).all(...values)}},async run(){const r=db.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}}},async batch(queries){db.exec('BEGIN');try{const r=[];for(const q of queries)r.push(await q.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
let user=null;
function load(file,requires){const exports={};const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(src,{exports,require:n=>{if(!(n in requires))throw Error(n);return requires[n]},Response,Request,URL,crypto,console,Date});return exports;}
const lib=load('lib/studio.ts',{'../source/default-content.json':JSON.parse(fs.readFileSync('source/default-content.json')),'../app/chatgpt-auth':{getChatGPTUser:async()=>user}});
const routes=load('app/api/studio-admin/route.ts',{'cloudflare:workers':{env:{DB:store}},'../../../lib/studio':lib});
const publicRoute=load('app/api/studio-content/route.ts',{'cloudflare:workers':{env:{DB:store}},'../../../lib/studio':lib});
const post=(body,origin='https://sivanfilms.com')=>routes.POST(new Request('https://sivanfilms.com/api/studio-admin',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)}));
(async()=>{
 assert.equal((await routes.GET()).status,403);user={userId:'outsider',email:'other@example.com'};assert.equal((await routes.GET()).status,403);
 user={userId:'sivan-admin',email:'sivanfilms@gmail.com',displayName:'Sivan Films'};assert.equal((await routes.GET()).status,200);user={userId:'owner',email:'oculixofficial@gmail.com',displayName:'Owner'};let state=await(await routes.GET()).json();let c=structuredClone(state.draft);c.rooms[1].intro='Private draft test';
 assert.equal((await post({action:'save',content:c,version:0},'https://evil.example')).status,403);
 let evil=structuredClone(c);evil.contact.logo='javascript:alert(1)';assert.equal((await post({action:'save',content:evil,version:0})).status,400);
 evil=structuredClone(c);evil.rooms[0].id='changed';assert.equal((await post({action:'save',content:evil,version:0})).status,400);
 assert.equal((await post({action:'save',content:c,version:0})).status,200);
 const pub=await(await publicRoute.GET(new Request('https://sivanfilms.com/api/studio-content'))).json();assert.notEqual(pub.rooms[1].intro,c.rooms[1].intro);
 const preview=await(await publicRoute.GET(new Request('https://sivanfilms.com/api/studio-content?preview=1'))).json();assert.equal(preview.rooms[1].intro,c.rooms[1].intro);
 assert.equal((await post({action:'save',content:c,version:0})).status,409);
 user=null;assert.equal((await publicRoute.GET(new Request('https://sivanfilms.com/api/studio-content?preview=1'))).status,403);assert.equal((await post({action:'publish',content:c,version:1})).status,403);
 user={userId:'owner',email:'oculixofficial@gmail.com',displayName:'Owner'};assert.equal((await post({action:'publish',content:c,version:1})).status,200);
 const live=await(await publicRoute.GET(new Request('https://sivanfilms.com/api/studio-content'))).json();assert.equal(live.rooms[1].intro,c.rooms[1].intro);
 state=await(await routes.GET()).json();assert.equal(state.history.length,2);assert.equal(state.version,2);c.rooms[1].intro='Another draft';await post({action:'save',content:c,version:2});await post({action:'restore',historyId:state.history[0].id,version:3});const restored=await(await routes.GET()).json();assert.equal(restored.draft.rooms[1].intro,'Private draft test');assert.equal(restored.published.rooms[1].intro,'Private draft test');assert.equal(restored.version,4);
 console.log('PASS: admin allowlist, anonymous denial, origin checks, unsafe media rejection, room layout preservation, private draft, publish, version conflicts and revision restore.');
})().catch(e=>{console.error(e);process.exitCode=1});
