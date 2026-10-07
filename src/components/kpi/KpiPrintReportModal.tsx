import React, { useRef } from 'react';
import { X, Printer, FileDown, Award, School } from 'lucide-react';
import { KpiRecord, Teacher, Department, KpiEvaluationForm } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { resolveKpiGroupName } from '../../lib/kpiGroupUtils';

interface KpiPrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  form?: KpiEvaluationForm | null;
  teacher?: Teacher | null;
  month: string;
  academicYear: string;
  basePoints?: number;
  plusPoints?: number;
  minusPoints?: number;
  totalMonthlyKpi?: number;
  records?: KpiRecord[];
  allTeachersData?: Array<{
    stt: number;
    teacher: Teacher;
    basePoints: number;
    plusPoints: number;
    minusPoints: number;
    totalMonthlyKpi: number;
    rank: number;
  }>;
  mode: 'individual' | 'school' | 'form'; // In theo 1 cá nhân, In bảng toàn trường, hoặc In Phiếu KPI form
}

export default function KpiPrintReportModal({
  isOpen,
  onClose,
  form,
  teacher,
  month,
  academicYear,
  basePoints = 100,
  plusPoints = 0,
  minusPoints = 0,
  totalMonthlyKpi = 100,
  records = [],
  allTeachersData,
  mode
}: KpiPrintReportModalProps) {
  const { kpiGroups, kpis } = useAppContext();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!printRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Báo cáo KPI Tháng</title><meta charset='utf-8'>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.3; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
      th, td { border: 1px solid black; padding: 6px 8px; text-align: left; }
      th { background-color: #f2f2f2; text-align: center; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .header-table { border: none; width: 100%; }
      .header-table td { border: none; padding: 0; }
    </style>
    </head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + printRef.current.innerHTML + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = mode === 'form' && form
      ? `Phieu_KPI_${form.targetGroup}_Thang_${form.month}_${form.teacherName.replace(/\s+/g, '_')}.doc`
      : (mode === 'individual'
        ? `KPI_Thang_${month}_${teacher?.name.replace(/\s+/g, '_') || 'CBGVNV'}.doc`
        : `Bang_Tong_Hop_KPI_Thang_${month}_NamHoc_${academicYear}.doc`);
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:m-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Header - Hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base">
                {mode === 'form' 
                  ? 'In Phiếu Đánh Giá KPI CBGVNV' 
                  : (mode === 'individual' ? 'In Phiếu Đánh giá KPI Tháng của Giáo viên' : 'In Bảng Tổng hợp KPI Toàn trường theo Tháng')}
              </h3>
              <p className="text-xs text-slate-400">Trường THPT Minh Hòa • Tháng {form?.month || month} - Năm học {form?.academicYear || academicYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              Xuất Word (.doc)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              In ngay
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:p-8 bg-white font-serif text-slate-900" ref={printRef}>
          
          {/* Official Letterhead */}
          <div className="grid grid-cols-2 text-center text-xs pb-4 border-b border-slate-300">
            <div>
              <p className="uppercase font-medium">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
              <p className="font-bold uppercase text-sm">TRƯỜNG THPT MINH HÒA</p>
              <div className="w-24 h-0.5 bg-slate-800 mx-auto my-1"></div>
            </div>
            <div>
              <p className="font-bold uppercase text-xs">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-semibold text-xs">Độc lập - Tự do - Hạnh phúc</p>
              <div className="w-32 h-0.5 bg-slate-800 mx-auto my-1"></div>
              <p className="italic text-[11px] text-slate-600 mt-1">Minh Hòa, ngày ... tháng {form?.month || month} năm 202...</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-6">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {mode === 'form' 
                ? 'PHIẾU ĐÁNH GIÁ VÀ XẾP LOẠI KPI HÀNG THÁNG' 
                : (mode === 'individual' ? 'BẢNG THEO DÕI VÀ ĐÁNH GIÁ KPI THÁNG' : 'BẢNG TỔNG HỢP ĐÁNH GIÁ KPI TOÀN TRƯỜNG THEO THÁNG')}
            </h2>
            <p className="text-sm font-semibold italic text-slate-700 mt-1">
              Tháng {form?.month || month} • Năm học {form?.academicYear || academicYear}
            </p>
          </div>

          {/* Form Mode (KpiEvaluationForm) */}
          {mode === 'form' && form && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <p><strong>Họ và tên CBGVNV:</strong> {form.teacherName}</p>
                  <p className="mt-1"><strong>Mã số giáo viên:</strong> {form.teacherCode || form.teacherId}</p>
                  <p className="mt-1"><strong>Đối tượng KPI:</strong> <span className="font-bold">{form.targetGroup}</span></p>
                </div>
                <div>
                  <p><strong>Tổ / Bộ phận:</strong> {form.departmentName || 'Trường THPT Minh Hòa'}</p>
                  <p className="mt-1"><strong>Chức vụ / Vị trí:</strong> {form.position || 'Giáo viên'}</p>
                  <p className="mt-1"><strong>Người đánh giá:</strong> <span className="font-bold text-blue-900">{form.evaluatorName || 'Ban Giám Hiệu'}</span> ({form.evaluatorPosition || 'Người đánh giá'})</p>
                </div>
              </div>

              {/* 4 Metrics Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs my-4">
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
                  <div className="text-slate-500 text-[11px]">TỔNG ĐIỂM TIÊU CHÍ</div>
                  <div className="text-base font-bold text-blue-800">{form.totalStandardScore}</div>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded">
                  <div className="text-rose-600 text-[11px]">TỔNG ĐIỂM TRỪ</div>
                  <div className="text-base font-bold text-rose-700">-{form.totalMinusScore}</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="text-emerald-600 text-[11px]">TỔNG ĐIỂM CỘNG</div>
                  <div className="text-base font-bold text-emerald-700">+{form.totalPlusScore}</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-300 rounded">
                  <div className="text-blue-700 text-[11px]">TỔNG ĐIỂM KPI</div>
                  <div className="text-lg font-extrabold text-blue-900">{form.totalKpiScore}</div>
                </div>
              </div>

              {/* Items Table with full 7 columns and evaluation details */}
              <div className="mt-4">
                <h4 className="font-bold text-xs uppercase tracking-wide mb-2">Bảng tiêu chí và kết quả đánh giá KPI chi tiết:</h4>
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-slate-300 p-1.5 w-14">Mã KPI</th>
                      <th className="border border-slate-300 p-1.5 w-28 text-left">Nhóm KPI</th>
                      <th className="border border-slate-300 p-1.5 text-left">Tiêu chí thành phần</th>
                      <th className="border border-slate-300 p-1.5 w-12">Điểm nền</th>
                      <th className="border border-slate-300 p-1.5 w-32 text-left">Mức điểm trừ cụ thể</th>
                      <th className="border border-slate-300 p-1.5 w-32 text-left">Mức điểm cộng cụ thể</th>
                      <th className="border border-slate-300 p-1.5 w-28 text-left">Minh chứng / Người ĐG</th>
                      <th className="border border-slate-300 p-1.5 w-14 bg-emerald-50">Tự ĐG</th>
                      <th className="border border-slate-300 p-1.5 w-14 bg-blue-50">Lãnh đạo ĐG</th>
                      <th className="border border-slate-300 p-1.5 text-left w-24">Ghi chú / Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items && form.items.map((item, idx) => {
                      const std = Number(item.base_score ?? item.standardScore) || 0;
                      
                      // Self assessment
                      const sMinus = Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0);
                      const sPlus = Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0);
                      const selfKpi = Math.max(0, Number(item.self_score ?? item.selfScore ?? (std - sMinus + sPlus)));

                      // Evaluator assessment
                      const eMinus = Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0);
                      const ePlus = Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0);
                      const evalKpi = Math.max(0, Number(item.evaluator_score ?? item.evaluatorScore ?? item.kpiScore ?? (std - eMinus + ePlus)));

                      return (
                        <tr key={item.id || idx} className="align-top">
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-[11px] text-blue-950">
                            {item.kpi_code || item.code || `TC.${idx + 1}`}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-semibold text-[11px]">
                            {item.kpi_group || item.group || 'Nhiệm vụ chung'}
                          </td>
                          <td className="border border-slate-300 p-1.5">
                            <span className="font-semibold">{item.criterion_content || item.criterionName}</span>
                            {item.description && (
                              <p className="text-[10.5px] text-slate-500 italic mt-0.5">{item.description}</p>
                            )}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold">{std}</td>
                          <td className="border border-slate-300 p-1.5 text-[10.5px] text-slate-700">
                            {item.minus_rules && item.minus_rules.length > 0 ? (
                              item.minus_rules.map((r, rIdx) => (
                                <div key={rIdx} className={r.score > 0 ? 'text-rose-900' : 'text-slate-500'}>
                                  {r.score > 0 ? `-${r.score}đ: ` : '0đ: '}{r.label}
                                </div>
                              ))
                            ) : '-'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-[10.5px] text-slate-700">
                            {item.plus_rules && item.plus_rules.length > 0 ? (
                              item.plus_rules.map((r, rIdx) => (
                                <div key={rIdx} className={r.score > 0 ? 'text-emerald-900' : 'text-slate-500'}>
                                  {r.score > 0 ? `+${r.score}đ: ` : '0đ: '}{r.label}
                                </div>
                              ))
                            ) : '-'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-[10.5px]">
                            {item.evidence_rule && <div>{item.evidence_rule}</div>}
                            {item.evaluator_role && <div className="font-semibold text-blue-900 mt-0.5">({item.evaluator_role})</div>}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold bg-emerald-50/50 text-emerald-900">
                            {selfKpi}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold bg-blue-50/50 text-blue-900 text-sm">
                            {evalKpi}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-[10.5px] text-slate-600">
                            {item.evaluatorComment || item.comment || item.evidence || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="border border-slate-300 p-1.5 text-right uppercase">TỔNG ĐIỂM KPI:</td>
                      <td className="border border-slate-300 p-1.5 text-center font-extrabold">{form.totalStandardScore}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-rose-700">-{form.totalMinusScore}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-emerald-700">+{form.totalPlusScore}</td>
                      <td className="border border-slate-300 p-1.5 text-center">-</td>
                      <td className="border border-slate-300 p-1.5 text-center text-emerald-900 font-extrabold">{form.totalSelfScore || form.totalKpiScore}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-blue-900 text-sm font-black">{form.totalKpiScore}</td>
                      <td className="border border-slate-300 p-1.5 text-left font-bold text-blue-950">
                        {form.totalKpiScore >= 90 ? 'Xuất sắc' : form.totalKpiScore >= 75 ? 'Tốt' : form.totalKpiScore >= 50 ? 'Hoàn thành' : 'Không HT'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Comments Section */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(form.evaluateeComment || form.note) && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <strong>Ý kiến của người tự đánh giá:</strong>
                    <p className="italic text-slate-700 mt-1">{form.evaluateeComment || form.note}</p>
                  </div>
                )}
                {form.evaluatorComment && (
                  <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded">
                    <strong>Nhận xét / Kết luận của người đánh giá ({form.evaluatorName}):</strong>
                    <p className="italic text-slate-700 mt-1">{form.evaluatorComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Individual Mode Details */}
          {mode === 'individual' && teacher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <p><strong>Họ và tên CBGVNV:</strong> {teacher.name}</p>
                  <p className="mt-1"><strong>Mã số giáo viên:</strong> {teacher.code || teacher.id}</p>
                </div>
                <div>
                  <p><strong>Tổ chuyên môn:</strong> {teacher.departmentName || 'Chưa phân tổ'}</p>
                  <p className="mt-1"><strong>Chức vụ / Nhiệm vụ:</strong> {teacher.position || 'Giáo viên'}</p>
                </div>
              </div>

              {/* 4 Metrics Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs my-4">
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
                  <div className="text-slate-500 text-[11px]">ĐIỂM ĐẦU THÁNG</div>
                  <div className="text-base font-bold text-slate-800">{basePoints}</div>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded">
                  <div className="text-rose-600 text-[11px]">TỔNG ĐIỂM TRỪ</div>
                  <div className="text-base font-bold text-rose-700">{minusPoints < 0 ? minusPoints : (minusPoints > 0 ? `-${minusPoints}` : 0)}</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="text-emerald-600 text-[11px]">TỔNG ĐIỂM CỘNG</div>
                  <div className="text-base font-bold text-emerald-700">{plusPoints > 0 ? `+${plusPoints}` : plusPoints}</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-300 rounded">
                  <div className="text-blue-700 text-[11px]">KPI THÁNG</div>
                  <div className="text-lg font-extrabold text-blue-900">{totalMonthlyKpi}</div>
                </div>
              </div>

              {/* Detailed Records Table */}
              <div className="mt-4">
                <h4 className="font-bold text-xs uppercase tracking-wide mb-2">Chi tiết các khoản phát sinh trong tháng:</h4>
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1.5 text-center w-8">STT</th>
                      <th className="border border-slate-300 p-1.5 text-center w-20">Ngày</th>
                      <th className="border border-slate-300 p-1.5 text-left">Nội dung tiêu chí KPI</th>
                      <th className="border border-slate-300 p-1.5 text-center w-20">Nhóm</th>
                      <th className="border border-slate-300 p-1.5 text-center w-14">Loại</th>
                      <th className="border border-slate-300 p-1.5 text-center w-12">SL</th>
                      <th className="border border-slate-300 p-1.5 text-right w-16">Điểm/ĐV</th>
                      <th className="border border-slate-300 p-1.5 text-right w-16">Thành điểm</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, idx) => (
                      <tr key={r.id} className={r.status !== 'confirmed' ? 'opacity-60 italic' : ''}>
                        <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{r.date}</td>
                        <td className="border border-slate-300 p-1.5 font-medium">{r.kpiName}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{resolveKpiGroupName(r, kpiGroups, kpis)}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">
                          {r.pointType === 'plus' ? 'Cộng' : 'Trừ'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">{r.quantity}</td>
                        <td className="border border-slate-300 p-1.5 text-right">
                          {r.points > 0 ? `+${r.points}` : r.points}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-bold">
                          {r.totalPoints > 0 ? `+${r.totalPoints}` : r.totalPoints}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          {r.status === 'confirmed' ? 'Đã xác nhận' : (r.status === 'pending' ? 'Chờ duyệt' : (r.status === 'rejected' ? 'Từ chối' : 'Đã hủy'))}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={9} className="border border-slate-300 p-4 text-center italic text-slate-500">
                          Trong tháng không phát sinh ghi nhận cộng/trừ điểm KPI nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50/80 font-bold">
                      <td colSpan={7} className="border border-slate-300 p-1.5 text-right">TỔNG ĐIỂM KPI THÁNG:</td>
                      <td colSpan={2} className="border border-slate-300 p-1.5 text-blue-900 text-sm">
                        {totalMonthlyKpi} điểm
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* School-wide Mode Table */}
          {mode === 'school' && allTeachersData && (
            <div className="mt-4">
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-center w-8">STT</th>
                    <th className="border border-slate-300 p-1.5 text-left">Họ và tên CBGVNV</th>
                    <th className="border border-slate-300 p-1.5 text-center w-20">Mã GV</th>
                    <th className="border border-slate-300 p-1.5 text-left">Tổ chuyên môn</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16">Điểm đầu tháng</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16 text-rose-700">Điểm trừ</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16 text-emerald-700">Điểm cộng</th>
                    <th className="border border-slate-300 p-1.5 text-center w-20 font-bold">KPI Tháng</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {allTeachersData.map((item) => (
                    <tr key={item.teacher.id}>
                      <td className="border border-slate-300 p-1.5 text-center">{item.stt}</td>
                      <td className="border border-slate-300 p-1.5 font-bold">{item.teacher.name}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{item.teacher.code || item.teacher.id}</td>
                      <td className="border border-slate-300 p-1.5">{item.teacher.departmentName || 'Chưa phân tổ'}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-medium">{item.basePoints}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-semibold text-rose-700">
                        {item.minusPoints < 0 ? item.minusPoints : (item.minusPoints > 0 ? `-${item.minusPoints}` : 0)}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-semibold text-emerald-700">
                        {item.plusPoints > 0 ? `+${item.plusPoints}` : item.plusPoints}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-extrabold text-blue-900 text-sm">
                        {item.totalMonthlyKpi}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-semibold">
                        #{item.rank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] italic text-slate-500 mt-2">
                * Ghi chú: Xếp hạng KPI mang tính chất tham khảo cho công tác thi đua nội bộ tháng.
              </p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 text-center text-xs mt-12 pt-6">
            <div>
              <p className="font-bold uppercase">NGƯỜI TỰ ĐÁNH GIÁ / CBGVNV</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold uppercase">TỔ TRƯỞNG / TRƯỞNG BỘ PHẬN</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold uppercase">HIỆU TRƯỞNG</p>
              <p className="italic text-[11px] text-slate-500">(Ký, đóng dấu và ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
          </div>
        </div>

        {/* Footer - Hidden during print */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors bg-white rounded-xl border border-slate-300 shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
