import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Setup() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!username || !password || !displayName) return toast.error('All fields required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/setup', { username, password, displayName });
      toast.success('Admin account created!');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Setup failed';
      if (msg.includes('already')) {
        toast.error('Setup already done. Please login.');
        navigate('/login');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAndLogin = async () => {
    setLoading(true);
    try {
      // Login to get token first
      const user = await login(username, password);

      // Seed master data (machines M1-M10, rows A-T, departments)
      await api.post('/masters/seed');
      toast.success('Master data seeded — machines, rows, departments ready');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => navigate('/');

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--gray-100)', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Cover ERP Setup</h1>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>First-time configuration — runs once</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 600,
              background: step >= s ? 'var(--primary)' : 'var(--gray-200)',
              color: step >= s ? '#fff' : '#9ca3af',
            }}>{s}</div>
          ))}
        </div>

        <div className="card">
          {/* Step 1: Create admin */}
          {step === 1 && (
            <>
              <div className="card-title">Create admin account</div>
              <form onSubmit={handleCreateAdmin}>
                <div className="form-group">
                  <label className="form-label">Display name</label>
                  <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Ayush Bhatt" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username (for login)</label>
                  <input className="form-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="e.g. ayush" autoCapitalize="none" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Create Admin Account →'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Seed master data */}
          {step === 2 && (
            <>
              <div className="card-title">Seed master data</div>
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                Admin account created successfully!
              </div>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16, lineHeight: 1.6 }}>
                This will set up your system with:
              </p>
              <ul style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16, paddingLeft: 20, lineHeight: 2 }}>
                <li><strong>10 machines</strong> — M1 through M10 (black cover)</li>
                <li><strong>20 godown rows</strong> — Row A through Row T</li>
                <li><strong>4 departments</strong> — Printing, Packaging, Quality Check, Dispatch</li>
              </ul>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                You can add/edit these later from admin settings.
              </p>
              <button className="btn btn-success" onClick={handleSeedAndLogin} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Set Up Master Data →'}
              </button>
            </>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Setup complete!</div>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20 }}>
                  Your ERP is ready. Next steps:
                </p>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--gray-600)' }}>
                  <div>1. Go to <strong>Dashboard</strong> — add your first SKUs</div>
                  <div>2. Use <strong>Stock In</strong> to do your opening stock count</div>
                  <div>3. Share this URL with godown workers for <strong>Quick Search</strong></div>
                  <div>4. Add godown worker login accounts as needed</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={goToDashboard}>
                Go to Dashboard →
              </button>
            </>
          )}
        </div>

        {step === 1 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
            Already set up? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Sign in</span>
          </p>
        )}
      </div>
    </div>
  );
}
