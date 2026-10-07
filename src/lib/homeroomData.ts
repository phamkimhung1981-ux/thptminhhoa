import {
  ConductCategory,
  ConductCriterion,
  ClassInfo,
  Student,
  HomeroomAssignment,
  ConductSettings,
  ClassificationType,
  SeriousViolationConfig,
  ConductRecord,
  ViolationCategoryType,
  ViolationSeverity,
  WarningLevel,
  RatingTierItem,
  EvaluationRatingConfig,
  StudentRatingResult
} from '../types/homeroom';

export const DEFAULT_SERIOUS_VIOLATION_CONFIGS: SeriousViolationConfig[] = [
  {
    id: 'cfg_atgt_light',
    categoryType: 'ATGT',
    title: 'Vi phạm An toàn giao thông - Mức Nhẹ',
    severity: 'Nhẹ',
    minusPoint: -5,
    hasConductWarning: false,
    warningLevel: 'mild',
    proposedRating: 'Cần nhắc nhở',
    requiresBghApproval: false,
    note: 'Không đội mũ bảo hiểm khi đi xe máy điện, đỗ xe sai nơi quy định',
    isActive: true
  },
  {
    id: 'cfg_atgt_serious',
    categoryType: 'ATGT',
    title: 'Vi phạm An toàn giao thông - Nghiêm trọng',
    severity: 'Nghiêm trọng',
    minusPoint: -10,
    hasConductWarning: true,
    warningLevel: 'serious',
    proposedRating: 'Xem xét mức rèn luyện thấp',
    requiresBghApproval: false,
    note: 'Lạng lách, kẹp 3, không có bằng lái, chở quá số người quy định',
    isActive: true
  },
  {
    id: 'cfg_atgt_critical',
    categoryType: 'ATGT',
    title: 'Vi phạm An toàn giao thông - Rất nghiêm trọng',
    severity: 'Rất nghiêm trọng',
    minusPoint: -20,
    hasConductWarning: true,
    warningLevel: 'critical',
    proposedRating: 'Chưa đạt – cần xem xét',
    requiresBghApproval: true,
    note: 'Gây tai nạn giao thông, vi phạm pháp luật giao thông có văn bản công an',
    isActive: true
  },
  {
    id: 'cfg_violence_serious',
    categoryType: 'BẠO LỰC HỌC ĐƯỜNG',
    title: 'Bạo lực học đường - Nghiêm trọng',
    severity: 'Nghiêm trọng',
    minusPoint: -20,
    hasConductWarning: true,
    warningLevel: 'critical',
    proposedRating: 'Chưa đạt – cần xem xét',
    requiresBghApproval: true,
    note: 'Gây xô xát, đe dọa, lăng mạ, xâm phạm danh dự thân thể học sinh khác',
    isActive: true
  },
  {
    id: 'cfg_violence_critical',
    categoryType: 'BẠO LỰC HỌC ĐƯỜNG',
    title: 'Bạo lực học đường - Rất nghiêm trọng',
    severity: 'Rất nghiêm trọng',
    minusPoint: -30,
    hasConductWarning: true,
    warningLevel: 'critical',
    proposedRating: 'Chưa đạt – cần xem xét',
    requiresBghApproval: true,
    note: 'Đánh nhau tập thể, gây thương tích, quay clip kích động bạo lực',
    isActive: true
  },
  {
    id: 'cfg_cheating_serious',
    categoryType: 'GIAN LẬN THI CỬ',
    title: 'Gian lận kiểm tra / Thi cử - Nghiêm trọng',
    severity: 'Nghiêm trọng',
    minusPoint: -15,
    hasConductWarning: true,
    warningLevel: 'serious',
    proposedRating: 'Xem xét mức rèn luyện phù hợp',
    requiresBghApproval: true,
    note: 'Sử dụng tài liệu, mang thiết bị vào phòng thi, chép bài bạn, nhờ thi hộ',
    isActive: true
  },
  {
    id: 'cfg_rules_serious',
    categoryType: 'NỘI QUY',
    title: 'Vi phạm Nội quy nhà trường - Nghiêm trọng',
    severity: 'Nghiêm trọng',
    minusPoint: -10,
    hasConductWarning: true,
    warningLevel: 'serious',
    proposedRating: 'Xem xét mức rèn luyện',
    requiresBghApproval: false,
    note: 'Nghỉ học không phép nhiều lần, vô lễ với giáo viên',
    isActive: true
  }
];

export function isSpecialWarningCategory(categoryType?: string): boolean {
  if (!categoryType) return false;
  const upper = categoryType.toUpperCase().trim();
  return (
    upper === 'ATGT' ||
    upper.includes('BẠO LỰC') ||
    upper.includes('GIAN LẬN')
  );
}

export function checkStudentHasSpecialWarning(studentRecords: ConductRecord[]): boolean {
  return studentRecords.some(r =>
    isSpecialWarningCategory(r.categoryType) ||
    r.special_warning === true ||
    (r.hasConductWarning && (
      r.warningLabel?.includes('ATGT') ||
      r.warningLabel?.includes('BẠO LỰC') ||
      r.warningLabel?.includes('GIAN LẬN')
    ))
  );
}

export interface StudentRuleEvaluationResult {
  hasWarning: boolean;
  hasSpecialWarning: boolean;
  specialWarningMessage: string | null;
  warningBadges: {
    type: ViolationCategoryType;
    badgeLabel: string;
    subtext: string;
    colorClass: string;
    proposedRating: string;
    requiresBghApproval: boolean;
  }[];
  highestWarningLevel: WarningLevel;
  primaryBadge: string | null;
  primarySubtext: string | null;
  proposedRating: string | null;
  requiresBghApproval: boolean;
  seriousViolationRecords: ConductRecord[];
}

