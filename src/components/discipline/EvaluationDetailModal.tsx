import React from 'react';
import { DisciplineRecord, Teacher, Department } from '../../types';
import { X, Printer, Edit, Calendar, User, Building, ShieldCheck, CheckCircle2, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { safeFormatLocale } from '../../utils/dateUtils';
import { exportDisciplineSessionsToExcel, exportDisciplineSessionToDocx } from '../../utils/disciplineExport';

export interface EvaluationSessionData {
  key: string;
  recordIds: string[];
  teacherId: string;
  departmentId: string;
  date: string;
  note: string;
  evaluations: DisciplineRecord[];
  ttcmGeneralNote?: string;
  bghGeneralNote?: string;
  evaluatorRole?: 'TTCM' | 'BGH';
}

interface EvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: EvaluationSessionData | null;
  teacher?: Teacher;
  department?: Department;
  canEdit?: boolean;
  onEdit?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}

export default function EvaluationDetailModal({
  isOpen,
  onClose,
  session,
  teacher,
  department,
  canEdit,
  onEdit,
  canDelete,
  onDelete
}: EvaluationDetailModalProps) {
  if (!isOpen || !session) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportDisciplineSessionsToExcel({
      sessions: [session],
      teachers: teacher ? [teacher] : [],
      departments: department ? [department] : [],
      titleText: `PHIẾU ĐÁNH GIÁ NỀN NẾP & NỘI QUY - ${teacher?.name || 'CBGVNV'}`,
      fileNamePrefix: `Phieu_Nen_Nep_${teacher?.code || 'CBGV'}`
    });
  };

  const handleExportDocx = async () => {
    await exportDisciplineSessionToDocx({
      session,
      teacher,
      department
    });
  };

  const formattedDate = safeFormatLocale(session.date, 'toLocaleDateString', 'Chưa cập nhật');

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-w-none print:h-auto print:max-h-none print:rounded-none">
        
        {/* Header - Ẩn khi in */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Chi tiết phiếu đánh giá nền nếp & nội quy</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                Chỉnh sửa
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa phiếu
              </button>
            )}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              title="Xuất file Excel cho phiếu này"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportDocx}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              title="Xuất file Word (.docx) cho phiếu này"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Word
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung phiếu đánh giá trang trọng */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0">
          
          {/* Tiêu đề phiếu */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              TRƯỜNG THPT MINH HÒA
            </h2>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
              PHIẾU ĐÁNH GIÁ NỀN NẾP & NỘI QUY
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Thời gian đánh giá: {formattedDate}
            </p>
          </div>

          {/* Thông tin hành chính */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">CBGVNV:</span>
              <span className="font-bold text-slate-900">
                {teacher ? teacher.name : 'Chưa xác định CBGVNV'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Mã giáo viên:</span>
              <span className="font-medium text-slate-800">
                {teacher?.code || '-'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Tổ chuyên môn:</span>
              <span className="font-medium text-slate-800">
                {department?.name || 'Chưa phân tổ'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Người đánh giá:</span>
              <span className="font-medium text-slate-800">
                {session.evaluatorRole === 'BGH' ? 'Ban Giám Hiệu (BGH)' : 'Tổ trưởng chuyên môn (TTCM)'}
              </span>
            </div>
          </div>

          {/* Chi tiết từng tiêu chí và nhận xét riêng biệt */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
              Nội dung đánh giá & nhận xét từng tiêu chí
            </h3>

            <div className="space-y-3">
              {session.evaluations.map((ev, index) => {
                const hasTtcmComment = Boolean(ev.ttcmComment?.trim());
                const hasBghComment = Boolean(ev.bghComment?.trim());
                const isLegacy = !hasTtcmComment && !hasBghComment && Boolean(ev.level);

                return (
                  <div 
                    key={ev.id || index}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {ev.criteria}
                        </h4>
                      </div>
                      {/* Dành cho bản ghi lịch sử */}
                      {isLegacy && (
                        <Badge variant={ev.level === 'Tốt' || ev.level === 'Đạt' ? 'success' : 'danger'}>
                          {ev.level}
                        </Badge>
                      )}
                    </div>

                    {/* Nhận xét của TTCM */}
                    <div className="pl-7 space-y-2">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                        <span className="font-semibold text-blue-800 block">
                          Nhận xét của Tổ trưởng chuyên môn (TTCM):
                        </span>
                        {hasTtcmComment ? (
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {ev.ttcmComment}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">
                            (Chưa có nhận xét của TTCM)
                          </p>
                        )}
                      </div>

                      {/* Nhận xét của BGH */}
                      <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs space-y-1">
                        <span className="font-semibold text-amber-900 block">
                          Nhận xét của Ban Giám hiệu (BGH):
                        </span>
                        {hasBghComment ? (
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {ev.bghComment}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">
                            (Chưa có nhận xét của BGH)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nhận xét chung TTCM và BGH */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Nhận xét chung toàn diện
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-blue-900 block uppercase">
                  Nhận xét chung của TTCM:
                </span>
                {session.ttcmGeneralNote?.trim() ? (
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {session.ttcmGeneralNote}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">
                    {session.note?.trim() ? session.note : '(Chưa có nhận xét chung của TTCM)'}
                  </p>
                )}
              </div>

              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <span className="font-bold text-amber-950 block uppercase">
                  Nhận xét của Ban Giám Hiệu:
                </span>
                {session.bghGeneralNote?.trim() ? (
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {session.bghGeneralNote}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">
                    (Chưa có nhận xét của BGH)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ký tên (cho bản in) */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-slate-800">TỔ TRƯỞNG CHUYÊN MÔN</p>
              <p className="italic text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-800">BAN GIÁM HIỆU</p>
              <p className="italic text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
