import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { KpiCbqlForm } from '../../types/kpiCbql';
import { exportSingleCbqlFormToExcel } from '../../utils/kpiCbqlExport';
import { exportCbqlFormToWord } from '../../utils/kpiWordExport';

interface KpiCbqlPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: KpiCbqlForm;
}

export default function KpiCbqlPrintModal({
  isOpen,
  onClose,
  form
}: KpiCbqlPrintModalProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !form) return null;

  const handlePrint = () => {
    window.print();
  };

  const groupIItems = form.items.filter(i => i.groupCode === 'I' || i.groupId === 'group_I');
  const groupIIItems = form.items.filter(i => i.groupCode === 'II' || i.groupId === 'group_II');
  const groupIIIItems = form.items.filter(i => i.groupCode === 'III' || i.groupId === 'group_III');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Modal Action Header (hidden during print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-400" />
            <span className="font-bold text-sm">Xem Trước Bản In Phiếu Đánh Giá KPI CBQL (Khổ A4)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} />
              <span>In Ngay / Lưu PDF</span>
            </button>
            <button
              onClick={() => exportSingleCbqlFormToExcel(form)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={15} />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={() => exportCbqlFormToWord(form)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={15} />
              <span>Xuất Word (.doc)</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:p-0">
          <div 
            ref={printContentRef}
            id="kpi-cbql-printable-sheet"
            className="max-w-[850px] mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none border border-slate-200 print:border-none text-slate-900 font-serif leading-normal"
            style={{ minHeight: '1100px' }}
          >
            {/* Header Quốc hiệu & Đơn vị */}
            <div className="flex justify-between items-start text-center mb-6">
              <div className="w-5/12 text-center">
                <p className="text-xs uppercase font-semibold">SỞ GD&ĐT TỈNH PHÚ THỌ</p>
                <p className="text-xs sm:text-sm uppercase font-bold text-slate-900">TRƯỜNG THPT MINH HÒA</p>
                <div className="w-24 h-[1px] bg-slate-800 mx-auto mt-1" />
              </div>

              <div className="w-6/12 text-center">
                <p className="text-xs uppercase font-bold tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-xs font-bold underline">Độc lập – Tự do – Hạnh phúc</p>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center my-6">
              <h1 className="text-base sm:text-lg font-extrabold uppercase text-slate-900 leading-tight">
                PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM NĂM HỌC {form.academicYear || '2023 - 2024'}
              </h1>
              <p className="text-xs sm:text-sm font-semibold italic text-slate-800 mt-1">
                (Áp dụng đối với viên chức giữ chức vụ lãnh đạo, quản lý)
              </p>
            </div>

            {/* Thông tin cán bộ */}
            <div className="text-xs sm:text-[13px] space-y-1.5 mb-6 py-2">
              <p><strong>Họ và tên:</strong> {form.evaluateeName}</p>
              <p><strong>Chức vụ:</strong> {form.evaluateePosition}</p>
              <p><strong>Đơn vị công tác:</strong> {form.evaluateeDepartmentName || 'Trường THPT Minh Hòa'}</p>
            </div>

            <div className="font-bold text-xs sm:text-sm uppercase mb-2">
              A. NỘI DUNG CHẤM ĐIỂM
            </div>

            {/* BẢNG ĐIỂM CHI TIẾT 100 ĐIỂM */}
            <table className="w-full text-left text-[11px] sm:text-xs border-collapse border border-slate-600 mb-6">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th rowSpan={2} className="border border-slate-600 p-2 w-8">Stt</th>
                  <th rowSpan={2} className="border border-slate-600 p-2">Nội dung đánh giá</th>
                  <th rowSpan={2} className="border border-slate-600 p-2 w-16">Điểm tối đa</th>
                  <th colSpan={2} className="border border-slate-600 p-1.5">Đánh giá, chấm điểm</th>
                </tr>
                <tr className="bg-slate-100 text-center font-bold text-[10px] sm:text-[11px]">
                  <th className="border border-slate-600 p-1.5 w-20">Điểm cá nhân tự chấm</th>
                  <th className="border border-slate-600 p-1.5 w-20">Thủ trưởng đơn vị chấm điểm</th>
                </tr>
              </thead>
              <tbody>
                {/* PHẦN I */}
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-600 p-1.5 text-center">I</td>
                  <td className="border border-slate-600 p-1.5">Chính trị tư tưởng, đạo đức lối sống</td>
                  <td className="border border-slate-600 p-1.5 text-center">15</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.selfGroupScores?.group_I || 0}</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.evaluatorGroupScores?.group_I || 0}</td>
                </tr>
                {groupIItems.map((it) => (
                  <tr key={it.criterionId}>
                    <td className="border border-slate-600 p-1.5 text-center">{it.criterionCode}</td>
                    <td className="border border-slate-600 p-1.5">{it.criterionName}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.maxScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.selfScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.evaluatorScore}</td>
                  </tr>
                ))}

                {/* PHẦN II */}
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-600 p-1.5 text-center">II</td>
                  <td className="border border-slate-600 p-1.5">Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật</td>
                  <td className="border border-slate-600 p-1.5 text-center">15</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.selfGroupScores?.group_II || 0}</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.evaluatorGroupScores?.group_II || 0}</td>
                </tr>
                {groupIIItems.map((it) => (
                  <tr key={it.criterionId}>
                    <td className="border border-slate-600 p-1.5 text-center">{it.criterionCode}</td>
                    <td className="border border-slate-600 p-1.5">{it.criterionName}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.maxScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.selfScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.evaluatorScore}</td>
                  </tr>
                ))}

                {/* PHẦN III */}
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-600 p-1.5 text-center">III</td>
                  <td className="border border-slate-600 p-1.5 uppercase">KẾT QUẢ THỰC HIỆN NHIỆM VỤ</td>
                  <td className="border border-slate-600 p-1.5 text-center">70</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.selfGroupScores?.group_III || 0}</td>
                  <td className="border border-slate-600 p-1.5 text-center font-bold">{form.evaluatorGroupScores?.group_III || 0}</td>
                </tr>

                {/* 1. Năng lực và kỹ năng làm việc */}
                <tr className="bg-slate-50/70 font-semibold italic">
                  <td className="border border-slate-600 p-1.5 text-center">1</td>
                  <td className="border border-slate-600 p-1.5">Năng lực và kỹ năng làm việc</td>
                  <td className="border border-slate-600 p-1.5 text-center">10</td>
                  <td className="border border-slate-600 p-1.5 text-center"></td>
                  <td className="border border-slate-600 p-1.5 text-center"></td>
                </tr>
                {groupIIIItems.filter(it => it.criterionCode.startsWith('1.')).map((it) => (
                  <tr key={it.criterionId}>
                    <td className="border border-slate-600 p-1.5 text-center">{it.criterionCode}</td>
                    <td className="border border-slate-600 p-1.5">{it.criterionName}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.maxScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.selfScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.evaluatorScore}</td>
                  </tr>
                ))}

                {/* 2. Kết quả thực hiện nhiệm vụ được giao */}
                <tr className="bg-slate-50/70 font-semibold italic">
                  <td className="border border-slate-600 p-1.5 text-center">2</td>
                  <td className="border border-slate-600 p-1.5">Kết quả thực hiện nhiệm vụ được giao</td>
                  <td className="border border-slate-600 p-1.5 text-center">60</td>
                  <td className="border border-slate-600 p-1.5 text-center"></td>
                  <td className="border border-slate-600 p-1.5 text-center"></td>
                </tr>
                {groupIIIItems.filter(it => it.criterionCode.startsWith('2.')).map((it) => (
                  <tr key={it.criterionId}>
                    <td className="border border-slate-600 p-1.5 text-center">{it.criterionCode}</td>
                    <td className="border border-slate-600 p-1.5">
                      <div className="font-normal">{it.criterionName}</div>
                      {it.selfLevelLabel && (
                        <div className="text-[10px] text-slate-600 italic mt-0.5">
                          • Mức tự chấm: {it.selfLevelLabel}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-600 p-1.5 text-center">{it.maxScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center font-semibold">{it.selfScore}</td>
                    <td className="border border-slate-600 p-1.5 text-center font-semibold">{it.evaluatorScore}</td>
                  </tr>
                ))}

                {/* TỔNG ĐIỂM */}
                <tr className="font-extrabold bg-slate-100">
                  <td colSpan={2} className="border border-slate-600 p-2 text-center uppercase">
                    TỔNG ĐIỂM
                  </td>
                  <td className="border border-slate-600 p-2 text-center">100</td>
                  <td className="border border-slate-600 p-2 text-center font-extrabold text-sm">{form.selfTotalScore}</td>
                  <td className="border border-slate-600 p-2 text-center font-extrabold text-sm">{form.evaluatorTotalScore}</td>
                </tr>
              </tbody>
            </table>

            {/* Phần đánh giá của cá nhân */}
            <div className="text-xs sm:text-[13px] mb-6 space-y-2">
              <p><strong>Cá nhân tự xếp loại:</strong> <span className="font-bold underline">{form.grade || '...................................................'}</span></p>
              
              <div className="flex justify-end pt-2 text-center">
                <div className="w-1/2">
                  <p className="italic text-slate-600">Minh Hòa, ngày ..... tháng ..... năm 202...</p>
                  <p className="font-bold uppercase mt-1">Người tự đánh giá</p>
                  <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900">{form.evaluateeName}</p>
                </div>
              </div>
            </div>

            {/* B. Ý KIẾN NHẬN XÉT, ĐÁNH GIÁ (Dành cho người đứng đầu đơn vị) */}
            <div className="border-t-2 border-slate-400 pt-4 mt-6 text-xs sm:text-[13px] space-y-3">
              <h2 className="font-bold text-xs sm:text-sm uppercase text-slate-900">
                B. Ý KIẾN NHẬN XÉT, ĐÁNH GIÁ (Phần dành cho người đứng đầu đơn vị)
              </h2>

              <div className="space-y-2">
                <p><strong>1. Ý kiến nhận xét, đánh giá:</strong></p>
                <div className="min-h-[60px] p-2 border border-slate-300 rounded italic text-slate-800 whitespace-pre-wrap">
                  {form.evaluatorComment || '..........................................................................................................................................................................................................................................................................................................................................'}
                </div>

                <p><strong>2. Mức xếp loại:</strong> <span className="font-bold underline">{form.grade || '...................................................'}</span></p>
              </div>

              <div className="flex justify-end pt-4 text-center">
                <div className="w-1/2">
                  <p className="italic text-slate-600">Minh Hòa, ngày ..... tháng ..... năm 202...</p>
                  <p className="font-bold uppercase mt-1">NGƯỜI NHẬN XÉT, ĐÁNH GIÁ</p>
                  <p className="italic text-[11px] text-slate-500">(Ký, ghi rõ họ tên; đóng dấu)</p>
                  <div className="h-20" />
                  <p className="font-bold text-slate-900">{form.evaluatorName}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