export function evaluateStudentConductRules(
  studentRecords: ConductRecord[],
  configs: SeriousViolationConfig[] = DEFAULT_SERIOUS_VIOLATION_CONFIGS
): StudentRuleEvaluationResult {
  const hasSpecial = checkStudentHasSpecialWarning(studentRecords);

  const seriousRecords = studentRecords.filter(r => {
    if (r.special_warning || isSpecialWarningCategory(r.categoryType)) return true;
    if (r.hasConductWarning) return true;
    if (r.level === 'Nghiêm trọng' || r.level === 'Rất nghiêm trọng') return true;
    return false;
  });

  if (seriousRecords.length === 0 && !hasSpecial) {
    return {
      hasWarning: false,
      hasSpecialWarning: false,
      specialWarningMessage: null,
      warningBadges: [],
      highestWarningLevel: 'none',
      primaryBadge: null,
      primarySubtext: null,
      proposedRating: null,
      requiresBghApproval: false,
      seriousViolationRecords: []
    };
  }

  const warningBadges: StudentRuleEvaluationResult['warningBadges'] = [];
  let highestWarningLevel: WarningLevel = 'none';
  let requiresBghApproval = false;

  // RULE 01 - ATGT
  const atgtRecords = seriousRecords.filter(r => r.categoryType === 'ATGT' || r.warningLabel?.includes('ATGT'));
  if (atgtRecords.length > 0) {
    warningBadges.push({
      type: 'ATGT',
      badgeLabel: '⚠ ATGT',
      subtext: 'Cảnh báo đặc biệt - Tự động xếp Yếu/Chưa đạt',
      colorClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
      proposedRating: 'YẾU / CHƯA ĐẠT',
      requiresBghApproval: true
    });
    highestWarningLevel = 'critical';
    requiresBghApproval = true;
  }

  // RULE 02 - BẠO LỰC HỌC ĐƯỜNG
  const violenceRecords = seriousRecords.filter(r => r.categoryType === 'BẠO LỰC HỌC ĐƯỜNG' || r.warningLabel?.includes('BẠO LỰC') || r.criterionName.toLowerCase().includes('đánh nhau') || r.criterionName.toLowerCase().includes('xúc phạm'));
  if (violenceRecords.length > 0) {
    warningBadges.push({
      type: 'BẠO LỰC HỌC ĐƯỜNG',
      badgeLabel: '🔴 BẠO LỰC HỌC ĐƯỜNG',
      subtext: 'Cảnh báo đặc biệt - Tự động xếp Yếu/Chưa đạt',
      colorClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
      proposedRating: 'YẾU / CHƯA ĐẠT',
      requiresBghApproval: true
    });
    highestWarningLevel = 'critical';
    requiresBghApproval = true;
  }

  // RULE 03 - GIAN LẬN THI CỬ
  const cheatingRecords = seriousRecords.filter(r => r.categoryType === 'GIAN LẬN THI CỬ' || r.warningLabel?.includes('GIAN LẬN') || r.criterionName.toLowerCase().includes('gian lận'));
  if (cheatingRecords.length > 0) {
    warningBadges.push({
      type: 'GIAN LẬN THI CỬ',
      badgeLabel: '🔴 GIAN LẬN THI CỬ',
      subtext: 'Cảnh báo đặc biệt - Tự động xếp Yếu/Chưa đạt',
      colorClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
      proposedRating: 'YẾU / CHƯA ĐẠT',
      requiresBghApproval: true
    });
    highestWarningLevel = 'critical';
    requiresBghApproval = true;
  }

  // Other serious rules
  const otherSerious = seriousRecords.filter(r => 
    !isSpecialWarningCategory(r.categoryType) &&
    !r.special_warning
  );
  if (otherSerious.length > 0 && warningBadges.length === 0) {
    warningBadges.push({
      type: 'NỘI QUY',
      badgeLabel: '🟠 VI PHẠM NGHIÊM TRỌNG',
      subtext: 'Cần xem xét đánh giá',
      colorClass: 'bg-orange-100 text-orange-900 border-orange-300',
      proposedRating: 'Xem xét mức rèn luyện',
      requiresBghApproval: otherSerious.some(r => r.requiresBghApproval)
    });
    if (highestWarningLevel === 'none') highestWarningLevel = 'serious';
    if (otherSerious.some(r => r.requiresBghApproval)) requiresBghApproval = true;
  }

  const primaryBadge = warningBadges.length > 0 ? warningBadges[0].badgeLabel : null;
  const primarySubtext = warningBadges.length > 0 ? warningBadges[0].subtext : null;
  const proposedRating = hasSpecial ? 'YẾU / CHƯA ĐẠT' : (warningBadges.length > 0 ? warningBadges[0].proposedRating : null);

  return {
    hasWarning: warningBadges.length > 0 || hasSpecial,
    hasSpecialWarning: hasSpecial,
    specialWarningMessage: hasSpecial ? 'Học sinh có vi phạm thuộc nhóm cảnh báo đặc biệt.' : null,
    warningBadges,
    highestWarningLevel: hasSpecial ? 'critical' : highestWarningLevel,
    primaryBadge,
    primarySubtext,
    proposedRating,
    requiresBghApproval: hasSpecial || requiresBghApproval,
    seriousViolationRecords: seriousRecords
  };
}

export interface DatChuaDatCategoryConfig {
  id: string;
  code: string;
  name: string;
}

export const DAT_CHUA_DAT_CATEGORIES: DatChuaDatCategoryConfig[] = [
  { id: 'cat_4', code: 'DD_UX', name: 'ĐẠO ĐỨC – ỨNG XỬ' },
  { id: 'cat_5', code: 'HT_KT', name: 'HỌC TẬP – KIỂM TRA' },
  { id: 'cat_6', code: 'TN_CKT', name: 'TỆ NẠN – KÍCH THÍCH – CHẤT GÂY CHÁY NỔ' },
  { id: 'cat_8', code: 'AN_TT', name: 'AN NINH – TRẬT TỰ' },
  { id: 'cat_10', code: 'AT_GT', name: 'AN TOÀN GIAO THÔNG' },
  { id: 'cat_9', code: 'VH_ND', name: 'VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP' }
];

/**
 * Checks if a category belongs to the 6 "ĐẠT / CHƯA ĐẠT" categories:
 * 1. ĐẠO ĐỨC – ỨNG XỬ
 * 2. HỌC TẬP – KIỂM TRA
 * 3. TỆ NẠN – KÍCH THÍCH – CHẤT GÂY CHÁY NỔ
 * 4. AN NINH – TRẬT TỰ
 * 5. AN TOÀN GIAO THÔNG
 * 6. VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP
 */
export function isPassFailCriterion(crit?: ConductCriterion | null): boolean {
  if (!crit) return false;
  if (crit.evaluationType === 'PASS_FAIL') return true;
  if (crit.id === 'crit_12' || crit.code === 'TC12') return true;
  if (crit.name && crit.name.toLowerCase().includes('sử dụng điện thoại')) return true;
  return false;
}

