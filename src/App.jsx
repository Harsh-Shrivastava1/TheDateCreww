import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Matches from './pages/Matches';
import Activities from './pages/Activities';
import Notes from './pages/Notes';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function PrivateRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#111827' }}
          >
            <span className="text-white text-xl">💛</span>
          </div>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: '#111827', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            background: '#111827',
            color: '#F9FAFB',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#111827' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
          duration: 3000,
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
