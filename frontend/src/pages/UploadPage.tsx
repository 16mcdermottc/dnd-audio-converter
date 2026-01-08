import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { FileAudio, FileText, Loader2, UploadCloud } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const { campaignId: paramCampaignId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const campaignId = paramCampaignId || searchParams.get('campaign_id');
  
  const [activeTab, setActiveTab] = useState<'audio' | 'text'>('audio');
  const [sessionName, setSessionName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadAudioMutation = useMutation({
    mutationFn: async () => {
        if (!campaignId || files.length === 0 || !sessionName) return;
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        // Bypass Vite proxy for large uploads to avoid timeouts
        // Note: keeping the localhost URL as per original. In prod this should be relative or env var driven.
        return axios.post(`http://localhost:8000/upload_session/?name=${encodeURIComponent(sessionName)}&campaign_id=${campaignId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 0,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setProgress(percentCompleted);
            }
          },
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sessions'] }); 
        queryClient.invalidateQueries({ queryKey: ['campaign', parseInt(campaignId || '0')] });
        navigate(`/campaigns/${campaignId}`);
    },
    onError: (err: AxiosError<{detail: string}>) => {
        console.error(err);
        alert(err.response?.data?.detail || "Upload failed");
    }
  });

  const importTextMutation = useMutation({
    mutationFn: async () => {
         if (!campaignId || !textContent || !sessionName) return;
         return axios.post(`http://localhost:8000/import_session_text/`, {
            name: sessionName,
            content: textContent,
            campaign_id: parseInt(campaignId)
        });
    },
    onSuccess: () => {
        setProgress(100);
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['campaign', parseInt(campaignId || '0')] });
        navigate(`/campaigns/${campaignId}`);
    },
    onError: (err: AxiosError<{detail: string}>) => {
        console.error(err);
        alert(err.response?.data?.detail || "Import failed");
    }
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) {
        alert("No campaign selected!");
        return;
    }
    
    setProgress(0);

    if (activeTab === 'audio') {
        uploadAudioMutation.mutate();
    } else {
        importTextMutation.mutate();
    }
  };

  const isUploading = uploadAudioMutation.isPending || importTextMutation.isPending;

  return (
    <div className="py-8 px-8 w-full mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Add New Session</h2>
        <p className="text-slate-400">Upload audio recordings or text summaries.</p>
      </header>

      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
            <button 
                onClick={() => setActiveTab('audio')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'audio' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
                <FileAudio size={18} />
                Audio Upload
            </button>
            <button 
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'text' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
                <FileText size={18} />
                Text Import
            </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Session Name
            </label>
            <input 
              type="text" 
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. The Mines of Phandelver - Part 1"
              required
            />
          </div>

          {activeTab === 'audio' ? (
              <div className="relative border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-purple-500 transition-colors group">
                <input 
                  type="file" 
                  accept="audio/*" 
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4 pointer-events-none">
                  <div className="p-4 bg-slate-900 rounded-full group-hover:scale-110 transition-transform">
                    {files.length > 0 ? <FileAudio className="text-purple-400" size={32} /> : <UploadCloud className="text-slate-500" size={32} />}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-300">
                      {files.length > 0 ? `${files.length} file(s) selected` : "Click to select files (or drag and drop)"}
                    </p>
                    {files.length > 0 && (
                       <div className="text-sm text-slate-400 mt-2">
                         {files.map(f => f.name).join(", ")}
                       </div>
                    )}
                    <p className="text-sm text-slate-500 mt-1">MP3, WAV, M4A (Optimization for large files enabled)</p>
                  </div>
                </div>
              </div>
          ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Session Summary / Text Transcript
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                    placeholder="Paste your session summary, log, or existing transcript here..."
                />
              </div>
          )}

          {isUploading && (
            <div className="space-y-2">
               <div className="flex justify-between text-sm text-slate-400">
                 <span className="flex items-center gap-2">
                    {activeTab === 'text' ? (
                        <>
                            <Loader2 size={16} className="animate-spin text-purple-400" />
                            Importing content...
                        </>
                    ) : (
                        "Uploading..."
                    )}
                 </span>
                 <span>{progress}%</span>
               </div>
               <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
                 {activeTab === 'text' ? (
                     <div className="h-full bg-purple-500 animate-pulse w-full rounded-full"></div>
                 ) : (
                     <div 
                       className="h-full bg-purple-500 transition-all duration-300"
                       style={{ width: `${progress}%` }}
                     />
                 )}
               </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={(!sessionName || (activeTab === 'audio' && files.length === 0) || (activeTab === 'text' && !textContent)) || isUploading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              (!sessionName || (activeTab === 'audio' && files.length === 0) || (activeTab === 'text' && !textContent)) || isUploading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40'
            }`}
          >
            {isUploading ? (
                <>
                    <Loader2 className="animate-spin" />
                    {activeTab === 'text' ? 'Importing...' : 'Processing...'}
                </>
            ) : (
                activeTab === 'audio' ? 'Upload Session' : 'Import Text Session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