export function isDatChuaDatCategory(categoryIdOrName?: string, categoryCode?: string, criterion?: ConductCriterion | null): boolean {
  if (criterion && isPassFailCriterion(criterion)) {
    return true;
  }
  if (categoryIdOrName === 'crit_12' || categoryIdOrName === 'TC12') return true;
  if (!categoryIdOrName && !categoryCode) return false;
  
  const idOrName = (categoryIdOrName || '').trim();
  const code = (categoryCode || '').trim().toUpperCase();

  // Known category IDs
  if (['cat_4', 'cat_5', 'cat_6', 'cat_8', 'cat_9', 'cat_10'].includes(idOrName)) {
    return true;
  }
  // Known category codes
  if (['DD_UX', 'HT_KT', 'TN_CKT', 'AN_TT', 'AT_GT', 'VH_ND'].includes(code)) {
    return true;
  }

  // Name matching (case-insensitive & accent-friendly)
  const norm = idOrName.toLowerCase();
  
  // 1. ĐẠO ĐỨC – ỨNG XỬ
  if (norm.includes('đạo đức') || norm.includes('ứng xử') || norm.includes('dao duc') || norm.includes('ung xu')) return true;
  
  // 2. HỌC TẬP – KIỂM TRA (Note: "Nền nếp học tập" has "nền nếp", make sure it doesn't match)
  if (norm.includes('kiểm tra') || norm.includes('kiem tra') || (norm.includes('học tập') && !norm.includes('nền nếp') && !norm.includes('nen nep'))) return true;
  
  // 3. TỆ NẠN – KÍCH THÍCH – CHẤT GÂY CHÁY NỔ
  if (norm.includes('tệ nạn') || norm.includes('kích thích') || norm.includes('cháy nổ') || norm.includes('te nan') || norm.includes('kich thich')) return true;
  
  // 4. AN NINH – TRẬT TỰ
  if (norm.includes('an ninh') || (norm.includes('trật tự') && !norm.includes('mất trật tự')) || norm.includes('trat tu')) return true;
  
  // 5. AN TOÀN GIAO THÔNG
  if (norm.includes('giao thông') || norm.includes('atgt') || norm.includes('an toàn giao thông') || norm.includes('giao thong')) return true;
  
  // 6. VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP
  if (norm.includes('văn hóa') || norm.includes('nội dung không phù hợp') || norm.includes('van hoa')) return true;

  return false;
}

export interface GroupEvaluationResult {
  hasEvaluation: boolean;
  hasChuaDat: boolean;
  hasDat: boolean;
  evaluationCount: number;
  finalRating: 'ĐẠT' | 'CHƯA ĐẠT' | null;
  displayClassification: string;
  badgeStyle: string;
  evaluatedCategories: {
    categoryId: string;
    categoryName: string;
    status: 'ĐẠT' | 'CHƯA ĐẠT';
    recordCount: number;
  }[];
}

/**
 * Evaluates the status of the 6 "ĐẠT / CHƯA ĐẠT" categories for a student's records:
 * 1. ĐẠO ĐỨC – ỨNG XỬ
 * 2. HỌC TẬP – KIỂM TRA
 * 3. TỆ NẠN – KÍCH THÍCH – CHẤT GÂY CHÁY NỔ
 * 4. AN NINH – TRẬT TỰ
 * 5. AN TOÀN GIAO THÔNG
 * 6. VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP
 * 
 * Logic & Priority:
 * - If GVCN evaluated any of the 6 groups with CHƯA ĐẠT -> overall is 🔴 CHƯA ĐẠT
 * - If ALL evaluated groups are ĐẠT -> overall is 🟢 ĐẠT
 * - If no evaluations in these groups -> hasEvaluation = false
 */
export function evaluateStudent6Groups(records: ConductRecord[]): GroupEvaluationResult {
  if (!records || records.length === 0) {
    return {
      hasEvaluation: false,
      hasChuaDat: false,
      hasDat: false,
      evaluationCount: 0,
      finalRating: null,
      displayClassification: '',
      badgeStyle: '',
      evaluatedCategories: []
    };
  }

  // Filter records belonging to the evaluation groups or pass-fail criteria (like TC12)
  const evalRecords = records.filter(r => 
    isDatChuaDatCategory(r.categoryId, r.categoryName) || 
    r.criterionId === 'crit_12' || 
    r.criterionName?.toLowerCase().includes('điện thoại') ||
    Boolean(r.evaluationStatus)
  );

  if (evalRecords.length === 0) {
    return {
      hasEvaluation: false,
      hasChuaDat: false,
      hasDat: false,
      evaluationCount: 0,
      finalRating: null,
      displayClassification: '',
      badgeStyle: '',
      evaluatedCategories: []
    };
  }

  // Group records by category to evaluate each
  const evaluatedCategories: {
    categoryId: string;
    categoryName: string;
    status: 'ĐẠT' | 'CHƯA ĐẠT';
    recordCount: number;
  }[] = [];

  evalRecords.forEach(r => {
    const catId = r.categoryId || 'unknown';
    const catName = r.categoryName || 'Tiêu chí';
    let existing = evaluatedCategories.find(c => c.categoryId === catId || c.categoryName.toLowerCase() === catName.toLowerCase());
    if (!existing) {
      existing = {
        categoryId: catId,
        categoryName: catName,
        status: 'ĐẠT',
        recordCount: 0
      };
      evaluatedCategories.push(existing);
    }
    existing.recordCount += 1;
    // Determine if this record represents CHƯA ĐẠT
    const isChuaDat = r.evaluationStatus === 'chua_dat' || (!r.evaluationStatus && (r.pointType === 'minus' || (r.point || 0) < 0 || Boolean(r.level) || r.recordType === 'VI_PHAM'));
    if (isChuaDat) {
      existing.status = 'CHƯA ĐẠT';
    }
  });

  // Priority rule:
  // Only 1 item in the 6 groups with CHƯA ĐẠT -> overall is CHƯA ĐẠT
  const hasChuaDat = evaluatedCategories.some(c => c.status === 'CHƯA ĐẠT');
  const hasDat = evaluatedCategories.some(c => c.status === 'ĐẠT');

  if (hasChuaDat) {
    return {
      hasEvaluation: true,
      hasChuaDat: true,
      hasDat,
      evaluationCount: evalRecords.length,
      finalRating: 'CHƯA ĐẠT',
      displayClassification: '🔴 CHƯA ĐẠT',
      badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      evaluatedCategories
    };
  }

  return {
    hasEvaluation: true,
    hasChuaDat: false,
    hasDat: true,
    evaluationCount: evalRecords.length,
    finalRating: 'ĐẠT',
    displayClassification: '🟢 ĐẠT',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    evaluatedCategories
  };
}

