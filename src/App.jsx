import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Auth/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import ClipperDashboard from './pages/Clipper/Dashboard';
import Layout from './layouts/MainLayout';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-background text-text-main">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (!requireAdmin && isAdmin) return <Navigate to="/admin" replace />;

  return children;
};

const IndexRedirect = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-background">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<IndexRedirect />} />
          
          <Route path="/admin/*" element={
            <Layout>
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            </Layout>
          } />
          
          <Route path="/dashboard/*" element={
            <Layout>
              <ProtectedRoute requireAdmin={false}>
                <ClipperDashboard />
              </ProtectedRoute>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
