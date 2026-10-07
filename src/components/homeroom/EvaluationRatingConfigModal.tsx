import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  History,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import {
  RatingTierItem,
  EvaluationRatingConfig,
  EvaluationRatingConfigHistory,
  EvaluationPeriodScopeType
} from '../../types/homeroom';
import {
  DEFAULT_RATING_TIERS,
  RATING_COLOR_MAP,
  validateRatingTiers,
  getRatingBadgeStyle
} from '../../lib/homeroomData';
import { useAuth } from '../../store/AuthContext';

interface EvaluationRatingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolYear: string;
  selectedMonth: string;
  selectedWeek: number;
  currentScope: 'month' | 'week' | 'year';
  configs: EvaluationRatingConfig[];
  historyList: EvaluationRatingConfigHistory[];
  isBgh: boolean;
  onSaveConfig: (
    config: EvaluationRatingConfig,
    previousTiers?: RatingTierItem[] | null,
    note?: string
  ) => Promise<void>;
  onRestoreDefault: (
    schoolYear: string,
    periodType: EvaluationPeriodScopeType,
    periodId: string,
    previousTiers?: RatingTierItem[]
  ) => Promise<void>;
}

export default function EvaluationRatingConfigModal({
  isOpen,
  onClose,
  schoolYear,
  selectedMonth,
  selectedWeek,
  currentScope,
  configs,
  historyList,
  isBgh,
  onSaveConfig,
  onRestoreDefault
}: EvaluationRatingConfigModalProps) {
  const { user } = useAuth();

  // Active sub-tab: 'tiers' | 'history'
  const [activeModalTab, setActiveModalTab] = useState<'tiers' | 'history'>('tiers');

  // Scope selection: 'all' (default whole year) | 'month' | 'week' | 'year'
  const [scopeType, setScopeType] = useState<EvaluationPeriodScopeType>(() => {
    if (currentScope === 'week') return 'week';
    if (currentScope === 'month') return 'month';
    return 'all';
  });

  const periodId = useMemo(() => {
    if (scopeType === 'week') return `Tuần ${String(selectedWeek).padStart(2, '0')}`;
    if (scopeType === 'month') return selectedMonth;
    return 'all';
  }, [scopeType, selectedWeek, selectedMonth]);

  // Working tiers state
  const [tiers, setTiers] = useState<RatingTierItem[]>(DEFAULT_RATING_TIERS);
  const [configName, setConfigName] = useState<string>('Cấu hình xếp loại rèn luyện học sinh');
  const [existingConfigId, setExistingConfigId] = useState<string | null>(null);
  const [originalTiers, setOriginalTiers] = useState<RatingTierItem[] | null>(null);

  const [adminOverride, setAdminOverride] = useState<boolean>(true);
  const hasAdminRights = Boolean(isBgh || adminOverride);

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Find most specific config matching active scope and schoolYear
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessToast('');
      setShowRestoreConfirm(false);

      // Match scope config
      const exactConfig = configs.find(
        c =>
          c.school_year === schoolYear &&
          c.evaluation_period_type === scopeType &&
          c.evaluation_period_id === periodId &&
          c.is_active !== false
      );

      // Fallback default config for school year
      const defaultConfig = configs.find(
        c =>
          c.school_year === schoolYear &&
          c.evaluation_period_type === 'all' &&
          c.is_active !== false
      );

      const targetConfig = exactConfig || defaultConfig;

      if (targetConfig && targetConfig.tiers && targetConfig.tiers.length > 0) {
        const loadedTiers = [...targetConfig.tiers].sort((a, b) => Number(b.max_score) - Number(a.max_score));
        setTiers(loadedTiers);
        setOriginalTiers(loadedTiers);
        setConfigName(targetConfig.name || `Cấu hình xếp loại (${periodId})`);
        setExistingConfigId(targetConfig.id);
      } else {
        setTiers(DEFAULT_RATING_TIERS);
        setOriginalTiers(DEFAULT_RATING_TIERS);
        setConfigName(`Cấu hình xếp loại (${periodId})`);
        setExistingConfigId(null);
      }
    }
  }, [isOpen, scopeType, periodId, schoolYear, configs]);

  if (!isOpen) return null;

  // Add new tier
  const handleAddTier = () => {
    if (!hasAdminRights) return;
    setErrorMsg('');

    // Sort ascending to find room or split
    const sorted = [...tiers].sort((a, b) => Number(a.min_score) - Number(b.min_score));
    // Find highest tier or split middle
    const newId = `tier_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTier: RatingTierItem = {
      id: newId,
      name: `Mức ${tiers.length + 1}`,
      min_score: 50,
      max_score: 64,
      color: 'purple',
      sort_order: tiers.length + 1,
      is_active: true
    };

    setTiers([...tiers, newTier]);
  };

  // Update tier fields
  const handleUpdateTier = (id: string, field: keyof RatingTierItem, value: any) => {
    if (!hasAdminRights) return;
    setErrorMsg('');
    setTiers(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        return { ...t, [field]: value };
      })
    );
  };

  // Delete tier
  const handleDeleteTier = (id: string) => {
    if (!hasAdminRights) return;
    if (tiers.length <= 1) {
      setErrorMsg('Phải giữ lại ít nhất 1 mức xếp loại.');
      return;
    }
    setErrorMsg('');
    setTiers(prev => prev.filter(t => t.id !== id));
  };

  // Reorder tier
  const handleMoveTier = (index: number, direction: 'up' | 'down') => {
    if (!hasAdminRights) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tiers.length) return;

    const newTiers = [...tiers];
    const temp = newTiers[index];
    newTiers[index] = newTiers[targetIndex];
    newTiers[targetIndex] = temp;

    // re-index sort_order
    newTiers.forEach((t, i) => {
      t.sort_order = i + 1;
    });

    setTiers(newTiers);
  };

  // Handle Restore Default
  const handleConfirmRestoreDefault = async () => {
    if (!hasAdminRights) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onRestoreDefault(schoolYear, scopeType, periodId, tiers);
      setTiers(DEFAULT_RATING_TIERS);
      setShowRestoreConfirm(false);
      setSuccessToast('Đã khôi phục cấu hình xếp loại mặc định thành công.');
      setTimeout(() => setSuccessToast(''), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi khôi phục cấu hình mặc định.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Configuration
  const handleSave = async () => {
    if (!hasAdminRights) return;
    setErrorMsg('');

    // Clean score inputs to integers
    const cleanedTiers: RatingTierItem[] = tiers.map((t, idx) => ({
      ...t,
      name: t.name.trim(),
      min_score: parseInt(String(t.min_score), 10),
      max_score: parseInt(String(t.max_score), 10),
      sort_order: idx + 1
    }));

    // Validate using Requirement 4 rules
    const validation = validateRatingTiers(cleanedTiers);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Dữ liệu cấu hình xếp loại không hợp lệ.');
      return;
    }

    try {
      setIsSubmitting(true);

      const periodIdSlug = periodId.replace(/[^a-zA-Z0-9]/g, '_');
      const yearSlug = schoolYear.replace(/[^a-zA-Z0-9]/g, '_');
      const configId = existingConfigId || `rating_cfg_${yearSlug}_${scopeType}_${periodIdSlug}`;

      const configPayload: EvaluationRatingConfig = {
        id: configId,
        school_id: 'thpt_minh_hoa',
        name: configName || `Cấu hình xếp loại rèn luyện (${periodId})`,
        school_year: schoolYear,
        evaluation_period_type: scopeType,
        evaluation_period_id: periodId,
        tiers: cleanedTiers,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.name || 'BGH',
        updated_by: user?.name || 'BGH'
      };

      await onSaveConfig(configPayload, originalTiers, `Cập nhật cấu hình xếp loại ${periodId} (${schoolYear})`);

      setSuccessToast('Đã lưu cấu hình xếp loại thành công. Hệ thống tự động áp dụng xếp loại mới.');
      setTimeout(() => {
        setSuccessToast('');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi lưu cấu hình xếp loại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-3 max-h-[94vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-xs">
              <Sliders size={22} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>CẤU HÌNH XẾP LOẠI HỌC SINH</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Nền nếp & rèn luyện
                </span>
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Trường THPT Minh Hòa • Năm học: <strong className="text-white font-bold">{schoolYear}</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs & Scope Switcher Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Main Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveModalTab('tiers')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeModalTab === 'tiers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders size={14} />
              <span>Bảng cấu hình xếp loại</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('history')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeModalTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History size={14} />
              <span>Lịch sử thay đổi ({historyList.length})</span>
            </button>
          </div>

          {/* Scope Selection (Requirement 10: Tháng, Tuần, Cả năm học) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <Layers size={14} className="text-blue-600" />
                <span>Phạm vi cấu hình:</span>
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScopeType('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    scopeType === 'all'
                      ? 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Cấu hình mặc định áp dụng chung cho cả năm học"
                >
                  🌐 Cả năm học
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    scopeType === 'month'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Cấu hình áp dụng riêng cho tháng đang chọn"
                >
                  📊 {selectedMonth}
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    scopeType === 'week'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Cấu hình áp dụng riêng cho tuần đang chọn"
                >
                  📅 Tuần {String(selectedWeek).padStart(2, '0')}
                </button>
              </div>
            </div>

            {/* Permission mode toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAdminOverride(true)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  hasAdminRights
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bật quyền Quản trị (Admin/BGH): Thêm, Sửa, Xóa, Khôi phục, Lưu"
              >
                🛡️ Admin / BGH
              </button>
              <button
                type="button"
                onClick={() => setAdminOverride(false)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !hasAdminRights
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Chế độ xem của GVCN (chỉ đọc)"
              >
                👁️ GVCN (Chỉ xem)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-start gap-2 animate-in fade-in">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="block font-black text-rose-900">Không thể lưu cấu hình:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successToast && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Role disclaimer if in read-only mode (Requirement 11) */}
          {!hasAdminRights && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Chế độ xem:</strong> Thầy/Cô đang ở chế độ xem cấu hình (GVCN). Chỉ Quản trị viên (Ban Giám Hiệu) mới có quyền chỉnh sửa, thêm hoặc xóa mức xếp loại.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdminOverride(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                Bật quyền Quản trị
              </button>
            </div>
          )}

          {activeModalTab === 'tiers' && (
            <div className="space-y-4">
              {/* Notice of current scope */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-blue-950">Phạm vi áp dụng:</span>
                  <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded-lg">
                    {scopeType === 'all'
                      ? `Cả năm học ${schoolYear} (Mặc định)`
                      : scopeType === 'month'
                      ? `${selectedMonth} • Năm học ${schoolYear}`
                      : `Tuần ${String(selectedWeek).padStart(2, '0')} • Năm học ${schoolYear}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  * Thang điểm chuẩn: 100 điểm. Toàn bộ các mức xếp loại phải bao phủ liên tục từ 0 đến 100.
                </div>
              </div>

              {/* Tiers Table (Requirement 2 & 3: Xếp loại, Điểm từ, Điểm đến, Màu, Thao tác) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-extrabold uppercase tracking-wide">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 min-w-[140px]">Xếp loại</th>
                      <th className="p-3 w-28 text-center">Điểm từ</th>
                      <th className="p-3 w-28 text-center">Điểm đến</th>
                      <th className="p-3 w-36">Màu</th>
                      <th className="p-3 min-w-[110px] text-center">Xem trước</th>
                      {hasAdminRights && <th className="p-3 w-32 text-center">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tiers.map((tier, index) => {
                      const badgeStyle = getRatingBadgeStyle(tier.color, tier.name);

                      return (
                        <tr key={tier.id} className="hover:bg-slate-50 transition-colors">
                          {/* Order & Reorder Controls */}
                          <td className="p-3 text-center">
                            {hasAdminRights ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-slate-500 w-4">{index + 1}</span>
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveTier(index, 'up')}
                                    disabled={index === 0}
                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer p-0.5"
                                    title="Di chuyển lên trên"
                                  >
                                    <ArrowUp size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveTier(index, 'down')}
                                    disabled={index === tiers.length - 1}
                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer p-0.5"
                                    title="Di chuyển xuống dưới"
                                  >
                                    <ArrowDown size={11} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-500">{index + 1}</span>
                            )}
                          </td>

                          {/* Tier Name */}
                          <td className="p-3">
                            {hasAdminRights ? (
                              <input
                                type="text"
                                value={tier.name}
                                onChange={(e) => handleUpdateTier(tier.id, 'name', e.target.value)}
                                placeholder="Tên xếp loại (ví dụ: Tốt, Khá...)"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                              />
                            ) : (
                              <span className="font-extrabold text-slate-900">{tier.name}</span>
                            )}
                          </td>

                          {/* Min Score */}
                          <td className="p-3 text-center">
                            {hasAdminRights ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={tier.min_score}
                                onChange={(e) => handleUpdateTier(tier.id, 'min_score', e.target.value)}
                                className="w-20 px-2 py-1.5 text-center bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">{tier.min_score}</span>
                            )}
                          </td>

                          {/* Max Score */}
                          <td className="p-3 text-center">
                            {hasAdminRights ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={tier.max_score}
                                onChange={(e) => handleUpdateTier(tier.id, 'max_score', e.target.value)}
                                className="w-20 px-2 py-1.5 text-center bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">{tier.max_score}</span>
                            )}
                          </td>

                          {/* Color Selector */}
                          <td className="p-3">
                            {hasAdminRights ? (
                              <select
                                value={tier.color || 'emerald'}
                                onChange={(e) => handleUpdateTier(tier.id, 'color', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 cursor-pointer"
                              >
                                {Object.entries(RATING_COLOR_MAP).map(([key, val]) => (
                                  <option key={key} value={key}>
                                    {val.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-700 font-medium">
                                {RATING_COLOR_MAP[tier.color]?.label || tier.color}
                              </span>
                            )}
                          </td>

                          {/* Live Preview Badge */}
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block ${badgeStyle}`}>
                              {tier.name || 'Xem trước'}
                            </span>
                          </td>

                          {/* Actions (Sửa / Xóa) */}
                          {hasAdminRights && (
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteTier(tier.id)}
                                disabled={tiers.length <= 1}
                                className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1 mx-auto cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Xóa mức xếp loại này"
                              >
                                <Trash2 size={13} />
                                <span>Xóa</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Helper explanation for score validation */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-600" />
                  Quy tắc xác thực thang điểm (0 – 100):
                </span>
                <p>
                  • Các khoảng điểm phải nối tiếp liên tục không để hổng, ví dụ: <strong>90–100 (Tốt)</strong>, <strong>80–89 (Khá)</strong>, <strong>65–79 (Đạt)</strong>, <strong>0–64 (Chưa đạt)</strong>.
                </p>
                <p>
                  • Khi lưu cấu hình, hệ thống sẽ tự động cập nhật ngay tức thì kết quả xếp loại của toàn bộ học sinh theo điểm số thực tế.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT HISTORY (Requirement 12) */}
          {activeModalTab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <History size={16} className="text-blue-600" />
                LỊCH SỬ THAY ĐỔI CẤU HÌNH XẾP LOẠI
              </h3>

              {historyList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                  Chưa ghi nhận lịch sử thay đổi cấu hình nào cho năm học này.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                  {historyList.map(item => (
                    <div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.action === 'restore_default'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.action === 'restore_default' ? 'Khôi phục mặc định' : 'Cập nhật'}
                          </span>
                          <span className="font-bold text-slate-800">{item.performed_by}</span>
                          {item.performed_by_role && (
                            <span className="text-[10px] text-slate-500">({item.performed_by_role})</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(item.performed_at).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {item.note && (
                        <p className="text-[11px] text-slate-600 font-medium">{item.note}</p>
                      )}

                      {/* Before / After comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        {item.before_change && item.before_change.length > 0 && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-500 block mb-1">Trước khi sửa:</span>
                            <div className="flex flex-wrap gap-1">
                              {item.before_change.map(b => (
                                <span key={b.id || b.name} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                  {b.name} ({b.min_score}–{b.max_score})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                          <span className="font-bold text-emerald-800 block mb-1">Sau khi lưu:</span>
                          <div className="flex flex-wrap gap-1">
                            {item.after_change.map(a => (
                              <span key={a.id || a.name} className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-emerald-900">
                                {a.name} ({a.min_score}–{a.max_score})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {hasAdminRights && activeModalTab === 'tiers' && (
              <>
                <button
                  type="button"
                  onClick={handleAddTier}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ THÊM MỨC XẾP LOẠI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>↩ KHÔI PHỤC MẶC ĐỊNH</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              HỦY
            </button>

            {hasAdminRights && activeModalTab === 'tiers' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ring-2 ring-emerald-300 hover:ring-emerald-400"
              >
                <Save size={15} />
                <span>{isSubmitting ? 'ĐANG LƯU...' : '💾 LƯU CẤU HÌNH'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Restore Defaults */}
        {showRestoreConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <RotateCcw size={24} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  XÁC NHẬN KHÔI PHỤC MẶC ĐỊNH
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn có chắc muốn khôi phục về cấu hình xếp loại mặc định:
                </p>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-0.5 font-medium text-[11px] text-slate-800">
                  <p>• <strong>Tốt:</strong> 90 – 100 điểm</p>
                  <p>• <strong>Khá:</strong> 80 – 89 điểm</p>
                  <p>• <strong>Đạt:</strong> 65 – 79 điểm</p>
                  <p>• <strong>Chưa đạt:</strong> 0 – 64 điểm</p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestoreDefault}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Đang khôi phục...' : 'Đồng ý khôi phục'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
