import React, { useRef } from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { DepartmentWeeklySchedule } from '../../types/departmentSchedule';
import { exportDepartmentScheduleToWord } from '../../utils/departmentScheduleExportWord';

interface DepartmentSchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DepartmentWeeklySchedule;
}

export default function DepartmentSchedulePrintModal({
  isOpen,
  onClose,
  schedule
}: DepartmentSchedulePrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = async () => {
    try {
      await exportDepartmentScheduleToWord(schedule);
    } catch (e) {
      console.error('Lỗi xuất Word:', e);
    }
  };

  const startDateObj = schedule.startDate ? new Date(schedule.startDate) : null;
  const endDateObj = schedule.endDate ? new Date(schedule.endDate) : null;

  const startDay = startDateObj ? String(startDateObj.getDate()).padStart(2, '0') : '.....';
  const startMonth = startDateObj ? String(startDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const endDay = endDateObj ? String(endDateObj.getDate()).padStart(2, '0') : '.....';
  const endMonth = endDateObj ? String(endDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const yearStr = schedule.year ? String(schedule.year) : '2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm print:p-0 print:bg-white animate-in fade-in duration-150">
      
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Topbar (Hidden when printing) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">
                In & Xem trước Lịch giao việc Tổ chuyên môn
              </h3>
              <p className="text-xs text-slate-500">
                Đúng định dạng chuẩn hành chính biểu mẫu THPT Minh Hòa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
            >
              <Download size={14} />
              Xuất file Word (.docx)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Printer size={14} />
              In lịch
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/50 print:p-0 print:bg-white">
          <div 
            ref={printAreaRef}
            className="bg-white shadow-md border border-slate-200 rounded-xl p-8 sm:p-12 mx-auto max-w-[850px] print:shadow-none print:border-none print:p-0 text-black font-['Times_New_Roman',serif]"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="text-left space-y-1">
                <div className="text-[13pt] font-bold uppercase tracking-tight">
                  {schedule.schoolName || 'TRƯỜNG THPT MINH HÒA'}
                </div>
                <div className="text-[13pt] font-bold uppercase">
                  TỔ: {schedule.departmentName ? schedule.departmentName.toUpperCase() : '……………………………………………..'}
                </div>
              </div>

              <div className="text-center space-y-1 pr-6">
                <div className="text-[14pt] font-bold uppercase tracking-wide">
                  TUẦN: {schedule.weekNumber || '……………'}
                </div>
                <div className="text-[11pt] italic text-slate-700">
                  (Từ ngày {startDay} tháng {startMonth} đến ngày {endDay} tháng {endMonth} năm {yearStr})
                </div>
              </div>
            </div>

            {/* Main Schedule Table */}
            <table className="w-full border-collapse border border-black text-[10.5pt] leading-snug">
              <thead>
                <tr className="bg-slate-50 print:bg-transparent">
                  <th 
                    rowSpan={2} 
                    className="border border-black p-2.5 text-center font-bold align-middle w-[15%]"
                  >
                    Thứ, ngày
                  </th>
                  <th 
                    className="border border-black p-2 text-center font-bold w-[34%]"
                  >
                    Sáng
                  </th>
                  <th 
                    className="border border-black p-2 text-center font-bold w-[33%]"
                  >
                    Chiều
                  </th>
                  <th 
                    rowSpan={2} 
                    className="border border-black p-2.5 text-center font-bold align-middle w-[11%]"
                  >
                    Lãnh đạo trực/đánh giá
                  </th>
                  <th 
                    rowSpan={2} 
                    className="border border-black p-2.5 text-center font-bold align-middle w-[7%]"
                  >
                    Ghi chú
                  </th>
                </tr>
                <tr className="bg-slate-50 print:bg-transparent italic text-[9.5pt]">
                  <th className="border border-black p-1 text-center font-normal">
                    Nội dung công việc
                  </th>
                  <th className="border border-black p-1 text-center font-normal">
                    Nội dung công việc
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedule.days?.map((day, idx) => (
                  <tr key={day.id || idx} className="min-h-[48px]">
                    {/* Day / Date */}
                    <td className="border border-black p-2 text-center align-middle font-bold">
                      <div>{day.dayOfWeek}</div>
                      {day.date && (
                        <div className="font-normal text-[9.5pt] italic text-slate-700">
                          ({day.date.split('-').reverse().slice(0, 2).join('/')})
                        </div>
                      )}
                    </td>

                    {/* Sáng */}
                    <td className="border border-black p-2 align-top whitespace-pre-line leading-relaxed">
                      {day.morningTasks || ''}
                    </td>

                    {/* Chiều */}
                    <td className="border border-black p-2 align-top whitespace-pre-line leading-relaxed">
                      {day.afternoonTasks || ''}
                    </td>

                    {/* Lãnh đạo trực/đánh giá */}
                    <td className="border border-black p-2 align-middle text-center whitespace-pre-line text-[9.5pt]">
                      {day.dutyLeaderOrEvaluation || ''}
                    </td>

                    {/* Ghi chú */}
                    <td className="border border-black p-2 align-middle text-center whitespace-pre-line text-[9pt]">
                      {day.notes || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Approval / Status notice if approved */}
            {schedule.status === 'approved' && schedule.approvedBy && (
              <div className="mt-4 p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-emerald-800 text-[9.5pt] flex items-center justify-between print:hidden">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Đã duyệt bởi: {schedule.approvedBy}
                </span>
                <span className="italic text-slate-500">
                  {schedule.approvalDate ? new Date(schedule.approvalDate).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-8 pt-4">
              <div className="text-right italic text-[10.5pt] mb-4">
                Minh Hòa, ngày ..... tháng ..... năm {yearStr}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-bold uppercase text-[10.5pt]">NGƯỜI LẬP BIỂU</div>
                  <div className="italic text-[9pt] text-slate-500 mb-16">(Ký, ghi rõ họ tên)</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-[10.5pt]">TỔ TRƯỞNG CHUYÊN MÔN</div>
                  <div className="italic text-[9pt] text-slate-500 mb-16">(Ký, ghi rõ họ tên)</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-[10.5pt]">BAN GIÁM HIỆU DUYỆT</div>
                  <div className="italic text-[9pt] text-slate-500 mb-16">(Ký và đóng dấu)</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