export const DEFAULT_CONDUCT_CATEGORIES: ConductCategory[] = [
  { id: 'cat_1', code: 'NH_HT', name: 'NỀN NẾP HỌC TẬP', sortOrder: 1, status: 'active' },
  { id: 'cat_2', code: 'DP_THS', name: 'ĐỒNG PHỤC – THẺ HỌC SINH', sortOrder: 2, status: 'active' },
  { id: 'cat_3', code: 'VS_YT', name: 'VỆ SINH – Ý THỨC', sortOrder: 3, status: 'active' },
  { id: 'cat_4', code: 'DD_UX', name: 'ĐẠO ĐỨC – ỨNG XỬ', sortOrder: 4, status: 'active' },
  { id: 'cat_5', code: 'HT_KT', name: 'HỌC TẬP – KIỂM TRA', sortOrder: 5, status: 'active' },
  { id: 'cat_6', code: 'TN_CKT', name: 'TỆ NẠN – CHẤT KÍCH THÍCH – CHẤT GÂY CHÁY NỔ', sortOrder: 6, status: 'active' },
  { id: 'cat_7', code: 'DT_TB', name: 'ĐIỆN THOẠI – THIẾT BỊ', sortOrder: 7, status: 'active' },
  { id: 'cat_8', code: 'AN_TT', name: 'AN NINH – TRẬT TỰ', sortOrder: 8, status: 'active' },
  { id: 'cat_9', code: 'VH_ND', name: 'VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP', sortOrder: 9, status: 'active' },
  { id: 'cat_10', code: 'AT_GT', name: 'AN TOÀN GIAO THÔNG', sortOrder: 10, status: 'active' },
  { id: 'cat_11', code: 'VP_KHAC', name: 'VI PHẠM KHÁC', sortOrder: 11, status: 'active' },
];

