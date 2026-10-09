import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  FileText, 
  Plus, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  Award, 
  Edit, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RefreshCw,
  Layers,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertCircle,
  Home,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import BackButton from '../components/ui/BackButton';
import { 
  KpiCbqlForm, 
  KpiCbqlPeriod, 
  KpiCbqlCriterion, 
  KpiCbqlAuditLog 
} from '../types/kpiCbql';
import { 
  subscribeCbqlForms, 
  subscribeCbqlPeriods, 
  subscribeCbqlCriteria, 
  subscribeCbqlAuditLogs, 
  seedCbqlInitialDataIfNeeded,
  deleteCbqlForm
} from '../services/kpiCbqlService';
import { getCbqlTeachers, getCbqlFormStatusBadge } from '../lib/kpiCbqlData';
import KpiCbqlDashboard from '../components/kpiCbql/KpiCbqlDashboard';
import KpiCbqlFormModal from '../components/kpiCbql/KpiCbqlFormModal';
import KpiCbqlCreateModal from '../components/kpiCbql/KpiCbqlCreateModal';
import KpiCbqlDocumentModal from '../components/kpiCbql/KpiCbqlDocumentModal';
import KpiCbqlPeriodModal from '../components/kpiCbql/KpiCbqlPeriodModal';
import KpiCbqlCriteriaModal from '../components/kpiCbql/KpiCbqlCriteriaModal';
import KpiCbqlAuditLogsModal from '../components/kpiCbql/KpiCbqlAuditLogsModal';
import KpiCbqlPrintModal from '../components/kpiCbql/KpiCbqlPrintModal';
import { exportCbqlSummaryListToExcel, exportSingleCbqlFormToExcel } from '../utils/kpiCbqlExport';
import { exportCbqlFormToWord } from '../utils/kpiWordExport';

