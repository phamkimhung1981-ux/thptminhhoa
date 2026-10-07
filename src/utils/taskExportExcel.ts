import * as XLSX from 'xlsx';
import { WorkAssignment, Teacher } from '../types';
import { safeFormatLocale } from './dateUtils';

interface ExportExcelOptions {
  weekNumber: number;
  startDateStr: string;
  endDateStr: string;
  scopeTitle?: string;
  tasks: WorkAssignment[];
  teachers: Teacher[];
  getTeacherNames: (assignment: WorkAssignment) => string;
  getDepartmentName: (assignment: WorkAssignment) => string;
  getEffectiveStatus: (assignment: WorkAssignment) => string;
  getResultText: (assignment: WorkAssignment) => string;
}

export function exportWeeklyTasksToExcel(options: ExportExcelOptions) {
  const {
    weekNumber,
    startDateStr,
    endDateStr,
    scopeTitle = 'TOÀN TRƯỜNG',
    tasks,
    getTeacherNames,
    getDepartmentName,
    getEffectiveStatus,
    getResultText
  } = options;

  // Header info rows
  const excelRows: any[] = [];
  excelRows.push(['SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT SƠN LƯƠNG']);
  excelRows.push([`BẢNG TỔNG HỢP GIAO VIỆC TUẦN ${weekNumber}`]);
  excelRows.push([`Thời gian: Từ ngày ${startDateStr} đến ngày ${endDateStr} | Phạm vi: ${scopeTitle}`]);
  excelRows.push([]); // Empty line

  // Table header
  excelRows.push([
    'STT',
    'NỘI DUNG CÔNG VIỆC',
    'NGƯỜI ĐƯỢC GIAO',
    'TỔ / ĐƠN VỊ',
    'NGÀY GIAO',
    'HẠN HOÀN THÀNH',
    'MỨC ĐỘ ƯU TIÊN',
    'TRẠNG THÁI',
    'TIẾN ĐỘ',
    'KẾT QUẢ THỰC HIỆN',
    'YÊU CẦU / GHI CHÚ'
  ]);

  if (tasks.length === 0) {
    excelRows.push(['', 'Không có công việc nào trong tuần này.', '', '', '', '', '', '', '', '', '']);
  } else {
    tasks.forEach((task, index) => {
      excelRows.push([
        index + 1,
        task.content || '',
        getTeacherNames(task),
        getDepartmentName(task),
        safeFormatLocale(task.workDate, 'toLocaleDateString', '—'),
        safeFormatLocale(task.deadline, 'toLocaleDateString', '—'),
        task.priority || 'Trung bình',
        getEffectiveStatus(task),
        task.progress !== undefined ? `${task.progress}%` : '',
        getResultText(task) || '—',
        [task.requirements ? `Yêu cầu: ${task.requirements}` : '', task.note ? `Ghi chú: ${task.note}` : ''].filter(Boolean).join(' | ')
      ]);
    });
  }

  excelRows.push([]);
  excelRows.push(['', '', '', '', '', '', '', `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 40 }, // Nội dung công việc
    { wch: 25 }, // Người được giao
    { wch: 18 }, // Tổ/đơn vị
    { wch: 14 }, // Ngày giao
    { wch: 16 }, // Hạn hoàn thành
    { wch: 16 }, // Mức độ ưu tiên
    { wch: 18 }, // Trạng thái
    { wch: 12 }, // Tiến độ
    { wch: 30 }, // Kết quả thực hiện
    { wch: 30 }  // Yêu cầu / Ghi chú
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Tuan_${weekNumber}`);

  const fileName = `Bang_Giao_Viec_Tuan_${weekNumber}_THPT_Son_Luong.xlsx`;
  XLSX.writeFile(wb, fileName);
}
