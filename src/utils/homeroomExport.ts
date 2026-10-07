import * as XLSX from 'xlsx';
import { Student, ConductRecord, ConductCriterion, ClassificationType, EvaluationRatingConfig } from '../types/homeroom';
import { calculateConductScore, checkStudentHasSpecialWarning, isDatChuaDatCategory, evaluateStudent6Groups } from '../lib/homeroomData';

interface ExportData {
  className: string;
  schoolYear: string;
  periodLabel: string;
  homeroomTeacherName?: string;
  students: Student[];
  records: ConductRecord[];
  criteria: ConductCriterion[];
  baseScore?: number;
  ratingConfig?: EvaluationRatingConfig | null;
}

export function exportHomeroomToExcel({
  className,
  schoolYear,
  periodLabel,
  homeroomTeacherName,
  students,
  records,
  criteria,
  baseScore = 100,
  ratingConfig
}: ExportData) {
  // Column definitions matching "Theo dõi nền nếp.xlsx"
  const criteriaColumns = [
    { key: 'crit_1', header: 'Nghỉ học không phép' },
    { key: 'crit_7', header: 'Không mặc đồng phục, đeo thẻ' },
    { key: 'crit_2', header: 'Bỏ tiết' },
    { key: 'crit_3', header: 'Vào lớp muộn' },
    { key: 'crit_4', header: 'Ghi sổ đầu bài' },
    { key: 'crit_6', header: 'Điểm tốt' },
    { key: 'crit_5', header: 'Số lần điểm kém' },
    { key: 'crit_8', header: 'Đổ rác không đúng quy định' },
    { key: 'crit_9', header: 'Xúc phạm nhân phẩm, danh dự/thân thể' },
    { key: 'crit_10', header: 'Gian lận trong học tập, kiểm tra, thi' },
    { key: 'crit_11', header: 'Rượu, bia, thuốc lá, chất kích thích, pháo' },
    { key: 'crit_12', header: 'Sử dụng điện thoại, thiết bị không cho phép' },
    { key: 'crit_13', header: 'Đánh nhau, gây rối trật tự an ninh' },
    { key: 'crit_14', header: 'Sản phẩm văn hóa/trò chơi có hại' },
    { key: 'crit_15', header: 'Đi xe máy/để xe sai quy định/không mũ BH' },
    { key: 'crit_16', header: 'Vi phạm khác' },
  ];

  // Header rows
  const excelData: any[] = [];

  // Title
  excelData.push(['TRƯỜNG THPT SƠN LƯƠNG']);
  excelData.push([`BẢNG THEO DÕI NỀN NẾP VÀ ĐÁNH GIÁ RÈN LUYỆN HỌC SINH - LỚP ${className.toUpperCase()}`]);
  excelData.push([`Năm học: ${schoolYear} | Thời gian: ${periodLabel} | GVCN: ${homeroomTeacherName || 'Chưa phân công'}`]);
  excelData.push([]); // blank line

  // Column Table Headers
  const headerRow = [
    'STT',
    'Họ và tên',
    ...criteriaColumns.map(c => c.header),
    'Tổng điểm bị trừ',
    'Tổng điểm cộng',
    'Tổng số điểm đạt được',
    'Cảnh báo đặc biệt',
    'Xếp loại rèn luyện'
  ];
  excelData.push(headerRow);

  // Student rows
  students.forEach((student, index) => {
    const studentRecords = records.filter(r => r.studentId === student.id);
    const hasSpecialWarning = checkStudentHasSpecialWarning(studentRecords);

    let totalMinus = 0;
    let totalPlus = 0;

    const criterionCounts: Record<string, number> = {};
    criteriaColumns.forEach(c => {
      criterionCounts[c.key] = 0;
    });

    studentRecords.forEach(r => {
      if (r.recordType === 'TICH_CUC' || r.point === 0) return;
      if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
      if (r.pointType === 'plus') {
        totalPlus += Math.abs(r.point);
      } else {
        totalMinus += Math.abs(r.point);
      }

      // Find matching criteria column key
      const match = criteriaColumns.find(col => col.key === r.criterionId) ||
                    criteriaColumns.find(col => r.criterionName?.toLowerCase().includes(col.header.toLowerCase().substring(0, 10)));
      if (match) {
        criterionCounts[match.key] += 1;
      }
    });

    const evalResult = evaluateStudent6Groups(studentRecords);
    const { totalScore, classification } = calculateConductScore(baseScore, totalPlus, totalMinus, undefined, hasSpecialWarning, ratingConfig, evalResult);

    const row = [
      String(index + 1).padStart(2, '0'),
      student.name,
      ...criteriaColumns.map(col => criterionCounts[col.key] > 0 ? criterionCounts[col.key] : ''),
      totalMinus > 0 ? `-${totalMinus}` : '0',
      totalPlus > 0 ? `+${totalPlus}` : '0',
      totalScore,
      hasSpecialWarning ? 'CÓ' : 'KHÔNG',
      hasSpecialWarning ? 'YẾU / CHƯA ĐẠT' : classification
    ];

    excelData.push(row);
  });

  // Footer summary
  excelData.push([]);
  excelData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Sơn Lương, ngày .... tháng .... năm 20...`]);
  excelData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'GIÁO VIÊN CHỦ NHIỆM']);
  excelData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '(Ký và ghi rõ họ tên)']);

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 6 },  // STT
    { wch: 22 }, // Họ tên
    ...criteriaColumns.map(() => ({ wch: 12 })),
    { wch: 16 }, // Điểm trừ
    { wch: 16 }, // Điểm cộng
    { wch: 20 }, // Tổng điểm
    { wch: 16 }  // Xếp loại
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Nền nếp ${className}`);

  const fileName = `Theo_doi_nen_nep_${className}_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
