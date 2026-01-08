import { ChevronDown, ChevronRight, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { Persona } from '../../types';

interface PersonaSectionProps {
    personas: Persona[];
    onSelectPersona: (id: number) => void;
}

export default function PersonaSection({ personas, onSelectPersona }: PersonaSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [expandedPCs, setExpandedPCs] = useState(true);
    const [expandedNPCs, setExpandedNPCs] = useState(true);
    const [expandedMonsters, setExpandedMonsters] = useState(true);

    const pcPersonas = personas.filter(p => p.role === 'PC');
    const monsterPersonas = personas.filter(p => p.role === 'Monster' || p.role === 'Villain');
    const npcPersonas = personas.filter(p => p.role !== 'PC' && p.role !== 'Monster' && p.role !== 'Villain');

    return (
        <section className="mb-8">
             <div 
                className="flex items-center justify-between mb-6 cursor-pointer group"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="text-slate-400 group-hover:text-white transition-colors">
                        {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white">Dramatis Personae</h2>
                </div>
                <div className="text-sm text-slate-400">{personas.length} characters</div>
            </div>
            
            {expanded && (
                <div className="animate-in slide-in-from-top-2 text-left">
                    {personas.length === 0 ? (
                        <div className="text-slate-500 text-sm italic">No characters discovered yet.</div>
                    ) : (
                        <>
                            {/* Player Characters */}
                            {pcPersonas.length > 0 && (
                                <div className="mb-8">
                                    <h2 
                                        className="text-xl font-bold text-white mb-6 flex items-center gap-3 cursor-pointer hover:text-purple-300 transition-colors"
                                        onClick={() => setExpandedPCs(!expandedPCs)}
                                    >
                                        <div className="text-slate-400">
                                            {expandedPCs ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <User className="text-purple-400" size={20} />
                                        <span>Player Characters</span>
                                    </h2>
                                    
                                    {expandedPCs && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                            {pcPersonas.map(persona => (
                                                <PersonaCard 
                                                    key={persona.id} 
                                                    persona={persona} 
                                                    onClick={() => onSelectPersona(persona.id)} 
                                                    colorClass="purple"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NPCs Section */}
                            {npcPersonas.length > 0 && (
                                <div className="mb-4">
                                    <h2 
                                        className="text-xl font-bold text-white mb-6 flex items-center gap-3 cursor-pointer hover:text-blue-300 transition-colors"
                                        onClick={() => setExpandedNPCs(!expandedNPCs)}
                                    >
                                        <div className="text-slate-400">
                                            {expandedNPCs ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <User className="text-blue-400" size={20} />
                                        <span>Non-Player Characters</span>
                                    </h2>

                                    {expandedNPCs && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                            {npcPersonas.map(persona => (
                                                <PersonaCard 
                                                    key={persona.id} 
                                                    persona={persona} 
                                                    onClick={() => onSelectPersona(persona.id)} 
                                                    colorClass="blue"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Monsters & Villains */}
                            {monsterPersonas.length > 0 && (
                                <div className="mb-8">
                                    <h2 
                                        className="text-xl font-bold text-white mb-6 flex items-center gap-3 cursor-pointer hover:text-red-300 transition-colors"
                                        onClick={() => setExpandedMonsters(!expandedMonsters)}
                                    >
                                        <div className="text-slate-400">
                                            {expandedMonsters ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                        <Shield className="text-red-500" size={20} />
                                        <span>Monsters</span>
                                    </h2>
                                    
                                    {expandedMonsters && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                            {monsterPersonas.map(persona => (
                                                <PersonaCard 
                                                    key={persona.id} 
                                                    persona={persona} 
                                                    onClick={() => onSelectPersona(persona.id)} 
                                                    colorClass="red"
                                                />
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
    );
}

function PersonaCard({ persona, onClick, colorClass }: { persona: Persona, onClick: () => void, colorClass: string }) {

    let borderColor = 'hover:border-blue-500/50';
    let textColor = 'group-hover:text-blue-400';
    let bgBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    if (colorClass === 'purple') {
        borderColor = 'hover:border-purple-500/50';
        textColor = 'group-hover:text-purple-400';
        bgBadge = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    } else if (colorClass === 'red') {
        borderColor = 'hover:border-red-500/50';
        textColor = 'group-hover:text-red-400';
        bgBadge = 'bg-red-500/10 text-red-400 border-red-500/20';
    }

    return (
        <div 
            onClick={onClick}
            className={`bg-slate-800 rounded-xl p-6 border border-slate-700 ${borderColor} hover:bg-slate-750 transition-all cursor-pointer group relative overflow-hidden`}
        >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <User size={64} />
            </div>
            
            <div className="relative z-10">
                <h3 className={`text-xl font-bold text-white mb-1 ${textColor} transition-colors`}>{persona.name}</h3>
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-4 border ${bgBadge}`}>
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
    );
}
