import * as XLSX from 'xlsx';
import { Teacher, Department } from '../types';
import { safeFormatLocale } from './dateUtils';

export interface EvaluationExportRecord {
  id: string;
  teacherId: string;
  year: string;
  term: string;
  selfTotal: number;
  deptTotal: number;
  finalGrade: string;
  selfNote: string;
  deptNote: string;
  date: string;
  evaluatorId?: string;
  scores: Record<string, number>;
  deptScores: Record<string, number>;
  evidences?: Record<string, string>;
}

export interface CriterionItem {
  id: string;
  index: string;
  label: string;
  max: number;
}

export interface CriterionCategory {
  categoryIndex: string;
  categoryName: string;
  maxScore: number;
  items?: CriterionItem[];
  subCategories?: {
    subIndex: string;
    title: string;
    maxScore: number;
    items: CriterionItem[];
  }[];
}

/**
 * Xóa dấu tiếng Việt và ký tự đặc biệt để tạo tên file an toàn chuẩn
 * Ví dụ: "Nguyễn Văn A" -> "Nguyen_Van_A"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Định dạng mã tháng cho tên file chuẩn
 * Ví dụ: "Tháng 7" -> "T07", "Tháng 12" -> "T12", "All" -> "Tat_Ca"
 */
export function formatMonthCode(monthStr: string): string {
  if (!monthStr || monthStr === 'All' || monthStr === 'Tất cả') return 'Tat_Ca';
  const match = monthStr.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `T${num < 10 ? '0' + num : num}`;
  }
  return removeVietnameseTones(monthStr);
}

/**
 * Định dạng mã năm cho tên file chuẩn
 * Ví dụ: "2026-2027" -> "2026", "2025-2026" -> "2026", "2026" -> "2026"
 */
export function formatYearCode(yearStr: string): string {
  if (!yearStr || yearStr === 'All' || yearStr === 'Tất cả') return '2026';
  if (yearStr.includes('2026')) return '2026';
  const match = yearStr.match(/\d{4}/);
  return match ? match[0] : removeVietnameseTones(yearStr);
}

/**
 * Tạo tên file chuẩn hóa theo quy định nghiệp vụ
 * - Danh sách Excel: Danh_sach_danh_gia_T07_2026.xlsx
 * - Danh sách PDF: Phieu_danh_gia_T07_2026.pdf
 * - Từng cá nhân PDF: Phieu_danh_gia_Nguyen_Van_A_T07_2026.pdf
 * - Từng cá nhân Excel: Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx
 */
export function getExportFileName({
  type,
  monthStr,
  yearStr,
  teacherName,
}: {
  type: 'excel' | 'pdf';
  monthStr: string;
  yearStr: string;
  teacherName?: string;
}): string {
  const ext = type === 'excel' ? 'xlsx' : 'pdf';
  const mCode = formatMonthCode(monthStr);
  const yCode = formatYearCode(yearStr);

  if (teacherName && teacherName !== 'Tất cả' && teacherName.trim() !== '') {
    const cleanTeacher = removeVietnameseTones(teacherName);
    return `Phieu_danh_gia_${cleanTeacher}_${mCode}_${yCode}.${ext}`;
  }

  if (type === 'excel') {
    return `Danh_sach_danh_gia_${mCode}_${yCode}.xlsx`;
  } else {
    return `Phieu_danh_gia_${mCode}_${yCode}.pdf`;
  }
}

/**
 * Trình tải file an toàn hỗ trợ iframe và mọi trình duyệt
 */
export function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 250);
  } catch (err) {
    console.warn('Fallback to XLSX.writeFile:', err);
    XLSX.writeFile(workbook, fileName);
  }
}

/**
 * Trích xuất danh sách tiêu chí phẳng để tạo cột
 */
export function getFlatCriteriaList(criteria: CriterionCategory[]): {
  id: string;
  code: string;
  label: string;
  max: number;
}[] {
  const list: { id: string; code: string; label: string; max: number }[] = [];
  criteria.forEach(cat => {
    if (cat.items) {
      cat.items.forEach(item => {
        list.push({
          id: item.id,
          code: `${cat.categoryIndex}.${item.index}`,
          label: item.label,
          max: item.max,
        });
      });
    }
    if (cat.subCategories) {
      cat.subCategories.forEach(sub => {
        sub.items.forEach(item => {
          list.push({
            id: item.id,
            code: `${cat.categoryIndex}.${sub.subIndex}.${item.index}`,
            label: item.label,
            max: item.max,
          });
        });
      });
    }
  });
  return list;
}

