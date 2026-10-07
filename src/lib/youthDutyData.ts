import { YouthDutySchedule, YouthDutyTaskConfig, YouthDutyMetadata } from '../types/youthDuty';

export const DEFAULT_DUTY_TASKS: YouthDutyTaskConfig[] = [
  {
    id: 'task_1',
    name: 'Kiểm tra nền nếp học sinh',
    category: 'both',
    order: 1,
    isDefault: true
  },
  {
    id: 'task_2',
    name: 'Kiểm tra công tác vệ sinh trường lớp',
    category: 'both',
    order: 2,
    isDefault: true
  },
  {
    id: 'task_3',
    name: 'Kiểm tra, nắm bắt tình hình an ninh trật tự trường học',
    category: 'both',
    order: 3,
    isDefault: true
  },
  {
    id: 'task_4',
    name: 'Trực quản lý đảm bảo an toàn giao thông khi tan học',
    category: 'both',
    order: 4,
    isDefault: true
  }
];

export const DEFAULT_DUTY_METADATA: YouthDutyMetadata = {
  academicYear: '2026–2027',
  organizationName: 'ĐOÀN TRƯỜNG THPT SƠN LƯƠNG',
  parentOrganizationName: 'ĐOÀN XÃ SƠN LƯƠNG',
  unionTitle: 'ĐOÀN TNCS HỒ CHÍ MINH',
  locationDate: 'Sơn Lương, ngày 17 tháng 09 năm 2026',
  secretaryName: 'Phan Thị Lan Phương',
  secretaryTitle: 'Bí Thư',
  partyCommitteeTitle: 'Xác nhận của Ban Chi Ủy'
};

export const DEFAULT_SAMPLE_SCHEDULES: YouthDutySchedule[] = [
  {
    id: 'duty_2026_w2_mon',
    academicYear: '2026–2027',
    weekNumber: 2,
    toWeekNumber: 4,
    dayOfWeek: 'Thứ 2',
    dayOfWeekNumber: 2,
    morningTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    afternoonTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    assignedPeople: 'Đ/c Phương + Đội cờ đỏ, TNXK',
    notes: 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
    createdAt: '2026-09-17T07:00:00.000Z'
  },
  {
    id: 'duty_2026_w2_tue',
    academicYear: '2026–2027',
    weekNumber: 2,
    toWeekNumber: 4,
    dayOfWeek: 'Thứ 3',
    dayOfWeekNumber: 3,
    morningTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    afternoonTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    assignedPeople: 'Đ/c Phương + Đội cờ đỏ, TNXK',
    notes: 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
    createdAt: '2026-09-17T07:00:00.000Z'
  },
  {
    id: 'duty_2026_w2_wed',
    academicYear: '2026–2027',
    weekNumber: 2,
    toWeekNumber: 4,
    dayOfWeek: 'Thứ 4',
    dayOfWeekNumber: 4,
    morningTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    afternoonTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    assignedPeople: 'Đ/c Thùy + Đội cờ đỏ, TNXK',
    notes: 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
    createdAt: '2026-09-17T07:00:00.000Z'
  },
  {
    id: 'duty_2026_w2_thu',
    academicYear: '2026–2027',
    weekNumber: 2,
    toWeekNumber: 4,
    dayOfWeek: 'Thứ 5',
    dayOfWeekNumber: 5,
    morningTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    afternoonTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    assignedPeople: 'Đ/c Quỳnh + Đội cờ đỏ, TNXK',
    notes: 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
    createdAt: '2026-09-17T07:00:00.000Z'
  },
  {
    id: 'duty_2026_w2_fri',
    academicYear: '2026–2027',
    weekNumber: 2,
    toWeekNumber: 4,
    dayOfWeek: 'Thứ 6',
    dayOfWeekNumber: 6,
    morningTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    afternoonTasks: [
      'Kiểm tra nền nếp học sinh',
      'Kiểm tra công tác vệ sinh trường lớp',
      'Kiểm tra nắm bắt tình hình an ninh trật tự trường học',
      'Trực quản lý đảm bảo an toàn giao thông khi tan học'
    ],
    assignedPeople: 'Đ/c Quỳnh + Đội cờ đỏ, TNXK',
    notes: 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
    createdAt: '2026-09-17T07:00:00.000Z'
  }
];
