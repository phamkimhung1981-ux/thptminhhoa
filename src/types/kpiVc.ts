// Types for Module "ĐÁNH GIÁ KPI GIÁO VIÊN TRƯỜNG THPT SƠN LƯƠNG"
// Căn cứ file: "Mẫu VC giáo viên, nhân viên tự chấm điểm.pdf"

export type KpiVcScoreType = 'input_score' | 'select_level' | 'fixed_score';

export interface KpiVcLevel {
  id: string;
  code: string; // e.g. '2.1', '2.2', '2.3', '2.4', '2.5'
  name: string; // e.g. 'MỨC 1', 'MỨC 2', ...
  score: number; // 60, 50, 30, 20, 10
  description: string;
  order: number;
}

export interface KpiVcCriterion {
  id: string;
  code: string; // e.g. 'I.1', 'II.1', 'III.A.1', 'GV01', 'GV10'
  groupId: string; // 'group_I', 'group_II', 'group_III'
  groupName: string;
  subGroup?: 'A' | 'B';
  order: number;
  content: string; // Nội dung đánh giá
  maxScore: number; // Điểm tối đa
  scoreType: KpiVcScoreType;
  levels?: KpiVcLevel[];
  guideline?: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface KpiVcCriteriaGroup {
  id: string;
  code: string; // 'I', 'II', 'III'
  name: string; // 'Chính trị tư tưởng...', 'Tác phong...', 'Kết quả thực hiện nhiệm vụ'
  maxScore: number; // 15, 15, 70
  order: number;
  description?: string;
  isActive: boolean;
}

export interface KpiVcPeriod {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'locked' | 'draft';
  description?: string;
  periodType?: 'month' | 'term' | 'year';
  periodValue?: string;
  createdAt?: string;
  lockedAt?: string | null;
  lockedBy?: string | null;
}

export interface KpiVcScoreItem {
  criterionId: string;
  criterionCode: string;
  groupId: string;
  groupName: string;
  subGroup?: 'A' | 'B';
  order: number;
  content: string;
  maxScore: number;
  scoreType: KpiVcScoreType;
  selectedLevelId?: string | null;
  selectedLevelName?: string | null;
  selectedLevelCode?: string | null;
  selfScore: number; // Điểm cá nhân tự chấm
  note?: string; // Ghi chú / minh chứng cá nhân
  
  // TTCM đánh giá
  ttcmScore?: number | null;
  ttcmComment?: string;
  
  // CBQL đánh giá
  managerScore?: number | null;
  managerComment?: string;
}

export interface KpiVcCriteriaSnapshot {
  version: number;
  snapshotDate: string;
  groups: KpiVcCriteriaGroup[];
  criteria: KpiVcCriterion[];
}

export interface KpiVcRatingTier {
  id: string;
  ratingName: string; // Tên xếp loại (ví dụ: 'Hoàn thành xuất sắc nhiệm vụ', 'Xuất sắc', 'A', 'Mức 1'...)
  minScore: number; // Điểm tối thiểu (từ điểm)
  maxScore: number; // Điểm tối đa (đến điểm)
  badgeColor: string; // 'emerald' | 'blue' | 'indigo' | 'purple' | 'amber' | 'rose' | 'slate' | custom
  sortOrder: number; // Thứ tự ưu tiên
  isActive: boolean; // Trạng thái: Đang dùng / Tạm dừng
  description?: string;
}

export interface KpiVcRatingConfigHistory {
  id: string;
  configId: string;
  periodId: string;
  periodName?: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  action: 'create' | 'update' | 'restore_default' | 'copy_period';
  tiers: KpiVcRatingTier[];
  note?: string;
}

export interface KpiVcRatingConfig {
  id: string; // e.g. 'vc_rating_default' or `vc_rating_${periodId}`
  periodId: string; // 'all' (Mặc định toàn trường) hoặc id kỳ cụ thể
  periodName?: string;
  academicYear?: string;
  scaleMaxScore: number; // Thang điểm: mặc định 100
  tiers: KpiVcRatingTier[];
  isLockedWhenPeriodCompleted?: boolean; // [ ] Khóa xếp loại khi kỳ đánh giá đã hoàn thành
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  note?: string;
}

export type KpiVcFormStatus = 'draft' | 'self_evaluated' | 'submitted' | 'ttcm_evaluated' | 'returned' | 'completed' | 'locked';

export interface KpiVcFormHistory {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  previousScore?: number | null;
  newScore?: number | null;
  comment?: string;
  timestamp: string;
}

export interface KpiVcForm {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  employeeUsername?: string;
  employeeAvatar?: string | null;
  position: string; // e.g. 'Giáo viên Toán', 'Nhân viên Văn thư'
  department: string; // e.g. 'Tổ Toán - Tin', 'Tổ Văn phòng'
  departmentId?: string | null;
  subject?: string;
  isHomeroom?: boolean;
  homeroomClass?: string;

