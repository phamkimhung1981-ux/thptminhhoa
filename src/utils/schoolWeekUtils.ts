import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  addDays,
  format, 
  differenceInCalendarWeeks
} from 'date-fns';
import { WorkAssignment, WorkAssignmentStatus } from '../types';
import { safeParseDate } from './dateUtils';

export interface SchoolWeekInfo {
  weekNumber: number;
  weekLabel: string;    // 'Tuần 03'
  startDate: Date;
  endDate: Date;
  startDateStr: string; // '14/09/2026'
  endDateStr: string;   // '20/09/2026'
  startDateIso: string; // '2026-09-14'
  endDateIso: string;   // '2026-09-20'
  label: string;        // 'TUẦN 03 | TỪ 14/09/2026 ĐẾN 20/09/2026'
  timeRangeStr: string; // '14/09/2026 – 20/09/2026'
}

export const ACADEMIC_YEARS = [
  '2026–2027',
  '2025–2026',
  '2027–2028'
];

/**
 * Trích xuất năm bắt đầu từ chuỗi năm học (ví dụ: '2026–2027' hoặc '2026-2027' -> 2026)
 */
export function parseStartYear(academicYear: string = '2026–2027'): number {
  const match = academicYear.match(/\d{4}/);
  if (match) {
    const y = parseInt(match[0], 10);
    if (!isNaN(y)) return y;
  }
  return 2026;
}

/**
 * Lấy Thứ Hai đầu tiên của năm học (Tuần 01)
 * Đối với năm học 2026–2027:
 * - Tuần 01: 07/09/2026 – 13/09/2026
 * - Tuần 02: 14/09/2026 – 20/09/2026
 * - Tuần 03: 21/09/2026 – 27/09/2026
 * - Tuần 04: 28/09/2026 – 04/10/2026
 * - Tuần 05: 05/10/2026 – 11/10/2026
 */
