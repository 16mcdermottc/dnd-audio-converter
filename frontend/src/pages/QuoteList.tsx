import { useEffect, useState } from 'react';
import axios from 'axios';
import { Quote, Search, User, Shield, MessageSquare } from 'lucide-react';
import { Persona } from '../types';

interface QuoteItem {
    id: string;
    persona: Persona;
    context: string | null;
    text: string;
}

export default function QuoteList() {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
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
        fetchPersonas();
    }, []);

    // Extract all quotes from all personas
    const allQuotes: QuoteItem[] = personas.flatMap(persona => {
        if (!persona.memorable_quotes) return [];
        return persona.memorable_quotes.split('\n')
            .filter(line => line.trim())
            .flatMap(line => {
                const match = line.match(/^\[(.*?)\] (.*)$/);
                let context = null;
                let content = line;
                
                if (match) {
                    context = match[1];
                    content = match[2];
                }

                let items = [content];

                // Attempt to parse python-style list string: "['Item 1', 'Item 2']"
                // Check if it starts/ends with brackets and looks like a list
                if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
                    const inner = content.trim().slice(1, -1);
                    // Match quoted strings. Captures single or double quoted strings.
                    const listMatch = [...inner.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g)];
                    if (listMatch.length > 0) {
                        items = listMatch.map(m => {
                             // Remove surrounding quotes and unescape
                             return m[0].slice(1, -1).replace(/\\(['"])/g, '$1');
                        });
                    }
                }

                return items.map(text => ({
                    id: Math.random().toString(36).substr(2, 9), // Temp ID
                    persona: persona,
                    context,
                    // Clean up specific raw text issues if they persist (outer quotes etc)
                    text: text.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '') 
                }));
            });
    });

    const filteredQuotes = allQuotes.filter(q => 
        q.text.toLowerCase().includes(filter.toLowerCase()) || 
        q.persona.name.toLowerCase().includes(filter.toLowerCase()) ||
        (q.context && q.context.toLowerCase().includes(filter.toLowerCase()))
    );

    if (loading) return <div className="p-12 text-center text-slate-500">Listening to whispers...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
             <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Quote className="text-purple-400" />
                    <span>Echoes of the Realm</span>
                </h2>
                <p className="text-slate-400 mb-6">Memorable words spoken by friends and foes alike.</p>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search quotes or speakers..." 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </header>

            <div className="space-y-4">
                {filteredQuotes.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 italic">
                        No words match your search.
                    </div>
                ) : (
                    filteredQuotes.map((quote) => (
                        <div key={quote.id} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl hover:bg-slate-800 hover:border-purple-500/30 transition-all group">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 mt-1">
                                    <MessageSquare size={20} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
                                </div>
                                <div className="flex-1">
                                    {quote.context && (
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                                            {quote.context}
                                        </div>
                                    )}
                                    <p className="text-lg text-slate-200 italic mb-3 font-serif leading-relaxed">
                                        "{quote.text.replace(/^"|"$/g, '')}"
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded uppercase ${
                                            quote.persona.role === 'PC' 
                                            ? 'bg-purple-900/30 text-purple-300 border border-purple-500/20' 
                                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                                        }`}>
                                            {quote.persona.role === 'PC' ? <Shield size={10} /> : <User size={10} />}
                                            {quote.persona.role}
                                        </span>
                                        <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                                            — {quote.persona.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
