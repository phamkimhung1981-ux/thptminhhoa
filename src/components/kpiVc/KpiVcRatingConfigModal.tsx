import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Copy, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Award, 
  HelpCircle, 
  Sparkles, 
  Lock, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Check,
  Info,
  Loader2
} from 'lucide-react';
import { 
  KpiVcPeriod, 
  KpiVcRatingConfig, 
  KpiVcRatingTier, 
  KpiVcRatingConfigHistory 
} from '../../types/kpiVc';
import { 
  DEFAULT_VC_RATING_TIERS, 
  KPI_RATING_COLOR_MAP, 
  validateRatingTiers,
  getKpiRating
} from '../../lib/kpiVcData';
import { 
  saveVcRatingConfig, 
  restoreDefaultVcRatingConfig, 
  copyVcRatingConfig 
} from '../../services/kpiVcService';
import { useAuth } from '../../store/AuthContext';

interface KpiVcRatingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: KpiVcPeriod[];
  configs: KpiVcRatingConfig[];
  historyList?: KpiVcRatingConfigHistory[];
  defaultPeriodId?: string;
  onSaved?: () => void;
}

export default function KpiVcRatingConfigModal({
  isOpen,
  onClose,
  periods,
  configs,
  historyList = [],
  defaultPeriodId = 'all',
  onSaved
}: KpiVcRatingConfigModalProps) {
  const { user } = useAuth();
  
  // Role check: Only BGH or Admin
  const isAdmin = user?.id === 'admin' || user?.role === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');

  // Selected period for configuration
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(defaultPeriodId);
  
  // Sub-tabs: 'tiers' (Cấu hình mức xếp loại) | 'history' (Lịch sử cấu hình)
  const [activeTab, setActiveTab] = useState<'tiers' | 'history'>('tiers');

  // Working state for tiers
  const [workingTiers, setWorkingTiers] = useState<KpiVcRatingTier[]>([]);
  const [isLockedWhenPeriodCompleted, setIsLockedWhenPeriodCompleted] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');

  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [sourcePeriodIdToCopy, setSourcePeriodIdToCopy] = useState<string>('all');

  // Interactive Live Score Tester
  const [testScore, setTestScore] = useState<number>(96);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync selectedPeriodId when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPeriodId(defaultPeriodId || 'all');
      setActiveTab('tiers');
      setErrorMsg(null);
      setSuccessToast(null);
    }
  }, [isOpen, defaultPeriodId]);

  // Load config for the active period
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    const existingConfig = configs.find(c => c.periodId === selectedPeriodId && c.isActive);

    if (existingConfig && existingConfig.tiers && existingConfig.tiers.length > 0) {
      setWorkingTiers(JSON.parse(JSON.stringify(existingConfig.tiers)));
      setIsLockedWhenPeriodCompleted(Boolean(existingConfig.isLockedWhenPeriodCompleted));
      setNote(existingConfig.note || '');
    } else {
      // Fallback: check if there is a global 'all' config
      const globalConfig = configs.find(c => (c.periodId === 'all' || c.periodId === 'default') && c.isActive);
      if (globalConfig && globalConfig.tiers && globalConfig.tiers.length > 0) {
        setWorkingTiers(JSON.parse(JSON.stringify(globalConfig.tiers)));
        setIsLockedWhenPeriodCompleted(Boolean(globalConfig.isLockedWhenPeriodCompleted));
      } else {
        setWorkingTiers(JSON.parse(JSON.stringify(DEFAULT_VC_RATING_TIERS)));
        setIsLockedWhenPeriodCompleted(false);
      }
      setNote('');
    }
  }, [selectedPeriodId, configs, isOpen]);

  // Period Object
  const currentPeriodObj = useMemo(() => {
    if (selectedPeriodId === 'all') return null;
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [selectedPeriodId, periods]);

  // Real-time validation
  const validation = useMemo(() => {
    return validateRatingTiers(workingTiers);
  }, [workingTiers]);

  // Test Score Rating Result
  const testResult = useMemo(() => {
    const tempConfig: KpiVcRatingConfig = {
      id: 'temp',
      periodId: selectedPeriodId,
      scaleMaxScore: 100,
      tiers: workingTiers,
      isActive: true
    };
    return getKpiRating(testScore, selectedPeriodId, [tempConfig]);
  }, [testScore, workingTiers, selectedPeriodId]);

  // Filtered History for the selected period
  const filteredHistory = useMemo(() => {
    if (selectedPeriodId === 'all') return historyList;
    return historyList.filter(h => h.periodId === selectedPeriodId || h.periodId === 'all');
  }, [historyList, selectedPeriodId]);

  // Handlers for modifying tiers
  const handleUpdateTier = (id: string, field: keyof KpiVcRatingTier, value: any) => {
    setErrorMsg(null);
    setWorkingTiers(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleAddTier = () => {
    setErrorMsg(null);
    const newId = `tier_${Date.now()}`;
    const newTier: KpiVcRatingTier = {
      id: newId,
      ratingName: `Mức ${workingTiers.length + 1}`,
      minScore: 0,
      maxScore: 50,
      badgeColor: 'blue',
      sortOrder: workingTiers.length + 1,
      isActive: true,
      description: 'Mức xếp loại tùy chỉnh'
    };
    setWorkingTiers(prev => [...prev, newTier]);
  };

  const handleRemoveTier = (id: string) => {
    setErrorMsg(null);
    if (workingTiers.length <= 1) {
      setErrorMsg('Phải giữ ít nhất 1 mức xếp loại trong hệ thống.');
      return;
    }
    setWorkingTiers(prev => prev.filter(t => t.id !== id));
  };

  const handleMoveTier = (index: number, direction: 'up' | 'down') => {
    setErrorMsg(null);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= workingTiers.length) return;

    const newTiers = [...workingTiers];
    const temp = newTiers[index];
    newTiers[index] = newTiers[targetIdx];
    newTiers[targetIdx] = temp;

    // Update sortOrder
    newTiers.forEach((t, i) => {
      t.sortOrder = i + 1;
    });

    setWorkingTiers(newTiers);
  };

  // Quick preset templates
  const handleApplyPreset = (type: '4_tiers_standard' | 'abcd' | 'levels_1234') => {
    if (type === '4_tiers_standard') {
      setWorkingTiers(JSON.parse(JSON.stringify(DEFAULT_VC_RATING_TIERS)));
    } else if (type === 'abcd') {
      setWorkingTiers([
        { id: 'tier_a', ratingName: 'Loại A (Xuất sắc)', minScore: 90, maxScore: 100, badgeColor: 'emerald', sortOrder: 1, isActive: true },
        { id: 'tier_b', ratingName: 'Loại B (Tốt)', minScore: 80, maxScore: 90, badgeColor: 'blue', sortOrder: 2, isActive: true },
        { id: 'tier_c', ratingName: 'Loại C (Đạt)', minScore: 65, maxScore: 80, badgeColor: 'amber', sortOrder: 3, isActive: true },
        { id: 'tier_d', ratingName: 'Loại D (Chưa đạt)', minScore: 0, maxScore: 65, badgeColor: 'rose', sortOrder: 4, isActive: true }
      ]);
    } else if (type === 'levels_1234') {
      setWorkingTiers([
        { id: 'tier_m1', ratingName: 'Mức 1', minScore: 90, maxScore: 100, badgeColor: 'emerald', sortOrder: 1, isActive: true },
        { id: 'tier_m2', ratingName: 'Mức 2', minScore: 80, maxScore: 90, badgeColor: 'blue', sortOrder: 2, isActive: true },
        { id: 'tier_m3', ratingName: 'Mức 3', minScore: 65, maxScore: 80, badgeColor: 'amber', sortOrder: 3, isActive: true },
        { id: 'tier_m4', ratingName: 'Mức 4', minScore: 0, maxScore: 65, badgeColor: 'rose', sortOrder: 4, isActive: true }
      ]);
    }
  };

  // Save config handler
  const handleSaveConfig = async () => {
    if (!isAdmin) {
      setErrorMsg('Bạn không có quyền quản trị để thay đổi cấu hình.');
      return;
    }

    const check = validateRatingTiers(workingTiers);
    if (!check.isValid) {
      setErrorMsg(check.error || 'Dữ liệu cấu hình không hợp lệ.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const activePeriodName = currentPeriodObj ? `${currentPeriodObj.name} (${currentPeriodObj.academicYear})` : 'Mặc định toàn trường';
      
      const payload: KpiVcRatingConfig = {
        id: `vc_rating_${selectedPeriodId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        periodId: selectedPeriodId,
        periodName: activePeriodName,
        academicYear: currentPeriodObj?.academicYear || '2026-2027',
        scaleMaxScore: 100,
        tiers: workingTiers.map((t, idx) => ({
          ...t,
          minScore: Number(t.minScore),
          maxScore: Number(t.maxScore),
          sortOrder: idx + 1
        })),
        isLockedWhenPeriodCompleted,
        isActive: true,
        note: note || `Cấu hình ${workingTiers.length} mức xếp loại KPI`
      };

      await saveVcRatingConfig(
        payload,
        {
          id: user?.id || 'admin',
          name: user?.name || 'Ban Giám hiệu',
          role: user?.role || 'BGH'
        },
        null,
        note
      );

      setSuccessToast(`Đã lưu thành công cấu hình điểm xếp loại cho ${activePeriodName}!`);
      if (onSaved) onSaved();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Lỗi khi lưu cấu hình xếp loại:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu cấu hình vào cơ sở dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore default handler
  const handleRestoreDefault = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình xếp loại về 4 mức mặc định ban đầu?')) {
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const activePeriodName = currentPeriodObj ? `${currentPeriodObj.name} (${currentPeriodObj.academicYear})` : 'Mặc định toàn trường';
      await restoreDefaultVcRatingConfig(
        selectedPeriodId,
        {
          id: user?.id || 'admin',
          name: user?.name || 'Ban Giám hiệu',
          role: user?.role || 'BGH'
        },
        activePeriodName
      );
      setWorkingTiers(JSON.parse(JSON.stringify(DEFAULT_VC_RATING_TIERS)));
      setIsLockedWhenPeriodCompleted(false);
      setSuccessToast('Đã khôi phục thành công cấu hình mặc định (4 mức).');
      if (onSaved) onSaved();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi khôi phục mặc định.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy from another period handler
  const handleConfirmCopy = async () => {
    if (!sourcePeriodIdToCopy) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const targetName = currentPeriodObj ? `${currentPeriodObj.name} (${currentPeriodObj.academicYear})` : 'Mặc định toàn trường';
      await copyVcRatingConfig(
        sourcePeriodIdToCopy,
        selectedPeriodId,
        targetName,
        {
          id: user?.id || 'admin',
          name: user?.name || 'Ban Giám hiệu',
          role: user?.role || 'BGH'
        }
      );
      setIsCopyModalOpen(false);
      setSuccessToast('Đã sao chép thành công cấu hình từ kỳ đã chọn.');
      if (onSaved) onSaved();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi sao chép cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* 1. MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-blue-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  CẤU HÌNH ĐIỂM XẾP LOẠI KPI
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 text-[11px] font-bold border border-blue-400/30">
                  Thang điểm: 100
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Thiết lập ngưỡng điểm, tên mức xếp loại và màu sắc hiển thị cho hệ thống KPI Giáo viên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. TAB CONTROLS & PERIOD SELECTOR ROW */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Kỳ đánh giá selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                Kỳ đánh giá:
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[220px]"
              >
                <option value="all">🌟 Mặc định chung (Toàn trường)</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-100/70 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200">
              <Award size={13} className="text-blue-700" />
              <span>Cấu hình đang áp dụng: <strong>{workingTiers.filter(t => t.isActive).length} mức xếp loại</strong></span>
            </div>
          </div>

          {/* Sub tabs: Tiers vs History */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('tiers')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'tiers' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mức xếp loại ({workingTiers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'history' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={13} /> Lịch sử thay đổi
            </button>
          </div>
        </div>

        {/* 3. MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TOAST SUCCESS NOTIFICATION */}
          {successToast && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-900 font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                <span>{successToast}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSuccessToast(null)} 
                className="text-emerald-700 hover:text-emerald-950 text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* ERROR / VALIDATION BANNER */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-rose-900 font-medium flex items-start gap-2 shadow-2xs">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
              <div>
                <strong className="font-bold">Lỗi cấu hình:</strong> {errorMsg}
              </div>
            </div>
          )}

          {!validation.isValid && !errorMsg && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 font-medium flex items-start gap-2">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <strong className="font-bold">Cảnh báo khoảng điểm:</strong> {validation.error}
              </div>
            </div>
          )}

          {activeTab === 'tiers' ? (
            <>
              {/* TOOLBAR & PRESETS */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddTier}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={14} /> Thêm mức xếp loại
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(true)}
                    disabled={!isAdmin || periods.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Copy size={13} /> Sao chép từ kỳ trước
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('4_tiers_standard')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200"
                    title="4 mức chuẩn ngành giáo dục: Xuất sắc, Tốt, Hoàn thành, Chưa đạt"
                  >
                    Chuẩn 4 mức
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('abcd')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200"
                    title="Xếp loại dạng chữ: A, B, C, D"
                  >
                    A / B / C / D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('levels_1234')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200"
                    title="Mức 1, Mức 2, Mức 3, Mức 4"
                  >
                    Mức 1-4
                  </button>
                </div>
              </div>

              {/* TABLE CONFIGURATION */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-xs">
                        <th className="p-3 w-12 text-center">STT</th>
                        <th className="p-3 min-w-[220px]">Tên xếp loại</th>
                        <th className="p-3 w-28 text-center">Từ điểm (≥)</th>
                        <th className="p-3 w-28 text-center">Đến điểm (&lt;/≤)</th>
                        <th className="p-3 min-w-[140px]">Quy tắc biên</th>
                        <th className="p-3 min-w-[130px]">Màu nhãn</th>
                        <th className="p-3 w-24 text-center">Trạng thái</th>
                        <th className="p-3 w-28 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {workingTiers.map((tier, idx) => {
                        const isHighest = idx === 0 || Number(tier.maxScore) === 100;
                        const colorObj = KPI_RATING_COLOR_MAP[tier.badgeColor] || KPI_RATING_COLOR_MAP.blue;

                        return (
                          <tr key={tier.id} className={`hover:bg-slate-50/80 transition-colors ${!tier.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                            
                            {/* STT */}
                            <td className="p-3 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Tên xếp loại */}
                            <td className="p-3">
                              <input
                                type="text"
                                value={tier.ratingName}
                                disabled={!isAdmin}
                                onChange={(e) => handleUpdateTier(tier.id, 'ratingName', e.target.value)}
                                placeholder="Nhập tên xếp loại..."
                                className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>

                            {/* Từ điểm (minScore) */}
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                value={tier.minScore}
                                disabled={!isAdmin}
                                onChange={(e) => handleUpdateTier(tier.id, 'minScore', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1.5 text-center text-xs font-extrabold text-blue-900 bg-blue-50/50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>

                            {/* Đến điểm (maxScore) */}
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                value={tier.maxScore}
                                disabled={!isAdmin}
                                onChange={(e) => handleUpdateTier(tier.id, 'maxScore', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1.5 text-center text-xs font-extrabold text-indigo-900 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>

                            {/* Quy tắc biên trực quan */}
                            <td className="p-3">
                              <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-1 rounded-md inline-block">
                                {isHighest 
                                  ? `${tier.minScore} ≤ điểm ≤ ${tier.maxScore}`
                                  : `${tier.minScore} ≤ điểm < ${tier.maxScore}`}
                              </span>
                            </td>

                            {/* Màu nhãn hiển thị */}
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <select
                                  value={tier.badgeColor || 'blue'}
                                  disabled={!isAdmin}
                                  onChange={(e) => handleUpdateTier(tier.id, 'badgeColor', e.target.value)}
                                  className="px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                  {Object.entries(KPI_RATING_COLOR_MAP).map(([colorKey, conf]) => (
                                    <option key={colorKey} value={colorKey}>
                                      {conf.label}
                                    </option>
                                  ))}
                                </select>
                                
                                {/* Live badge preview */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${colorObj.dot}`}></span>
                                  Mẫu
                                </span>
                              </div>
                            </td>

                            {/* Trạng thái */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => handleUpdateTier(tier.id, 'isActive', !tier.isActive)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                  tier.isActive
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-slate-200 text-slate-600 border border-slate-300'
                                }`}
                              >
                                {tier.isActive ? 'Đang dùng' : 'Tạm dừng'}
                              </button>
                            </td>

                            {/* Thao tác */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={!isAdmin || idx === 0}
                                  onClick={() => handleMoveTier(idx, 'up')}
                                  title="Di chuyển lên"
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={!isAdmin || idx === workingTiers.length - 1}
                                  onClick={() => handleMoveTier(idx, 'down')}
                                  title="Di chuyển xuống"
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={!isAdmin || workingTiers.length <= 1}
                                  onClick={() => handleRemoveTier(tier.id)}
                                  title="Xóa mức này"
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LIVE INTERACTIVE TESTER */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                      Kiểm thử xếp loại tự động theo cấu hình
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Nhập thử điểm số KPI bất kỳ để kiểm tra mức xếp loại trả về
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-blue-200 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">Điểm test:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={testScore}
                      onChange={(e) => setTestScore(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-center font-black text-sm text-blue-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">➔</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600">Xếp loại:</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${testResult.badgeStyle.bg} ${testResult.badgeStyle.text} ${testResult.badgeStyle.border}`}>
                      {testResult.ratingName} ({testResult.minScore}-{testResult.maxScore}đ)
                    </span>
                  </div>
                </div>
              </div>

              {/* ADVANCED SETTING: LOCK WHEN COMPLETED */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="lock_when_completed"
                  checked={isLockedWhenPeriodCompleted}
                  disabled={!isAdmin}
                  onChange={(e) => setIsLockedWhenPeriodCompleted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <label htmlFor="lock_when_completed" className="text-xs text-slate-700 cursor-pointer select-none">
                  <strong className="text-slate-900 block font-bold">
                    Khóa xếp loại khi kỳ đánh giá đã hoàn thành / chốt số liệu
                  </strong>
                  <span className="text-slate-500 leading-relaxed block mt-0.5">
                    Nếu bật tùy chọn này, các phiếu đánh giá trong kỳ đã chốt sẽ giữ nguyên kết quả xếp loại tại thời điểm đó, ngay cả khi quản trị viên thay đổi ngưỡng điểm xếp loại trong tương lai.
                  </span>
                </label>
              </div>

            </>
          ) : (
            /* TAB: HISTORY LOGS */
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Lịch sử thay đổi cấu hình ({filteredHistory.length})
              </h4>
              
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                  <History size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Chưa có bản ghi lịch sử cấu hình.</p>
                  <p className="text-[11px] text-slate-400">Mọi thao tác lưu hoặc khôi phục cấu hình sẽ được lưu lại tại đây.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((hist, idx) => (
                    <div key={hist.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            hist.action === 'restore_default' ? 'bg-amber-100 text-amber-800' :
                            hist.action === 'copy_period' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {hist.action === 'restore_default' ? 'Khôi phục mặc định' : 
                             hist.action === 'copy_period' ? 'Sao chép kỳ' : 'Cập nhật cấu hình'}
                          </span>
                          <span className="font-bold text-slate-800">{hist.periodName || hist.periodId}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(hist.changedAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <p className="text-slate-600">
                        Người thực hiện: <strong className="text-slate-900">{hist.changedByName || hist.changedBy}</strong>
                        {hist.note && <span className="italic ml-2">• {hist.note}</span>}
                      </p>

                      {/* Tiers snapshot */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/80">
                        {(hist.tiers || []).map(t => (
                          <span key={t.id} className="inline-block px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px]">
                            <strong>{t.ratingName}</strong>: {t.minScore}-{t.maxScore}đ
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. MODAL FOOTER ACTIONS */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {isAdmin && activeTab === 'tiers' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleRestoreDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} /> Khôi phục mặc định
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            {isAdmin && (
              <button
                type="button"
                disabled={isSaving || !validation.isValid}
                onClick={handleSaveConfig}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang lưu cấu hình...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Lưu cấu hình</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL PHỤ: SAO CHÉP TỪ KỲ KHÁC */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-blue-700">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Copy size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Sao chép cấu hình từ kỳ khác</h3>
                <p className="text-xs text-slate-500">Kế thừa các mức điểm và tên xếp loại từ kỳ đã có</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn kỳ nguồn để sao chép:
                </label>
                <select
                  value={sourcePeriodIdToCopy}
                  onChange={(e) => setSourcePeriodIdToCopy(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">🌟 Mặc định chung (Toàn trường)</option>
                  {periods.filter(p => p.id !== selectedPeriodId).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900">
                Cấu hình sẽ được áp dụng cho: <strong>{currentPeriodObj ? currentPeriodObj.name : 'Mặc định chung'}</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmCopy}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Xác nhận sao chép
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
