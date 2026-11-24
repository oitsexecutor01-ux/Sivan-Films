import {useEffect,useState} from 'react';
import '../assets/legal.css';
export default function Legal({kind}:{kind:'terms'|'privacy'}){
 const [content,setContent]=useState<any>(null),[error,setError]=useState('');
 const preview=new URLSearchParams(location.search).get('preview')==='1';
 const suffix=preview?'?preview=1':'';
 async function load(){
  setError('');
  try{
   const response=await fetch('/api/studio-content'+suffix,{cache:'no-store'});
   if(!response.ok)throw Error(preview?'Sign in to the admin page to preview saved policies.':'Unable to load this page. Please try again.');
   const data=await response.json();
   if(!data.legal?.[kind]){const fallback=await fetch('/legal-defaults.json');if(!fallback.ok)throw Error('Unable to load this page.');data.legal=await fallback.json();}
   setContent(data);
  }catch(e){setError((e as Error).message);}
 }
 useEffect(()=>{load();},[kind]);
 const page=content?.legal[kind];
 useEffect(()=>{document.title=(page?.title||(kind==='privacy'?'Privacy Policy':'Terms & Conditions'))+' | Sivan Films';},[page,kind]);
 return <div className="legal-page"><header className="legal-header"><a href={'/?room=contact'+(preview?'&preview=1':'')} aria-label="Return to Sivan Films Contact Us room">SIVAN FILMS</a><a href={'/?room=contact'+(preview?'&preview=1':'')}>Back to Contact Us</a></header><main className="legal-main">{preview&&<p className="legal-preview" role="status">Saved draft preview · Only published content is visible to visitors.</p>}{error?<div role="alert"><h1>Page unavailable</h1><p>{error}</p><button onClick={load}>Try again</button>{preview&&<p><a href="/admin">Open admin sign in</a></p>}</div>:!page?<p role="status">Loading page…</p>:<><p className="legal-eyebrow">SIVAN FILMS / INFORMATION</p><h1>{page.title}</h1><p className="legal-updated">Last updated: <time dateTime={page.updatedAt}>{new Date(page.updatedAt+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</time></p><article>{page.body.split(/\n\s*\n/).filter(Boolean).map((block:string,i:number)=>{const [heading,...lines]=block.trim().split('\n');return <section key={i}>{lines.length?<><h2>{heading}</h2><p>{lines.join('\n')}</p></>:<p>{heading}</p>}</section>;})}</article><section className="legal-contact"><h2>Contact Sivan Films</h2><a href={'mailto:'+content.contact.email}>{content.contact.email}</a><a href={'tel:'+content.contact.phone}>{content.contact.phone}</a><p>{content.contact.locations}</p></section></>}</main><footer className="legal-footer"><nav aria-label="Policy pages"><a href={'/terms-and-conditions'+suffix} aria-current={kind==='terms'?'page':undefined}>Terms &amp; Conditions</a><a href={'/privacy-policy'+suffix} aria-current={kind==='privacy'?'page':undefined}>Privacy Policy</a><a href={'/?room=contact'+(preview?'&preview=1':'')}>Contact Us</a></nav><span>© Sivan Films</span></footer></div>;
}
