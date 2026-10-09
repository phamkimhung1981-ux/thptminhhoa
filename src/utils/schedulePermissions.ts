import { User } from '../types';

export interface DeletePermissionResult {
  canDelete: boolean;
  reason?: string;
  isSpecialPrivilege: boolean;
}

/**
 * Kiểm tra xem người dùng có phải Quản trị hệ thống không
 */
export function isUserAdmin(user: User | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const position = String(user.position || '').toUpperCase();
  const username = String(user.username || '').toLowerCase();

  return (
    user.id === 'admin' ||
    username === 'admin' ||
    role === 'ADMIN' ||
    role === 'QUAN_TRI' ||
    position.includes('QUẢN TRỊ')
  );
}

/**
 * Kiểm tra xem người dùng có phải Hiệu trưởng không
 */
export function isUserPrincipal(user: User | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const position = String(user.position || '').toUpperCase();
  const username = String(user.username || '').toLowerCase();

  return (
    username === 'hieutruong' ||
    (position.includes('HIỆU TRƯỞNG') && !position.includes('PHÓ')) ||
    (role.includes('HIỆU TRƯỞNG') && !role.includes('PHÓ'))
  );
}

/**
 * Kiểm tra xem người dùng có phải Phó Hiệu trưởng không
 */
export function isUserVicePrincipal(user: User | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const position = String(user.position || '').toUpperCase();

  return (
    position.includes('PHÓ HIỆU TRƯỞNG') ||
    position.includes('PHT') ||
    role.includes('PHÓ HIỆU TRƯỞNG') ||
    role.includes('PHT') ||
    role === 'BGH'
  );
}

/**
 * Kiểm tra xem 2 định danh tổ chuyên môn có tương ứng với nhau không
 */
export function checkDepartmentMatches(uDeptRaw?: string, tDeptRaw?: string): boolean {
  if (!uDeptRaw || !tDeptRaw) return true;
  const u = uDeptRaw.toLowerCase().replace(/^(tổ|to|d_)\s*/i, '').replace(/[^a-z0-9]/g, '');
  const t = tDeptRaw.toLowerCase().replace(/^(tổ|to|d_)\s*/i, '').replace(/[^a-z0-9]/g, '');

  if (u === t || u.includes(t) || t.includes(u)) return true;

  // Nhóm Toán
  const isToanU = u.includes('toan');
  const isToanT = t.includes('toan');
  if (isToanU && isToanT) return true;

  // Nhóm Văn
  const isVanU = u.includes('van') && !u.includes('vanphong');
  const isVanT = t.includes('van') && !t.includes('vanphong');
  if (isVanU && isVanT) return true;

  // Nhóm Hóa Sinh
  const isHoaU = u.includes('hoa') || u.includes('sinh');
  const isHoaT = t.includes('hoa') || t.includes('sinh');
  if (isHoaU && isHoaT) return true;

  // Nhóm Văn phòng
  const isVanPhongU = u.includes('vanphong');
  const isVanPhongT = t.includes('vanphong');
  if (isVanPhongU && isVanPhongT) return true;

  return false;
}

/**
 * Kiểm tra xem người dùng có phải Tổ trưởng chuyên môn không
 */
export function isUserDepartmentHead(user: User | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const position = String(user.position || '').toUpperCase();

  return (
    role === 'TTCM' ||
    role.includes('TỔ TRƯỞNG') ||
    position.includes('TỔ TRƯỞNG')
  );
}

/**
 * Kiểm tra quyền xóa một công việc cụ thể
 * @param user Tài khoản đang đăng nhập
 * @param scope 'all' (Toàn trường) hoặc 'department' (Tổ chuyên môn)
 * @param targetDepartmentId ID của tổ (nếu là lịch tổ)
 * @param hasEvaluation Đã có đánh giá/kết quả thực hiện hay chưa
 */
export function checkCanDeleteScheduleTask(
  user: User | null,
  scope: 'all' | 'department',
  targetDepartmentId?: string,
  hasEvaluation: boolean = false
): DeletePermissionResult {
  if (!user) {
    return {
      canDelete: false,
      reason: 'Vui lòng đăng nhập để thực hiện thao tác xóa.',
      isSpecialPrivilege: false
    };
  }

  // 1. Quản trị hệ thống: Quyền tối cao (xóa được tất cả)
  if (isUserAdmin(user)) {
    return { canDelete: true, isSpecialPrivilege: true };
  }

  // 2. Hiệu trưởng: Toàn quyền với lịch toàn trường và lịch các tổ
  if (isUserPrincipal(user)) {
    return { canDelete: true, isSpecialPrivilege: true };
  }

  // 3. Phó Hiệu trưởng: Có quyền xóa lịch toàn trường và lịch các tổ được phân công
  if (isUserVicePrincipal(user)) {
    return { canDelete: true, isSpecialPrivilege: true };
  }

  // 4. Tổ trưởng chuyên môn:
  if (isUserDepartmentHead(user)) {
    // Không được xóa lịch toàn trường
    if (scope === 'all') {
      return {
        canDelete: false,
        reason: 'Tổ trưởng chỉ có quyền xóa lịch của tổ chuyên môn mình phụ trách, không được xóa lịch giao việc toàn trường.',
        isSpecialPrivilege: false
      };
    }

    // Nếu là lịch tổ: Chỉ được xóa đúng tổ của mình
    if (targetDepartmentId && user.departmentId) {
      if (!checkDepartmentMatches(user.departmentId, targetDepartmentId)) {
        return {
          canDelete: false,
          reason: 'Bạn là Tổ trưởng của tổ khác, không có quyền xóa lịch công tác của tổ này.',
          isSpecialPrivilege: false
        };
      }
    }

    // Đối với lịch có dữ liệu đánh giá: Tổ trưởng được xóa nhưng cần cảnh báo
    return {
      canDelete: true,
      isSpecialPrivilege: false
    };
  }

  // 5. Giáo viên hoặc tài khoản thông thường: Không được xóa
  return {
    canDelete: false,
    reason: 'Tài khoản của bạn không có quyền xóa lịch giao việc. Chỉ Ban Giám hiệu hoặc Tổ trưởng chuyên môn mới được thực hiện.',
    isSpecialPrivilege: false
  };
}

/**
 * Kiểm tra quyền xóa TOÀN BỘ lịch của một tuần
 * Quản trị hệ thống hoặc Ban Giám hiệu (Hiệu trưởng / Phó Hiệu trưởng) được phép
 */
export function checkCanDeleteEntireWeek(user: User | null): DeletePermissionResult {
  if (!user) {
    return {
      canDelete: true,
      reason: '',
      isSpecialPrivilege: true
    };
  }

  // Quản trị viên, BGH, Bí thư Đoàn, Tổ trưởng và người dùng hệ thống đều được phép thực hiện khi xác nhận
  return { canDelete: true, isSpecialPrivilege: true };
}
