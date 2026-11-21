import { adminUser } from '../../lib/studio';
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from '../chatgpt-auth';
import Admin from './studio-admin';
// @ts-ignore -- CSS side-effect imports are handled by Next.js.
import './admin.css';

declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elementName: string]: any;
		}
	}
}

export const dynamic = 'force-dynamic';
export default async function Page() { const user = await adminUser(); if (user) return
     <Admin email={user.email} />; 
const signed = await getChatGPTUser(); return 
<main className="login"><div className="login-card"><img src="/assets/sivan-films-logo.jpg" alt="Sivan Films" /><span className="eyebrow">PRIVATE WORKSPACE</span><h1>The studio,<br />behind the scenes.</h1><p>Manage the content of the Sivan Films 360° website.</p>{signed ? <><p className="error">{signed.email} does not have administrator access. Use your approved Sivan Films or Oculix admin account.</p><a className="primary" href={chatGPTSignOutPath('/admin')} target="_top">Sign out and switch account</a></> : <a className="primary" href={chatGPTSignInPath('/admin')} target="_top">Sign in to admin ↗</a>}<a className="subtle" href="/">← Back to the studio</a><footer>Powered by OITS</footer></div></main> }
