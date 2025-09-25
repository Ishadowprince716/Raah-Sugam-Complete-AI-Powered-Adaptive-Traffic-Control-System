/**
 * Main React Application Component
 * Project Raah-Sugam - AI-Powered Adaptive Traffic Control
 * 
 * Root component that sets up routing, global state, and layout structure.
 * Provides real-time traffic monitoring dashboard with WebSocket connectivity.
 * 
 * Author: Raah-Sugam Team
 * License: MIT
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Layout from './components/layout/Layout';
import IntersectionView from './components/traffic/IntersectionView';
import HistoricalAnalytics from './components/analytics/HistoricalAnalytics';
import SystemConfiguration from './components/config/SystemConfiguration';
import Login from './components/auth/Login';

// Hooks and services
import { useAuthStore } from './stores/authStore';
import { useWebSocket } from './hooks/useWebSocket';

// Styles
import './styles/globals.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  // Initialize WebSocket connection
  const { connectionStatus, trafficData, systemStatus } = useWebSocket({
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  return (
    <Layout connectionStatus={connectionStatus} systemStatus={systemStatus}>
      <Routes>
        {/* Main traffic monitoring view */}
        <Route 
          path="/" 
          element={
            <IntersectionView 
              trafficData={trafficData}
              connectionStatus={connectionStatus}
            />
          } 
        />
        
        {/* Historical analytics */}
        <Route 
          path="/analytics" 
          element={<HistoricalAnalytics />} 
        />
        
        {/* System configuration */}
        <Route 
          path="/config" 
          element={<SystemConfiguration />} 
        />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

// Main App Component
const App: React.FC = () => {
  const { initializeAuth, isAuthenticated } = useAuthStore();

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Router>
          <Routes>
            {/* Login route */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login />
                )
              } 
            />
            
            {/* Protected dashboard routes */}
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>

        {/* Global toast notifications */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastClassName="text-sm"
        />
      </div>
    </QueryClientProvider>
  );
};

export default App;