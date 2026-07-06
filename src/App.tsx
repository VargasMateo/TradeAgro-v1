/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import SetupPasswordPage from "./pages/SetupPasswordPage";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import WorkOrderDetailsPage from "./pages/WorkOrderDetailsPage";
import ReportsPage from "./pages/ReportsPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import StationsPage from "./pages/StationsPage";
import ProfilePage from "./pages/ProfilePage";
import CalendarPage from "./pages/CalendarPage";
import MeteoReportPage from "./pages/MeteoReportPage";
import DbTestPage from "./pages/DbTestPage";
import PublicWorkOrderPage from "./pages/PublicWorkOrderPage";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("authToken"));
  const [userRole, setUserRole] = useState<'profesional' | 'client' | 'admin'>(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        return JSON.parse(saved).role || 'profesional';
      } catch (e) {
        return 'profesional';
      }
    }
    return 'profesional';
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userProfile");
    // Reset the URL to root to avoid landing on a deep-linked page after next login
    window.history.replaceState(null, '', '/');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkToken = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        handleLogout();
        return;
      }

      try {
        // Validate JWT expiration proactively
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          // Convert base64url to standard base64 and add padding
          let b64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed — atob() requires proper padding
          while (b64.length % 4 !== 0) {
            b64 += '=';
          }
          const decodedJson = atob(b64);
          const decoded = JSON.parse(decodedJson);
          const exp = decoded.exp;
          const now = Date.now() / 1000;
          if (exp && exp < now) {
            console.warn('[AUTH] Token expired, logging out.');
            handleLogout();
          }
        }
      } catch (e) {
        // Token parsing error — log but don't force logout.
        // The server will reject an invalid token on the next API call anyway.
        console.warn('[AUTH] Could not parse token for expiration check:', e);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        checkToken();
      }
    };

    const onForceLogout = () => handleLogout();

    // 1. Listen for global forced logouts (from authenticatedFetch)
    window.addEventListener('force-logout', onForceLogout);

    // 2. Listen for storage changes across tabs
    window.addEventListener('storage', handleStorageChange);

    // 3. Proactively check when user returns to the tab
    window.addEventListener('focus', checkToken);

    return () => {
      window.removeEventListener('force-logout', onForceLogout);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkToken);
    };
  }, [isAuthenticated]);

  // Public route: setup-password (must be accessible without auth)
  if (window.location.pathname === '/setup-password') {
    return (
      <Router>
        <Routes>
          <Route path="/setup-password" element={<SetupPasswordPage />} />
        </Routes>
      </Router>
    );
  }

  // Public route: invitation link to view work orders without auth
  if (window.location.pathname.startsWith('/order/')) {
    return (
      <Router>
        <Routes>
          <Route path="/order/:uuid" element={<PublicWorkOrderPage />} />
        </Routes>
      </Router>
    );
  }

  // Intercept external login callback
  if (window.location.pathname === '/login-callback') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userJson = params.get('user');
    if (token && userJson) {
      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("userProfile", userJson);
        window.location.href = '/';
        return null;
      } catch (e) {
        console.error('Error handling external login callback:', e);
      }
    }
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={(role) => {
      setUserRole(role);
      setIsAuthenticated(true);
    }} />;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const redirectPath = urlParams.get('redirect') || '/dashboard';

  return (
    <Router>
      <Layout onLogout={handleLogout} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Navigate to={redirectPath} replace />} />
          <Route path="/dashboard" element={<DashboardPage userRole={userRole} />} />
          <Route path="/calendar" element={<CalendarPage userRole={userRole} />} />
          <Route path="/work-orders" element={<WorkOrdersPage userRole={userRole} />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailsPage userRole={userRole} />} />
          <Route path="/reports" element={<ReportsPage userRole={userRole} />} />
          {(userRole === 'profesional' || userRole === 'admin') && (
            <Route path="/clients" element={<ClientsPage userRole={userRole} />} />
          )}
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/meteo-report" element={<MeteoReportPage />} />
          {(userRole === 'client' || userRole === 'admin') && (
            <Route path="/profesionales" element={<ProfesionalesPage userRole={userRole} />} />
          )}
          <Route path="/profile" element={<ProfilePage userRole={userRole} onLogout={handleLogout} />} />
          {userRole === 'admin' && (
            <Route path="/db-test" element={<DbTestPage />} />
          )}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
