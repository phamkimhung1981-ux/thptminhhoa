import React from 'react';
import { 
  X, 
  Clock, 
  User, 
  ShieldCheck, 
  FileCheck2, 
  Lock, 
  Unlock, 
  Send, 
  Save, 
  Trash2,
  Activity
} from 'lucide-react';
import { KpiCbqlAuditLog } from '../../types/kpiCbql';

interface KpiCbqlAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: KpiCbqlAuditLog[];
}

export default function KpiCbqlAuditLogsModal({
  isOpen,
  onClose,
  logs
}: KpiCbqlAuditLogsModalProps) {
  if (!isOpen) return null;

  const getActionIcon = (action: KpiCbqlAuditLog['action']) => {
    switch (action) {
      case 'create_form':
        return <FileCheck2 size={16} className="text-blue-600" />;
      case 'save_self_evaluation':
        return <Save size={16} className="text-slate-600" />;
      case 'submit_form':
        return <Send size={16} className="text-amber-600" />;
      case 'evaluate':
        return <ShieldCheck size={16} className="text-indigo-600" />;
      case 'lock_form':
        return <Lock size={16} className="text-emerald-600" />;
      case 'unlock_form':
        return <Unlock size={16} className="text-amber-600" />;
      case 'delete_form':
        return <Trash2 size={16} className="text-rose-600" />;
      default:
        return <Activity size={16} className="text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Nhật Ký Lịch Sử Thao Tác (Audit Logs)</h3>
              <p className="text-xs text-slate-300">Theo dõi toàn bộ quá trình tự đánh giá và thủ trưởng chấm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có nhật ký thao tác nào được ghi nhận.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
              {logs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });

                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Dot on line */}
                    <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 group-hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-bold text-xs text-slate-800">
                            {log.performedByName} ({log.performedByRole || 'CBQL'})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {log.details}
                      </p>

                      {log.previousStatus && log.newStatus && (
                        <div className="mt-2 text-[11px] font-semibold text-slate-500">
                          Chuyển trạng thái: <code className="text-amber-700">{log.previousStatus}</code> → <code className="text-emerald-700">{log.newStatus}</code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
