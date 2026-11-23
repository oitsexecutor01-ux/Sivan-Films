import {defineConfig} from 'vite';
export default defineConfig({server:{proxy:{'/api':{
 target:'http://localhost:4000',
 changeOrigin:true,
 configure(proxy){
  proxy.on('proxyReq',(proxyReq,req)=>{
   // Translate only same-origin frontend requests to the backend origin.
   // Requests from other sites retain their origin and fail the backend check.
   try{if(new URL(req.headers.origin).host===req.headers.host)proxyReq.setHeader('Origin','http://localhost:4000');}catch{}
  });
 }
}}}});
