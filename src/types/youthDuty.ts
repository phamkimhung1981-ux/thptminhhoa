export type DayOfWeekName = 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật';

export interface YouthDutySchedule {
  id: string;
  academicYear: string; // e.g. '2026–2027'
  weekNumber: number; // e.g. 2
  toWeekNumber?: number; // for multi-week schedule blocks e.g. from 2 to 4
  dayOfWeek: DayOfWeekName;
  dayOfWeekNumber: number; // 2, 3, 4, 5, 6, 7, 8
  morningTasks: string[];
  afternoonTasks: string[];
  assignedPeople: string; // e.g. "Đ/c Phương + Đội cờ đỏ, TNXK"
  notes?: string; // e.g. "Lưu ý các lớp có học sinh ăn quà vặt trong lớp"
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface YouthDutyTaskConfig {
  id: string;
  name: string;
  category: 'morning' | 'afternoon' | 'both';
  order: number;
  isDefault?: boolean;
}

export interface YouthDutyMetadata {
  academicYear: string;
  organizationName: string; // "ĐOÀN TRƯỜNG THPT MINH HÒA"
  parentOrganizationName: string; // "ĐOÀN XÃ MINH HÒA"
  unionTitle: string; // "ĐOÀN TNCS HỒ CHÍ MINH"
  locationDate: string; // "Minh Hòa, ngày 17 tháng 09 năm 2026"
  secretaryName: string; // "Phan Thị Lan Phương"
  secretaryTitle: string; // "Bí Thư"
  partyCommitteeTitle: string; // "Xác nhận của Ban Chi Ủy"
}
