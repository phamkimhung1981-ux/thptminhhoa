export interface ClassInfo {
  id: string;
  name: string; // e.g. 10A1, 10A2, 11A1, 12A1
  grade: number; // 10, 11, 12
  schoolYear: string; // e.g. 2026–2027
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  room?: string;
  totalStudents: number;
  status?: 'active' | 'inactive';
}

export interface Student {
  id: string;
  classId: string;
  className: string;
  code: string;
  name: string;
  full_name?: string;
  fullName?: string;
  stt?: number | string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  parentPhone?: string;
  parentName?: string;
  address?: string;
  avatar?: string;
  xepLoaiABC?: string;
  xep_loai_abc?: string;
  sortOrder?: number;
  status?: 'active' | 'inactive' | 'left' | 'transferred';
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeroomAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  schoolYear: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive';
}

export interface ConductCategory {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export type PointType = 'minus' | 'plus';

export type ViolationCategoryType = 'ATGT' | 'BẠO LỰC HỌC ĐƯỜNG' | 'GIAN LẬN THI CỬ' | 'NỘI QUY' | 'KHÁC';
export type ViolationSeverity = 'Nhẹ' | 'Vừa' | 'Nghiêm trọng' | 'Rất nghiêm trọng';
export type WarningLevel = 'none' | 'mild' | 'serious' | 'critical';

export interface SeriousViolationConfig {
  id: string;
  categoryType: ViolationCategoryType;
  title: string;
  severity: ViolationSeverity;
  minusPoint: number;
  hasConductWarning: boolean;
  warningLevel: WarningLevel;
  proposedRating: string; // e.g. "Xem xét mức rèn luyện thấp", "Chưa đạt – cần xem xét", "Xem xét mức rèn luyện phù hợp"
  requiresBghApproval: boolean;
  note?: string;
  isActive: boolean;
}

export interface ConductCriterion {
  id: string;
  categoryId: string;
  categoryName: string;
  code: string;
  name: string;
  description?: string;
  pointType: PointType;
  defaultPoint: number;
  deductionPerOccurrence?: number;
  evaluationType?: 'POINT_DEDUCTION' | 'PASS_FAIL';
  severity?: ViolationSeverity;
  status: 'active' | 'inactive';
  sortOrder: number;
}

export interface ConductRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  schoolYear: string;
  weekNumber: number; // 1..36
  monthNumber: number; // 1..12 or 9..12, 1..5
  criterionId: string;
  criterionName: string;
  categoryId: string;
  categoryName: string;
  pointType: PointType;
  point: number; // e.g. -2, +5
  violationCount?: number; // số lần mắc lỗi cùng tiêu chí
  deductionPerOccurrence?: number; // điểm trừ cơ bản cho mỗi lần vi phạm
  totalDeduction?: number; // tổng điểm trừ = số lần × điểm trừ mỗi lần
  level?: ViolationSeverity;
  
  // Record type distinction: 'VI_PHAM' or 'TICH_CUC'
  recordType?: 'VI_PHAM' | 'TICH_CUC';
  positiveContents?: string[];

  // Custom violation attributes & warnings
  categoryType?: ViolationCategoryType;
  violationGroup?: 'ATGT' | 'BẠO LỰC HỌC ĐƯỜNG' | 'GIAN LẬN KIỂM TRA' | 'HÚT THUỐC' | 'VI PHẠM KHÁC';
  specificBehavior?: string;
  evaluationStatus?: 'dat' | 'chua_dat';
  location?: string;
  recordedBy: string;
  recordedByName: string;
  recordDate: string; // YYYY-MM-DD
  note?: string;
  evidenceUrl?: string;
  evidenceName?: string;

  // Conduct Warning Rule fields
  hasConductWarning?: boolean;
  special_warning?: boolean;
  special_warning_message?: string;
  conduct_rating?: string;
  warningLevel?: WarningLevel;
  warningLabel?: string; // e.g. "⚠ ATGT", "🔴 VI PHẠM NGHIÊM TRỌNG", "🔴 GIAN LẬN THI CỬ"
  proposedRating?: string;
  requiresBghApproval?: boolean;

  // BGH Approval Status for this specific record
  bghApprovalStatus?: 'Chưa duyệt' | 'Đã duyệt' | 'Điều chỉnh' | 'Yêu cầu bổ sung';
  bghComment?: string;
  bghApprovedBy?: string;
  bghApprovedAt?: string;

  createdAt: string;
  updatedAt?: string;
}

export type ClassificationType = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';

export type ConfirmationStatus = 'Chờ GVCN đánh giá' | 'Đã GVCN đánh giá' | 'Chờ BGH xác nhận' | 'Đã xác nhận' | 'Yêu cầu điều chỉnh';

