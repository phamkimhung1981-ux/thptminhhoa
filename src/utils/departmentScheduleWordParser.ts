import mammoth from 'mammoth';
import { DepartmentScheduleDayItem, ParsedWordScheduleResult } from '../types/departmentSchedule';

const DAY_DEFINITIONS = [
  { key: 'thứ hai', altKeys: ['thứ 2', 'thứ hai', 'thu hai', 'thu 2', 'thứ hai,', 't2', 'thứ hai (', 'thứ 2 ('], label: 'Thứ Hai' },
  { key: 'thứ ba', altKeys: ['thứ 3', 'thứ ba', 'thu ba', 'thu 3', 'thứ ba,', 't3', 'thứ ba (', 'thứ 3 ('], label: 'Thứ Ba' },
  { key: 'thứ tư', altKeys: ['thứ 4', 'thứ tư', 'thu tu', 'thu 4', 'thứ tư,', 't4', 'thứ tư (', 'thứ 4 ('], label: 'Thứ Tư' },
  { key: 'thứ năm', altKeys: ['thứ 5', 'thứ năm', 'thu nam', 'thu 5', 'thứ năm,', 't5', 'thứ năm (', 'thứ 5 ('], label: 'Thứ Năm' },
  { key: 'thứ sáu', altKeys: ['thứ 6', 'thứ sáu', 'thu sau', 'thu 6', 'thứ sáu,', 't6', 'thứ sáu (', 'thứ 6 ('], label: 'Thứ Sáu' },
  { key: 'thứ bảy', altKeys: ['thứ 7', 'thứ bảy', 'thu bay', 'thu 7', 'thứ bảy,', 't7', 'thứ bảy (', 'thứ 7 ('], label: 'Thứ Bảy' },
  { key: 'chủ nhật', altKeys: ['chủ nhật', 'chu nhat', 'cn', 'chủ nhật,', 'chủ nhật (', 'cn ('], label: 'Chủ Nhật' },
];

/**
 * Parses a Word document (.docx) containing the Department Weekly Task Schedule
 */
