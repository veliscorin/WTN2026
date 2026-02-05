import { ReactNode } from 'react';

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Background Image Container */}
      <div 
        className="fixed inset-0 z-0 bg-[url('/images/login-bg.png')] bg-cover bg-bottom bg-no-repeat"
        aria-hidden="true"
      />
      
      {/* Content Wrapper */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