export function getSchoolYearStartMonday(academicYear: string | number = '2026–2027'): Date {
  const startYear = typeof academicYear === 'number' ? academicYear : parseStartYear(academicYear);
  if (startYear === 2026) {
    const monday = new Date(2026, 8, 7); // Thứ Hai ngày 07/09/2026 (Tháng 9 là index 8)
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  // Cho các năm khác: Thứ Hai đầu tiên từ ngày 5/9 trở đi (sau ngày khai giảng)
  const septFirst = new Date(startYear, 8, 1);
  const firstMonday = startOfWeek(septFirst, { weekStartsOn: 1 });
  if (firstMonday.getMonth() === 7 || firstMonday.getDate() < 4) {
    const adjusted = addDays(firstMonday, 7);
    adjusted.setHours(0, 0, 0, 0);
    return adjusted;
  }
  firstMonday.setHours(0, 0, 0, 0);
  return firstMonday;
}

/**
 * Tạo weekId chuẩn hóa theo năm học và số tuần
 * Ví dụ: 'week_2026_2027_w03', 'week_2026_2027_w05'
 */
export function generateWeekId(weekNumber: number | string, academicYear: string = '2026–2027'): string {
  const normYear = academicYear.replace(/[^a-zA-Z0-9]/g, '_');
  const num = parseInt(String(weekNumber), 10) || 1;
  return `week_${normYear}_w${String(num).padStart(2, '0')}`;
}

/**
 * Lấy thông tin chi tiết của 1 tuần học cụ thể trong năm học
 */
export function getWeekInfoByNumber(weekNumber: number, academicYear: string = '2026–2027'): SchoolWeekInfo {
  const safeWeekNum = Math.max(1, Math.min(45, weekNumber));
  const startMonday = getSchoolYearStartMonday(academicYear);
  
  // Tính ngày Thứ Hai của tuần này
  const weekMonday = addWeeks(startMonday, safeWeekNum - 1);
  weekMonday.setHours(0, 0, 0, 0);

  // Tính Chủ Nhật cuối tuần (thêm 6 ngày)
  const weekSunday = addDays(weekMonday, 6);
  weekSunday.setHours(23, 59, 59, 999);

  const padNum = String(safeWeekNum).padStart(2, '0');
  const startDateStr = format(weekMonday, 'dd/MM/yyyy');
  const endDateStr = format(weekSunday, 'dd/MM/yyyy');
  const startDateIso = format(weekMonday, 'yyyy-MM-dd');
  const endDateIso = format(weekSunday, 'yyyy-MM-dd');

  return {
    weekNumber: safeWeekNum,
    weekLabel: `Tuần ${padNum}`,
    startDate: weekMonday,
    endDate: weekSunday,
    startDateStr,
    endDateStr,
    startDateIso,
    endDateIso,
    label: `TUẦN ${padNum} | TỪ ${startDateStr} ĐẾN ${endDateStr}`,
    timeRangeStr: `${startDateStr} – ${endDateStr}`
  };
}

export interface WeekDayDateItem {
  dayOfWeek: string;
  dayIndex: number;
  dateIso: string;
  dateDisplayShort: string;
  dateDisplayFull: string;
  dateLabel: string;
}

/**
 * Quy đổi ngày theo tuần được chọn:
 * - THỨ HAI = startDate + 0 ngày
 * - THỨ BA = startDate + 1 ngày
 * - THỨ TƯ = startDate + 2 ngày
 * - THỨ NĂM = startDate + 3 ngày
 * - THỨ SÁU = startDate + 4 ngày
 * - THỨ BẢY = startDate + 5 ngày
 * - CHỦ NHẬT = startDate + 6 ngày
 */
export function getWeekDayDates(weekNumber: number, academicYear: string = '2026–2027'): WeekDayDateItem[] {
  const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);
  const startMonday = weekInfo.startDate;

  const dayNames = [
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
    'Chủ Nhật'
  ];

  return dayNames.map((dayOfWeek, idx) => {
    const d = addDays(startMonday, idx);
    const dateIso = format(d, 'yyyy-MM-dd');
    const dateDisplayShort = format(d, 'dd/MM');
    const dateDisplayFull = format(d, 'dd/MM/yyyy');
    return {
      dayOfWeek,
      dayIndex: idx,
      dateIso,
      dateDisplayShort,
      dateDisplayFull,
      dateLabel: `${dayOfWeek}, ${dateDisplayFull}`
    };
  });
}

/**
 * Lấy danh sách toàn bộ 45 tuần trong năm học
 */
export function getAllWeeksInYear(academicYear: string = '2026–2027'): SchoolWeekInfo[] {
  const weeks: SchoolWeekInfo[] = [];
  for (let i = 1; i <= 45; i++) {
    weeks.push(getWeekInfoByNumber(i, academicYear));
  }
  return weeks;
}

/**
 * Xác định tuần học tương ứng với ngày tham chiếu (mặc định là hôm nay)
 */
export function getCurrentSchoolWeekInfo(referenceDate: Date = new Date(), academicYear: string = '2026–2027'): SchoolWeekInfo {
  const startMonday = getSchoolYearStartMonday(academicYear);
  const refMonday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  refMonday.setHours(0, 0, 0, 0);

  const diffWeeks = differenceInCalendarWeeks(refMonday, startMonday, { weekStartsOn: 1 });
  let weekNum = diffWeeks + 1;

  if (weekNum < 1) weekNum = 1;
  if (weekNum > 45) weekNum = 45;

  return getWeekInfoByNumber(weekNum, academicYear);
}

/**
 * Tự động xác định Quá hạn khi:
 * Ngày hiện tại > Hạn hoàn thành và công việc chưa hoàn thành.
 */
export function isTaskOverdue(task: WorkAssignment, now: Date = new Date()): boolean {
  const isCompleted = 
    task.status === 'Hoàn thành' || 
    task.status === 'Hoàn thành tốt' || 
    task.status === 'Đã hoàn thành' ||
    task.status === 'Đã đánh giá';

  if (isCompleted) return false;

  if (!task.deadline) return false;
  const d = safeParseDate(task.deadline);
  if (!d) return false;

  const endOfDeadline = new Date(d);
  endOfDeadline.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDeadline.getTime();
}

