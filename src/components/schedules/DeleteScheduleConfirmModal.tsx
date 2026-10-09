import React from 'react';
import { AlertTriangle, Trash2, X, Calendar, Clock, User, ShieldAlert } from 'lucide-react';
import { SchoolWorkItem } from '../../types/schoolWorkSchedule';

interface DeleteTaskItemInfo {
  id?: string;
  content: string;
  assignee?: string;
  leaderInCharge?: string;
  status?: string;
}

interface DeleteScheduleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  taskItem: DeleteTaskItemInfo | SchoolWorkItem | null;
  dayName: string;
  dateStr: string;
  timeSlot: 'morning' | 'afternoon';
  dutyEvaluator?: string;
  isSubmitting?: boolean;
}

export default function DeleteScheduleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  taskItem,
  dayName,
  dateStr,
  timeSlot,
  dutyEvaluator,
  isSubmitting = false
}: DeleteScheduleConfirmModalProps) {
  if (!isOpen || !taskItem) return null;

  const hasEvaluation = Boolean(
    (taskItem.status && taskItem.status !== 'Chưa thực hiện') ||
    taskItem.leaderInCharge ||
    dutyEvaluator
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950 uppercase tracking-wide">
                XÁC NHẬN XÓA LỊCH GIAO VIỆC
              </h3>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">
                Thao tác này sẽ xóa công việc khỏi lịch giao việc
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
          <p className="text-sm font-bold text-slate-800">
            Bạn có chắc chắn muốn xóa công việc này không?
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-500">Ngày:</span>
                <span className="font-extrabold text-slate-800 ml-1.5">
                  {dayName} ({dateStr})
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-500">Thời gian:</span>
                <span className="font-extrabold text-slate-800 ml-1.5">
                  Buổi {timeSlot === 'morning' ? 'Sáng' : 'Chiều'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                ●
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-500">Nội dung công việc:</span>
                <p className="font-extrabold text-slate-900 mt-0.5 text-[13px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  {taskItem.content}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-500">Người / Đơn vị thực hiện:</span>
                <span className="font-bold text-slate-800 ml-1.5">
                  {taskItem.assignee || 'Chưa phân công'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-500">Người giao việc / Lãnh đạo phụ trách:</span>
                <span className="font-bold text-slate-800 ml-1.5">
                  {taskItem.leaderInCharge || dutyEvaluator || 'Ban Giám hiệu'}
                </span>
              </div>
            </div>

            {taskItem.status && (
              <div className="flex items-center gap-2 pt-1">
                <span className="font-bold text-slate-500">Trạng thái hiện tại:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                  {taskItem.status}
                </span>
              </div>
            )}
          </div>

          {/* Warning if task has evaluations */}
          {hasEvaluation && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-black text-amber-900">CẢNH BÁO: CÔNG VIỆC ĐÃ CÓ ĐÁNH GIÁ</h4>
                <p className="text-amber-800 font-medium mt-0.5 leading-relaxed">
                  Công việc này đã có dữ liệu đánh giá hoặc kết quả tiến độ. Việc xóa sẽ làm mất dữ liệu liên quan. Bạn có chắc chắn muốn tiếp tục?
                </p>
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
                <span>Xóa công việc</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
