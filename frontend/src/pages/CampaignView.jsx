import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Upload, FileText, Mic, Trash2, X, TrendingUp, TrendingDown, Quote, Scroll, User, Shield, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CampaignView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [campRes, sessRes, persRes] = await Promise.all([
        axios.get(`/api/campaigns/${id}`),
        axios.get(`/api/sessions/?campaign_id=${id}`),
        axios.get(`/api/personas/?campaign_id=${id}`)
      ]);
      setCampaign(campRes.data);
      setSessions(sessRes.data);
      setPersonas(persRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
      e.stopPropagation();
      if(!window.confirm("Delete this session? This cannot be undone.")) return;
      
      try {
          await axios.delete(`/api/sessions/${sessionId}`);
          setSessions(sessions.filter(s => s.id !== sessionId));
      } catch (err) {
          console.error(err);
          alert("Failed to delete session");
      }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Realm...</div>;
  if (!campaign) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors font-medium">
            <ArrowLeft size={16} className="mr-2" /> Back to Campaigns
        </Link>
        
        <header className="flex justify-between items-start mb-10 border-b border-slate-700 pb-8">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">{campaign.name}</h1>
                <p className="text-slate-400 max-w-2xl">{campaign.description}</p>
            </div>
            
            <Link 
                to={`/upload?campaign_id=${campaign.id}`}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5"
            >
                <Upload size={18} className="mr-2" />
                Upload Session
            </Link>
        </header>

        {/* Campaign Summary Section */}
        <section className="mb-12 bg-slate-800/40 rounded-xl p-6 border border-slate-700/50">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={24} />
                    <span>The Legend So Far</span>
                </h2>
                <button 
                    onClick={async () => {
                        if (loading) return;
                        try {
                            setLoading(true);
                            await axios.post(`/api/campaigns/${campaign.id}/generate_summary`);
                            alert("Scribes are chronicling the saga... check back in a few moments!");
                            // Optionally reload data after a delay or let user refresh
                            setTimeout(fetchData, 2000); 
                        } catch (err) {
                            console.error(err);
                            alert("Failed to start summary generation.");
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                >
                    <Sparkles size={14} />
                    {campaign.summary ? "Regenerate Summary" : "Generate Summary"}
                </button>
            </div>
            
            {campaign.summary ? (
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <ReactMarkdown>{campaign.summary}</ReactMarkdown>
                </div>
            ) : (
                <div className="text-slate-500 italic text-center py-8">
                    No summary generated yet. Chronicle your adventures to see the legend take shape.
                </div>
            )}
        </section>

        {/* Personas Section */}
        <section className="mb-12">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Dramatis Personae</h2>
                <div className="text-sm text-slate-400">{personas.length} characters</div>
            </div>
            
            {personas.length === 0 ? (
                 <div className="text-slate-500 text-sm italic">No characters discovered yet.</div>
            ) : (
                <>
                    {/* Player Characters */}
                    {personas.filter(p => p.role === 'PC').length > 0 && (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <User className="text-purple-400" />
                                <span>Player Characters</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {personas
                                    .filter(p => p.role === 'PC')
                                    .map(persona => (
                                    <div 
                                        key={persona.id} 
                                        onClick={() => setSelectedPersona(persona)}
                                        className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-750 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <User size={64} />
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{persona.name}</h3>
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
                                                {persona.role}
                                            </div>
                                            
                                            {persona.description && (
                                                <p className="text-slate-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                                                    {persona.description}
                                                </p>
                                            )}
                                            
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                                <Shield size={12} />
                                                <span>Click for details</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* NPCs Section */}
                    {personas.some(p => p.role !== 'PC') && (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-6 mt-12 flex items-center gap-3">
                                <User className="text-blue-400" />
                                <span>Non-Player Characters</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {personas
                                    .filter(p => p.role !== 'PC')
                                    .map(persona => (
                                    <div 
                                        key={persona.id} 
                                        onClick={() => setSelectedPersona(persona)}
                                        className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-750 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <User size={64} />
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{persona.name}</h3>
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
                                                {persona.role}
                                            </div>
                                            
                                            {persona.description && (
                                                <p className="text-slate-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                                                    {persona.description}
                                                </p>
                                            )}
                                            
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                                <Shield size={12} />
                                                <span>Click for details</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </section>

        {/* Persona Details Modal */}
        {selectedPersona && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-start">
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-white">{selectedPersona.name}</h2>
                                <span className={`text-xs px-2 py-1 rounded-md uppercase font-bold ${selectedPersona.role === 'PC' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                    {selectedPersona.role}
                                </span>
                            </div>
                            {selectedPersona.voice_description && (
                                <p className="text-sm text-purple-300/80 italic">"{selectedPersona.voice_description}"</p>
                            )}
                         </div>
                         <button 
                            onClick={() => setSelectedPersona(null)}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                             <X size={20} />
                         </button>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        {/* Description */}
                        <div className="prose prose-invert prose-slate max-w-none">
                            <ReactMarkdown>{selectedPersona.description}</ReactMarkdown>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedPersona.highlights && (
                                <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                                        <TrendingUp size={14} /> HIGHLIGHTS
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-2 text-green-200/80 text-sm">
                                        {selectedPersona.highlights.split('\n').map((line, i) => (
                                            <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {selectedPersona.low_points && (
                                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                                        <TrendingDown size={14} /> LOW POINTS
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-2 text-red-200/80 text-sm">
                                        {selectedPersona.low_points.split('\n').map((line, i) => (
                                            <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                         {selectedPersona.memorable_quotes && (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 italic relative overflow-hidden">
                                <Quote className="absolute top-4 right-4 text-slate-700/20" size={64} />
                                <h4 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 not-italic relative z-10">
                                    <Quote size={14} /> MEMORABLE QUOTES
                                </h4>
                                <div className="space-y-4 relative z-10">
                                     {selectedPersona.memorable_quotes.split('\n').map((line, i) => (
                                        <div key={i} className="pl-4 border-l-2 border-purple-500/30 text-slate-300">
                                            "{line.replace(/^\[.*?\] /, '')}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Sessions Section */}
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Sessions</h2>
                <div className="text-sm text-slate-400">{sessions.length} recorded</div>
            </div>

            {sessions.length === 0 ? (
                <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-12 text-center text-slate-500">
                    <p className="mb-4">No tales have been told yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <div 
                           key={session.id}
                           onClick={() => navigate(`/sessions/${session.id}`)}
                           className="group bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between hover:border-purple-500/50 hover:bg-slate-800/80 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${session.status === 'completed' ? 'bg-green-900/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {session.audio_file_paths ? <Mic size={20} /> : <FileText size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{session.name}</h3>
                                    {session.summary && (
                                        <p className="text-slate-400 text-sm mb-2 line-clamp-2 max-w-2xl">
                                            {session.summary}
                                        </p>
                                    )}
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="uppercase">{session.status}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Session"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    </div>
  );
}