export interface ConductEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  schoolYear: string;
  period: string; // e.g. "Tháng 09", "Tháng 10", "Học kỳ I", "Học kỳ II", "Cả năm"
  totalPlus: number;
  totalMinus: number;
  totalScore: number;
  classification: ClassificationType;
  proposedClassification?: ClassificationType | string;
  
  // Warning summary for this evaluation
  hasSeriousViolation?: boolean;
  special_warning?: boolean;
  special_warning_message?: string;
  conduct_rating?: string;
  seriousViolationCount?: number;
  warningBadges?: string[]; // e.g. ["⚠ ATGT", "🔴 BẠO LỰC HỌC ĐƯỜNG"]
  proposedRatingText?: string;
  requiresBghApproval?: boolean;

  teacherComment?: string;
  teacherId: string;
  teacherName: string;
  principalComment?: string;
  confirmationStatus: ConfirmationStatus;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConductSettings {
  id: string;
  schoolYear: string;
  baseScore: number; // Default 100
  thresholds: {
    totMin: number; // Default 90
    khaMin: number; // Default 70
    datMin: number; // Default 50
  };
}

export interface TeacherAssessmentAspects {
  ruleCompliance?: string; // 1. Ý thức chấp hành nội quy
  learningAttitude?: string; // 2. Ý thức học tập
  responsibility?: string; // 3. Thái độ và tinh thần trách nhiệm
  collectiveActivities?: string; // 4. Ý thức tham gia hoạt động tập thể
  relationships?: string; // 5. Quan hệ với thầy cô và bạn bè
  selfDiscipline?: string; // 6. Ý thức tự giác
}

export interface TeacherAssessment {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  classId: string;
  className?: string;
  teacherId: string;
  teacherName?: string;
  semester: string; // "Học kỳ I", "Học kỳ II"
  schoolYear: string; // "2026–2027"
  weekNumber?: number; // 1..36
  period?: string; // e.g. "Tuần 01", "Tháng 09"
  month?: string; // e.g. "Tháng 09", "Tháng 10"
  monthNumber?: number; // 9, 10
  recordDate?: string; // Ngày ghi nhận / đánh giá (YYYY-MM-DD)
  assessment: TeacherAssessmentAspects;
  comment: string; // Nhận xét chung của GVCN
  levelRating: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'; // Đánh giá mức độ
  needsMonitoring: boolean; // Mức độ cần theo dõi: Có / Không
  teacherProposedRating: 'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt'; // Đề xuất xếp loại rèn luyện
  specialWarning?: boolean;
  
  // BGH Approval Status for student's teacher assessment
  bghApprovalStatus?: 'Chờ BGH duyệt' | 'Đã duyệt' | 'Yêu cầu điều chỉnh' | 'Điều chỉnh';
  bghApprovedBy?: string;
  bghApprovedByName?: string;
  bghApprovedAt?: string;
  bghComment?: string;
  bghAdjustedRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';

  recordedBy: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type RatingColorKey = 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';

export interface RatingTierItem {
  id: string;
  name: string; // e.g. "Tốt", "Khá", "Đạt", "Chưa đạt"
  min_score: number; // e.g. 90
  max_score: number; // e.g. 100
  color: string; // 'emerald' | 'blue' | 'amber' | 'rose' | etc.
  sort_order: number;
  is_active: boolean;
}

export type EvaluationPeriodScopeType = 'all' | 'month' | 'week' | 'year';

export interface EvaluationRatingConfig {
  id: string;
  school_id: string; // default "thpt_son_luong"
  name: string;
  school_year: string; // e.g. "2026–2027"
  evaluation_period_type: EvaluationPeriodScopeType; // 'all' | 'month' | 'week' | 'year'
  evaluation_period_id: string; // 'all' or 'Tháng 09', 'Tuần 03', 'year'
  tiers: RatingTierItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface EvaluationRatingConfigHistory {
  id: string;
  config_id: string;
  action: 'create' | 'update' | 'restore_default';
  performed_by: string;
  performed_by_role?: string;
  performed_at: string;
  before_change: RatingTierItem[] | null;
  after_change: RatingTierItem[];
  note?: string;
}

export interface StudentRatingResult {
  rating_name: string;
  min_score: number;
  max_score: number;
  color: string;
  badge_style: string;
  tier?: RatingTierItem;
}

// 04 Nội dung đánh giá rèn luyện riêng của GVCN
export type EvaluationStatusType = 'dat' | 'chua_dat';

export interface TeacherAssessmentCompletion {
  id: string; // `${classId}_${schoolYear}_${month}`
  classId: string;
  className: string;
  schoolYear: string;
  month: string;
  semester: string;
  totalStudents: number;
  evaluatedCount: number;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  ratingCounts?: Record<string, number>;
  note?: string;
  updatedAt?: string;

  // BGH Approval fields
  approvalStatus?: 'Chờ BGH duyệt' | 'Đã duyệt' | 'Yêu cầu điều chỉnh';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  bghComment?: string;
}


