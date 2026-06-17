import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Globe, Zap, ArrowRight, Settings, Share2, PanelRightClose, PanelLeftClose,
  MoreVertical, Sparkles, MonitorPlay, Video, Network, FileText, Layers, ListChecks,
  BarChart2, Table, FilePlus2, MessageSquare, BookOpen, Loader2
} from 'lucide-react';

const UploadPage = () => {
  const [sessions, setSessions] = useState([
    { id: 1, name: "General Study" }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [newSessionName, setNewSessionName] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/upload/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Only PDF files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        fetchMaterials();
      } else {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(320px, 1fr) 2fr minmax(320px, 1fr)',
      gap: '1.25rem',
      height: 'calc(100vh - 180px)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept=".pdf"
        style={{ display: 'none' }}
      />

      {/* 1. SOURCES PANEL */}
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        color: '#1f1f1f',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '600', letterSpacing: '-0.01em' }}>Sources & Sessions</span>
          <PanelLeftClose size={20} color="#5f6368" style={{ cursor: 'pointer' }} />
        </div>

        {/* Session Manager */}
        <div style={{ marginBottom: '1.75rem', background: '#f8f9fa', borderRadius: '16px', padding: '1.25rem', border: '1px solid #f0f0f0' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#80868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'block' }}>Current Session</label>
          <select
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(Number(e.target.value))}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid #e8eaed', fontSize: '1rem', fontWeight: '600', color: '#1a73e8', outline: 'none', paddingBottom: '0.5rem', cursor: 'pointer' }}
          >
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: uploading ? '#f8f9fa' : '#ffffff',
            border: '1.5px solid #dadce0',
            borderRadius: '50px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            color: '#1a73e8',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginBottom: '1.5rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
          <span>{uploading ? 'Processing Source...' : 'Add source to session'}</span>
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#dadce0' }}>
              <Loader2 size={32} className="animate-spin" />
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#9aa0a6' }}>Loading Library...</span>
            </div>
          ) : materials.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {materials.map(file => (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                  <div style={{ background: '#fce8e6', color: '#d93025', padding: '0.5rem', borderRadius: '8px' }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3c4043', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</div>
                    <div style={{ fontSize: '0.7rem', color: '#70757a', marginTop: '0.1rem' }}>PDF • Analyzed</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', height: '100%' }}>
              <FilePlus2 size={32} color="#dadce0" style={{ marginBottom: '1.5rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.95rem', color: '#3c4043' }}>Saved sources will appear here</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#80868b', lineHeight: '1.5' }}>
                Start by adding your study notes, PDFs or textbooks to this session.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. CHAT PANEL */}
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        color: '#1f1f1f',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '600' }}>Chat</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', background: '#f0f4f9', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#1a73e8' }}>
              <Sparkles size={16} /> Customise
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2.5rem', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }}>📓</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '500', margin: '0 0 0.75rem 0', letterSpacing: '-0.02em', color: '#1f1f1f' }}>{activeSession?.name || "Untitled notebook"}</h2>
          <div style={{ color: '#80868b', fontSize: '0.95rem', fontWeight: '500' }}>{materials.length} sources • Active Research Unit</div>
        </div>

        <div style={{
          background: '#f1f3f4',
          borderRadius: '32px',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          marginTop: 'auto',
          border: '1px solid #e8eaed'
        }}>
          <input
            type="text"
            placeholder="Ask anything about your sources..."
            style={{ background: 'transparent', border: 'none', color: '#1f1f1f', flex: 1, outline: 'none', fontSize: '1.05rem', fontWeight: '400' }}
          />
          <div style={{ color: '#80868b', fontSize: '0.85rem', fontWeight: '600', background: '#e8eaed', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>{materials.length} sources</div>
          <div style={{ background: '#1a73e8', color: 'white', padding: '0.65rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(26,115,232,0.3)' }}>
            <ArrowRight size={20} />
          </div>
        </div>
      </div>

      {/* 3. STUDIO PANEL */}
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        color: '#1f1f1f',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '600' }}>Studio</span>
          <PanelRightClose size={20} color="#5f6368" style={{ cursor: 'pointer' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '2rem' }}>
          <StudioAction icon={<Sparkles size={16} />} label="Audio Overview" />
          <StudioAction icon={<MonitorPlay size={16} />} label="Slide deck" />
          <StudioAction icon={<Video size={16} />} label="Video Overview" />
          <StudioAction icon={<Network size={16} />} label="Mind Map" />
          <StudioAction icon={<FileText size={16} />} label="Reports" />
          <StudioAction icon={<Layers size={16} />} label="Flashcards" />
          <StudioAction icon={<ListChecks size={16} />} label="Quiz" />
          <StudioAction icon={<BarChart2 size={16} />} label="Infographic" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', background: '#f8f9fa', borderRadius: '24px', border: '1px dashed #dadce0' }}>
          <Sparkles size={28} color="#1a73e8" style={{ marginBottom: '1.25rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '1rem', color: '#3c4043' }}>Studio is ready.</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#80868b', lineHeight: '1.6' }}>
            Generate high-fidelity study aids from your {materials.length} synchronized sources.
          </p>
        </div>

        <button style={{
          position: 'absolute',
          bottom: '1.75rem',
          right: '1.75rem',
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '600',
          fontSize: '0.95rem',
          cursor: 'pointer',
          boxShadow: '0 8px 16px rgba(26,115,232,0.25)',
          transition: 'transform 0.2s'
        }}>
          <FilePlus2 size={20} />
          Add note
        </button>
      </div>

    </div>
  );
};

const StudioAction = ({ icon, label }) => {
  return (
    <div style={{
      background: 'transparent',
      border: '1px solid #dadce0',
      borderRadius: '12px',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      cursor: 'pointer',
      transition: 'background 0.2s',
      color: '#5f6368'
    }} onMouseOver={e => e.currentTarget.style.background = '#f0f4f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      {icon}
      <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#1f1f1f' }}>{label}</span>
    </div>
  );
};

export default UploadPage;