/**
 * Tính điểm chính xác cho 1 bản ghi duy nhất, reset hoàn toàn biến tạm
 * Đảm bảo: KHÔNG dùng biến dùng chung giữa các giáo viên, KHÔNG cộng dồn giữa các tháng
 */
export function calculateRecordScoreStrict(
  record: EvaluationExportRecord,
  criteriaList: { id: string; max: number }[]
): {
  selfTotal: number;
  deptTotal: number;
  finalScore: number;
} {
  // Biến cục bộ độc lập cho từng bản ghi
  let freshSelfSum = 0;
  let freshDeptSum = 0;

  const recScores = record.scores || {};
  const recDeptScores = record.deptScores || {};

  criteriaList.forEach(item => {
    const s = typeof recScores[item.id] === 'number' ? recScores[item.id] : item.max;
    const d = typeof recDeptScores[item.id] === 'number' ? recDeptScores[item.id] : s;
    freshSelfSum += s;
    freshDeptSum += d;
  });

  freshSelfSum = Math.round(freshSelfSum * 10) / 10;
  freshDeptSum = Math.round(freshDeptSum * 10) / 10;

  // Sử dụng tổng điểm đã lưu nếu hợp lệ, ngược lại dùng điểm tính trực tiếp từ tiêu chí
  const selfTotal = typeof record.selfTotal === 'number' && record.selfTotal > 0
    ? record.selfTotal
    : freshSelfSum;

  const deptTotal = typeof record.deptTotal === 'number' && record.deptTotal > 0
    ? record.deptTotal
    : (record.deptScores && Object.keys(record.deptScores).length > 0 ? freshDeptSum : selfTotal);

  const finalScore = deptTotal > 0 ? deptTotal : selfTotal;

  return { selfTotal, deptTotal, finalScore };
}

/**
 * Xuất danh sách đánh giá viên chức theo tháng ra file Excel chuẩn
 * Đúng yêu cầu 4.A:
 * - Tiêu đề: TRƯỜNG THPT MINH HÒA - PHIẾU ĐÁNH GIÁ VIÊN CHỨC
 * - Tháng/năm
 * - Danh sách CBGVNV
 * - Các tiêu chí
 * - Điểm từng tiêu chí
 * - Tổng điểm
 * - Xếp loại
 * - Nhận xét
 * - Dòng tổng hợp cuối bảng
 * - Tên file: Danh_sach_danh_gia_T07_2026.xlsx (hoặc Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx)
 */
