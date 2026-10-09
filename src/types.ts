export type Role = 'admin' | 'ADMIN' | 'BGH' | 'TTCM' | 'GIAO_VU' | 'NHAN_SU' | 'GIAO_VIEN';

export interface SystemModule {
  id: string;
  title: string;
  desc: string;
  icon: string;
  route: string;
  gradient: string;
  shadowColor: string;
  order: number;
  enabled: boolean;
  allowedRoles: Role[];
  showOnHome: boolean;
  showOnSidebar: boolean;
  showOnHeader?: boolean;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatar?: string;
  departmentId?: string;
  position?: string;
}

export interface Department {
  id: string;
  name: string;
  headId: string;
  description?: string;
  shortName?: string;
}

export interface SchoolStats {
  totalTeachers?: number;
  totalStudents: number;
  totalClasses: number;
  schoolYear: string;
  motto?: string;
  welcomeMessage?: string;
}

export interface Teacher extends User {
  code: string;
  subject: string;
  phone: string;
  email: string;
  joinDate: string;
  degree: string;
  status: 'Đang công tác' | 'Nghỉ phép' | 'Đã nghỉ việc';
  departmentName?: string;
  position?: string;
}

export type DisciplineLevel = string;

export interface DisciplineCriterion {
  id: string;
  name: string;
  description?: string;
  order: number;
  status: 'active' | 'inactive';
}

export interface DisciplineRecord {
  id: string;
  teacherId: string;
  departmentId: string;
  date: string;
  criteria: string;
  criterionId?: string;
  level?: DisciplineLevel;
  inspectorId: string;
  note?: string;
  ttcmComment?: string;
  bghComment?: string;
  ttcmGeneralNote?: string;
  bghGeneralNote?: string;
  evaluatorRole?: 'TTCM' | 'BGH';
  evidenceUrl?: string;
}

export interface EvaluationCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  order: number;
  status: 'active' | 'inactive';
}

export interface EvaluationCriterion {
  id: string;
  categoryId: string;
  name: string;
  code?: string;
  description?: string;
  order: number;
  status: 'active' | 'inactive';
}

export interface TaskEvaluation {
  result: 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành' | 'Chậm/muộn' | 'Không thực hiện' | 'Đang thực hiện' | '';
  actualCompletionDate?: string;
  noiQuyResult?: string;
  noiQuyComment?: string;
  quyCheChuyenMonResult?: string;
  quyCheChuyenMonComment?: string;
  vanHoaCongSoResult?: string;
  vanHoaCongSoComment?: string;
  thongTinBaoCaoResult?: string;
  thongTinBaoCaoComment?: string;
  comment?: string;
  criteriaResults?: Record<string, 'Tốt' | 'Đạt' | 'Chưa đạt' | 'Vi phạm' | ''>; // key: criterionId
  categoryComments?: Record<string, string>; // key: categoryId
  kpiRecordId?: string; // ID of the created KPI Record
  kpiCriteriaId?: string;
  evaluatorId: string;
  evaluatedAt: string;
}

export type ExecutionResult = 'Hoàn thành tốt' | 'Quá hạn (Chậm muộn)';

export type WorkAssignmentStatus = 'Chưa thực hiện' | 'Đang thực hiện' | 'Hoàn thành' | 'Hoàn thành tốt' | 'Chậm tiến độ' | 'Quá hạn' | 'Đã hoàn thành' | 'Đã đánh giá';
export type WorkAssignmentPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn cấp';

