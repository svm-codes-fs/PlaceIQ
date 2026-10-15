import { Bell, Search } from "lucide-react";

export function Navbar({ user }) {
  return (
    <header className="h-20 bg-background/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-8 lg:px-12">
      <div className="flex-1 flex items-center gap-4">
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search platform..." 
            className="w-full bg-surface border border-white/5 rounded-full py-2 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute 0 right-0 w-2 h-2 bg-primary rounded-full border border-background"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-white/10 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white leading-none tracking-wide">{user?.username}</p>
            <p className="text-xs text-primaryLight uppercase tracking-widest mt-1.5">{user?.role}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm shadow-[0_0_15px_-3px_rgba(124,58,237,0.5)] group-hover:scale-105 transition-transform">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
