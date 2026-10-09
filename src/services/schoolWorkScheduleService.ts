import { collection, doc, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase';
import { SchoolWorkSchedule, SchoolWorkDay, SchoolWorkItem } from '../types/schoolWorkSchedule';
import { getWeekInfoByNumber } from '../utils/schoolWeekUtils';
import { User } from '../types';
import { checkCanDeleteScheduleTask, checkCanDeleteEntireWeek } from '../utils/schedulePermissions';
import { scheduleAuditService } from './scheduleAuditService';

const COLLECTION_NAME = 'schoolWorkSchedules';
const STORAGE_KEY_PREFIX = 'thpt_minh_hoa_school_work_schedule_';

export const DEFAULT_DEPARTMENTS_CONFIG = [
  { id: 'all', name: 'TOÀN TRƯỜNG', label: 'Toàn trường' },
  { id: 'd_toan_cong_nghe', name: 'Tổ Toán - Công Nghệ', label: 'Tổ Toán - Công Nghệ' },
  { id: 'd_van_su_dia_gdkt', name: 'Tổ Văn - Sử - Địa- GDKT', label: 'Tổ Văn - Sử - Địa- GDKT' },
  { id: 'd_ly_hoa_sinh', name: 'Tổ Lý - Hóa- Sinh', label: 'Tổ Lý - Hóa- Sinh' },
  { id: 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan', name: 'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN', label: 'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN' },
  { id: 'd_van_phong', name: 'Tổ Văn phòng', label: 'Tổ Văn phòng' }
];

export function generateEmptySchoolWorkSchedule(
  weekNumber: number,
  academicYear: string = '2026–2027',
  departmentId: string = 'all'
): SchoolWorkSchedule {
  const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);
  const deptObj = DEFAULT_DEPARTMENTS_CONFIG.find(d => d.id === departmentId) || { name: 'TOÀN TRƯỜNG' };
  
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const startDate = new Date(weekInfo.startDateIso);

  const days: SchoolWorkDay[] = dayNames.map((dName, idx) => {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + idx);
    const dateStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}`;
    const isoDate = curDate.toISOString().split('T')[0];

    return {
      id: `day_${weekNumber}_${idx}`,
      day_of_week: dName,
      date: isoDate,
      date_str: dateStr,
      morning_tasks: [],
      afternoon_tasks: [],
      completion_date: dateStr,
      duty_evaluator: ''
    };
  });

  return {
    id: `sws_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${String(weekNumber).padStart(2, '0')}_${departmentId}`,
    department_id: departmentId,
    department_name: deptObj.name,
    week_number: weekNumber,
    week_start_date: weekInfo.startDateIso,
    week_end_date: weekInfo.endDateIso,
    school_year: academicYear,
    title: `LỊCH CÔNG VIỆC TUẦN ${weekNumber}`,
    days,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function generateSampleSchoolWorkSchedule(
  weekNumber: number = 3,
  academicYear: string = '2026–2027',
  departmentId: string = 'all'
): SchoolWorkSchedule {
  const base = generateEmptySchoolWorkSchedule(weekNumber, academicYear, departmentId);

  // Seed Tuần 3 standard THPT Minh Hòa data
  if (weekNumber === 3) {
    // Thứ 2
    base.days[0].morning_tasks = [
      {
        id: 'm_1',
        timeSlot: 'morning',
        content: 'Tiết 1 (TN-HN): Sinh hoạt tập thể tại nhà vòm (Lớp trực tuần: 12C)',
        assignee: 'BGH, Đoàn trường, GVCN, Lớp 12C',
        status: 'Hoàn thành tốt'
      },
      {
        id: 'm_2',
        timeSlot: 'morning',
        content: 'Tiết 2-5: Dạy và học theo Thời khóa biểu',
        assignee: 'Toàn thể giáo viên',
        status: 'Hoàn thành'
      }
    ];
    base.days[0].afternoon_tasks = [
      {
        id: 'a_1',
        timeSlot: 'afternoon',
        content: '14h00–17h00: Đại hội Chi đoàn Giáo viên năm học 2026-2027 tại phòng Hội đồng',
        assignee: 'BCH Chi đoàn, Toàn thể đoàn viên GV',
        status: 'Hoàn thành tốt'
      }
    ];
    base.days[0].completion_date = '21/09/2026';
    base.days[0].duty_evaluator = 'Nền nếp trang nghiêm; Đại hội Chi đoàn GV tổ chức tốt.';

    // Thứ 3
    base.days[1].morning_tasks = [
      {
        id: 'm_3',
        timeSlot: 'morning',
        content: 'Dạy và học theo TKB. Kiểm tra nền nếp học sinh đầu giờ',
        assignee: 'GV giảng dạy, Đoàn TN',
        status: 'Hoàn thành'
      }
    ];
    base.days[1].afternoon_tasks = [
      {
        id: 'a_2',
        timeSlot: 'afternoon',
        content: '14h00: Bồi dưỡng học sinh giỏi các môn văn hóa khối 10, 11, 12 theo kế hoạch ôn thi tỉnh',
        assignee: 'GV bồi dưỡng HSG các bộ môn',
        status: 'Đang thực hiện'
      }
    ];
    base.days[1].completion_date = '22/09/2026';
    base.days[1].duty_evaluator = 'Bồi dưỡng HSG đúng kế hoạch; học sinh đi học chuyên cần.';

    // Thứ 4
    base.days[2].morning_tasks = [
      {
        id: 'm_4',
        timeSlot: 'morning',
        content: 'Dạy và học theo TKB. Dự giờ thao giảng Tổ Tự nhiên (Toán & Vật lý)',
        assignee: 'Tổ Toán-Lý-Tin-CN, Tổ Hóa-Sinh',
        status: 'Hoàn thành tốt'
      }
    ];
    base.days[2].afternoon_tasks = [
      {
        id: 'a_3',
        timeSlot: 'afternoon',
        content: 'Sinh hoạt chuyên môn tổ KHTN và KHXH theo nghiên cứu bài học',
        assignee: 'Tổ trưởng & GV các tổ CM',
        status: 'Hoàn thành'
      }
    ];
    base.days[2].completion_date = '23/09/2026';
    base.days[2].duty_evaluator = 'Thao giảng đạt chất lượng tốt, áp dụng phương pháp tích cực.';

    // Thứ 5
    base.days[3].morning_tasks = [
      {
        id: 'm_5',
        timeSlot: 'morning',
        content: 'Dạy và học theo TKB. BGH kiểm tra hồ sơ giáo án, kế hoạch bài dạy đầu năm học',
        assignee: 'BGH, TTCM các tổ',
        status: 'Đang thực hiện'
      }
    ];
    base.days[3].afternoon_tasks = [
      {
        id: 'a_4',
        timeSlot: 'afternoon',
        content: 'Kiểm tra cơ sở vật chất phòng máy vi tính, phòng thực hành Lý - Hóa - Sinh',
        assignee: 'Tổ Văn phòng & Cán bộ thiết bị',
        status: 'Hoàn thành'
      }
    ];
    base.days[3].completion_date = '24/09/2026';
    base.days[3].duty_evaluator = 'Đã kiểm tra 100% hồ sơ giáo án, giáo viên thực hiện nghiêm túc.';

    // Thứ 6
    base.days[4].morning_tasks = [
      {
        id: 'm_6',
        timeSlot: 'morning',
        content: 'Dạy và học theo TKB',
        assignee: 'Toàn thể giáo viên',
        status: 'Hoàn thành'
      }
    ];
    base.days[4].afternoon_tasks = [
      {
        id: 'a_5',
        timeSlot: 'afternoon',
        content: '14h00: Họp Hội đồng sư phạm tháng 9 năm học 2026-2027',
        assignee: 'Toàn thể CBGVNV nhà trường',
        status: 'Chưa thực hiện'
      }
    ];
    base.days[4].completion_date = '25/09/2026';
    base.days[4].duty_evaluator = 'Triển khai đầy đủ các nhiệm vụ trọng tâm tháng 10.';

    // Thứ 7
    base.days[5].morning_tasks = [
      {
        id: 'm_7',
        timeSlot: 'morning',
        content: 'Lao động vệ sinh khuôn viên trường, các phòng học bộ môn (12C trực)',
        assignee: 'Đoàn trường, GVCN 12C, Tổ Văn phòng',
        status: 'Chưa thực hiện'
      }
    ];
    base.days[5].afternoon_tasks = [
      {
        id: 'a_6',
        timeSlot: 'afternoon',
        content: 'Trực ban chuyên môn và rà soát tiến độ giảng dạy tuần 3',
        assignee: 'BGH, TTCM',
        status: 'Chưa thực hiện'
      }
    ];
    base.days[5].completion_date = '26/09/2026';
    base.days[5].duty_evaluator = 'Khuôn viên trường sạch sẽ, trực ban đúng quy định.';

    // Chủ nhật
    base.days[6].morning_tasks = [
      {
        id: 'm_8',
        timeSlot: 'morning',
        content: 'Nghỉ. Trực cơ quan, an ninh trật tự và phòng chống cháy nổ',
        assignee: 'Tổ Bảo vệ, Lãnh đạo trực ban',
        status: 'Chưa thực hiện'
      }
    ];
    base.days[6].afternoon_tasks = [];
    base.days[6].completion_date = '27/09/2026';
    base.days[6].duty_evaluator = 'An ninh trật tự đảm bảo tuyệt đối, ghi chép nhật ký trực đầy đủ.';
  }

  return base;
}

export const schoolWorkScheduleService = {
  async getSchedule(
    weekNumber: number,
    academicYear: string = '2026–2027',
    departmentId: string = 'all'
  ): Promise<SchoolWorkSchedule> {
    const docId = `sws_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${String(weekNumber).padStart(2, '0')}_${departmentId}`;
    
    // 1. Try Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as SchoolWorkSchedule;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_PREFIX + docId, JSON.stringify(data));
        }
        return data;
      }
    } catch (e) {
      console.warn('Firestore getSchedule warning, fallback to cache:', e);
    }

    // 2. Try localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY_PREFIX + docId);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Error parsing cached schedule:', e);
        }
      }
    }

    // 3. Fallback: generate sample if week 3 or empty
    const sample = weekNumber === 3 
      ? generateSampleSchoolWorkSchedule(weekNumber, academicYear, departmentId)
      : generateEmptySchoolWorkSchedule(weekNumber, academicYear, departmentId);

    // Auto save
    await this.saveSchedule(sample);
    return sample;
  },

  async saveSchedule(schedule: SchoolWorkSchedule): Promise<void> {
    const docId = schedule.id;
    schedule.updated_at = new Date().toISOString();

    // Save to localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PREFIX + docId, JSON.stringify(schedule));
    }

    // Save to Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(docRef, cleanFirestoreData(schedule), { merge: true });
    } catch (e) {
      console.warn('Firestore saveSchedule warning (saved locally):', e);
    }
  },

  async updateTaskItem(
    schedule: SchoolWorkSchedule,
    dayId: string,
    timeSlot: 'morning' | 'afternoon',
    taskItem: SchoolWorkItem
  ): Promise<SchoolWorkSchedule> {
    const newDays = schedule.days.map(day => {
      if (day.id !== dayId) return day;

      const tasks = timeSlot === 'morning' ? [...day.morning_tasks] : [...day.afternoon_tasks];
      const existingIdx = tasks.findIndex(t => t.id === taskItem.id);

      if (existingIdx >= 0) {
        tasks[existingIdx] = { ...tasks[existingIdx], ...taskItem };
      } else {
        tasks.push(taskItem);
      }

      return {
        ...day,
        [timeSlot === 'morning' ? 'morning_tasks' : 'afternoon_tasks']: tasks,
        ...(taskItem.completionDate ? { completion_date: taskItem.completionDate } : {}),
        ...(taskItem.leaderInCharge && !day.duty_evaluator ? { duty_evaluator: taskItem.leaderInCharge } : {})
      };
    });

    const updated: SchoolWorkSchedule = {
      ...schedule,
      days: newDays,
      updated_at: new Date().toISOString()
    };

    await this.saveSchedule(updated);
    return updated;
  },

  /**
   * Xóa một công việc cụ thể khỏi lịch giao việc
   */
  async deleteTaskItem(
    schedule: SchoolWorkSchedule,
    dayId: string,
    timeSlot: 'morning' | 'afternoon',
    itemId: string,
    user: User | null
  ): Promise<{ updatedSchedule: SchoolWorkSchedule; deletedItem: SchoolWorkItem }> {
    // 1. Tìm thông tin công việc để kiểm tra đánh giá và quyền
    const targetDay = schedule.days.find(d => d.id === dayId);
    if (!targetDay) throw new Error('Không tìm thấy ngày của công việc cần xóa.');

    const tasksList = timeSlot === 'morning' ? targetDay.morning_tasks : targetDay.afternoon_tasks;
    const taskToDelete = tasksList.find(t => t.id === itemId);
    if (!taskToDelete) throw new Error('Không tìm thấy công việc cần xóa với ID: ' + itemId);

    const hasEvaluation = Boolean(
      (taskToDelete.status && taskToDelete.status !== 'Chưa thực hiện') ||
      taskToDelete.leaderInCharge ||
      targetDay.duty_evaluator
    );

    const scope = schedule.department_id === 'all' ? 'all' : 'department';

    // 2. Kiểm tra phân quyền xóa
    const perm = checkCanDeleteScheduleTask(user, scope, schedule.department_id, hasEvaluation);
    if (!perm.canDelete) {
      throw new Error(`403 Forbidden: ${perm.reason || 'Bạn không có quyền xóa công việc này.'}`);
    }

    // 3. Tiến hành xóa khỏi danh sách
    const newDays = schedule.days.map(d => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        [timeSlot === 'morning' ? 'morning_tasks' : 'afternoon_tasks']: (
          timeSlot === 'morning' ? d.morning_tasks : d.afternoon_tasks
        ).filter(t => t.id !== itemId)
      };
    });

    const updatedSchedule: SchoolWorkSchedule = {
      ...schedule,
      days: newDays,
      updated_at: new Date().toISOString()
    };

    // 4. Lưu vào Firestore và localStorage
    await this.saveSchedule(updatedSchedule);

    // 5. Ghi Audit Log
    try {
      await scheduleAuditService.logDeletion({
        action: 'delete_single',
        actionLabel: `Xóa 1 công việc (${timeSlot === 'morning' ? 'Sáng' : 'Chiều'} ${targetDay.day_of_week})`,
        userName: user?.name || 'Chưa xác định',
        userAccount: user?.username || user?.id || 'unknown',
        userRole: user?.role || user?.position || 'N/A',
        scheduleId: schedule.id,
        taskId: itemId,
        taskContent: taskToDelete.content,
        taskDate: targetDay.date_str || targetDay.date,
        department: schedule.department_name,
        scope: scope === 'all' ? 'Toàn trường' : 'Tổ chuyên môn',
        hasEvaluation,
        result: 'Thành công'
      });
    } catch (logErr) {
      console.warn('Lỗi ghi audit log:', logErr);
    }

    return { updatedSchedule, deletedItem: taskToDelete };
  },

  /**
   * Xóa hàng loạt nhiều công việc đã chọn
   */
  async deleteBatchTaskItems(
    schedule: SchoolWorkSchedule,
    itemsToDelete: { dayId: string; timeSlot: 'morning' | 'afternoon'; itemId: string }[],
    user: User | null
  ): Promise<{ updatedSchedule: SchoolWorkSchedule; deletedCount: number }> {
    if (!itemsToDelete || itemsToDelete.length === 0) {
      return { updatedSchedule: schedule, deletedCount: 0 };
    }

    const scope = schedule.department_id === 'all' ? 'all' : 'department';
    const perm = checkCanDeleteScheduleTask(user, scope, schedule.department_id, false);
    if (!perm.canDelete) {
      throw new Error(`403 Forbidden: ${perm.reason || 'Bạn không có quyền xóa các công việc này.'}`);
    }

    const itemIdsSet = new Set(itemsToDelete.map(i => i.itemId));
    let deletedCount = 0;
    const deletedContents: string[] = [];

    const newDays = schedule.days.map(day => {
      const morningTasks = day.morning_tasks.filter(t => {
        if (itemIdsSet.has(t.id)) {
          deletedCount++;
          deletedContents.push(t.content);
          return false;
        }
        return true;
      });

      const afternoonTasks = day.afternoon_tasks.filter(t => {
        if (itemIdsSet.has(t.id)) {
          deletedCount++;
          deletedContents.push(t.content);
          return false;
        }
        return true;
      });

      return {
        ...day,
        morning_tasks: morningTasks,
        afternoon_tasks: afternoonTasks
      };
    });

    const updatedSchedule: SchoolWorkSchedule = {
      ...schedule,
      days: newDays,
      updated_at: new Date().toISOString()
    };

    await this.saveSchedule(updatedSchedule);

    // Ghi Audit Log
    try {
      await scheduleAuditService.logDeletion({
        action: 'delete_batch',
        actionLabel: `Xóa hàng loạt ${deletedCount} công việc`,
        userName: user?.name || 'Chưa xác định',
        userAccount: user?.username || user?.id || 'unknown',
        userRole: user?.role || user?.position || 'N/A',
        scheduleId: schedule.id,
        taskContent: deletedContents.slice(0, 3).join('; ') + (deletedContents.length > 3 ? '...' : ''),
        department: schedule.department_name,
        scope: scope === 'all' ? 'Toàn trường' : 'Tổ chuyên môn',
        hasEvaluation: false,
        result: 'Thành công'
      });
    } catch (e) {
      console.warn('Lỗi ghi audit log:', e);
    }

    return { updatedSchedule, deletedCount };
  },

  /**
   * Xóa toàn bộ lịch của cả một tuần (chỉ Admin và Hiệu trưởng)
   */
  async deleteEntireWeek(
    schedule: SchoolWorkSchedule,
    user: User | null
  ): Promise<SchoolWorkSchedule> {
    const perm = checkCanDeleteEntireWeek(user);
    if (!perm.canDelete) {
      throw new Error(`403 Forbidden: ${perm.reason || 'Chỉ Quản trị viên hoặc Hiệu trưởng mới được xóa cả tuần.'}`);
    }

    const newDays = schedule.days.map(d => ({
      ...d,
      morning_tasks: [],
      afternoon_tasks: [],
      duty_evaluator: ''
    }));

    const updatedSchedule: SchoolWorkSchedule = {
      ...schedule,
      days: newDays,
      updated_at: new Date().toISOString()
    };

    await this.saveSchedule(updatedSchedule);

    try {
      await scheduleAuditService.logDeletion({
        action: 'delete_week',
        actionLabel: `Xóa toàn bộ lịch Tuần ${schedule.week_number}`,
        userName: user?.name || 'Chưa xác định',
        userAccount: user?.username || user?.id || 'unknown',
        userRole: user?.role || user?.position || 'N/A',
        scheduleId: schedule.id,
        taskContent: `Xóa toàn bộ nội dung công việc Tuần ${schedule.week_number} (${schedule.department_name})`,
        department: schedule.department_name,
        scope: schedule.department_id === 'all' ? 'Toàn trường' : 'Tổ chuyên môn',
        hasEvaluation: true,
        result: 'Thành công'
      });
    } catch (e) {
      console.warn('Lỗi ghi audit log:', e);
    }

    return updatedSchedule;
  },

  async getAllSchedules(): Promise<SchoolWorkSchedule[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as SchoolWorkSchedule);
      }
    } catch (e) {
      console.warn('Could not list all from Firestore:', e);
    }
    return [];
  }
};
