import React, { useRef } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { KpiVcForm } from '../../types/kpiVc';
import { useReactToPrint } from 'react-to-print';
import { exportSingleVcFormToExcel } from '../../utils/kpiVcExport';
import { exportVcFormToWord } from '../../utils/kpiWordExport';

interface KpiVcPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: KpiVcForm | null;
}

export default function KpiVcPrintModal({
  isOpen,
  onClose,
  form
}: KpiVcPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Phieu_KPI_GVNV_${form?.employeeName || 'BaoCao'}_${form?.academicYear || '2025-2026'}`
  });

  if (!isOpen || !form) return null;

  const groupI = form.groupScores?.group_I ?? 0;
  const groupII = form.groupScores?.group_II ?? 0;
  const groupIII = form.groupScores?.group_III ?? 0;

  const ttcmGroupI = form.ttcmGroupScores?.group_I ?? '---';
  const ttcmGroupII = form.ttcmGroupScores?.group_II ?? '---';
  const ttcmGroupIII = form.ttcmGroupScores?.group_III ?? '---';

  const mgrGroupI = form.managerGroupScores?.group_I ?? '---';
  const mgrGroupII = form.managerGroupScores?.group_II ?? '---';
  const mgrGroupIII = form.managerGroupScores?.group_III ?? '---';

  // Render items grouped by group I, II, III
  const items = form.items || [];
  const groupIItems = items.filter(it => it.groupId === 'group_I');
  const groupIIItems = items.filter(it => it.groupId === 'group_II');
  const groupIIIItems = items.filter(it => it.groupId === 'group_III');

  const groupIIIaItems = groupIIIItems.filter(it => it.subGroup === 'A' || it.criterionCode.startsWith('III.A') || it.criterionCode === 'III.1');
  const groupIIIbItems = groupIIIItems.filter(it => it.subGroup === 'B' || it.criterionCode.startsWith('GV') || it.criterionCode.startsWith('III.B') || it.criterionCode === 'III.2');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden border border-slate-300">
        
        {/* HEADER MODAL - KHÔNG ĐƯỢC IN */}
        <div className="no-print bg-slate-800 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-400" />
            <span className="font-bold text-sm">Xem trước bản in A4: {form.employeeName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportSingleVcFormToExcel(form)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Download size={14} /> Xuất Excel
            </button>

            <button
              type="button"
              onClick={() => exportVcFormToWord(form)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <FileText size={14} /> Xuất Word (.doc)
            </button>

            <button
              type="button"
              onClick={() => handlePrint()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Printer size={15} /> In ngay (A4)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PHẦN NỘI DUNG VĂN BẢN ĐƯỢC IN RA KHỔ GIẤY A4 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 custom-scrollbar">
          
          <div 
            ref={printRef}
            className="print-container bg-white border border-slate-300 rounded-lg p-8 sm:p-12 shadow-sm max-w-3xl mx-auto text-black font-serif leading-normal"
            style={{ minHeight: '297mm', color: '#000000', backgroundColor: '#ffffff' }}
          >
            
            {/* 1. QUỐC HUY / CƠ QUAN */}
            <div className="flex justify-between items-start text-center mb-5">
              <div className="w-5/12 text-center">
                <p className="text-[12px] uppercase font-bold">SỞ GD&ĐT PHÚ THỌ</p>
                <p className="text-[13px] uppercase font-bold">TRƯỜNG THPT MINH HÒA</p>
                <div className="w-24 h-[1px] bg-black mx-auto mt-1" />
              </div>

              <div className="w-6/12 text-center">
                <p className="text-[12px] uppercase font-bold tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[12px] font-bold underline">Độc lập – Tự do – Hạnh phúc</p>
              </div>
            </div>

            {/* 2. TIÊU ĐỀ */}
            <div className="text-center my-5 space-y-0.5">
              <h1 className="text-[15px] font-bold uppercase tracking-wide">
                PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI GIÁO VIÊN NĂM HỌC {form.academicYear || '2026–2027'}
              </h1>
              <p className="text-[12px] italic font-medium">
                (Dự thảo vận hành – đề nghị nhà trường xác nhận trước khi ban hành)
              </p>
            </div>

            {/* 3. THÔNG TIN */}
            <div className="space-y-1 text-[12px] mb-3">
              <p>
                <span className="font-semibold">Họ và tên:</span> {form.employeeName}
              </p>
              <p>
                <span className="font-semibold">Chức vụ / môn:</span> {form.position} {form.subject ? `• Môn ${form.subject}` : ''}
              </p>
              <p>
                <span className="font-semibold">Tổ chuyên môn:</span> {form.department}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-300">
                <p>
                  <span className="font-semibold">Tổ trưởng chuyên môn đánh giá:</span> {form.ttcmEvaluatorName || '....................'}
                  <span className="ml-1 text-slate-600 font-normal">({form.ttcmEvaluatorDepartment || form.department})</span>
                </p>
                <p>
                  <span className="font-semibold">Ban Giám hiệu đánh giá:</span> {form.bghEvaluatorName || form.evaluatorName || '....................'}
                  <span className="ml-1 text-slate-600 font-normal">({form.bghEvaluatorRole || form.evaluatorRole || 'Ban Giám hiệu'})</span>
                </p>
              </div>
            </div>

            {/* CĂN CỨ MẪU PHIẾU */}
            <div className="text-[11px] leading-relaxed text-justify mb-4 italic">
              Căn cứ mẫu Phiếu đánh giá, chấm điểm năm học 2025–2026 của Trường THPT Minh Hòa, phiếu này giữ cấu trúc 100 điểm gồm: (I) Chính trị tư tưởng, đạo đức lối sống 15 điểm; (II) Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật 15 điểm; (III) Kết quả thực hiện nhiệm vụ 70 điểm. Các nhiệm vụ ở phần III được chi tiết hóa để thuận lợi cho tự đánh giá, đánh giá của tổ chuyên môn và BGH. Các mức điểm KPI chi tiết dưới đây là đề xuất quản trị nội bộ, cần được nhà trường xác nhận trước khi áp dụng chính thức.
            </div>

            {/* 4. PHẦN A. NỘI DUNG CHẤM ĐIỂM */}
            <div className="mb-2">
              <p className="font-bold text-[12px] uppercase">
                A. NỘI DUNG CHẤM ĐIỂM
              </p>
            </div>

            {/* 5. BẢNG CHẤM ĐIỂM */}
            <table className="w-full border-collapse border border-black text-[11px] mb-4">
              <thead>
                <tr className="text-center font-bold border-b border-black bg-slate-100">
                  <th className="border border-black p-1.5 w-8">STT</th>
                  <th className="border border-black p-1.5 text-left">Nội dung đánh giá / nhiệm vụ chi tiết</th>
                  <th className="border border-black p-1.5 w-12">Điểm tối đa</th>
                  <th className="border border-black p-1.5 w-16">Cá nhân tự chấm</th>
                  <th className="border border-black p-1.5 w-16">TTCM đánh giá</th>
                  <th className="border border-black p-1.5 w-16">CBQL đánh giá</th>
                  <th className="border border-black p-1.5 w-24">Minh chứng / ghi chú</th>
                </tr>
              </thead>

              <tbody>
                {/* NHÓM I */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-black p-1 text-center font-bold">I</td>
                  <td className="border border-black p-1 font-bold uppercase">CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG</td>
                  <td className="border border-black p-1 text-center font-bold">15</td>
                  <td className="border border-black p-1 text-center font-bold">{groupI}</td>
                  <td className="border border-black p-1 text-center font-bold">{ttcmGroupI}</td>
                  <td className="border border-black p-1 text-center font-bold">{mgrGroupI}</td>
                  <td className="border border-black p-1"></td>
                </tr>
                {groupIItems.map((item, idx) => (
                  <tr key={item.criterionId || `i_${idx}`}>
                    <td className="border border-black p-1 text-center align-top">{idx + 1}</td>
                    <td className="border border-black p-1 align-top">{item.content}</td>
                    <td className="border border-black p-1 text-center align-top">{item.maxScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.selfScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.ttcmScore ?? ''}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.managerScore ?? ''}</td>
                    <td className="border border-black p-1 text-[10px] italic">{item.note || ''}</td>
                  </tr>
                ))}

                {/* NHÓM II */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-black p-1 text-center font-bold">II</td>
                  <td className="border border-black p-1 font-bold uppercase">TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT</td>
                  <td className="border border-black p-1 text-center font-bold">15</td>
                  <td className="border border-black p-1 text-center font-bold">{groupII}</td>
                  <td className="border border-black p-1 text-center font-bold">{ttcmGroupII}</td>
                  <td className="border border-black p-1 text-center font-bold">{mgrGroupII}</td>
                  <td className="border border-black p-1"></td>
                </tr>
                {groupIIItems.map((item, idx) => (
                  <tr key={item.criterionId || `ii_${idx}`}>
                    <td className="border border-black p-1 text-center align-top">{idx + 1}</td>
                    <td className="border border-black p-1 align-top">{item.content}</td>
                    <td className="border border-black p-1 text-center align-top">{item.maxScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.selfScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.ttcmScore ?? ''}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.managerScore ?? ''}</td>
                    <td className="border border-black p-1 text-[10px] italic">{item.note || ''}</td>
                  </tr>
                ))}

                {/* NHÓM III */}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-black p-1 text-center font-bold">III</td>
                  <td className="border border-black p-1 font-bold uppercase">KẾT QUẢ THỰC HIỆN NHIỆM VỤ</td>
                  <td className="border border-black p-1 text-center font-bold">70</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIII}</td>
                  <td className="border border-black p-1 text-center font-bold">{ttcmGroupIII}</td>
                  <td className="border border-black p-1 text-center font-bold">{mgrGroupIII}</td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* III.1 */}
                <tr className="font-bold bg-slate-100/70">
                  <td className="border border-black p-1 text-center">1</td>
                  <td className="border border-black p-1 font-bold uppercase">I. Năng lực và kỹ năng làm việc (10 điểm)</td>
                  <td className="border border-black p-1 text-center font-bold">10</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIaItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIaItems.some(i => i.ttcmScore != null) ? groupIIIaItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0) : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIaItems.some(i => i.managerScore != null) ? groupIIIaItems.reduce((acc, i) => acc + (i.managerScore || 0), 0) : ''}</td>
                  <td className="border border-black p-1"></td>
                </tr>
                {groupIIIaItems.map((item, idx) => (
                  <tr key={item.criterionId || `iii_a_${idx}`}>
                    <td className="border border-black p-1 text-center align-top">{idx + 1}</td>
                    <td className="border border-black p-1 align-top">{item.content}</td>
                    <td className="border border-black p-1 text-center align-top">{item.maxScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.selfScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.ttcmScore ?? ''}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.managerScore ?? ''}</td>
                    <td className="border border-black p-1 text-[10px] italic">{item.note || ''}</td>
                  </tr>
                ))}

                {/* III.2 */}
                <tr className="font-bold bg-slate-100/70">
                  <td className="border border-black p-1 text-center">2</td>
                  <td className="border border-black p-1 font-bold uppercase">II. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (60 ĐIỂM)</td>
                  <td className="border border-black p-1 text-center font-bold">60</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.some(i => i.ttcmScore != null) ? groupIIIbItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0) : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.some(i => i.managerScore != null) ? groupIIIbItems.reduce((acc, i) => acc + (i.managerScore || 0), 0) : ''}</td>
                  <td className="border border-black p-1"></td>
                </tr>
                {groupIIIbItems.map((item, idx) => (
                  <tr key={item.criterionId || `iii_b_${idx}`}>
                    <td className="border border-black p-1 text-center align-top">{idx + 1}</td>
                    <td className="border border-black p-1 align-top">{item.content}</td>
                    <td className="border border-black p-1 text-center align-top">{item.maxScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.selfScore}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.ttcmScore ?? ''}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">{item.managerScore ?? ''}</td>
                    <td className="border border-black p-1 text-[10px] italic">{item.note || ''}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-100/90 text-[10.5px]">
                  <td className="border border-black p-1 text-center font-bold"></td>
                  <td className="border border-black p-1 font-bold uppercase">
                    Tổng mục II: {groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}/60 điểm
                  </td>
                  <td className="border border-black p-1 text-center font-bold">60</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}/60</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.some(i => i.ttcmScore != null) ? `${groupIIIbItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0)}/60` : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{groupIIIbItems.some(i => i.managerScore != null) ? `${groupIIIbItems.reduce((acc, i) => acc + (i.managerScore || 0), 0)}/60` : ''}</td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* TỔNG ĐIỂM */}
                <tr className="font-bold text-[11px] bg-slate-200">
                  <td className="border border-black p-1.5 text-center uppercase font-black" colSpan={2}>
                    TỔNG CỘNG ĐIỂM (I + II + III)
                  </td>
                  <td className="border border-black p-1.5 text-center font-black">100</td>
                  <td className="border border-black p-1.5 text-center font-black">{form.totalScore}</td>
                  <td className="border border-black p-1.5 text-center font-black">{form.ttcmTotalScore ?? '---'}</td>
                  <td className="border border-black p-1.5 text-center font-black">{form.managerTotalScore ?? '---'}</td>
                  <td className="border border-black p-1.5"></td>
                </tr>
              </tbody>
            </table>

            {/* QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT */}
            <div className="space-y-1 text-[11px] mb-4">
              <p className="font-bold uppercase">QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT</p>
              <ol className="list-decimal list-inside space-y-0.5 leading-relaxed text-[10.5px]">
                <li>Giáo viên tự chấm dựa trên kết quả thực hiện thực tế và minh chứng; không tự chấm chỉ dựa vào cảm nhận.</li>
                <li>Mỗi nhiệm vụ được chấm trong phạm vi điểm tối đa của dòng đó; không cộng vượt 100 điểm.</li>
                <li>Nhiệm vụ không được giao hoặc không phát sinh theo vị trí việc làm được đánh dấu “N/A – Không áp dụng”, không quy về 0 điểm; tổng điểm được chuẩn hóa theo các nhiệm vụ áp dụng.</li>
                <li>Kết quả học tập của học sinh chỉ là một nguồn minh chứng cho chất lượng và sự tiến bộ, không sử dụng điểm thi/điểm trung bình của học sinh làm tiêu chí duy nhất để quy trách nhiệm cho giáo viên.</li>
                <li>Nhiệm vụ chủ nhiệm/kiêm nhiệm chỉ áp dụng đối với giáo viên được phân công.</li>
                <li>Khi có vi phạm nghiêm trọng, việc xử lý điểm phải căn cứ quy định của nhà trường và quy định hiện hành; không tự động suy diễn từ một chỉ số đơn lẻ.</li>
              </ol>
            </div>

            {/* GỢI Ý XẾP LOẠI KPI NỘI BỘ */}
            <div className="space-y-1.5 text-[11px] mb-4">
              <p className="font-bold uppercase">Gợi ý xếp loại KPI nội bộ (CẦN NHÀ TRƯỜNG XÁC NHẬN)</p>
              <table className="border-collapse border border-black text-[10.5px] w-full max-w-md">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1 text-left w-1/2">Tổng điểm KPI</th>
                    <th className="border border-black p-1 text-left">Mức xếp loại đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1">Dưới 70</td>
                    <td className="border border-black p-1">Chưa hoàn thành</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1">70 đến dưới 85</td>
                    <td className="border border-black p-1">Hoàn thành</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1">85 đến dưới 95</td>
                    <td className="border border-black p-1">Hoàn thành tốt</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 font-bold">95 đến 100</td>
                    <td className="border border-black p-1 font-bold">Hoàn thành xuất sắc</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CÁ NHÂN TỰ XẾP LOẠI & NGÀY THÁNG */}
            <div className="space-y-2 text-[11px] mb-6">
              <p><span className="font-bold">Cá nhân tự xếp loại:</span> {form.selfClassification || '....................................................'}</p>
              <p className="text-right italic">............, ngày ...... tháng ...... năm 2026</p>
            </div>

            {/* 3 KHỐI CHỮ KÝ THEO ĐÚNG TRANG 2 CỦA PDF */}
            <div className="grid grid-cols-3 text-center text-[11px] pt-2">
              <div>
                <p className="font-bold uppercase">NGƯỜI TỰ ĐÁNH GIÁ</p>
                <p className="text-[10px] italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-16 flex items-end justify-center font-bold">
                  {form.employeeName}
                </div>
              </div>

              <div>
                <p className="font-bold uppercase">TỔ TRƯỞNG CHUYÊN MÔN</p>
                <p className="text-[10px] italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-16 flex items-end justify-center font-bold">
                  {form.ttcmEvaluatorName || '....................'}
                </div>
              </div>

              <div>
                <p className="font-bold uppercase">BAN GIÁM HIỆU PHÊ DUYỆT</p>
                <p className="font-bold uppercase">DUYỆT</p>
                <p className="text-[10px] italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-14 flex items-end justify-center font-bold">
                  {form.bghEvaluatorName || form.evaluatorName || '....................'}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
