import { Department } from '../types';

/**
 * 05 TỔ CHUYÊN MÔN CHÍNH THỨC CỦA TRƯỜNG THPT MINH HÒA
 * (Tuân thủ chính xác từng ký tự, dấu tiếng Việt, gạch nối, khoảng trắng và ký hiệu)
 * 1. Tổ Toán - Công Nghệ
 * 2. Tổ Văn - Sử - Địa- GDKT
 * 3. Tổ Lý - Hóa- Sinh
 * 4. Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN
 * 5. Tổ Văn phòng
 */
export const OFFICIAL_5_DEPARTMENTS: (Department & {
  slug: string;
  subjects: string[];
  description: string;
})[] = [
  {
    id: 'd_toan_cong_nghe',
    name: 'Tổ Toán - Công Nghệ',
    slug: 'toan-cong-nghe',
    headId: 't_gv001',
    description: 'Chuyên môn bộ môn Toán và Công nghệ',
    subjects: ['Toán', 'Toán học', 'Công nghệ']
  },
  {
    id: 'd_van_su_dia_gdkt',
    name: 'Tổ Văn - Sử - Địa- GDKT',
    slug: 'van-su-dia-gdkt',
    headId: 't_gv013',
    description: 'Chuyên môn bộ môn Ngữ văn, Lịch sử, Địa lý, GDKT&PL và Nghệ thuật',
    subjects: ['Ngữ văn', 'Văn', 'Lịch sử', 'Sử', 'Địa lý', 'Địa lí', 'GDKT&PL', 'GDKT', 'Âm nhạc', 'Mỹ thuật', 'Mĩ thuật', 'GDCD']
  },
  {
    id: 'd_ly_hoa_sinh',
    name: 'Tổ Lý - Hóa- Sinh',
    slug: 'ly-hoa-sinh',
    headId: 't_gv027',
    description: 'Chuyên môn bộ môn Vật lý, Hóa học và Sinh học',
    subjects: ['Vật lý', 'Vật lí', 'Hóa học', 'Hóa', 'Sinh học', 'Sinh']
  },
  {
    id: 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan',
    name: 'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN',
    slug: 'ngoai-ngu-tin-hoc-gdtc-gdqpan',
    headId: 't_gv026',
    description: 'Chuyên môn bộ môn Tiếng Anh (Ngoại ngữ), Tin học, GDTC (Thể dục) và GDQP&AN',
    subjects: ['Tiếng Anh', 'Ngoại ngữ', 'Tin học', 'Tin', 'Thể dục', 'GDTC', 'GDQP&AN', 'GDQP-AN', 'Quốc phòng']
  },
  {
    id: 'd_van_phong',
    name: 'Tổ Văn phòng',
    slug: 'van-phong',
    headId: 't_nv001',
    description: 'Bộ phận Văn thư, Kế toán, Thủ quỹ, Y tế, Thư viện, Thiết bị, CNTT và Bảo vệ',
    subjects: ['Văn thư', 'Kế toán', 'Thủ quỹ', 'Y tế', 'Thư viện', 'Thiết bị', 'Hành chính', 'CNTT', 'Bảo vệ']
  }
];

export const OFFICIAL_DEPARTMENT_NAMES = OFFICIAL_5_DEPARTMENTS.map(d => d.name);
export const OFFICIAL_DEPARTMENT_IDS = OFFICIAL_5_DEPARTMENTS.map(d => d.id);

/**
 * Mapping các mã định danh cũ sang mã định danh mới
 */
export const LEGACY_DEPARTMENT_ID_MAP: Record<string, string> = {
  'd_toan_ly_tin_cn': 'd_toan_cong_nghe',
  'toan_ly_tin_cn': 'd_toan_cong_nghe',
  'd_van_su_dia_gdkt_pl_an': 'd_van_su_dia_gdkt',
  'van_su_dia_gdkt_pl_an': 'd_van_su_dia_gdkt',
  'd_hoa_ly_sinh_gdqpan_nn': 'd_ly_hoa_sinh', // Default fallback or resolved by teacher subject
  'hoa_ly_sinh_gdqpan_nn': 'd_ly_hoa_sinh',
  'd1': 'd_toan_cong_nghe',
  'd2': 'd_van_su_dia_gdkt',
  'd3': 'd_ly_hoa_sinh',
  'd4': 'd_van_phong',
  'van_phong': 'd_van_phong',
  'vp': 'd_van_phong'
};

/**
 * Hàm chuẩn hóa văn bản tìm kiếm (bỏ dấu tiếng Việt, viết thường)
 */
