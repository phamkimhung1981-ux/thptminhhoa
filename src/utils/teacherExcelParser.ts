import * as XLSX from 'xlsx';
import { Department, Teacher } from '../types';

export interface ParsedTeacherRow {
  rowNumber: number; // Dòng thực tế trên Excel (bắt đầu từ 2 nếu header ở dòng 1)
  rawCode: string;
  code: string;
  name: string;
  role: 'BGH' | 'TTCM' | 'GIAO_VIEN' | 'NHAN_VIEN';
  roleDisplay: string;
  position?: string;
  rawDepartment: string;
  departmentId: string;
  departmentName: string;
  subject: string;
  status: 'Đang công tác' | 'Nghỉ phép' | 'Đã nghỉ việc';
  phone: string;
  email: string;
  notes: string;
  isSampleRow: boolean; // Dòng dữ liệu mẫu
  isDuplicateWithExisting: boolean; // Trùng với mã GV đã có trong hệ thống
  existingTeacherName?: string;
  isDuplicateInFile: boolean; // Trùng mã GV với dòng khác trong chính file Excel
  errors: string[]; // Danh sách lỗi ngăn cản import
  warnings: string[]; // Cảnh báo
  isValid: boolean; // Không có lỗi nghiêm trọng
}

export interface ParseExcelResult {
  success: boolean;
  errorMessage?: string;
  fileName: string;
  sheetName: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ParsedTeacherRow[];
}

/**
 * Chuẩn hóa chuỗi văn bản (bỏ dấu tiếng Việt, chữ thường, loại bỏ khoảng trắng thừa)
 */
export function normalizeText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Chuẩn hóa tên cột tiêu đề (bỏ dấu, bỏ ký tự đặc biệt như dấu sao, dấu gạch ngang)
 */
