import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Send, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Printer, 
  FileSpreadsheet, 
  AlertCircle, 
  Info, 
  Layers, 
  User, 
  Calendar, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Link,
  MessageSquare,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { 
  KpiCbqlForm, 
  KpiCbqlScoreItem 
} from '../../types/kpiCbql';
import { DEFAULT_CBQL_CRITERIA, calculateCbqlFormTotals, getCbqlFormStatusBadge } from '../../lib/kpiCbqlData';
import { 
  saveCbqlSelfEvaluation, 
  submitCbqlForm, 
  evaluateCbqlForm, 
  lockCbqlForm, 
  unlockCbqlForm 
} from '../../services/kpiCbqlService';
import { useAuth } from '../../store/AuthContext';
import { exportSingleCbqlFormToExcel } from '../../utils/kpiCbqlExport';

interface KpiCbqlFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: KpiCbqlForm;
  mode: 'self' | 'evaluator' | 'view';
  onPrint?: (form: KpiCbqlForm) => void;
  onRefresh?: () => void;
}

export default function KpiCbqlFormModal({
  isOpen,
  onClose,
  form,
  mode: initialMode,
  onPrint,
  onRefresh
}: KpiCbqlFormModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'self' | 'evaluator' | 'view'>(initialMode);
  const [items, setItems] = useState<KpiCbqlScoreItem[]>([]);
  const [selfComment, setSelfComment] = useState<string>('');
  const [evaluatorComment, setEvaluatorComment] = useState<string>('');
  const [generalEvidence, setGeneralEvidence] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Collapse state for groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    group_I: false,
    group_II: false,
    group_III: false
  });

  // Role permissions
  const isAdmin = user?.id === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');
  const isSelf = user?.id === form.evaluateeId;
  const isEvaluator = user?.id === form.evaluatorId || isAdmin;
  const isLocked = form.status === 'locked';

  // Synchronize state when form changes
  useEffect(() => {
    if (form) {
      // Ensure all criteria are present
      if (form.items && form.items.length > 0) {
        setItems(JSON.parse(JSON.stringify(form.items)));
      } else {
        // Build items from default criteria
        const initialItems: KpiCbqlScoreItem[] = DEFAULT_CBQL_CRITERIA.map(c => {
          const defLevel = c.levels[0];
          return {
            criterionId: c.id,
            criterionCode: c.code,
            criterionName: c.name,
            groupId: c.groupId,
            groupCode: c.groupCode,
            subCategoryTitle: c.subCategoryTitle,
            maxScore: c.maxScore,
            selfScore: defLevel.score,
            selfLevelId: defLevel.id,
            selfLevelLabel: defLevel.label,
            selfEvidence: '',
            selfNote: '',
            evaluatorScore: defLevel.score,
            evaluatorLevelId: defLevel.id,
            evaluatorLevelLabel: defLevel.label,
            evaluatorNote: ''
          };
        });
        setItems(initialItems);
      }

      setSelfComment(form.selfComment || '');
      setEvaluatorComment(form.evaluatorComment || '');
      setGeneralEvidence(form.generalEvidence || '');
      setActiveTab(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [form, initialMode]);

  // Real-time calculation of all score totals
  const totals = useMemo(() => {
    return calculateCbqlFormTotals(items);
  }, [items]);

  if (!isOpen || !form) return null;

  // Handle self-evaluation level selection (RADIO BUTTON)
  const handleSelectSelfLevel = (criterionId: string, level: { id: string; label: string; score: number }) => {
    if (isLocked || (activeTab !== 'self' && !isAdmin)) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          selfScore: level.score,
          selfLevelId: level.id,
          selfLevelLabel: level.label
        };
      }
      return item;
    }));
  };

  // Handle evaluator level selection (RADIO BUTTON)
  const handleSelectEvaluatorLevel = (criterionId: string, level: { id: string; label: string; score: number }) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return {
          ...item,
          evaluatorScore: level.score,
          evaluatorLevelId: level.id,
          evaluatorLevelLabel: level.label
        };
      }
      return item;
    }));
  };

  // Handle evidence / notes update
  const handleItemEvidenceChange = (criterionId: string, value: string) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return { ...item, selfEvidence: value };
      }
      return item;
    }));
  };

  const handleItemEvaluatorNoteChange = (criterionId: string, value: string) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.criterionId === criterionId) {
        return { ...item, evaluatorNote: value };
      }
      return item;
    }));
  };

  // Save Self Evaluation as Draft
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await saveCbqlSelfEvaluation(
        form.id,
        {
          items,
          selfGroupScores: totals.selfGroupScores,
          selfTotalScore: totals.selfTotalScore,
          selfComment,
          generalEvidence
        },
        { id: user?.id || 'admin', name: user?.name || 'CBQL', role: user?.role }
      );
      setSuccessMsg('Đã lưu bản tự đánh giá thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Self Evaluation (Send to Evaluator)
  const handleSubmitSelfEvaluation = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await submitCbqlForm(
        form.id,
        {
          items,
          selfGroupScores: totals.selfGroupScores,
          selfTotalScore: totals.selfTotalScore,
          selfComment,
          generalEvidence,
          evaluatorName: form.evaluatorName
        },
        { id: user?.id || 'admin', name: user?.name || 'CBQL', role: user?.role }
      );
      setSuccessMsg('Đã gửi phiếu lên thủ trưởng thành công! Trạng thái: Chờ đánh giá.');
      setTimeout(() => {
        setSuccessMsg(null);
        onRefresh?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi phiếu');
    } finally {
      setIsSaving(false);
    }
  };

  // Evaluator Save & Submit Evaluation
  const handleSaveEvaluatorEvaluation = async (shouldLock = false) => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await evaluateCbqlForm(
        form.id,
        {
          items,
          evaluatorGroupScores: totals.evaluatorGroupScores,
          evaluatorTotalScore: totals.evaluatorTotalScore,
          scoreDifference: totals.scoreDifference,
          grade: totals.grade,
          evaluatorComment
        },
        { id: user?.id || 'admin', name: user?.name || 'Thủ trưởng', role: user?.role }
      );

      if (shouldLock) {
        await lockCbqlForm(form.id, { id: user?.id || 'admin', name: user?.name || 'BGH', role: user?.role });
        setSuccessMsg('Đã chốt kết quả và khóa phiếu đánh giá thành công!');
      } else {
        setSuccessMsg('Đã lưu kết quả đánh giá của thủ trưởng thành công!');
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onRefresh?.();
        if (shouldLock) onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu đánh giá');
    } finally {
      setIsSaving(false);
    }
  };

  // Admin Unlock Form
  const handleUnlock = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn mở khóa phiếu đánh giá này để chỉnh sửa bổ sung?')) return;
    try {
      setIsSaving(true);
      await unlockCbqlForm(form.id, { id: user?.id || 'admin', name: user?.name || 'Admin', role: user?.role });
      setSuccessMsg('Đã mở khóa phiếu đánh giá!');
      setTimeout(() => setSuccessMsg(null), 2500);
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi mở khóa phiếu');
    } finally {
      setIsSaving(false);
    }
  };

  // Group items by groupCode
  const groupIItems = items.filter(i => i.groupCode === 'I' || i.groupId === 'group_I');
  const groupIIItems = items.filter(i => i.groupCode === 'II' || i.groupId === 'group_II');
  const groupIIIItems = items.filter(i => i.groupCode === 'III' || i.groupId === 'group_III');

  const statusBadge = getCbqlFormStatusBadge(form.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Phiếu Đánh Giá KPI Cán Bộ Quản Lý
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {form.evaluateeName} — {form.evaluateePosition} ({form.periodName} | {form.academicYear})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={() => onPrint(form)}
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="In phiếu A4"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">In Phiếu</span>
              </button>
            )}

            <button
              onClick={() => exportSingleCbqlFormToExcel({ ...form, items, selfTotalScore: totals.selfTotalScore, evaluatorTotalScore: totals.evaluatorTotalScore })}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Xuất Excel"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* THÔNG BÁO TRẠNG THÁI / LỖI */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* THANH ĐIỀU HƯỚNG TABS & TỔNG KẾT ĐIỂM LIVE */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('self')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'self' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Tự Đánh Giá ({totals.selfTotalScore}/100đ)
            </button>
            <button
              onClick={() => setActiveTab('evaluator')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'evaluator' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Thủ Trưởng Chấm ({totals.evaluatorTotalScore}/100đ)
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'view' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Đối Chiếu & Tổng Hợp
            </button>
          </div>

          {/* Điểm tổng hợp sticky header */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <span className="text-[11px] text-blue-600">Nhóm I:</span>
              <strong>{activeTab === 'evaluator' ? totals.evaluatorGroupScores.group_I : totals.selfGroupScores.group_I}/15</strong>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
              <span className="text-[11px] text-indigo-600">Nhóm II:</span>
              <strong>{activeTab === 'evaluator' ? totals.evaluatorGroupScores.group_II : totals.selfGroupScores.group_II}/15</strong>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800">
              <span className="text-[11px] text-purple-600">Nhóm III:</span>
              <strong>{activeTab === 'evaluator' ? totals.evaluatorGroupScores.group_III : totals.selfGroupScores.group_III}/70</strong>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold">
              <span>TỔNG:</span>
              <strong className="text-sm">
                {activeTab === 'evaluator' ? totals.evaluatorTotalScore : totals.selfTotalScore}/100
              </strong>
            </div>
          </div>
        </div>

        {/* NỘI DUNG CUỘN CHÍNH */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* THÔNG TIN CHUNG CÁN BỘ & THỦ TRƯỞNG */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Cán bộ được đánh giá</span>
              <span className="font-bold text-slate-800 text-sm">{form.evaluateeName}</span>
              <span className="text-slate-500 block">{form.evaluateePosition}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Kỳ đánh giá & Năm học</span>
              <span className="font-bold text-slate-800 text-sm">{form.periodName}</span>
              <span className="text-slate-500 block">Năm học: {form.academicYear}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Người đánh giá (Thủ trưởng)</span>
              <span className="font-bold text-slate-800 text-sm">
                {form.evaluatorName?.includes('Quang Sáng') || form.evaluatorName?.includes('Kim Hùng') || form.evaluatorName?.includes('Anh Hòa')
                  ? 'Trịnh Việt Phương'
                  : (form.evaluatorName || 'Trịnh Việt Phương')}
              </span>
              <span className="text-slate-500 block">{form.evaluatorPosition || 'Hiệu trưởng'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Xếp loại chất lượng</span>
              <span className={`inline-block font-extrabold text-sm px-2.5 py-0.5 rounded-full mt-0.5 ${
                totals.grade === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800' :
                totals.grade === 'Tốt' ? 'bg-blue-100 text-blue-800' :
                totals.grade === 'Hoàn thành' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {totals.grade}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Chênh lệch: {totals.scoreDifference > 0 ? `+${totals.scoreDifference}` : totals.scoreDifference}đ
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: TỰ ĐÁNH GIÁ (CBQL TỰ CHẤM VỚI RADIO THANG MỨC ĐIỂM) */}
          {/* ========================================================================= */}
          {activeTab === 'self' && (
            <div className="space-y-6">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Hướng dẫn tự đánh giá:</strong> Chọn đúng mức đánh giá (Mức 1, 2, 3, 4) bằng nút chọn radio tương ứng cho từng tiêu chí. Điểm sẽ được hệ thống tính tự động chính xác theo khung chuẩn 100 điểm (Nhóm I: 15đ, Nhóm II: 15đ, Nhóm III: 70đ).
                </div>
              </div>

              {/* NHÓM I */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div 
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, group_I: !prev.group_I }))}
                  className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-white/20 rounded font-bold text-xs">PHẦN I</span>
                    <h3 className="font-bold text-sm uppercase">CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (Tối đa 15.0 điểm)</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-full">
                      Tự chấm: {totals.selfGroupScores.group_I}/15.0đ
                    </span>
                    {collapsedGroups.group_I ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </div>
                </div>

                {!collapsedGroups.group_I && (
                  <div className="divide-y divide-slate-100 p-2">
                    {groupIItems.map((item, idx) => {
                      const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === item.criterionId || c.code === item.criterionCode);
                      const levels = criterionDef?.levels || [];
                      return (
                        <div key={item.criterionId} className="p-4 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-blue-700 text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                                  {item.criterionCode}
                                </span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">{item.criterionName}</h4>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Tối đa: {item.maxScore}đ
                                </span>
                              </div>
                              {criterionDef?.description && (
                                <p className="text-xs text-slate-500 mt-1 pl-1 leading-relaxed">
                                  {criterionDef.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                                Điểm: {item.selfScore}đ
                              </span>
                            </div>
                          </div>

                          {/* THANG MỨC RADIO BUTTONS (BẮT BUỘC CHỌN MỨC) */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {levels.map((lvl) => {
                              const isSelected = item.selfScore === lvl.score && (item.selfLevelId === lvl.id || !item.selfLevelId);
                              return (
                                <label
                                  key={lvl.id}
                                  className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`self_radio_${item.criterionId}`}
                                    checked={isSelected}
                                    onChange={() => handleSelectSelfLevel(item.criterionId, lvl)}
                                    disabled={isLocked}
                                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span>{lvl.label}</span>
                                      <span className="text-blue-600 font-extrabold">{lvl.score}đ</span>
                                    </div>
                                    {lvl.description && (
                                      <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-tight">
                                        {lvl.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* NHẬP MINH CHỨNG / TÀI LIỆU */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Minh chứng / Ghi chú:</span>
                            <input
                              type="text"
                              value={item.selfEvidence || ''}
                              onChange={(e) => handleItemEvidenceChange(item.criterionId, e.target.value)}
                              disabled={isLocked}
                              placeholder="Nhập link file minh chứng hoặc ghi chú xác thực..."
                              className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* NHÓM II */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div 
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, group_II: !prev.group_II }))}
                  className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 to-purple-700 text-white flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-white/20 rounded font-bold text-xs">PHẦN II</span>
                    <h3 className="font-bold text-sm uppercase">TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT (Tối đa 15.0 điểm)</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-full">
                      Tự chấm: {totals.selfGroupScores.group_II}/15.0đ
                    </span>
                    {collapsedGroups.group_II ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </div>
                </div>

                {!collapsedGroups.group_II && (
                  <div className="divide-y divide-slate-100 p-2">
                    {groupIIItems.map((item) => {
                      const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === item.criterionId || c.code === item.criterionCode);
                      const levels = criterionDef?.levels || [];
                      return (
                        <div key={item.criterionId} className="p-4 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-indigo-700 text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                                  {item.criterionCode}
                                </span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">{item.criterionName}</h4>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Tối đa: {item.maxScore}đ
                                </span>
                              </div>
                              {criterionDef?.description && (
                                <p className="text-xs text-slate-500 mt-1 pl-1 leading-relaxed">
                                  {criterionDef.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-lg">
                                Điểm: {item.selfScore}đ
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {levels.map((lvl) => {
                              const isSelected = item.selfScore === lvl.score && (item.selfLevelId === lvl.id || !item.selfLevelId);
                              return (
                                <label
                                  key={lvl.id}
                                  className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`self_radio_${item.criterionId}`}
                                    checked={isSelected}
                                    onChange={() => handleSelectSelfLevel(item.criterionId, lvl)}
                                    disabled={isLocked}
                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span>{lvl.label}</span>
                                      <span className="text-indigo-600 font-extrabold">{lvl.score}đ</span>
                                    </div>
                                    {lvl.description && (
                                      <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-tight">
                                        {lvl.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Minh chứng / Ghi chú:</span>
                            <input
                              type="text"
                              value={item.selfEvidence || ''}
                              onChange={(e) => handleItemEvidenceChange(item.criterionId, e.target.value)}
                              disabled={isLocked}
                              placeholder="Nhập minh chứng..."
                              className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* NHÓM III */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div 
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, group_III: !prev.group_III }))}
                  className="px-5 py-3.5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-white/20 rounded font-bold text-xs">PHẦN III</span>
                    <h3 className="font-bold text-sm uppercase">KẾT QUẢ THỰC HIỆN NHIỆM VỤ (Tối đa 70.0 điểm)</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-full">
                      Tự chấm: {totals.selfGroupScores.group_III}/70.0đ
                    </span>
                    {collapsedGroups.group_III ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </div>
                </div>

                {!collapsedGroups.group_III && (
                  <div className="divide-y divide-slate-100 p-2">
                    {groupIIIItems.map((item) => {
                      const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === item.criterionId || c.code === item.criterionCode);
                      const levels = criterionDef?.levels || [];
                      return (
                        <div key={item.criterionId} className="p-4 hover:bg-slate-50/70 transition-colors">
                          {/* Subcategory title banner if present */}
                          {item.subCategoryTitle && item.criterionCode.endsWith('.1') && (
                            <div className="mb-3 px-3 py-1.5 bg-teal-50 border-l-4 border-teal-600 rounded-r text-xs font-extrabold text-teal-900">
                              {item.subCategoryTitle}
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-teal-700 text-xs px-2 py-0.5 bg-teal-50 border border-teal-200 rounded">
                                  {item.criterionCode}
                                </span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">{item.criterionName}</h4>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Tối đa: {item.maxScore}đ
                                </span>
                              </div>
                              {criterionDef?.description && (
                                <p className="text-xs text-slate-500 mt-1 pl-1 leading-relaxed">
                                  {criterionDef.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-teal-700 bg-teal-100/80 px-2.5 py-1 rounded-lg">
                                Điểm: {item.selfScore}đ
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {levels.map((lvl) => {
                              const isSelected = item.selfScore === lvl.score && (item.selfLevelId === lvl.id || !item.selfLevelId);
                              return (
                                <label
                                  key={lvl.id}
                                  className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`self_radio_${item.criterionId}`}
                                    checked={isSelected}
                                    onChange={() => handleSelectSelfLevel(item.criterionId, lvl)}
                                    disabled={isLocked}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span>{lvl.label}</span>
                                      <span className="text-teal-700 font-extrabold">{lvl.score}đ</span>
                                    </div>
                                    {lvl.description && (
                                      <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-tight">
                                        {lvl.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Minh chứng / Ghi chú:</span>
                            <input
                              type="text"
                              value={item.selfEvidence || ''}
                              onChange={(e) => handleItemEvidenceChange(item.criterionId, e.target.value)}
                              disabled={isLocked}
                              placeholder="Nhập minh chứng thực hiện nhiệm vụ..."
                              className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TỰ NHẬN XÉT CỦA CÁN BỘ QUẢN LÝ */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2">
                <label className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-600" />
                  Ý kiến / Tự nhận xét, đánh giá của Cán bộ Quản lý:
                </label>
                <textarea
                  value={selfComment}
                  onChange={(e) => setSelfComment(e.target.value)}
                  disabled={isLocked}
                  rows={3}
                  placeholder="Nêu tóm tắt kết quả nổi bật, những ưu điểm, khó khăn và phương hướng phấn đấu..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: THỦ TRƯỞNG / CẤP TRÊN ĐÁNH GIÁ (CHẤM ĐIỂM + NHẬN XÉT) */}
          {/* ========================================================================= */}
          {activeTab === 'evaluator' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldAlert size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Dành cho Thủ trưởng đơn vị / Cấp trên đánh giá:</strong> Xem xét điểm tự chấm và minh chứng của CBQL, chọn mức điểm đánh giá chính thức qua radio. Tổng điểm tối đa 100đ sẽ quyết định xếp loại chất lượng cuối cùng.
                </div>
              </div>

              {/* BẢNG CHẤM CỦA THỦ TRƯỞNG THEO 3 PHẦN */}
              {[
                { title: 'I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (Max 15.0đ)', items: groupIItems, maxScore: 15, currentScore: totals.evaluatorGroupScores.group_I, color: 'from-blue-700 to-indigo-700' },
                { title: 'II. TÁC PHONG, LỀ LỐI LÀM VIỆC, KỶ LUẬT (Max 15.0đ)', items: groupIIItems, maxScore: 15, currentScore: totals.evaluatorGroupScores.group_II, color: 'from-indigo-700 to-purple-700' },
                { title: 'III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ (Max 70.0đ)', items: groupIIIItems, maxScore: 70, currentScore: totals.evaluatorGroupScores.group_III, color: 'from-emerald-700 to-teal-700' }
              ].map((grp, grpIdx) => (
                <div key={grpIdx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className={`px-5 py-3.5 bg-gradient-to-r ${grp.color} text-white flex items-center justify-between`}>
                    <h3 className="font-bold text-sm uppercase">{grp.title}</h3>
                    <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-full">
                      Thủ trưởng chấm: {grp.currentScore}/{grp.maxScore}.0đ
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 p-2">
                    {grp.items.map((item) => {
                      const criterionDef = DEFAULT_CBQL_CRITERIA.find(c => c.id === item.criterionId || c.code === item.criterionCode);
                      const levels = criterionDef?.levels || [];
                      return (
                        <div key={item.criterionId} className="p-4 hover:bg-slate-50/70 transition-colors">
                          {/* Item header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-indigo-700 text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                                  {item.criterionCode}
                                </span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">{item.criterionName}</h4>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Tối đa: {item.maxScore}đ
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">
                                  CBQL tự chấm: <strong>{item.selfScore}đ</strong> ({item.selfLevelLabel || 'Đã chọn'})
                                </span>
                                {item.selfEvidence && (
                                  <span className="text-slate-500 italic">
                                    Minh chứng: "{item.selfEvidence}"
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg">
                                ĐG Chấm: {item.evaluatorScore}đ
                              </span>
                            </div>
                          </div>

                          {/* RADIO BUTTONS CHẤM ĐIỂM CỦA THỦ TRƯỞNG */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {levels.map((lvl) => {
                              const isSelected = item.evaluatorScore === lvl.score && (item.evaluatorLevelId === lvl.id || !item.evaluatorLevelId);
                              return (
                                <label
                                  key={lvl.id}
                                  className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`evaluator_radio_${item.criterionId}`}
                                    checked={isSelected}
                                    onChange={() => handleSelectEvaluatorLevel(item.criterionId, lvl)}
                                    disabled={isLocked}
                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span>{lvl.label}</span>
                                      <span className="text-indigo-600 font-extrabold">{lvl.score}đ</span>
                                    </div>
                                    {lvl.description && (
                                      <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-tight">
                                        {lvl.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* Ghi chú nhận xét từng tiêu chí của thủ trưởng */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Nhận xét của thủ trưởng:</span>
                            <input
                              type="text"
                              value={item.evaluatorNote || ''}
                              onChange={(e) => handleItemEvaluatorNoteChange(item.criterionId, e.target.value)}
                              disabled={isLocked}
                              placeholder="Ghi chú nhận xét riêng tiêu chí này (nếu có)..."
                              className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* NHẬN XÉT CHUNG CỦA THỦ TRƯỞNG */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2">
                <label className="font-bold text-xs text-slate-700 flex items-center gap-2">
                  <Award size={16} className="text-indigo-600" />
                  Ý kiến đánh giá, nhận xét toàn diện của Thủ trưởng / Cấp trên:
                </label>
                <textarea
                  value={evaluatorComment}
                  onChange={(e) => setEvaluatorComment(e.target.value)}
                  disabled={isLocked}
                  rows={3}
                  placeholder="Nhận xét về phẩm chất chính trị, tinh thần trách nhiệm, năng lực lãnh đạo điều hành và kết quả hoàn thành nhiệm vụ..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: XEM CHI TIẾT & ĐỐI CHIẾU SONG SONG 2 CỘT */}
          {/* ========================================================================= */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* BẢNG ĐỐI CHIẾU SONG SONG */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <th className="p-3 w-12 text-center">Mã</th>
                        <th className="p-3 min-w-[280px]">Nội dung tiêu chí đánh giá</th>
                        <th className="p-3 w-20 text-center">Tối đa</th>
                        <th className="p-3 w-24 text-center bg-blue-50/80 text-blue-800">Tự chấm</th>
                        <th className="p-3 w-24 text-center bg-indigo-50/80 text-indigo-800">Thủ trưởng</th>
                        <th className="p-3 w-20 text-center">Độ lệch</th>
                        <th className="p-3 min-w-[200px]">Minh chứng / Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* NHÓM I */}
                      <tr className="bg-blue-600 text-white font-bold">
                        <td colSpan={2} className="p-2.5 pl-4">
                          I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG
                        </td>
                        <td className="p-2.5 text-center">15.0</td>
                        <td className="p-2.5 text-center bg-blue-700">{totals.selfGroupScores.group_I}</td>
                        <td className="p-2.5 text-center bg-indigo-700">{totals.evaluatorGroupScores.group_I}</td>
                        <td className="p-2.5 text-center">
                          {totals.evaluatorGroupScores.group_I - totals.selfGroupScores.group_I}
                        </td>
                        <td className="p-2.5"></td>
                      </tr>
                      {groupIItems.map(item => {
                        const diff = Math.round((item.evaluatorScore - item.selfScore) * 10) / 10;
                        return (
                          <tr key={item.criterionId} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.criterionCode}</td>
                            <td className="p-2.5 font-medium text-slate-800">{item.criterionName}</td>
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.maxScore}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/40">{item.selfScore}</td>
                            <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/40">{item.evaluatorScore}</td>
                            <td className={`p-2.5 text-center font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600">
                              {item.selfEvidence && <span className="block text-blue-600">MC: {item.selfEvidence}</span>}
                              {item.evaluatorNote && <span className="block text-indigo-600">ĐG: {item.evaluatorNote}</span>}
                            </td>
                          </tr>
                        );
                      })}

                      {/* NHÓM II */}
                      <tr className="bg-indigo-600 text-white font-bold">
                        <td colSpan={2} className="p-2.5 pl-4">
                          II. TÁC PHONG, LỀ LỐI LÀM VIỆC, KỶ LUẬT
                        </td>
                        <td className="p-2.5 text-center">15.0</td>
                        <td className="p-2.5 text-center bg-blue-700">{totals.selfGroupScores.group_II}</td>
                        <td className="p-2.5 text-center bg-indigo-700">{totals.evaluatorGroupScores.group_II}</td>
                        <td className="p-2.5 text-center">
                          {totals.evaluatorGroupScores.group_II - totals.selfGroupScores.group_II}
                        </td>
                        <td className="p-2.5"></td>
                      </tr>
                      {groupIIItems.map(item => {
                        const diff = Math.round((item.evaluatorScore - item.selfScore) * 10) / 10;
                        return (
                          <tr key={item.criterionId} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.criterionCode}</td>
                            <td className="p-2.5 font-medium text-slate-800">{item.criterionName}</td>
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.maxScore}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/40">{item.selfScore}</td>
                            <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/40">{item.evaluatorScore}</td>
                            <td className={`p-2.5 text-center font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600">
                              {item.selfEvidence && <span className="block text-blue-600">MC: {item.selfEvidence}</span>}
                              {item.evaluatorNote && <span className="block text-indigo-600">ĐG: {item.evaluatorNote}</span>}
                            </td>
                          </tr>
                        );
                      })}

                      {/* NHÓM III */}
                      <tr className="bg-emerald-600 text-white font-bold">
                        <td colSpan={2} className="p-2.5 pl-4">
                          III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ
                        </td>
                        <td className="p-2.5 text-center">70.0</td>
                        <td className="p-2.5 text-center bg-blue-700">{totals.selfGroupScores.group_III}</td>
                        <td className="p-2.5 text-center bg-indigo-700">{totals.evaluatorGroupScores.group_III}</td>
                        <td className="p-2.5 text-center">
                          {totals.evaluatorGroupScores.group_III - totals.selfGroupScores.group_III}
                        </td>
                        <td className="p-2.5"></td>
                      </tr>
                      {groupIIIItems.map(item => {
                        const diff = Math.round((item.evaluatorScore - item.selfScore) * 10) / 10;
                        return (
                          <tr key={item.criterionId} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.criterionCode}</td>
                            <td className="p-2.5 font-medium text-slate-800">{item.criterionName}</td>
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.maxScore}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/40">{item.selfScore}</td>
                            <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/40">{item.evaluatorScore}</td>
                            <td className={`p-2.5 text-center font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600">
                              {item.selfEvidence && <span className="block text-blue-600">MC: {item.selfEvidence}</span>}
                              {item.evaluatorNote && <span className="block text-indigo-600">ĐG: {item.evaluatorNote}</span>}
                            </td>
                          </tr>
                        );
                      })}

                      {/* TỔNG KẾT TOÀN PHIẾU */}
                      <tr className="bg-slate-800 text-white font-extrabold text-xs">
                        <td colSpan={2} className="p-3.5 pl-4 uppercase">
                          TỔNG CỘNG TOÀN BỘ PHIẾU ĐÁNH GIÁ:
                        </td>
                        <td className="p-3.5 text-center text-sm">100.0</td>
                        <td className="p-3.5 text-center text-sm bg-blue-800">{totals.selfTotalScore}</td>
                        <td className="p-3.5 text-center text-sm bg-indigo-800">{totals.evaluatorTotalScore}</td>
                        <td className="p-3.5 text-center text-sm">
                          {totals.scoreDifference > 0 ? `+${totals.scoreDifference}` : totals.scoreDifference}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded bg-emerald-500 text-white font-bold">
                            Xếp loại: {totals.grade}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NHẬN XÉT 2 BÊN TRONG BẢNG VIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <User size={15} className="text-blue-600" />
                    Ý kiến tự nhận xét của CBQL:
                  </h4>
                  <p className="text-slate-600 italic whitespace-pre-wrap">
                    {selfComment || '(Chưa có ý kiến tự nhận xét)'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Award size={15} className="text-indigo-600" />
                    Nhận xét đánh giá của Thủ trưởng:
                  </h4>
                  <p className="text-slate-600 italic whitespace-pre-wrap">
                    {evaluatorComment || '(Chưa có nhận xét của thủ trưởng)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isLocked ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Lock size={15} />
                Phiếu đã được khóa và chốt kết quả an toàn.
              </span>
            ) : (
              <span>
                Trạng thái: <strong>{statusBadge.label}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Nếu đang khóa và là Admin: nút Mở khóa */}
            {isLocked && isAdmin && (
              <button
                onClick={handleUnlock}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock size={15} />
                <span>Mở Khóa Phiếu</span>
              </button>
            )}

            {/* TAB 1: Nút lưu nháp & Nút gửi thủ trưởng */}
            {activeTab === 'self' && !isLocked && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={15} />
                  <span>Lưu Bản Nháp</span>
                </button>
                <button
                  onClick={handleSubmitSelfEvaluation}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={15} />
                  <span>Gửi Thủ Trưởng Đánh Giá</span>
                </button>
              </>
            )}

            {/* TAB 2: Nút lưu đánh giá & Nút chốt khóa phiếu */}
            {activeTab === 'evaluator' && !isLocked && (
              <>
                <button
                  onClick={() => handleSaveEvaluatorEvaluation(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={15} />
                  <span>Lưu Kết Quả Đánh Giá</span>
                </button>
                <button
                  onClick={() => handleSaveEvaluatorEvaluation(true)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock size={15} />
                  <span>Chốt Kết Quả & Khóa Phiếu</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
