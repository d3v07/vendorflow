import { ReactNode } from 'react';
import { TopNavigation } from './TopNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNavigation />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t-2 border-foreground py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-muted-foreground">
          <span>VendorFlow</span>
          <span>© 2024</span>
        </div>
      </footer>
    </div>
  );
}
