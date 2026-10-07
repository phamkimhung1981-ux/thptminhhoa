import React, { useState } from 'react';
import { 
  X, FileSpreadsheet, FileText, Printer, CheckCircle, Download,
  Layers, Filter, ShieldCheck, AlertCircle, FileCheck
} from 'lucide-react';
import { EvaluationSessionData } from './EvaluationDetailModal';
import { Teacher, Department } from '../../types';
import { 
  exportDisciplineSessionsToExcel, 
  exportDisciplineSessionToDocx 
} from '../../utils/disciplineExport';

interface DisciplineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredSessions: EvaluationSessionData[];
  selectedSessions: EvaluationSessionData[];
  teachers: Teacher[];
  departments: Department[];
  onTriggerPrint: (targetSessions: EvaluationSessionData[]) => void;
}

export default function DisciplineExportModal({
  isOpen,
  onClose,
  filteredSessions,
  selectedSessions,
  teachers,
  departments,
  onTriggerPrint
}: DisciplineExportModalProps) {
  if (!isOpen) return null;

  const [exportScope, setExportScope] = useState<'selected' | 'filtered'>(
    selectedSessions.length > 0 ? 'selected' : 'filtered'
  );
  const [exportFormat, setExportFormat] = useState<'excel' | 'docx' | 'print'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const targetSessions = exportScope === 'selected' && selectedSessions.length > 0 
    ? selectedSessions 
    : filteredSessions;

  const handleExecuteExport = async () => {
    if (targetSessions.length === 0) return;
    setIsExporting(true);
    setExportSuccessMsg(null);

    try {
      if (exportFormat === 'excel') {
        exportDisciplineSessionsToExcel({
          sessions: targetSessions,
          teachers,
          departments,
          titleText: exportScope === 'selected' 
            ? 'BÁO CÁO PHIẾU ĐÁNH GIÁ NỀN NẾP & NỘI QUY (CÁC PHIẾU ĐÃ CHỌN)' 
            : 'BÁO CÁO TỔNG HỢP ĐÁNH GIÁ NỀN NẾP & NỘI QUY',
          fileNamePrefix: 'Bao_Cao_Nen_Nep_Noi_Quy'
        });
        setExportSuccessMsg(`Đã xuất thành công ${targetSessions.length} phiếu đánh giá ra file Excel (.xlsx)!`);
      } else if (exportFormat === 'docx') {
        let exportedCount = 0;
        for (const s of targetSessions) {
          const teacher = teachers.find(t => t.id === s.teacherId);
          const dept = departments.find(d => d.id === (teacher?.departmentId || s.departmentId));
          await exportDisciplineSessionToDocx({
            session: s,
            teacher,
            department: dept
          });
          exportedCount++;
        }
        setExportSuccessMsg(`Đã xuất thành công ${exportedCount} file Word (.docx) phiếu đánh giá!`);
      } else if (exportFormat === 'print') {
        onTriggerPrint(targetSessions);
        onClose();
        return;
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xuất báo cáo & Phiếu đánh giá nền nếp</h3>
              <p className="text-xs text-slate-500">Tùy chọn phạm vi và định dạng file xuất</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-sm">

          {/* Alert thông báo xuất thành công */}
          {exportSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {/* Choose Scope */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
              1. Chọn phạm vi phiếu đánh giá xuất:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'filtered'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    Theo bộ lọc hiện tại
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 font-bold">
                    {filteredSessions.length} phiếu
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Xuất tất cả phiếu thỏa mãn bộ lọc tìm kiếm & tổ chuyên môn
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSessions.length > 0) {
                    setExportScope('selected');
                  }
                }}
                disabled={selectedSessions.length === 0}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedSessions.length === 0
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                    : exportScope === 'selected'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 text-blue-900 font-medium cursor-pointer'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Các phiếu đã chọn
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                    selectedSessions.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedSessions.length} phiếu
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {selectedSessions.length > 0 
                    ? 'Chỉ xuất danh sách những phiếu đang được tích chọn' 
                    : 'Chưa có phiếu nào được tích chọn trong bảng'}
                </p>
              </button>
            </div>
          </div>

          {/* Choose Format */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
              2. Chọn định dạng file / chức năng:
            </label>
            <div className="space-y-2">

              {/* Option 1: Excel */}
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  exportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-emerald-900 font-medium'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 block">
                      Báo cáo danh sách Excel (.xlsx)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Đầy đủ bảng tổng hợp & chi tiết từng tiêu chí, có thể mở chỉnh sửa trên Excel/Google Sheets
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'excel'}
                  onChange={() => setExportFormat('excel')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </button>

              {/* Option 2: Word */}
              <button
                type="button"
                onClick={() => setExportFormat('docx')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  exportFormat === 'docx'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 block">
                      Phiếu đánh giá chính thức Word (.docx)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Định dạng chuẩn văn bản giáo dục có Quốc hiệu, bảng tiêu chí, nhận xét và phần ký tên
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'docx'}
                  onChange={() => setExportFormat('docx')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </button>

              {/* Option 3: Print / PDF */}
              <button
                type="button"
                onClick={() => setExportFormat('print')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  exportFormat === 'print'
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20 text-purple-900 font-medium'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 block">
                      Xem & In / Lưu PDF (Print)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Mở giao diện bản in xem trước trang trọng để in ra máy in hoặc lưu dưới dạng PDF
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'print'}
                  onChange={() => setExportFormat('print')}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </button>

            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>Sẽ xuất tổng cộng:</span>
            <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {targetSessions.length} phiếu đánh giá
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || targetSessions.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Đang khởi tạo...' : 'Thực hiện xuất'}
          </button>
        </div>

      </div>
    </div>
  );
}