/**
 * Lấy trạng thái hiệu lực chuẩn hóa của công việc
 */
export function getEffectiveTaskStatus(task: WorkAssignment, now: Date = new Date()): WorkAssignmentStatus {
  // 1. Kiểm tra hoàn thành tốt
  if (task.status === 'Hoàn thành tốt' || task.evaluationResult === 'Hoàn thành tốt') {
    return 'Hoàn thành tốt';
  }

  // 2. Kiểm tra hoàn thành
  if (task.status === 'Hoàn thành' || task.status === 'Đã hoàn thành' || task.status === 'Đã đánh giá') {
    return 'Hoàn thành';
  }

  // 3. Tự động xác định Quá hạn khi: Ngày hiện tại > Hạn hoàn thành và công việc chưa hoàn thành
  if (isTaskOverdue(task, now)) {
    return 'Quá hạn';
  }

  // 4. Các trạng thái khác
  if (task.status === 'Chậm tiến độ') {
    return 'Chậm tiến độ';
  }
  if (task.status === 'Đang thực hiện') {
    return 'Đang thực hiện';
  }

  return 'Chưa thực hiện';
}

/**
 * Chuẩn hóa chuỗi năm học để so sánh (thay en-dash bằng gạch nối)
 */
function normalizeYear(yearStr?: string): string {
  if (!yearStr) return '';
  return yearStr.replace(/[–—]/g, '-').trim();
}

/**
 * Kiểm tra xem công việc có thuộc tuần đang chọn hay không
 */
export function isTaskInWeek(task: WorkAssignment, weekInfo: SchoolWeekInfo, academicYear?: string): boolean {
  // 1. Nếu task có gắn academic_year hoặc academicYear, kiểm tra sự khớp nối
  if (academicYear) {
    const taskYear = normalizeYear(task.academic_year || task.academicYear);
    const selectedYear = normalizeYear(academicYear);
    if (taskYear && selectedYear && taskYear !== selectedYear) {
      return false;
    }
  }

  // 2. Kiểm tra số tuần trực tiếp nếu có trường week_number hoặc weekNumber
  const taskWeekNumber = task.week_number ?? task.weekNumber;
  if (taskWeekNumber !== undefined && taskWeekNumber !== null) {
    return Number(taskWeekNumber) === weekInfo.weekNumber;
  }

  // 3. Kiểm tra weekLabel nếu có chứa "Tuần X" hoặc "Tuần 0X"
  if (task.weekLabel) {
    const norm = task.weekLabel.trim().toLowerCase();
    const padStr = `tuần ${String(weekInfo.weekNumber).padStart(2, '0')}`;
    const unpadStr = `tuần ${weekInfo.weekNumber}`;
    if (norm === padStr || norm === unpadStr || norm.includes(padStr) || norm.includes(unpadStr)) {
      return true;
    }
  }

  const weekStart = weekInfo.startDate.getTime();
  const weekEnd = weekInfo.endDate.getTime();

  // 4. Kiểm tra ngày giao (workDate)
  if (task.workDate) {
    const d = safeParseDate(task.workDate);
    if (d) {
      const time = d.getTime();
      if (time >= weekStart && time <= weekEnd) {
        return true;
      }
    }
  }

  // 5. Kiểm tra hạn hoàn thành (deadline)
  if (task.deadline) {
    const d = safeParseDate(task.deadline);
    if (d) {
      const time = d.getTime();
      if (time >= weekStart && time <= weekEnd) {
        return true;
      }
    }
  }

  return false;
}

export const ALL_MONTH_OPTIONS = [
  'Tháng 01',
  'Tháng 02',
  'Tháng 03',
  'Tháng 04',
  'Tháng 05',
  'Tháng 06',
  'Tháng 07',
  'Tháng 08',
  'Tháng 09',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12'
];

