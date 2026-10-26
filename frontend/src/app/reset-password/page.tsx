import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/components/ResetPasswordPage';

export const metadata: Metadata = {
  title: 'Reset password | Jira'
};

export default function Page() {
  return <ResetPasswordPage />;
}
