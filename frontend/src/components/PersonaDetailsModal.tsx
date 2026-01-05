import React from 'react';
import { X, TrendingUp, TrendingDown, Quote, Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Persona, Highlight, Quote as QuoteType } from '../types';

interface PersonaDetailsModalProps {
    persona: Persona;
    onClose: () => void;
    onEditItem: (item: Highlight | QuoteType) => void;
    onDeleteItem: (item: Highlight | QuoteType) => void;
}

export default function PersonaDetailsModal({ persona, onClose, onEditItem, onDeleteItem }: PersonaDetailsModalProps) {
    
    // Helper helper for list parsing (duplicated for now to avoid large refactor, or we can move to utils)
    // Ideally should be imported. For speed, I'll include it here or let's create a utils file next.
    const parseListString = (content: string): string[] => {
        if (!content) return [];
        const trimmed = content.trim();
    
        // Check for Python-style list string: ['Item 1', 'Item 2']
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const inner = trimmed.substring(1, trimmed.length - 1);
            // Robust regex to match single or double quoted strings, handling escaped quotes
            const matches = [...inner.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)];
            
            if (matches.length > 0) {
                return matches.map(m => {
                    // Remove surrounding quotes and unescape
                    return m[0].slice(1, -1).replace(/\\(['"])/g, '$1');
                });
            }
            
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                // Ignore
            }
          } catch (e) {
            console.warn("Failed to parse list string", e);
          }
        }
        
        return content.split('\n');
      };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-start">
                        <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-white">{persona.name}</h2>
                            <span className={`text-xs px-2 py-1 rounded-md uppercase font-bold ${persona.role === 'PC' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                {persona.role}
                            </span>
                        </div>
                        {persona.voice_description && (
                            <p className="text-sm text-purple-300/80 italic">"{persona.voice_description}"</p>
                        )}
                        </div>
                        <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                            <X size={20} />
                        </button>
                </div>
                
                <div className="p-8 space-y-8">
                    {/* Description */}
                    <div className="prose prose-invert prose-slate max-w-none">
                        <ReactMarkdown>{persona.description}</ReactMarkdown>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(persona.highlights_list && persona.highlights_list.length > 0) || persona.highlights ? (
                            <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                                    <TrendingUp size={14} /> HIGHLIGHTS
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-green-200/80 text-sm">
                                    {persona.highlights_list ? (
                                        persona.highlights_list.filter(h => h.type !== 'low').map((h) => (
                                            <li key={h.id} className="group/item relative pr-8 flex justify-between items-start">
                                                <span>{h.text}</span>
                                                <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditItem(h); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteItem(h); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                </div>
                                            </li>
                                        ))
                                    ) : (
                                        parseListString(persona.highlights!).map((line, i) => (
                                            <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        ) : null}
                        
                        {(persona.highlights_list && persona.highlights_list.length > 0) || persona.low_points ? (
                            <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                                    <TrendingDown size={14} /> LOW POINTS
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-red-200/80 text-sm">
                                    {persona.highlights_list ? (
                                        persona.highlights_list.filter(h => h.type === 'low').map((h) => (
                                            <li key={h.id} className="group/item relative pr-8 flex justify-between items-start">
                                                <span>{h.text}</span>
                                                <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditItem(h); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteItem(h); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                </div>
                                            </li>
                                        ))
                                    ) : (
                                        parseListString(persona.low_points!).map((line, i) => (
                                            <li key={i}>{line.replace(/^\[.*?\] /, '')}</li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        ) : null}
                    </div>

                        {(persona.quotes_list && persona.quotes_list.length > 0) || persona.memorable_quotes ? (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 italic relative overflow-hidden">
                            <Quote className="absolute top-4 right-4 text-slate-700/20" size={64} />
                            <h4 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 not-italic relative z-10">
                                <Quote size={14} /> MEMORABLE QUOTES
                            </h4>
                            <div className="space-y-4 relative z-10">
                                    {persona.quotes_list ? (
                                    persona.quotes_list.map((q) => (
                                        <div key={q.id} className="pl-4 border-l-2 border-purple-500/30 text-slate-300 group/item relative pr-8 flex justify-between items-start">
                                            "{q.text}" {q.speaker_name ? `- ${q.speaker_name}` : ''}
                                            <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-0 top-0 bg-slate-900/90 rounded px-2">
                                                <button onClick={(e) => { e.stopPropagation(); onEditItem(q); }} className="text-slate-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteItem(q); }} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    ))
                                    ) : (
                                        parseListString(persona.memorable_quotes!).map((line, i) => (
                                        <div key={i} className="pl-4 border-l-2 border-purple-500/30 text-slate-300">
                                            "{line.replace(/^\[.*?\] /, '')}"
                                        </div>
                                    ))
                                    )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
