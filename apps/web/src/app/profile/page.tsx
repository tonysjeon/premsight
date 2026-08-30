import type { Metadata } from 'next';
import { ProfilePage } from '@/components/profile-page';

export const metadata: Metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProfilePage />;
}
