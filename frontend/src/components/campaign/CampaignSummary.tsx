import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Mic, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GENERATE_CAMPAIGN_SUMMARY } from '../../graphql/mutations';
import { Campaign } from '../../types';
import { request } from '../../utils/graphql';

interface CampaignSummaryProps {
    campaign: Campaign;
}

export default function CampaignSummary({ campaign }: CampaignSummaryProps) {
    const [expanded, setExpanded] = useState(true);
    const queryClient = useQueryClient();

    const { mutate: generateSummary, isPending: isGeneratingSummary } = useMutation({
        mutationFn: async () => {
            return request(GENERATE_CAMPAIGN_SUMMARY, { id: campaign.id });
        },
        onSuccess: () => {
            alert("Scribes are chronicling the saga... check back in a few moments!");
            // Poll or wait for update
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
                // Also invalidate dashboard if that's the key
                queryClient.invalidateQueries({ queryKey: ['campaign-dashboard', campaign.id] });
            }, 3000);
        },
        onError: (err) => {
            console.error(err);
            alert("Failed to start summary generation.");
        }
    });

    return (
        <section className="mb-8 bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden text-left">
            <div 
                className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-800/60 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
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
            
            {expanded && (
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
    );
}
