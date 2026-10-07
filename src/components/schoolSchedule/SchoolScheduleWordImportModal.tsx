import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';
import { parseSchoolWorkScheduleWord } from '../../utils/schoolWorkScheduleWordParser';
import { SchoolWorkSchedule } from '../../types/schoolWorkSchedule';

interface SchoolScheduleWordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  currentYear: string;
  currentDeptId: string;
  onImportSuccess: (importedSchedule: SchoolWorkSchedule) => void;
}

export default function SchoolScheduleWordImportModal({
  isOpen,
  onClose,
  currentWeek,
  currentYear,
  currentDeptId,
  onImportSuccess
}: SchoolScheduleWordImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    schedule: SchoolWorkSchedule;
    detectedWeek: number;
    detectedDepartment: string;
    detectedYear: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.docx') && !selected.name.endsWith('.doc')) {
      setError('Vui lòng chọn tệp định dạng Word (.docx hoặc .doc)');
      return;
    }

    setFile(selected);
    setError(null);
    setParsing(true);

    try {
      const result = await parseSchoolWorkScheduleWord(selected, currentYear, currentDeptId);
      setParsedData(result);
    } catch (err: any) {
      console.error(err);
      setError('Không thể đọc file Word này. Vui lòng kiểm tra định dạng bảng hoặc tệp .docx chuẩn.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = (useDetectedWeek: boolean) => {
    if (!parsedData) return;

    const finalSchedule = { ...parsedData.schedule };
    if (!useDetectedWeek) {
      finalSchedule.week_number = currentWeek;
      finalSchedule.title = `LỊCH CÔNG VIỆC TUẦN ${currentWeek}`;
      finalSchedule.id = `sws_${currentYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${String(currentWeek).padStart(2, '0')}_${currentDeptId}`;
    }

    onImportSuccess(finalSchedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Tải file Word Lịch công việc trường
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Nhập tự động nội dung công việc từ file Word (.docx) chuẩn mẫu THPT Minh Hòa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50/90 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload size={22} />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-blue-900 block">
                {file ? file.name : 'Nhấp để chọn hoặc kéo thả file Word (.docx) vào đây'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Hỗ trợ tệp định dạng .docx (Microsoft Word) có bảng lịch tuần
              </span>
            </div>
          </div>

          {/* Loading */}
          {parsing && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3 text-slate-600">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="text-xs font-bold">Đang phân tích cấu trúc bảng và nội dung file Word...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {/* Preview Result */}
          {parsedData && !parsing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black">
                    Đã nhận diện thành công: {parsedData.detectedDepartment} - Tuần {parsedData.detectedWeek}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  {parsedData.schedule.days.reduce((sum, d) => sum + d.morning_tasks.length + d.afternoon_tasks.length, 0)} đầu việc
                </span>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={14} /> Xem trước nội dung đã phân tích
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    7 ngày (Thứ 2 ➔ Chủ nhật)
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 bg-white text-xs">
                  {parsedData.schedule.days.map((d) => (
                    <div key={d.id} className="p-3 hover:bg-slate-50 flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <div className="w-24 shrink-0 font-bold text-slate-900">
                        {d.day_of_week} ({d.date_str})
                      </div>
                      <div className="flex-1 space-y-1">
                        <div>
                          <span className="font-bold text-blue-900">Sáng: </span>
                          {d.morning_tasks.length > 0 ? (
                            d.morning_tasks.map(t => (
                              <span key={t.id} className="inline-block mr-2 text-slate-800">
                                • {t.content} {t.assignee && <em className="text-slate-500">({t.assignee})</em>}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-indigo-900">Chiều: </span>
                          {d.afternoon_tasks.length > 0 ? (
                            d.afternoon_tasks.map(t => (
                              <span key={t.id} className="inline-block mr-2 text-slate-800">
                                • {t.content} {t.assignee && <em className="text-slate-500">({t.assignee})</em>}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </div>
                      </div>
                      {d.duty_evaluator && (
                        <div className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 shrink-0 max-w-[180px]">
                          Lãnh đạo: {d.duty_evaluator}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>

          {parsedData && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirmImport(false)}
                className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-blue-300 hover:bg-blue-50 rounded-xl transition-all shadow-xs"
                title={`Nạp nội dung này vào Tuần ${currentWeek} đang chọn`}
              >
                Nạp vào Tuần {currentWeek} hiện tại
              </button>

              <button
                type="button"
                onClick={() => handleConfirmImport(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title={`Nạp nội dung vào Tuần ${parsedData.detectedWeek} (được phát hiện trong file)`}
              >
                <CheckCircle size={15} />
                <span>Áp dụng vào Tuần {parsedData.detectedWeek}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
