export interface DepartmentScheduleDayItem {
  id: string;
  dayOfWeek: string; // 'Thứ Hai' | 'Thứ Ba' | 'Thứ Tư' | 'Thứ Năm' | 'Thứ Sáu' | 'Thứ Bảy' | 'Chủ Nhật'
  date: string; // YYYY-MM-DD
  dateDisplay?: string; // '28/09' or 'Thứ Hai, 28/09/2026'
  morningTasks: string; // Sáng - Nội dung công việc
  afternoonTasks: string; // Chiều - Nội dung công việc
  dutyLeaderOrEvaluation: string; // Lãnh đạo trực/đánh giá
  notes: string; // Ghi chú
  assignedTeachers?: string[]; // Tên giáo viên thực hiện (tùy chọn)
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface DepartmentWeeklySchedule {
  id: string;
  schoolName: string; // "TRƯỜNG THPT MINH HÒA"
  departmentId: string; // id or slug
  departmentName: string; // e.g. "Tổ Toán - Lý - Tin - CN"
  weekNumber: number; // e.g. 5
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  year: number; // 2026
  academicYear: string; // "2026-2027"
  days: DepartmentScheduleDayItem[];
  status: 'draft' | 'submitted' | 'approved';
  approvedBy?: string;
  approvalDate?: string;
  approvalComment?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  creatorName?: string;
  notesGeneral?: string;
  sourceFile?: string; // Tên file Word đã tải lên (nếu có)
}

export interface ParsedWordScheduleResult {
  success: boolean;
  schoolName: string;
  departmentName: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  year: number;
  days: DepartmentScheduleDayItem[];
  rawText?: string;
  warnings?: string[];
}
