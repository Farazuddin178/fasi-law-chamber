import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import CaseDetailsPage from './pages/CaseDetailsPage';
import CaseFormPage from './pages/CaseFormPage';
import HearingsPage from './pages/HearingsPage';
import TasksPage from './pages/TasksPage';
import DocumentsPage from './pages/DocumentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ExpensesPage from './pages/ExpensesPage';
import UsersPage from './pages/UsersPage';
import LoginLogsPage from './pages/LoginLogsPage';
import SettingsPage from './pages/SettingsPage';
import StorageMonitoringPage from './pages/StorageMonitoringPage';
import GitHubIntegrationPage from './pages/GitHubIntegrationPage';
import MessagesPage from './pages/MessagesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import LinksPage from './pages/LinksPage';
import CalendarPage from './pages/CalendarPage';
import CaseLookupPage from './pages/CaseLookupPage';
import AdvocateReportPage from './pages/AdvocateReportPage';
import SittingArrangementsPage from './pages/SittingArrangementsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/new" element={<CaseFormPage />} />
                <Route path="/cases/:id/edit" element={<CaseFormPage />} />
                <Route path="/cases/:id" element={<CaseDetailsPage />} />
                <Route path="/hearings" element={<HearingsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/logs" element={<LoginLogsPage />} />
                <Route path="/storage" element={<StorageMonitoringPage />} />
                <Route path="/github" element={<GitHubIntegrationPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/advocate-report" element={<AdvocateReportPage />} />
                <Route path="/case-lookup" element={<CaseLookupPage />} />
                <Route path="/sitting-arrangements" element={<SittingArrangementsPage />} />
                <Route path="/links" element={<LinksPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
