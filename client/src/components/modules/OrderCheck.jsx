import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../utils/api';

export default function OrderCheck() {
  const [orderRef, setOrderRef] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderRef', orderRef || file.name.replace(/\.[^.]+$/, ''));
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/orders/check', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing file');
    } finally {
      setLoading(false);
    }
  };

  const exportGapReport = () => {
    if (!result) return;
    const rows = result.results.map(r => ({
      'Model Name': r.skuName,
      'Required': r.required,
      'Available': r.available,
      'Shortfall': r.shortfall,
      'Status': r.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Gap Report');
    XLSX.writeFile(wb, `Gap_${result.orderRef}_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  const statusCls = { READY: 'badge-ready', PARTIAL: 'badge-partial', SHORT: 'badge-short' };
  const statusLabel = { READY: 'Ready', PARTIAL: 'Partial', SHORT: 'Short' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Order Fulfilment Check</div>
        <div className="page-sub">Upload order list to see what's ready vs short</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Order reference (optional)</label>
          <input className="form-input" value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder="e.g. Flipkart Order #2845" />
        </div>

        <div
          className={`upload-zone ${drag ? 'drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
          <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>Drop Excel file here or tap to browse</div>
          <p>Col A = Model Name · Col B = Quantity required</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>.xlsx or .csv accepted · max 5MB</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Checking against live stock...</div>}
      </div>

      {result && (
        <>
          {/* Summary bar */}
          <div className="metrics-grid" style={{ marginBottom: 12 }}>
            <div className="metric-card">
              <div className="metric-label">Ready</div>
              <div className="metric-value green">{result.summary.ready}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Partial</div>
              <div className="metric-value" style={{ color: 'var(--warning)' }}>{result.summary.partial}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Short</div>
              <div className="metric-value red">{result.summary.short}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total SKUs</div>
              <div className="metric-value">{result.summary.total}</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>{result.orderRef}</div>
              <button className="btn btn-outline btn-sm" onClick={exportGapReport}>⬇ Export gap report</button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th style={{ textAlign: 'right' }}>Required</th>
                    <th style={{ textAlign: 'right' }}>Available</th>
                    <th style={{ textAlign: 'right' }}>Shortfall</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.skuName}</td>
                      <td style={{ textAlign: 'right' }}>{r.required.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: r.available === 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        {r.available.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: r.shortfall > 0 ? 'var(--danger)' : 'var(--gray-400)', fontWeight: r.shortfall > 0 ? 600 : 400 }}>
                        {r.shortfall > 0 ? r.shortfall.toLocaleString() : '—'}
                      </td>
                      <td><span className={`badge ${statusCls[r.status]}`}>{statusLabel[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.unmatched?.length > 0 && (
              <div className="alert alert-warning" style={{ marginTop: 14 }}>
                <strong>{result.unmatched.length} model(s) not found in SKU database:</strong>
                <div style={{ marginTop: 4, fontSize: 12 }}>{result.unmatched.join(', ')}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