export function getMonthNumberFromLabel(monthLabel: string = 'Tháng 09'): number {
  const match = monthLabel.match(/\d+/);
  return match ? parseInt(match[0], 10) : 9;
}

/**
 * Kiểm tra xem 1 tuần có thuộc về tháng đánh giá hay không (dựa trên ngày giữa tuần - Thứ Năm)
 */
export function isWeekInMonth(weekNumber: number, monthNum: number, academicYear: string = '2026–2027'): boolean {
  const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);
  const midWeek = addDays(weekInfo.startDate, 3); // Thứ Năm
  return (midWeek.getMonth() + 1) === monthNum;
}

/**
 * Lấy danh sách các tuần thuộc về 1 tháng trong năm học
 */
export function getWeeksForMonth(monthNum: number, academicYear: string = '2026–2027'): number[] {
  const allWeeks = getAllWeeksInYear(academicYear);
  const matched: number[] = [];
  for (const w of allWeeks) {
    const midWeek = addDays(w.startDate, 3);
    if ((midWeek.getMonth() + 1) === monthNum) {
      matched.push(w.weekNumber);
    }
  }
  return matched;
}

/**
 * Lấy ngày mặc định (YYYY-MM-DD) phù hợp với tháng và tuần
 */
export function getDefaultDateForMonthAndWeek(
  monthNum: number,
  weekNumber: number,
  academicYear: string = '2026–2027'
): string {
  const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);
  const midWeek = addDays(weekInfo.startDate, 2); // Thứ Tư
  if ((midWeek.getMonth() + 1) === monthNum) {
    return format(midWeek, 'yyyy-MM-dd');
  }
  // Nếu tuần không thuộc tháng, lấy ngày giữa tháng đó (ngày 15)
  const startYear = parseStartYear(academicYear);
  const year = monthNum >= 8 ? startYear : startYear + 1;
  const targetDate = new Date(year, monthNum - 1, 15);
  return format(targetDate, 'yyyy-MM-dd');
}

export interface AssessmentScopeInfo {
  scope: 'week' | 'month' | 'year';
  label: string;
  startDateIso: string;
  endDateIso: string;
  targetWeekNumbers?: number[];
  monthNumber?: number;
  weekNumber?: number;
}

/**
 * Hàm hỗ trợ lấy phạm vi đánh giá rèn luyện (Tuần / Tháng / Năm)
 */
export function getAssessmentScope(
  scope: 'week' | 'month' | 'year',
  academicYear: string = '2026–2027',
  monthNumber: number = 9,
  weekNumber: number = 1
): AssessmentScopeInfo {
  const startYear = parseStartYear(academicYear);

  if (scope === 'week') {
    const wInfo = getWeekInfoByNumber(weekNumber, academicYear);
    return {
      scope: 'week',
      label: `TUẦN ${String(weekNumber).padStart(2, '0')}`,
      startDateIso: wInfo.startDateIso,
      endDateIso: wInfo.endDateIso,
      weekNumber
    };
  }

  if (scope === 'month') {
    const yr = monthNumber >= 8 ? startYear : startYear + 1;
    const monthStartIso = `${yr}-${String(monthNumber).padStart(2, '0')}-01`;
    const lastDay = new Date(yr, monthNumber, 0).getDate();
    const monthEndIso = `${yr}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const targetWeekNumbers = getWeeksForMonth(monthNumber, academicYear);

    return {
      scope: 'month',
      label: `THÁNG ${String(monthNumber).padStart(2, '0')}`,
      startDateIso: monthStartIso,
      endDateIso: monthEndIso,
      targetWeekNumbers,
      monthNumber
    };
  }

  const yearStartIso = `${startYear}-09-01`;
  const yearEndIso = `${startYear + 1}-08-31`;
  return {
    scope: 'year',
    label: `CẢ NĂM HỌC ${academicYear}`,
    startDateIso: yearStartIso,
    endDateIso: yearEndIso
  };
}
