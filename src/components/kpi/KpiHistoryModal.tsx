import React from 'react';
import { X, History, User, Calendar, Award, CheckCircle2, Clock, XCircle, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { KpiRecord } from '../../types';
import { cn } from '../../lib/utils';
import { safeFormatLocale } from '../../utils/dateUtils';

interface KpiHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: KpiRecord | null;
}

export default function KpiHistoryModal({
  isOpen,
  onClose,
  record
}: KpiHistoryModalProps) {
  if (!isOpen || !record) return null;

  const getStatusBadge = (status: KpiRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Đã xác nhận</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Chờ xác nhận</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Bị từ chối</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 line-through">Đã hủy</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Chi tiết & Lịch sử ghi nhận KPI</h3>
              <p className="text-xs text-slate-400">Mã bản ghi: {record.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main info card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">CBGVNV:</span>
                <div className="text-sm font-bold text-slate-900">{record.teacherName} (Mã: {record.teacherCode || record.teacherId})</div>
                <div className="text-xs text-slate-500">{record.departmentName}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block mb-1">Trạng thái:</span>
                {getStatusBadge(record.status)}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Tiêu chí KPI:</span>
                <span className="font-semibold text-slate-800">{record.kpiCode} - {record.kpiName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Nhóm KPI:</span>
                <span className="font-semibold text-slate-800">{record.group}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Số lượng & Đơn vị:</span>
                <span className="font-semibold text-slate-800">{record.quantity} {record.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tổng điểm:</span>
                <span className={cn(
                  "font-bold text-sm",
                  record.totalPoints > 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {record.totalPoints > 0 ? `+${record.totalPoints}` : record.totalPoints} điểm
                </span>
              </div>
            </div>

            {/* Date and Creator info */}
            <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Ngày ghi nhận:</span>
                <span className="font-medium text-slate-800">{record.date} (Năm học {record.academicYear || '2025-2026'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Người ghi nhận:</span>
                <span className="font-medium text-slate-800">{record.assignedBy}</span>
              </div>
            </div>

            {/* Confirmed info if any */}
            {record.confirmedBy && (
              <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-xs text-emerald-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Người xác nhận:</span>
                  <span className="font-semibold">{record.confirmedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Thời gian xác nhận:</span>
                  <span className="font-medium">
                    {record.confirmedDate ? safeFormatLocale(record.confirmedDate, 'toLocaleString', 'Chưa cập nhật') : 'Đã xác nhận'}
                  </span>
                </div>
              </div>
            )}

            {/* Rejection / Cancellation Reason if any */}
            {record.rejectionReason && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                <strong>Lý do từ chối:</strong> {record.rejectionReason}
              </div>
            )}
            {record.cancellationReason && (
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700">
                <strong>Lý do hủy bỏ:</strong> {record.cancellationReason}
              </div>
            )}

            {/* Note */}
            {record.note && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700 block mb-0.5">Ghi chú sự việc:</span>
                {record.note}
              </div>
            )}

            {/* Evidence */}
            {record.evidenceUrl && (
              <div className="text-xs text-slate-700 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-blue-900 block">Minh chứng đính kèm:</span>
                  <span className="text-[11px] text-blue-700">{record.evidenceName || record.evidenceNote || 'Tệp minh chứng'}</span>
                </div>
                <a
                  href={record.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở xem
                </a>
              </div>
            )}
          </div>

          {/* Audit Trail Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              Nhật ký lịch sử thay đổi (Audit Log)
            </h4>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
              {record.history && record.history.length > 0 ? (
                record.history.map((h, i) => (
                  <div key={i} className="relative group">
                    {/* Dot */}
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow" />
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{h.performedBy}</span>
                        <span className="text-[11px] text-slate-400">
                          {safeFormatLocale(h.timestamp, 'toLocaleString', 'Chưa cập nhật')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {h.details}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow" />
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{record.assignedBy}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {record.createdAt ? safeFormatLocale(record.createdAt, 'toLocaleString', 'Chưa cập nhật') : record.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Khởi tạo bản ghi KPI phát sinh ({record.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ duyệt'}).
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border hover:bg-slate-100 transition-colors bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
