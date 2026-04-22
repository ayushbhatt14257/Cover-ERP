import { useState } from 'react';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';

export default function QuickSearch() {
  const [sku, setSku] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (selected) => {
    setSku(selected);
    if (!selected) { setResult(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/balance/${selected._id}`);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = (balance) => {
    if (balance === 0) return { label: 'Out of stock', cls: 'badge-short', color: 'var(--danger)' };
    if (balance < 500) return { label: 'Low stock', cls: 'badge-partial', color: 'var(--warning)' };
    return { label: 'In stock', cls: 'badge-ready', color: 'var(--success)' };
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Quick Stock Check</div>
        <div className="page-sub">Search any model to see current balance and location</div>
      </div>

      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search model</label>
          <SkuSearch value={sku} onChange={handleSelect} placeholder='Type model name e.g. "Sam A55"' />
          <div className="form-hint">Read-only view — type 2+ characters to search</div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Checking stock...</div>
      )}

      {result && sku && (
        <div className="card" style={{ marginTop: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{sku.name}</div>
              {sku.brand && <div style={{ fontSize: 12, color: '#9ca3af' }}>{sku.brand}</div>}
            </div>
            <span className={`badge ${statusInfo(result.balance).cls}`} style={{ fontSize: 13 }}>
              {statusInfo(result.balance).label}
            </span>
          </div>

          {/* Balance */}
          <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Current balance</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: statusInfo(result.balance).color }}>
              {result.balance.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>pieces</div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Total In (all time)</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{result.totalIn.toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Total Out (all time)</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>{result.totalOut.toLocaleString()}</div>
            </div>
          </div>

          {/* Location */}
          {result.lastLocation?.row && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Last known location</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                  Row {result.lastLocation.row} · Shelf {result.lastLocation.shelf}
                </div>
              </div>
            </div>
          )}

          {/* Last movement */}
          {result.lastIn && (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              Last Stock In: {result.lastIn.shiftDate} · Shift {result.lastIn.shift}
            </div>
          )}
        </div>
      )}

      {!loading && !result && !sku && (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>Search a model name above to check its stock</div>
        </div>
      )}
    </div>
  );
}
