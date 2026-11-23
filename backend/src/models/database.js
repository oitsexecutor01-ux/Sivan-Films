import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import defaults from '../config/default-content.json' with {type:'json'};
mkdirSync(new URL('../../data/',import.meta.url),{recursive:true});
export const db=new DatabaseSync(new URL('../../data/studio.sqlite',import.meta.url).pathname);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, draft TEXT, published TEXT, version INTEGER, updated_at TEXT, published_at TEXT); CREATE TABLE IF NOT EXISTS history(id TEXT PRIMARY KEY,action TEXT,snapshot TEXT,created_at TEXT,created_by TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER);');
db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?,?,0,?,NULL)').run(JSON.stringify(defaults),JSON.stringify(defaults),new Date().toISOString());

db.exec('CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,name TEXT NOT NULL,reply TEXT NOT NULL,company TEXT NOT NULL,service TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL);');
