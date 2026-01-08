import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, FileText, Mic, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DELETE_SESSION } from '../../graphql/mutations';
import { Session } from '../../types';
import { request } from '../../utils/graphql';

interface SessionListProps {
    sessions: Session[];
    campaignId: number;
}

export default function SessionList({ sessions, campaignId }: SessionListProps) {
    const [expanded, setExpanded] = useState(true);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { mutate: deleteSession } = useMutation({
        mutationFn: async (sessionId: number) => {
            return request(DELETE_SESSION, { id: sessionId });
        },
        onSuccess: () => {
             // Invalidate the campaign dashboard query
             queryClient.invalidateQueries({ queryKey: ['campaign-dashboard', campaignId] });
        },
        onError: (err) => {
            console.error(err);
            alert("Failed to delete session");
        }
    });

    const handleDelete = async (sessionId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!window.confirm("Delete this session? This cannot be undone.")) return;
        deleteSession(sessionId);
    };

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
                    <h2 className="text-2xl font-bold text-white">Sessions</h2>
                </div>
                <div className="text-sm text-slate-400">{sessions.length} recorded</div>
            </div>

            {expanded && (
                <div className="animate-in slide-in-from-top-2 text-left">
                    {sessions.length === 0 ? (
                        <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-12 text-center text-slate-500">
                            <p className="mb-4">No tales have been told yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map(session => (
                                <div 
                                key={session.id}
                                onClick={() => navigate(`/campaigns/${campaignId}/sessions/${session.id}`)}
                                className="group bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between hover:border-purple-500/50 hover:bg-slate-800/80 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${session.status === 'completed' ? 'bg-green-900/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {session.audio_file_paths ? <Mic size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{session.name}</h3>
                                            {session.summary && (
                                                <p className="text-slate-400 text-sm mb-2 line-clamp-2 max-w-2xl">
                                                    {session.summary}
                                                </p>
                                            )}
                                            <div className="flex gap-2 text-xs text-slate-500">
                                                <span>{new Date(session.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span className="uppercase">{session.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(session.id, e)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete Session"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