export const DEFAULT_CONDUCT_CRITERIA: ConductCriterion[] = [
  // Nhóm 1: NỀN NẾP HỌC TẬP
  {
    id: 'crit_strict',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC00',
    name: 'Học sinh thực hiện nghiêm túc nội quy',
    description: 'Chấp hành nghiêm túc quy định nền nếp, học tập, trang phục và nội quy nhà trường',
    pointType: 'plus',
    defaultPoint: 5,
    deductionPerOccurrence: 5,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 0
  },
  {
    id: 'crit_1',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC01',
    name: 'Nghỉ học không phép',
    description: 'Nghỉ học không xin phép hoặc không có giấy tờ xác nhận của phụ huynh',
    pointType: 'minus',
    defaultPoint: -5,
    deductionPerOccurrence: -5,
    severity: 'Vừa',
    status: 'active',
    sortOrder: 1
  },
  {
    id: 'crit_2',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC02',
    name: 'Bỏ tiết',
    description: 'Tự ý rời lớp/trường trong giờ học mà không được sự đồng ý của GV',
    pointType: 'minus',
    defaultPoint: -3,
    deductionPerOccurrence: -3,
    severity: 'Vừa',
    status: 'active',
    sortOrder: 2
  },
  {
    id: 'crit_3',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC03',
    name: 'Vào lớp muộn',
    description: 'Đến trường/vào lớp sau khi có chuông vào học',
    pointType: 'minus',
    defaultPoint: -2,
    deductionPerOccurrence: -2,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 3
  },
  {
    id: 'crit_4',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC04',
    name: 'Ghi sổ đầu bài',
    description: 'Bị giáo viên bộ môn ghi tên vào sổ đầu bài do vi phạm trật tự/không chuẩn bị bài',
    pointType: 'minus',
    defaultPoint: -3,
    deductionPerOccurrence: -3,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 4
  },
  {
    id: 'crit_5',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC05',
    name: 'Số lần điểm kém',
    description: 'Điểm kiểm tra, hỏi bài cũ đạt dưới 4 điểm',
    pointType: 'minus',
    defaultPoint: -2,
    deductionPerOccurrence: -2,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 5
  },
  {
    id: 'crit_6',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    code: 'TC06',
    name: 'Điểm tốt',
    description: 'Đạt điểm giỏi 9-10, hăng hái phát biểu, đạt giải trong kỳ thi, việc tốt',
    pointType: 'plus',
    defaultPoint: 5,
    deductionPerOccurrence: 5,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 6
  },

  // Nhóm 2: ĐỒNG PHỤC – THẺ HỌC SINH
  {
    id: 'crit_7',
    categoryId: 'cat_2',
    categoryName: 'ĐỒNG PHỤC – THẺ HỌC SINH',
    code: 'TC07',
    name: 'Không mặc đồng phục, đeo thẻ học sinh theo quy định',
    description: 'Mặc sai đồng phục, không đeo thẻ, đi dép lê, tóc nhuộm sặc sỡ',
    pointType: 'minus',
    defaultPoint: -2,
    deductionPerOccurrence: -2,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 7
  },

  // Nhóm 3: VỆ SINH – Ý THỨC
  {
    id: 'crit_8',
    categoryId: 'cat_3',
    categoryName: 'VỆ SINH – Ý THỨC',
    code: 'TC08',
    name: 'Đổ rác không đúng quy định',
    description: 'Vứt rác bừa bãi trong lớp học, sân trường, không trực nhật đúng lịch',
    pointType: 'minus',
    defaultPoint: -3,
    deductionPerOccurrence: -3,
    severity: 'Nhẹ',
    status: 'active',
    sortOrder: 8
  },

  // Nhóm 4: ĐẠO ĐỨC – ỨNG XỬ
  {
    id: 'crit_9',
    categoryId: 'cat_4',
    categoryName: 'ĐẠO ĐỨC – ỨNG XỬ',
    code: 'TC09',
    name: 'Xúc phạm nhân phẩm, danh dự, xâm phạm thân thể giáo viên, cán bộ, nhân viên nhà trường, người khác và học sinh khác',
    description: 'Có hành vi/ngôn từ vô văn hóa, vô lễ, lăng mạ, đe dọa hoặc vô lễ',
    pointType: 'minus',
    defaultPoint: -20,
    deductionPerOccurrence: -20,
    severity: 'Rất nghiêm trọng',
    status: 'active',
    sortOrder: 9
  },

  // Nhóm 5: HỌC TẬP – KIỂM TRA
  {
    id: 'crit_10',
    categoryId: 'cat_5',
    categoryName: 'HỌC TẬP – KIỂM TRA',
    code: 'TC10',
    name: 'Gian lận trong học tập, kiểm tra, thi',
    description: 'Sử dụng tài liệu, quay cóp, mang điện thoại vào phòng thi, chép bài bạn',
    pointType: 'minus',
    defaultPoint: -10,
    deductionPerOccurrence: -10,
    severity: 'Nghiêm trọng',
    status: 'active',
    sortOrder: 10
  },

  // Nhóm 6: TỆ NẠN – CHẤT KÍCH THÍCH – CHẤT GÂY CHÁY NỔ
  {
    id: 'crit_11',
    categoryId: 'cat_6',
    categoryName: 'TỆ NẠN – CHẤT KÍCH THÍCH – CHẤT GÂY CHÁY NỔ',
    code: 'TC11',
    name: 'Mua bán, sử dụng rượu, bia, thuốc lá, chất gây nghiện, các chất kích thích khác và pháo, các chất gây cháy nổ',
    description: 'Hút thuốc lá/thuốc lá điện tử, uống rượu bia, mang pháo hoặc chất gây nổ vào trường',
    pointType: 'minus',
    defaultPoint: -20,
    deductionPerOccurrence: -20,
    severity: 'Rất nghiêm trọng',
    status: 'active',
    sortOrder: 11
  },

  // Nhóm 7: ĐIỆN THOẠI – THIẾT BỊ
  {
    id: 'crit_12',
    categoryId: 'cat_7',
    categoryName: 'ĐIỆN THOẠI – THIẾT BỊ',
    code: 'TC12',
    name: 'Sử dụng điện thoại di động, các thiết bị khác khi đang học tập trên lớp không phục vụ cho việc học tập và không được giáo viên cho phép',
    description: 'Chơi game, lướt mạng, xem video trong giờ học',
    pointType: 'minus',
    defaultPoint: 0,
    deductionPerOccurrence: 0,
    evaluationType: 'PASS_FAIL',
    severity: 'Vừa',
    status: 'active',
    sortOrder: 12
  },

  // Nhóm 8: AN NINH – TRẬT TỰ
  {
    id: 'crit_13',
    categoryId: 'cat_8',
    categoryName: 'AN NINH – TRẬT TỰ',
    code: 'TC13',
    name: 'Đánh nhau, gây rối trật tự, an ninh trong nhà trường và nơi công cộng',
    description: 'Tụ tập xô xát, gây rối trật tự, lôi kéo người bên ngoài vào trường',
    pointType: 'minus',
    defaultPoint: -20,
    deductionPerOccurrence: -20,
    severity: 'Rất nghiêm trọng',
    status: 'active',
    sortOrder: 13
  },

  // Nhóm 9: VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP
  {
    id: 'crit_14',
    categoryId: 'cat_9',
    categoryName: 'VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP',
    code: 'TC14',
    name: 'Sử dụng, trao đổi sản phẩm văn hóa có nội dung kích động bạo lực, đồi trụy; sử dụng đồ chơi hoặc chơi trò chơi có hại cho sự phát triển lành mạnh của bản thân',
    description: 'Truyền bá ấn phẩm độc hại, game cờ bạc, trò chơi nguy hiểm',
    pointType: 'minus',
    defaultPoint: -10,
    deductionPerOccurrence: -10,
    severity: 'Nghiêm trọng',
    status: 'active',
    sortOrder: 14
  },

  // Nhóm 10: AN TOÀN GIAO THÔNG
  {
    id: 'crit_15',
    categoryId: 'cat_10',
    categoryName: 'AN TOÀN GIAO THÔNG',
    code: 'TC15',
    name: 'Đi xe máy trong trường và để xe không đúng nơi quy định, không đội mũ bảo hiểm',
    description: 'Vi phạm luật giao thông đường bộ, kẹp 3, không đội mũ bảo hiểm khi đi xe máy/xe đạp điện',
    pointType: 'minus',
    defaultPoint: -5,
    deductionPerOccurrence: -5,
    severity: 'Vừa',
    status: 'active',
    sortOrder: 15
  },

  // Nhóm 11: VI PHẠM KHÁC
  {
    id: 'crit_16',
    categoryId: 'cat_11',
    categoryName: 'VI PHẠM KHÁC',
    code: 'TC16',
    name: 'Học sinh không được vi phạm những hành vi bị nghiêm cấm khác theo quy định của pháp luật, nội quy nhà trường',
    description: 'Các hành vi vi phạm pháp luật hoặc quy định khác chưa liệt kê ở trên',
    pointType: 'minus',
    defaultPoint: -5,
    deductionPerOccurrence: -5,
    severity: 'Vừa',
    status: 'active',
    sortOrder: 16
  }
];

/**
 * Safely retrieves the deduction per occurrence from a ConductCriterion.
 * Respects deductionPerOccurrence if present, otherwise defaultPoint.
 * For the 6 special "Đạt / Chưa đạt" categories, deduction is always 0.
 */
export function getCriterionDeduction(crit?: ConductCriterion | null): number {
  if (!crit) return 0;
  if (isPassFailCriterion(crit) || isDatChuaDatCategory(crit.categoryId, crit.categoryName, crit)) {
    return 0;
  }
  if (crit.deductionPerOccurrence !== undefined && crit.deductionPerOccurrence !== null && !isNaN(Number(crit.deductionPerOccurrence))) {
    return Number(crit.deductionPerOccurrence);
  }
  if (crit.defaultPoint !== undefined && crit.defaultPoint !== null && !isNaN(Number(crit.defaultPoint))) {
    return Number(crit.defaultPoint);
  }
  return 0;
}

