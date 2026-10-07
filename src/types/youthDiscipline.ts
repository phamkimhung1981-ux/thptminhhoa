export type YouthDisciplineCategory = 
  | 'CHUYEN_CAN'
  | 'TRANG_PHUC_TAC_PHONG'
  | 'Y_THUC_KY_LUAT'
  | 'VE_SINH_MOI_TRUONG'
  | 'HOC_TAP'
  | 'NEN_NEP_TAP_THE'
  | 'KHAC';

export interface YouthDisciplineCategoryInfo {
  id: YouthDisciplineCategory;
  code: string;
  name: string;
  order: number;
  icon: string;
  color: string;
}

export type ViolationSeverity = 'Nhẹ' | 'Vừa' | 'Nghiêm trọng' | 'Rất nghiêm trọng';

export interface YouthDisciplineCriterion {
  id: string;
  code: string;
  name: string;
  category: YouthDisciplineCategory;
  categoryName: string;
  severity: ViolationSeverity;
  minusPoints: number; // Điểm trừ (e.g. 2, 5, 10...)
  affectCompetition: boolean; // Có tính vào thi đua lớp không
  allowedRoles?: string[]; // Ai được ghi nhận (CÁN BỘ ĐOÀN, ĐỘI CỜ ĐỎ, GVCN, BGH...)
  status: 'active' | 'inactive';
  description?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ViolationStatus = 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DA_XU_LY' | 'TU_CHOI';

export interface YouthViolationRecord {
  id: string;
  schoolYear: string; // "2026–2027"
  weekNumber: number; // 1..36
  monthNumber: number; // 1..12
  violationDate: string; // YYYY-MM-DD
  violationTime?: string; // e.g. "07:15" or "Tiết 1"
  periodSlot?: string; // Sáng / Chiều / Giờ ra chơi / Sinh hoạt
  classId: string;
  className: string;
  studentId: string; // 'ALL_CLASS' if whole class
  studentName: string;
  studentCode?: string;
  isWholeClass?: boolean;
  criterionId: string;
  criterionCode?: string;
  criterionName: string;
  category: YouthDisciplineCategory;
  categoryName: string;
  severity: ViolationSeverity;
  minusPoints: number; // Điểm trừ áp dụng
  location?: string; // Địa điểm vi phạm
  content: string; // Nội dung mô tả chi tiết
  evidenceUrl?: string; // Link ảnh minh chứng nếu có
  evidenceName?: string;
  recordedBy: string; // Tên/ID người ghi nhận (Cán bộ Đoàn / Cờ đỏ / GV)
  recordedByRole?: string;
  recordedByName: string;
  confirmedBy?: string; // Người xác nhận (Bí thư Đoàn / BGH / GVCN)
  confirmedByName?: string;
  confirmedAt?: string;
  status: ViolationStatus;
  notes?: string;
  teacherComment?: string; // Nhận xét của GVCN
  youthComment?: string; // Nhận xét của Đoàn TN
  createdAt: string;
  updatedAt?: string;
}

export type QuickCheckStatus = 'TOT' | 'DAT' | 'CHUA_DAT' | 'CO_VI_PHAM';

export interface YouthDailyCheckItem {
  classId: string;
  className: string;
  attendance: QuickCheckStatus; // Đi học / Chuyên cần
  uniform: QuickCheckStatus; // Đồng phục
  studentCard: QuickCheckStatus; // Thẻ HS
  cleanliness: QuickCheckStatus; // Vệ sinh
  orderliness: QuickCheckStatus; // Trật tự
  phoneUsage: QuickCheckStatus; // Sử dụng điện thoại
  flagSalute: QuickCheckStatus; // Chào cờ / Sinh hoạt tập thể
  demeanor: QuickCheckStatus; // Tác phong
  notes?: string;
}

export interface YouthDailyCheckSheet {
  id: string; // `${schoolYear}_w${weekNumber}_${checkDate}`
  schoolYear: string;
  weekNumber: number;
  checkDate: string; // YYYY-MM-DD
  session: 'morning' | 'afternoon';
  inspectorName: string;
  inspectorId: string;
  classes: YouthDailyCheckItem[];
  savedAt: string;
  updatedAt?: string;
}

export interface YouthWeeklyLockRecord {
  id: string; // `${schoolYear}_w${weekNumber}`
  schoolYear: string;
  weekNumber: number;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  lockedByName?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockedByName?: string;
  unlockReason?: string;
  notes?: string;
  snapshotSummary?: {
    totalViolations: number;
    totalMinusPoints: number;
    topClasses: { className: string; score: number; rank: number }[];
  };
}

export interface YouthDisciplineSettings {
  id: string;
  schoolYear: string;
  baseScore: number; // Mặc định 100 điểm
  allowRanking: boolean; // Có bật xếp hạng thi đua các lớp không
  allowPublicResults: boolean; // Có công khai kết quả cho học sinh/toàn trường không
  thresholdGood: number; // Mức Tốt: >= 90
  thresholdFair: number; // Mức Khá: >= 75
  thresholdPass: number; // Mức Đạt: >= 55
  autoLockDayOfWeek: number; // 6 (Thứ 7) hoặc 0 (Chủ nhật)
  defaultEvaluatorRole: string;
}

export interface YouthAuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIRM' | 'UNCONFIRM' | 'LOCK_WEEK' | 'UNLOCK_WEEK' | 'CONFIG_CHANGE';
  entityType: 'VIOLATION' | 'CRITERION' | 'DAILY_CHECK' | 'WEEK_LOCK' | 'SETTINGS';
  entityId: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  summary: string;
  previousData?: any;
  newData?: any;
}

export interface YouthClassificationConfig {
  id: string;
  academicYear: string; // e.g. "2026–2027"
  name: string; // "Tốt", "Khá", "Đạt", "Chưa đạt"
  minScore: number; // e.g. 90
  maxScore: number; // e.g. 100
  color: string; // Hex color code or css color e.g. "#10B981"
  sortOrder: number; // 1, 2, 3, 4
  active: boolean; // true = in use, false = deactivated
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface StudentWithViolationsSummary {
  studentId: string;
  studentName: string;
  studentCode?: string;
  classId: string;
  className: string;
  violationCount: number;
  totalDeduction: number;
  violations: YouthViolationRecord[];
}

export interface ClassDisciplineSummary {
  classId: string;
  className: string;
  grade: number;
  homeroomTeacherName?: string;
  totalStudents: number;
  baseScore: number;
  totalMinusPoints: number;
  finalScore: number;
  violationCount: number;
  violatingStudentCount: number;
  classification: string; // Dynamic from classification configuration
  classificationColor?: string; // Color from config
  rank: number;
  note?: string;
  topViolations?: { name: string; count: number }[];
}