export function normalizeHeader(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse và validate toàn diện file Excel danh sách CBGVNV
 */
export async function parseTeacherExcelFile(
  file: File,
  departments: Department[],
  existingTeachers: Teacher[]
): Promise<ParseExcelResult> {
  const fileName = file.name || 'DanhSach.xlsx';

  // 1. Kiểm tra tồn tại và kích thước file
  if (!file || file.size === 0) {
    return {
      success: false,
      errorMessage: 'File rỗng hoặc không có dữ liệu. Vui lòng kiểm tra lại file của bạn.',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  if (file.size > 25 * 1024 * 1024) {
    return {
      success: false,
      errorMessage: 'Kích thước file vượt quá 25MB. Vui lòng chọn file nhỏ hơn.',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 2. Kiểm tra định dạng file (.xlsx, .xls)
  const isExcelExt = /\.(xlsx|xls)$/i.test(fileName);
  const isExcelMime = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel';
  if (!isExcelExt && !isExcelMime) {
    return {
      success: false,
      errorMessage: 'Định dạng file không hợp lệ. Vui lòng chọn file Excel (.xlsx hoặc .xls).',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 3. Đọc dữ liệu nhị phân của file (hỗ trợ cả file.arrayBuffer() lẫn FileReader fallback)
  let arrayBuffer: ArrayBuffer;
  try {
    if (typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Lỗi FileReader khi đọc file'));
        reader.readAsArrayBuffer(file);
      });
    }
  } catch (err: any) {
    console.error('Lỗi khi đọc file buffer:', err);
    return {
      success: false,
      errorMessage: 'Không thể đọc nội dung file Excel. Vui lòng kiểm tra lại file của bạn.',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 4. Phân tích Workbook với thư viện XLSX
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (err: any) {
    console.error('Lỗi XLSX.read:', err);
    return {
      success: false,
      errorMessage: 'Không thể đọc file Excel. Vui lòng kiểm tra file hoặc tải file mẫu mới.',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return {
      success: false,
      errorMessage: 'File Excel không có trang tính (worksheet) nào.',
      fileName,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 5. Chọn worksheet thích hợp:
  // Ưu tiên sheet có chứa "DANH_SACH_CBGVNV" hoặc "CBGVNV" hoặc "DanhSachGV"
  // Tuyệt đối không chọn sheet "HUONG_DAN" nếu có sheet dữ liệu khác
  let targetSheetName = wb.SheetNames.find(n => {
    const norm = normalizeText(n);
    return norm.includes('danh sach cbgvnv') || norm.includes('cbgvnv') || norm.includes('danhsachgv');
  });

  if (!targetSheetName) {
    targetSheetName = wb.SheetNames.find(n => {
      const norm = normalizeText(n);
      return !norm.includes('huong dan') && !norm.includes('guide') && !norm.includes('instruction');
    });
  }

  if (!targetSheetName) {
    targetSheetName = wb.SheetNames[0];
  }

  const ws = wb.Sheets[targetSheetName];
  if (!ws) {
    return {
      success: false,
      errorMessage: 'Không tìm thấy dữ liệu trong trang tính được chọn.',
      fileName,
      sheetName: targetSheetName,
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 6. Đọc toàn bộ ma trận dữ liệu dạng 2 chiều (mảng các dòng)
  const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (!matrix || matrix.length === 0) {
    return {
      success: false,
      errorMessage: 'Trang tính rỗng hoặc không có dữ liệu nào.',
      fileName,
      sheetName: targetSheetName,
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 7. Nhận diện dòng TIÊU ĐỀ (Header Row) thông minh
  // Quét 10 dòng đầu tiên của sheet để tìm dòng chứa các cột: Họ và tên, Mã GV, Chức vụ, Tổ chuyên môn...
  let headerRowIndex = -1;
  const colIndexMap = {
    name: -1,
    code: -1,
    role: -1,
    dept: -1,
    subject: -1,
    status: -1,
    phone: -1,
    email: -1,
    notes: -1
  };

  const matchHeaderKey = (hNorm: string): keyof typeof colIndexMap | null => {
    if (
      hNorm === 'ho va ten' || 
      hNorm === 'ho ten' || 
      hNorm === 'fullname' || 
      hNorm === 'ten' || 
      hNorm === 'ho va ten cbgvnv' ||
      hNorm === 'giao vien'
    ) return 'name';

    if (
      hNorm === 'ma gv' || 
      hNorm === 'ma giao vien' || 
      hNorm === 'ma cbgvnv' || 
      hNorm === 'magv' || 
      hNorm === 'code' || 
      hNorm === 'ma can bo' ||
      hNorm === 'ma nv'
    ) return 'code';

    if (
      hNorm === 'chuc vu' || 
      hNorm === 'chuc danh' || 
      hNorm === 'vi tri' || 
      hNorm === 'role' || 
      hNorm === 'position'
    ) return 'role';

    if (
      hNorm === 'to chuyen mon' || 
      hNorm === 'to bo mon' || 
      hNorm === 'to' || 
      hNorm === 'to cm' || 
      hNorm === 'department' || 
      hNorm === 'dept' ||
      hNorm === 'don vi'
    ) return 'dept';

    if (
      hNorm === 'mon giang day' || 
      hNorm === 'mon day' || 
      hNorm === 'mon hoc' || 
      hNorm === 'mon' || 
      hNorm === 'subject'
    ) return 'subject';

    if (
      hNorm === 'trang thai' || 
      hNorm === 'tinh trang' || 
      hNorm === 'status'
    ) return 'status';

    if (
      hNorm === 'so dien thoai' || 
      hNorm === 'dien thoai' || 
      hNorm === 'sdt' || 
      hNorm === 'phone' || 
      hNorm === 'mobile'
    ) return 'phone';

    if (
      hNorm === 'email' || 
      hNorm === 'mail' || 
      hNorm === 'hom thu'
    ) return 'email';

    if (
      hNorm === 'ghi chu' || 
      hNorm === 'note' || 
      hNorm === 'notes'
    ) return 'notes';

    return null;
  };

  const maxScanRows = Math.min(matrix.length, 12);
  for (let r = 0; r < maxScanRows; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    const tempMap = { ...colIndexMap };
    let matchCount = 0;

    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      const hNorm = normalizeHeader(cellVal);
      if (!hNorm) continue;

      const fieldKey = matchHeaderKey(hNorm);
      if (fieldKey && tempMap[fieldKey] === -1) {
        tempMap[fieldKey] = c;
        matchCount++;
      }
    }

    // Nếu dòng này tìm thấy ít nhất 2 cột khớp (hoặc có cột Họ và tên / Mã GV)
    if (matchCount >= 2 || (tempMap.name !== -1 && tempMap.dept !== -1) || (tempMap.name !== -1 && tempMap.code !== -1)) {
      headerRowIndex = r;
      Object.assign(colIndexMap, tempMap);
      break;
    }
  }

  // 8. Nếu không tìm thấy dòng tiêu đề hợp lệ
  if (headerRowIndex === -1 || (colIndexMap.name === -1 && colIndexMap.code === -1)) {
    return {
      success: false,
      errorMessage: 'File Excel không đúng cấu trúc mẫu. Vui lòng tải file mẫu mới và nhập lại.',
      fileName,
      sheetName: targetSheetName,
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: []
    };
  }

  // 9. Bản đồ tra cứu giáo viên hiện có trong hệ thống theo Mã GV
  const existingTeachersMap = new Map<string, Teacher>();
  existingTeachers.forEach(t => {
    if (t.code) {
      existingTeachersMap.set(t.code.trim().toUpperCase(), t);
    }
  });

  const parsedRows: ParsedTeacherRow[] = [];
  const seenCodesInFile = new Map<string, number>();

  // 10. Duyệt qua từng dòng dữ liệu phía dưới dòng tiêu đề
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const excelLineNumber = r + 1; // Số dòng thực tế trên Excel (1-based)

    const rawName = colIndexMap.name !== -1 ? String(row[colIndexMap.name] ?? '').trim() : '';
    const rawCode = colIndexMap.code !== -1 ? String(row[colIndexMap.code] ?? '').trim() : '';
    const rawRole = colIndexMap.role !== -1 ? String(row[colIndexMap.role] ?? '').trim() : '';
    const rawDept = colIndexMap.dept !== -1 ? String(row[colIndexMap.dept] ?? '').trim() : '';
    const rawSubject = colIndexMap.subject !== -1 ? String(row[colIndexMap.subject] ?? '').trim() : '';
    const rawStatus = colIndexMap.status !== -1 ? String(row[colIndexMap.status] ?? '').trim() : '';
    const rawPhone = colIndexMap.phone !== -1 ? String(row[colIndexMap.phone] ?? '').trim() : '';
    const rawEmail = colIndexMap.email !== -1 ? String(row[colIndexMap.email] ?? '').trim() : '';
    const rawNotes = colIndexMap.notes !== -1 ? String(row[colIndexMap.notes] ?? '').trim() : '';

    // Bỏ qua dòng hoàn toàn trống
    if (!rawName && !rawCode && !rawRole && !rawDept && !rawSubject && !rawPhone && !rawEmail && !rawNotes) {
      continue;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Kiểm tra xem có phải dòng dữ liệu mẫu hay không
    const isSampleRow = rawName.includes('(DỮ LIỆU MẪU)') || 
                        rawName.includes('[DỮ LIỆU MẪU]') || 
                        rawCode.startsWith('GV_MAU') || 
                        rawCode.startsWith('NV_MAU');

    // === VALIDATE HỌ VÀ TÊN ===
    let cleanName = rawName;
    if (!cleanName) {
      errors.push(`Dòng ${excelLineNumber}: thiếu Họ và tên. (Cột: Họ và tên)`);
    }

    // === VALIDATE MÃ GV ===
    let cleanCode = rawCode.toUpperCase();
    if (!cleanCode) {
      cleanCode = `GV${Math.floor(1000 + Math.random() * 9000)}`;
      warnings.push(`Chưa có Mã GV, hệ thống tự động gán mã: ${cleanCode}`);
    }

    // Kiểm tra trùng Mã GV trong chính file Excel
    let isDuplicateInFile = false;
    if (seenCodesInFile.has(cleanCode)) {
      isDuplicateInFile = true;
      errors.push(`Dòng ${excelLineNumber}: Trùng Mã GV "${cleanCode}" với Dòng ${seenCodesInFile.get(cleanCode)} trong file. (Cột: Mã GV)`);
    } else {
      seenCodesInFile.set(cleanCode, excelLineNumber);
    }

    // Kiểm tra trùng Mã GV với hệ thống
    let isDuplicateWithExisting = false;
    let existingTeacherName: string | undefined = undefined;
    if (existingTeachersMap.has(cleanCode)) {
      isDuplicateWithExisting = true;
      const existTeacher = existingTeachersMap.get(cleanCode)!;
      existingTeacherName = existTeacher.name;
      warnings.push(`Mã GV "${cleanCode}" đã tồn tại trên hệ thống (Giáo viên: ${existTeacher.name}).`);
    }

    // === VALIDATE CHỨC VỤ ===
    const normRole = normalizeText(rawRole);
    let role: 'BGH' | 'TTCM' | 'GIAO_VIEN' | 'NHAN_VIEN' = 'GIAO_VIEN';
    let roleDisplay = 'Giáo viên';
    let position: string | undefined = undefined;

    if (!rawRole) {
      errors.push(`Dòng ${excelLineNumber}: thiếu Chức vụ. (Cột: Chức vụ)`);
    } else if (normRole.includes('hieu truong') && !normRole.includes('pho')) {
      role = 'BGH';
      roleDisplay = 'Hiệu trưởng';
      position = 'Hiệu trưởng';
    } else if (normRole.includes('pho hieu truong') || normRole.includes('pht') || normRole.includes('pho ht')) {
      role = 'BGH';
      roleDisplay = 'Phó Hiệu trưởng';
      position = 'Phó Hiệu trưởng';
    } else if (normRole.includes('to truong') || normRole.includes('ttcm')) {
      role = 'TTCM';
      roleDisplay = 'Tổ trưởng';
      position = 'Tổ trưởng';
    } else if (normRole.includes('to pho') || normRole.includes('tpcm')) {
      role = 'GIAO_VIEN';
      roleDisplay = 'Tổ phó';
      position = 'Tổ phó';
    } else if (
      normRole.includes('nhan vien') || 
      normRole.includes('nv') || 
      normRole.includes('ke toan') || 
      normRole.includes('van thu') || 
      normRole.includes('y te') || 
      normRole.includes('thu vien') ||
      normRole.includes('thu quy') ||
      normRole.includes('thiet bi')
    ) {
      role = 'NHAN_VIEN';
      roleDisplay = 'Nhân viên';
      position = rawRole || 'Nhân viên';
    } else if (normRole.includes('giao vien') || normRole.includes('gv') || normRole.includes('giang vien')) {
      role = 'GIAO_VIEN';
      roleDisplay = 'Giáo viên';
      position = 'Giáo viên';
    } else {
      errors.push(`Dòng ${excelLineNumber}: Chức vụ "${rawRole}" không hợp lệ. (Cột: Chức vụ)`);
    }

    // === VALIDATE TỔ CHUYÊN MÔN ===
    const normDept = normalizeText(rawDept);
    let matchedDept: Department | undefined = undefined;

    if (!rawDept) {
      errors.push(`Dòng ${excelLineNumber}: thiếu Tổ chuyên môn. (Cột: Tổ chuyên môn)`);
    } else {
      // 1. Khớp chính xác theo tên
      matchedDept = departments.find(d => {
        const dNorm = normalizeText(d.name);
        return dNorm === normDept;
      });

      // 2. Khớp gần đúng (chứa từ khóa)
      if (!matchedDept) {
        matchedDept = departments.find(d => {
          const dNorm = normalizeText(d.name);
          return dNorm.includes(normDept) || normDept.includes(dNorm);
        });
      }

      // 3. Khớp thông minh các từ khóa chuyên môn phổ biến
      if (!matchedDept) {
        if (normDept.includes('toan') || normDept.includes('tin') || normDept.includes('ly') || normDept.includes('cong nghe')) {
          matchedDept = departments.find(d => normalizeText(d.name).includes('toan'));
        } else if (normDept.includes('van') || normDept.includes('su') || normDept.includes('dia') || normDept.includes('gdkt')) {
          matchedDept = departments.find(d => normalizeText(d.name).includes('van'));
        } else if (normDept.includes('hoa') || normDept.includes('sinh') || normDept.includes('gdqpan') || normDept.includes('ngoai ngu') || normDept.includes('tieng anh')) {
          matchedDept = departments.find(d => normalizeText(d.name).includes('hoa') || normalizeText(d.name).includes('sinh'));
        } else if (normDept.includes('van phong') || normDept.includes('hanh chinh')) {
          matchedDept = departments.find(d => normalizeText(d.name).includes('van phong'));
        }
      }

      if (!matchedDept) {
        errors.push(`Dòng ${excelLineNumber}: Tổ chuyên môn không hợp lệ. (Cột: Tổ chuyên môn)`);
      }
    }

    const departmentId = matchedDept ? matchedDept.id : (departments[0]?.id || 'd_toan_ly_tin_cn');
    const departmentName = matchedDept ? matchedDept.name : (rawDept || 'Tổ chuyên môn');

    // === VALIDATE TRẠNG THÁI ===
    const normStatus = normalizeText(rawStatus);
    let status: 'Đang công tác' | 'Nghỉ phép' | 'Đã nghỉ việc' = 'Đang công tác';

    if (!rawStatus) {
      status = 'Đang công tác'; // Mặc định hợp lệ
    } else if (normStatus.includes('dang cong tac') || normStatus.includes('cong tac') || normStatus.includes('lam viec') || normStatus === 'active') {
      status = 'Đang công tác';
    } else if (normStatus.includes('nghi phep') || normStatus.includes('tam nghi') || normStatus === 'leave') {
      status = 'Nghỉ phép';
    } else if (normStatus.includes('nghi viec') || normStatus.includes('da nghi') || normStatus.includes('thoi viec') || normStatus === 'retired') {
      status = 'Đã nghỉ việc';
    } else {
      errors.push(`Dòng ${excelLineNumber}: Trạng thái không hợp lệ. (Cột: Trạng thái)`);
    }

    const isValid = errors.length === 0;

    parsedRows.push({
      rowNumber: excelLineNumber,
      rawCode,
      code: cleanCode,
      name: cleanName,
      role,
      roleDisplay,
      position,
      rawDepartment: rawDept,
      departmentId,
      departmentName,
      subject: rawSubject,
      status,
      phone: rawPhone,
      email: rawEmail,
      notes: rawNotes,
      isSampleRow,
      isDuplicateWithExisting,
      existingTeacherName,
      isDuplicateInFile,
      errors,
      warnings,
      isValid
    });
  }

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicateWithExisting).length;
  const duplicateCount = parsedRows.filter(r => r.isValid && r.isDuplicateWithExisting).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return {
    success: true,
    fileName,
    sheetName: targetSheetName,
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    rows: parsedRows
  };
}
