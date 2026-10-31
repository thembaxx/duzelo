import { redirect } from 'next/navigation';
export default function PrivateSettingsShell() { redirect('/auth/sign-in'); }
