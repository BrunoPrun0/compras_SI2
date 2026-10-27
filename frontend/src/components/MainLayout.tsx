import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import type { ViewId } from '../types/navigation';

interface MainLayoutProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  children: ReactNode;
}

export function MainLayout({ currentView, onNavigate, children }: MainLayoutProps) {
  return (
    <div className="app-wrapper">
      <Navbar currentView={currentView} onNavigate={onNavigate} />
      <main className="main-content">{children}</main>
    </div>
  );
}
