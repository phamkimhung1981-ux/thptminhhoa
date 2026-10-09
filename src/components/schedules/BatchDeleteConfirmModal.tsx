import React from 'react';
import { Trash2, X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface BatchDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  items: {
    dayId: string;
    dayName: string;
    dateStr: string;
    timeSlot: 'morning' | 'afternoon';
    itemId: string;
    content: string;
    hasEvaluation?: boolean;
  }[];
  isSubmitting?: boolean;
}

export default function BatchDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  isSubmitting = false
}: BatchDeleteConfirmModalProps) {
  if (!isOpen || items.length === 0) return null;

  const anyHasEvaluation = items.some(i => i.hasEvaluation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950 uppercase tracking-wide">
                XÁC NHẬN XÓA HÀNG LOẠT
              </h3>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">
                Đang chọn {items.length} công việc để xóa
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-sm font-bold text-slate-800">
            Bạn đang yêu cầu xóa <span className="text-rose-600 font-black">{items.length} công việc</span>. Bạn có chắc chắn muốn tiếp tục không?
          </p>

          {/* List of items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
            {items.map((item, idx) => (
              <div key={item.itemId || idx} className="p-3 text-xs flex items-start gap-2.5">
                <span className="font-bold text-slate-400 mt-0.5">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-700">{item.dayName} ({item.dateStr})</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-500">Buổi {item.timeSlot === 'morning' ? 'Sáng' : 'Chiều'}</span>
                  </div>
                  <p className="font-medium text-slate-800 mt-1 line-clamp-2">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {anyHasEvaluation && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 font-medium">
                Một số công việc đã có dữ liệu đánh giá hoặc kết quả thực hiện. Việc xóa sẽ làm mất các dữ liệu liên quan.
              </div>
            </div>
          )}
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
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              'Đang xóa...'
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa ({items.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
