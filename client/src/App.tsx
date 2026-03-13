import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ROUTES } from './lib/constants';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const PostsPage = lazy(() => import('./pages/PostsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const BulkSchedulePage = lazy(() => import('./pages/BulkSchedulePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));
const SharedReportPage = lazy(() => import('./pages/SharedReportPage'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size={28} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.ACCOUNTS} element={<AccountsPage />} />
            <Route path={ROUTES.POSTS} element={<PostsPage />} />
            <Route path={ROUTES.CALENDAR} element={<CalendarPage />} />
            <Route path={ROUTES.MESSAGES} element={<MessagesPage />} />
            <Route path={ROUTES.AUDIT_LOG} element={<AuditLogPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTES.TEMPLATES} element={<TemplatesPage />} />
            <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={ROUTES.BULK_SCHEDULE} element={<BulkSchedulePage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.REPORT_VIEW} element={<ReportViewPage />} />
          </Route>
        </Route>

        <Route path={ROUTES.SHARED_REPORT} element={<SharedReportPage />} />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}
