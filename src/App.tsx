/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import JobsPage from "./pages/JobsPage";
import JobDetailsPage from "./pages/JobDetailsPage";
import ReportsPage from "./pages/ReportsPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import StationsPage from "./pages/StationsPage";
import ProfilePage from "./pages/ProfilePage";
import CalendarPage from "./pages/CalendarPage";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'profesional' | 'cliente' | 'superadmin'>('profesional');

  if (!isAuthenticated) {
    return <LoginPage onLogin={(role) => {
      setUserRole(role);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Router>
      <Layout onLogout={() => setIsAuthenticated(false)} userRole={userRole}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage userRole={userRole} />} />
          <Route path="/calendar" element={<CalendarPage userRole={userRole} />} />
          <Route path="/jobs" element={<JobsPage userRole={userRole} />} />
          <Route path="/jobs/:id" element={<JobDetailsPage userRole={userRole} />} />
          <Route path="/reports" element={<ReportsPage userRole={userRole} />} />
          {(userRole === 'profesional' || userRole === 'superadmin') && (
            <>
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/stations" element={<StationsPage />} />
            </>
          )}
          {(userRole === 'cliente' || userRole === 'superadmin') && (
            <Route path="/profesionales" element={<ProfesionalesPage userRole={userRole} />} />
          )}
          <Route path="/profile" element={<ProfilePage userRole={userRole} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