export function exportMonthlyEvaluationExcel(
  evaluations: EvaluationExportRecord[],
  teachers: Teacher[],
  departments: Department[],
  criteria: CriterionCategory[],
  selectedMonth: string,
  selectedYear: string,
  targetTeacherName?: string
) {
  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getDept = (deptId?: string) => departments.find(d => d.id === deptId)?.name || 'Chưa phân tổ';
  const flatCriteria = getFlatCriteriaList(criteria);

  const rows: any[] = [];

  // Tiêu đề đầu trang chuẩn thể thức
  rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÀO CAI']);
  rows.push(['TRƯỜNG THPT MINH HÒA']);
  rows.push([]);
  rows.push(['PHIẾU ĐÁNH GIÁ VIÊN CHỨC']);
  
  const periodText = selectedMonth === 'All' 
    ? `Cả năm học ${selectedYear}` 
    : `${selectedMonth} - Năm học: ${selectedYear}`;
  rows.push([`Thời điểm: ${periodText}`]);
  rows.push([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`]);
  rows.push([]); // Dòng trống

  // Header 1: Tên các cột
  const header1: string[] = [
    'STT',
    'Mã CBGVNV',
    'Họ và tên CBGVNV',
    'Chức vụ',
    'Tổ chuyên môn',
  ];

  // Thêm từng tiêu chí đánh giá vào cột
  flatCriteria.forEach(item => {
    header1.push(`${item.code} (${item.max}đ)`);
  });

  header1.push(
    'Tổng điểm tự chấm',
    'Điểm tổ đánh giá',
    'Điểm kết luận',
    'Xếp loại',
    'Ý kiến cá nhân',
    'Ý kiến tổ trưởng / BGH',
    'Người đánh giá',
    'Ngày đánh giá'
  );

  rows.push(header1);

  // Biến thống kê cuối bảng (reset sạch sẽ)
  let sumFinalScore = 0;
  let sumSelfScore = 0;
  let sumDeptScore = 0;
  const gradeCount: Record<string, number> = {
    'Hoàn thành xuất sắc nhiệm vụ': 0,
    'Hoàn thành tốt nhiệm vụ': 0,
    'Hoàn thành nhiệm vụ': 0,
    'Không hoàn thành nhiệm vụ': 0,
  };

  // Mảng tích lũy điểm tiêu chí để tính trung bình cuối bảng
  const criteriaSums: number[] = new Array(flatCriteria.length).fill(0);

  // Duyệt từng bản ghi giáo viên
  evaluations.forEach((record, index) => {
    // RESET HOÀN TOÀN CÁC BIẾN TÍNH TOÁN CHO TỪNG GIÁO VIÊN
    const teacher = getTeacher(record.teacherId);
    const evaluator = record.evaluatorId ? getTeacher(record.evaluatorId) : null;
    const { selfTotal, deptTotal, finalScore } = calculateRecordScoreStrict(record, flatCriteria);

    sumSelfScore += selfTotal;
    sumDeptScore += deptTotal;
    sumFinalScore += finalScore;

    const g = record.finalGrade || (finalScore >= 90 ? 'Hoàn thành xuất sắc nhiệm vụ' : finalScore >= 70 ? 'Hoàn thành tốt nhiệm vụ' : finalScore >= 50 ? 'Hoàn thành nhiệm vụ' : 'Không hoàn thành nhiệm vụ');
    if (gradeCount[g] !== undefined) {
      gradeCount[g]++;
    } else {
      gradeCount[g] = 1;
    }

    const rowData: any[] = [
      index + 1,
      teacher?.code || '',
      teacher?.name || 'Không xác định',
      teacher?.role || 'Giáo viên',
      getDept(teacher?.departmentId),
    ];

    // Điểm từng tiêu chí của riêng giáo viên này
    flatCriteria.forEach((crit, cIdx) => {
      // Ưu tiên điểm tổ đánh giá, nếu chưa có thì lấy điểm tự chấm
      const sVal = typeof record.deptScores?.[crit.id] === 'number' 
        ? record.deptScores[crit.id] 
        : (typeof record.scores?.[crit.id] === 'number' ? record.scores[crit.id] : crit.max);
      rowData.push(sVal);
      criteriaSums[cIdx] += sVal;
    });

    rowData.push(
      selfTotal,
      deptTotal,
      finalScore,
      g,
      record.selfNote || '',
      record.deptNote || '',
      evaluator ? `${evaluator.name} (${evaluator.role})` : 'Tổ trưởng / BGH',
      safeFormatLocale(record.date, 'toLocaleDateString', '')
    );

    rows.push(rowData);
  });

  // DÒNG TỔNG HỢP CUỐI BẢNG (Yêu cầu 4.A)
  const totalCount = evaluations.length;
  if (totalCount > 0) {
    const avgSelf = Math.round((sumSelfScore / totalCount) * 10) / 10;
    const avgDept = Math.round((sumDeptScore / totalCount) * 10) / 10;
    const avgFinal = Math.round((sumFinalScore / totalCount) * 10) / 10;

    const summaryRow: any[] = [
      'TỔNG HỢP',
      '',
      `Số lượng: ${totalCount} CBGVNV`,
      '',
      'Điểm trung bình:',
    ];

    // Điểm trung bình từng tiêu chí
    flatCriteria.forEach((crit, cIdx) => {
      summaryRow.push(Math.round((criteriaSums[cIdx] / totalCount) * 10) / 10);
    });

    summaryRow.push(
      avgSelf,
      avgDept,
      avgFinal,
      '',
      '',
      '',
      '',
      ''
    );

    rows.push(summaryRow);
  }

  // BẢNG THỐNG KÊ KẾT QUẢ XẾP LOẠI
  rows.push([]);
  rows.push(['BẢNG THỐNG KÊ KẾT QUẢ XẾP LOẠI VIÊN CHỨC']);
  rows.push(['STT', 'Mức xếp loại', 'Số lượng (người)', 'Tỷ lệ (%)']);

  let gradeIdx = 1;
  Object.entries(gradeCount).forEach(([gradeName, count]) => {
    const percent = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) + '%' : '0%';
    rows.push([gradeIdx++, gradeName, count, percent]);
  });

  // PHẦN CHỮ KÝ 3 BÊN
  rows.push([]);
  rows.push(['', '', 'NGƯỜI LẬP BIỂU', '', '', '', '', '', 'TỔ TRƯỞNG CHUYÊN MÔN', '', '', '', '', 'BAN GIÁM HIỆU PHÊ DUYỆT']);
  rows.push(['', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '(Ký, đóng dấu)']);
  rows.push([]);
  rows.push([]);
  rows.push([]);

  // Tạo Worksheet và Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Định dạng độ rộng cột
  const colWidths: { wch: number }[] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã
    { wch: 25 }, // Tên
    { wch: 16 }, // Chức vụ
    { wch: 22 }, // Tổ
  ];

  // Cột các tiêu chí
  flatCriteria.forEach(() => {
    colWidths.push({ wch: 12 });
  });

  // Các cột tổng điểm và xếp loại
  colWidths.push(
    { wch: 18 }, // Tự chấm
    { wch: 18 }, // Tổ chấm
    { wch: 16 }, // Kết luận
    { wch: 28 }, // Xếp loại
    { wch: 32 }, // Ý kiến cá nhân
    { wch: 32 }, // Ý kiến tổ trưởng
    { wch: 24 }, // Người đánh giá
    { wch: 14 }  // Ngày đánh giá
  );

  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = formatMonthCode(selectedMonth);
  XLSX.utils.book_append_sheet(workbook, worksheet, `DanhSach_${safeSheetName}`);

  // TÊN FILE CHUẨN THEO YÊU CẦU 5:
  // Ví dụ: Danh_sach_danh_gia_T07_2026.xlsx
  // Hoặc: Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx
  const fileName = getExportFileName({
    type: 'excel',
    monthStr: selectedMonth,
    yearStr: selectedYear,
    teacherName: targetTeacherName,
  });

  saveWorkbook(workbook, fileName);
}

/**
 * Tương thích ngược: Giữ exportMonthlySummaryToExcel gọi exportMonthlyEvaluationExcel
 */
export function exportMonthlySummaryToExcel(
  evaluations: EvaluationExportRecord[],
  teachers: Teacher[],
  departments: Department[],
  selectedMonth: string,
  selectedYear: string,
  criteria?: CriterionCategory[]
) {
  const dummyCriteria: CriterionCategory[] = criteria || [];
  exportMonthlyEvaluationExcel(
    evaluations,
    teachers,
    departments,
    dummyCriteria,
    selectedMonth,
    selectedYear
  );
}

/**
 * Xuất chi tiết phiếu đánh giá cá nhân 19 tiêu chí ra file Excel
 * Tên file chuẩn: Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx
 */
export function exportSingleEvaluationDetailToExcel(
  record: EvaluationExportRecord,
  teacher: Teacher | undefined,
  evaluator: Teacher | undefined,
  departmentName: string,
  criteria: CriterionCategory[]
) {
  const flatCriteria = getFlatCriteriaList(criteria);
  const { selfTotal, deptTotal, finalScore } = calculateRecordScoreStrict(record, flatCriteria);

  const rows: any[] = [];

  rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÀO CAI']);
  rows.push(['TRƯỜNG THPT MINH HÒA']);
  rows.push([]);
  rows.push(['PHIẾU ĐÁNH GIÁ VIÊN CHỨC']);
  rows.push([`Tháng: ${record.term} - Năm học: ${record.year}`]);
  rows.push([]);

  // Thông tin viên chức
  rows.push(['I. THÔNG TIN VIÊN CHỨC ĐƯỢC ĐÁNH GIÁ']);
  rows.push(['Họ và tên:', teacher?.name || '................................', 'Mã viên chức:', teacher?.code || 'GV']);
  rows.push(['Chức vụ:', teacher?.role || 'Giáo viên', 'Tổ chuyên môn:', departmentName || 'Chưa phân tổ']);
  rows.push(['Người đánh giá:', evaluator ? `${evaluator.name} (${evaluator.role})` : 'Tổ trưởng chuyên môn', 'Ngày đánh giá:', record.date || new Date().toISOString().split('T')[0]]);
  rows.push([]);

  // Bảng tiêu chí chi tiết
  rows.push(['II. BẢNG TIÊU CHÍ ĐÁNH GIÁ CHI TIẾT']);
  rows.push(['STT', 'Nội dung tiêu chí', 'Điểm tối đa', 'Điểm cá nhân', 'Điểm đánh giá', 'Minh chứng']);

  criteria.forEach(cat => {
    // Nhóm chính
    rows.push([
      cat.categoryIndex,
      cat.categoryName.toUpperCase(),
      cat.maxScore,
      '',
      '',
      ''
    ]);

    if (cat.items) {
      cat.items.forEach(item => {
        const sVal = typeof record.scores?.[item.id] === 'number' ? record.scores[item.id] : item.max;
        const dVal = typeof record.deptScores?.[item.id] === 'number' ? record.deptScores[item.id] : sVal;
        rows.push([
          `${cat.categoryIndex}.${item.index}`,
          item.label,
          item.max,
          sVal,
          dVal,
          record.evidences?.[item.id] || ''
        ]);
      });
    }

    if (cat.subCategories) {
      cat.subCategories.forEach(sub => {
        rows.push([
          `${cat.categoryIndex}.${sub.subIndex}`,
          sub.title,
          sub.maxScore,
          '',
          '',
          ''
        ]);
        sub.items.forEach(item => {
          const sVal = typeof record.scores?.[item.id] === 'number' ? record.scores[item.id] : item.max;
          const dVal = typeof record.deptScores?.[item.id] === 'number' ? record.deptScores[item.id] : sVal;
          rows.push([
            `${cat.categoryIndex}.${sub.subIndex}.${item.index}`,
            item.label,
            item.max,
            sVal,
            dVal,
            record.evidences?.[item.id] || ''
          ]);
        });
      });
    }
  });

  // Dòng tổng điểm
  rows.push([
    'TỔNG',
    'TỔNG ĐIỂM ĐÁNH GIÁ (Thang điểm 100)',
    100,
    selfTotal,
    deptTotal,
    ''
  ]);

  rows.push([]);
  rows.push(['III. KẾT LUẬN XẾP LOẠI VÀ Ý KIẾN']);
  rows.push(['Điểm cá nhân tự chấm:', selfTotal]);
  rows.push(['Điểm người đánh giá kết luận:', deptTotal]);
  rows.push(['Xếp loại chính thức:', record.finalGrade || (finalScore >= 90 ? 'Hoàn thành xuất sắc nhiệm vụ' : finalScore >= 70 ? 'Hoàn thành tốt nhiệm vụ' : 'Hoàn thành nhiệm vụ')]);
  rows.push(['Ý kiến tự nhận xét của cá nhân:', record.selfNote || '(Cá nhân hoàn thành tốt nhiệm vụ được giao)']);
  rows.push(['Ý kiến nhận xét của người đánh giá:', record.deptNote || '(Nhất trí với kết quả đánh giá)']);

  rows.push([]);
  rows.push(['', 'NGƯỜI TỰ ĐÁNH GIÁ', '', 'TỔ TRƯỞNG CHUYÊN MÔN', '', 'HIỆU TRƯỞNG PHÊ DUYỆT']);
  rows.push(['', '(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '(Ký, đóng dấu)']);
  rows.push([]);
  rows.push([]);
  rows.push(['', teacher?.name || '', '', evaluator?.name || 'Tổ trưởng chuyên môn', '', 'Ban Giám Hiệu']);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 45 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Phieu_Danh_Gia');

  // Tên file chuẩn theo Yêu cầu 5:
  // Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx
  const fileName = getExportFileName({
    type: 'excel',
    monthStr: record.term,
    yearStr: record.year,
    teacherName: teacher?.name || 'CBGVNV',
  });

  saveWorkbook(workbook, fileName);
}

/**
 * Xuất bảng chi tiết tất cả tiêu chí của tất cả giáo viên ra file Excel
 */
export function exportAllDetailedEvaluationsToExcel(
  records: EvaluationExportRecord[],
  teachers: Teacher[],
  departments: Department[],
  criteria: CriterionCategory[],
  selectedMonth: string,
  selectedYear: string
) {
  exportMonthlyEvaluationExcel(
    records,
    teachers,
    departments,
    criteria,
    selectedMonth,
    selectedYear
  );
}
