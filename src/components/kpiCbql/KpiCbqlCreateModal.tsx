import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  ShieldCheck, 
  Sparkles,
  Info,
  CheckCircle2,
  Filter,
  Award,
  Users
} from 'lucide-react';
import { KpiCbqlForm, KpiCbqlPeriod } from '../../types/kpiCbql';
import { Teacher, Department } from '../../types';
import { 
  getCbqlTeachers, 
  isTeacherCbql,
  getEligibleCbqlEvaluators, 
  initializeCbqlScoreItems,
  calculateCbqlFormTotals,
  resolveCbqlTeacherPosition,
  resolveCbqlTeacherDepartmentName
} from '../../lib/kpiCbqlData';
import { isExcludedCbqlEvaluator } from '../../lib/kpiTargetAudienceUtils';
import { createCbqlForm } from '../../services/kpiCbqlService';
import { useAuth } from '../../store/AuthContext';

interface KpiCbqlCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: KpiCbqlPeriod[];
  existingForms: KpiCbqlForm[];
  teachers: Teacher[];
  departments: Department[];
  onCreated: (formId: string) => void;
}

export default function KpiCbqlCreateModal({
  isOpen,
  onClose,
  periods,
  existingForms,
  teachers,
  departments,
  onCreated
}: KpiCbqlCreateModalProps) {
  const { user } = useAuth();

  // Chế độ lọc danh sách cán bộ: 'cbql_only' (Chỉ CBQL) hoặc 'all' (Tất cả giáo viên)
  const [filterMode, setFilterMode] = useState<'cbql_only' | 'all'>('cbql_only');

  // All available personnel including active admin user if needed
  const allSelectableTeachers = useMemo(() => {
    let list = [...teachers];
    if (user && (user.role === 'BGH' || user.id === 'admin') && !list.some(t => t.id === user.id) && !isExcludedCbqlEvaluator(user as any)) {
      list.unshift({
        id: user.id,
        name: user.name || 'Ban Giám hiệu (Admin)',
        username: user.username || 'admin',
        role: 'BGH',
        position: user.position || 'Hiệu trưởng / Ban Giám hiệu',
        departmentName: 'Trường THPT Minh Hòa',
        code: 'BGH_ADMIN',
        subject: 'Quản lý',
        phone: '',
        email: user.email || '',
        joinDate: '2020-09-01',
        degree: 'Thạc sĩ Quản lý Giáo dục',
        status: 'Đang công tác'
      } as Teacher);
    }
    return list;
  }, [teachers, user]);

  // Lọc danh sách CBQL
  const cbqlList = useMemo(() => {
    return getCbqlTeachers(allSelectableTeachers, departments, user);
  }, [allSelectableTeachers, departments, user]);

  // Danh sách giáo viên thông thường
  const nonCbqlList = useMemo(() => {
    return allSelectableTeachers.filter(t => !isTeacherCbql(t, departments));
  }, [allSelectableTeachers, departments]);

  // Danh sách hiển thị theo chế độ lọc
  const displayTeachersList = useMemo(() => {
    if (filterMode === 'cbql_only') {
      return cbqlList.length > 0 ? cbqlList : allSelectableTeachers;
    }
    return allSelectableTeachers;
  }, [filterMode, cbqlList, allSelectableTeachers]);

  // Selected State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selected teacher & period when opening
  useEffect(() => {
    if (isOpen) {
      if (user && isTeacherCbql(user as any, departments) && displayTeachersList.some(t => t.id === user.id)) {
        setSelectedTeacherId(user.id);
      } else if (cbqlList.length > 0) {
        setSelectedTeacherId(cbqlList[0].id);
      } else if (allSelectableTeachers.length > 0) {
        setSelectedTeacherId(allSelectableTeachers[0].id);
      }

      if (periods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(periods[0].id);
      }
      setErrorMsg(null);
    }
  }, [isOpen, user, cbqlList, allSelectableTeachers, displayTeachersList, departments, periods, selectedPeriodId]);

  // Selected Objects
  const selectedTeacher = useMemo(() => {
    return allSelectableTeachers.find(t => t.id === selectedTeacherId) || null;
  }, [allSelectableTeachers, selectedTeacherId]);

  const selectedPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  // Eligible evaluators for the selected teacher
  const eligibleEvaluators = useMemo(() => {
    const list = getEligibleCbqlEvaluators(selectedTeacher, allSelectableTeachers, departments).filter(t => !isExcludedCbqlEvaluator(t));
    if (list.length > 0) return list;
    // Fallback if no evaluators found
    return allSelectableTeachers.filter(t => (!selectedTeacher || t.id !== selectedTeacher.id) && !isExcludedCbqlEvaluator(t));
  }, [selectedTeacher, allSelectableTeachers, departments]);

  // Auto-select first eligible evaluator
  useEffect(() => {
    if (isOpen) {
      const currentEval = allSelectableTeachers.find(t => t.id === selectedEvaluatorId);
      const isInvalid = !selectedEvaluatorId || !currentEval || isExcludedCbqlEvaluator(currentEval);
      if (isInvalid && eligibleEvaluators.length > 0) {
        setSelectedEvaluatorId(eligibleEvaluators[0].id);
      }
    }
  }, [isOpen, selectedTeacherId, selectedEvaluatorId, eligibleEvaluators, allSelectableTeachers]);

  // Keep evaluator unselected by default so the user must choose manually

  // KIỂM TRA UNIQUE CONSTRAINT: CBQL + Kỳ đánh giá
  const duplicateForm = useMemo(() => {
    if (!selectedTeacherId || !selectedPeriodId) return null;
    return existingForms.find(f => f.evaluateeId === selectedTeacherId && f.periodId === selectedPeriodId) || null;
  }, [existingForms, selectedTeacherId, selectedPeriodId]);

  if (!isOpen) return null;

  const isSelectedTeacherCbql = selectedTeacher ? isTeacherCbql(selectedTeacher, departments) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedTeacher) {
      setErrorMsg('Vui lòng chọn cán bộ quản lý được đánh giá.');
      return;
    }

    if (!selectedPeriod) {
      setErrorMsg('Vui lòng chọn kỳ đánh giá.');
      return;
    }

    if (duplicateForm) {
      setErrorMsg(`Cán bộ ${selectedTeacher.name} đã có phiếu đánh giá cho kỳ ${selectedPeriod.name}. Mỗi CBQL chỉ có 01 phiếu trong một kỳ!`);
      return;
    }

    if (!selectedEvaluatorId) {
      setErrorMsg("Vui lòng chọn cán bộ quản lý/lãnh đạo đánh giá trước khi gửi phiếu.");
      return;
    }

    const evaluator = allSelectableTeachers.find(t => t.id === selectedEvaluatorId);
    if (!evaluator) {
      setErrorMsg("Vui lòng chọn cán bộ quản lý/lãnh đạo đánh giá trước khi gửi phiếu.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Khởi tạo 26 tiêu chí 100 điểm chuẩn
      const initialItems = initializeCbqlScoreItems();
      const initialTotals = calculateCbqlFormTotals(initialItems);

      const resolvedPosition = resolveCbqlTeacherPosition(selectedTeacher, departments);
      const resolvedDepartmentName = resolveCbqlTeacherDepartmentName(selectedTeacher, departments);

      const formPayload: Omit<KpiCbqlForm, 'id' | 'createdAt'> = {
        evaluateeId: selectedTeacher.id,
        evaluateeName: selectedTeacher.name,
        evaluateeCode: selectedTeacher.code || `CBQL_${selectedTeacher.id}`,
        evaluateePosition: resolvedPosition,
        evaluateeDepartmentId: selectedTeacher.departmentId || null,
        evaluateeDepartmentName: resolvedDepartmentName,
        evaluateeAvatar: selectedTeacher.avatar || null,
        evaluatorAvatar: (evaluator as any)?.avatar || null,
        evaluateAvatar: (evaluator as any)?.avatar || null,

        periodId: selectedPeriod.id,
        periodName: selectedPeriod.name,
        academicYear: selectedPeriod.academicYear || '2026-2027',

        selfEvaluatorId: selectedTeacher.id,
        selfEvaluatorName: selectedTeacher.name,

        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        evaluatorPosition: (evaluator as any).position || resolveCbqlTeacherPosition(evaluator as any, departments),

        maxTotalScore: 100,
        selfGroupScores: initialTotals.selfGroupScores,
        selfTotalScore: initialTotals.selfTotalScore,
        evaluatorGroupScores: initialTotals.evaluatorGroupScores,
        evaluatorTotalScore: initialTotals.evaluatorTotalScore,
        scoreDifference: 0,
        grade: 'Chưa xếp loại',

        selfComment: '',
        evaluatorComment: '',
        items: initialItems,
        status: 'draft'
      };

      const newId = await createCbqlForm(formPayload, {
        id: user?.id || 'admin',
        name: user?.name || 'CBQL',
        role: user?.role
      });

      onCreated(newId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi khởi tạo phiếu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Khởi Tạo Phiếu Đánh Giá KPI CBQL Mới</h3>
              <p className="text-xs text-blue-100">Dành riêng cho Cán bộ Lãnh đạo, Quản lý — THPT Minh Hòa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {duplicateForm && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Cảnh báo trùng lặp:</strong> Cán bộ <strong>{duplicateForm.evaluateeName}</strong> đã có phiếu cho <strong>{duplicateForm.periodName}</strong>. Theo quy định, mỗi CBQL chỉ có 01 phiếu trong một kỳ.
              </div>
            </div>
          )}

          {/* LỰA CHỌN CÁN BỘ QUẢN LÝ VỚI BỘ LỌC ĐỐI TƯỢNG */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User size={15} className="text-blue-600" />
                Cán bộ quản lý được đánh giá: <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Danh sách CBQL ({cbqlList.length})
              </span>
            </div>

            <select
              id="select-evaluatee-teacher"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {cbqlList.length > 0 ? (
                cbqlList.map(t => {
                  const pos = resolveCbqlTeacherPosition(t, departments);
                  const dept = resolveCbqlTeacherDepartmentName(t, departments);
                  return (
                    <option key={t.id} value={t.id}>
                      [{pos}] {t.name} — {dept} ({t.code || t.username})
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>Chưa có cán bộ quản lý (CBQL/BGH/TTCM)</option>
              )}
            </select>

            {/* Chi tiết cán bộ được chọn */}
            {selectedTeacher && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                isSelectedTeacherCbql
                  ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${
                    isSelectedTeacherCbql ? 'bg-blue-600' : 'bg-amber-600'
                  }`}>
                    {selectedTeacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{selectedTeacher.name}</div>
                    <div className="text-[11px] text-slate-600">
                      Chức vụ: <strong>{resolveCbqlTeacherPosition(selectedTeacher, departments)}</strong>
                      {' • '}Đơn vị: <strong>{resolveCbqlTeacherDepartmentName(selectedTeacher, departments)}</strong>
                      {selectedTeacher.code ? ` • Mã CB: ${selectedTeacher.code}` : ''}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isSelectedTeacherCbql
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {isSelectedTeacherCbql ? '✓ Đúng đối tượng CBQL' : '⚠️ Giáo viên'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Chọn Kỳ đánh giá */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar size={15} className="text-indigo-600" />
              Kỳ đánh giá & Năm học: <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-period-create"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academicYear}) {p.status === 'locked' ? '🔒 Đã khóa' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Người đánh giá (Thủ trưởng) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              Người đánh giá (Thủ trưởng / BGH / Cấp trên): <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-evaluator-teacher"
              value={selectedEvaluatorId}
              onChange={(e) => setSelectedEvaluatorId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Chọn cán bộ quản lý đánh giá --</option>
              {eligibleEvaluators
                .filter(t => !isExcludedCbqlEvaluator(t))
                .map(t => (
                <option key={t.id} value={t.id}>
                  [{t.role || 'BGH'}] {t.name} — {t.position || 'Hiệu trưởng / Thủ trưởng đơn vị'}
                </option>
              ))}
            </select>
          </div>

          {/* Thông tin quy chuẩn 100 điểm */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Khung tiêu chuẩn đánh giá tự động nạp (Tổng 100.0 điểm):
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>I. Chính trị tư tưởng, đạo đức lối sống (15.0đ - 8 tiêu chí)</li>
              <li>II. Tác phong, lề lối, kỷ luật (15.0đ - 7 tiêu chí)</li>
              <li>III. Kết quả thực hiện nhiệm vụ (70.0đ - 11 tiêu chí)</li>
            </ul>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!duplicateForm}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Phiếu Ngay'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
