import {useEffect,useState} from 'react';
type Client={id:string;name:string;reply:string;company:string;service:string;details:string;created_at:string};
export default function Clients(){
 const [clients,setClients]=useState<Client[]>([]),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(append=false){
  setBusy(true);setError('');
  try{const response=await fetch('/api/clients?offset='+(append?clients.length:0),{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load clients');setClients(old=>append?[...old,...data.clients]:data.clients);setTotal(data.total);}
  catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[]);
 return <section className="card clients-page"><div className="section-title"><div><h2>Client enquiries</h2><p className="muted">{total} enquiries from the Contact Us room</p></div><button className="secondary" disabled={busy} onClick={()=>load()}>Refresh</button></div>
 {error&&<p role="alert" className="notice error">{error}</p>}
 {!clients.length&&!busy&&!error&&<p>No enquiries yet. New submissions will appear here.</p>}
 {clients.map(client=><article className="client-enquiry" key={client.id}><div className="section-title"><h3>{client.name}</h3><time dateTime={client.created_at}>{new Date(client.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</time></div><dl><dt>Contact</dt><dd>{client.reply}</dd>{client.company&&<><dt>Company</dt><dd>{client.company}</dd></>}<dt>Service</dt><dd>{client.service}</dd></dl><p className="client-requirements">{client.details}</p></article>)}
 {busy&&<p role="status">Loading enquiries…</p>}{clients.length<total&&<button className="secondary" disabled={busy} onClick={()=>load(true)}>Load more</button>}
 </section>;
}