export async function parseDepartmentScheduleWord(file: File | ArrayBuffer): Promise<ParsedWordScheduleResult> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const warnings: string[] = [];

  try {
    // 1. Convert Word to HTML for structured table parsing
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    
    const htmlString = htmlResult.value || '';
    const rawText = rawTextResult.value || '';

    // Initialize result with defaults
    let schoolName = 'TRƯỜNG THPT MINH HÒA';
    let departmentName = '';
    let weekNumber = 1;
    let startDate = '';
    let endDate = '';
    let currentYear = new Date().getFullYear();

    // 2. Parse metadata from raw text / headings
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Parse School Name
    const schoolMatch = lines.find(l => /trường\s+thpt/i.test(l));
    if (schoolMatch) {
      schoolName = schoolMatch.replace(/[.:_…]+$/, '').trim();
    }

    // Parse Department Name (TỔ: ...)
    for (const line of lines) {
      const deptMatch = line.match(/(?:TỔ|Tổ|TỔ CHUYÊN MÔN|Tổ chuyên môn)\s*[:.]\s*([^\n\r]+)/i);
      if (deptMatch && deptMatch[1]) {
        let name = deptMatch[1].replace(/[.:_…]+$/, '').trim();
        // Remove trailing dots or underscores if they are placeholder lines
        if (name && !/^[\.\_\-\s]+$/.test(name)) {
          departmentName = name;
          break;
        }
      }
    }

    // Parse Week Number (TUẦN: ...)
    for (const line of lines) {
      const weekMatch = line.match(/(?:TUẦN|Tuần)\s*[:.]?\s*(\d+)/i);
      if (weekMatch && weekMatch[1]) {
        weekNumber = parseInt(weekMatch[1], 10);
        break;
      }
    }

    // Parse Date Range (Từ ngày ... tháng ... đến ngày ... tháng ... năm ...)
    for (const line of lines) {
      // Pattern: Từ ngày 22 tháng 09 đến ngày 28 tháng 09 năm 2026
      const dateRangeMatch = line.match(/từ\s*(?:ngày\s*)?(\d{1,2})\s*(?:tháng|\/)\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?\s*(?:đến\s*(?:ngày\s*)?)(\d{1,2})\s*(?:tháng|\/)\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?/i);
      if (dateRangeMatch) {
        const startDay = dateRangeMatch[1].padStart(2, '0');
        const startMonth = dateRangeMatch[2].padStart(2, '0');
        const matchedYear1 = dateRangeMatch[3];
        const endDay = dateRangeMatch[4].padStart(2, '0');
        const endMonth = dateRangeMatch[5].padStart(2, '0');
        const matchedYear2 = dateRangeMatch[6];

        const yr = parseInt(matchedYear2 || matchedYear1 || String(currentYear), 10);
        currentYear = yr;
        startDate = `${yr}-${startMonth}-${startDay}`;
        endDate = `${yr}-${endMonth}-${endDay}`;
        break;
      }

      // Check year in line like "năm 2026"
      const yearMatch = line.match(/năm\s*(\d{4})/i);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1], 10);
      }
    }

    // 3. Initialize default 7 days structure
    const days: DepartmentScheduleDayItem[] = DAY_DEFINITIONS.map((def, idx) => {
      // Calculate tentative date if startDate is found
      let dayDate = '';
      let dateDisplay = '';
      if (startDate) {
        try {
          const d = new Date(startDate);
          d.setDate(d.getDate() + idx);
          dayDate = d.toISOString().split('T')[0];
          dateDisplay = `${def.label}, ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        } catch {
          // ignore
        }
      }

      return {
        id: `day_${idx}_${Date.now()}`,
        dayOfWeek: def.label,
        date: dayDate,
        dateDisplay: dateDisplay || def.label,
        morningTasks: '',
        afternoonTasks: '',
        dutyLeaderOrEvaluation: '',
        notes: '',
        assignedTeachers: [],
        status: 'pending'
      };
    });

    // 4. Parse Tables using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));

    let foundTable = false;

    if (tables.length > 0) {
      // Find the most appropriate table (has rows containing day names or "Sáng" / "Chiều")
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length < 2) continue;

        // Check if table contains keywords
        const tableText = (table.textContent || '').toLowerCase();
        const hasScheduleKeywords = tableText.includes('sáng') || tableText.includes('chiều') || tableText.includes('thứ') || tableText.includes('nội dung');

        if (!hasScheduleKeywords) continue;

        foundTable = true;

        // Process rows
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          const cells = Array.from(row.querySelectorAll('td, th')).map(c => {
            // Replace <p> tags with newlines to preserve bullet points / paragraphs
            const paragraphs = Array.from(c.querySelectorAll('p')).map(p => (p.textContent || '').trim()).filter(Boolean);
            if (paragraphs.length > 1) {
              return paragraphs.join('\n');
            }
            return (c.textContent || '').trim();
          });

          if (cells.length === 0) continue;

          // Check if this row represents a day of the week
          const firstCellText = cells[0].toLowerCase();
          
          let matchedDayIdx = -1;
          for (let d = 0; d < DAY_DEFINITIONS.length; d++) {
            const def = DAY_DEFINITIONS[d];
            if (def.altKeys.some(k => firstCellText.includes(k))) {
              matchedDayIdx = d;
              break;
            }
          }

          if (matchedDayIdx !== -1) {
            // Found a matching day row!
            // Format of table has columns:
            // 0: Thứ, ngày
            // 1: Sáng - Nội dung công việc
            // 2: Chiều - Nội dung công việc
            // 3: Lãnh đạo trực/đánh giá
            // 4: Ghi chú
            const morning = cells[1] || '';
            const afternoon = cells[2] || '';
            const duty = cells[3] || '';
            const note = cells[4] || '';

            // Extract date from cell 0 if present (e.g., "Thứ Hai, 22/09/2026" or "22/09")
            const dateMatch = cells[0].match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
            if (dateMatch) {
              const dDay = dateMatch[1].padStart(2, '0');
              const dMonth = dateMatch[2].padStart(2, '0');
              const dYear = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : currentYear;
              days[matchedDayIdx].date = `${dYear}-${dMonth}-${dDay}`;
              days[matchedDayIdx].dateDisplay = `${DAY_DEFINITIONS[matchedDayIdx].label}, ${dDay}/${dMonth}/${dYear}`;
            }

            // Append or assign tasks (clean placeholder dots)
            const cleanText = (txt: string) => {
              const trimmed = txt.trim();
              if (/^[\.\_\-\s…]+$/.test(trimmed)) return '';
              return trimmed;
            };

            days[matchedDayIdx].morningTasks = cleanText(morning);
            days[matchedDayIdx].afternoonTasks = cleanText(afternoon);
            days[matchedDayIdx].dutyLeaderOrEvaluation = cleanText(duty);
            days[matchedDayIdx].notes = cleanText(note);
          }
        }

        // If we found and parsed this table successfully, stop searching other tables
        if (days.some(d => d.morningTasks || d.afternoonTasks || d.dutyLeaderOrEvaluation)) {
          break;
        }
      }
    }

    // 5. Fallback parsing if no table or empty days
    const hasAnyTask = days.some(d => d.morningTasks || d.afternoonTasks);
    if (!hasAnyTask) {
      warnings.push('Không tìm thấy bảng lịch định dạng chuẩn trong tài liệu hoặc các ô không có nội dung.');
    }

    // Autocomplete department name if missing
    if (!departmentName) {
      departmentName = 'Tổ chuyên môn';
    }

    return {
      success: true,
      schoolName,
      departmentName,
      weekNumber: weekNumber || 1,
      startDate: startDate || '',
      endDate: endDate || '',
      year: currentYear,
      days,
      rawText,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error: any) {
    console.error('Error parsing Word document for department schedule:', error);
    return {
      success: false,
      schoolName: 'TRƯỜNG THPT MINH HÒA',
      departmentName: 'Tổ chuyên môn',
      weekNumber: 1,
      startDate: '',
      endDate: '',
      year: new Date().getFullYear(),
      days: DAY_DEFINITIONS.map((def, idx) => ({
        id: `day_${idx}_${Date.now()}`,
        dayOfWeek: def.label,
        date: '',
        dateDisplay: def.label,
        morningTasks: '',
        afternoonTasks: '',
        dutyLeaderOrEvaluation: '',
        notes: '',
        assignedTeachers: [],
        status: 'pending'
      })),
      warnings: [`Lỗi khi đọc file Word: ${error.message || 'Tệp không hợp lệ'}`]
    };
  }
}
