import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SkuSearch from '../shared/SkuSearch';

const SHIFTS = [
  { n: 1, label: 'Shift 1', time: '7am – 3pm' },
  { n: 2, label: 'Shift 2', time: '3pm – 11pm' },
  { n: 3, label: 'Shift 3', time: '11pm – 7am' },
];

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return 1;
  if (h >= 15 && h < 23) return 2;
  return 3;
}

export default function StockOut() {
  const [shift, setShift] = useState(getCurrentShift());
  const [sku, setSku] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [department, setDepartment] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [masters, setMasters] = useState({ machines: [], rows: [], departments: [] });
  const [balance, setBalance] = useState(null);
  const [shiftAllowed, setShiftAllowed] = useState(null); // null = unchecked
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get('/masters/all').then(r => setMasters(r.data)).catch(() => {});
  }, []);

  // When SKU or shift changes, check balance + shift gate
  useEffect(() => {
    if (!sku) { setBalance(null); setShiftAllowed(null); return; }
    setBalance(null); setShiftAllowed(null);

    Promise.all([
      api.get(`/transactions/balance/${sku._id}`),
      api.get(`/transactions/shift-check?skuId=${sku._id}&shift=${shift}`),
    ]).then(([balRes, gateRes]) => {
      setBalance(balRes.data.balance);
      setShiftAllowed(gateRes.data.allowed);
    }).catch(() => {});
  }, [sku, shift]);

  const handleSubmit = async () => {
    if (!sku) return toast.error('Select a model name');
    if (!quantity || parseInt(quantity) < 1) return toast.error('Enter a valid quantity');
    if (!department) return toast.error('Select a department');
    if (!receiverName) return toast.error('Enter receiver name');

    setSubmitting(true);
    try {
      const { data } = await api.post('/transactions/out', {
        skuId: sku._id,
        shift,
        quantity: parseInt(quantity),
        department,
        receiverName,
      });
      setSuccess(data);
      toast.success(`Stock Out recorded! Remaining: ${data.balance.toLocaleString()} pcs`);
      setSku(null); setQuantity(''); setReceiverName(''); setBalance(null); setShiftAllowed(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error recording Stock Out';
      const code = err.response?.data?.code;
      if (code === 'SHIFT_GATE') toast.error('⚠ Record Stock In first for this shift');
      else if (code === 'INSUFFICIENT_STOCK') toast.error(msg);
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const qty = parseInt(quantity) || 0;
  const overLimit = balance !== null && qty > balance;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Stock Out</div>
        <div className="page-sub">Record department requisition</div>
      </div>

      <div className="card">
        {/* Shift */}
        <div className="form-group">
          <label className="form-label">Shift</label>
          <div className="shift-selector">
            {SHIFTS.map(s => (
              <button key={s.n} className={`shift-btn ${shift === s.n ? 'active' : ''}`} onClick={() => setShift(s.n)}>
                {s.label}
                <span className="shift-time">{s.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="form-group">
          <label className="form-label">Model name</label>
          <SkuSearch value={sku} onChange={setSku} />
        </div>

        {/* Shift gate warning */}
        {sku && shiftAllowed === false && (
          <div className="alert alert-warning">
            ⚠ No Stock In recorded for <strong>{sku.name}</strong> in Shift {shift} today.
            Record Stock In first before taking stock out.
          </div>
        )}

        {/* Balance display */}
        {sku && balance !== null && shiftAllowed && (
          <div className={`alert ${balance === 0 ? 'alert-danger' : overLimit ? 'alert-warning' : 'alert-success'}`}>
            Available balance: <strong>{balance.toLocaleString()} pcs</strong>
            {overLimit && <span> — quantity exceeds available stock</span>}
          </div>
        )}

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity Out (pieces)</label>
          <input
            className={`form-input large ${overLimit ? 'form-input--error' : ''}`}
            style={{ borderColor: overLimit ? 'var(--danger)' : undefined }}
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
          />
          {overLimit && <div className="form-error">Exceeds available stock ({balance?.toLocaleString()} pcs)</div>}
        </div>

        {/* Department chips */}
        <div className="form-group">
          <label className="form-label">Receiving department</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            {masters.departments.map(d => (
              <button
                key={d.name}
                className="shift-btn"
                style={{ flex: 'none', width: 'auto', padding: '7px 14px' }}
                onClick={() => setDepartment(d.name)}
              >
                <span style={{ color: department === d.name ? 'var(--primary)' : undefined, fontWeight: department === d.name ? 600 : 400 }}>
                  {d.name}
                </span>
              </button>
            ))}
          </div>
          {department && <div className="form-hint">Selected: <strong>{department}</strong></div>}
        </div>

        {/* Receiver */}
        <div className="form-group">
          <label className="form-label">Receiver name</label>
          <input
            className="form-input"
            value={receiverName}
            onChange={e => setReceiverName(e.target.value)}
            placeholder="Name of person receiving..."
          />
        </div>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            Recorded! Remaining balance: <strong>{success.balance?.toLocaleString()} pcs</strong>
          </div>
        )}

        <button
          className="btn btn-danger"
          onClick={handleSubmit}
          disabled={submitting || shiftAllowed === false || overLimit}
        >
          {submitting ? <span className="spinner" /> : '↑ Submit Stock Out'}
        </button>
        <div className="form-hint text-center mt-2">Balance cannot go negative — server enforced</div>
      </div>
    </div>
  );
}
