import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, FileAudio } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GenericEditableList } from '../components/common/GenericEditableList';
import { Session } from '../types';

const API_URL = ''; 

export default function SessionList() {
    const { id } = useParams();
    const campaignId = id ? parseInt(id) : null;
    const queryClient = useQueryClient();

    const fetchSessions = async () => {
        const res = await fetch(`${API_URL}/sessions/?campaign_id=${campaignId}`);
        if (!res.ok) throw new Error('Failed to fetch sessions');
        return res.json();
    };

    const { data: sessions = [], isLoading } = useQuery<Session[]>({
        queryKey: ['sessions', campaignId],
        queryFn: fetchSessions,
        enabled: !!campaignId
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<Session>) => {
             // Creating a session manually usually requires file upload. 
             // This simple create might just create a placeholder or we might redirect to upload page.
             // For now, let's allow creating a "Manual Session" (e.g. for text import later).
            const res = await fetch(`${API_URL}/sessions/`, { // Check if POST /sessions/ exists in router for simple creation
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, campaign_id: campaignId })
            });
            if (!res.ok) throw new Error('Failed to create session');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', campaignId] })
    });

    const updateMutation = useMutation({
        mutationFn: async ({id, data}: {id: number, data: Partial<Session>}) => {
            // Check if PUT /sessions/{id} exists
            const res = await fetch(`${API_URL}/sessions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update session');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', campaignId] })
    });

    const deleteMutation = useMutation({
        mutationFn: async (session: Session) => {
            const res = await fetch(`${API_URL}/sessions/${session.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete session');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', campaignId] })
    });

    return (
        <GenericEditableList<Session>
            title="Sessions"
            subTitle="Archives of your past adventures."
            icon={<Calendar className="text-blue-400" />}
            backLink={`/campaigns/${campaignId}`}
            items={sessions}
            getId={(item) => item.id}
            initialFormData={() => ({ name: '', status: 'uploaded' })} // Default status
            isLoading={isLoading}
            onSave={(data, id) => {
                // If creating, we might want to suggest going to Upload Page instead?
                // But user asked for ability to edit items.
                if (id) updateMutation.mutate({ id: Number(id), data });
                else createMutation.mutate(data);
            }}
            onDelete={(item) => deleteMutation.mutate(item)}
            filterFunction={(item, filter) => item.name.toLowerCase().includes(filter.toLowerCase())}
            renderItem={(item, onEdit, onDelete) => (
                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl hover:bg-slate-800 transition-all group relative">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="text-slate-400 hover:text-white">Edit</button>
                        <button onClick={onDelete} className="text-red-400 hover:text-red-300">Delete</button>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FileAudio size={20} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                item.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                                item.status === 'processing' ? 'bg-amber-900/30 text-amber-400' :
                                'bg-slate-700 text-slate-400'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                        <h3 className="font-bold text-xl text-white mb-1">{item.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-700/50 mt-auto">
                        <Link to={`/campaigns/${campaignId}/sessions/${item.id}`} className="block w-full bg-slate-700 hover:bg-slate-600 text-center py-2 rounded-lg text-sm font-bold text-white transition-colors">
                            View Details
                        </Link>
                    </div>
                </div>
            )}
            renderForm={(formData, onChange, onSave, onCancel) => (
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Session Name</label>
                        <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                            value={formData?.name || ''}
                            onChange={e => onChange({ ...formData, name: e.target.value })}
                        />
                    </div>
                    {!formData?.id && (
                        <div className="bg-blue-900/20 text-blue-200 text-sm p-4 rounded-lg border border-blue-500/20">
                            <strong>Note:</strong> Creating a session here creates a placeholder. To upload audio, use the Upload page.
                        </div>
                    )}
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                            value={formData?.status || 'uploaded'}
                            onChange={e => onChange({ ...formData, status: e.target.value })}
                        >
                            <option value="uploaded">Uploaded</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="error">Error</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={onSave} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold">Save</button>
                    </div>
                </div>
            )}
        />
    );
}
