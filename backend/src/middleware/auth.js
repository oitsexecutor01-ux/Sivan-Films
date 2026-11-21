import {createHash,timingSafeEqual} from 'node:crypto';import {db} from '../models/database.js';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function authorised(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sf_session='))?.slice(11);return token&&db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(hash(token),Date.now());}
export function sameSecret(a,b){return timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));}
