import React, { useRef, useState } from 'react';
import { X, Printer, Download, FileSpreadsheet, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { Teacher, Department } from '../../types';
import { 
  EvaluationExportRecord, 
  CriterionCategory, 
  exportSingleEvaluationDetailToExcel,
  exportAllDetailedEvaluationsToExcel,
  getExportFileName
} from '../../utils/evaluationExport';
import { exportEvaluationToDocx } from '../../utils/evaluationDocxExport';

interface PrintEvaluationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  record?: EvaluationExportRecord;
  records?: EvaluationExportRecord[];
  teacher?: Teacher;
  evaluator?: Teacher;
  department?: Department;
  teachers?: Teacher[];
  departments?: Department[];
  criteria: CriterionCategory[];
  title?: string;
}

export default function PrintEvaluationSheet({
  isOpen,
  onClose,
  record,
  records,
  teacher,
  evaluator,
  department,
  teachers = [],
  departments = [],
  criteria,
  title,
}: PrintEvaluationSheetProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Hỗ trợ in 1 phiếu hoặc in danh sách nhiều phiếu (in hàng loạt cả tháng)
  const printList: {
    rec: EvaluationExportRecord;
    t?: Teacher;
    ev?: Teacher;
    deptName: string;
  }[] = [];

  if (records && records.length > 0) {
    records.forEach(r => {
      const t = teachers.find(tch => tch.id === r.teacherId) || (teacher && teacher.id === r.teacherId ? teacher : undefined);
      const ev = r.evaluatorId ? teachers.find(tch => tch.id === r.evaluatorId) : evaluator;
      const d = departments.find(dept => dept.id === t?.departmentId) || department;
      printList.push({
        rec: r,
        t,
        ev,
        deptName: d?.name || 'Tổ chuyên môn',
      });
    });
  } else if (record) {
    printList.push({
      rec: record,
      t: teacher,
      ev: evaluator,
      deptName: department?.name || 'Tổ chuyên môn',
    });
  }

  if (printList.length === 0) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    try {
      if (printList.length === 1) {
        const item = printList[0];
        const pdfName = getExportFileName({
          type: 'pdf',
          monthStr: item.rec.term,
          yearStr: item.rec.year,
          teacherName: item.t?.name,
        }).replace(/\.pdf$/i, '');
        document.title = pdfName;
      } else if (printList.length > 1) {
        const firstRec = printList[0].rec;
        const pdfName = getExportFileName({
          type: 'pdf',
          monthStr: firstRec.term,
          yearStr: firstRec.year,
        }).replace(/\.pdf$/i, '');
        document.title = pdfName;
      }
    } catch (e) {
      console.warn('Could not set custom print title:', e);
    }

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    setExportFeedback(null);
    try {
      if (printList.length === 1) {
        const item = printList[0];
        const res = await exportEvaluationToDocx({
          record: item.rec,
          teacher: item.t,
          evaluator: item.ev,
          department: departments.find(d => d.name === item.deptName) || department,
          criteria
        });
        if (res.success) {
          setExportFeedback(`Đã xuất phiếu Word của ${item.t?.name || 'giáo viên'} thành công!`);
          setTimeout(() => setExportFeedback(null), 4000);
        } else {
          console.error(res.error);
          alert('Không thể xuất phiếu Word. Vui lòng thử lại.');
        }
      } else {
        // Xuất từng phiếu nếu đang xem batch
        for (const item of printList) {
          await exportEvaluationToDocx({
            record: item.rec,
            teacher: item.t,
            evaluator: item.ev,
            department: departments.find(d => d.name === item.deptName) || department,
            criteria
          });
        }
        setExportFeedback(`Đã xuất ${printList.length} phiếu Word thành công!`);
        setTimeout(() => setExportFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xuất phiếu Word. Vui lòng thử lại.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportExcel = () => {
    if (printList.length === 1) {
      const item = printList[0];
      exportSingleEvaluationDetailToExcel(
        item.rec,
        item.t,
        item.ev,
        item.deptName,
        criteria
      );
    } else {
      const firstRec = printList[0].rec;
      exportAllDetailedEvaluationsToExcel(
        printList.map(item => item.rec),
        teachers,
        departments,
        criteria,
        firstRec.term,
        firstRec.year
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-5xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none print:w-full">
        {/* Header Action Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Printer size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {title || (printList.length > 1 ? `In tập phiếu đánh giá (${printList.length} viên chức)` : 'Xem trước & In Phiếu Đánh Giá Viên Chức')}
              </h3>
              <p className="text-xs text-slate-500">
                {printList.length === 1 
                  ? `${printList[0].t?.name || 'Viên chức'} • ${printList[0].rec.term} (${printList[0].rec.year}) - THPT Minh Hòa` 
                  : `${printList.length} phiếu đánh giá • ${printList[0].rec.term} (${printList[0].rec.year}) - THPT Minh Hòa`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exportFeedback && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {exportFeedback}
              </span>
            )}
            <button
              type="button"
              disabled={isExportingDocx}
              onClick={handleExportDocx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Xuất phiếu đánh giá ra file Microsoft Word (.docx)"
            >
              {isExportingDocx ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              <span>Xuất file Word (.docx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              title="Xuất bảng điểm chi tiết 19 tiêu chí ra Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              title="In ra giấy A4 hoặc lưu file PDF"
            >
              <Printer size={15} />
              <span>In phiếu (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors ml-2"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          <div ref={printContainerRef} className="max-w-[840px] mx-auto space-y-10 print:space-y-0 print:max-w-none">
            {printList.map(({ rec, t, ev, deptName }, idx) => {
              const formattedDate = rec.date ? new Date(rec.date) : new Date();

              return (
                <div 
                  key={rec.id || idx}
                  className="bg-white p-8 sm:p-12 shadow-sm border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-0 text-slate-900 text-[13px] leading-normal font-serif break-after-page print:page-break-after-always"
                  style={{ breakAfter: idx < printList.length - 1 ? 'page' : 'auto' }}
                >
                  {/* Header Hành chính */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b-2 border-slate-900 mb-6">
                    <div className="text-center">
                      <p className="text-xs uppercase font-medium">SỞ GD&ĐT TỈNH LÀO CAI</p>
                      <p className="text-sm uppercase font-bold tracking-tight">TRƯỜNG THPT MINH HÒA</p>
                      <div className="w-20 h-[1px] bg-slate-900 mx-auto mt-1 mb-1"></div>
                      <p className="text-[11px] text-slate-600 italic">Số: ....../PĐG-SL</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-xs font-bold">Độc lập - Tự do - Hạnh phúc</p>
                      <div className="w-32 h-[1px] bg-slate-900 mx-auto mt-1 mb-1"></div>
                      <p className="text-[11px] text-slate-600 italic">
                        Minh Hòa, ngày {formattedDate.getDate()} tháng {formattedDate.getMonth() + 1} năm {formattedDate.getFullYear()}
                      </p>
                    </div>
                  </div>

                  {/* Tiêu đề phiếu */}
                  <div className="text-center mb-6">
                    <h1 className="text-lg font-bold uppercase tracking-wide">
                      PHIẾU ĐÁNH GIÁ, XẾP LOẠI VIÊN CHỨC THEO THÁNG
                    </h1>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      Thời điểm: {rec.term} - Năm học: {rec.year}
                    </p>
                  </div>

                  {/* Phần I: Thông tin viên chức */}
                  <div className="mb-6 space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                      I. THÔNG TIN VIÊN CHỨC ĐƯỢC ĐÁNH GIÁ
                    </h2>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs pt-1">
                      <p><span className="font-semibold">Họ và tên:</span> <span className="font-bold uppercase">{t?.name || '................................'}</span></p>
                      <p><span className="font-semibold">Mã viên chức:</span> {t?.code || '............'}</p>
                      <p><span className="font-semibold">Tổ chuyên môn:</span> {deptName || '................................'}</p>
                      <p><span className="font-semibold">Chức vụ / Vị trí:</span> {t?.role || 'Giáo viên'}</p>
                      <p><span className="font-semibold">Người đánh giá:</span> {ev ? `${ev.name} (${ev.role})` : 'Tổ trưởng chuyên môn'}</p>
                      <p><span className="font-semibold">Ngày đánh giá:</span> {formattedDate.toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  {/* Phần II: Bảng tiêu chí chi tiết */}
                  <div className="mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                      II. NỘI DUNG ĐÁNH GIÁ, CHẤM ĐIỂM VÀ MINH CHỨNG
                    </h2>
                    <table className="w-full border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                          <th className="border border-slate-400 p-1.5 w-8">TT</th>
                          <th className="border border-slate-400 p-1.5 text-left">Nội dung tiêu chí đánh giá</th>
                          <th className="border border-slate-400 p-1.5 w-14 text-center">Điểm tối đa</th>
                          <th className="border border-slate-400 p-1.5 w-16 text-center">Cá nhân tự chấm</th>
                          <th className="border border-slate-400 p-1.5 w-16 text-center">Tổ trưởng đánh giá</th>
                          <th className="border border-slate-400 p-1.5 w-32 text-left">Minh chứng kèm theo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criteria.map((cat) => (
                          <React.Fragment key={cat.categoryIndex}>
                            {/* Tiêu đề nhóm */}
                            <tr className="bg-blue-50/80 font-bold">
                              <td className="border border-slate-400 p-1.5 text-center">{cat.categoryIndex}</td>
                              <td className="border border-slate-400 p-1.5 uppercase">{cat.categoryName}</td>
                              <td className="border border-slate-400 p-1.5 text-center font-bold">{cat.maxScore}</td>
                              <td className="border border-slate-400 p-1.5 text-center"></td>
                              <td className="border border-slate-400 p-1.5 text-center"></td>
                              <td className="border border-slate-400 p-1.5"></td>
                            </tr>

                            {/* Các tiêu chí trong nhóm */}
                            {cat.items?.map((item) => (
                              <tr key={item.id}>
                                <td className="border border-slate-400 p-1.5 text-center">{item.index}</td>
                                <td className="border border-slate-400 p-1.5 leading-snug">{item.label}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{item.max}</td>
                                <td className="border border-slate-400 p-1.5 text-center font-semibold text-blue-900">
                                  {rec.scores?.[item.id] ?? item.max}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-center font-semibold text-emerald-900">
                                  {rec.deptScores?.[item.id] ?? item.max}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-[11px] text-slate-600 break-words leading-tight">
                                  {rec.evidences?.[item.id] || ''}
                                </td>
                              </tr>
                            ))}

                            {/* Phân nhóm con nếu có */}
                            {cat.subCategories?.map((sub) => (
                              <React.Fragment key={sub.subIndex}>
                                <tr className="bg-blue-50/80/70 italic font-semibold">
                                  <td className="border border-slate-400 p-1 text-center">{cat.categoryIndex}.{sub.subIndex}</td>
                                  <td className="border border-slate-400 p-1" colSpan={5}>{sub.title} ({sub.maxScore} điểm)</td>
                                </tr>
                                {sub.items.map((subItem) => (
                                  <tr key={subItem.id}>
                                    <td className="border border-slate-400 p-1.5 text-center">{subItem.index}</td>
                                    <td className="border border-slate-400 p-1.5 leading-snug">{subItem.label}</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{subItem.max}</td>
                                    <td className="border border-slate-400 p-1.5 text-center font-semibold text-blue-900">
                                      {rec.scores?.[subItem.id] ?? subItem.max}
                                    </td>
                                    <td className="border border-slate-400 p-1.5 text-center font-semibold text-emerald-900">
                                      {rec.deptScores?.[subItem.id] ?? subItem.max}
                                    </td>
                                    <td className="border border-slate-400 p-1.5 text-[11px] text-slate-600 break-words leading-tight">
                                      {rec.evidences?.[subItem.id] || ''}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}

                        {/* Dòng tổng điểm */}
                        <tr className="bg-slate-100 font-bold text-center">
                          <td className="border border-slate-400 p-2" colSpan={2}>TỔNG ĐIỂM ĐÁNH GIÁ (Thang điểm 100)</td>
                          <td className="border border-slate-400 p-2">100</td>
                          <td className="border border-slate-400 p-2 text-blue-900 font-black">{rec.selfTotal}</td>
                          <td className="border border-slate-400 p-2 text-emerald-900 font-black">
                            {rec.deptTotal > 0 ? rec.deptTotal : rec.selfTotal}
                          </td>
                          <td className="border border-slate-400 p-2 text-slate-500 font-normal italic">
                            Đạt: {rec.deptTotal > 0 ? rec.deptTotal : rec.selfTotal}/100 đ
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Phần III: Kết luận và xếp loại */}
                  <div className="mb-6 space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                      III. KẾT LUẬN XẾP LOẠI VÀ Ý KIẾN
                    </h2>
                    
                    <div className="border border-slate-300 rounded p-3 text-xs space-y-2">
                      <div>
                        <span className="font-bold">1. Ý kiến tự nhận xét của cá nhân:</span>
                        <p className="mt-1 italic text-slate-700 pl-4">{rec.selfNote || '(Cá nhân hoàn thành các nhiệm vụ được giao trong tháng theo đúng kế hoạch).'}</p>
                      </div>
                      <div>
                        <span className="font-bold">2. Ý kiến nhận xét, đánh giá của Tổ trưởng chuyên môn:</span>
                        <p className="mt-1 italic text-slate-700 pl-4">{rec.deptNote || '(Tổ chuyên môn nhất trí với kết quả tự chấm của viên chức).'}</p>
                      </div>
                      <div className="pt-1 flex items-center justify-between font-bold border-t border-slate-200">
                        <span>3. Kết quả xếp loại chính thức:</span>
                        <span className="text-sm uppercase text-blue-900 underline font-black">
                          {rec.finalGrade || 'Hoàn thành tốt nhiệm vụ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chữ ký 3 bên */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-8 pt-4 page-break-inside-avoid">
                    <div>
                      <p className="font-bold uppercase">NGƯỜI TỰ ĐÁNH GIÁ</p>
                      <p className="text-[11px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold">{t?.name || ''}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase">TỔ TRƯỞNG CHUYÊN MÔN</p>
                      <p className="text-[11px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold">{ev?.name || '................................'}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase">HIỆU TRƯỞNG PHÊ DUYỆT</p>
                      <p className="text-[11px] italic text-slate-500">(Ký, đóng dấu)</p>
                      <div className="h-16"></div>
                      <p className="font-bold">Ban Giám Hiệu</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