  periodId: string;
  periodName: string;
  academicYear: string;

  criteriaSnapshot: KpiVcCriteriaSnapshot;
  items: KpiVcScoreItem[];

  // Group Scores
  groupScores: Record<string, number>; // { 'group_I': 15, 'group_II': 15, 'group_III': 70 }
  ttcmGroupScores?: Record<string, number>;
  managerGroupScores?: Record<string, number>;

  // Total Scores
  totalScore: number; // Điểm tự chấm (0..100)
  ttcmTotalScore?: number | null; // Điểm TTCM chấm (0..100)
  managerTotalScore?: number | null; // Điểm CBQL chấm (0..100)
  maxTotalScore: number; // 100

  // Evaluator Selection (Cán bộ quản lý / Lãnh đạo do GV tự chọn)
  evaluatorId?: string;
  evaluatorName?: string;
  evaluatorRole?: string;

  // TTCM Assessor Info
  ttcmEvaluatorId?: string;
  ttcmEvaluatorName?: string;
  ttcmEvaluatorRole?: string;
  ttcmEvaluatorDepartment?: string;
  ttcmEvaluatedAt?: string | null;
  ttcmClassification?: string;
  ttcmComment?: string;
  ttcmDate?: string;
  ttcmStatus?: 'pending' | 'evaluated';

  // BGH Assessor Info (Cấp 2 - Ban Giám hiệu)
  bghEvaluatorId?: string;
  bghEvaluatorName?: string;
  bghEvaluatorRole?: string;
  bghEvaluatorDepartment?: string;
  bghEvaluatedAt?: string | null;
  bghClassification?: string;
  bghComment?: string;
  bghDate?: string;
  bghStatus?: 'pending' | 'evaluated';
  bghTotalScore?: number | null;
  hasTtcmEval?: boolean;
  hasBghEval?: boolean;

  // Self Assessment
  selfClassification: string; // 'Hoàn thành xuất sắc nhiệm vụ' | ...
  selfDate: string;
  selfSignName: string;
  selfComment?: string;

  // Manager Assessment (Phần dành cho CBQL / Người đứng đầu)
  leaderClassification?: string;
  leaderScore?: number;
  leaderComment?: string;
  leaderDate?: string;
  leaderSignName?: string;
  leaderSignRole?: string;
  managerGeneralComment?: string;
  managerEvaluatedAt?: string | null;

  // Status & Metadata
  status: KpiVcFormStatus;
  history?: KpiVcFormHistory[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  createdBy: string;
  updatedBy?: string;
}

export interface KpiVcAuditLog {
  id: string;
  formId?: string;
  periodId?: string;
  criterionId?: string;
  action: 'create_form' | 'update_form' | 'submit_form' | 'lock_form' | 'unlock_form' | 'delete_form' | 'bulk_delete_forms' | 'create_criterion' | 'update_criterion' | 'delete_criterion' | 'create_period' | 'update_period';
  actorId: string;
  actorName: string;
  actorRole?: string;
  targetName: string;
  description: string;
  timestamp: string;
}
