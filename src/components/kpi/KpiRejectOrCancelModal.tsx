import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { KpiRecord } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';

interface KpiRejectOrCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: KpiRecord | null;
  mode: 'reject' | 'cancel'; // 'reject' = từ chối bản ghi chờ duyệt; 'cancel' = hủy bản ghi đã xác nhận
  onSuccess?: (msg: string) => void;
}

export default function KpiRejectOrCancelModal({
  isOpen,
  onClose,
  record,
  mode,
  onSuccess
}: KpiRejectOrCancelModalProps) {
  const { updateKpiRecord } = useAppContext();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !record) return null;

  const isReject = mode === 'reject';
  const title = isReject ? 'Từ chối xác nhận KPI' : 'Hủy bỏ bản ghi KPI đã xác nhận';
  const actionLabel = isReject ? 'Từ chối ghi nhận' : 'Xác nhận hủy bỏ';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do cụ thể.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const nowIso = new Date().toISOString();
      const currentUserName = user?.name || 'Ban Giám Hiệu';

      const historyEntry = {
        action: isReject ? 'reject' : 'cancel',
        performedBy: currentUserName,
        timestamp: nowIso,
        details: `${isReject ? 'Từ chối xác nhận' : 'Hủy bỏ ghi nhận'}: ${reason.trim()}`,
        previousData: {
          status: record.status,
          totalPoints: record.totalPoints
        },
        newData: {
          status: isReject ? 'rejected' : 'cancelled',
          totalPoints: record.totalPoints
        }
      };

      const updatedData: Partial<KpiRecord> = isReject ? {
        status: 'rejected',
        rejectionReason: reason.trim(),
        history: [...(record.history || []), historyEntry],
        updatedAt: nowIso
      } : {
        status: 'cancelled',
        cancellationReason: reason.trim(),
        history: [...(record.history || []), historyEntry],
        updatedAt: nowIso
      };

      await updateKpiRecord(record.id, updatedData);

      if (onSuccess) {
        onSuccess(`Đã ${isReject ? 'từ chối' : 'hủy'} bản ghi KPI của thầy/cô ${record.teacherName}.`);
      }
      onClose();
      setReason('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${isReject ? 'bg-rose-600' : 'bg-amber-600'} text-white`}>
          <div className="flex items-center gap-2.5">
            {isReject ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <h3 className="font-bold text-sm">{title}</h3>
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="font-semibold text-slate-800">{record.teacherName} (Mã: {record.teacherCode || record.teacherId})</div>
            <div className="text-slate-600">Tiêu chí: <strong className="text-slate-900">{record.kpiName}</strong></div>
            <div className="text-slate-500">
              Điểm phát sinh: <span className={record.totalPoints > 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                {record.totalPoints > 0 ? `+${record.totalPoints}` : record.totalPoints} điểm
              </span> (Ngày {record.date})
            </div>
          </div>

          <p className="text-xs text-slate-600">
            {isReject 
              ? 'Bản ghi này sẽ chuyển sang trạng thái "Từ chối" và KHÔNG được cộng/trừ vào điểm KPI tháng của giáo viên.'
              : 'Bản ghi đã xác nhận sẽ được chuyển sang trạng thái "Đã hủy" và không còn tính vào điểm KPI tháng. Lịch sử hủy được lưu lại an toàn.'}
          </p>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý do {isReject ? 'từ chối' : 'hủy bỏ'} *
            </label>
            <textarea
              rows={3}
              required
              placeholder={isReject ? "Ví dụ: Minh chứng chưa đầy đủ hoặc không thuộc diện vi phạm..." : "Ví dụ: Hủy do có quyết định đính chính từ BGH..."}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                isReject ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
              }`}
            >
              {isSubmitting ? 'Đang xử lý...' : actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
