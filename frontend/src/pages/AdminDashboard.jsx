import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, FileUp, FileText, Download, Search, Shield, ShieldBan,
  ChevronLeft, ChevronRight, RefreshCw, BarChart3, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, Eye, Trash2, Settings, X,
  ArrowUpDown, Filter, Calendar, Clock, Zap, Database, MessageSquare,
  Gauge, PieChart, UserCheck, UserX, BookOpen,
} from 'lucide-react';

const API = '/api/admin';

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatBytes = (b) => {
  if (!b) return '0 B';
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
};

const MiniBar = ({ value, max, color = '#102326' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#ECEAE7] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
};

const KPICard = ({ icon, label, value, sub, color = '#102326' }) => (
  <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-[4px] flex items-center justify-center" style={{ backgroundColor: color + '12' }}>
        {icon}
      </div>
      <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-2xl font-bold text-[#111111] font-heading">{value}</div>
    {sub && <div className="text-[11px] text-[#888888] mt-0.5">{sub}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-green-50 text-green-700 border-green-200',
    banned: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    embedded: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels = { active: 'Active', banned: 'Banned', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', embedded: 'Embedded', failed: 'Failed' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold uppercase tracking-wider border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {labels[status] || status}
    </span>
  );
};

const SimpleLineChart = ({ data, height = 60, color = '#102326' }) => {
  if (!data || data.length === 0) return <div className="text-[11px] text-[#888888]">No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - (d.value / max) * (height - 10);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinejoin="round" />
      {data.length > 0 && (
        <>
          <circle cx={(data.length - 1) / Math.max(data.length - 1, 1) * w} cy={height - (data[data.length - 1].value / max) * (height - 10)} r="2.5" fill={color} />
        </>
      )}
    </svg>
  );
};

const Pagination = ({ page, total, perPage, onChange }) => {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#D7D3CF]">
      <span className="text-[11px] text-[#888888] font-mono">{total} total</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="p-1 rounded-[4px] hover:bg-[#ECEAE7] disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
        <span className="text-[11px] font-mono px-2">{page}/{totalPages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="p-1 rounded-[4px] hover:bg-[#ECEAE7] disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
};


// ============ OVERVIEW ============
const OverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetch(`${API}/stats`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API}/stats/token-usage?days=14`, { credentials: 'include' }).then(r => r.json()),
      ]);
      setStats(s);
      setTokenData(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" /></div>;
  if (!stats) return <div className="text-sm text-[#888888]">Failed to load stats</div>;

  const dailyChart = (tokenData?.daily || []).map(d => ({ label: d.date, value: d.total_tokens }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">System Overview</h2>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-[#666666] hover:text-[#111111] border border-[#D7D3CF] rounded-[4px] hover:bg-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Users size={14} color="#102326" />} label="Total Users" value={stats.total_users} sub={`${stats.active_users} active, ${stats.banned_users} banned`} />
        <KPICard icon={<Zap size={14} color="#C96A32" />} label="Total Tokens" value={formatNumber(stats.total_tokens)} sub={`${formatNumber(stats.today_tokens)} today`} color="#C96A32" />
        <KPICard icon={<FileUp size={14} color="#102326" />} label="Uploads" value={stats.total_uploads} sub={`${stats.material_uploads} materials, ${stats.syllabus_uploads} syllabi`} />
        <KPICard icon={<MessageSquare size={14} color="#102326" />} label="Chat Sessions" value={stats.total_chats} sub={`${formatNumber(stats.total_messages)} messages`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#888888]" />
            <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Token Usage (14 days)</span>
          </div>
          <SimpleLineChart data={dailyChart} height={80} color="#C96A32" />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-[#888888] font-mono">{dailyChart[0]?.label || '-'}</span>
            <span className="text-[10px] text-[#888888] font-mono">{dailyChart[dailyChart.length - 1]?.label || '-'}</span>
          </div>
        </div>

        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-[#888888]" />
            <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Usage by Action</span>
          </div>
          <div className="space-y-2">
            {(tokenData?.by_action || []).slice(0, 6).map((a) => (
              <div key={a.action_type} className="flex items-center gap-2">
                <span className="text-[11px] text-[#444444] w-24 truncate capitalize">{a.action_type.replace('_', ' ')}</span>
                <div className="flex-1"><MiniBar value={a.total_tokens} max={Math.max(...(tokenData?.by_action || []).map(x => x.total_tokens), 1)} color="#C96A32" /></div>
                <span className="text-[10px] font-mono text-[#888888] w-16 text-right">{formatNumber(a.total_tokens)}</span>
              </div>
            ))}
            {(!tokenData?.by_action || tokenData.by_action.length === 0) && (
              <div className="text-[11px] text-[#888888]">No usage data yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#888888]" />
          <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Recent Users</span>
        </div>
        <div className="space-y-1">
          {(stats.recent_users || []).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-[#ECEAE7] last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#102326] text-white flex items-center justify-center text-[9px] font-bold">
                  {(u.display_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium">{u.display_name || u.email}</div>
                  <div className="text-[10px] text-[#888888]">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={u.is_banned ? 'banned' : 'active'} />
                <span className="text-[10px] text-[#888888] font-mono">{formatDate(u.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ============ USERS ============
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleBan = async (userId) => {
    setActionLoading(userId);
    try {
      await fetch(`${API}/users/${userId}/ban`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      load();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleRoleToggle = async (userId, currentRole) => {
    setActionLoading(userId);
    try {
      await fetch(`${API}/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole === 'admin' ? 'student' : 'admin' }),
      });
      load();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleExport = () => {
    window.open(`${API}/export/users`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">User Management</h2>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-white bg-[#102326] rounded-[4px] hover:bg-[#0b191c] transition-colors">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white focus:outline-none focus:border-[#102326]"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#D7D3CF] bg-[#F7F5F2]">
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">User</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Role</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Status</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Joined</th>
                <th className="text-right px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#888888]">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#888888]">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#ECEAE7] last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#102326] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {(u.display_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.display_name || u.name}</div>
                        <div className="text-[10px] text-[#888888] truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                      u.role === 'admin' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={u.is_banned ? 'banned' : 'active'} /></td>
                  <td className="px-3 py-2 text-[#888888] font-mono">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRoleToggle(u.id, u.role)}
                        disabled={actionLoading === u.id}
                        className="p-1 rounded-[4px] hover:bg-[#ECEAE7] text-[#888888] hover:text-[#102326] transition-colors"
                        title={u.role === 'admin' ? 'Demote to student' : 'Promote to admin'}
                      >
                        <Shield size={13} />
                      </button>
                      <button
                        onClick={() => handleBan(u.id)}
                        disabled={actionLoading === u.id}
                        className={`p-1 rounded-[4px] transition-colors ${u.is_banned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-600'}`}
                        title={u.is_banned ? 'Unban user' : 'Ban user'}
                      >
                        {u.is_banned ? <UserCheck size={13} /> : <ShieldBan size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3">
          <Pagination page={page} total={total} perPage={20} onChange={setPage} />
        </div>
      </div>
    </div>
  );
};


// ============ TOKEN USAGE ============
const TokenUsagePage = () => {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stats/token-usage?days=${days}`, { credentials: 'include' });
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    window.open(`${API}/export/tokens`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" /></div>;

  const dailyChart = (data?.daily || []).map(d => ({ label: d.date, value: d.total_tokens }));
  const totalTokens = (data?.daily || []).reduce((s, d) => s + d.total_tokens, 0);
  const totalPrompt = (data?.daily || []).reduce((s, d) => s + d.prompt_tokens, 0);
  const totalCompletion = (data?.daily || []).reduce((s, d) => s + d.completion_tokens, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Token Usage Analytics</h2>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-white bg-[#102326] rounded-[4px] hover:bg-[#0b191c] transition-colors">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPICard icon={<Zap size={14} color="#C96A32" />} label="Total Tokens" value={formatNumber(totalTokens)} color="#C96A32" />
        <KPICard icon={<ArrowUpDown size={14} color="#102326" />} label="Prompt Tokens" value={formatNumber(totalPrompt)} />
        <KPICard icon={<ArrowUpDown size={14} color="#102326" />} label="Completion Tokens" value={formatNumber(totalCompletion)} />
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[#888888]" />
          <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Daily Token Consumption</span>
        </div>
        <SimpleLineChart data={dailyChart} height={100} color="#C96A32" />
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-[#888888] font-mono">{dailyChart[0]?.label || '-'}</span>
          <span className="text-[10px] text-[#888888] font-mono">{dailyChart[dailyChart.length - 1]?.label || '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-[#888888]" />
            <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">By Action Type</span>
          </div>
          <div className="space-y-2">
            {(data?.by_action || []).map((a) => (
              <div key={a.action_type} className="flex items-center gap-2">
                <span className="text-[11px] text-[#444444] w-28 truncate capitalize">{a.action_type.replace(/_/g, ' ')}</span>
                <div className="flex-1"><MiniBar value={a.total_tokens} max={Math.max(...(data?.by_action || []).map(x => x.total_tokens), 1)} color="#C96A32" /></div>
                <span className="text-[10px] font-mono text-[#888888] w-16 text-right">{formatNumber(a.total_tokens)}</span>
                <span className="text-[10px] font-mono text-[#AAAAAA] w-10 text-right">{a.count}x</span>
              </div>
            ))}
            {(!data?.by_action || data.by_action.length === 0) && (
              <div className="text-[11px] text-[#888888]">No data for this period</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-[#888888]" />
            <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Top Users by Tokens</span>
          </div>
          <div className="space-y-2">
            {(data?.by_user || []).slice(0, 8).map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-[#444444] w-32 truncate">{u.email}</span>
                <div className="flex-1"><MiniBar value={u.total_tokens} max={Math.max(...(data?.by_user || []).map(x => x.total_tokens), 1)} color="#102326" /></div>
                <span className="text-[10px] font-mono text-[#888888] w-16 text-right">{formatNumber(u.total_tokens)}</span>
              </div>
            ))}
            {(!data?.by_user || data.by_user.length === 0) && (
              <div className="text-[11px] text-[#888888]">No data for this period</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ CONTENT ============
const ContentPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stats/content`, { credentials: 'include' });
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" /></div>;

  const maxSubjectCount = Math.max(...(data?.by_subject || []).map(s => s.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Content Analytics</h2>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-[#666666] hover:text-[#111111] border border-[#D7D3CF] rounded-[4px] hover:bg-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(data?.by_type || []).map((t) => (
          <KPICard key={t.doc_type} icon={<FileUp size={14} color="#102326" />} label={t.doc_type === 'material' ? 'Materials' : 'Syllabi'} value={t.count} />
        ))}
        {(data?.by_validation || []).map((v) => (
          <KPICard
            key={v.status}
            icon={v.status === 'approved' ? <CheckCircle size={14} color="#16a34a" /> : v.status === 'rejected' ? <XCircle size={14} color="#dc2626" /> : <Clock size={14} color="#CA8A04" />}
            label={v.status === 'approved' ? 'Approved' : v.status === 'rejected' ? 'Rejected' : 'Pending'}
            value={v.count}
            color={v.status === 'approved' ? '#16a34a' : v.status === 'rejected' ? '#dc2626' : '#CA8A04'}
          />
        ))}
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-[#888888]" />
          <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Uploads by Subject</span>
        </div>
        <div className="space-y-2">
          {(data?.by_subject || []).map((s) => (
            <div key={s.subject} className="flex items-center gap-2">
              <span className="text-[11px] text-[#444444] w-40 truncate">{s.subject}</span>
              <div className="flex-1"><MiniBar value={s.count} max={maxSubjectCount} color="#C96A32" /></div>
              <span className="text-[10px] font-mono text-[#888888] w-8 text-right">{s.count}</span>
              <span className="text-[10px] font-mono text-[#AAAAAA] w-16 text-right">{formatBytes(s.total_size)}</span>
            </div>
          ))}
          {(!data?.by_subject || data.by_subject.length === 0) && (
            <div className="text-[11px] text-[#888888]">No uploads yet</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-[#888888]" />
          <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">Recent Uploads</span>
        </div>
        <div className="space-y-1">
          {(data?.recent_uploads || []).slice(0, 10).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-[#ECEAE7] last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileUp size={13} className="text-[#888888] shrink-0" />
                <span className="text-[11px] truncate">{u.filename}</span>
                <span className="text-[10px] text-[#888888] font-mono shrink-0">{u.subject || '-'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={u.validation_status} />
                <span className="text-[10px] text-[#888888] font-mono">{formatBytes(u.size_bytes)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ============ ACTIVITY LOG ============
const ActivityPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 30 });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`${API}/activity?${params}`, { credentials: 'include' });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const actionColors = {
    chat_message: 'bg-blue-50 text-blue-700',
    flashcard_generate: 'bg-purple-50 text-purple-700',
    mcq_generate: 'bg-indigo-50 text-indigo-700',
    mcq_attempt: 'bg-green-50 text-green-700',
    exam_generate: 'bg-orange-50 text-orange-700',
    upload_document: 'bg-cyan-50 text-cyan-700',
    focus_session: 'bg-amber-50 text-amber-700',
    login: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Activity Log</h2>
        <div className="flex items-center gap-2">
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
            <option value="">All Actions</option>
            <option value="chat_message">Chat Message</option>
            <option value="flashcard_generate">Flashcard Gen</option>
            <option value="mcq_generate">MCQ Gen</option>
            <option value="mcq_attempt">MCQ Attempt</option>
            <option value="exam_generate">Exam Gen</option>
            <option value="upload_document">Upload</option>
            <option value="focus_session">Focus Session</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#D7D3CF] bg-[#F7F5F2]">
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">User</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Action</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Topic</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Score</th>
                <th className="text-right px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#888888]">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#888888]">No activity logs</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-[#ECEAE7] last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-3 py-2">
                    <div className="text-[11px] font-medium">{log.user_name}</div>
                    <div className="text-[10px] text-[#888888]">{log.user_email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold ${actionColors[log.action] || 'bg-gray-50 text-gray-600'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#444444] max-w-[200px] truncate">{log.topic_title || '-'}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-[#444444]">{log.score != null ? `${log.score}%` : '-'}</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888888] text-right whitespace-nowrap">{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3">
          <Pagination page={page} total={total} perPage={30} onChange={setPage} />
        </div>
      </div>
    </div>
  );
};


// ============ QUOTAS ============
const QuotasPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 20 });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditValue(String(user.token_quota || 100000));
  };

  const saveQuota = async (userId) => {
    setSaving(true);
    try {
      await fetch(`${API}/users/${userId}/quota`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_quota: parseInt(editValue) || 100000 }),
      });
      setEditingId(null);
      load();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleQuota = async (userId, currentEnabled) => {
    try {
      await fetch(`${API}/users/${userId}/quota`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_quota_enabled: !currentEnabled }),
      });
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Token Quotas</h2>
      </div>

      <div className="relative max-w-[320px]">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white focus:outline-none focus:border-[#102326]"
        />
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#D7D3CF] bg-[#F7F5F2]">
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">User</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Quota Enabled</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Daily Limit</th>
                <th className="text-right px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-[#888888]">Loading...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#ECEAE7] last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.display_name || u.name}</div>
                    <div className="text-[10px] text-[#888888]">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleQuota(u.id, u.token_quota_enabled)}
                      className={`relative w-8 h-4 rounded-full transition-colors ${u.token_quota_enabled ? 'bg-[#102326]' : 'bg-[#D7D3CF]'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${u.token_quota_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {editingId === u.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-[#102326] rounded-[4px] bg-white focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono">{formatNumber(u.token_quota || 100000)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => saveQuota(u.id)} disabled={saving} className="px-2 py-1 text-[10px] font-mono text-white bg-[#102326] rounded-[4px] hover:bg-[#0b191c] disabled:opacity-50">
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[10px] font-mono text-[#666666] border border-[#D7D3CF] rounded-[4px] hover:bg-[#ECEAE7]">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(u)} className="p-1 rounded-[4px] hover:bg-[#ECEAE7] text-[#888888] hover:text-[#102326]">
                        <Settings size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3">
          <Pagination page={page} total={total} perPage={20} onChange={setPage} />
        </div>
      </div>
    </div>
  );
};


// ============ MODERATION ============
const ModerationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stats/content`, { credentials: 'include' });
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (uploadId, status) => {
    setActionLoading(uploadId);
    try {
      await fetch(`${API}/uploads/${uploadId}/validate`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      load();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleDelete = async (uploadId) => {
    if (!confirm('Delete this upload? This cannot be undone.')) return;
    setActionLoading(uploadId);
    try {
      await fetch(`${API}/uploads/${uploadId}`, { method: 'DELETE', credentials: 'include' });
      load();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" /></div>;

  const allUploads = data?.recent_uploads || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Content Moderation</h2>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-[#666666] hover:text-[#111111] border border-[#D7D3CF] rounded-[4px] hover:bg-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#D7D3CF] bg-[#F7F5F2]">
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">File</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Subject</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Type</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Status</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Size</th>
                <th className="text-right px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUploads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#888888]">No uploads to review</td></tr>
              ) : allUploads.map((u) => (
                <tr key={u.id} className="border-b border-[#ECEAE7] last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileUp size={13} className="text-[#888888] shrink-0" />
                      <span className="truncate max-w-[200px]">{u.filename}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#444444]">{u.subject || '-'}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-mono text-[#888888] uppercase">{u.doc_type}</span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={u.validation_status} /></td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888888]">{formatBytes(u.size_bytes)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {u.validation_status !== 'approved' && (
                        <button
                          onClick={() => handleValidate(u.id, 'approved')}
                          disabled={actionLoading === u.id}
                          className="p-1 rounded-[4px] hover:bg-green-50 text-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {u.validation_status !== 'rejected' && (
                        <button
                          onClick={() => handleValidate(u.id, 'rejected')}
                          disabled={actionLoading === u.id}
                          className="p-1 rounded-[4px] hover:bg-amber-50 text-amber-600 transition-colors"
                          title="Reject"
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={actionLoading === u.id}
                        className="p-1 rounded-[4px] hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// ============ MATERIALS ============
const MaterialsPage = () => {
  const [uploads, setUploads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [validationFilter, setValidationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState(null);
  const [parsedText, setParsedText] = useState(null);
  const [showParsed, setShowParsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 15 });
      if (search) params.set('search', search);
      if (docTypeFilter) params.set('doc_type', docTypeFilter);
      if (validationFilter) params.set('validation', validationFilter);
      const res = await fetch(`${API}/materials?${params}`, { credentials: 'include' });
      const data = await res.json();
      setUploads(data.uploads || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, docTypeFilter, validationFilter]);

  useEffect(() => { load(); }, [load]);

  const handleViewFile = (upload) => {
    setViewerFile(upload);
  };

  const handleViewParsed = async (upload) => {
    try {
      const res = await fetch(`${API}/materials/${upload.id}/parsed`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setParsedText(data);
        setShowParsed(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (uploadId) => {
    if (!confirm('Delete this material? This cannot be undone.')) return;
    try {
      await fetch(`${API}/uploads/${uploadId}`, { method: 'DELETE', credentials: 'include' });
      load();
    } catch (e) { console.error(e); }
  };

  const handleValidate = async (uploadId, status) => {
    try {
      await fetch(`${API}/uploads/${uploadId}/validate`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Uploaded Materials</h2>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-[#666666] hover:text-[#111111] border border-[#D7D3CF] rounded-[4px] hover:bg-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search by filename or subject..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white focus:outline-none focus:border-[#102326]"
          />
        </div>
        <select value={docTypeFilter} onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1); }} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
          <option value="">All Types</option>
          <option value="material">Materials</option>
          <option value="syllabus">Syllabi</option>
        </select>
        <select value={validationFilter} onChange={(e) => { setValidationFilter(e.target.value); setPage(1); }} className="px-2 py-1.5 text-xs border border-[#D7D3CF] rounded-[4px] bg-white">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#D7D3CF] bg-[#F7F5F2]">
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">File</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Owner</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Subject</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Type</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Status</th>
                <th className="text-left px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Size</th>
                <th className="text-right px-3 py-2 font-mono font-semibold text-[10px] uppercase tracking-wider text-[#888888]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#888888]">Loading...</td></tr>
              ) : uploads.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#888888]">No materials found</td></tr>
              ) : uploads.map((u) => (
                <tr key={u.id} className="border-b border-[#ECEAE7] last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileUp size={13} className="text-[#888888] shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">{u.filename}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-[11px] truncate max-w-[120px]">{u.user_name}</div>
                    <div className="text-[10px] text-[#888888] truncate max-w-[120px]">{u.user_email}</div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#444444] truncate max-w-[120px]">{u.subject || '-'}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-mono text-[#888888] uppercase">{u.doc_type}{u.syllabus_kind ? ` (${u.syllabus_kind})` : ''}</span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={u.validation_status} /></td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888888]">{formatBytes(u.size_bytes)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewFile(u)}
                        className="p-1 rounded-[4px] hover:bg-blue-50 text-blue-600 transition-colors"
                        title="View file"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => handleViewParsed(u)}
                        className="p-1 rounded-[4px] hover:bg-purple-50 text-purple-600 transition-colors"
                        title="View parsed text"
                      >
                        <FileText size={13} />
                      </button>
                      {u.validation_status !== 'approved' && (
                        <button
                          onClick={() => handleValidate(u.id, 'approved')}
                          className="p-1 rounded-[4px] hover:bg-green-50 text-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {u.validation_status !== 'rejected' && (
                        <button
                          onClick={() => handleValidate(u.id, 'rejected')}
                          className="p-1 rounded-[4px] hover:bg-amber-50 text-amber-600 transition-colors"
                          title="Reject"
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1 rounded-[4px] hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3">
          <Pagination page={page} total={total} perPage={15} onChange={setPage} />
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#102326] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileUp size={16} />
                <span className="text-sm font-bold truncate">{viewerFile.filename}</span>
                <span className="text-[10px] font-mono text-white/60">{viewerFile.subject || ''}</span>
              </div>
              <button onClick={() => setViewerFile(null)} className="p-1 hover:text-white/60 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${API}/materials/${viewerFile.id}/file`}
                title={viewerFile.filename}
                className="w-full h-full border-none"
              />
            </div>
            <div className="p-2 border-t border-[#D7D3CF] bg-white flex justify-between items-center text-[10px] font-mono text-[#888888] shrink-0">
              <span>{viewerFile.filename} — {formatBytes(viewerFile.size_bytes)}</span>
              <button onClick={() => setViewerFile(null)} className="px-3 py-1 bg-[#102326] text-white rounded-[4px] font-semibold hover:bg-[#0b191c]">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Text Modal */}
      {showParsed && parsedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#102326] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} />
                <span className="text-sm font-bold truncate">{parsedText.filename}</span>
                <span className="text-[10px] font-mono text-white/60">Parsed Text</span>
              </div>
              <button onClick={() => { setShowParsed(false); setParsedText(null); }} className="p-1 hover:text-white/60 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-[#111111] leading-relaxed bg-white">
              {parsedText.parsed_text ? (
                <div className="whitespace-pre-wrap max-w-none">{parsedText.parsed_text}</div>
              ) : (
                <div className="text-center text-[#888888] py-12">No text content extracted</div>
              )}
            </div>
            <div className="p-2 border-t border-[#D7D3CF] bg-white flex justify-between items-center text-[10px] font-mono text-[#888888] shrink-0">
              <span>Method: {parsedText.extraction_method || '-'} | Quality: {parsedText.extraction_quality || '-'}</span>
              <button onClick={() => { setShowParsed(false); setParsedText(null); }} className="px-3 py-1 bg-[#102326] text-white rounded-[4px] font-semibold hover:bg-[#0b191c]">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============ EXPORTS ============
// Each page is now a separate route, navigated via sidebar
export { OverviewPage as default };
export { UsersPage as AdminUsers };
export { TokenUsagePage as AdminTokens };
export { ContentPage as AdminContent };
export { ActivityPage as AdminActivity };
export { QuotasPage as AdminQuotas };
export { ModerationPage as AdminModeration };
export { MaterialsPage as AdminMaterials };
