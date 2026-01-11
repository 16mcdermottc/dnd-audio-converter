import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import SessionView from './pages/SessionView';
import UploadPage from './pages/UploadPage';
import PersonaList from './pages/PersonaList';
import CampaignList from './pages/CampaignList';
import CampaignView from './pages/CampaignView';
import QuoteList from './pages/QuoteList';
import HighlightList from './pages/HighlightList';
import MomentList from './pages/MomentList';
import SessionList from './pages/SessionList';
import LibrarianChat from './components/chat/LibrarianChat';
import { Sidebar } from './components/navigation/Sidebar';
import { useState } from 'react';

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans relative">
        
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 z-30">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="text-slate-300 p-2 -ml-2 hover:bg-slate-800 rounded-lg"
        >
          <Menu size={24} />
        </button>
        <span className="ml-3 font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
           Quest Log
        </span>
      </div>
      
      {/* Sidebar (Responsive) */}
      <Sidebar 
        campaignId={campaignId} 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main Content */}
      <main className="flex-1 w-full pt-16 md:pt-0 duration-300">
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

      {/* Librarian Chat */}
      <LibrarianChat campaignId={parseInt(campaignId)} />
    </div>
  );
}

export default App;
