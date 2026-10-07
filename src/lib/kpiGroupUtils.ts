import { KpiGroup, KpiItem, KpiRecord } from '../types';

/**
 * Tra cứu động thông tin Nhóm KPI theo ID nhóm (hoặc đối tượng KPI / KPI Record).
 * Đảm bảo mọi thay đổi tên nhóm, mô tả nhóm, mã nhóm trong bảng `kpiGroups`
 * đều tự động phản ánh tức thì trên toàn bộ hệ thống mà không phụ thuộc vào chuỗi tên cũ.
 */

export function resolveKpiGroup(
  target: string | { groupId?: string; group?: string; kpiId?: string } | null | undefined,
  kpiGroups: KpiGroup[],
  kpis?: KpiItem[]
): KpiGroup | undefined {
  if (!target) return undefined;

  let searchGroupId: string | undefined;
  let fallbackNameOrCode: string | undefined;

  if (typeof target === 'string') {
    searchGroupId = target;
  } else {
    searchGroupId = target.groupId;
    fallbackNameOrCode = target.group;

    // Nếu không có groupId nhưng có kpiId, thử tra cứu qua danh mục KPI
    if (!searchGroupId && target.kpiId && kpis && kpis.length > 0) {
      const parentKpi = kpis.find(k => k.id === target.kpiId);
      if (parentKpi?.groupId) {
        searchGroupId = parentKpi.groupId;
      } else if (parentKpi?.group) {
        fallbackNameOrCode = fallbackNameOrCode || parentKpi.group;
      }
    }
  }

  // 1. Ưu tiên tra cứu chính xác theo ID nhóm duy nhất (Foreign Key)
  if (searchGroupId) {
    const foundById = kpiGroups.find(g => g.id === searchGroupId);
    if (foundById) return foundById;
  }

  // 2. Fallback tìm theo Tên nhóm hoặc Mã nhóm (dành cho dữ liệu cũ chưa kịp migrate)
  if (fallbackNameOrCode && typeof fallbackNameOrCode === 'string') {
    const cleanSearch = fallbackNameOrCode.trim().toLowerCase();
    const foundByNameOrCode = kpiGroups.find(
      g => g.name.trim().toLowerCase() === cleanSearch || g.code.trim().toLowerCase() === cleanSearch
    );
    if (foundByNameOrCode) return foundByNameOrCode;
  }

  return undefined;
}

/**
 * Trả về Tên Nhóm KPI động mới nhất từ `kpiGroups`
 */
export function resolveKpiGroupName(
  target: string | { groupId?: string; group?: string; kpiId?: string } | null | undefined,
  kpiGroups: KpiGroup[],
  kpis?: KpiItem[],
  defaultFallback = 'Chưa phân nhóm'
): string {
  const group = resolveKpiGroup(target, kpiGroups, kpis);
  if (group) return group.name;

  if (typeof target === 'object' && target?.group) {
    return target.group;
  }
  return defaultFallback;
}

/**
 * Trả về Mô tả Nhóm KPI động mới nhất từ `kpiGroups`
 */
export function resolveKpiGroupDescription(
  target: string | { groupId?: string; group?: string; kpiId?: string } | null | undefined,
  kpiGroups: KpiGroup[],
  kpis?: KpiItem[]
): string {
  const group = resolveKpiGroup(target, kpiGroups, kpis);
  return group?.description || '';
}

/**
 * Trả về Mã Nhóm KPI động mới nhất từ `kpiGroups`
 */
export function resolveKpiGroupCode(
  target: string | { groupId?: string; group?: string; kpiId?: string } | null | undefined,
  kpiGroups: KpiGroup[],
  kpis?: KpiItem[],
  defaultCode = 'KP'
): string {
  const group = resolveKpiGroup(target, kpiGroups, kpis);
  if (group) return group.code;
  return defaultCode;
}

/**
 * Tạo màu sắc badge đồng bộ theo Tên hoặc ID nhóm
 */
export function getKpiGroupBadgeStyle(
  target: string | { groupId?: string; group?: string; kpiId?: string } | null | undefined,
  kpiGroups: KpiGroup[],
  kpis?: KpiItem[]
): { badgeClass: string; bg: string; text: string; border: string } {
  const name = resolveKpiGroupName(target, kpiGroups, kpis, '').toLowerCase();

  if (name.includes('nền nếp') || name.includes('tác phong') || name.includes('nn')) {
    return {
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      bg: '#fff1f2',
      text: '#be123c',
      border: '#fecdd3'
    };
  }
  if (name.includes('chuyên môn') || name.includes('cm') || name.includes('giảng dạy')) {
    return {
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      bg: '#eff6ff',
      text: '#1d4ed8',
      border: '#bfdbfe'
    };
  }
  if (name.includes('chủ nhiệm') || name.includes('cn')) {
    return {
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      bg: '#faf5ff',
      text: '#7e22ce',
      border: '#e9d5ff'
    };
  }
  if (name.includes('thành tích') || name.includes('khen thưởng') || name.includes('tt')) {
    return {
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      bg: '#fffbeb',
      text: '#92400e',
      border: '#fde68a'
    };
  }
  if (name.includes('công việc') || name.includes('nhiệm vụ') || name.includes('cv')) {
    return {
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bg: '#ecfdf5',
      text: '#047857',
      border: '#a7f3d0'
    };
  }
  if (name.includes('văn hóa') || name.includes('công sở') || name.includes('vh')) {
    return {
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bg: '#eef2ff',
      text: '#4338ca',
      border: '#c7d2fe'
    };
  }
  if (name.includes('hành chính') || name.includes('hc')) {
    return {
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      bg: '#f0fdfa',
      text: '#0f766e',
      border: '#99f6e4'
    };
  }
  if (name.includes('phục vụ') || name.includes('học sinh') || name.includes('pv')) {
    return {
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      bg: '#ecfeff',
      text: '#0e7490',
      border: '#a5f3fc'
    };
  }

  return {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    bg: '#f1f5f9',
    text: '#334155',
    border: '#cbd5e1'
  };
}