export const DEFAULT_CLASSES: ClassInfo[] = [
  { id: 'class_10a1', name: '10A1', grade: 10, schoolYear: '2026–2027', homeroomTeacherId: 't1', homeroomTeacherName: 'Nguyễn Thị A', room: 'Phòng 101', totalStudents: 38 },
  { id: 'class_10a2', name: '10A2', grade: 10, schoolYear: '2026–2027', homeroomTeacherId: 't2', homeroomTeacherName: 'Trần Văn B', room: 'Phòng 102', totalStudents: 36 },
  { id: 'class_10a3', name: '10A3', grade: 10, schoolYear: '2026–2027', homeroomTeacherId: 't3', homeroomTeacherName: 'Lê Thị C', room: 'Phòng 103', totalStudents: 35 },
  { id: 'class_11a1', name: '11A1', grade: 11, schoolYear: '2026–2027', homeroomTeacherId: 't4', homeroomTeacherName: 'Phạm Văn D', room: 'Phòng 201', totalStudents: 40 },
  { id: 'class_11a2', name: '11A2', grade: 11, schoolYear: '2026–2027', homeroomTeacherId: 't5', homeroomTeacherName: 'Hoàng Thị E', room: 'Phòng 202', totalStudents: 37 },
  { id: 'class_12a1', name: '12A1', grade: 12, schoolYear: '2026–2027', homeroomTeacherId: 't6', homeroomTeacherName: 'Đặng Văn F', room: 'Phòng 301', totalStudents: 42 },
  { id: 'class_12i', name: '12I', grade: 12, schoolYear: '2026–2027', homeroomTeacherId: 't_hathithuy', homeroomTeacherName: 'Hà Thị Thúy', room: 'Phòng 309', totalStudents: 40 }
];

