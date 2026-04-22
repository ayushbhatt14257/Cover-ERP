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

export default function StockIn() {
  const [shift, setShift] = useState(getCurrentShift());
  const [sku, setSku] = useState(null);
  const [machine, setMachine] = useState('');
  const [quantity, setQuantity] = useState('');
  const [row, setRow] = useState('');
  const [shelf, setShelf] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [masters, setMasters] = useState({ machines: [], rows: [], departments: [] });
  const [lastLocation, setLastLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get('/masters/all').then(r => setMasters(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sku) { setLastLocation(null); return; }
    api.get(`/transactions/balance/${sku._id}`)
      .then(r => setLastLocation(r.data.lastLocation))
      .catch(() => {});
  }, [sku]);

  const applyLastLocation = () => {
    if (lastLocation) { setRow(lastLocation.row || ''); setShelf(lastLocation.shelf || ''); }
  };

  const handleSubmit = async () => {
    if (!sku) return toast.error('Select a model name');
    if (!machine) return toast.error('Select a machine');
    if (!quantity || parseInt(quantity) < 1) return toast.error('Enter a valid quantity');
    if (!workerName) return toast.error('Enter worker name');

    setSubmitting(true);
    try {
      const { data } = await api.post('/transactions/in', {
        skuId: sku._id,
        shift,
        machineNumber: machine,
        quantity: parseInt(quantity),
        location: { row, shelf },
        recordedByName: workerName,
      });
      setSuccess(data);
      toast.success(`Stock In recorded! Balance: ${data.balance.toLocaleString()} pcs`);
      // Reset form
      setSku(null); setQuantity(''); setRow(''); setShelf(''); setLastLocation(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording Stock In');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Stock In</div>
        <div className="page-sub">Record production entry into godown</div>
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

        {/* Machine */}
        <div className="form-group">
          <label className="form-label">Machine number</label>
          <select className="form-select" value={machine} onChange={e => setMachine(e.target.value)}>
            <option value="">Select machine...</option>
            {masters.machines.map(m => (
              <option key={m.code} value={m.code}>{m.code}</option>
            ))}
          </select>
        </div>

        {/* Model search */}
        <div className="form-group">
          <label className="form-label">Model name</label>
          <SkuSearch value={sku} onChange={setSku} />
          <div className="form-hint">Type at least 2 characters (e.g. "Sam", "iP 16")</div>
        </div>

        {/* Worker name */}
        <div className="form-group">
          <label className="form-label">Godown worker name</label>
          <input
            className="form-input"
            value={workerName}
            onChange={e => setWorkerName(e.target.value)}
            placeholder="Enter name..."
          />
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity In (pieces)</label>
          <input
            className="form-input large"
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
          />
        </div>

        <hr className="divider" />

        {/* Location */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Storage location</label>
          {lastLocation?.row && (
            <div
              className="alert alert-info"
              style={{ cursor: 'pointer', marginBottom: 8 }}
              onClick={applyLastLocation}
            >
              Last known: Row {lastLocation.row} · Shelf {lastLocation.shelf} — tap to reuse
            </div>
          )}
          <div className="two-col">
            <div>
              <label className="form-label">Row</label>
              <select className="form-select" value={row} onChange={e => setRow(e.target.value)}>
                <option value="">Select row...</option>
                {masters.rows.map(r => (
                  <option key={r.row} value={r.row}>Row {r.row}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Shelf / slot</label>
              <input
                className="form-input"
                value={shelf}
                onChange={e => setShelf(e.target.value)}
                placeholder="e.g. 3"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            Recorded! Current balance: <strong>{success.balance?.toLocaleString()} pcs</strong>
          </div>
        )}

        <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : '✓ Submit Stock In'}
        </button>
        <div className="form-hint text-center mt-2">Updates all devices in real time</div>
      </div>
    </div>
  );
}
