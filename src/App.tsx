import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';

// Route pages are code-split: each becomes its own chunk fetched on first
// navigation, instead of every page shipping in the initial bundle.
// LoginPage and DashboardLayout stay eager — both are needed to paint anything.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CasesPage = lazy(() => import('./pages/CasesPage'));
const CaseDetailsPage = lazy(() => import('./pages/CaseDetailsPage'));
const CaseFormPage = lazy(() => import('./pages/CaseFormPage'));
const HearingsPage = lazy(() => import('./pages/HearingsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StorageMonitoringPage = lazy(() => import('./pages/StorageMonitoringPage'));
const GitHubIntegrationPage = lazy(() => import('./pages/GitHubIntegrationPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const CaseLookupPage = lazy(() => import('./pages/CaseLookupPage'));
const AdvocateReportPage = lazy(() => import('./pages/AdvocateReportPage'));
const DailyCauselistPage = lazy(() => import('./pages/DailyCauselistPage'));
const SittingArrangementsPage = lazy(() => import('./pages/SittingArrangementsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const LegalDocGeneratorPage = lazy(() => import('./pages/LegalDocGeneratorPage'));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
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
              <Suspense fallback={<PageSpinner />}>
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
                <Route path="/storage" element={<StorageMonitoringPage />} />
                <Route path="/github" element={<GitHubIntegrationPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/advocate-report" element={<AdvocateReportPage />} />
                <Route path="/daily-causelist" element={<DailyCauselistPage />} />
                <Route path="/case-lookup" element={<CaseLookupPage />} />
                <Route path="/sitting-arrangements" element={<SittingArrangementsPage />} />
                <Route path="/legal-docs" element={<LegalDocGeneratorPage />} />
                <Route path="/links" element={<LinksPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
              </Suspense>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  // ── Native shell init: hide splash + configure status bar ────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Hide splash after React has painted the first frame
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(console.warn);

    // Dark-content status bar (white icons) matching the dark theme
    StatusBar.setStyle({ style: Style.Dark }).catch(console.warn);
    StatusBar.setBackgroundColor({ color: '#1e293b' }).catch(console.warn);
  }, []);

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