export default function KpiCbql() {
  const navigate = useNavigate();
  const { teachers, departments } = useAppContext();
  const { user } = useAuth();

  // State Firestore Data
  const [forms, setForms] = useState<KpiCbqlForm[]>([]);
  const [periods, setPeriods] = useState<KpiCbqlPeriod[]>([]);
  const [criteria, setCriteria] = useState<KpiCbqlCriterion[]>([]);
  const [auditLogs, setAuditLogs] = useState<KpiCbqlAuditLog[]>([]);

  // Page View Modes: 'dashboard' | 'list' | 'report'
  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'list' | 'report'>('dashboard');

  // Filter & Search State
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  // Document Modal state (for Create / Edit / View / Evaluator)
  const [selectedFormForDoc, setSelectedFormForDoc] = useState<KpiCbqlForm | null>(null);
  const [docModalMode, setDocModalMode] = useState<'create' | 'edit' | 'evaluator' | 'view'>('create');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Print Modal state
  const [selectedFormForPrint, setSelectedFormForPrint] = useState<KpiCbqlForm | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [exportingWordId, setExportingWordId] = useState<string | null>(null);

  const handleExportWord = async (form: KpiCbqlForm) => {
    if (!form || !form.id) {
      alert('Vui lòng lưu phiếu trước khi xuất Word.');
      return;
    }
    setExportingWordId(form.id);
    try {
      await exportCbqlFormToWord(form);
    } catch (err) {
      alert('Lỗi xuất file Word: ' + (err instanceof Error ? err.message : 'Không xác định'));
    } finally {
      setExportingWordId(null);
    }
  };

  // CBQL Teacher list
  const cbqlTeachers = useMemo(() => {
    return getCbqlTeachers(teachers, departments, user);
  }, [teachers, departments, user]);

  // Initial Firestore setup & subscriptions
  useEffect(() => {
    seedCbqlInitialDataIfNeeded();

    const unsubForms = subscribeCbqlForms(setForms);
    const unsubPeriods = subscribeCbqlPeriods((pList) => {
      setPeriods(pList);
    });
    const unsubCriteria = subscribeCbqlCriteria(setCriteria);
    const unsubLogs = subscribeCbqlAuditLogs(setAuditLogs);

    return () => {
      unsubForms();
      unsubPeriods();
      unsubCriteria();
      unsubLogs();
    };
  }, []);

  // Filtered Forms for List & Report view
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchPeriod = selectedPeriodId === 'all' || f.periodId === selectedPeriodId;
      const matchStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchGrade = gradeFilter === 'all' || f.grade === gradeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (f.evaluateeName || '').toLowerCase().includes(q) ||
        (f.evaluateePosition || '').toLowerCase().includes(q) ||
        (f.evaluatorName || '').toLowerCase().includes(q)
      );
      return matchPeriod && matchStatus && matchGrade && matchSearch;
    });
  }, [forms, selectedPeriodId, statusFilter, gradeFilter, searchQuery]);

  // Permission flags
  const isAdmin = user?.id === 'admin' || user?.role === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');

  const canDeleteForm = (form: KpiCbqlForm) => {
    if (!user) return false;
    if (user.id === 'admin' || user.role === 'admin' || user.role === 'BGH' || user.role === 'TTCM' || user.role === 'CBQL' || user.role === 'manager') return true;
    const pos = (user.position || '').toLowerCase();
    if (pos.includes('hiệu trưởng') || pos.includes('tổ trưởng') || pos.includes('quản lý') || pos.includes('bgh')) return true;
    if (form.evaluateeId === user.id && (form.status === 'pending_evaluation' || !form.status)) return true;
    return false;
  };

  // Delete modal state
  const [formToDelete, setFormToDelete] = useState<KpiCbqlForm | null>(null);
  const [isDeletingForm, setIsDeletingForm] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Open Document Modal Helper (Create or Edit existing form)
  const handleOpenCreateModal = () => {
    setSelectedFormForDoc(null);
    setDocModalMode('create');
    setIsDocModalOpen(true);
  };

  const handleOpenDocumentModal = (form: KpiCbqlForm, mode: 'edit' | 'evaluator' | 'view') => {
    setSelectedFormForDoc(form);
    setDocModalMode(mode);
    setIsDocModalOpen(true);
  };

  // Open Print Modal Helper
  const handleOpenPrintModal = (form: KpiCbqlForm) => {
    setSelectedFormForPrint(form);
    setIsPrintModalOpen(true);
  };

  // Delete Form Helpers
  const handleRequestDeleteForm = (form: KpiCbqlForm) => {
    setDeleteError(null);
    setFormToDelete(form);
  };

  const handleConfirmDeleteForm = async () => {
    if (!formToDelete) return;
    setIsDeletingForm(true);
    setDeleteError(null);
    try {
      await deleteCbqlForm(formToDelete.id, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      // Optimistic local state update
      setForms(prev => prev.filter(f => f.id !== formToDelete.id));
      setFormToDelete(null);
    } catch (err: any) {
      console.error('Lỗi khi xóa phiếu KPI CBQL:', err);
      setDeleteError(err.message || 'Lỗi khi xóa phiếu. Vui lòng thử lại.');
    } finally {
      setIsDeletingForm(false);
    }
  };

  // Selected period object
  const currentSelectedPeriod = periods.find(p => p.id === selectedPeriodId);

  return (
    <div id="kpi-cbql-root-page" className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* NAVIGATION / BREADCRUMB ROW */}
      <div className="flex items-center gap-4">
        <BackButton />
      </div>

      {/* HEADER SECTION CHÍNH */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                <Award size={13} /> TRƯỜNG THPT MINH HÒA
              </span>
            </div>

            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight text-white uppercase drop-shadow-md leading-snug">
              ĐÁNH GIÁ KPI CÁN BỘ QUẢN LÝ
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-3xl leading-relaxed">
              Dành riêng cho Cán bộ Quản lý (100 điểm):
              Chính trị tư tưởng (15đ) • Tác phong kỷ luật (15đ) • Kết quả thực hiện nhiệm vụ (70đ).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
              title="Trở về Trang chủ Dashboard"
            >
              <Home size={15} />
              <span>Trang chủ</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold bg-white text-blue-950 hover:bg-blue-50 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} className="text-blue-600" />
              <span>Tạo Phiếu Đánh Giá Mới</span>
            </button>

            <button
              onClick={() => {
                const pName = currentSelectedPeriod?.name || 'Tat_ca_ky';
                const yName = currentSelectedPeriod?.academicYear || '2026-2027';
                exportCbqlSummaryListToExcel(filteredForms, pName, yName);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Báo Cáo Excel</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS (DASHBOARD / DANH SÁCH / BÁO CÁO) */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveMainTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'dashboard'
                ? 'bg-white text-blue-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <BarChart3 size={16} />
            <span>Tổng Quan Dashboard</span>
          </button>

          <button
            onClick={() => setActiveMainTab('list')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'list'
                ? 'bg-white text-blue-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <FileText size={16} />
            <span>Danh Sách Phiếu Đánh Giá ({filteredForms.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('report')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'report'
                ? 'bg-white text-blue-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <TrendingUp size={16} />
            <span>Báo Cáo & Xếp Loại</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW TAB: DASHBOARD */}
      {/* ========================================================================= */}
      {activeMainTab === 'dashboard' && (
        <KpiCbqlDashboard
          forms={forms}
          periods={periods}
          cbqlTeachers={cbqlTeachers}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={setSelectedPeriodId}
          onCreateNew={handleOpenCreateModal}
          onOpenPeriodManager={() => setIsPeriodModalOpen(true)}
          onOpenCriteriaManager={() => setIsCriteriaModalOpen(true)}
          onOpenAuditLogs={() => setIsAuditLogsModalOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW TAB: DANH SÁCH PHIẾU ĐÁNH GIÁ */}
      {/* ========================================================================= */}
      {activeMainTab === 'list' && (
        <div className="space-y-4">
          
          {/* THANH LỌC & TÌM KIẾM */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              
              {/* Ô tìm kiếm */}
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm họ tên, chức vụ CBQL..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lọc kỳ */}
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="all">-- Tất cả các kỳ --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Lọc trạng thái */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="all">-- Tất cả trạng thái --</option>
                <option value="draft">Bản nháp</option>
                <option value="pending_evaluation">Chờ đánh giá</option>
                <option value="evaluated">Đã đánh giá</option>
                <option value="locked">Đã chốt (Khóa)</option>
              </select>

              {/* Lọc xếp loại */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="all">-- Tất cả xếp loại --</option>
                <option value="Xuất sắc">Xuất sắc</option>
                <option value="Tốt">Tốt</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Không hoàn thành">Không hoàn thành</option>
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-slate-500 font-semibold">
                Hiển thị: <strong>{filteredForms.length}</strong> phiếu
              </span>
            </div>
          </div>

          {/* BẢNG DANH SÁCH PHIẾU ĐÁNH GIÁ */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="p-3.5 w-12 text-center">STT</th>
                    <th className="p-3.5 min-w-[200px]">Cán bộ Quản lý</th>
                    <th className="p-3.5 min-w-[140px]">Kỳ đánh giá</th>
                    <th className="p-3.5 w-24 text-center bg-blue-50/50 text-blue-800">Tự chấm</th>
                    <th className="p-3.5 w-24 text-center bg-indigo-50/50 text-indigo-800">Thủ trưởng</th>
                    <th className="p-3.5 w-20 text-center">Độ lệch</th>
                    <th className="p-3.5 min-w-[110px] text-center">Xếp loại</th>
                    <th className="p-3.5 min-w-[130px]">Người đánh giá</th>
                    <th className="p-3.5 min-w-[120px] text-center">Trạng thái</th>
                    <th className="p-3.5 min-w-[160px] text-right pr-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredForms.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                        Không tìm thấy phiếu đánh giá nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredForms.map((f, idx) => {
                      const statusBadge = getCbqlFormStatusBadge(f.status);
                      const isCurrentEvaluatee = user?.id === f.evaluateeId;
                      const isCurrentEvaluator = user?.id === f.evaluatorId || isAdmin;
                      const diff = f.scoreDifference || 0;

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          
                          {/* CBQL */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 text-sm">{f.evaluateeName}</div>
                            <div className="text-slate-500 text-[11px]">{f.evaluateePosition}</div>
                          </td>

                          {/* Kỳ đánh giá */}
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-700">{f.periodName}</div>
                            <div className="text-slate-400 text-[10.5px]">Năm học: {f.academicYear}</div>
                          </td>

                          {/* Điểm tự chấm */}
                          <td className="p-3.5 text-center font-extrabold text-blue-700 bg-blue-50/30 text-sm">
                            {f.selfTotalScore || 0}<span className="text-[10px] font-normal text-slate-400">/100</span>
                          </td>

                          {/* Điểm thủ trưởng */}
                          <td className="p-3.5 text-center font-extrabold text-indigo-700 bg-indigo-50/30 text-sm">
                            {f.evaluatorTotalScore > 0 ? (
                              <>
                                {f.evaluatorTotalScore}<span className="text-[10px] font-normal text-slate-400">/100</span>
                              </>
                            ) : (
                              <span className="text-slate-400 text-xs font-normal">Chưa chấm</span>
                            )}
                          </td>

                          {/* Độ lệch */}
                          <td className="p-3.5 text-center font-bold">
                            {f.evaluatorTotalScore > 0 ? (
                              <span className={diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : (
                              <span className="text-slate-300">--</span>
                            )}
                          </td>

                          {/* Xếp loại */}
                          <td className="p-3.5 text-center">
                            <span className={`inline-block font-extrabold text-[11px] px-2.5 py-0.5 rounded-full ${
                              f.grade === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800' :
                              f.grade === 'Tốt' ? 'bg-blue-100 text-blue-800' :
                              f.grade === 'Hoàn thành' ? 'bg-amber-100 text-amber-800' : 
                              f.grade === 'Không hoàn thành' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {f.grade || 'Chưa xếp loại'}
                            </span>
                          </td>

                          {/* Người đánh giá */}
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{f.evaluatorName}</div>
                            <div className="text-slate-400 text-[10.5px]">{f.evaluatorPosition}</div>
                          </td>

                          {/* Trạng thái */}
                          <td className="p-3.5 text-center">
                            <span className={`inline-block font-bold text-[10.5px] px-2.5 py-1 rounded-full border ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Thao tác */}
                          <td className="p-3.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Nút Xem chi tiết */}
                              <button
                                onClick={() => handleOpenDocumentModal(f, 'view')}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Xem chi tiết phiếu (Xem)"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Nút Chỉnh sửa phiếu */}
                              {((isCurrentEvaluatee || isCurrentEvaluator || isAdmin) && f.status !== 'locked') && (
                                <button
                                  onClick={() => handleOpenDocumentModal(f, (isCurrentEvaluator && f.status !== 'draft') ? 'evaluator' : 'edit')}
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                                  title="Chỉnh sửa phiếu"
                                >
                                  <Edit size={15} />
                                </button>
                              )}

                              {/* Nút In phiếu */}
                              <button
                                onClick={() => handleOpenPrintModal(f)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="In phiếu A4"
                              >
                                <Printer size={15} />
                              </button>

                              {/* Nút Xuất PDF */}
                              <button
                                onClick={() => handleOpenPrintModal(f)}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                                title="Xuất PDF"
                              >
                                <Download size={15} />
                              </button>

                              {/* Nút Xuất Excel */}
                              <button
                                onClick={() => exportSingleCbqlFormToExcel(f)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                title="Xuất Excel phiếu này"
                              >
                                <FileSpreadsheet size={15} />
                              </button>

                              {/* Nút Xuất Word */}
                              <button
                                onClick={() => handleExportWord(f)}
                                disabled={exportingWordId === f.id}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                                title="Xuất Word (.doc)"
                              >
                                {exportingWordId === f.id ? (
                                  <Loader2 size={15} className="animate-spin text-blue-600" />
                                ) : (
                                  <FileText size={15} />
                                )}
                              </button>

                              {/* Nút Mở khóa (Admin) nếu đã khóa */}
                              {isAdmin && f.status === 'locked' && (
                                <button
                                  onClick={() => handleOpenDocumentModal(f, 'view')}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                                  title="Mở khóa phiếu đánh giá"
                                >
                                  <Unlock size={15} />
                                </button>
                              )}

                              {/* Nút Xóa phiếu */}
                              {canDeleteForm(f) && (
                                <button
                                  onClick={() => handleRequestDeleteForm(f)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title="Xóa phiếu đánh giá"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW TAB: BÁO CÁO & XẾP LOẠI */}
      {/* ========================================================================= */}
      {activeMainTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 uppercase">
                  Báo Cáo Tổng Hợp Kết Quả Đánh Giá KPI CBQL
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bảng tổng hợp xếp loại và đối chiếu điểm của toàn thể Cán bộ Quản lý THPT Minh Hòa
                </p>
              </div>

              <button
                onClick={() => {
                  const pName = currentSelectedPeriod?.name || 'Tat_ca';
                  const yName = currentSelectedPeriod?.academicYear || '2026-2027';
                  exportCbqlSummaryListToExcel(filteredForms, pName, yName);
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download size={15} />
                <span>Tải Báo Cáo Excel</span>
              </button>
            </div>

            {/* Bảng báo cáo tổng hợp */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="p-3 w-10 text-center">STT</th>
                    <th className="p-3">Họ và tên CBQL</th>
                    <th className="p-3">Chức vụ</th>
                    <th className="p-3 text-center bg-blue-50 text-blue-900 font-bold">Điểm tự đánh giá</th>
                    <th className="p-3 text-center bg-indigo-50 text-indigo-900 font-bold">Điểm lãnh đạo đánh giá</th>
                    <th className="p-3 text-center">Độ lệch</th>
                    <th className="p-3 text-center">Xếp loại</th>
                    <th className="p-3">Người đánh giá</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredForms.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{f.evaluateeName}</td>
                      <td className="p-3 text-slate-600">{f.evaluateePosition}</td>
                      <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{f.selfTotalScore || 0}</td>
                      <td className="p-3 text-center font-bold text-indigo-700 bg-indigo-50/30">{f.evaluatorTotalScore || 0}</td>
                      <td className="p-3 text-center font-bold">
                        {f.scoreDifference > 0 ? `+${f.scoreDifference}` : f.scoreDifference}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block font-extrabold text-[10.5px] px-2 py-0.5 rounded-full ${
                          f.grade === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800' :
                          f.grade === 'Tốt' ? 'bg-blue-100 text-blue-800' :
                          f.grade === 'Hoàn thành' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.grade || 'Chưa xếp loại'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{f.evaluatorName}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.status === 'locked' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.status === 'locked' ? 'Đã chốt' : 'Đang xử lý'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL MODALS */}
      {/* ========================================================================= */}
      
      {/* Modal Phiếu Đánh Giá Chuẩn Word (Tạo Mới / Chỉnh Sửa / Đánh Giá / Xem Chi Tiết) */}
      <KpiCbqlDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setSelectedFormForDoc(null);
        }}
        mode={docModalMode}
        form={selectedFormForDoc}
        periods={periods}
        existingForms={forms}
        teachers={teachers}
        departments={departments}
        onSaved={(id) => {
          // Refreshed automatically via realtime listener
        }}
        onPrint={(f) => handleOpenPrintModal(f)}
      />

      {/* Modal Quản lý kỳ */}
      <KpiCbqlPeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        periods={periods}
      />

      {/* Modal Quản lý tiêu chí */}
      <KpiCbqlCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        criteria={criteria}
      />

      {/* Modal Audit Logs */}
      <KpiCbqlAuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        logs={auditLogs}
      />

      {/* Modal In Phiếu A4 */}
      {selectedFormForPrint && (
        <KpiCbqlPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedFormForPrint(null);
          }}
          form={selectedFormForPrint}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA PHIẾU CBQL */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Xác nhận xóa phiếu KPI CBQL</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">
                Bạn có chắc chắn muốn xóa phiếu đánh giá của:
              </p>
              <p className="text-sm font-bold text-rose-700">
                👤 {formToDelete.evaluateeName} ({formToDelete.evaluateePosition || 'CBQL'})
              </p>
              <p className="text-slate-600">
                Kỳ đánh giá: <span className="font-medium text-slate-800">{formToDelete.periodName}</span>
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingForm}
                onClick={() => setFormToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingForm}
                onClick={handleConfirmDeleteForm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingForm ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
