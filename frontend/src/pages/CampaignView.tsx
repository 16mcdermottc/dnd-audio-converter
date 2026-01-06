import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Mic, Shield, Sparkles, Trash2, Upload, User } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EditItemModal from '../components/EditItemModal';
import PersonaDetailsModal from '../components/PersonaDetailsModal';
import { Campaign, Highlight, Persona, Quote as QuoteType, Session } from '../types';

export default function CampaignView() {
  const { id } = useParams();
  const campaignId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Highlight | QuoteType | null>(null);

  // Collapsible Sections State
  const [expandedSections, setExpandedSections] = useState({
      summary: true,
      personas: true,
      pcPersonas: true,
      npcPersonas: true,
      sessions: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Queries
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useQuery<Campaign>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const res = await axios.get(`/api/campaigns/${campaignId}`);
      return res.data;
    },
    enabled: !!campaignId,
    retry: 1
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions', campaignId],
    queryFn: async () => {
      const res = await axios.get(`/api/sessions/?campaign_id=${campaignId}`);
      return res.data;
    },
    enabled: !!campaignId
  });

  const { data: personas = [] } = useQuery<Persona[]>({
    queryKey: ['personas', campaignId],
    queryFn: async () => {
      const res = await axios.get(`/api/personas/?campaign_id=${campaignId}`);
      return res.data;
    },
    enabled: !!campaignId
  });

  const { data: selectedPersona } = useQuery<Persona>({
    queryKey: ['persona', selectedPersonaId],
    queryFn: async () => {
      const res = await axios.get(`/api/personas/${selectedPersonaId}`);
      return res.data;
    },
    enabled: !!selectedPersonaId,
    initialData: () => personas.find(p => p.id === selectedPersonaId)
  });

  // Handle errors
  if (campaignError) {
      // @ts-expect-error - Response property exists on Axios error
      if (campaignError.response?.status === 404) {
          navigate('/');
      }
  }

  // Mutations
  const { mutate: generateSummary, isPending: isGeneratingSummary } = useMutation({
    mutationFn: async () => {
      return axios.post(`/api/campaigns/${campaignId}/generate_summary`);
    },
    onSuccess: () => {
       alert("Scribes are chronicling the saga... check back in a few moments!");
       setTimeout(() => {
         queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
       }, 2000);
    },
    onError: (err) => {
        console.error(err);
        alert("Failed to start summary generation.");
    }
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: async (sessionId: number) => {
      return axios.delete(`/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['sessions', campaignId] });
    },
    onError: () => {
        alert("Failed to delete session");
    }
  });

  const { mutate: updateItem } = useMutation({
    mutationFn: async (item: Highlight | QuoteType) => {
        const isQuote = 'speaker_name' in item;
        const endpoint = isQuote ? `/api/quotes/${item.id}` : `/api/highlights/${item.id}`;
        return axios.put(endpoint, item);
    },
    onSuccess: () => {
        // Invalidate the specific persona definition
        queryClient.invalidateQueries({ queryKey: ['persona', selectedPersonaId] });
    },
    onMutate: async (updatedItem) => {
        // Optimistic update
        await queryClient.cancelQueries({ queryKey: ['persona', selectedPersonaId] });
        const previousPersona = queryClient.getQueryData<Persona>(['persona', selectedPersonaId]);
        
        if (previousPersona) {
             const isQuote = 'speaker_name' in updatedItem;
             queryClient.setQueryData<Persona>(['persona', selectedPersonaId], (old) => {
                if (!old) return old;
                if (isQuote) {
                     return { 
                         ...old, 
                         quotes_list: old.quotes_list?.map(q => q.id === updatedItem.id ? (updatedItem as QuoteType) : q) 
                     };
                } else {
                     return { 
                         ...old, 
                         highlights_list: old.highlights_list?.map(h => h.id === updatedItem.id ? (updatedItem as Highlight) : h) 
                     };
                }
             });
        }
        return { previousPersona };
    },
    onError: (_err, _newItem, context) => {
        if (context?.previousPersona) {
            queryClient.setQueryData(['persona', selectedPersonaId], context.previousPersona);
        }
        alert("Failed to save changes");
    }
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: async (item: Highlight | QuoteType) => {
        const isQuote = 'speaker_name' in item;
        const endpoint = isQuote ? `/api/quotes/${item.id}` : `/api/highlights/${item.id}`;
        return axios.delete(endpoint);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['persona', selectedPersonaId] });
    },
    onMutate: async (item) => {
        await queryClient.cancelQueries({ queryKey: ['persona', selectedPersonaId] });
        const previousPersona = queryClient.getQueryData<Persona>(['persona', selectedPersonaId]);
         if (previousPersona) {
             const isQuote = 'speaker_name' in item;
             queryClient.setQueryData<Persona>(['persona', selectedPersonaId], (old) => {
                if (!old) return old;
                if (isQuote) {
                     return { 
                         ...old, 
                         quotes_list: old.quotes_list?.filter(q => q.id !== item.id) 
                     };
                } else { 
                     return { 
                         ...old, 
                         highlights_list: old.highlights_list?.filter(h => h.id !== item.id) 
                     };
                }
             });
        }
        return { previousPersona };
    },
    onError: (_err, _item, context) => {
        if (context?.previousPersona) {
            queryClient.setQueryData(['persona', selectedPersonaId], context.previousPersona);
        }
        alert("Failed to save changes");
    }
  });

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if(!window.confirm("Delete this session? This cannot be undone.")) return;
      deleteSession(sessionId);
  };

  const handleEditItem = useCallback((item: Highlight | QuoteType) => {
      setEditingItem(item);
  }, []);

  const handleSaveItem = useCallback(async (updatedItem: Highlight | QuoteType) => {
      updateItem(updatedItem);
  }, [updateItem]);

  const handleDeleteItem = useCallback(async (item: Highlight | QuoteType) => {
      if(!window.confirm("Delete this item?")) return;
      deleteItem(item);
  }, [deleteItem]);

  const handleClosePersonaModal = useCallback(() => {
    setSelectedPersonaId(null);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingItem(null);
  }, []);

  if (campaignLoading) return <div className="p-12 text-center text-slate-500">Loading Realm...</div>;
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
        <section className="mb-8 bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden text-left">
            <div 
                className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-800/60 transition-colors"
                onClick={() => toggleSection('summary')}
            >
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {expandedSections.summary ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    <Sparkles className="text-amber-400" size={24} />
                    <span>The Legend So Far</span>
                </h2>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isGeneratingSummary) return;
                        generateSummary();
                    }}
                    disabled={isGeneratingSummary}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                >
                    {isGeneratingSummary ? <Mic className="animate-pulse" size={14}/> : <Sparkles size={14} />}
                    {campaign.summary ? "Regenerate Summary" : "Generate Summary"}
                </button>
            </div>
            
            {expandedSections.summary && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                    {campaign.summary ? (
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-left">
                            <ReactMarkdown>{campaign.summary}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic text-center py-8">
                            No summary generated yet. Chronicle your adventures to see the legend take shape.
                        </div>
                    )}
                </div>
            )}
        </section>

        {/* Personas Section */}
        <section className="mb-8">
             <div 
                className="flex items-center justify-between mb-6 cursor-pointer group"
                onClick={() => toggleSection('personas')}
            >
                <div className="flex items-center gap-2">
                    <div className="text-slate-400 group-hover:text-white transition-colors">
                        {expandedSections.personas ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white">Dramatis Personae</h2>
                </div>
                <div className="text-sm text-slate-400">{personas.length} characters</div>
            </div>
            
            {expandedSections.personas && (
                <div className="animate-in slide-in-from-top-2 text-left">
                    {personas.length === 0 ? (
                        <div className="text-slate-500 text-sm italic">No characters discovered yet.</div>
                    ) : (
                        <>
                            {/* Player Characters */}
                            {personas.filter(p => p.role === 'PC').length > 0 && (
                                <div className="mb-8">
                                    <h2 
                                        className="text-xl font-bold text-white mb-6 flex items-center gap-3 cursor-pointer hover:text-purple-300 transition-colors"
                                        onClick={() => toggleSection('pcPersonas')}
                                    >
                                        <div className="text-slate-400">
                                            {expandedSections.pcPersonas ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <User className="text-purple-400" size={20} />
                                        <span>Player Characters</span>
                                    </h2>
                                    
                                    {expandedSections.pcPersonas && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                            {personas
                                                .filter(p => p.role === 'PC')
                                                .map(persona => (
                                                <div 
                                                    key={persona.id} 
                                                    onClick={() => setSelectedPersonaId(persona.id)}
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
                                    )}
                                </div>
                            )}

                            {/* NPCs Section */}
                            {personas.some(p => p.role !== 'PC') && (
                                <div className="mb-4">
                                    <h2 
                                        className="text-xl font-bold text-white mb-6 flex items-center gap-3 cursor-pointer hover:text-blue-300 transition-colors"
                                        onClick={() => toggleSection('npcPersonas')}
                                    >
                                        <div className="text-slate-400">
                                            {expandedSections.npcPersonas ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <User className="text-blue-400" size={20} />
                                        <span>Non-Player Characters</span>
                                    </h2>

                                    {expandedSections.npcPersonas && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                            {personas
                                                .filter(p => p.role !== 'PC')
                                                .map(persona => (
                                                <div 
                                                    key={persona.id} 
                                                    onClick={() => setSelectedPersonaId(persona.id)}
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
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </section>

        {/* Persona Details Modal */}
        {selectedPersona && (
            <PersonaDetailsModal 
                persona={selectedPersona}
                onClose={handleClosePersonaModal}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
            />
        )}

        {/* Sessions Section */}
        <section className="mb-8">
            <div 
                className="flex items-center justify-between mb-6 cursor-pointer group"
                onClick={() => toggleSection('sessions')}
            >
                <div className="flex items-center gap-2">
                    <div className="text-slate-400 group-hover:text-white transition-colors">
                        {expandedSections.sessions ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white">Sessions</h2>
                </div>
                <div className="text-sm text-slate-400">{sessions.length} recorded</div>
            </div>

            {expandedSections.sessions && (
                <div className="animate-in slide-in-from-top-2 text-left">
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
                </div>
            )}
        </section>
        <EditItemModal 
            isOpen={!!editingItem}
            onClose={handleCloseEditModal}
            item={editingItem}
            personas={personas}
            onSave={handleSaveItem}
        />
    </div>
  );
}
