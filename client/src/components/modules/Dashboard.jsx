import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../utils/api';
import { getSocket } from '../../utils/api';

export default function Dashboard() {
  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState([]);
  const [dailyLog, setDailyLog] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [shifts, setShifts] = useState({});
  const [view, setView] = useState('log'); // 'log' | 'monthly'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [todayRes, summaryRes, logRes, shiftRes] = await Promise.all([
        api.get('/dashboard/today'),
        api.get(`/dashboard/summary?q=${search}&page=${page}`),
        api.get('/transactions/daily'),
        api.get('/dashboard/shift-summary'),
      ]);
      setToday(todayRes.data);
      setSummary(summaryRes.data.data);
      setTotalPages(summaryRes.data.pages);
      setDailyLog(logRes.data);
      setShifts(shiftRes.data);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const loadMonthly = async () => {
    const now = new Date();
    const { data } = await api.get(`/dashboard/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    setMonthly(data);
  };

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view === 'monthly') loadMonthly();
  }, [view]);

  // Real-time Socket.IO listener
  useEffect(() => {
    const socket = getSocket();
    socket.on('transaction:new', () => { load(); });
    return () => socket.off('transaction:new');
  }, [load]);

  const stockStatus = (balance) => {
    if (balance === 0) return { label: 'Out', cls: 'badge-short' };
    if (balance < 500) return { label: 'Low', cls: 'badge-partial' };
    return { label: 'OK', cls: 'badge-ready' };
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Master Dashboard</div>
        <div className="page-sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      {/* Metric cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Today In</div>
          <div className="metric-value green">{(today?.todayIn || 0).toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Today Out</div>
          <div className="metric-value red">{(today?.todayOut || 0).toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overall Balance</div>
          <div className="metric-value blue">{(today?.overallBalance || 0).toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active SKUs</div>
          <div className="metric-value">{(today?.activeSkus || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Shift summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Today by shift</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Shift {s}</div>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>↓ {(shifts[s]?.in || 0).toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>↑ {(shifts[s]?.out || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock summary table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Stock summary</div>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search model..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model name</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Total In</th>
                <th style={{ textAlign: 'right' }}>Total Out</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => {
                const st = stockStatus(row.balance);
                return (
                  <tr key={row._id}>
                    <td style={{ fontWeight: 500 }}>{row.skuName}</td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>
                      {row.lastRow ? `Row ${row.lastRow} · ${row.lastShelf}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>{row.totalIn.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 500 }}>{row.totalOut.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.balance.toLocaleString()}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: '#9ca3af' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>

      {/* Log / Monthly toggle */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className={`btn btn-sm ${view === 'log' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('log')}>Today's log</button>
          <button className={`btn btn-sm ${view === 'monthly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('monthly')}>Monthly trends</button>
        </div>

        {view === 'log' && (
          <>
            <div className="card-title">Today's transactions</div>
            {dailyLog.map(tx => (
              <div key={tx._id} className="log-row">
                <span className={`badge ${tx.type === 'IN' ? 'badge-in' : 'badge-out'}`}>{tx.type}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{tx.skuName}</div>
                  <div className="log-meta">
                    Shift {tx.shift} ·{' '}
                    {tx.type === 'IN'
                      ? `${tx.machineNumber} · Row ${tx.location?.row || '?'} · ${tx.recordedByName}`
                      : `${tx.department} · ${tx.receiverName}`}
                    {' · '}{new Date(tx.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className={`log-qty ${tx.type === 'IN' ? '' : ''}`} style={{ color: tx.type === 'IN' ? 'var(--success)' : 'var(--warning)' }}>
                  {tx.type === 'IN' ? '+' : '-'}{tx.quantity.toLocaleString()}
                </div>
              </div>
            ))}
            {dailyLog.length === 0 && <div className="text-muted text-center" style={{ padding: 24 }}>No transactions today yet</div>}
          </>
        )}

        {view === 'monthly' && (
          <>
            <div className="card-title">In vs Out — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={v => v.toLocaleString()} labelFormatter={l => `Date: ${l}`} />
                <Legend />
                <Bar dataKey="in" name="Stock In" fill="#057a55" radius={[3, 3, 0, 0]} />
                <Bar dataKey="out" name="Stock Out" fill="#b45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
