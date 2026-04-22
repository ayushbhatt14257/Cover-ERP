import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './components/modules/Dashboard';
import StockIn from './components/modules/StockIn';
import StockOut from './components/modules/StockOut';
import QuickSearch from './components/modules/QuickSearch';
import OrderCheck from './components/modules/OrderCheck';
import Reports from './components/modules/Reports';
import SkuManager from './components/modules/SkuManager';
import UserManager from './components/modules/UserManager';
import './index.css';

// adminOnly: true = admin only, false = all logged-in users, 'worker' = worker + admin
const NAV = [
  { path: '/',          label: 'Dashboard',   icon: '◉', access: 'all'    },
  { path: '/stock-in',  label: 'Stock In',    icon: '↓', access: 'worker' },
  { path: '/stock-out', label: 'Stock Out',   icon: '↑', access: 'worker' },
  { path: '/search',    label: 'Quick Search',icon: '⌕', access: 'all'    },
  { path: '/orders',    label: 'Order Check', icon: '✓', access: 'admin'  },
  { path: '/skus',      label: 'SKU Manager', icon: '☰', access: 'admin'  },
  { path: '/reports',   label: 'Reports',     icon: '▤', access: 'admin'  },
  { path: '/users',     label: 'Users',       icon: '👤', access: 'admin' },
];

function canAccess(navItem, user) {
  if (!user) return false;
  if (navItem.access === 'all') return true;
  if (navItem.access === 'worker') return ['admin', 'worker'].includes(user.role);
  if (navItem.access === 'admin') return user.role === 'admin';
  return false;
}

function ProtectedRoute({ children, access = 'all' }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (access === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  if (access === 'worker' && !['admin', 'worker'].includes(user.role)) return <Navigate to="/search" replace />;
  return children;
}

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const visibleNav = NAV.filter(n => canAccess(n, user));

  return (
    <div className="app-shell">
      {/* Sidebar — desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>📦 Cover ERP</h2>
          <p>Semi-finished inventory</p>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)', marginBottom: 2 }}>{user?.displayName}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10, textTransform: 'capitalize' }}>{user?.role}</div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{ paddingBottom: 80 }}>
        <Routes>
          <Route path="/"          element={<ProtectedRoute access="all"><Dashboard /></ProtectedRoute>} />
          <Route path="/stock-in"  element={<ProtectedRoute access="worker"><StockIn /></ProtectedRoute>} />
          <Route path="/stock-out" element={<ProtectedRoute access="worker"><StockOut /></ProtectedRoute>} />
          <Route path="/search"    element={<ProtectedRoute access="all"><QuickSearch /></ProtectedRoute>} />
          <Route path="/orders"    element={<ProtectedRoute access="admin"><OrderCheck /></ProtectedRoute>} />
          <Route path="/skus"      element={<ProtectedRoute access="admin"><SkuManager /></ProtectedRoute>} />
          <Route path="/reports"   element={<ProtectedRoute access="admin"><Reports /></ProtectedRoute>} />
          <Route path="/users"     element={<ProtectedRoute access="admin"><UserManager /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {visibleNav.slice(0, 5).map(n => (
          <div
            key={n.path}
            className={`mobile-nav-item ${location.pathname === n.path ? 'active' : ''}`}
            onClick={() => navigate(n.path)}
          >
            <span className="mobile-nav-icon">{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>
    </div>
  );
}

function ProtectedRouteWrapper({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontSize: 14, maxWidth: 360 },
            success: { iconTheme: { primary: '#057a55', secondary: '#fff' } },
            error: { iconTheme: { primary: '#c81e1e', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/*" element={<ProtectedRouteWrapper><AppShell /></ProtectedRouteWrapper>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
