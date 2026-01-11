import { useState, memo } from 'react';
import { X, TrendingUp, TrendingDown, Quote, Pencil, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Persona, Highlight, Quote as QuoteType } from '../types';
import { parseListString } from '../utils/stringUtils';

interface PersonaDetailsModalProps {
    persona: Persona;
    onClose: () => void;
    onEditItem: (item: Highlight | QuoteType) => void;
    onDeleteItem: (item: Highlight | QuoteType) => void;
    onUpdatePersona?: (id: number, updates: Partial<Persona>) => void;
}

const PersonaDetailsModal = memo(function PersonaDetailsModal({ persona, onClose, onEditItem, onDeleteItem, onUpdatePersona }: PersonaDetailsModalProps) {
    const [newAlias, setNewAlias] = useState('');

    const handleAddAlias = () => {
        if (!newAlias.trim()) return;
        const currentAliases = persona.aliases || [];
        if (currentAliases.includes(newAlias.trim())) {
            setNewAlias('');
            return;
        }
        
        onUpdatePersona?.(persona.id, {
            aliases: [...currentAliases, newAlias.trim()]
        });
        setNewAlias('');
    };

    const handleRemoveAlias = (aliasToRemove: string) => {
        const currentAliases = persona.aliases || [];
        onUpdatePersona?.(persona.id, {
            aliases: currentAliases.filter(a => a !== aliasToRemove)
        });
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-start">
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-white">{persona.name}</h2>
                            <span className={`text-xs px-2 py-1 rounded-md uppercase font-bold ${persona.role === 'PC' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                {persona.role}
                            </span>
                        </div>
                        {persona.voice_description && (
                            <p className="text-sm text-purple-300/80 italic mb-2">"{persona.voice_description}"</p>
                        )}
                        
                        {/* Aliases Section */}
                        <div className="flex flex-wrap gap-2 items-center mt-3">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">Aliases:</span>
                            {persona.aliases?.map(alias => (
                                <span key={alias} className="inline-flex items-center text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                    {alias}
                                    {onUpdatePersona && (
                                        <button onClick={() => handleRemoveAlias(alias)} className="ml-1 hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    )}
                                </span>
                            ))}
                            {onUpdatePersona && (
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="text" 
                                        value={newAlias}
                                        onChange={(e) => setNewAlias(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                                        placeholder="Add alias..."
                                        className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 text-white focus:outline-none focus:border-purple-500 w-24"
                                    />
                                    <button onClick={handleAddAlias} className="text-slate-400 hover:text-green-400">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        </div>
                        <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                            <X size={20} />
                        </button>
                </div>
                
                <div className="p-4 md:p-8 space-y-8">
                    {/* Description */}
                    <div className="prose prose-invert prose-slate max-w-none">
                        <ReactMarkdown>{persona.description}</ReactMarkdown>
                    </div>

                    {/* Extended Details Passport */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        {persona.race && (
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Race</span>
                                <span className="text-white font-medium">{persona.race}</span>
                            </div>
                        )}
                        {persona.gender && (
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Gender</span>
                                <span className="text-white font-medium">{persona.gender}</span>
                            </div>
                        )}
                        {(persona.role === 'PC' || persona.role === 'NPC') && (
                            <>
                                {persona.faction && (
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Faction</span>
                                        <span className="text-white font-medium">{persona.faction}</span>
                                    </div>
                                )}
                                {persona.alignment && (
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Alignment</span>
                                        <span className="text-white font-medium">{persona.alignment}</span>
                                    </div>
                                )}
                                {persona.status && (
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Status</span>
                                        <span className={`font-medium ${persona.status.toLowerCase() === 'dead' ? 'text-red-400' : 'text-green-400'}`}>{persona.status}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {persona.role === 'PC' && (
                            <>
                                {persona.class_name && (
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Class</span>
                                        <span className="text-white font-medium">{persona.class_name} {persona.level ? `Lv.${persona.level}` : ''}</span>
                                    </div>
                                )}
                                {persona.player_name && (
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">Player</span>
                                        <span className="text-purple-400 font-medium">{persona.player_name}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Determine Data Source */}
                    {(() => {
                        // Normalize High/Low Points
                        // Precedence: highlights_list (Explicit REST) -> highlights (GraphQL Array) -> Legacy string parsing
                        const rawHighlights = persona.highlights_list || (Array.isArray(persona.highlights) ? persona.highlights : null);
                        const hasStructuredHighlights = !!rawHighlights;
                        
                        // If structured, we filter. If not, we parse legacy strings.
                        const highPoints = hasStructuredHighlights 
                            ? rawHighlights.filter(h => h.type !== 'low') 
                            : parseListString(persona.highlights as string);
                            
                        const lowPoints = hasStructuredHighlights 
                            ? rawHighlights.filter(h => h.type === 'low')
                            : parseListString(persona.low_points as string);

                        // Normalize Quotes
                        const rawQuotes = persona.quotes_list || (Array.isArray(persona.quotes) ? persona.quotes : null);
                        const hasStructuredQuotes = !!rawQuotes;
                        
                        const quotes = hasStructuredQuotes
                             ? rawQuotes
                             : parseListString(persona.memorable_quotes as string);

                        return (
                            <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {highPoints.length > 0 && (
                                        <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                                                <TrendingUp size={14} /> HIGHLIGHTS
                                            </h4>
                                            <ul className="list-disc pl-5 space-y-2 text-green-200/80 text-sm">
                                                {hasStructuredHighlights ? (
                                                    (highPoints as Highlight[]).map((h) => (
                                                        <li key={h.id} className="group/item relative pr-8 flex justify-between items-start">
                                                            {h.name ? (
                                                                <span><span className="font-bold text-green-300">{h.name}</span> {h.text.charAt(0).toLowerCase() + h.text.slice(1)}</span>
                                                            ) : (
                                                                <span>{h.text}</span>
                                                            )}
                                                            <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                                <button onClick={(e) => { e.stopPropagation(); onEditItem(h); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); onDeleteItem(h); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                            </div>
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
                                    
                                    {lowPoints.length > 0 && (
                                        <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                                                <TrendingDown size={14} /> LOW POINTS
                                            </h4>
                                            <ul className="list-disc pl-5 space-y-2 text-red-200/80 text-sm">
                                                {hasStructuredHighlights ? (
                                                    (lowPoints as Highlight[]).map((h) => (
                                                        <li key={h.id} className="group/item relative pr-8 flex justify-between items-start">
                                                             {h.name ? (
                                                                <span><span className="font-bold text-red-300">{h.name}</span> {h.text.charAt(0).toLowerCase() + h.text.slice(1)}</span>
                                                            ) : (
                                                                <span>{h.text}</span>
                                                            )}
                                                            <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                                <button onClick={(e) => { e.stopPropagation(); onEditItem(h); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); onDeleteItem(h); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                            </div>
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
                                </div>

                                {/* Quotes */}
                                {quotes.length > 0 && (
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 italic relative overflow-hidden">
                                        <Quote className="absolute top-4 right-4 text-slate-700/20" size={64} />
                                        <h4 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 not-italic relative z-10">
                                            <Quote size={14} /> MEMORABLE QUOTES
                                        </h4>
                                        <div className="space-y-4 relative z-10">
                                                {hasStructuredQuotes ? (
                                                (quotes as QuoteType[]).map((q) => (
                                                    <div key={q.id} className="pl-4 border-l-2 border-purple-500/30 text-slate-300 group/item relative pr-8 flex justify-between items-start">
                                                        <span>"{q.text}" {q.speaker_name ? `- ${q.speaker_name}` : ''}</span>
                                                        <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                            <button onClick={(e) => { e.stopPropagation(); onEditItem(q); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); onDeleteItem(q); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                ))
                                                ) : (
                                                    (quotes as string[]).map((line, i) => (
                                                    <div key={i} className="pl-4 border-l-2 border-purple-500/30 text-slate-300">
                                                        "{line.replace(/^\[.*?\] /, '')}"
                                                    </div>
                                                ))
                                                )}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
});

export default PersonaDetailsModal;
