export interface SchoolWorkItem {
  id: string;
  timeSlot: 'morning' | 'afternoon';
  content: string;
  assignee?: string;
  deadlineDate?: string;
  completionDate?: string;
  status?: 'Chưa thực hiện' | 'Đang thực hiện' | 'Hoàn thành' | 'Hoàn thành tốt' | 'Quá hạn' | 'Không thực hiện';
  leaderInCharge?: string;
  note?: string;
}

export interface SchoolWorkDay {
  id: string;
  day_of_week: string; // "Thứ 2", "Thứ 3", ..., "Chủ nhật"
  date: string; // YYYY-MM-DD
  date_str: string; // "21/09"
  morning_tasks: SchoolWorkItem[];
  afternoon_tasks: SchoolWorkItem[];
  completion_date: string; // Cột "Ngày hoàn thành"
  duty_evaluator: string; // Cột "Lãnh đạo trực/đánh giá"
  evaluation_result?: string;
}

export interface SchoolWorkSchedule {
  id: string;
  department_id: string; // 'all' (Toàn trường) hoặc mã tổ CM
  department_name: string; // 'TOÀN TRƯỜNG' hoặc 'Tổ Toán - Lý - Tin - CN'...
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  school_year: string;
  title: string;
  days: SchoolWorkDay[];
  created_at?: string;
  updated_at?: string;
}
