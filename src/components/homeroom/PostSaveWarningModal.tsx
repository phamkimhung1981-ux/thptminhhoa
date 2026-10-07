import React from 'react';
import { AlertTriangle, User, ShieldAlert, FileText, X, ArrowRight } from 'lucide-react';
import { ConductRecord, Student } from '../../types/homeroom';

interface PostSaveWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ConductRecord | null;
  student: Student | null;
  onViewProfile?: (student: Student) => void;
  onConfirmProposedRating?: (rating: string, note: string) => Promise<void>;
}

export default function PostSaveWarningModal({
  isOpen,
  onClose,
  record,
  student,
  onViewProfile,
  onConfirmProposedRating
}: PostSaveWarningModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h3 className="font-black text-lg text-rose-700 tracking-tight flex items-center gap-1.5">
                ⚠ CẢNH BÁO RÈN LUYỆN
              </h3>
              <p className="text-xs text-slate-500">Đã ghi nhận vi phạm nghiêm trọng</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-3 text-xs text-rose-950">
          <div className="space-y-1.5">
            <p className="flex items-center justify-between text-slate-700">
              <span>Học sinh:</span>
              <strong className="text-slate-900 text-sm">{record.studentName} ({record.className})</strong>
            </p>
            <p className="flex items-center justify-between text-slate-700">
              <span>Loại vi phạm:</span>
              <strong className="text-rose-700">{record.categoryType || record.criterionName}</strong>
            </p>
            <p className="flex items-center justify-between text-slate-700">
              <span>Mức độ:</span>
              <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                {record.level || 'Nghiêm trọng'}
              </span>
            </p>
            {record.location && (
              <p className="flex items-center justify-between text-slate-700">
                <span>Địa điểm:</span>
                <span className="font-semibold text-slate-800">{record.location}</span>
              </p>
            )}
            <p className="flex items-center justify-between text-slate-700">
              <span>Điểm trừ:</span>
              <strong className="text-rose-700 font-bold">{record.point} điểm</strong>
            </p>
          </div>

          <div className="h-px bg-rose-200/80 my-2"></div>

          <p className="text-rose-900 leading-relaxed">
            Hệ thống đã tạo cảnh báo để GVCN xem xét kết quả rèn luyện và đề xuất lên Ban Giám hiệu theo quy định.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          
          {student && (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onViewProfile) onViewProfile(student);
              }}
              className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Xem hồ sơ</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
