import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Film } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { GenericEditableList } from '../components/common/GenericEditableList';
import { Moment } from '../types';

const API_URL = ''; 

export default function MomentList() {
    const { id } = useParams();
    const campaignId = id ? parseInt(id) : null;
    const queryClient = useQueryClient();

    const fetchMoments = async () => {
        const res = await fetch(`${API_URL}/moments/?campaign_id=${campaignId}`);
        if (!res.ok) throw new Error('Failed to fetch moments');
        return res.json();
    };

    const { data: moments = [], isLoading } = useQuery<Moment[]>({
        queryKey: ['moments', campaignId],
        queryFn: async () => {
            const data = await fetchMoments();
            return data.sort((a: Moment, b: Moment) => b.session_id - a.session_id);
        },
        enabled: !!campaignId
    });

    // TODO: Add create endpoint for moments if not exists, for now assuming /moments/
    const createMutation = useMutation({
        mutationFn: async (data: Partial<Moment>) => {
            const res = await fetch(`${API_URL}/moments/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, campaign_id: campaignId }) // Backend needs to support campaign_id inference if moment linked to session
                // Actually Moment is linked to Session. Creating a global campaign moment might be tricky without a session.
                // For now, let's assume the user selects a session OR the backend handles it.
                // The current backend Moment model links to Session. 
                // We might need to select a session in the form.
            });
            if (!res.ok) throw new Error('Failed to create moment');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moments', campaignId] })
    });

    const updateMutation = useMutation({
        mutationFn: async ({id, data}: {id: number, data: Partial<Moment>}) => {
            const res = await fetch(`${API_URL}/moments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update moment');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moments', campaignId] })
    });

    const deleteMutation = useMutation({
        mutationFn: async (moment: Moment) => {
            const res = await fetch(`${API_URL}/moments/${moment.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete moment');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moments', campaignId] })
    });

    return (
        <GenericEditableList<Moment>
            title="Key Moments"
            subTitle="Unforgettable scenes and plot twists."
            icon={<Film className="text-pink-400" />}
            backLink={`/campaigns/${campaignId}`}
            items={moments}
            getId={(item) => item.id}
            initialFormData={() => ({ title: '', description: '', type: 'funny' })}
            maxColumns={3}
            isLoading={isLoading}
            onSave={(data, id) => {
                if (id) updateMutation.mutate({ id: Number(id), data });
                else createMutation.mutate(data);
            }}
            onDelete={(item) => deleteMutation.mutate(item)}
            filterFunction={(item, filter) => item.title.toLowerCase().includes(filter.toLowerCase()) || item.description.toLowerCase().includes(filter.toLowerCase())}
            renderItem={(item, onEdit, onDelete) => (
                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl hover:bg-slate-800 transition-all group relative">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="text-slate-400 hover:text-white">Edit</button>
                        <button onClick={onDelete} className="text-red-400 hover:text-red-300">Delete</button>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                            item.type === 'funny' ? 'bg-amber-500/10 text-amber-400' :
                            item.type === 'fail' ? 'bg-red-500/10 text-red-400' :
                            item.type === 'rule_cool' ? 'bg-cyan-500/10 text-cyan-400' :
                            'bg-purple-500/10 text-purple-400'
                        }`}>
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-1">{item.title}</h3>
                                <span className="bg-slate-700 px-1.5 rounded text-[10px] uppercase border border-slate-600">{item.type}</span>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            renderForm={(formData, onChange, onSave, onCancel) => (
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                            <input 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                                value={formData?.title || ''}
                                onChange={e => onChange({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                            <select 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
                                value={formData?.type}
                                onChange={e => onChange({ ...formData, type: e.target.value })}
                            >
                                <option value="highlight">Highlight</option>
                                <option value="funny">Funny</option>
                                <option value="fail">Epic Fail</option>
                                <option value="rule_cool">Rule of Cool</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                        <textarea 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none min-h-[100px]"
                            value={formData?.description || ''}
                            onChange={e => onChange({ ...formData, description: e.target.value })}
                        />
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
