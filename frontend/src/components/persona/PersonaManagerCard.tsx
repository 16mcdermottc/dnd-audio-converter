import { Pencil, Quote, Scroll, Shield, Trash2, TrendingDown, TrendingUp, User } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import { Persona } from '../../types';

interface PersonaManagerCardProps {
  persona: Persona;
  onEdit: (p: Persona) => void;
  onDelete: (id: number) => void;
  mergeMode: boolean;
  isMergeSource: boolean;
  onMergeClick: (p: Persona) => void;
}

export default function PersonaManagerCard({ persona, onEdit, onDelete, mergeMode, isMergeSource, onMergeClick }: PersonaManagerCardProps) {
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

        {/* Stats / Passport Section */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            {/* Common Fields */}
            {persona.race && (
                <div className="bg-slate-900/30 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Race</span>
                    <span className="text-slate-300 font-medium">{persona.race}</span>
                </div>
            )}
             {persona.gender && (
                <div className="bg-slate-900/30 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Gender</span>
                    <span className="text-slate-300 font-medium">{persona.gender}</span>
                </div>
            )}
            
            {/* PC Specific */}
            {isPC && (
                <>
                    {persona.class_name && (
                        <div className="bg-slate-900/30 p-2 rounded">
                             <span className="text-slate-500 block text-[10px] uppercase">Class</span>
                             <span className="text-slate-300 font-medium">{persona.class_name} {persona.level ? `Lv.${persona.level}` : ''}</span>
                        </div>
                    )}
                </>
            )}

            {/* Shared Context Fields */}
            {persona.faction && (
                <div className="bg-slate-900/30 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Faction</span>
                    <span className="text-slate-300 font-medium">{persona.faction}</span>
                </div>
            )}
             {persona.alignment && (
                <div className="bg-slate-900/30 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Alignment</span>
                    <span className="text-slate-300 font-medium">{persona.alignment}</span>
                </div>
            )}
             {persona.status && (
                <div className="bg-slate-900/30 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Status</span>
                    <span className={`font-medium ${persona.status.toLowerCase() === 'dead' ? 'text-red-400' : 'text-slate-300'}`}>{persona.status}</span>
                </div>
            )}
        </div>

        {/* Aliases Section */}
        {persona.aliases && persona.aliases.length > 0 && (
            <div className="mb-4">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Aliases</span>
                 <div className="flex flex-wrap gap-2">
                    {persona.aliases.map(alias => (
                        <span key={alias} className="inline-flex items-center text-xs bg-black/20 text-slate-300 px-2 py-1 rounded border border-white/10">
                            {alias}
                        </span>
                    ))}
                 </div>
            </div>
        )}

        {/* Structured Highlights */}
        {persona.highlights_list && persona.highlights_list.length > 0 && (
             <div className="space-y-3 mt-4 pt-4 border-t border-slate-700/50">
                {persona.highlights_list.some(h => h.type === 'high') && (
                    <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                            <TrendingUp size={12} /> HIGHLIGHTS
                        </h4>
                        <ul className="text-xs text-green-200/80 list-disc pl-4 space-y-1">
                            {persona.highlights_list.filter(h => h.type === 'high').map((h, i) => (
                                <li key={h.id || i}>{h.text}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {persona.highlights_list.some(h => h.type === 'low') && (
                    <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                            <TrendingDown size={12} /> LOW POINTS
                        </h4>
                        <ul className="text-xs text-red-200/80 list-disc pl-4 space-y-1">
                            {persona.highlights_list.filter(h => h.type === 'low').map((h, i) => (
                                <li key={h.id || i}>{h.text}</li>
                            ))}
                        </ul>
                    </div>
                )}
             </div>
        )}

        {/* Structured Quotes */}
        {persona.quotes_list && persona.quotes_list.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 italic mt-3">
                <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1 not-italic">
                    <Quote size={12} /> QUOTES
                </h4>
                <div className="space-y-2 text-xs text-slate-400">
                    {persona.quotes_list.map((q, i) => (
                        <p key={q.id || i}>
                            &quot;{q.text}&quot;
                        </p>
                    ))}
                </div>
            </div>
        )}


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
