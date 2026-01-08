import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Quote, ArrowLeft, Camera, Sparkles, FolderOpen } from 'lucide-react';
import SessionView from './pages/SessionView';
import UploadPage from './pages/UploadPage';
import PersonaList from './pages/PersonaList';
import CampaignList from './pages/CampaignList';
import CampaignView from './pages/CampaignView';
import QuoteList from './pages/QuoteList';
import HighlightList from './pages/HighlightList';
import MomentList from './pages/MomentList';
import SessionList from './pages/SessionList';

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

function Layout() {
  const location = useLocation();
  
  // Extract Campaign ID from URL if present (simple regex)
  const match = location.pathname.match(/\/campaigns\/(\d+)/);
  const campaignId = match ? match[1] : null;

  // If no campaign selected, render without sidebar
  if (!campaignId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
        <Routes>
          <Route path="/" element={<CampaignList />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </div>
    );
  }

  // Campaign view with sidebar
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/quest_log_hero_transparent.png" 
              alt="Quest Log" 
              className="h-12 w-12 rounded-lg shadow-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Quest Log
            </span>
          </Link>
          <div className="mt-3 text-xs text-slate-500 uppercase tracking-widest font-bold">
            Campaign Mode
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavLink to={`/campaigns/${campaignId}`} icon={<LayoutDashboard size={20} />} label="Dashboard" end />
          <NavLink to={`/campaigns/${campaignId}/personas`} icon={<User size={20} />} label="Personas" />
          <NavLink to={`/campaigns/${campaignId}/sessions`} icon={<FolderOpen size={20} />} label="Sessions" />
          <NavLink to={`/campaigns/${campaignId}/highlights`} icon={<Sparkles size={20} />} label="Highlights" />
          <NavLink to={`/campaigns/${campaignId}/moments`} icon={<Camera size={20} />} label="Moments" />
          <NavLink to={`/campaigns/${campaignId}/quotes`} icon={<Quote size={20} />} label="Quotes" />
          
          <div className="pt-8 mt-8 border-t border-slate-800">
            <NavLink to="/" icon={<ArrowLeft size={20} />} label="Switch Campaign" />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <Routes>
          <Route path="/campaigns/:id" element={<CampaignView />} />
          <Route path="/campaigns/:id/personas" element={<PersonaList />} /> 
          <Route path="/campaigns/:id/sessions" element={<SessionList />} />
          <Route path="/campaigns/:id/highlights" element={<HighlightList />} />
          <Route path="/campaigns/:id/moments" element={<MomentList />} />
          <Route path="/campaigns/:id/quotes" element={<QuoteList />} />
          
          <Route path="/campaigns/:campaignId/upload" element={<UploadPage />} />
          <Route path="/campaigns/:campaignId/sessions/:id" element={<SessionView />} />
        </Routes>
      </main>
    </div>
  );
}

function NavLink({ to, icon, label, end = false }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
          isActive ? 'bg-purple-900/20 text-purple-300 border border-purple-500/20' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <span className={`${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-300'}`}>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default App;