export const SAMPLE_STUDENTS: Student[] = [
  { id: 'std_10a1_01', classId: 'class_10a1', className: '10A1', code: 'HS10A101', name: 'Nguyễn Văn A', gender: 'Nam', dob: '2011-03-15', parentPhone: '0912345678', parentName: 'Nguyễn Văn Hùng', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_02', classId: 'class_10a1', className: '10A1', code: 'HS10A102', name: 'Trần Thị B', gender: 'Nữ', dob: '2011-05-20', parentPhone: '0912345679', parentName: 'Trần Văn Long', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_03', classId: 'class_10a1', className: '10A1', code: 'HS10A103', name: 'Lê Hoàng C', gender: 'Nam', dob: '2011-08-10', parentPhone: '0912345680', parentName: 'Lê Văn Nam', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_04', classId: 'class_10a1', className: '10A1', code: 'HS10A104', name: 'Phạm Minh D', gender: 'Nam', dob: '2011-01-12', parentPhone: '0912345681', parentName: 'Phạm Văn Thành', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_05', classId: 'class_10a1', className: '10A1', code: 'HS10A105', name: 'Hoàng Ngọc E', gender: 'Nữ', dob: '2011-09-28', parentPhone: '0912345682', parentName: 'Hoàng Văn Phúc', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_06', classId: 'class_10a1', className: '10A1', code: 'HS10A106', name: 'Đỗ Đức F', gender: 'Nam', dob: '2011-11-04', parentPhone: '0912345683', parentName: 'Đỗ Văn Hải', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_07', classId: 'class_10a1', className: '10A1', code: 'HS10A107', name: 'Vũ Thị G', gender: 'Nữ', dob: '2011-02-18', parentPhone: '0912345684', parentName: 'Vũ Văn Bình', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_08', classId: 'class_10a1', className: '10A1', code: 'HS10A108', name: 'Bùi Anh H', gender: 'Nam', dob: '2011-07-22', parentPhone: '0912345685', parentName: 'Bùi Văn Tuấn', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_09', classId: 'class_10a1', className: '10A1', code: 'HS10A109', name: 'Đặng Mai K', gender: 'Nữ', dob: '2011-10-30', parentPhone: '0912345686', parentName: 'Đặng Văn Đức', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a1_10', classId: 'class_10a1', className: '10A1', code: 'HS10A110', name: 'Ngô Thanh L', gender: 'Nam', dob: '2011-04-14', parentPhone: '0912345687', parentName: 'Ngô Văn Sơn', address: 'Minh Hòa, Văn Chấn, Yên Bái' },

  // 10A2
  { id: 'std_10a2_01', classId: 'class_10a2', className: '10A2', code: 'HS10A201', name: 'Lý Văn M', gender: 'Nam', dob: '2011-06-11', parentPhone: '0912345688', parentName: 'Lý Văn Thái', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_10a2_02', classId: 'class_10a2', className: '10A2', code: 'HS10A202', name: 'Nguyễn Thu N', gender: 'Nữ', dob: '2011-09-09', parentPhone: '0912345689', parentName: 'Nguyễn Văn Nghĩa', address: 'Minh Hòa, Văn Chấn, Yên Bái' },

  // 11A1
  { id: 'std_11a1_01', classId: 'class_11a1', className: '11A1', code: 'HS11A101', name: 'Phan Văn P', gender: 'Nam', dob: '2010-01-25', parentPhone: '0912345690', parentName: 'Phan Văn Quý', address: 'Minh Hòa, Văn Chấn, Yên Bái' },
  { id: 'std_11a1_02', classId: 'class_11a1', className: '11A1', code: 'HS11A102', name: 'Trịnh Thị Q', gender: 'Nữ', dob: '2010-12-05', parentPhone: '0912345691', parentName: 'Trịnh Văn Khang', address: 'Minh Hòa, Văn Chấn, Yên Bái' }
];

export const DEFAULT_CONDUCT_SETTINGS: ConductSettings = {
  id: 'default_conduct_settings',
  schoolYear: '2026–2027',
  baseScore: 100,
  thresholds: {
    totMin: 90,
    khaMin: 70,
    datMin: 50
  }
};

export const DEFAULT_RATING_TIERS: RatingTierItem[] = [
  { id: 'tier_tot', name: 'Tốt', min_score: 90, max_score: 100, color: 'emerald', sort_order: 1, is_active: true },
  { id: 'tier_kha', name: 'Khá', min_score: 80, max_score: 89, color: 'blue', sort_order: 2, is_active: true },
  { id: 'tier_dat', name: 'Đạt', min_score: 65, max_score: 79, color: 'amber', sort_order: 3, is_active: true },
  { id: 'tier_chuadat', name: 'Chưa đạt', min_score: 0, max_score: 64, color: 'rose', sort_order: 4, is_active: true },
];

export const RATING_COLOR_MAP: Record<string, { label: string; badge: string; bg: string; text: string; border: string; dot: string; hex: string }> = {
  emerald: { label: 'Xanh lá', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500', hex: '#10B981' },
  blue: { label: 'Xanh dương', badge: 'bg-blue-100 text-blue-800 border-blue-300', bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500', hex: '#3B82F6' },
  amber: { label: 'Vàng', badge: 'bg-amber-100 text-amber-800 border-amber-300', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500', hex: '#F59E0B' },
  rose: { label: 'Đỏ', badge: 'bg-rose-100 text-rose-800 border-rose-300', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300', dot: 'bg-rose-500', hex: '#EF4444' },
  purple: { label: 'Tím', badge: 'bg-purple-100 text-purple-800 border-purple-300', bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500', hex: '#8B5CF6' },
  cyan: { label: 'Xanh ngọc', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', bg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-300', dot: 'bg-cyan-500', hex: '#06B6D4' },
  slate: { label: 'Xám', badge: 'bg-slate-100 text-slate-800 border-slate-300', bg: 'bg-slate-500', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500', hex: '#64748B' },
};

export function getRatingBadgeStyle(colorKey?: string, tierName?: string): string {
  if (colorKey && RATING_COLOR_MAP[colorKey]) {
    return RATING_COLOR_MAP[colorKey].badge;
  }
  // Fallback by name
  if (tierName === 'Tốt') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (tierName === 'Khá') return 'bg-blue-100 text-blue-800 border-blue-300';
  if (tierName === 'Đạt') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-rose-100 text-rose-800 border-rose-300';
}

/**
 * Validates rating tiers according to Requirement 4:
 * - min_score <= max_score
 * - Scores within [0, 100]
 * - No duplicate tier names
 * - No overlaps or gaps (must completely cover 0 to 100)
 */
export function validateRatingTiers(tiers: RatingTierItem[]): { isValid: boolean; error?: string } {
  if (!tiers || tiers.length === 0) {
    return { isValid: false, error: 'Phải có ít nhất một mức xếp loại.' };
  }

  // 1. Check duplicate tier names
  const nameSet = new Set<string>();
  for (const t of tiers) {
    const trimmed = (t.name || '').trim().toLowerCase();
    if (!trimmed) {
      return { isValid: false, error: 'Tên xếp loại không được để trống.' };
    }
    if (nameSet.has(trimmed)) {
      return { isValid: false, error: `Tên mức xếp loại "${t.name}" bị trùng lặp.` };
    }
    nameSet.add(trimmed);
  }

  // 2. Check each tier min <= max and bounds [0, 100]
  for (const t of tiers) {
    const min = Number(t.min_score);
    const max = Number(t.max_score);
    if (isNaN(min) || isNaN(max)) {
      return { isValid: false, error: `Điểm của mức "${t.name}" không hợp lệ.` };
    }
    if (min < 0 || max > 100) {
      return { isValid: false, error: `Điểm của mức "${t.name}" phải nằm trong khoảng từ 0 đến 100.` };
    }
    if (min > max) {
      return { isValid: false, error: `Điểm tối thiểu (${min}) không được lớn hơn điểm tối đa (${max}) tại mức "${t.name}".` };
    }
  }

  // 3. Sort ascending by min_score
  const sorted = [...tiers].sort((a, b) => Number(a.min_score) - Number(b.min_score));

  // 4. Must start at 0 and end at 100
  if (Number(sorted[0].min_score) !== 0) {
    return { isValid: false, error: `Thang điểm phải bắt đầu từ 0 (hiện tại bắt đầu từ ${sorted[0].min_score}).` };
  }
  if (Number(sorted[sorted.length - 1].max_score) !== 100) {
    return { isValid: false, error: `Thang điểm phải kết thúc tại 100 (hiện tại kết thúc tại ${sorted[sorted.length - 1].max_score}).` };
  }

  // 5. Check gaps and overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const currMax = Number(curr.max_score);
    const nextMin = Number(next.min_score);

    if (nextMin <= currMax) {
      return {
        isValid: false,
        error: `Khoảng điểm bị trùng lặp hoặc chồng lấn giữa "${curr.name}" (${curr.min_score}–${curr.max_score}) và "${next.name}" (${next.min_score}–${next.max_score}).`
      };
    }
    if (nextMin > currMax + 1) {
      return {
        isValid: false,
        error: `Khoảng điểm bị bỏ trống từ ${currMax + 1} đến ${nextMin - 1} giữa "${curr.name}" và "${next.name}". Thang điểm phải bao phủ liên tục đầy đủ từ 0 đến 100.`
      };
    }
  }

  return { isValid: true };
}

/**
 * Unified calculation function: calculateStudentRating(score, config, hasSpecialWarning)
 * Requirement 15: Single source of truth for rating calculation.
 */
export function calculateStudentRating(
  score: number,
  config?: EvaluationRatingConfig | RatingTierItem[] | null,
  hasSpecialWarning: boolean = false
): StudentRatingResult {
  let tiers: RatingTierItem[] = DEFAULT_RATING_TIERS;
  if (config) {
    if (Array.isArray(config) && config.length > 0) {
      tiers = config.filter(t => t.is_active !== false);
    } else if ('tiers' in config && Array.isArray(config.tiers) && config.tiers.length > 0) {
      tiers = config.tiers.filter(t => t.is_active !== false);
    }
  }

  // Sorted descending so highest score checked first
  const sortedDesc = [...tiers].sort((a, b) => Number(b.max_score) - Number(a.max_score));
  const sortedAsc = [...tiers].sort((a, b) => Number(a.min_score) - Number(b.min_score));
  const lowestTier = sortedAsc[0] || DEFAULT_RATING_TIERS[DEFAULT_RATING_TIERS.length - 1];

  if (hasSpecialWarning) {
    const badge_style = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    return {
      rating_name: lowestTier.name || 'Chưa đạt',
      min_score: lowestTier.min_score,
      max_score: lowestTier.max_score,
      color: lowestTier.color || 'rose',
      badge_style,
      tier: lowestTier
    };
  }

  const roundedScore = Math.round(score);

  // Find matching tier
  const matched = sortedDesc.find(t => roundedScore >= Number(t.min_score) && roundedScore <= Number(t.max_score));

  if (matched) {
    return {
      rating_name: matched.name,
      min_score: Number(matched.min_score),
      max_score: Number(matched.max_score),
      color: matched.color,
      badge_style: getRatingBadgeStyle(matched.color, matched.name),
      tier: matched
    };
  }

  // If score > 100, return highest tier
  if (roundedScore > 100 && sortedDesc.length > 0) {
    const highest = sortedDesc[0];
    return {
      rating_name: highest.name,
      min_score: Number(highest.min_score),
      max_score: Number(highest.max_score),
      color: highest.color,
      badge_style: getRatingBadgeStyle(highest.color, highest.name),
      tier: highest
    };
  }

  // Otherwise return lowest tier
  return {
    rating_name: lowestTier.name,
    min_score: Number(lowestTier.min_score),
    max_score: Number(lowestTier.max_score),
    color: lowestTier.color,
    badge_style: getRatingBadgeStyle(lowestTier.color, lowestTier.name),
    tier: lowestTier
  };
}

/**
 * Calculates total minus points for a student by grouping by criterion and multiplying occurrence count by base deduction per occurrence.
 */
export function calculateStudentTotalMinus(records: ConductRecord[]): number {
  if (!records || records.length === 0) return 0;
  const criterionMap = new Map<string, { count: number; deductionPerOccurrence: number }>();

  records.forEach(r => {
    if (r.recordType === 'TICH_CUC' || r.pointType === 'plus' || r.point === 0) return;
    if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;

    const key = r.criterionId || r.criterionName || 'unknown_crit';
    const deductionPerOcc = Math.abs(
      r.deductionPerOccurrence !== undefined && r.deductionPerOccurrence !== null
        ? Number(r.deductionPerOccurrence)
        : (r.point !== undefined && r.point !== null ? Number(r.point) : 0)
    );

    if (!criterionMap.has(key)) {
      criterionMap.set(key, { count: 0, deductionPerOccurrence: deductionPerOcc });
    }
    const item = criterionMap.get(key)!;
    item.count += 1;
    if (deductionPerOcc > 0) {
      item.deductionPerOccurrence = deductionPerOcc;
    }
  });

  let totalMinusMagnitude = 0;
  criterionMap.forEach((val) => {
    totalMinusMagnitude += val.count * val.deductionPerOccurrence;
  });

  return totalMinusMagnitude;
}

/**
 * Calculates student score and classification
 * Uses unified calculateStudentRating internally
 */
export function calculateConductScore(
  baseScore: number,
  totalPlus: number,
  totalMinus: number,
  thresholds?: any,
  hasSpecialWarning: boolean = false,
  ratingConfig?: EvaluationRatingConfig | RatingTierItem[] | null,
  recordsOrEvalResult?: ConductRecord[] | GroupEvaluationResult | null
): { totalScore: number; classification: ClassificationType | string; specialWarning: boolean; ratingResult: StudentRatingResult } {
  // If records are passed as recordsOrEvalResult (array), use calculateStudentTotalMinus for accurate occurrence-based calculation
  let effectiveMinus = totalMinus;
  let recordsArray: ConductRecord[] | null = null;

  if (recordsOrEvalResult && Array.isArray(recordsOrEvalResult)) {
    recordsArray = recordsOrEvalResult;
    effectiveMinus = calculateStudentTotalMinus(recordsArray);
  }

  // totalMinus is positive magnitude (e.g. 8 points lost) or negative point sum (e.g. -8)
  const minusMagnitude = Math.abs(effectiveMinus);
  const totalScore = baseScore + totalPlus - minusMagnitude;

  // Determine 6 groups evaluation result if provided
  let evalResult: GroupEvaluationResult | null = null;
  if (recordsOrEvalResult) {
    if (!Array.isArray(recordsOrEvalResult) && 'hasEvaluation' in recordsOrEvalResult) {
      evalResult = recordsOrEvalResult;
    } else if (recordsArray) {
      evalResult = evaluateStudent6Groups(recordsArray);
    }
  }

  // If threshold overrides were given without full config (legacy fallback)
  let activeConfig = ratingConfig;
  if (!activeConfig && thresholds && (thresholds.totMin !== undefined || thresholds.khaMin !== undefined)) {
    const totMin = thresholds.totMin ?? 90;
    const khaMin = thresholds.khaMin ?? 80;
    const datMin = thresholds.datMin ?? 65;
    activeConfig = [
      { id: 't_tot', name: 'Tốt', min_score: totMin, max_score: 100, color: 'emerald', sort_order: 1, is_active: true },
      { id: 't_kha', name: 'Khá', min_score: khaMin, max_score: totMin - 1, color: 'blue', sort_order: 2, is_active: true },
      { id: 't_dat', name: 'Đạt', min_score: datMin, max_score: khaMin - 1, color: 'amber', sort_order: 3, is_active: true },
      { id: 't_cd', name: 'Chưa đạt', min_score: 0, max_score: datMin - 1, color: 'rose', sort_order: 4, is_active: true }
    ];
  }

  const defaultRatingResult = calculateStudentRating(totalScore, activeConfig, hasSpecialWarning);

  // If the student has evaluation in the 6 groups:
  // - If any group has CHƯA ĐẠT -> 🔴 CHƯA ĐẠT
  // - If all evaluated groups are ĐẠT -> 🟢 ĐẠT
  // - If no evaluations -> keep default rating from score
  if (evalResult && evalResult.hasEvaluation) {
    if (evalResult.hasChuaDat) {
      return {
        totalScore,
        classification: '🔴 CHƯA ĐẠT',
        specialWarning: hasSpecialWarning,
        ratingResult: {
          rating_name: '🔴 CHƯA ĐẠT',
          min_score: 0,
          max_score: 64,
          color: 'rose',
          badge_style: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          tier: defaultRatingResult.tier
        }
      };
    } else {
      return {
        totalScore,
        classification: '🟢 ĐẠT',
        specialWarning: hasSpecialWarning,
        ratingResult: {
          rating_name: '🟢 ĐẠT',
          min_score: 65,
          max_score: 100,
          color: 'emerald',
          badge_style: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
          tier: defaultRatingResult.tier
        }
      };
    }
  }

  return {
    totalScore,
    classification: defaultRatingResult.rating_name as ClassificationType,
    specialWarning: hasSpecialWarning,
    ratingResult: defaultRatingResult
  };
}