export function normalizeText(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Kiểm tra xem một mã tổ có phải là 05 tổ chính thức hay không
 */
export function isOfficialDepartmentId(id?: string): boolean {
  if (!id) return false;
  return OFFICIAL_DEPARTMENT_IDS.includes(id);
}

/**
 * Tìm thông tin tổ chính thức theo id hoặc tên
 */
export function findOfficialDepartment(idOrName?: string) {
  if (!idOrName) return null;
  const trimmed = idOrName.trim();
  // 1. Tìm chính xác theo ID
  const byId = OFFICIAL_5_DEPARTMENTS.find(d => d.id === trimmed);
  if (byId) return byId;

  // 2. Tìm theo mã cũ
  const mappedId = LEGACY_DEPARTMENT_ID_MAP[trimmed];
  if (mappedId) {
    const byMappedId = OFFICIAL_5_DEPARTMENTS.find(d => d.id === mappedId);
    if (byMappedId) return byMappedId;
  }

  // 3. Tìm chính xác theo tên
  const byName = OFFICIAL_5_DEPARTMENTS.find(d => d.name === trimmed);
  if (byName) return byName;

  // 4. Tìm gần đúng không dấu
  const norm = normalizeText(trimmed);
  if (norm.includes('van phong') || norm.includes('hanh chinh')) {
    return OFFICIAL_5_DEPARTMENTS.find(d => d.id === 'd_van_phong') || null;
  }
  if (norm.includes('ngoai ngu') || norm.includes('tieng anh') || norm.includes('gdtc') || norm.includes('the duc') || norm.includes('gdqp') || (norm.includes('tin') && !norm.includes('toan'))) {
    return OFFICIAL_5_DEPARTMENTS.find(d => d.id === 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan') || null;
  }
  if (norm.includes('ly') || norm.includes('li') || norm.includes('hoa') || norm.includes('sinh')) {
    return OFFICIAL_5_DEPARTMENTS.find(d => d.id === 'd_ly_hoa_sinh') || null;
  }
  if (norm.includes('toan') || norm.includes('cong nghe')) {
    return OFFICIAL_5_DEPARTMENTS.find(d => d.id === 'd_toan_cong_nghe') || null;
  }
  if (norm.includes('van') || norm.includes('su') || norm.includes('dia') || norm.includes('gdkt')) {
    return OFFICIAL_5_DEPARTMENTS.find(d => d.id === 'd_van_su_dia_gdkt') || null;
  }

  return null;
}

/**
 * Xác định tổ chuyên môn chính thức dựa trên thông tin giáo viên (môn dạy, chức vụ, mã, vai trò)
 */
export function resolveOfficialDepartmentForTeacher(teacher: {
  id?: string;
  role?: string;
  position?: string;
  subject?: string;
  departmentId?: string;
  departmentName?: string;
}): { id: string; name: string } | null {
  const role = teacher.role || '';
  const pos = normalizeText(teacher.position || '');
  const sub = normalizeText(teacher.subject || '');
  const deptStr = normalizeText(teacher.departmentName || teacher.departmentId || '');

  // 0. Ban Giám hiệu (CBQL)
  if (role === 'BGH' || pos.includes('hieu truong')) {
    return { id: 'd_bgh', name: 'Ban Giám hiệu' };
  }

  // 1. Tổ Văn phòng
  if (
    pos.includes('van phong') || pos.includes('ke toan') || pos.includes('thu quy') ||
    pos.includes('y te') || pos.includes('thu vien') || pos.includes('thiet bi') ||
    pos.includes('bao ve') || pos.includes('hanh chinh') || pos.includes('nhan vien') ||
    sub.includes('van thu') || sub.includes('ke toan') || sub.includes('thu quy') ||
    sub.includes('y te') || sub.includes('thu vien') || sub.includes('thiet bi') ||
    sub.includes('bao ve') || sub.includes('hanh chinh') || (teacher.id && teacher.id.startsWith('t_nv')) ||
    deptStr.includes('van phong')
  ) {
    return { id: 'd_van_phong', name: 'Tổ Văn phòng' };
  }

  // 2. Tổ Lý - Hóa- Sinh
  if (
    sub.includes('vat ly') || sub.includes('vat li') || sub.includes('hoa') || sub.includes('sinh') ||
    pos.includes('vat ly') || pos.includes('vat li') || pos.includes('hoa') || pos.includes('sinh')
  ) {
    return { id: 'd_ly_hoa_sinh', name: 'Tổ Lý - Hóa- Sinh' };
  }

  // 3. Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN
  if (
    sub.includes('tieng anh') || sub.includes('ngoai ngu') || sub.includes('tin') ||
    sub.includes('the duc') || sub.includes('gdtc') || sub.includes('gdqp') || sub.includes('quoc phong') ||
    pos.includes('tieng anh') || pos.includes('ngoai ngu') || pos.includes('tin') ||
    pos.includes('the duc') || pos.includes('gdtc') || pos.includes('gdqp')
  ) {
    return { id: 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan', name: 'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN' };
  }

  // 4. Tổ Toán - Công Nghệ
  if (
    sub.includes('toan') || sub.includes('cong nghe') ||
    pos.includes('toan') || pos.includes('cong nghe')
  ) {
    return { id: 'd_toan_cong_nghe', name: 'Tổ Toán - Công Nghệ' };
  }

  // 5. Tổ Văn - Sử - Địa- GDKT
  if (
    sub.includes('van') || sub.includes('su') || sub.includes('dia') ||
    sub.includes('gdkt') || sub.includes('luat') || sub.includes('am nhac') || sub.includes('my thuat') || sub.includes('mi thuat') ||
    pos.includes('van') || pos.includes('su') || pos.includes('dia')
  ) {
    return { id: 'd_van_su_dia_gdkt', name: 'Tổ Văn - Sử - Địa- GDKT' };
  }

  // Nếu đã có departmentId chính thức hợp lệ thì giữ nguyên
  if (teacher.departmentId && isOfficialDepartmentId(teacher.departmentId)) {
    const found = OFFICIAL_5_DEPARTMENTS.find(d => d.id === teacher.departmentId);
    if (found) return { id: found.id, name: found.name };
  }

  return null;
}

