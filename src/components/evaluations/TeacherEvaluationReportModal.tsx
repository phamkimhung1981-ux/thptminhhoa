import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { safeFormatLocale } from '../../utils/dateUtils';

interface TeacherEvaluationReportModalProps {
  record: any;
  onClose: () => void;
}

export default function TeacherEvaluationReportModal({ record, onClose }: TeacherEvaluationReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ 
    content: () => printRef.current 
  } as any);

  const handleExportPDF = () => {
    if (!printRef.current) return;
    const opt = {
      margin: 1,
      filename: `Danh_gia_${record.teacherName}_${new Date(record.evaluatedAt).getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  const handleExportExcel = () => {
    const data = [
      { MUC: 'Họ tên CBGVNV', NOI_DUNG: record.teacherName },
      { MUC: 'Công việc được giao', NOI_DUNG: record.taskContent },
      { MUC: '1. Kết quả công việc', NOI_DUNG: record.result },
      { MUC: '2. Nội quy cơ quan', NOI_DUNG: record.noiQuy },
      { MUC: '3. Quy chế chuyên môn', NOI_DUNG: record.chuyenMon },
      { MUC: '4. Văn hóa công sở', NOI_DUNG: record.vanHoa },
      { MUC: '5. Thông tin, báo cáo', NOI_DUNG: record.thongTin },
      { MUC: 'Nhận xét chung', NOI_DUNG: record.comment || '' },
      { MUC: 'Người đánh giá', NOI_DUNG: record.evaluatorName },
      { MUC: 'Ngày đánh giá', NOI_DUNG: safeFormatLocale(record.evaluatedAt, 'toLocaleDateString', 'Chưa cập nhật') }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao_cao_danh_gia");
    XLSX.writeFile(wb, `Bao_cao_danh_gia_${record.teacherName}_${new Date(record.evaluatedAt).getTime()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">BÁO CÁO TỔNG HỢP</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8" ref={printRef}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">THÔNG TIN ĐÁNH GIÁ CBGVNV</h1>
            <p className="text-slate-500 italic">Ngày {safeFormatLocale(record.evaluatedAt, 'toLocaleDateString', 'Chưa cập nhật')}</p>
          </div>

          <div className="space-y-6 text-slate-800 text-[15px]">
            <div>
              <span className="font-bold inline-block w-40">Họ tên CBGVNV:</span>
              <span className="font-semibold text-lg">{record.teacherName}</span>
            </div>
            <div>
              <span className="font-bold inline-block w-40 text-slate-600 align-top">Công việc đánh giá:</span>
              <span className="inline-block max-w-[400px]">{record.taskContent}</span>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <div className="font-bold">1. Công việc được giao:</div>
                <div className="pl-4 mt-1">{record.result || '-'}</div>
              </div>
              
              <div>
                <div className="font-bold">2. Nội quy cơ quan:</div>
                <div className="pl-4 mt-1">{record.noiQuy || '-'}</div>
              </div>

              <div>
                <div className="font-bold">3. Quy chế chuyên môn:</div>
                <div className="pl-4 mt-1">{record.chuyenMon || '-'}</div>
              </div>

              <div>
                <div className="font-bold">4. Văn hóa công sở:</div>
                <div className="pl-4 mt-1">{record.vanHoa || '-'}</div>
              </div>

              <div>
                <div className="font-bold">5. Thông tin, báo cáo:</div>
                <div className="pl-4 mt-1">{record.thongTin || '-'}</div>
              </div>

              <div className="pt-2">
                <div className="font-bold">Nhận xét chung:</div>
                <div className="pl-4 mt-1 whitespace-pre-wrap">{record.comment || '....................................................................'}</div>
              </div>
            </div>

            <div className="mt-12 pt-8 flex justify-between px-10">
              <div className="text-center">
                <p className="font-bold mb-20">Người được đánh giá</p>
                <p className="font-semibold">{record.teacherName}</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-20">Người đánh giá</p>
                <p className="font-semibold">{record.evaluatorName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={handlePrint} className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            <Printer size={16} /> In
          </button>
          <button onClick={handleExportPDF} className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            <Download size={16} /> Xuất PDF
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2 flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 shadow-sm">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>
    </div>
  );
}
