import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import TeacherLeaveView from '../components/leave/TeacherLeaveView';
import ManagerLeaveView from '../components/leave/ManagerLeaveView';
import { CalendarDays, ClipboardCheck, Clock, FileSpreadsheet, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import BackButton from '../components/ui/BackButton';

export default function LeaveTracking() {
  const { leaveRecords } = useAppContext();
  const { user: currentUser } = useAuth();
  const isAdmin = !currentUser || currentUser?.role === 'BGH' || currentUser?.role === 'NHAN_SU' || currentUser?.username === 'admin' || (currentUser as any)?.role === 'ADMIN';
  const isManager = isAdmin;
  const isHead = currentUser?.role === 'TTCM';
  const canManage = isManager || isHead;

  const pendingCount = leaveRecords.filter(r => {
    if (r.status !== 'Chờ duyệt') return false;
    if (isAdmin) return true;
    if (isHead) return r.departmentId === currentUser?.departmentId || r.department_id === currentUser?.departmentId;
    return false;
  }).length;

  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 pb-12 font-sans">
      <div className="flex items-center">
        <BackButton />
      </div>
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Quản lý nghỉ phép</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Quản lý và theo dõi lịch nghỉ phép</p>
          </div>
        </div>
      </div>

      <div className="border p-2 flex items-center gap-2 overflow-x-auto bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
        {/* Tab 1: Đăng ký nghỉ - Always available and primary for all roles */}
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all",
            activeTab === 'requests'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <ClipboardCheck size={18} />
          Đăng ký nghỉ
        </button>

        {/* Tab 2: Chờ duyệt - For managers */}
        {canManage && (
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all",
              activeTab === 'pending'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Clock size={18} />
            Chờ duyệt
            {pendingCount > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full font-bold",
                activeTab === 'pending' ? "bg-white text-blue-700" : "bg-amber-100 text-amber-800"
              )}>
                {pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Management Tabs */}
        {canManage && (
          <>
            <button
              onClick={() => setActiveTab('stats')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all",
                activeTab === 'stats'
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Activity size={18} />
              Thống kê
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all",
                activeTab === 'reports'
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <FileSpreadsheet size={18} />
              Báo cáo
            </button>
          </>
        )}
      </div>

      <div className="mt-4">
        {activeTab === 'requests' && (
          <TeacherLeaveView activeTab="requests" />
        )}
        {canManage && activeTab !== 'requests' && (
          <ManagerLeaveView activeTab={activeTab} />
        )}
      </div>
    </div>
  );
}
