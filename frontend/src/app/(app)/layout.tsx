import { AppRoot } from '@/components/AppRoot';

// Lives above the [[...slug]] segment so the app (and its loaded data) stays mounted while the URL changes
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppRoot />
      {children}
    </>
  );
}
