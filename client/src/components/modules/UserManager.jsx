import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
  };

  useEffect(() => { load(); }, []);

  const addUser = async () => {
    if (!name.trim() || !username.trim() || !password.trim())
      return toast.error('All fields required');
    if (password.length < 6)
      return toast.error('Password must be at least 6 characters');
    setAdding(true);
    try {
      await api.post('/auth/users', { displayName: name, username, password, role });
      toast.success(`${name} added as ${role}`);
      setName(''); setUsername(''); setPassword(''); setRole('worker');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding user');
    } finally { setAdding(false); }
  };

  const toggleActive = async (user) => {
    try {
      await api.patch(`/auth/users/${user._id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? `${user.displayName} deactivated` : `${user.displayName} activated`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const changePassword = async (id) => {
    if (!editPassword || editPassword.length < 6)
      return toast.error('New password must be at least 6 characters');
    setSaving(true);
    try {
      await api.patch(`/auth/users/${id}`, { password: editPassword });
      toast.success('Password updated');
      setEditId(null); setEditPassword('');
    } catch { toast.error('Failed to update password'); }
    finally { setSaving(false); }
  };

  const roleColors = {
    admin: { bg: 'var(--primary-light)', color: 'var(--primary)' },
    worker: { bg: 'var(--success-light)', color: 'var(--success)' },
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">User Management</div>
        <div className="page-sub">Add godown workers and admin accounts</div>
      </div>

      {/* Role explanation */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Role permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>Admin</div>
            <div style={{ fontSize: 12, color: 'var(--primary)', lineHeight: 1.8 }}>
              All modules<br/>
              SKU Manager<br/>
              Reports + export<br/>
              User management<br/>
              Order check
            </div>
          </div>
          <div style={{ background: 'var(--success-light)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Worker</div>
            <div style={{ fontSize: 12, color: 'var(--success)', lineHeight: 1.8 }}>
              Dashboard (view)<br/>
              Stock In<br/>
              Stock Out<br/>
              Quick Search<br/>
              <span style={{ opacity: 0.6 }}>No reports/SKUs/users</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add new user */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Add new user</div>
        <div className="form-group">
          <label className="form-label">Full name (display name)</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
        </div>
        <div className="form-group">
          <label className="form-label">Username (used to login)</label>
          <input
            className="form-input"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            placeholder="e.g. ravi  (no spaces)"
            autoCapitalize="none"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['worker', 'admin'].map(r => (
              <button
                key={r}
                className={`shift-btn ${role === r ? 'active' : ''}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="form-hint">
            {role === 'worker' ? 'Worker: can do Stock In/Out and Quick Search' : 'Admin: full access including reports and settings'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={addUser} disabled={adding}>
          {adding ? <span className="spinner" /> : `+ Add ${role}`}
        </button>
      </div>

      {/* User list */}
      <div className="card">
        <div className="card-title">All users ({users.length})</div>
        {users.map(u => (
          <div key={u._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: editId === u._id ? 10 : 0 }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: roleColors[u.role]?.bg,
                color: roleColors[u.role]?.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
              }}>
                {u.displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {u.displayName}
                  {!u.isActive && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>(inactive)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  @{u.username} ·{' '}
                  <span style={{ color: roleColors[u.role]?.color, fontWeight: 500 }}>{u.role}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setEditId(editId === u._id ? null : u._id); setEditPassword(''); }}
                >
                  {editId === u._id ? 'Cancel' : '🔑'}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: u.isActive ? 'var(--danger)' : 'var(--success)' }}
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            {/* Inline password change */}
            {editId === u._id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingLeft: 48 }}>
                <input
                  className="form-input"
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-success btn-sm" style={{ flex: 'none' }} onClick={() => changePassword(u._id)} disabled={saving}>
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-muted text-center" style={{ padding: 24 }}>No users yet</div>
        )}
      </div>
    </div>
  );
}
