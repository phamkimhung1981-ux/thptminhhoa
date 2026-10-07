import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { AppProvider } from './store/AppContext';
import { UnsavedChangesProvider } from './store/UnsavedChangesContext';
import Login from './pages/Login';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';

import LeaveTracking from './pages/LeaveTracking';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Teachers from './pages/Teachers';
import Departments from './pages/Departments';
import Documents from './pages/Documents';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import KpiCbql from './pages/KpiCbql';
import KpiTeacherStaff from './pages/KpiTeacherStaff';
import KpiStaff from './pages/KpiStaff';
import Discipline from './pages/Discipline';
import KpiCatalog from './pages/KpiCatalog';
import Homeroom from './pages/Homeroom';
import DepartmentSchedule from './pages/DepartmentSchedule';
import SchoolWorkSchedule from './pages/SchoolWorkSchedule';
import YouthDiscipline from './pages/YouthDiscipline';
import YouthDutySchedule from './pages/YouthDutySchedule';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kpi-cbql" element={<KpiCbql />} />
        <Route path="/kpi-gvnv" element={<KpiTeacherStaff />} />
        <Route path="/kpi-nv" element={<KpiStaff />} />
        <Route path="/kpi-nhan-vien" element={<KpiStaff />} />
        <Route path="/kpi-staff" element={<KpiStaff />} />
        <Route path="/kpi-catalog" element={<KpiCatalog />} />
        <Route path="/kpi" element={<KpiCatalog />} />
        <Route path="/monthly-kpi" element={<KpiCatalog />} />
        <Route path="/discipline" element={<Discipline />} />
        <Route path="/nen-nep" element={<Discipline />} />
        <Route path="/youth-discipline" element={<YouthDiscipline />} />
        <Route path="/doan-tn/nen-nep-hoc-sinh" element={<YouthDiscipline />} />
        <Route path="/nen-nep-hoc-sinh" element={<YouthDiscipline />} />
        <Route path="/doan-thanh-nien" element={<YouthDiscipline />} />
        <Route path="/youth-duty-schedule" element={<YouthDutySchedule />} />
        <Route path="/lich-truc-doan" element={<YouthDutySchedule />} />
        <Route path="/lich-truc-doan-tn" element={<YouthDutySchedule />} />
        <Route path="/doan-tn/lich-truc" element={<YouthDutySchedule />} />
        <Route path="/homeroom" element={<Homeroom />} />
        <Route path="/cong-tac-chu-nhiem" element={<Homeroom />} />
        <Route path="/chu-nhiem" element={<Homeroom />} />
        <Route path="/tasks" element={<Navigate to="/school-work-schedule" replace />} />
        <Route path="/tasks/:deptSlug" element={<Navigate to="/school-work-schedule" replace />} />
        <Route path="/school-work-schedule" element={<SchoolWorkSchedule />} />
        <Route path="/lich-cong-viec" element={<SchoolWorkSchedule />} />
        <Route path="/lich-cong-viec-truong" element={<SchoolWorkSchedule />} />
        <Route path="/work-schedule" element={<SchoolWorkSchedule />} />
        <Route path="/leaves" element={<LeaveTracking />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/van-ban" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/department-schedule" element={<DepartmentSchedule />} />
        <Route path="/department-schedules" element={<DepartmentSchedule />} />
        <Route path="/lich-giao-viec-to" element={<DepartmentSchedule />} />
        <Route path="/lich-to-chuyen-mon" element={<DepartmentSchedule />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  props: { children: React.ReactNode };
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Đã xảy ra lỗi khi tải giao diện</h2>
            <p className="text-sm text-slate-600 mb-6">{this.state.error?.message || "Vui lòng thử lại sau hoặc tải lại trang."}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <UnsavedChangesProvider>
              <AppRoutes />
            </UnsavedChangesProvider>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}




