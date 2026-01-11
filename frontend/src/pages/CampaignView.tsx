import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CampaignSummary from '../components/campaign/CampaignSummary';
import PersonaSection from '../components/campaign/PersonaSection';
import MomentList from '../components/campaign/MomentList';
import SessionList from '../components/campaign/SessionList';
import EditItemModal from '../components/EditItemModal';
import PersonaDetailsModal from '../components/PersonaDetailsModal';
import { DELETE_HIGHLIGHT, DELETE_QUOTE, UPDATE_HIGHLIGHT, UPDATE_QUOTE } from '../graphql/mutations';
import { GET_CAMPAIGN_DASHBOARD, GET_PERSONA_DETAILS, UPDATE_PERSONA } from '../graphql/queries';
import { Campaign, Highlight, Persona, Quote as QuoteType } from '../types';
import { request } from '../utils/graphql';

export default function CampaignView() {
  const { id } = useParams();
  const campaignId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Highlight | QuoteType | null>(null);

  // Queries
  const { data: dashboardData, isLoading: campaignLoading, error: campaignError } = useQuery<{ campaign: Campaign }>({
    queryKey: ['campaign-dashboard', campaignId],
    queryFn: async () => {
      return request<{ campaign: Campaign }>(GET_CAMPAIGN_DASHBOARD, { id: campaignId });
    },
    enabled: !!campaignId
  });

  const campaign = dashboardData?.campaign;
  const sessions = campaign?.sessions || [];
  const personas = campaign?.personas || [];
  const moments = campaign?.moments || [];

  const { data: selectedPersonaData } = useQuery<{ persona: Persona }>({
    queryKey: ['persona', selectedPersonaId],
    queryFn: async () => {
      return request<{ persona: Persona }>(GET_PERSONA_DETAILS, { id: selectedPersonaId });
    },
    enabled: !!selectedPersonaId
  });
  const selectedPersona = selectedPersonaData?.persona;

  // Handle errors
  if (campaignError) {
      // @ts-expect-error - Response property exists on Axios/Request error usually
      if (campaignError.response?.status === 404) {
          navigate('/');
      }
  }

  // Mutations for Highlights/Quotes
  const { mutate: updateItem } = useMutation({
    mutationFn: async (item: Highlight | QuoteType) => {
        const isQuote = 'speaker_name' in item;
        if (isQuote) {
            const q = item as QuoteType;
             return request(UPDATE_QUOTE, { id: q.id, input: { text: q.text, speaker_name: q.speaker_name, persona_id: q.persona_id } });
        } else {
            const h = item as Highlight;
             return request(UPDATE_HIGHLIGHT, { id: h.id, input: { text: h.text, type: h.type, persona_id: h.persona_id } });
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['persona', selectedPersonaId] });
    },
    onMutate: async (updatedItem) => {
        // Optimistic update logic preserved
        await queryClient.cancelQueries({ queryKey: ['persona', selectedPersonaId] });
        const previousPersona = queryClient.getQueryData<Persona>(['persona', selectedPersonaId]);
        
        if (previousPersona) {
             const isQuote = 'speaker_name' in updatedItem;
             queryClient.setQueryData<Persona>(['persona', selectedPersonaId], (old) => {
                if (!old) return old;
                if (isQuote) {
                     return { 
                         ...old, 
                         quotes_list: old.quotes_list?.map(q => q.id === updatedItem.id ? (updatedItem as QuoteType) : q) 
                     };
                } else {
                     return { 
                         ...old, 
                         highlights_list: old.highlights_list?.map(h => h.id === updatedItem.id ? (updatedItem as Highlight) : h) 
                     };
                }
             });
        }
        return { previousPersona };
    },
    onError: (_err, _newItem, context) => {
        if (context?.previousPersona) {
            queryClient.setQueryData(['persona', selectedPersonaId], context.previousPersona);
        }
        alert("Failed to save changes");
    }
  });

  const { mutate: updatePersona } = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (vars: { id: number, input: any }) => {
        return request(UPDATE_PERSONA, vars);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['persona', selectedPersonaId] });
        queryClient.invalidateQueries({ queryKey: ['campaignDashboard', id] });
    }
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: async (item: Highlight | QuoteType) => {
        const isQuote = 'speaker_name' in item;
        if (isQuote) {
            return request(DELETE_QUOTE, { id: item.id });
        } else {
            return request(DELETE_HIGHLIGHT, { id: item.id });
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['persona', selectedPersonaId] });
    },
    onError: () => {
        alert("Failed to delete item");
    }
  });

  const handleEditItem = useCallback((item: Highlight | QuoteType) => {
      setEditingItem(item);
  }, []);

  const handleSaveItem = useCallback(async (updatedItem: Highlight | QuoteType) => {
      updateItem(updatedItem);
  }, [updateItem]);

  const handleDeleteItem = useCallback(async (item: Highlight | QuoteType) => {
      if(!window.confirm("Delete this item?")) return;
      deleteItem(item);
  }, [deleteItem]);

  const handleUpdatePersona = useCallback((id: number, updates: Partial<Persona>) => {
      // Construct input from updates, filtering only allowed fields (or just passing what we have if schema allows partials, but schema expects full input or specific input. PersonaInput has optional fields).
      // We need to map Persona to PersonaInput.
      // Actually, my backend updatePersona handles partials if fields are None.
      // But PersonaInput expects 'name' and 'role' as required in schema unless I made them optional?
      // Let's check schema.py. PersonaInput has name, role as required.
      // So I need to pass current values if not updating them.
      // But 'updates' is Partial<Persona>.
      // I should merge with current persona.
      
      const current = selectedPersona;
      if (!current) return;

      const input = {
          name: updates.name || current.name,
          role: updates.role || current.role,
          description: updates.description ?? current.description,
          voice_description: updates.voice_description ?? current.voice_description,
          player_name: updates.player_name ?? current.player_name,
          gender: updates.gender ?? current.gender,
          race: updates.race ?? current.race,
          class_name: updates.class_name ?? current.class_name,
          level: updates.level ?? current.level,
          status: updates.status ?? current.status,
          faction: updates.faction ?? current.faction,
          alignment: updates.alignment ?? current.alignment,
          aliases: updates.aliases ?? current.aliases
      };
      
      updatePersona({ id, input });
  }, [updatePersona, selectedPersona]);

  const handleClosePersonaModal = useCallback(() => {
    setSelectedPersonaId(null);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingItem(null);
  }, []);

  if (campaignLoading) return <div className="p-12 text-center text-slate-500">Loading Realm...</div>;
  if (!campaign) return null;

  return (
    <div className="py-8 px-4 md:px-8 w-full mx-auto">
        <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors font-medium">
            <ArrowLeft size={16} className="mr-2" /> Back to Campaigns
        </Link>
        
        <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 border-b border-slate-700 pb-8">
            <div>
                <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{campaign.name}</h1>
                <p className="text-slate-400 max-w-2xl">{campaign.description}</p>
            </div>
            
            <Link 
                to={`/campaigns/${campaign.id}/upload`}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5"
            >
                <Upload size={18} className="mr-2" />
                Upload Session
            </Link>
        </header>

        <CampaignSummary campaign={campaign} />

        <PersonaSection 
            personas={personas} 
            onSelectPersona={setSelectedPersonaId} 
        />

        <MomentList moments={moments} />

        <SessionList 
            sessions={sessions} 
            campaignId={campaign.id} 
        />

        {/* Modals */}
        {selectedPersona && (
            <PersonaDetailsModal 
                persona={selectedPersona}
                onClose={handleClosePersonaModal}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onUpdatePersona={handleUpdatePersona}
            />
        )}

        <EditItemModal 
            isOpen={!!editingItem}
            onClose={handleCloseEditModal}
            item={editingItem}
            personas={personas}
            onSave={handleSaveItem}
        />
    </div>
  );
}
