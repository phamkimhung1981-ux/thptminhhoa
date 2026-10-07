export interface KpiCbqlPeriod {
  id: string;
  name: string; // Tên kỳ đánh giá: ví dụ "Tháng 09/2026", "Học kỳ I Năm học 2026-2027", "Năm học 2026-2027"
  academicYear: string; // "2026-2027"
  periodType: 'month' | 'term' | 'year'; // Loại kỳ
  periodValue: string; // '09', 'HK1', '2026-2027'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'active' | 'locked' | 'draft';
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface KpiCbqlCriteriaGroup {
  id: string; // 'group_I', 'group_II', 'group_III'
  code: string; // 'I', 'II', 'III'
  name: string; // 'CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG', 'TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT', 'KẾT QUẢ THỰC HIỆN NHIỆM VỤ'
  maxScore: number; // 15, 15, 70
  order: number;
  description?: string;
}

export interface KpiCbqlScoreLevel {
  id: string;
  label: string; // e.g. "Mức 1 (Xuất sắc)", "Mức 2 (Tốt)", "Mức 3 (Khá/Đạt)", "Mức 4 (Chưa đạt)"
  score: number; // e.g. 2.0, 1.5, 1.0, 0
  description?: string;
}

export interface KpiCbqlCriterion {
  id: string;
  groupId: string; // 'group_I', 'group_II', 'group_III'
  groupCode: string; // 'I', 'II', 'III'
  subCategoryTitle?: string; // e.g. "1. Năng lực quản lý và điều hành", "2. Kết quả chỉ đạo chuyên môn..."
  subCategoryIndex?: string; // "1", "2", "3"
  code: string; // e.g. "I.1", "I.2", "II.1", "III.1.1", "III.2.1"
  name: string;
  description: string;
  maxScore: number;
  order: number;
  levels: KpiCbqlScoreLevel[]; // Thang mức điểm (bắt buộc chọn qua radio/select)
  evidenceRequirement?: string;
  evaluatorRole?: string;
  status: 'active' | 'inactive';
}

export interface KpiCbqlScoreItem {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  groupId: string; // 'group_I', 'group_II', 'group_III'
  groupCode: string;
  subCategoryTitle?: string;
  maxScore: number;
  
  // Điểm tự đánh giá
  selfScore: number;
  selfLevelId?: string;
  selfLevelLabel?: string;
  selfEvidence?: string;
  selfEvidenceUrl?: string;
  selfNote?: string;
  
  // Điểm người đánh giá (thủ trưởng) chấm
  evaluatorScore: number;
  evaluatorLevelId?: string;
  evaluatorLevelLabel?: string;
  evaluatorNote?: string;
}

export type KpiCbqlFormStatus = 'draft' | 'pending_evaluation' | 'evaluated' | 'locked';

export interface KpiCbqlForm {
  id: string;
  // Người được đánh giá (CBQL)
  evaluateeId: string;
  evaluateeName: string;
  evaluateeCode: string;
  evaluateePosition: string; // "Hiệu trưởng", "Phó Hiệu trưởng", "Chủ tịch Hội đồng trường"
  evaluateeDepartmentId?: string | null;
  evaluateeDepartmentName?: string | null;
  evaluateeAvatar?: string | null;
  evaluatorAvatar?: string | null;
  evaluateAvatar?: string | null;
  
  // Kỳ đánh giá
  periodId: string;
  periodName: string;
  academicYear: string;
  
  // Người tự đánh giá
  selfEvaluatorId: string;
  selfEvaluatorName: string;
  
  // Người đánh giá (Thủ trưởng / Cấp trên)
  evaluatorId: string;
  evaluatorName: string;
  evaluatorPosition: string;
  
  // Điểm tối đa
  maxTotalScore: number; // Luôn luôn là 100
  
  // Điểm tự chấm
  selfGroupScores: {
    group_I: number; // Max 15
    group_II: number; // Max 15
    group_III: number; // Max 70
  };
  selfTotalScore: number; // Tổng I + II + III (Max 100)
  
  // Điểm thủ trưởng đơn vị chấm
  evaluatorGroupScores: {
    group_I: number; // Max 15
    group_II: number; // Max 15
    group_III: number; // Max 70
  };
  evaluatorTotalScore: number; // Tổng I + II + III (Max 100)
  
  // Độ lệch điểm = evaluatorTotalScore - selfTotalScore
  scoreDifference: number;
  
  // Xếp loại
  grade?: 'Xuất sắc' | 'Tốt' | 'Hoàn thành' | 'Không hoàn thành' | 'Chưa xếp loại';
  
  // Nhận xét
  selfComment: string; // Tự nhận xét của CBQL
  evaluatorComment: string; // Nhận xét của Thủ trưởng
  
  // Minh chứng chung (nếu có)
  generalEvidence?: string;
  evidenceLinks?: string[];
  
  // Danh sách điểm từng tiêu chí
  items: KpiCbqlScoreItem[];
  
  // Trạng thái phiếu
  status: KpiCbqlFormStatus;
  
  // Thời gian
  createdAt: string;
  submittedAt?: string;
  evaluatedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  updatedAt?: string;
}

export interface KpiCbqlAssignment {
  id: string;
  evaluateeId: string;
  evaluatorId: string;
  periodId?: string;
  assignedBy: string;
  assignedAt: string;
  note?: string;
}

export interface KpiCbqlEvidence {
  id: string;
  formId: string;
  criterionId: string;
  title: string;
  fileUrl?: string;
  linkUrl?: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface KpiCbqlComment {
  id: string;
  formId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: 'self_comment' | 'evaluator_comment' | 'admin_note' | 'feedback';
  createdAt: string;
}

export interface KpiCbqlAuditLog {
  id: string;
  formId?: string;
  action: 
    | 'create_form' 
    | 'save_self_evaluation' 
    | 'submit_form' 
    | 'evaluate' 
    | 'lock_form' 
    | 'unlock_form' 
    | 'delete_form' 
    | 'update_criteria' 
    | 'update_period'
    | 'assign_evaluator';
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  details: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
}
