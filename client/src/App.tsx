import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChallengePage from './pages/ChallengePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import EndScreen from './pages/EndScreen';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function TeamRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { token, isAdmin } = useAuth();
  return (
    <Routes>
      <Route path="/" element={
        token
          ? isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
          : <LoginPage />
      } />
      <Route path="/dashboard" element={<TeamRoute><DashboardPage /></TeamRoute>} />
      <Route path="/challenge/:id" element={<TeamRoute><ChallengePage /></TeamRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/end" element={<TeamRoute><EndScreen /></TeamRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(10, 20, 40, 0.95)',
                color: '#e2e8f0',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                backdropFilter: 'blur(16px)',
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
