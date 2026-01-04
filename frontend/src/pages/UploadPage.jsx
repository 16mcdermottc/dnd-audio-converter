import React, { useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UploadCloud, FileAudio, CheckCircle, Loader2, FileText, X, HardDrive } from 'lucide-react';

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaign_id');
  
  const [activeTab, setActiveTab] = useState('audio'); // 'audio', 'text', 'local'
  const [sessionName, setSessionName] = useState('');
  const [files, setFiles] = useState([]);
  const [localPaths, setLocalPaths] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!campaignId) {
        alert("No campaign selected!");
        return;
    }
    
    setUploading(true);
    setProgress(0);

    try {
      if (activeTab === 'audio') {
        if (files.length === 0 || !sessionName) return;
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });
        
        // Bypass Vite proxy for large uploads to avoid timeouts
        await axios.post(`http://localhost:8000/upload_session/?name=${encodeURIComponent(sessionName)}&campaign_id=${campaignId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 0,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          },
        });
      } else if (activeTab === 'local') {
         // Local File Import
         if (!localPaths || !sessionName) return;
         const paths = localPaths.split('\n').filter(p => p.trim() !== '');
         
         await axios.post(`http://localhost:8000/import_local_session/`, {
             name: sessionName,
             file_paths: paths,
             campaign_id: parseInt(campaignId)
         });
         setProgress(100);

      } else {
        // Text Import
        if (!textContent || !sessionName) return;
        // Also direct call for consistency, though less critical
        await axios.post(`http://localhost:8000/import_session_text/`, {
            name: sessionName,
            content: textContent,
            campaign_id: parseInt(campaignId)
        });
        setProgress(100);
      }
      
      setStatus('success');
      setStatus('success');
      navigate(`/campaigns/${campaignId}`);
    } catch (err) {
      console.error(err);
      setStatus('error');
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Add New Session</h2>
        <p className="text-slate-400">Upload audio recordings or paste text summaries.</p>
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
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'local' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
                <HardDrive size={18} />
                Local Files
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
          ) : activeTab === 'local' ? (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Absolute File Paths (One per line)
                </label>
                <textarea
                    value={localPaths}
                    onChange={(e) => setLocalPaths(e.target.value)}
                    className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                    placeholder={`C:\\Users\\Game\\Session1.wav\nC:\\Users\\Game\\Session1_Part2.wav`}
                />
                <p className="text-xs text-slate-500 mt-1">Files must be accessible by the server. Large files and .wav files will be automatically compressed/converted.</p>
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

          {uploading && (
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
            disabled={(!sessionName || (activeTab === 'audio' && files.length === 0) || (activeTab === 'text' && !textContent) || (activeTab === 'local' && !localPaths)) || uploading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              (!sessionName || (activeTab === 'audio' && files.length === 0) || (activeTab === 'text' && !textContent) || (activeTab === 'local' && !localPaths)) || uploading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40'
            }`}
          >
            {uploading ? (
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