export interface WorkAssignment {
  id: string;
  departmentId: string;
  weekLabel: string;
  workDate: string;
  content: string;
  assigneeId: string;
  assigneeIds?: string[];
  deadline: string;
  evaluatorId: string;
  note?: string;
  scope?: 'school' | 'department';
  academic_year?: string;
  academicYear?: string;
  week_number?: number;
  weekNumber?: number;
  status: WorkAssignmentStatus;
  priority?: WorkAssignmentPriority;
  requirements?: string;
  progress?: number;
  evidenceUrl?: string;
  evidenceName?: string;
  resultSummary?: string;
  completionDate?: string;
  evaluationResult?: 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
  evaluationComment?: string;
  incompleteAssigneeIds?: string[];
  overdueAssigneeIds?: string[];
  completedAssigneeIds?: string[];
  assigneeResults?: Record<string, ExecutionResult>;
  evaluations?: Record<string, TaskEvaluation>;
  evaluationDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'Chưa bắt đầu' | 'Đang thực hiện' | 'Chờ kiểm tra' | 'Đã hoàn thành' | 'Quá hạn' | 'Tạm dừng';
export type TaskPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn cấp';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  assignerId: string;
  createdAt: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // 0 - 100
  evidenceUrl?: string;
  scope?: 'school' | 'department';
  departmentId?: string;
  assigneeType?: 'all' | 'department' | 'individual';
  assignedDepartmentId?: string;
  kpiId?: string;
  kpiCode?: string;
  kpiName?: string;
  kpiPointType?: 'plus' | 'minus';
  kpiPointValue?: number;
  kpiPoints?: number;
}

export type KpiPointType = 'plus' | 'minus';

