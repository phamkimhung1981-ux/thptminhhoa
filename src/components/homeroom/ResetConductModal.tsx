import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, CheckCircle, ShieldAlert, RefreshCw, Calendar, School } from 'lucide-react';
import { ClassInfo } from '../../types/homeroom';

interface ResetConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSchoolYear: string;
  selectedClass: ClassInfo | null;
  selectedWeek: number;
  selectedMonth: string;
  recordsCount: number;
  studentsCount: number;
  onResetConduct: () => Promise<void>;
}

export default function ResetConductModal({
  isOpen,
  onClose,
  selectedSchoolYear,
  selectedClass,
  selectedWeek,
  selectedMonth,
  recordsCount,
  studentsCount,
  onResetConduct
}: ResetConductModalProps) {
  // Step 1: Initial dialog asking confirmation
  // Step 2: 2nd confirmation guard against accidental deletion (Requirement 12)
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg('');
      setSuccessMsg('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      await onResetConduct();

      setSuccessMsg('Đã xóa/reset kết quả nền nếp thành công.');
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi xảy ra trong quá trình xóa dữ liệu.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-rose-200 shrink-0">
              <Trash2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight uppercase">XÁC NHẬN XÓA / RESET KẾT QUẢ</h2>
              <p className="text-xs text-rose-200">Xóa / reset kết quả nền nếp học sinh theo đúng phạm vi đang chọn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-bold text-sm">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Scope Badges Card */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
              Phạm vi dữ liệu đang chọn trên giao diện:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Calendar size={15} className="text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Năm học</span>
                  <strong className="text-slate-800">{selectedSchoolYear}</strong>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <School size={15} className="text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Lớp đang chọn</span>
                  <strong className="text-slate-800">{selectedClass?.name || 'Tất cả'}</strong>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Calendar size={15} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Tuần đang chọn</span>
                  <strong className="text-slate-800">Tuần {String(selectedWeek).padStart(2, '0')}</strong>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Calendar size={15} className="text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Tháng đang chọn</span>
                  <strong className="text-slate-800">{selectedMonth}</strong>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600">
              <span>Số ghi nhận vi phạm/thưởng thuộc phạm vi này: <strong className="text-rose-600">{recordsCount}</strong></span>
              <span>Tổng học sinh lớp: <strong className="text-blue-700">{studentsCount}</strong></span>
            </div>
          </div>

          {step === 1 ? (
            /* STEP 1: Main dialog content */
            <div className="space-y-3.5">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed font-medium">
                <p className="font-bold text-sm text-rose-950 mb-1">
                  Bạn có chắc chắn muốn xóa kết quả nền nếp của học sinh theo phạm vi đang chọn không?
                </p>
                <p className="text-xs text-rose-800">
                  Dữ liệu sau khi xóa sẽ không còn được sử dụng để tính điểm rèn luyện.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-slate-700 text-[11px]">
                <p className="font-bold text-slate-800">Kết quả sau khi xác nhận xóa:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Toàn bộ ghi nhận vi phạm, điểm cộng (+), điểm trừ (-) trong tuần/tháng này sẽ bị xóa.</li>
                  <li>Điểm rèn luyện của học sinh trở về mức mặc định (100 điểm, xếp loại Tốt).</li>
                  <li>Ghi nhận của GVCN sẽ được đặt lại về trạng thái “Chưa ghi nhận”.</li>
                  <li>Kết quả đánh giá rèn luyện trong phạm vi được chọn sẽ được tính lại.</li>
                </ul>
                <p className="text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                  🛡️ Danh sách học sinh, mã HS, lớp học và dữ liệu các tuần/tháng/lớp khác được bảo toàn tuyệt đối.
                </p>
              </div>

              {/* Action Buttons Step 1 */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>XÁC NHẬN XÓA</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Second confirmation guard (Requirement 12) */
            <div className="space-y-3.5">
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert size={18} className="text-amber-600" />
                  <span>Xác nhận lần thứ hai (Cơ chế chống xóa nhầm)</span>
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  Bạn đang thực hiện xóa vĩnh viễn kết quả nền nếp của Lớp <strong className="text-slate-900">{selectedClass?.name}</strong> trong <strong className="text-slate-900">Tuần {String(selectedWeek).padStart(2, '0')}</strong> ({selectedMonth}, Năm học {selectedSchoolYear}).
                </p>
                <p className="text-[11px] text-amber-900 font-bold bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                  ⚠️ Thao tác này sẽ xóa vĩnh viễn dữ liệu điểm rèn luyện đã phát sinh trong phạm vi trên và không thể hoàn tác. Bạn có chắc chắn muốn tiến hành xóa ngay bây giờ?
                </p>
              </div>

              {/* Action Buttons Step 2 */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Đang xóa dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>XÁC NHẬN XÓA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
