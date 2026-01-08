import React, { useState } from 'react';
import { Sparkles, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Moment } from '../../types';

interface MomentListProps {
    moments: Moment[];
}

export default function MomentList({ moments }: MomentListProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!moments || moments.length === 0) return null;

    return (
        <div className="mb-12 animate-in fade-in duration-500 delay-150">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between group mb-6 focus:outline-none"
            >
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 group-hover:text-purple-300 transition-colors">
                    <Sparkles className="text-yellow-400 group-hover:text-purple-300 transition-colors" /> Key Moments
                </h2>
                <div className={`p-1 rounded-full hover:bg-slate-700 transition-colors ${!isExpanded && 'rotate-180'}`}>
                    {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </div>
            </button>
            
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {moments.map((moment) => (
                        <div 
                            key={moment.id} 
                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800 transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-yellow-100 group-hover:text-yellow-300 transition-colors line-clamp-2">
                                    {moment.title}
                                </h3>
                                <span className="text-xs font-mono uppercase bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">
                                    {moment.type || 'Moment'}
                                </span>
                            </div>
                            
                            <p className="text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                                {moment.description}
                            </p>
                            
                            {moment.session_name && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-4 border-t border-slate-700/50">
                                    <Calendar size={12} />
                                    <span>{moment.session_name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
