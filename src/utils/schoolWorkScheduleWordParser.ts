import mammoth from 'mammoth';
import { SchoolWorkSchedule, SchoolWorkDay, SchoolWorkItem } from '../types/schoolWorkSchedule';
import { getWeekInfoByNumber } from './schoolWeekUtils';

const DAY_MAP = [
  { key: 'thứ 2', aliases: ['thứ hai', 'thu 2', 'thu hai', 't2', 'thứ 2,'], name: 'Thứ 2', idx: 0 },
  { key: 'thứ 3', aliases: ['thứ ba', 'thu 3', 'thu ba', 't3', 'thứ 3,'], name: 'Thứ 3', idx: 1 },
  { key: 'thứ 4', aliases: ['thứ tư', 'thứ 4', 'thu tu', 'thu 4', 't4', 'thứ 4,'], name: 'Thứ 4', idx: 2 },
  { key: 'thứ 5', aliases: ['thứ năm', 'thứ 5', 'thu nam', 'thu 5', 't5', 'thứ 5,'], name: 'Thứ 5', idx: 3 },
  { key: 'thứ 6', aliases: ['thứ sáu', 'thứ 6', 'thu sau', 'thu 6', 't6', 'thứ 6,'], name: 'Thứ 6', idx: 4 },
  { key: 'thứ 7', aliases: ['thứ bảy', 'thứ 7', 'thu bay', 'thu 7', 't7', 'thứ 7,'], name: 'Thứ 7', idx: 5 },
  { key: 'chủ nhật', aliases: ['chu nhat', 'cn', 'chủ nhật,', 'cn,'], name: 'Chủ nhật', idx: 6 }
];

