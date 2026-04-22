import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function SkuManager() {
  const [skus, setSkus] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [adding, setAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/skus?q=${search}&page=${page}&limit=50`);
      setSkus(data.skus);
      setTotal(data.total);
    } catch { toast.error('Failed to load SKUs'); }
  };

  useEffect(() => { load(); }, [search, page]);

  const addSku = async () => {
    if (!newName.trim()) return toast.error('Model name required');
    setAdding(true);
    try {
      await api.post('/skus', { name: newName.trim(), brand: newBrand.trim() });
      toast.success(`${newName} added`);
      setNewName(''); setNewBrand('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding SKU');
    } finally { setAdding(false); }
  };

  const bulkImport = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const skus = lines.map(l => {
      const parts = l.split(',');
      return { name: parts[0]?.trim(), brand: parts[1]?.trim() || '' };
    }).filter(s => s.name);

    if (!skus.length) return toast.error('No valid lines found');
    setBulkLoading(true);
    try {
      const { data } = await api.post('/skus/bulk', { skus });
      toast.success(`Added ${data.inserted} new SKUs (${data.skipped} already existed)`);
      setBulkText(''); setShowBulk(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally { setBulkLoading(false); }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">SKU Manager</div>
        <div className="page-sub">Manage your 5,000+ model names · {total.toLocaleString()} total</div>
      </div>

      {/* Add single SKU */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Add model</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="form-input" style={{ flex: 2, minWidth: 160 }}
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder='Model name e.g. "Sam A55"'
            onKeyDown={e => e.key === 'Enter' && addSku()}
          />
          <input
            className="form-input" style={{ flex: 1, minWidth: 100 }}
            value={newBrand} onChange={e => setNewBrand(e.target.value)}
            placeholder="Brand (optional)"
          />
          <button className="btn btn-primary btn-sm" style={{ flex: 'none' }} onClick={addSku} disabled={adding}>
            {adding ? '...' : '+ Add'}
          </button>
        </div>
        <div className="form-hint" style={{ marginTop: 8 }}>
          Or{' '}
          <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowBulk(!showBulk)}>
            bulk import from text
          </span>
        </div>

        {showBulk && (
          <div style={{ marginTop: 12 }}>
            <div className="form-label">Paste model list — one per line, optionally: ModelName, Brand</div>
            <textarea
              className="form-input"
              rows={6}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"Sam A55, Samsung\niP 16PM, Apple\nVivo V40\nRealme 13 Pro"}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
            />
            <button className="btn btn-success btn-sm" style={{ marginTop: 8 }} onClick={bulkImport} disabled={bulkLoading}>
              {bulkLoading ? 'Importing...' : `Import ${bulkText.split('\n').filter(Boolean).length} models`}
            </button>
          </div>
        )}
      </div>

      {/* SKU list */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>All models ({total.toLocaleString()})</div>
        </div>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="form-input" style={{ paddingLeft: 36 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search models..."
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model name</th>
                <th>Brand</th>
                <th>Search token</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {skus.map(sku => (
                <tr key={sku._id}>
                  <td style={{ fontWeight: 500 }}>{sku.name}</td>
                  <td style={{ color: '#9ca3af', fontSize: 13 }}>{sku.brand || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{sku.searchToken}</td>
                  <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(sku.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {skus.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                  No SKUs yet — add your first model above
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {Math.ceil(total / 50) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: '#9ca3af' }}>Page {page} of {Math.ceil(total / 50)}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
