import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Play, Calendar, Clock, ChevronRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/sessions/');
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Campaign Overview</h2>
          <p className="text-slate-400">Track your adventures, key moments, and legends.</p>
        </div>
        <Link 
          to="/upload" 
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg shadow-purple-900/20"
        >
          + New Session
        </Link>
      </header>

      {/* Stats Row (Mock data for now) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Total Sessions" value={sessions.length} />
        <StatCard label="Hours Recorded" value="0.0" />
        <StatCard label="Personas Tracked" value="-" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-4">Recent Sessions</h3>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-purple-500" size={40} />
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 text-center border-2 border-dashed border-slate-700">
              <p className="text-slate-400 mb-4">No sessions found.</p>
              <Link to="/upload" className="text-purple-400 hover:underline">Upload your first recording</Link>
            </div>
          ) : (
            sessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function SessionCard({ session }) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="bg-slate-800 hover:bg-slate-750 transition-colors p-5 rounded-xl border border-slate-700 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
          <Play size={24} fill="currentColor" className="opacity-80" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
            {session.name}
          </h4>
          <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(session.created_at).toLocaleDateString()}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[session.status] || "bg-gray-500/10"}`}>
              {session.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      
      <Link 
        to={`/session/${session.id}`}
        className="p-2 text-slate-500 hover:text-white transition-colors"
      >
        <ChevronRight size={24} />
      </Link>
    </div>
  );
}
