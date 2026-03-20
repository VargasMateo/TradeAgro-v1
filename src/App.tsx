/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import WorkOrderDetailsPage from "./pages/WorkOrderDetailsPage";
import ReportsPage from "./pages/ReportsPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import StationsPage from "./pages/StationsPage";
import ProfilePage from "./pages/ProfilePage";
import CalendarPage from "./pages/CalendarPage";
import DbTestPage from "./pages/DbTestPage";

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
    window.history.replaceState(null, '', '/dashboard');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={(role) => {
      setUserRole(role);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage userRole={userRole} />} />
          <Route path="/calendar" element={<CalendarPage userRole={userRole} />} />
          <Route path="/work-orders" element={<WorkOrdersPage userRole={userRole} />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailsPage userRole={userRole} />} />
          <Route path="/reports" element={<ReportsPage userRole={userRole} />} />
          {(userRole === 'profesional' || userRole === 'admin') && (
            <>
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/stations" element={<StationsPage />} />
            </>
          )}
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
