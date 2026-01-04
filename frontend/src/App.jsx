import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Mic, BookOpen, Users, User, Quote } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SessionView from './pages/SessionView';
import UploadPage from './pages/UploadPage';
import PersonaList from './pages/PersonaList';
import CampaignList from './pages/CampaignList';
import CampaignView from './pages/CampaignView';
import QuoteList from './pages/QuoteList';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
        
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
          <div className="p-6">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Quest Log
            </h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2">
            <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Campaigns" />
            <NavLink to="/personas" icon={<User size={20} />} label="All Personas" />
            <NavLink to="/quotes" icon={<Quote size={20} />} label="Quotes" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<CampaignList />} />
            <Route path="/campaigns/:id" element={<CampaignView />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/sessions/:id" element={<SessionView />} />
            <Route path="/personas" element={<PersonaList />} />
            <Route path="/quotes" element={<QuoteList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <Link 
      to={to} 
      className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors group"
    >
      <span className="text-purple-400 group-hover:text-purple-300">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default App;
