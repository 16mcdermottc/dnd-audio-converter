import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Quote, Save, TrendingDown, TrendingUp, X, Edit2, Wand2, RefreshCw, UploadCloud } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UPDATE_SESSION, REFINE_SESSION_SUMMARY } from '../graphql/mutations';
import { GET_SESSION_DETAILS } from '../graphql/queries';
import { Session, Highlight, Quote as QuoteType } from '../types';
import { request } from '../utils/graphql';
import { parseListString } from '../utils/stringUtils';

export default function SessionView() {
  const { id } = useParams();
  const sessionId = parseInt(id || '0');
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', summary: '' });
  const [isRefining, setIsRefining] = useState(false);

  const { data: sessionData, isLoading, error } = useQuery<{ session: Session }>({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      return request<{ session: Session }>(GET_SESSION_DETAILS, { id: sessionId });
    },
    enabled: !!sessionId
  });

  const session = sessionData?.session;

  const { mutate: updateSession } = useMutation({
      mutationFn: async (vars: { id: number, name: string, summary: string }) => {
          return request(UPDATE_SESSION, { id: vars.id, name: vars.name, summary: vars.summary });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
          setIsEditing(false);
      },
      onError: () => alert("Failed to update session")
  });

  const { mutate: refineSummary } = useMutation({
      mutationFn: async () => {
          return request<{ refine_session_summary: string }>(REFINE_SESSION_SUMMARY, { id: sessionId });
      },
      onSuccess: (data) => {
          setFormData(prev => ({ ...prev, summary: data.refine_session_summary }));
          setIsRefining(false);
      },
      onError: () => {
          alert("Refinement failed. Ensure back-end is properly configured.");
          setIsRefining(false);
      }
  });

  const handleEditClick = () => {
      if (session) {
          setFormData({ name: session.name, summary: session.summary || '' });
          setIsEditing(true);
      }
  };

  const handleSave = () => {
      updateSession({ id: sessionId, name: formData.name, summary: formData.summary });
  };
  
  const handleRefine = () => {
      if (confirm("This will overwrite the current summary text in the editor logic using AI. Proceed?")) {
          setIsRefining(true);
          refineSummary();
      }
  };

  const [isRegenerating, setIsRegenerating] = useState(false);
  const handleRegenerate = async () => {
      if (!confirm("Are you sure? This will DESTRUCTIVELY overwrite the current analysis (highlights, quotes, summary) by re-running the AI pipeline. Proceed?")) return;
      
      setIsRegenerating(true);
      try {
          const res = await fetch(`/sessions/${sessionId}/regenerate`, { method: 'POST' });
          if (!res.ok) throw new Error("Failed");
          alert("Regeneration started in background. The status should update shortly.");
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      } catch (e) {
          console.error(e);
          alert("Failed to start regeneration.");
      } finally {
          setIsRegenerating(false);
      }
  };

  const [isUploading, setIsUploading] = useState(false);
  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!confirm("This will replace current audio files and re-run the entire analysis. Continue?")) return;

      setIsUploading(true);
      const formData = new FormData();
      Array.from(e.target.files).forEach(file => {
          formData.append('files', file);
      });

      try {
          const res = await fetch(`/reupload_session/${sessionId}`, {
              method: 'POST',
              body: formData
          });
          if (!res.ok) throw new Error("Upload failed");
          alert("Files uploaded and processing started.");
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      } catch (e) {
          console.error(e);
          alert("Failed to reupload files.");
      } finally {
          setIsUploading(false);
      }
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>;
  if (error || !session) return <div className="p-12 text-center text-red-400">Session not found</div>;

  const isProcessing = isRefining || isRegenerating || isUploading || 
                       (session?.status && (session.status.toLowerCase() === 'processing' || session.status.toLowerCase() === 'pending'));

  if (isProcessing) {
      return (
          <div className="py-8 px-8 w-full mx-auto text-center min-h-[50vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
              <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">
                  {isUploading ? 'Uploading & Analyzing...' : 
                   isRegenerating ? 'Regenerating Session Analysis...' : 
                   'Refining Summary...'}
              </h2>
              <p className="text-slate-400 max-w-lg">
                  This process involves AI analysis and may take a few moments.
                  {isUploading || isRegenerating ? " Please do not close this page." : ""}
              </p>
          </div>
      );
  }

  return (
    <div className="py-8 px-4 md:px-8 w-full mx-auto">
      <div className="mb-6">
        <Link to={`/campaigns/${session.campaign_id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Campaign
        </Link>
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            {isEditing ? (
                <div className="w-full mr-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Session Name</label>
                    <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-xl md:text-2xl font-bold focus:ring-2 focus:ring-purple-500 outline-none mb-4"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
            ) : (
                <h1 className="text-2xl md:text-4xl font-bold text-white">{session.name}</h1>
            )}
            
            <div className="flex flex-wrap gap-2">
                {isEditing ? (
                    <>
                        <button 
                            onClick={handleRefine} 
                            disabled={isRefining}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${isRefining ? 'bg-purple-900/50 text-purple-300' : 'text-purple-300 hover:bg-purple-900/20 hover:text-purple-200'}`} 
                            title="Auto-Refine Summary with AI"
                        >
                            {isRefining ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                            {isRefining && <span className="text-sm">Refining...</span>}
                        </button>

                        <button 
                            onClick={handleRegenerate} 
                            disabled={isRegenerating}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${isRegenerating ? 'bg-orange-900/50 text-orange-300' : 'text-orange-300 hover:bg-orange-900/20 hover:text-orange-200'}`} 
                            title="Regenerate Session Analysis (Destructive)"
                        >
                            {isRegenerating ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                            {isRegenerating && <span className="text-sm">Regenerating...</span>}
                        </button>
                        
                        <label className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-medium cursor-pointer ${isUploading ? 'bg-blue-900/50 text-blue-300' : 'text-blue-300 hover:bg-blue-900/20 hover:text-blue-200'}`} title="Reupload Audio and Regenerate">
                             {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                             <input type="file" multiple accept="audio/*,text/*" className="hidden" onChange={handleReupload} disabled={isUploading} />
                        </label>

                        <div className="w-px bg-slate-700 mx-1"></div>
                        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Cancel">
                            <X size={20} />
                        </button>
                        <button onClick={handleSave} className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded-lg transition-colors" title="Save">
                            <Save size={20} />
                        </button>
                    </>
                ) : (
                    <button onClick={handleEditClick} className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-900/10 rounded-lg transition-colors" title="Edit Session">
                        <Edit2 size={20} />
                    </button>
                )}
            </div>
        </div>

        <div className="flex gap-4 text-slate-400 mb-8 pb-8 border-b border-slate-700 font-mono text-sm">
           <span>ID: {session.id}</span>
           <span>STATUS: <span className="uppercase text-purple-400">{session.status}</span></span>
           <span>CREATED: {new Date(session.created_at).toLocaleString()}</span>
        </div>

        {/* Summary Section */}
        {isEditing ? (
            <div className="mb-8 bg-slate-700/50 p-6 rounded-xl border border-slate-600">
                <h3 className="text-xl font-bold text-white mb-4">Session Summary</h3>
                <textarea 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 h-64 focus:ring-2 focus:ring-purple-500 outline-none"
                    value={formData.summary}
                    onChange={e => setFormData({...formData, summary: e.target.value})}
                />
            </div>
        ) : (
            session.summary && (
                <div className="mb-8 bg-slate-700/50 p-6 rounded-xl border border-slate-600">
                    <h3 className="text-xl font-bold text-white mb-4">Session Summary</h3>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">{session.summary}</p>
                </div>
            )
        )}

        {/* Analysis Grid */}
        {(() => {
             // Normalize High/Low Points
             // Precedence: highlights (GraphQL Array) -> Legacy string parsing
             const rawHighlights = Array.isArray(session.highlights) ? session.highlights : null;
             const hasStructuredHighlights = !!rawHighlights;
             
             // High Points
             const highPoints = hasStructuredHighlights 
                 ? rawHighlights.filter(h => h.type !== 'low') 
                 : parseListString(session.highlights as string);
                 
             // Low Points
             const lowPoints = hasStructuredHighlights 
                 ? rawHighlights.filter(h => h.type === 'low')
                 : parseListString(session.low_points as string);

             // Quotes
             const rawQuotes = Array.isArray(session.quotes) ? session.quotes : null;
             const hasStructuredQuotes = !!rawQuotes;
             const quotes = hasStructuredQuotes
                  ? rawQuotes
                  : parseListString(session.memorable_quotes as string);

             return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     {(highPoints.length > 0) && (
                        <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-6">
                            <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} /> Highlights
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-green-200/80 text-sm">
                                {hasStructuredHighlights ? (
                                    (highPoints as Highlight[]).map((h) => (
                                        <li key={h.id}>
                                            {h.name ? (
                                                <span><span className="font-bold text-green-300">{h.name}</span> {h.text.charAt(0).toLowerCase() + h.text.slice(1)}</span>
                                            ) : (
                                                h.text
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    (highPoints as string[]).map((line, i) => (
                                        <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                    
                    {(lowPoints.length > 0) && (
                        <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6">
                            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                <TrendingDown size={18} /> Low Points
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-red-200/80 text-sm">
                                 {hasStructuredHighlights ? (
                                    (lowPoints as Highlight[]).map((h) => (
                                        <li key={h.id}>
                                             {h.name ? (
                                                <span><span className="font-bold text-red-300">{h.name}</span> {h.text.charAt(0).toLowerCase() + h.text.slice(1)}</span>
                                            ) : (
                                                h.text
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    (lowPoints as string[]).map((line, i) => (
                                        <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}

                    {(quotes.length > 0) && (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 italic md:col-span-2">
                            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2 not-italic">
                                <Quote size={20} /> Quotes
                            </h3>
                            <div className="text-slate-300 space-y-4">
                                 {hasStructuredQuotes ? (
                                     (quotes as QuoteType[]).map((q) => (
                                         <p key={q.id} className="relative pl-4 border-l-2 border-slate-700 text-lg">
                                            "{q.text}" {q.speaker_name ? `- ${q.speaker_name}` : ''}
                                         </p>
                                     ))
                                 ) : (
                                     (quotes as string[]).map((line, i) => (
                                         <p key={i} className="relative pl-4 border-l-2 border-slate-700 text-lg">
                                            "{line.replace(/^\[.*?\] /, '')}"
                                         </p>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
             );
        })()}
      </div>
    </div>
  );
}
