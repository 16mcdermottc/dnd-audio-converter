import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Book, Plus, Loader2, Map, Trash2 } from 'lucide-react';
import { Campaign } from '../types';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/campaigns/');
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await axios.post('/api/campaigns/', {
        name: newCampaignName,
        description: "A new adventure begins..."
      });
      setCampaigns([...campaigns, res.data]);
      setShowForm(false);
      setNewCampaignName('');
    } catch (err) {
      console.error(err);
      alert("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This will delete all associated sessions and personas.")) return;
    
    try {
        await axios.delete(`/api/campaigns/${id}`);
        setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
        console.error(err);
        alert("Failed to delete campaign");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 text-center">
         <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Campaign Manager
         </h1>
         <p className="text-slate-400 text-lg">Choose your world, Dungeon Master.</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
           <Loader2 className="animate-spin text-purple-500" size={48} />
        </div>
      ) : (
        <div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Card */}
              <div 
                 onClick={() => setShowForm(true)}
                 className="cursor-pointer bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center hover:border-purple-500/50 hover:bg-slate-800 transition-all group min-h-[200px]"
              >
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-purple-900/20 transition-colors">
                      <Plus className="text-slate-500 group-hover:text-purple-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 group-hover:text-white">Create New Campaign</h3>
              </div>

              {/* Campaign Cards */}
              {campaigns.map(campaign => (
                <Link to={`/campaigns/${campaign.id}`} key={campaign.id} className="block">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-900/10 h-full flex flex-col group relative">
                        <button
                            onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                handleDelete(campaign.id);
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                            title="Delete Campaign"
                        >
                            <Trash2 size={18} />
                        </button>
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-purple-900/20 rounded-lg">
                                <Map className="text-purple-400" size={24} />
                            </div>
                            <span className="text-xs text-slate-500 font-mono">ID: {campaign.id}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{campaign.name}</h3>
                        <p className="text-slate-400 text-sm line-clamp-2">{campaign.description}</p>
                        
                        <div className="mt-auto pt-4 flex items-center text-sm text-slate-500">
                             <Book size={14} className="mr-2" />
                             <span>Open Campaign</span>
                        </div>
                    </div>
                </Link>
              ))}
           </div>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">Start a New Campaign</h2>
                <form onSubmit={handleCreate}>
                    <div className="mb-6">
                        <label className="block text-slate-400 text-sm font-bold mb-2">Campaign Name</label>
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full bg-slate-800 border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="e.g. The Curse of Strahd"
                            value={newCampaignName}
                            onChange={(e) => setNewCampaignName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowForm(false)}
                            className="text-slate-400 hover:text-white px-4 py-2"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={creating}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-lg"
                        >
                            {creating ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
