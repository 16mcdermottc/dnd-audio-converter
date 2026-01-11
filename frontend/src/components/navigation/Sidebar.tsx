import { ArrowLeft, Camera, FolderOpen, LayoutDashboard, Quote, Sparkles, User, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ campaignId, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 
        flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen
      `}>
        <div className="p-6 flex justify-between items-start">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/quest_log_hero_transparent.png" 
              alt="Quest Log" 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg shadow-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Quest Log
            </span>
          </Link>
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="px-6 pb-2">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                Campaign Mode
            </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavLink to={`/campaigns/${campaignId}`} icon={<LayoutDashboard size={20} />} label="Dashboard" end onClick={onClose} />
          <NavLink to={`/campaigns/${campaignId}/personas`} icon={<User size={20} />} label="Personas" onClick={onClose} />
          <NavLink to={`/campaigns/${campaignId}/sessions`} icon={<FolderOpen size={20} />} label="Sessions" onClick={onClose} />
          <NavLink to={`/campaigns/${campaignId}/highlights`} icon={<Sparkles size={20} />} label="Highlights" onClick={onClose} />
          <NavLink to={`/campaigns/${campaignId}/moments`} icon={<Camera size={20} />} label="Moments" onClick={onClose} />
          <NavLink to={`/campaigns/${campaignId}/quotes`} icon={<Quote size={20} />} label="Quotes" onClick={onClose} />
          
          <div className="pt-8 mt-8 border-t border-slate-800 pb-8">
            <NavLink to="/" icon={<ArrowLeft size={20} />} label="Switch Campaign" onClick={onClose} />
          </div>
        </nav>
      </aside>
    </>
  );
}

function NavLink({ to, icon, label, end = false, onClick }: { to: string; icon: React.ReactNode; label: string; end?: boolean, onClick?: () => void }) {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
          isActive ? 'bg-purple-900/20 text-purple-300 border border-purple-500/20' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <span className={`${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-300'}`}>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
