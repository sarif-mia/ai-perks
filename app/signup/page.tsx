import {getSessionUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import AuthForm from '@/components/auth-form';
export const dynamic='force-dynamic';
export default async function Signup(){if(await getSessionUser())redirect('/dashboard');return <AuthForm signup/>}
