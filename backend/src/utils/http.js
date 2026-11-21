export function json(res,body,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
export async function readBody(req){let body='';for await(const part of req){body+=part;if(body.length>100000)throw Error('Request too large');}return JSON.parse(body||'{}');}