function extractTaskItems(text: string, timeSlot: 'morning' | 'afternoon'): SchoolWorkItem[] {
  if (!text || !text.trim()) return [];

  // Split by newlines, dashes, bullet points or numbered lists
  const lines = text
    .split(/\n|<br\s*\/?>|•|\-|\d+[\.\)]/)
    .map(l => l.trim())
    .filter(l => l.length > 1);

  if (lines.length === 0 && text.trim().length > 1) {
    lines.push(text.trim());
  }

  return lines.map((line, idx) => {
    // Check if there is assignee in parentheses like (Toàn thể GV) or (BGH, Lớp 12C)
    let content = line;
    let assignee: string | undefined = undefined;

    const assigneeMatch = line.match(/\(([^)]+)\)$/);
    if (assigneeMatch && assigneeMatch[1]) {
      const candidate = assigneeMatch[1].trim();
      if (candidate.length < 50) {
        assignee = candidate;
        content = line.replace(/\(([^)]+)\)$/, '').trim();
      }
    }

    return {
      id: `${timeSlot}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      timeSlot,
      content: content.replace(/^[-•*]\s*/, '').trim(),
      assignee,
      status: 'Chưa thực hiện'
    };
  });
}

export async function parseSchoolWorkScheduleWord(
  file: File | ArrayBuffer,
  currentAcademicYear: string = '2026–2027',
  fallbackDeptId: string = 'all'
): Promise<{
  schedule: SchoolWorkSchedule;
  detectedWeek: number;
  detectedDepartment: string;
  detectedYear: string;
}> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

  // 1. Convert Word to HTML and Raw text using mammoth
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });

  const html = htmlResult.value || '';
  const rawText = rawTextResult.value || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let weekNumber = 3;
  let departmentName = 'TOÀN TRƯỜNG';
  let year = currentAcademicYear;

  // Detect Department (TỔ: ...)
  for (const line of lines) {
    const deptMatch = line.match(/(?:TỔ|Tổ|TỔ CHUYÊN MÔN|Tổ chuyên môn)\s*[:.]\s*([^\n\r]+)/i);
    if (deptMatch && deptMatch[1]) {
      const clean = deptMatch[1].replace(/[.:_…]+$/, '').trim();
      if (clean && !/^[\.\_\-\s]+$/.test(clean)) {
        departmentName = clean;
        break;
      }
    }
  }

  // Detect Week (TUẦN: ...)
  for (const line of lines) {
    const weekMatch = line.match(/(?:TUẦN|Tuần)\s*[:.]?\s*(\d+)/i);
    if (weekMatch && weekMatch[1]) {
      weekNumber = parseInt(weekMatch[1], 10);
      break;
    }
  }

  // Build base week info
  const weekInfo = getWeekInfoByNumber(weekNumber, year);
  const startDate = new Date(weekInfo.startDateIso);

  // Initialize 7 days
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const days: SchoolWorkDay[] = dayNames.map((dName, idx) => {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + idx);
    const dateStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}`;
    const isoDate = curDate.toISOString().split('T')[0];

    return {
      id: `day_${weekNumber}_${idx}`,
      day_of_week: dName,
      date: isoDate,
      date_str: dateStr,
      morning_tasks: [],
      afternoon_tasks: [],
      completion_date: dateStr,
      duty_evaluator: ''
    };
  });

  // 2. Parse HTML Table
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (table) {
      const rows = Array.from(table.querySelectorAll('tr'));

      // Filter out header rows (rows with <th> or rows having "Thứ, ngày", "Sáng", "Nội dung công việc")
      const dataRows = rows.filter(row => {
        const text = row.textContent?.toLowerCase() || '';
        return !text.includes('thứ, ngày') && !text.includes('sáng') && !text.includes('chiều') && !text.includes('lãnh đạo');
      });

      dataRows.forEach((row, rowIdx) => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length < 2) return;

        const firstCellText = (cells[0].textContent || '').toLowerCase().trim();

        // Match with day of week
        let matchedDayIdx = -1;
        for (const def of DAY_MAP) {
          if (firstCellText.includes(def.key) || def.aliases.some(a => firstCellText.includes(a))) {
            matchedDayIdx = def.idx;
            break;
          }
        }

        // Fallback to row index if exactly 7 rows
        if (matchedDayIdx === -1 && dataRows.length === 7 && rowIdx >= 0 && rowIdx < 7) {
          matchedDayIdx = rowIdx;
        }

        if (matchedDayIdx >= 0 && matchedDayIdx < 7) {
          const targetDay = days[matchedDayIdx];

          // Cells index mapping:
          // Standard table: Cell 0: Day, Cell 1: Morning, Cell 2: Afternoon, Cell 3: Completion Date, Cell 4: Leadership evaluation
          if (cells.length >= 3) {
            const morningText = (cells[1].innerHTML || cells[1].textContent || '')
              .replace(/<p>/gi, '\n')
              .replace(/<\/p>/gi, '')
              .replace(/<br\s*\/?>/gi, '\n');
            const afternoonText = (cells[2].innerHTML || cells[2].textContent || '')
              .replace(/<p>/gi, '\n')
              .replace(/<\/p>/gi, '')
              .replace(/<br\s*\/?>/gi, '\n');

            targetDay.morning_tasks = extractTaskItems(morningText, 'morning');
            targetDay.afternoon_tasks = extractTaskItems(afternoonText, 'afternoon');

            if (cells.length >= 4) {
              const compDate = (cells[3].textContent || '').trim();
              if (compDate) targetDay.completion_date = compDate;
            }

            if (cells.length >= 5) {
              const dutyEval = (cells[4].textContent || '').trim();
              if (dutyEval) targetDay.duty_evaluator = dutyEval;
            }
          }
        }
      });
    }
  }

  const schedule: SchoolWorkSchedule = {
    id: `sws_${year.replace(/[^a-zA-Z0-9]/g, '_')}_w${String(weekNumber).padStart(2, '0')}_${fallbackDeptId}`,
    department_id: fallbackDeptId,
    department_name: departmentName,
    week_number: weekNumber,
    week_start_date: weekInfo.startDateIso,
    week_end_date: weekInfo.endDateIso,
    school_year: year,
    title: `LỊCH CÔNG VIỆC TUẦN ${weekNumber}`,
    days,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return {
    schedule,
    detectedWeek: weekNumber,
    detectedDepartment: departmentName,
    detectedYear: year
  };
}
