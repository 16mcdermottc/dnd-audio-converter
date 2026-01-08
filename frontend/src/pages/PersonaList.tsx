import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MasonryGrid } from '../components/common/MasonryGrid';
import { ArrowLeft, GitMerge, Plus, Search, Users } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PersonaManagerCard from '../components/persona/PersonaManagerCard';
import { CREATE_PERSONA, DELETE_PERSONA, MERGE_PERSONAS, UPDATE_PERSONA } from '../graphql/mutations';
import { GET_CAMPAIGN_PERSONAS } from '../graphql/queries';
import { Campaign, Persona } from '../types';
import { request } from '../utils/graphql';

export default function PersonaList() {
  const { id } = useParams();
  const campaignId = parseInt(id || '0');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<Persona | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Persona>>({ 
      name: '', role: 'NPC', description: '', voice_description: '', player_name: '',
      gender: '', race: '', class_name: '', level: 0, status: 'Alive', faction: '', alignment: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aliasInput, setAliasInput] = useState('');

  // Queries
  const { data, isLoading } = useQuery<{ campaign: Campaign }>({
    queryKey: ['campaign-personas', campaignId],
    queryFn: async () => {
      return request<{ campaign: Campaign }>(GET_CAMPAIGN_PERSONAS, { id: campaignId });
    },
    enabled: !!campaignId
  });

  const personas = data?.campaign?.personas || [];
  const campaignName = data?.campaign?.name;

  // Mutations
  const { mutate: createPersona } = useMutation({
    mutationFn: async (newPersona: Partial<Persona>) => {
       return request(CREATE_PERSONA, { 
           input: { 
               name: newPersona.name, 
               role: newPersona.role, 
               description: newPersona.description, 
               voice_description: newPersona.voice_description,
               player_name: newPersona.player_name,
               campaign_id: campaignId,
               gender: newPersona.gender,
               race: newPersona.race,
               class_name: newPersona.class_name,
               level: newPersona.level,
                status: newPersona.status,
               faction: newPersona.faction,
               alignment: newPersona.alignment,
               aliases: newPersona.aliases
           } 
       });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-personas', campaignId] });
        setIsCreating(false);
        resetForm();
    },
    onError: () => {
        alert("Failed to create persona");
    }
  });

  const { mutate: updatePersona } = useMutation({
    mutationFn: async (vars: {id: number, input: Partial<Persona>}) => {
       return request(UPDATE_PERSONA, { 
           id: vars.id,
           input: { 
               name: vars.input.name, 
               role: vars.input.role, 
               description: vars.input.description, 
               voice_description: vars.input.voice_description,
               player_name: vars.input.player_name,
               campaign_id: campaignId,
               gender: vars.input.gender,
               race: vars.input.race,
               class_name: vars.input.class_name,
               level: vars.input.level,
               status: vars.input.status,
               faction: vars.input.faction,
               alignment: vars.input.alignment,
               aliases: vars.input.aliases
           } 
       });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-personas', campaignId] });
        setIsCreating(false);
        resetForm();
    },
    onError: () => alert("Failed to update persona")
  });

  const { mutate: deletePersona } = useMutation({
    mutationFn: async (id: number) => {
       return request(DELETE_PERSONA, { id });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-personas', campaignId] });
    },
    onError: () => alert("Failed to delete persona")
  });

  const { mutate: mergePersonas } = useMutation({
    mutationFn: async (vars: {targetId: number, sourceId: number}) => {
       return request(MERGE_PERSONAS, { targetId: vars.targetId, sourceId: vars.sourceId });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-personas', campaignId] });
        setMergeMode(false);
        setMergeSource(null);
        alert("Personas merged successfully!");
    },
    onError: () => alert("Failed to merge personas")
  });


  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const aliasesArray = aliasInput.split(',').map(s => s.trim()).filter(s => s);
      const submissionData = { ...formData, aliases: aliasesArray };

      if (editingId) {
          updatePersona({ id: editingId, input: submissionData });
      } else {
          createPersona(submissionData);
      }
  };

  const handleEdit = (persona: Persona) => {
      setFormData({
          name: persona.name,
          role: persona.role,
          description: persona.description,
          voice_description: persona.voice_description,
          player_name: persona.player_name,
          gender: persona.gender,
          race: persona.race,
          class_name: persona.class_name,
          level: persona.level,
          status: persona.status,
          faction: persona.faction,
          alignment: persona.alignment,
          aliases: persona.aliases
      });
      setAliasInput(persona.aliases?.join(', ') || '');
      setEditingId(persona.id);
      setIsCreating(true);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
      if(window.confirm("Are you sure? This will delete the persona and generic highlights associated with them.")) {
          deletePersona(id);
      }
  };

  const handleMergeClick = (persona: Persona) => {
      if (!mergeSource) {
          setMergeSource(persona);
      } else {
          if (mergeSource.id === persona.id) {
              setMergeSource(null); // Deselect
              return;
          }
          if (window.confirm(`Merge ${mergeSource.name} INTO ${persona.name}? This cannot be undone.`)) {
              mergePersonas({ targetId: persona.id, sourceId: mergeSource.id });
          }
      }
  };

  const resetForm = () => {
      setFormData({ name: '', role: 'NPC', description: '', voice_description: '', player_name: '' });
      setAliasInput('');
      setEditingId(null);
  };



  const filteredPersonas = personas.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.role.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-12 text-center text-slate-500">Loading Personas...</div>;

  return (
    <div className="py-8 px-8 w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
            <Link to={`/campaigns/${campaignId}`} className="text-slate-400 hover:text-white flex items-center mb-2 transition-colors">
                <ArrowLeft size={16} className="mr-2" /> Back to Campaign
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Users className="text-purple-400" />
                {campaignName}: Dramatis Personae
            </h1>
        </div>

        <div className="flex gap-4">
             <button 
                onClick={() => { setMergeMode(!mergeMode); setMergeSource(null); }}
                className={`px-4 py-2 rounded-lg font-bold flex items-center transition-all ${mergeMode ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
             >
                <GitMerge size={18} className="mr-2" />
                {mergeMode ? "Exit Merge Mode" : "Merge Personas"}
             </button>
             
             <button 
                onClick={() => { setIsCreating(!isCreating); resetForm(); }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all"
             >
                <Plus size={18} className="mr-2" />
                {isCreating ? "Cancel" : "Add Persona"}
             </button>
        </div>
      </div>

      {isCreating && (
          <div className="mb-8 bg-slate-800 border border-slate-700 rounded-xl p-6 animate-in slide-in-from-top-4">
              <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Persona' : 'New Persona'}</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Basic Info */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                          <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                          <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                          >
                              <option value="NPC">NPC</option>
                              <option value="PC">Player Character</option>
                              <option value="Villain">Villain</option>
                              <option value="Monster">Monster</option>
                          </select>
                      </div>
                  </div>

                  {/* Identity Section */}
                  <div className="md:col-span-2 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                          <Users size={14} /> Identity & Stats
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Race</label>
                              <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={formData.race || ''}
                                onChange={e => setFormData({...formData, race: e.target.value})}
                                placeholder="e.g. Elf"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                              <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={formData.gender || ''}
                                onChange={e => setFormData({...formData, gender: e.target.value})}
                                placeholder="e.g. Female"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Faction</label>
                              <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={formData.faction || ''}
                                onChange={e => setFormData({...formData, faction: e.target.value})}
                                placeholder="e.g. Harpers"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alignment</label>
                              <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={formData.alignment || ''}
                                onChange={e => setFormData({...formData, alignment: e.target.value})}
                                placeholder="e.g. Chaotic Good"
                              />
                          </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                              <select
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={formData.status || 'Alive'}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                              >
                                  <option value="Alive">Alive</option>
                                  <option value="Dead">Dead</option>
                                  <option value="Missing">Missing</option>
                                  <option value="Unknown">Unknown</option>
                              </select>
                          </div>
                      </div>
                  </div>

                  {/* PC Specifics */}
                  {formData.role === 'PC' && (
                       <div className="md:col-span-2 bg-purple-900/10 p-4 rounded-lg border border-purple-500/20">
                          <h3 className="text-sm font-bold text-purple-300 uppercase mb-3 flex items-center gap-2">
                              <Users size={14} /> Player Character Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-purple-400/70 uppercase mb-1">Player Name</label>
                                  <input 
                                    className="w-full bg-slate-800 border border-purple-500/30 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                    value={formData.player_name || ''}
                                    onChange={e => setFormData({...formData, player_name: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-purple-400/70 uppercase mb-1">Class</label>
                                  <input 
                                    className="w-full bg-slate-800 border border-purple-500/30 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                    value={formData.class_name || ''}
                                    onChange={e => setFormData({...formData, class_name: e.target.value})}
                                    placeholder="e.g. Wizard"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-purple-400/70 uppercase mb-1">Level</label>
                                  <input 
                                    type="number"
                                    className="w-full bg-slate-800 border border-purple-500/30 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                    value={formData.level || ''}
                                    onChange={e => setFormData({...formData, level: parseInt(e.target.value) || 0})}
                                    placeholder="e.g. 5"
                                  />
                              </div>
                          </div>
                      </div>
                  )}

                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                  </div>
                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Aliases (Nicknames)</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="e.g. The Big Guy, Red, Captain (comma separated)"
                        value={aliasInput}
                        onChange={e => setAliasInput(e.target.value)}
                      />
                  </div>
                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Voice Description</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="e.g. Gravelly, deep, speaks slowly"
                        value={formData.voice_description || ''}
                        onChange={e => setFormData({...formData, voice_description: e.target.value})}
                      />
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                      <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/20">
                          {editingId ? 'Save Changes' : 'Create Persona'}
                      </button>
                  </div>
              </form>
          </div>
      )}

      {/* Search & Grid */}
      <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            placeholder="Search characters by name or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
      </div>

      {/* Sections */}
      {(() => {
          const pcPersonas = filteredPersonas.filter(p => p.role === 'PC');
          const monsterPersonas = filteredPersonas.filter(p => p.role === 'Monster' || p.role === 'Villain');
          const npcPersonas = filteredPersonas.filter(p => p.role !== 'PC' && p.role !== 'Monster' && p.role !== 'Villain');

          const hasResults = filteredPersonas.length > 0;

          if (!hasResults) return null;

          return (
              <div className="space-y-12">
                  {/* PCs */}
                  {pcPersonas.length > 0 && (
                      <section>
                          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2 border-b border-purple-500/20 pb-2">
                              <Users size={20} /> Player Characters
                          </h2>
                          <MasonryGrid<Persona>
                            items={pcPersonas}
                            renderItem={(persona) => (
                                <PersonaManagerCard 
                                    key={persona.id} 
                                    persona={persona} 
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    mergeMode={mergeMode}
                                    isMergeSource={mergeSource?.id === persona.id}
                                    onMergeClick={handleMergeClick}
                                />
                            )}
                          />
                      </section>
                  )}

                  {/* NPCs */}
                  {npcPersonas.length > 0 && (
                      <section>
                          <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 border-b border-blue-500/20 pb-2">
                              <Users size={20} /> Non-Player Characters
                          </h2>
                          <MasonryGrid<Persona>
                            items={npcPersonas}
                            renderItem={(persona) => (
                                <PersonaManagerCard 
                                    key={persona.id} 
                                    persona={persona} 
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    mergeMode={mergeMode}
                                    isMergeSource={mergeSource?.id === persona.id}
                                    onMergeClick={handleMergeClick}
                                />
                            )}
                          />
                      </section>
                  )}

                  {/* Monsters */}
                  {monsterPersonas.length > 0 && (
                      <section>
                          <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2 border-b border-red-500/20 pb-2">
                              <GitMerge size={20} className="rotate-90" /> Adversaries & Monsters
                          </h2>
                          <MasonryGrid<Persona>
                              items={monsterPersonas}
                              renderItem={(persona) => (
                                  <PersonaManagerCard 
                                      key={persona.id} 
                                      persona={persona} 
                                      onEdit={handleEdit}
                                      onDelete={handleDelete}
                                      mergeMode={mergeMode}
                                      isMergeSource={mergeSource?.id === persona.id}
                                      onMergeClick={handleMergeClick}
                                  />
                              )}
                          />
                      </section>
                  )}
              </div>
          );
      })()}
      
      {filteredPersonas.length === 0 && (
          <div className="text-center py-12 text-slate-500 italic">
              No matching characters found in the archives.
          </div>
      )}
    </div>
  );
}
