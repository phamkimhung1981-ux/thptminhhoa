import React, { useState } from 'react';
import { WorkAssignment, WorkAssignmentStatus } from '../../types';
import { X, CheckCircle, Upload, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { safeFormatLocale } from '../../utils/dateUtils';

interface TaskProgressModalProps {
  task: WorkAssignment;
  onClose: () => void;
  onSave: (id: string, updates: Partial<WorkAssignment>) => Promise<void> | void;
}

export default function TaskProgressModal({ task, onClose, onSave }: TaskProgressModalProps) {
  const [status, setStatus] = useState<WorkAssignmentStatus>(task.status || 'Đang thực hiện');
  const [progress, setProgress] = useState<number>(task.progress ?? (task.status === 'Hoàn thành' || task.status === 'Hoàn thành tốt' ? 100 : 50));
  const [resultSummary, setResultSummary] = useState<string>(task.resultSummary || '');
  const [evidenceUrl, setEvidenceUrl] = useState<string>(task.evidenceUrl || '');
  const [evidenceName, setEvidenceName] = useState<string>(task.evidenceName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn file dung lượng dưới 5MB.');
      return;
    }

    setEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isDone = status === 'Hoàn thành' || status === 'Hoàn thành tốt';
      const updates: Partial<WorkAssignment> = {
        status,
        progress: isDone ? 100 : progress,
        resultSummary: resultSummary.trim(),
        evidenceUrl: evidenceUrl.trim(),
        evidenceName: evidenceName.trim(),
        completionDate: isDone ? (task.completionDate || new Date().toISOString()) : undefined,
        updatedAt: new Date().toISOString()
      };
      await onSave(task.id, updates);
      onClose();
    } catch (err) {
      console.error('Lỗi khi cập nhật tiến độ:', err);
      alert('Có lỗi xảy ra khi lưu tiến độ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Cập nhật tiến độ & Kết quả</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 line-clamp-1 mt-0.5">
              {task.content}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Brief info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Hạn hoàn thành:</span>
              <strong className="text-slate-800">{safeFormatLocale(task.deadline, 'toLocaleDateString', '—')}</strong>
            </div>
            {task.requirements && (
              <div className="text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Yêu cầu:</span> {task.requirements}
              </div>
            )}
          </div>

          {/* Trạng thái thực hiện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Trạng thái thực hiện <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { val: 'Chưa thực hiện', label: 'Chưa thực hiện', color: 'border-slate-300 hover:bg-slate-50 text-slate-700' },
                { val: 'Đang thực hiện', label: 'Đang thực hiện', color: 'border-blue-300 hover:bg-blue-50 text-blue-700' },
                { val: 'Chậm tiến độ', label: 'Chậm tiến độ', color: 'border-amber-300 hover:bg-amber-50 text-amber-700' },
                { val: 'Hoàn thành', label: 'Hoàn thành', color: 'border-emerald-300 hover:bg-emerald-50 text-emerald-700' },
                { val: 'Hoàn thành tốt', label: 'Hoàn thành tốt ⭐', color: 'border-indigo-300 hover:bg-indigo-50 text-indigo-700' }
              ].map(item => {
                const isSelected = status === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setStatus(item.val as WorkAssignmentStatus);
                      if (item.val === 'Hoàn thành' || item.val === 'Hoàn thành tốt') {
                        setProgress(100);
                      } else if (item.val === 'Chưa thực hiện') {
                        setProgress(0);
                      }
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                        : `bg-white ${item.color}`
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tiến độ (%) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tiến độ công việc
              </label>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {progress}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Bắt đầu)</span>
              <span>50%</span>
              <span>100% (Xong)</span>
            </div>
          </div>

          {/* Báo cáo kết quả thực hiện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Kết quả thực hiện / Báo cáo nội dung
            </label>
            <textarea
              rows={3}
              value={resultSummary}
              onChange={e => setResultSummary(e.target.value)}
              placeholder="Nhập chi tiết sản phẩm đầu ra, số liệu hoặc báo cáo kết quả hoàn thành..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* File minh chứng nếu có */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              File minh chứng hoặc Đường link liên kết
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={evidenceUrl}
                    onChange={e => setEvidenceUrl(e.target.value)}
                    placeholder="https://drive.google.com/... hoặc đường dẫn minh chứng"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>Chọn tệp đính kèm</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                </label>
                {evidenceName && (
                  <span className="text-xs text-slate-600 font-medium truncate max-w-[240px] flex items-center gap-1">
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    {evidenceName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={15} />
              {isSubmitting ? 'Đang lưu...' : 'Lưu kết quả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
