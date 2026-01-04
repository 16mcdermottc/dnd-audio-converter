import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Shield, Scroll, Loader2, Pencil, Trash2, Quote, TrendingUp, TrendingDown, GitMerge, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PersonaList() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Merge State
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState(null);
  
  const [formData, setFormData] = useState({
      name: '',
      role: 'NPC',
      description: '',
      voice_description: '',
      player_name: ''
  });

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const res = await axios.get('/api/personas/');
      setPersonas(res.data);
    } catch (err) {
      console.error("Failed to fetch personas", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setCreating(true);
      try {
          if (editingId) {
             // Update
             const res = await axios.put(`/api/personas/${editingId}`, formData);
             setPersonas(personas.map(p => p.id === editingId ? res.data : p));
          } else {
             // Create
             const res = await axios.post('/api/personas/', formData);
             setPersonas([...personas, res.data]);
          }
          resetForm();
      } catch (err) {
          console.error(err);
          alert("Failed to save persona");
      } finally {
          setCreating(false);
      }
  };

  const handleEdit = (persona) => {
      if (mergeMode) return; // Disable edit in merge mode
      setFormData({
          name: persona.name,
          role: persona.role,
          description: persona.description || '',
          voice_description: persona.voice_description || '',
          player_name: persona.player_name || ''
      });
      setEditingId(persona.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
      if (mergeMode) return;
      if (!window.confirm("Are you sure you want to delete this persona?")) return;
      try {
          await axios.delete(`/api/personas/${id}`);
          setPersonas(personas.filter(p => p.id !== id));
      } catch (err) {
          console.error(err);
          alert("Failed to delete persona");
      }
  };

  const resetForm = () => {
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', role: 'NPC', description: '', voice_description: '', player_name: '' });
  }

  // Merge Logic
  const handleMergeClick = (persona) => {
      if (!mergeSource) {
          // Select Source
          setMergeSource(persona);
      } else {
          // Select Target
          if (persona.id === mergeSource.id) {
              // Deselect if clicking same
              setMergeSource(null);
              return;
          }
          executeMerge(persona); // persona is Target
      }
  };

  const executeMerge = async (targetPersona) => {
      if (!window.confirm(`Merge "${mergeSource.name}" into "${targetPersona.name}"? This cannot be undone.`)) {
          return;
      }
      
      try {
          const res = await axios.post('/api/personas/merge', {
              target_persona_id: targetPersona.id,
              source_persona_id: mergeSource.id
          });
          
          // Update local state: Remove source, update target
          setPersonas(personas.filter(p => p.id !== mergeSource.id).map(p => p.id === targetPersona.id ? res.data : p));
          
          setMergeSource(null);
          setMergeMode(false);
          alert("Merge successful");
          
      } catch (err) {
          console.error(err);
          alert("Failed to merge personas. ensure both exist.");
      }
  };

  const filteredPersonas = personas.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pcPersonas = filteredPersonas.filter(p => p.role === 'PC');
  const npcPersonas = filteredPersonas.filter(p => p.role !== 'PC');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dramatis Personae</h2>
            <p className="text-slate-400">The heroes, villains, and bystanders of your tale.</p>
         </div>
         <div className="flex gap-3 items-center">
             <input 
                type="text" 
                placeholder="Search personas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors w-48"
             />
              <button 
                onClick={() => {
                    setMergeMode(!mergeMode);
                    setMergeSource(null);
                    setShowForm(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    mergeMode 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
            >
                {mergeMode ? <X size={18} /> : <GitMerge size={18} />}
                {mergeMode ? 'Cancel Merge' : 'Merge Mode'}
            </button>
            
            {!mergeMode && (
                <button 
                   onClick={() => {
                       if (showForm) resetForm();
                       else setShowForm(true);
                   }}
                   className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {showForm ? 'Cancel' : 'Add Persona'}
                </button>
            )}
        </div>
      </header>
      
      {/* Merge Mode Instructions */}
      {mergeMode && (
          <div className="mb-6 bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl text-amber-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <GitMerge className="text-amber-500" />
              <div>
                  <p className="font-bold">Merge Mode Active</p>
                  <p className="text-sm opacity-80">
                      {!mergeSource 
                          ? "Select the duplicate/incorrect persona you want to REMOVE (Source)." 
                          : `Selected "${mergeSource.name}". Now select the correct persona to KEEP (Target).`}
                  </p>
              </div>
          </div>
      )}
      
      {showForm && !mergeMode && (
          <div className="mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Persona' : 'Create New Persona'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Role</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" 
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="NPC">NPC</option>
                            <option value="PC">PC</option>
                            <option value="DM">DM</option>
                            <option value="Monster">Monster</option>
                        </select>
                    </div>
                </div>
                <div>
                     <label className="block text-sm text-slate-400 mb-1">Description</label>
                     <textarea 
                         className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white h-24" 
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
                     />
                </div>
                <div>
                     <label className="block text-sm text-slate-400 mb-1">Voice Description</label>
                     <input 
                         type="text"
                         className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" 
                         placeholder="e.g. Deep, raspy, speaks in riddles"
                         value={formData.voice_description}
                         onChange={(e) => setFormData({...formData, voice_description: e.target.value})}
                     />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button 
                        type="submit" 
                        disabled={creating}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold"
                    >
                        {creating ? 'Saving...' : (editingId ? 'Update Persona' : 'Save Persona')}
                    </button>
                </div>
            </form>
          </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-purple-500" size={40} />
        </div>
      ) : (
        <div className="space-y-12">
            
            {/* Player Characters Section */}
            {pcPersonas.length > 0 && (
                <div>
                     <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2 border-b border-purple-500/30 pb-2">
                        <Shield size={20} /> Player Characters
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pcPersonas.map(persona => (
                            <PersonaCard 
                                key={persona.id} 
                                persona={persona} 
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                mergeMode={mergeMode}
                                isMergeSource={mergeSource?.id === persona.id}
                                onMergeClick={handleMergeClick}
                            />
                        ))}
                     </div>
                </div>
            )}

            {/* NPCs Section */}
            {(npcPersonas.length > 0 || (pcPersonas.length === 0 && filteredPersonas.length === 0)) && (
                <div>
                     {pcPersonas.length > 0 && (
                        <h3 className="text-xl font-bold text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                           <User size={20} /> Non-Player Characters
                        </h3>
                     )}
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPersonas.length === 0 && !showForm ? (
                            <div className="col-span-full text-center py-12 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                                {searchQuery ? "No personas found matching your search." : "No personas discovered yet. Upload a session or add one manually!"}
                            </div>
                        ) : (
                            npcPersonas.map(persona => (
                                <PersonaCard 
                                    key={persona.id} 
                                    persona={persona} 
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    mergeMode={mergeMode}
                                    isMergeSource={mergeSource?.id === persona.id}
                                    onMergeClick={handleMergeClick}
                                />
                            ))
                        )}
                     </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

function PersonaCard({ persona, onEdit, onDelete, mergeMode, isMergeSource, onMergeClick }) {
  const isPC = persona.role === 'PC';
  
  return (
    <div 
        className={`bg-slate-800 rounded-xl border overflow-hidden transition-all shadow-lg group relative
            ${isMergeSource ? 'border-amber-500 ring-2 ring-amber-500/50 scale-[0.98] opacity-80' : 'border-slate-700 hover:border-purple-500/50'}
            ${mergeMode && !isMergeSource ? 'cursor-pointer hover:border-amber-400 hover:scale-[1.01]' : ''}
        `}
        onClick={() => {
            if (mergeMode) onMergeClick(persona);
        }}
    >
      <div className={`h-2 ${isPC ? 'bg-purple-500' : 'bg-slate-600'}`} />
      
      {/* Merge Indicator Overlay */}
      {mergeMode && (
          <div className="absolute inset-0 bg-slate-900/10 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {isMergeSource ? (
                    <span className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold shadow-lg">Source (Will be Deleted)</span>
                ) : (
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full font-bold shadow-lg">Target (Merge Here)</span>
                )}
          </div>
      )}

      {/* Actions */}
      {!mergeMode && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 p-1 rounded-lg backdrop-blur-sm z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(persona); }}
                className="p-1.5 text-slate-300 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
                title="Edit"
              >
                  <Pencil size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(persona.id); }}
                className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                title="Delete"
              >
                  <Trash2 size={16} />
              </button>
          </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-slate-900 rounded-lg">
             {isPC ? <Shield className="text-purple-400" size={24} /> : <User className="text-slate-400" size={24} />}
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isPC ? 'bg-purple-900/30 text-purple-300' : 'bg-slate-700 text-slate-300'}`}>
            {persona.role}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-1">{persona.name}</h3>
        {persona.player_name && isPC && (
             <div className="text-sm text-purple-400 font-medium mb-2">Played by {persona.player_name}</div>
        )}
        
        {/* Markdown Description */}
        <div className="text-slate-400 text-sm mb-4 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{persona.description}</ReactMarkdown>
        </div>
        
        {persona.voice_description && (
             <div className="mb-4 text-xs text-purple-300 bg-purple-900/20 px-3 py-2 rounded border border-purple-500/20">
                <span className="font-bold block mb-1">Voice:</span> {persona.voice_description}
             </div>
        )}

        {/* Character Arc Stats */}
        <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/50">
            {persona.highlights && (
                <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                        <TrendingUp size={12} /> HIGHLIGHTS
                    </h4>
                    <div className="text-xs text-green-200/80">
                        {persona.highlights.split('\n').filter(line => line.trim()).map((line, i) => (
                             <FormattedPointLine key={i} line={line} titleColor="text-green-400" />
                        ))}
                    </div>
                </div>
            )}
            
            {persona.low_points && (
                <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                        <TrendingDown size={12} /> LOW POINTS
                    </h4>
                    <div className="text-xs text-red-200/80">
                        {persona.low_points.split('\n').filter(line => line.trim()).map((line, i) => (
                             <FormattedPointLine key={i} line={line} titleColor="text-red-400" />
                        ))}
                    </div>
                </div>
            )}

            {persona.memorable_quotes && (
                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 italic">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1 not-italic">
                        <Quote size={12} /> QUOTES
                    </h4>
                    <div className="text-xs text-slate-400">
                         {persona.memorable_quotes.split('\n').filter(line => line.trim()).map((line, i) => (
                             <FormattedQuoteLine key={i} line={line} />
                        ))}
                    </div>
                </div>
            )}
        </div>

        {persona.summary && (
          <div className="mt-4 bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300">
            <Scroll size={14} className="inline mr-2 opacity-50 transition-opacity group-hover:opacity-100" />
            <span className="opacity-70">Latest Summary:</span> {persona.summary}
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedQuoteLine({ line }) {
    const match = line.match(/^\[(.*?)\] (.*)$/);
    if (!match) return <p className="mb-1">"{line.replace(/^\[.*?\] /, '')}"</p>;

    const title = match[1];
    let content = match[2];
    let items = [content];

    // Attempt to parse python-style list string: "['Item 1', 'Item 2']"
    if (content.startsWith('[') && content.endsWith(']')) {
        const inner = content.slice(1, -1);
        const listMatch = [...inner.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g)];
        if (listMatch.length > 0) {
            items = listMatch.map(m => {
                 return m[0].slice(1, -1).replace(/\\(['"])/g, '$1');
            });
        }
    }

    return (
        <div className="mb-3 last:mb-0">
             <div className="font-bold text-slate-600 opacity-70 mb-1 not-italic text-[10px] uppercase tracking-wide">{title}</div>
             <div className="space-y-1">
                 {items.map((item, idx) => (
                     <p key={idx} className="pl-1 text-slate-300">
                        &quot;{item}&quot;
                     </p>
                 ))}
             </div>
        </div>
    );
}

function FormattedPointLine({ line, titleColor }) {
    const match = line.match(/^\[(.*?)\] (.*)$/);
    if (!match) return <p className="mb-1">{line}</p>;

    const title = match[1];
    let content = match[2];
    let items = [content];

    // Attempt to parse python-style list string: "['Item 1', 'Item 2']"
    if (content.startsWith('[') && content.endsWith(']')) {
        const inner = content.slice(1, -1);
        // Match quoted strings. Captures single or double quoted strings.
        const listMatch = [...inner.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g)];
        if (listMatch.length > 0) {
            items = listMatch.map(m => {
                 // Remove surrounding quotes and unescape
                 return m[0].slice(1, -1).replace(/\\(['"])/g, '$1');
            });
        }
    }

    return (
        <div className="mb-3 last:mb-0">
             <div className={`font-bold ${titleColor} opacity-90 mb-1 not-italic`}>{title}</div>
             {items.length === 1 ? (
                 <p className="pl-1">{items[0]}</p>
             ) : (
                 <ul className="list-disc pl-5 space-y-1 text-opacity-90">
                     {items.map((item, idx) => (
                         <li key={idx}>{item}</li>
                     ))}
                 </ul>
             )}
        </div>
    );
}
