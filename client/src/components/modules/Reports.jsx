import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/reports/list').then(r => setSavedReports(r.data)).catch(() => {});
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/monthly?year=${year}&month=${month}`);
      setReport(data);
    } catch {
      toast.error('Could not load report');
    } finally {
      setLoading(false);
    }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/reports/generate', { year, month });
      setReport(data);
      toast.success('Report generated and saved');
      const listRes = await api.get('/reports/list');
      setSavedReports(listRes.data);
    } catch {
      toast.error('Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadExcel = () => {
    const url = `/api/reports/export?year=${year}&month=${month}`;
    const link = document.createElement('a');
    link.href = url;
    link.click();
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Reports</div>
        <div className="page-sub">Monthly summaries — auto-saved on 1st of each month</div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" style={{ flex: 'none' }} onClick={loadReport}>View</button>
          <button className="btn btn-outline btn-sm" style={{ flex: 'none' }} onClick={generateNow} disabled={generating}>
            {generating ? 'Generating...' : '↺ Regenerate'}
          </button>
          <button className="btn btn-success btn-sm" style={{ flex: 'none' }} onClick={downloadExcel}>⬇ Excel</button>
        </div>
      </div>

      {/* Report content */}
      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading report...</div>}

      {report && !loading && (
        <>
          <div className="metrics-grid" style={{ marginBottom: 16 }}>
            <div className="metric-card">
              <div className="metric-label">Total In</div>
              <div className="metric-value green">{(report.summary?.totalIn || 0).toLocaleString()}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Out</div>
              <div className="metric-value red">{(report.summary?.totalOut || 0).toLocaleString()}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Net Balance</div>
              <div className="metric-value blue">{(report.summary?.netBalance || 0).toLocaleString()}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Unique SKUs</div>
              <div className="metric-value">{report.summary?.uniqueSkus || 0}</div>
            </div>
          </div>

          {/* Shift breakdown */}
          {report.shiftData && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Shift-wise breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Shift {s}</div>
                    <div style={{ fontSize: 13, color: 'var(--success)' }}>In: <strong>{(report.shiftData[s]?.in || 0).toLocaleString()}</strong></div>
                    <div style={{ fontSize: 13, color: 'var(--warning)' }}>Out: <strong>{(report.shiftData[s]?.out || 0).toLocaleString()}</strong></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top models */}
          {report.summary?.topModels?.length > 0 && (
            <div className="card">
              <div className="card-title">Top 10 models by movement</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Model</th><th style={{ textAlign: 'right' }}>Total In</th><th style={{ textAlign: 'right' }}>Total Out</th></tr></thead>
                  <tbody>
                    {report.summary.topModels.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m.skuName}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{m.totalIn.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 600 }}>{m.totalOut.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Saved reports list */}
      {savedReports.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Saved reports archive</div>
          {savedReports.map(r => (
            <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{MONTHS[r.month - 1]} {r.year}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {r.isAutoGenerated ? 'Auto-generated' : 'Manual'} · {new Date(r.generatedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { setYear(r.year); setMonth(r.month); setReport(null); setTimeout(loadReport, 100); }}>
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
