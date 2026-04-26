import React, { useState } from 'react';
import { 
  Plus, Search, Globe, Zap, ArrowRight, Settings, Share2, PanelRightClose, PanelLeftClose,
  MoreVertical, Sparkles, MonitorPlay, Video, Network, FileText, Layers, ListChecks, 
  BarChart2, Table, FilePlus2, MessageSquare, BookOpen
} from 'lucide-react';

const UploadPage = () => {
  const [sessions, setSessions] = useState([
    { id: 1, name: "General Study" }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [newSessionName, setNewSessionName] = useState('');

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(280px, 1fr) 2fr minmax(300px, 1fr)', 
      gap: '1rem', 
      height: 'calc(100vh - 180px)', // To fit inside dashboard without outer scrolling
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* 1. SOURCES PANEL */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '24px', 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        color: '#1f1f1f',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Sources & Sessions</span>
          <PanelLeftClose size={20} color="#5f6368" style={{ cursor: 'pointer' }} />
        </div>

        {/* Session Manager */}
        <div style={{ marginBottom: '1.5rem', background: '#f0f4f9', borderRadius: '12px', padding: '1rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Current Session</label>
          <select 
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(Number(e.target.value))}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #dadce0', fontSize: '0.95rem', fontWeight: '500', color: '#1a73e8', outline: 'none', paddingBottom: '0.5rem', cursor: 'pointer' }}
          >
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="New session name"
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #dadce0', outline: 'none' }}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && newSessionName.trim()) {
                  const newSession = { id: Date.now(), name: newSessionName };
                  setSessions([...sessions, newSession]);
                  setActiveSessionId(newSession.id);
                  setNewSessionName('');
                }
              }}
            />
            <button 
              onClick={() => {
                if(newSessionName.trim()) {
                  const newSession = { id: Date.now(), name: newSessionName };
                  setSessions([...sessions, newSession]);
                  setActiveSessionId(newSession.id);
                  setNewSessionName('');
                }
              }}
              style={{ background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: '500' }}
            >
              Create
            </button>
          </div>
        </div>

        <button style={{ 
          background: 'transparent', 
          border: '1px solid #dadce0', 
          borderRadius: '50px', 
          padding: '0.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.5rem',
          color: '#1f1f1f',
          cursor: 'pointer',
          marginBottom: '1rem',
          transition: 'background 0.2s'
        }} onMouseOver={e => e.currentTarget.style.background = '#f0f4f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          <Plus size={18} />
          <span style={{ fontWeight: '500' }}>Add sources to session</span>
        </button>

        <div style={{ 
          background: '#f0f4f9', 
          borderRadius: '16px', 
          padding: '0.75rem 1rem', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} color="#5f6368" />
            <input 
              type="text" 
              placeholder="Search the web for new sources" 
              style={{ background: 'transparent', border: 'none', color: '#1f1f1f', flex: 1, outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#e8eaed', color: '#3c4043', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <Globe size={14} /> Web v
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#e8eaed', color: '#3c4043', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <Zap size={14} /> Fast research v
            </div>
            <div style={{ flex: 1 }}></div>
            <div style={{ background: '#e8eaed', color: '#3c4043', padding: '0.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <FilePlus2 size={24} color="#5f6368" style={{ marginBottom: '1rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '500', fontSize: '0.9rem' }}>Saved sources will appear here</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#5f6368', lineHeight: '1.4' }}>
            Click Add source above to add PDFs, websites, text, videos or audio files to this session.
          </p>
        </div>
      </div>

      {/* 2. CHAT PANEL */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '24px', 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        color: '#1f1f1f',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Chat</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f0f4f9', borderRadius: '50px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <Sparkles size={16} /> Customise
            </div>
            <MoreVertical size={20} color="#5f6368" style={{ cursor: 'pointer' }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', maxWidth: '600px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📓</div>
          <h2 style={{ fontSize: '2rem', fontWeight: '400', margin: '0 0 0.5rem 0' }}>{activeSession?.name || "Untitled notebook"}</h2>
          <div style={{ color: '#5f6368', fontSize: '0.9rem' }}>0 sources • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>

        <div style={{ 
          background: '#f0f4f9', 
          borderRadius: '24px', 
          padding: '1rem 1.5rem', 
          display: 'flex', 
          alignItems: 'center',
          gap: '1rem',
          marginTop: 'auto'
        }}>
          <input 
            type="text" 
            placeholder="Start typing..." 
            style={{ background: 'transparent', border: 'none', color: '#1f1f1f', flex: 1, outline: 'none', fontSize: '1rem' }}
          />
          <div style={{ color: '#5f6368', fontSize: '0.8rem' }}>0 sources</div>
          <div style={{ background: '#e8eaed', color: '#3c4043', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowRight size={18} />
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#5f6368', marginTop: '0.75rem' }}>
          NotobookLM can be inaccurate; please double-check its responses.
        </div>
      </div>

      {/* 3. STUDIO PANEL */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '24px', 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        color: '#1f1f1f',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Studio</span>
          <PanelRightClose size={20} color="#5f6368" style={{ cursor: 'pointer' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <StudioAction icon={<Sparkles size={16} />} label="Audio Overview" />
          <StudioAction icon={<MonitorPlay size={16} />} label="Slide deck" />
          <StudioAction icon={<Video size={16} />} label="Video Overview" />
          <StudioAction icon={<Network size={16} />} label="Mind Map" />
          <StudioAction icon={<FileText size={16} />} label="Reports" />
          <StudioAction icon={<Layers size={16} />} label="Flashcards" />
          <StudioAction icon={<ListChecks size={16} />} label="Quiz" />
          <StudioAction icon={<BarChart2 size={16} />} label="Infographic" />
          <StudioAction icon={<Table size={16} />} label="Data table" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <Sparkles size={24} color="#5f6368" style={{ marginBottom: '1rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '500', fontSize: '0.9rem' }}>Studio output will be saved here.</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#5f6368', lineHeight: '1.4' }}>
            After adding sources, click to add Audio Overview, study guide, mind map and more!
          </p>
        </div>

        <button style={{
          position: 'absolute',
          bottom: '1.5rem',
          right: '1.5rem',
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(26,115,232,0.3)'
        }}>
          <FilePlus2 size={18} />
          Add note
        </button>
      </div>

    </div>
  );
};

// Helper component for Studio Grid actions
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
