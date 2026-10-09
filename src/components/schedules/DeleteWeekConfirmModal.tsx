import React, { useState } from 'react';
import { AlertOctagon, Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteWeekConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  weekNumber: number;
  departmentName: string;
  isSubmitting?: boolean;
}

export default function DeleteWeekConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  weekNumber,
  departmentName,
  isSubmitting = false
}: DeleteWeekConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const REQUIRED_PHRASE = 'XÓA LỊCH TUẦN';

  if (!isOpen) return null;

  const normInput = confirmText.trim().toUpperCase();
  const isMatched = normInput === REQUIRED_PHRASE || normInput === 'XOA LICH TUAN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-100/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950 uppercase tracking-wide">
                XÓA TOÀN BỘ LỊCH TUẦN
              </h3>
              <p className="text-xs text-rose-800 font-semibold mt-0.5">
                Thao tác bảo vệ 2 bước
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Bước 1: Cảnh báo quan trọng</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              Bạn đang yêu cầu xóa toàn bộ lịch của <strong className="font-black text-rose-950">Tuần {weekNumber}</strong> thuộc đơn vị <strong className="font-black text-rose-950">{departmentName}</strong>. 
              Tất cả các công việc trong tuần sẽ bị xóa sạch và không thể hoàn tác.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Bước 2: Nhập cụm từ <span className="font-black text-rose-600 underline">"{REQUIRED_PHRASE}"</span>:
              </label>
              <button
                type="button"
                onClick={() => setConfirmText(REQUIRED_PHRASE)}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                + Điền nhanh
              </button>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isMatched && !isSubmitting) {
                  onConfirm();
                }
              }}
              placeholder="Nhập: XÓA LỊCH TUẦN"
              className="w-full px-3.5 py-2.5 text-sm font-black tracking-wider text-rose-900 border-2 border-slate-300 focus:border-rose-500 rounded-xl outline-none transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatched || isSubmitting}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              'Đang xóa...'
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa cả tuần</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
