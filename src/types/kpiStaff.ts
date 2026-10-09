// Types for Module "PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI NHÂN VIÊN - TRƯỜNG THPT MINH HÒA"
// Cấu trúc điểm: 30 điểm KPI chung + 70 điểm KPI vị trí việc làm = 100 điểm.

export type StaffPositionKey = 
  | 'KE_TOAN'
  | 'THU_QUY'
  | 'VAN_THU'
  | 'Y_TE'
  | 'BAO_VE'
  | 'PHUC_VU'
  | 'THU_VIEN'
  | 'THIET_BI';

export interface KpiStaffPositionConfig {
  key: StaffPositionKey;
  title: string; // e.g. 'B. KPI VỊ TRÍ VIỆC LÀM: KẾ TOÁN – 70 ĐIỂM'
  positionName: string; // e.g. 'Kế toán'
  keywords: string[];
  totalScore: number; // 70
  criteria: KpiStaffCriterionItem[];
  evidenceSuggestion: string;
  trackingPerson: string;
}

export interface KpiStaffCriterionItem {
  id: string;
  code: string; // e.g. 'NV-A1', 'NVKT-1', 'NVTQ-1'
  stt?: number;
  category?: 'A_CHUNG' | 'B_VI_TRI' | string;
  groupId?: string;
  groupName?: string;
  order?: number;
  content: string; // Nội dung đánh giá / nhiệm vụ cụ thể
  maxScore: number;
  scoreType?: string;
  guideline?: string;
  isActive?: boolean;
}

export type KpiStaffCriterion = KpiStaffCriterionItem;

export interface KpiStaffCriteriaGroup {
  id: string;
  code?: string;
  name: string;
  maxScore: number;
  criteria?: KpiStaffCriterionItem[];
}

export interface KpiStaffScoreItem {
  criterionId: string;
  code: string;
  category: 'A_CHUNG' | 'B_VI_TRI';
  content: string;
  maxScore: number;
  
  // Scoring values
  selfScore: number; // Cá nhân tự chấm
  ttcmScore?: number | null; // Tổ trưởng đánh giá
  ttcmComment?: string;
  isNA?: boolean; // Tùy chọn N/A nếu không giao
  evidence?: string; // Minh chứng / ghi chú

  // Evaluator scoring
  supervisorScore?: number | null;
  supervisorComment?: string;
  managerScore?: number | null; // BGH chấm
  managerComment?: string;
}

export interface KpiStaffPeriod {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'locked' | 'draft';
  description?: string;
  periodType?: 'month' | 'term' | 'year' | string;
  periodValue?: string;
}

export type KpiStaffFormStatus = 'draft' | 'self_evaluated' | 'submitted' | 'completed' | 'locked';

export interface KpiStaffForm {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  employeeUsername?: string;
  position: string; // e.g. 'Kế toán', 'Văn thư', 'Bảo vệ', 'Thủ quỹ'...
  positionKey: StaffPositionKey; // Registered active position KPI set
  department: string; // 'Tổ Văn phòng'
  departmentId?: string | null;

  evaluatorName?: string; // Người đánh giá (Hiệu trưởng / TTVP)

  periodId: string;
  periodName: string;
  academicYear: string;

  // Score Items list
  generalItems: KpiStaffScoreItem[]; // Section A: 30 điểm KPI Chung
  positionItems: KpiStaffScoreItem[]; // Section B: 70 điểm KPI Vị trí

  // Calculated totals
  generalTotalSelf: number; // max 30
  generalTotalTtcm?: number | null;
  generalTotalManager?: number | null;

  positionTotalSelf: number; // max 70
  positionTotalTtcm?: number | null;
  positionTotalManager?: number | null;

  totalScore: number; // max 100
  ttcmTotalScore?: number | null;
  managerTotalScore?: number | null;

  // Classification
  selfClassification: string;
  ttcmClassification?: string;
  leaderClassification?: string;
  bghClassification?: string;

  // Comments
  selfComment?: string;
  managerGeneralComment?: string;

  // Metadata
  status: KpiStaffFormStatus;
  selfDate: string;
  leaderDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}
