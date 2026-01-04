import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Quote } from 'lucide-react';

export default function SessionView() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const res = await axios.get(`/api/sessions/${id}`);
      setSession(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>;
  if (!session) return <div className="p-12 text-center text-red-400">Session not found</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to={`/campaigns/${session.campaign_id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft size={16} /> Back to Campaign
      </Link>

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-4">{session.name}</h1>
        <div className="flex gap-4 text-slate-400 mb-8 pb-8 border-b border-slate-700">
           <span>ID: {session.id}</span>
           <span>Status: {session.status}</span>
           <span>Created: {new Date(session.created_at).toLocaleString()}</span>
        </div>

        {/* Summary Section */}
        {session.summary && (
            <div className="mb-8 bg-slate-700/50 p-6 rounded-xl border border-slate-600">
                <h3 className="text-xl font-bold text-white mb-4">Session Summary</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">{session.summary}</p>
            </div>
        )}

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             {session.highlights && (
                <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-6">
                    <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={18} /> Highlights
                    </h3>
                    <ul className="list-disc pl-5 space-y-2 text-green-200/80 text-sm">
                        {session.highlights.split('\n').map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {session.low_points && (
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                        <TrendingDown size={18} /> Low Points
                    </h3>
                    <ul className="list-disc pl-5 space-y-2 text-red-200/80 text-sm">
                         {session.low_points.split('\n').map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </div>
            )}

            {session.memorable_quotes && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 italic">
                    <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2 not-italic">
                        <Quote size={20} /> Quotes
                    </h3>
                    <div className="text-slate-300 space-y-4">
                         {session.memorable_quotes.split('\n').map((line, i) => (
                             <p key={i} className="relative pl-4 border-l-2 border-slate-700">
                                "{line.replace(/^\[.*?\] /, '')}"
                             </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
