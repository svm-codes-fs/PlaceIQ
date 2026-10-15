import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function AppLayout({ user, onLogout }) {
  if (!user) return null;
  
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar role={user.role} onLogout={onLogout} />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Global Aurora Background */}
        <div className="absolute inset-0 bg-aurora animate-aurora-pan opacity-60 pointer-events-none" />
        
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto relative z-10 px-8 lg:px-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
