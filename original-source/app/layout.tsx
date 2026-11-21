import type {Metadata} from 'next';
export const metadata:Metadata={title:'Sivan Films — Studio Administration',description:'Sivan Films website administration',icons:{icon:'/assets/sivan-films-icon.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body style={{margin:0}}>{children}</body></html>}
