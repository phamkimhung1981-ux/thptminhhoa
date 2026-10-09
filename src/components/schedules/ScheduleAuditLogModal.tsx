import React, { useState, useEffect } from 'react';
import { History, X, ShieldCheck, Calendar, User, Building2, Trash2 } from 'lucide-react';
import { scheduleAuditService, ScheduleAuditLog } from '../../services/scheduleAuditService';

interface ScheduleAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleAuditLogModal({ isOpen, onClose }: ScheduleAuditLogModalProps) {
  const [logs, setLogs] = useState<ScheduleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await scheduleAuditService.getRecentLogs(50);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                NHẬT KÝ XÓA LỊCH GIAO VIỆC (AUDIT LOG)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Theo dõi toàn bộ lịch sử thao tác xóa của người dùng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              Đang tải nhật ký thao tác...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-xl">
              Chưa có lịch sử xóa lịch giao việc nào được ghi nhận.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/80 transition-colors text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-500">{log.formattedTime}</span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-100 text-rose-800">
                        {log.actionLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                        {log.scope}: {log.department}
                      </span>
                    </div>

                    <p className="font-extrabold text-slate-900 text-xs">
                      {log.taskContent}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span>Người thực hiện: <strong className="text-slate-700 font-bold">{log.userName}</strong> ({log.userAccount})</span>
                      <span>•</span>
                      <span>Vai trò: {log.userRole}</span>
                    </div>
                  </div>

                  <div className="sm:self-center shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {log.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs text-slate-500 font-medium">
          <span>Ghi nhận tổng cộng {logs.length} bản ghi gần nhất</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