export interface GeneralKpi {
  id: string;
  code: string; // Mã KPI chung (vd: KPIC_THPT, KPIC_2025...)
  name: string; // Tên KPI chung (vd: Đánh giá thực hiện nhiệm vụ CBGVNV)
  description?: string;
  targetAudience: string; // Đối tượng áp dụng (vd: Tất cả CBGVNV, Giáo viên...)
  applicableYear: string; // Năm áp dụng (vd: 2025-2026, 2026-2027...)
  status: 'active' | 'inactive';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

// 4 ĐỐI TƯỢNG ĐÁNH GIÁ KPI CHUẨN CỦA TRƯỜNG THPT MINH HÒA
export type KpiTargetCode = 'CBQL' | 'TTCM_TPCM' | 'GV' | 'NV';

export interface KpiGroup {
  id: string;
  generalKpiId?: string; // ID của KPI chung liên kết (nếu có)
  code: string; // Mã nhóm (N01, NN, CM, CN, TT, CV, VH, HC, PV, K...)
  name: string; // Tên nhóm KPI (Tư tưởng, đạo đức, lối sống, Nền nếp, Chuyên môn...)
  description?: string;
  groupScore?: number; // Tổng điểm nhóm dự kiến / tối đa
  order: number;
  status: 'active' | 'inactive';
  targetAudience?: string; // Chuỗi đối tượng hoặc 'Tất cả CBGVNV'
  targetAudiences?: KpiTargetCode[]; // Mảng đối tượng áp dụng (CBQL, TTCM_TPCM, GV, NV)
  createdAt?: string;
  updatedAt?: string;
}

// CẤP 2: NHÓM TIÊU CHÍ KPI (KPI_CATEGORY)
export interface KpiCategory {
  id: string;
  groupId: string; // BẮT BUỘC: ID của Nhóm KPI cha (KPI_GROUP)
  group_id?: string; // alias for compatibility
  groupCode?: string; // Mã nhóm KPI cha
  groupName?: string; // Tên nhóm KPI cha
  code: string; // Mã nhóm tiêu chí (vd: N01.01, N01.02, CM01...)
  name: string; // Tên nhóm tiêu chí (vd: Chính trị, tư tưởng; Đạo đức, lối sống...)
  description?: string;
  order: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface KpiDeductionRule {
  id: string;
  name: string; // Tên mức vi phạm (ví dụ: Vi phạm mức nhẹ, Đi muộn 5-7 phút)
  description?: string;
  deductionScore: number; // Số điểm trừ (số dương, vd: 1, 2, 5)
  unit: string; // "Lần", "Tiết", "Ngày"...
  status: 'active' | 'inactive';
  order?: number;
}

export interface KpiItem {
  id: string;
  code: string; // Mã tiêu chí (vd: N01.01.01, N01.02.01, CM01.01...)
  groupId: string; // BẮT BUỘC: ID nhóm KPI liên kết (Cấp 1)
  group_id?: string;
  categoryId?: string; // BẮT BUỘC: ID nhóm tiêu chí KPI liên kết (Cấp 2)
  category_id?: string;
  group: string; // Tên nhóm KPI (hỗ trợ fallback và hiển thị)
  categoryName?: string; // Tên nhóm tiêu chí KPI
  generalKpiId?: string; // ID của KPI chung liên kết (Cấp cũ nếu có)
  name: string;
  targetAudience: string; // Chuỗi đối tượng hiển thị (vd: 'CBQL, TTCM_TPCM, GV, NV' hoặc 'Tất cả CBGVNV')
  targetAudiences?: KpiTargetCode[]; // Danh sách các đối tượng được chọn (hỗ trợ 1 tiêu chí áp dụng nhiều đối tượng, không nhân bản)
  pointType: KpiPointType; // 'plus' | 'minus'
  pointValue: number; // Điểm tiêu chí (standardScore)
  standardScore: number; // Điểm chuẩn tối đa của tiêu chí (Điểm nền)
  hasDeduction: boolean; // Có áp dụng điểm trừ
  deductionRules: KpiDeductionRule[]; // Các mức điểm trừ
  plusScore?: number; // Điểm cộng nếu có
  minusScore?: number; // Điểm trừ mặc định nếu có
  condition?: string; // Điều kiện áp dụng
  evidenceRequirement?: string; // Yêu cầu minh chứng
  evaluatorRole?: string; // Người đánh giá (CBQL, TTCM, BGH, v.v.)
  unit: string;
  maxPoints?: number;
  minPoints?: number;
  status: 'active' | 'inactive';
  order?: number;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KpiHistoryItem {
  id?: string;
  action: 'create' | 'update' | 'confirm' | 'reject' | 'cancel' | 'delete' | string;
  performedBy: string;
  timestamp: string;
  details?: string;
  previousData?: any;
  newData?: any;
}

export interface KpiMonthlySetting {
  id: string; // e.g. "default" or `setting_${academicYear}_${month}`
  academicYear: string;
  month?: string; // "01".."12" or "all"
  defaultBasePoints: number; // Mặc định 100
  preventNegativeScore?: boolean; // Không cho phép điểm âm nếu không có cấu hình đặc biệt
  capDeductionsAtBasePoints?: boolean; // Giới hạn điểm trừ không vượt quá điểm nền
  isLocked?: boolean; // Khóa kỳ KPI tháng (CBQL có quyền khóa)
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface KpiRecord {
  id: string;
  teacherId: string; // ID giáo viên (employee_id)
  teacherName?: string;
  teacherCode?: string;
  departmentId?: string;
  departmentName?: string;
  kpiId: string;
  kpiCode: string;
  kpiName: string;
  generalKpiId?: string;
  groupId?: string;
  group: string;
  pointType: KpiPointType;
  pointValue: number;
  points: number; // Điểm phát sinh âm (ví dụ: -2)
  unit: string;
  quantity: number; // Số lần vi phạm
  totalPoints: number; // points * quantity (ví dụ: -2)
  // Snapshot và thông tin chi tiết mức vi phạm theo mô hình mới
  standardScoreSnapshot: number; // Điểm chuẩn của tiêu chí tại thời điểm ghi nhận
  resultStatus?: 'pending' | 'good' | 'violation'; // Kết quả đánh giá: 'good' (Thực hiện tốt) hoặc 'violation' (Có vi phạm)
  actualScore?: number; // Điểm thực tế (MAX(0, standardScore - totalDeduction))
  deductionRuleId?: string; // ID mức vi phạm được chọn
  deductionRuleNameSnapshot?: string; // Tên mức vi phạm tại thời điểm ghi nhận
  deductionScoreSnapshot?: number; // Điểm trừ cho mỗi lần vi phạm (số dương)
  totalDeduction?: number; // Tổng điểm trừ (deductionScoreSnapshot * quantity)
  taskId?: string;
  taskTitle?: string;
  date: string; // YYYY-MM-DD
  month?: string; // "01" .. "12"
  academicYear?: string; // e.g. "2025-2026"
  assignedBy: string;
  evidenceUrl?: string;
  evidenceName?: string;
  evidenceType?: string;
  evidenceNote?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  confirmedBy?: string;
  confirmedDate?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  note?: string;
  history?: KpiHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KpiRuleOption {
  id?: string;
  label: string;
  score: number;
}

export interface KpiEvaluationItem {
  id: string;
  formId?: string;
  form_id?: string;
  stt: number;
  
  // Cấu trúc tiêu chí KPI snapshot theo file
  code?: string;
  kpi_code?: string; // Mã KPI: CBQL-A1, GV-B1, etc.
  kpi_group?: string; // Nhóm KPI: Phẩm chất chính trị..., Chuyên môn...
  group?: string;
  criterionName: string; // Tên/Nội dung tiêu chí
  criterion_content?: string; // Tiêu chí thành phần
  description?: string;
  standardScore: number; // Điểm chuẩn (Điểm nền)
  base_score?: number; // Điểm nền (100đ tổng theo mẫu)
  
  // Mức điểm trừ và mức điểm cộng quy định theo file
  minus_rules?: KpiRuleOption[];
  plus_rules?: KpiRuleOption[];
  evidence_rule?: string; // Yêu cầu minh chứng
  evaluator_role?: string; // Người đánh giá theo quy định trong file

  // PHẦN A: TỰ ĐÁNH GIÁ (Evaluatee)
  selfScore?: number; // Điểm tự đánh giá
  self_score?: number;
  self_kpi_score?: number;
  selfPlusScore?: number; // Điểm cộng tự đánh giá
  self_plus_score?: number;
  selfMinusScore?: number; // Điểm trừ tự đánh giá
  self_minus_score?: number;
  evidence?: string; // Minh chứng (link, file, mô tả)
  self_evidence?: string;
  selfComment?: string; // Ý kiến / Tự nhận xét tiêu chí
  self_comment?: string;
  selected_self_minus_label?: string;
  selected_self_plus_label?: string;

  // PHẦN B: ĐÁNH GIÁ CỦA LÃNH ĐẠO / NGƯỜI ĐÁNH GIÁ (Evaluator)
  evaluatorScore?: number; // Điểm người đánh giá chấm
  evaluator_score?: number;
  evaluator_kpi_score?: number;
  evaluatorPlusScore?: number; // Điểm cộng do người đánh giá chấm
  evaluator_plus_score?: number;
  evaluatorMinusScore?: number; // Điểm trừ do người đánh giá chấm
  evaluator_minus_score?: number;
  evaluatorComment?: string; // Nhận xét của người đánh giá cho tiêu chí
  evaluator_comment?: string;
  evaluatorNote?: string; // Ghi chú người đánh giá
  evaluator_note?: string;
  selected_evaluator_minus_label?: string;
  selected_evaluator_plus_label?: string;

  // ĐIỂM CHÍNH THỨC
  plusScore: number; // Điểm cộng chính thức
  plus_score?: number;
  minusScore: number; // Điểm trừ chính thức
  minus_score?: number;
  kpiScore: number; // Điểm KPI cuối cùng = base_score + plus - minus
  kpi_score?: number;
  comment?: string; // Ghi chú chung
}

export interface KpiEvaluationForm {
  id: string;
  // Evaluatee info (CamelCase and Snake_case for full compatibility)
  teacherId: string;
  employee_id?: string;
  teacherName: string;
  employee_name_snapshot?: string;
  teacherCode?: string;
  employee_code_snapshot?: string;
  position?: string;
  employee_position_snapshot?: string;
  position_snapshot?: string;
  departmentId?: string;
  department_id?: string;
  departmentName?: string;
  employee_department_snapshot?: string;
  department_snapshot?: string;
  
  targetGroup: KpiTargetCode; // 'CBQL' | 'TTCM_TPCM' | 'GV' | 'NV'
  evaluation_type?: string;
  
  month: string; // "01" .. "12"
  evaluation_month?: string;
  academicYear: string; // e.g. "2025-2026", "2026-2027"
  academic_year?: string;
  
  // Evaluator info & Snapshots
  evaluatorId: string;
  evaluator_id?: string;
  evaluatorName: string;
  evaluator_name_snapshot?: string;
  evaluatorPosition?: string;
  evaluator_position_snapshot?: string;
  evaluatorDepartment?: string;
  evaluator_department_snapshot?: string;
  
  evaluationDate: string; // YYYY-MM-DD
  self_assessed_at?: string; // Thời điểm hoàn thành tự đánh giá
  self_submitted_at?: string;
  submitted_at?: string; // Thời điểm gửi phiếu cho người đánh giá
  evaluated_at?: string; // Thời điểm người đánh giá hoàn tất đánh giá

  status: 'draft' | 'self_assessing' | 'self_assessed' | 'pending_evaluator' | 'pending_evaluation' | 'submitted' | 'evaluating' | 'evaluated' | 'confirmed' | 'locked' | 'rejected' | string;
  
  totalStandardScore: number; // Tổng điểm nền tiêu chí (100 điểm)
  base_total_score?: number;
  totalSelfScore?: number; // Tổng điểm tự đánh giá
  self_total_score?: number;
  self_total_minus?: number;
  self_total_plus?: number;
  totalEvaluatorScore?: number; // Tổng điểm do người đánh giá chấm
  evaluator_total_score?: number;
  evaluator_total_minus?: number;
  evaluator_total_plus?: number;
  totalPlusScore: number; // Tổng điểm cộng chính thức
  totalMinusScore: number; // Tổng điểm trừ chính thức
  totalKpiScore: number; // Tổng điểm KPI = 100 - totalMinusScore + totalPlusScore
  final_kpi_score?: number;
  items: KpiEvaluationItem[]; // Bộ tiêu chí được snapshot trực tiếp trong phiếu
  
  note?: string; // Ghi chú chung
  evaluateeComment?: string; // Ý kiến của người tự đánh giá (Phần A)
  evaluatorComment?: string; // Ý kiến / Kết luận của người đánh giá (Phần B)
  rejectionReason?: string;
  confirmedBy?: string;
  confirmedDate?: string;
  lockedAt?: string;
  lockedBy?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export type ReportStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Yêu cầu chỉnh sửa';

export interface Report {
  id: string;
  title: string;
  authorId: string;
  departmentId: string;
  date: string;
  type: string;
  content: string;
  status: ReportStatus;
  reviewerId?: string;
  reviewDate?: string;
  feedback?: string;
  fileName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  type: 'task' | 'report' | 'discipline' | 'system';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'Họp' | 'Dự giờ' | 'Thao giảng' | 'Sinh hoạt tổ' | 'Hạn chót' | 'Sự kiện';
  description?: string;
}

export type LeaveType = 'Nghỉ phép năm' | 'Nghỉ việc riêng' | 'Nghỉ ốm đau, thai sản' | 'Nghỉ không lương' | 'Khác';
export type LeaveStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';


export type LeaveSession = 'Cả ngày' | 'Buổi sáng' | 'Buổi chiều';

export type AttendanceStatus = 'present' | 'annual_leave' | 'sick_leave' | 'personal_leave' | 'business_trip' | 'policy_leave' | 'absent' | 'other';

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  departmentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  leaveRecordId?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRecord {
  session?: LeaveSession;
  totalDays?: number;
  note?: string;
  attachmentUrl?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  id: string;
  teacherId: string;
  employee_id?: string;
  employee_name?: string;
  departmentId: string;
  department_id?: string;
  department_name?: string;
  position?: string;
  code?: string;
  startDate: string;
  start_date?: string;
  endDate: string;
  end_date?: string;
  reason: string;
  type: LeaveType;
  leave_type?: string;
  status: LeaveStatus;
  approverId?: string;
  approverNote?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
