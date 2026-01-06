import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Quote, ArrowLeft, Home } from 'lucide-react';
import SessionView from './pages/SessionView';
import UploadPage from './pages/UploadPage';
import PersonaList from './pages/PersonaList';
import CampaignList from './pages/CampaignList';
import CampaignView from './pages/CampaignView';
import QuoteList from './pages/QuoteList';

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

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="p-6">
          <Link to="/" className="block">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Quest Log
            </h1>
          </Link>
          {campaignId && (
              <div className="mt-2 text-xs text-slate-500 uppercase tracking-widest font-bold">
                  Campaign Mode
              </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {!campaignId ? (
            // Root View
            <>
                <NavLink to="/" icon={<Home size={20} />} label="All Campaigns" />
                <div className="px-4 py-4 text-xs text-slate-600 text-center">
                    Select a campaign to view details
                </div>
            </>
          ) : (
            // Campaign View
            <>
                <NavLink to={`/campaigns/${campaignId}`} icon={<LayoutDashboard size={20} />} label="Dashboard" end />
                <NavLink to={`/campaigns/${campaignId}/personas`} icon={<User size={20} />} label="Personas" />
                <NavLink to={`/campaigns/${campaignId}/quotes`} icon={<Quote size={20} />} label="Quotes" />
                
                <div className="pt-8 mt-8 border-t border-slate-800">
                    <NavLink to="/" icon={<ArrowLeft size={20} />} label="Switch Campaign" />
                </div>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <Routes>
          <Route path="/" element={<CampaignList />} />
          <Route path="/campaigns/:id" element={<CampaignView />} />
          <Route path="/campaigns/:id/personas" element={<PersonaList />} /> 
          <Route path="/campaigns/:id/quotes" element={<QuoteList />} />
          
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/sessions/:id" element={<SessionView />} />
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
