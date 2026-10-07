import React, { useState, useEffect } from 'react';
import { X, Settings, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { KpiMonthlySetting } from '../../types';

interface KpiBasePointSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYear: string;
  month: string;
  onSuccess?: (msg: string) => void;
}

export default function KpiBasePointSettingModal({
  isOpen,
  onClose,
  academicYear,
  month,
  onSuccess
}: KpiBasePointSettingModalProps) {
  const { kpiMonthlySettings, saveKpiMonthlySetting } = useAppContext();
  const { user } = useAuth();

  const [points, setPoints] = useState<number>(100);
  const [applyScope, setApplyScope] = useState<'month' | 'year' | 'default'>('month');
  const [preventNegativeScore, setPreventNegativeScore] = useState<boolean>(true);
  const [capDeductionsAtBasePoints, setCapDeductionsAtBasePoints] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load existing setting if any
  useEffect(() => {
    if (isOpen) {
      const monthSetting = kpiMonthlySettings.find(s => s.academicYear === academicYear && s.month === month);
      const yearSetting = kpiMonthlySettings.find(s => s.academicYear === academicYear && (s.month === 'all' || !s.month));
      const defaultSetting = kpiMonthlySettings.find(s => s.id === 'default');

      const target = monthSetting || yearSetting || defaultSetting;
      if (monthSetting) {
        setApplyScope('month');
      } else if (yearSetting) {
        setApplyScope('year');
      } else {
        setApplyScope('default');
      }

      if (target) {
        setPoints(target.defaultBasePoints);
        setPreventNegativeScore(target.preventNegativeScore !== false);
        setCapDeductionsAtBasePoints(target.capDeductionsAtBasePoints !== false);
        setIsLocked(Boolean(target.isLocked));
        setLockReason(target.lockReason || '');
      } else {
        setPoints(100);
        setPreventNegativeScore(true);
        setCapDeductionsAtBasePoints(true);
        setIsLocked(false);
        setLockReason('');
      }
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, academicYear, month, kpiMonthlySettings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points < 0) {
      setErrorMsg('Điểm đầu tháng không được là số âm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let settingId = `setting_${academicYear}_${month}`;
      let targetMonth: string | undefined = month;

      if (applyScope === 'year') {
        settingId = `setting_${academicYear}_all`;
        targetMonth = 'all';
      } else if (applyScope === 'default') {
        settingId = 'default';
        targetMonth = 'all';
      }

      const settingData: KpiMonthlySetting = {
        id: settingId,
        academicYear,
        month: targetMonth,
        defaultBasePoints: Number(points),
        preventNegativeScore,
        capDeductionsAtBasePoints,
        isLocked,
        lockReason: isLocked ? (lockReason || 'Đã khóa bởi BGH') : undefined,
        lockedAt: isLocked ? new Date().toISOString() : undefined,
        lockedBy: isLocked ? (user?.name || 'Ban Giám Hiệu') : undefined,
        updatedBy: user?.name || 'Ban Giám Hiệu'
      };

      await saveKpiMonthlySetting(settingData);

      if (onSuccess) {
        onSuccess(`Đã cập nhật cấu hình tính điểm KPI (${points} điểm${isLocked ? ', ĐÃ KHÓA KỲ ĐÁNH GIÁ' : ''}).`);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể lưu cấu hình điểm đầu tháng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-blue-600 text-white">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm">Cấu hình Điểm KPI Đầu tháng</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Điểm đầu tháng là mức điểm nền ban đầu (mặc định 100 điểm) để cộng điểm thưởng và trừ điểm vi phạm trong tháng.
          </p>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mức điểm đầu tháng (Điểm) *
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              step="1"
              value={points}
              onChange={e => setPoints(parseInt(e.target.value) || 0)}
              required
              className="w-full px-3.5 py-2 text-base font-extrabold text-blue-600 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-center bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phạm vi áp dụng
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/50">
                <input
                  type="radio"
                  name="applyScope"
                  checked={applyScope === 'month'}
                  onChange={() => setApplyScope('month')}
                  className="text-blue-600"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Riêng Tháng {month} (Năm học {academicYear})</span>
                  <span className="text-[11px] text-slate-500">Chỉ áp dụng cho tháng đang chọn</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/50">
                <input
                  type="radio"
                  name="applyScope"
                  checked={applyScope === 'year'}
                  onChange={() => setApplyScope('year')}
                  className="text-blue-600"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Cả Năm học {academicYear}</span>
                  <span className="text-[11px] text-slate-500">Áp dụng cho tất cả các tháng trong năm học {academicYear}</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/50">
                <input
                  type="radio"
                  name="applyScope"
                  checked={applyScope === 'default'}
                  onChange={() => setApplyScope('default')}
                  className="text-blue-600"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Mặc định toàn hệ thống</span>
                  <span className="text-[11px] text-slate-500">Làm mức điểm cơ sở cho toàn bộ các năm học tương lai</span>
                </div>
              </label>
            </div>
          </div>

          {/* Scoring Rules & Constraints */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quy tắc tính điểm & Giới hạn
            </label>
            
            <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/30">
              <input
                type="checkbox"
                checked={preventNegativeScore}
                onChange={e => setPreventNegativeScore(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Không cho phép điểm âm</span>
                <span className="text-[11px] text-slate-500">Điểm tổng kết cuối cùng của giáo viên không nhỏ hơn 0 điểm</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/30">
              <input
                type="checkbox"
                checked={capDeductionsAtBasePoints}
                onChange={e => setCapDeductionsAtBasePoints(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Giới hạn điểm trừ tối đa bằng điểm nền</span>
                <span className="text-[11px] text-slate-500">Tổng điểm trừ không vượt quá điểm nền ban đầu</span>
              </div>
            </label>
          </div>

          {/* Month Locking Feature */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-start gap-2.5 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100/50">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={e => setIsLocked(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-amber-900 block flex items-center gap-1.5">
                  Khóa kỳ đánh giá (Tháng {month})
                </span>
                <span className="text-[11px] text-amber-700">
                  Khi đã khóa, giáo viên và tổ trưởng không thể thêm hoặc sửa đổi các bản ghi chấm điểm KPI của tháng này.
                </span>
              </div>
            </label>

            {isLocked && (
              <div className="mt-2 pl-6">
                <input
                  type="text"
                  placeholder="Lý do khóa kỳ (VD: Đã chốt thi đua tháng...)"
                  value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
