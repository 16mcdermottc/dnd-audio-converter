import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquare, Quote, Search, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Persona } from '../types';
import { request } from '../utils/graphql';
import { GET_CAMPAIGN_PERSONAS } from '../graphql/queries';
import { MasonryGrid } from '../components/common/MasonryGrid';

interface QuoteItem {
    id: string;
    persona: Persona;
    context: string | null;
    text: string;
    session_id: number;
}

export default function QuoteList() {
    const { id } = useParams();
    const campaignId = id ? parseInt(id) : null;
    const [filter, setFilter] = useState('');

    const { data: personas = [], isLoading } = useQuery<Persona[]>({
        queryKey: ['personas', campaignId],
        queryFn: async () => {
             if (campaignId) {
                 const data = await request<{ campaign: { personas: Persona[] } }>(GET_CAMPAIGN_PERSONAS, { id: campaignId });
                 return data.campaign?.personas || [];
             } 
             return []; // No global view for now, or implement global GraphQL query later
        },
        enabled: !!campaignId // Only fetch if we have a campaign
    });

    // Extract quotes from personas
    const allQuotes: QuoteItem[] = personas.flatMap(persona => {
        const quotes: QuoteItem[] = [];

        // 1. New Relational Quotes (GraphQL)
        // @ts-expect-error - Runtime check for mixed data types
        if (persona.quotes && Array.isArray(persona.quotes)) {
            // @ts-expect-error
            persona.quotes.forEach((q: any) => {
                quotes.push({
                    id: `q-${q.id}`,
                    persona: persona,
                    context: null,
                    text: q.text,
                    session_id: q.session_id || 0 // Default to 0 if missing, though it should be there
                });
            });
        }
        
        return quotes;
    }).sort((a, b) => b.session_id - a.session_id); // Sort by session_id descending (newest first)

    const filteredQuotes = allQuotes.filter(q => 
        q.text.toLowerCase().includes(filter.toLowerCase()) || 
        q.persona.name.toLowerCase().includes(filter.toLowerCase()) ||
        (q.context && q.context.toLowerCase().includes(filter.toLowerCase()))
    );

    if (isLoading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>;

    if (!campaignId) {
        return (
            <div className="p-12 text-center text-slate-500">
                Please select a campaign to view quotes.
            </div>
        );
    }

    return (
        <div className="py-8 px-8 w-full mx-auto">
             <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Quote className="text-purple-400" />
                    <span>Echoes of the Realm</span>
                </h2>
                <p className="text-slate-400 mb-6">Memorable words spoken by friends and foes alike.</p>
                <div className="inline-block bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-purple-500/30">Current Campaign</div>

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

            <div className="mt-8">
                {filteredQuotes.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 italic">
                        No words match your search.
                    </div>
                ) : (
                    <MasonryGrid<QuoteItem>
                        items={filteredQuotes}
                        maxColumns={4}
                        renderItem={(quote) => (
                            <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl hover:bg-slate-800 hover:border-purple-500/30 transition-all group h-full">
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
                        )}
                    />
                )}
            </div>
        </div>
    );
}
