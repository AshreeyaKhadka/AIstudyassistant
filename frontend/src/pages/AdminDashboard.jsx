import React, { useState } from 'react';
import { Users, Activity, Settings, ShieldBan } from 'lucide-react';
import { ModernInput } from '../components/ui/ModernInput';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');

  const mockUsers = [
    { id: 1, email: "student@pu.edu.np", role: "student", status: "Active" },
    { id: 2, email: "admin@pu.edu.np", role: "admin", status: "Active" },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-container-low)' }}>
      <aside style={{ width: '280px', background: 'var(--surface)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <Settings color="white" size={24} />
            </div>
            <span className="headline-sm" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Admin Panel</span>
         </div>
         <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div onClick={() => setActiveTab('users')} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-default)', background: activeTab === 'users' ? 'var(--surface-container-low)' : 'transparent', color: activeTab === 'users' ? 'var(--primary)' : 'var(--outline-variant)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '1rem' }}><Users size={20}/> User Management</div>
            <div onClick={() => setActiveTab('stats')} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-default)', background: activeTab === 'stats' ? 'var(--surface-container-low)' : 'transparent', color: activeTab === 'stats' ? 'var(--primary)' : 'var(--outline-variant)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '1rem' }}><Activity size={20}/> Usage Stats</div>
         </nav>
      </aside>

      <main style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="headline-md">{activeTab === 'users' ? 'User Management' : 'System Metrics'}</h2>
        </header>

        {activeTab === 'users' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-container-lowest)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)' }}>
             <div style={{ width: '300px' }}><ModernInput placeholder="Search users by email..." /></div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
               {mockUsers.map(u => (
                 <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-default)', border: '1px solid var(--ghost-border)' }}>
                    <div>
                      <div className="title-sm">{u.email}</div>
                      <div className="body-sm" style={{ color: 'var(--outline-variant)' }}>Role: {u.role} | Status: {u.status}</div>
                    </div>
                    <div>
                      <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tertiary)' }}><ShieldBan size={20}/></button>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {activeTab === 'stats' && (
           <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
             <div style={{ background: 'var(--surface-container-lowest)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)' }}>
               <div className="title-sm" style={{ color: 'var(--outline-variant)', marginBottom: '1rem' }}>Total Users</div>
               <div className="display-lg">2</div>
             </div>
             <div style={{ background: 'var(--surface-container-lowest)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)' }}>
               <div className="title-sm" style={{ color: 'var(--outline-variant)', marginBottom: '1rem' }}>Active Connects</div>
               <div className="display-lg">5</div>
             </div>
           </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
