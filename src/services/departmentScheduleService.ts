import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DepartmentWeeklySchedule, DepartmentScheduleDayItem } from '../types/departmentSchedule';
import { getWeekInfoByNumber, getCurrentSchoolWeekInfo, getWeekDayDates, WeekDayDateItem } from '../utils/schoolWeekUtils';

const COLLECTION_NAME = 'department_weekly_schedules';
const LOCAL_STORAGE_KEY = 'school_department_weekly_schedules';

export const departmentScheduleService = {
  /**
   * Chuẩn hóa và gắn ngày thực tế của tuần đang chọn cho lịch
   */
  normalizeScheduleForWeek(
    schedule: DepartmentWeeklySchedule,
    weekNumber: number,
    academicYear: string = '2026-2027'
  ): DepartmentWeeklySchedule {
    const weekDays = getWeekDayDates(weekNumber, academicYear);
    const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);

    // Xây dựng 7 ngày chính xác tương ứng với tuần
    const alignedDays: DepartmentScheduleDayItem[] = weekDays.map((wDay, idx) => {
      // 1. Tìm theo ngày thực tế: work.date === currentDate
      let matched = schedule.days?.find(d => d.date === wDay.dateIso);

      // 2. Nếu không tìm thấy theo ngày (ví dụ dữ liệu tuần cũ hoặc bị lệch ngày do lỗi trước đây), tìm theo thứ
      if (!matched) {
        matched = schedule.days?.find(
          d => d.dayOfWeek && d.dayOfWeek.trim().toLowerCase() === wDay.dayOfWeek.trim().toLowerCase()
        );
      }

      // 3. Fallback theo index
      if (!matched && schedule.days && schedule.days[idx]) {
        matched = schedule.days[idx];
      }

      return {
        id: matched?.id || `day_${idx}_${Date.now()}`,
        dayOfWeek: wDay.dayOfWeek,
        date: wDay.dateIso, // Luôn luôn là ngày thực tế của tuần này
        dateDisplay: wDay.dateLabel,
        morningTasks: matched?.morningTasks || '',
        afternoonTasks: matched?.afternoonTasks || '',
        dutyLeaderOrEvaluation: matched?.dutyLeaderOrEvaluation || '',
        notes: matched?.notes || '',
        assignedTeachers: matched?.assignedTeachers || [],
        status: matched?.status || 'pending'
      };
    });

    return {
      ...schedule,
      weekNumber,
      startDate: weekInfo.startDateIso,
      endDate: weekInfo.endDateIso,
      year: weekInfo.startDate.getFullYear(),
      academicYear: schedule.academicYear || academicYear,
      days: alignedDays
    };
  },

  /**
   * Tự động kiểm tra và sửa dữ liệu cũ bị lệch ngày trong LocalStorage/Firestore
   */
  sanitizeSchedules(list: DepartmentWeeklySchedule[]): DepartmentWeeklySchedule[] {
    let changed = false;
    const cleaned = list.map(item => {
      const weekNum = item.weekNumber || 5;
      const weekInfo = getWeekInfoByNumber(weekNum, '2026-2027');
      const expectedStartIso = weekInfo.startDateIso;
      
      // Nếu ngày bắt đầu hoặc ngày thứ Hai không khớp tuần
      if (item.startDate !== expectedStartIso || (item.days?.[0] && item.days[0].date !== expectedStartIso)) {
        changed = true;
        return this.normalizeScheduleForWeek(item, weekNum, '2026-2027');
      }
      return item;
    });

    if (changed) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
      } catch (e) {}
    }
    return cleaned;
  },

  /**
   * Fetch all department weekly schedules with fallback to localStorage
   */
  async getSchedules(filter?: {
    departmentId?: string;
    departmentName?: string;
    weekNumber?: number;
  }): Promise<DepartmentWeeklySchedule[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: DepartmentWeeklySchedule[] = [];
      querySnapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DepartmentWeeklySchedule);
      });

      if (list.length === 0) {
        return this.getLocalOrSeedSchedules(filter);
      }

      const sanitized = this.sanitizeSchedules(list);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));

      return this.applyFilter(sanitized, filter);
    } catch (error) {
      console.warn('Error querying Firestore for department schedules, falling back to LocalStorage:', error);
      return this.getLocalOrSeedSchedules(filter);
    }
  },

  /**
   * Helper to filter list
   */
  applyFilter(
    list: DepartmentWeeklySchedule[],
    filter?: { departmentId?: string; departmentName?: string; weekNumber?: number }
  ): DepartmentWeeklySchedule[] {
    if (!filter) return list;
    return list.filter((item) => {
      if (filter.departmentId && item.departmentId !== filter.departmentId && !item.departmentName.toLowerCase().includes(filter.departmentId.toLowerCase())) {
        return false;
      }
      if (filter.departmentName && !item.departmentName.toLowerCase().includes(filter.departmentName.toLowerCase())) {
        return false;
      }
      if (filter.weekNumber && item.weekNumber !== filter.weekNumber) {
        return false;
      }
      return true;
    });
  },

  /**
   * Get single schedule by ID
   */
  async getScheduleById(id: string): Promise<DepartmentWeeklySchedule | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const item = { id: snapshot.id, ...snapshot.data() } as DepartmentWeeklySchedule;
        return this.normalizeScheduleForWeek(item, item.weekNumber || 5, '2026-2027');
      }
    } catch (e) {
      console.warn('Cannot fetch from Firestore, searching local storage:', e);
    }

    const localList = this.getLocalSchedules();
    const found = localList.find((s) => s.id === id);
    return found ? this.normalizeScheduleForWeek(found, found.weekNumber || 5, '2026-2027') : null;
  },

  /**
   * Save or update a schedule
   */
  async saveSchedule(schedule: DepartmentWeeklySchedule): Promise<void> {
    const normalized = this.normalizeScheduleForWeek(schedule, schedule.weekNumber || 5, '2026-2027');
    const now = new Date().toISOString();
    const dataToSave: DepartmentWeeklySchedule = {
      ...normalized,
      updatedAt: now,
      createdAt: normalized.createdAt || now
    };

    // 1. Save to localStorage immediately
    const localList = this.getLocalSchedules();
    const existingIdx = localList.findIndex((s) => s.id === normalized.id);
    if (existingIdx >= 0) {
      localList[existingIdx] = dataToSave;
    } else {
      localList.unshift(dataToSave);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));

    // 2. Persist to Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, normalized.id);
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error('Error saving schedule to Firestore (saved to localStorage cache):', error);
    }
  },

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    const localList = this.getLocalSchedules().filter((s) => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting schedule from Firestore:', error);
    }
  },

  /**
   * Approve a schedule
   */
  async approveSchedule(
    id: string,
    approverName: string,
    approvalComment?: string
  ): Promise<DepartmentWeeklySchedule | null> {
    const schedule = await this.getScheduleById(id);
    if (!schedule) return null;

    const updated: DepartmentWeeklySchedule = {
      ...schedule,
      status: 'approved',
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
      approvalComment: approvalComment || 'Đã duyệt theo kế hoạch tuần của tổ chuyên môn.',
      updatedAt: new Date().toISOString()
    };

    await this.saveSchedule(updated);
    return updated;
  },

  /**
   * Internal localStorage getter
   */
  getLocalSchedules(): DepartmentWeeklySchedule[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? this.sanitizeSchedules(parsed) : [];
      } catch (e) {
        console.error('Parse error localStorage', e);
      }
    }
    return [];
  },

  /**
   * Get or Seed realistic schedules
   */
  getLocalOrSeedSchedules(filter?: {
    departmentId?: string;
    departmentName?: string;
    weekNumber?: number;
  }): DepartmentWeeklySchedule[] {
    let list = this.getLocalSchedules();
    if (list.length === 0) {
      list = this.createDefaultSeedSchedules();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
    return this.applyFilter(list, filter);
  },

  /**
   * Tạo lịch trống chuẩn với ngày của từng thứ được tính trực tiếp từ tuần đang chọn
   */
  createBlankSchedule(
    departmentId: string,
    departmentName: string,
    weekNum = 5,
    year = 2026
  ): DepartmentWeeklySchedule {
    const weekInfo = getWeekInfoByNumber(weekNum, '2026-2027');
    const weekDays = getWeekDayDates(weekNum, '2026-2027');

    const days: DepartmentScheduleDayItem[] = weekDays.map((wDay, idx) => ({
      id: `day_${idx}_${Date.now()}`,
      dayOfWeek: wDay.dayOfWeek,
      date: wDay.dateIso, // Ngày thực tế của tuần
      dateDisplay: wDay.dateLabel,
      morningTasks: '',
      afternoonTasks: '',
      dutyLeaderOrEvaluation: '',
      notes: '',
      assignedTeachers: [],
      status: 'pending'
    }));

    return {
      id: `dept_sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
      departmentId,
      departmentName,
      weekNumber: weekNum,
      startDate: weekInfo.startDateIso,
      endDate: weekInfo.endDateIso,
      year: weekInfo.startDate.getFullYear() || year,
      academicYear: '2026-2027',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      days
    };
  },

  /**
   * Generates default seed data matching the real school context
   */
  createDefaultSeedSchedules(): DepartmentWeeklySchedule[] {
    // Tuần 4: 28/09/2026 → 04/10/2026
    const sampleToanTuan4: DepartmentWeeklySchedule = {
      id: 'sched_sample_toan_tuan4',
      schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
      departmentId: 'd_toan_ly_tin_cn',
      departmentName: 'TỔ TOÁN - LÝ - TIN - CN',
      weekNumber: 4,
      startDate: '2026-09-28',
      endDate: '2026-10-04',
      year: 2026,
      academicYear: '2026-2027',
      status: 'approved',
      approvedBy: 'Hiệu trưởng - Nguyễn Quang Sáng',
      approvalDate: '2026-09-27T08:30:00.000Z',
      approvalComment: 'Đã duyệt kế hoạch công tác tuần 4.',
      createdAt: '2026-09-26T10:00:00.000Z',
      updatedAt: '2026-09-27T08:30:00.000Z',
      days: [
        {
          id: 'day_toan_w4_0',
          dayOfWeek: 'Thứ Hai',
          date: '2026-09-28',
          dateDisplay: 'Thứ Hai, 28/09/2026',
          morningTasks: '- Chào cờ đầu tuần, sơ kết thi đua tuần 3.\n- Giảng dạy TKB chính khóa.',
          afternoonTasks: '- Bồi dưỡng đội tuyển HSG môn Toán 12.',
          dutyLeaderOrEvaluation: 'Thầy Sáng (HT) trực',
          notes: ''
        },
        {
          id: 'day_toan_w4_1',
          dayOfWeek: 'Thứ Ba',
          date: '2026-09-29',
          dateDisplay: 'Thứ Ba, 29/09/2026',
          morningTasks: '- Giảng dạy chính khóa.\n- Thao giảng môn Vật lý 10.',
          afternoonTasks: '- Tự nghiên cứu bài học, chuẩn bị đồ dùng thực hành.',
          dutyLeaderOrEvaluation: 'Cô Hoa (PHT)',
          notes: ''
        },
        {
          id: 'day_toan_w4_2',
          dayOfWeek: 'Thứ Tư',
          date: '2026-09-30',
          dateDisplay: 'Thứ Tư, 30/09/2026',
          morningTasks: '- Giảng dạy chính khóa.',
          afternoonTasks: '- Sinh hoạt tổ chuyên môn: Thống nhất ma trận đề kiểm tra.',
          dutyLeaderOrEvaluation: 'Tổ trưởng Toán - Tin',
          notes: ''
        },
        {
          id: 'day_toan_w4_3',
          dayOfWeek: 'Thứ Năm',
          date: '2026-10-01',
          dateDisplay: 'Thứ Năm, 01/10/2026',
          morningTasks: '- Giảng dạy theo TKB.',
          afternoonTasks: '- Hướng dẫn HS tham gia KHKT.',
          dutyLeaderOrEvaluation: 'Thầy Hưng (TTCM)',
          notes: ''
        },
        {
          id: 'day_toan_w4_4',
          dayOfWeek: 'Thứ Sáu',
          date: '2026-10-02',
          dateDisplay: 'Thứ Sáu, 02/10/2026',
          morningTasks: '- Dạy học theo thời khóa biểu.',
          afternoonTasks: '- Bồi dưỡng HSG môn Tin học 11.',
          dutyLeaderOrEvaluation: 'Thầy Tuấn (PHT)',
          notes: ''
        },
        {
          id: 'day_toan_w4_5',
          dayOfWeek: 'Thứ Bảy',
          date: '2026-10-03',
          dateDisplay: 'Thứ Bảy, 03/10/2026',
          morningTasks: '- Giảng dạy chính khóa tiết 1-4.\n- Họp hội đồng sư phạm tổng kết tháng 9.',
          afternoonTasks: 'Nghỉ.',
          dutyLeaderOrEvaluation: 'BGH trực',
          notes: ''
        },
        {
          id: 'day_toan_w4_6',
          dayOfWeek: 'Chủ Nhật',
          date: '2026-10-04',
          dateDisplay: 'Chủ Nhật, 04/10/2026',
          morningTasks: 'Nghỉ theo chế độ.',
          afternoonTasks: 'Soạn giáo án tuần 5.',
          dutyLeaderOrEvaluation: '',
          notes: ''
        }
      ]
    };

    // Tuần 5: 05/10/2026 → 11/10/2026 (ĐÚNG CHÍNH XÁC THEO YÊU CẦU)
    const sampleToanTuan5: DepartmentWeeklySchedule = {
      id: 'sched_sample_toan_tuan5',
      schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
      departmentId: 'd_toan_ly_tin_cn',
      departmentName: 'TỔ TOÁN - LÝ - TIN - CN',
      weekNumber: 5,
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      year: 2026,
      academicYear: '2026-2027',
      status: 'approved',
      approvedBy: 'Hiệu trưởng - Nguyễn Quang Sáng',
      approvalDate: '2026-10-04T08:30:00.000Z',
      approvalComment: 'Kế hoạch chi tiết, phân công rõ ràng. Đề nghị tổ triển khai nghiêm túc sinh hoạt chuyên môn theo NCBH.',
      createdAt: '2026-10-03T10:00:00.000Z',
      updatedAt: '2026-10-04T08:30:00.000Z',
      days: [
        {
          id: 'day_toan_w5_0',
          dayOfWeek: 'Thứ Hai',
          date: '2026-10-05',
          dateDisplay: 'Thứ Hai, 05/10/2026',
          morningTasks: '- Chào cờ đầu tuần, phổ biến trọng tâm công tác chuyên môn tháng 10.\n- Dạy học theo TKB khối 10, 11, 12.\n- Kiểm tra giáo án tuần 5 các nhóm môn Toán, Tin học.',
          afternoonTasks: '- Bồi dưỡng học sinh giỏi Toán 12 (thầy Hùng phụ trách).\n- Ôn tập củng cố kiến thức môn Tin học 11.',
          dutyLeaderOrEvaluation: 'Thầy Sáng (HT) trực - Đạt yêu cầu',
          notes: 'Nộp sổ báo giảng trước 11h'
        },
        {
          id: 'day_toan_w5_1',
          dayOfWeek: 'Thứ Ba',
          date: '2026-10-06',
          dateDisplay: 'Thứ Ba, 06/10/2026',
          morningTasks: '- Giảng dạy chính khóa theo phân phối chương trình.\n- Dự giờ thao giảng môn Vật lý 10 (tiết 3, cô Trang).',
          afternoonTasks: '- Giáo viên tự nghiên cứu bài học, chuẩn bị đồ dùng dạy học thực hành môn Vật lý.',
          dutyLeaderOrEvaluation: 'Cô Hoa (PHT)',
          notes: 'Phòng thực hành Lý'
        },
        {
          id: 'day_toan_w5_2',
          dayOfWeek: 'Thứ Tư',
          date: '2026-10-07',
          dateDisplay: 'Thứ Tư, 07/10/2026',
          morningTasks: '- Giảng dạy chính khóa.\n- Khảo sát chất lượng đầu năm môn Toán khối 10 (theo đề chung của tổ).',
          afternoonTasks: '- Sinh hoạt tổ chuyên môn định kỳ: Rút kinh nghiệm bài dạy minh họa, thống nhất ma trận đề kiểm tra giữa kỳ 1.',
          dutyLeaderOrEvaluation: 'Tổ trưởng Toán - Tin',
          notes: 'Văn phòng tổ lúc 14h00'
        },
        {
          id: 'day_toan_w5_3',
          dayOfWeek: 'Thứ Năm',
          date: '2026-10-08',
          dateDisplay: 'Thứ Năm, 08/10/2026',
          morningTasks: '- Giảng dạy chính khóa các lớp.\n- Kiểm tra hồ sơ sổ điểm điện tử của giáo viên trong tổ.',
          afternoonTasks: '- Chấm bài khảo sát chất lượng môn Toán 10 và nhập điểm vào hệ thống.\n- Hướng dẫn HS tham gia cuộc thi KHKT cấp trường môn Tin học.',
          dutyLeaderOrEvaluation: 'Thầy Hưng (TTCM)',
          notes: 'Hoàn thành nhập điểm trước 17h'
        },
        {
          id: 'day_toan_w5_4',
          dayOfWeek: 'Thứ Sáu',
          date: '2026-10-09',
          dateDisplay: 'Thứ Sáu, 09/10/2026',
          morningTasks: '- Dạy học theo thời khóa biểu.\n- Dự giờ rút kinh nghiệm tiết dạy ứng dụng CNTT môn Công nghệ (thầy Bình).',
          afternoonTasks: '- Bồi dưỡng HSG môn Vật lý 12 (thầy Tuấn).\n- Sinh hoạt cụm nhóm chuyên môn Toán 12.',
          dutyLeaderOrEvaluation: 'Thầy Tuấn (PHT)',
          notes: ''
        },
        {
          id: 'day_toan_w5_5',
          dayOfWeek: 'Thứ Bảy',
          date: '2026-10-10',
          dateDisplay: 'Thứ Bảy, 10/10/2026',
          morningTasks: '- Giảng dạy chính khóa tiết 1-4.\n- Sinh hoạt chuyên đề Giải toán bằng máy tính cầm tay.',
          afternoonTasks: '- Hoạt động ngoại khóa CLB STEM khối 10, 11.',
          dutyLeaderOrEvaluation: 'BGH trực',
          notes: 'Hội trường lớn'
        },
        {
          id: 'day_toan_w5_6',
          dayOfWeek: 'Chủ Nhật',
          date: '2026-10-11',
          dateDisplay: 'Chủ Nhật, 11/10/2026',
          morningTasks: 'Nghỉ theo chế độ.',
          afternoonTasks: 'Soạn giáo án, lập kế hoạch dạy học tuần 6 và nộp duyệt trực tuyến.',
          dutyLeaderOrEvaluation: '',
          notes: ''
        }
      ]
    };

    const sampleVanTuan5: DepartmentWeeklySchedule = {
      id: 'sched_sample_van_tuan5',
      schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
      departmentId: 'd_van_su_dia_gdkt_pl_an',
      departmentName: 'TỔ VĂN - SỬ - ĐỊA - GDKT&PL - AN',
      weekNumber: 5,
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      year: 2026,
      academicYear: '2026-2027',
      status: 'submitted',
      createdAt: '2026-10-03T14:00:00.000Z',
      updatedAt: '2026-10-03T14:00:00.000Z',
      days: [
        {
          id: 'day_van_w5_0',
          dayOfWeek: 'Thứ Hai',
          date: '2026-10-05',
          dateDisplay: 'Thứ Hai, 05/10/2026',
          morningTasks: '- Chào cờ toàn trường.\n- Dạy học chính khóa các lớp Văn 10, 11, 12.\n- Kiểm tra nề nếp soạn giảng đầu tuần.',
          afternoonTasks: '- Bồi dưỡng đội tuyển HSG môn Ngữ văn 12 (cô Mai phụ trách).',
          dutyLeaderOrEvaluation: 'BGH trực',
          notes: 'Phòng học 12A1'
        },
        {
          id: 'day_van_w5_1',
          dayOfWeek: 'Thứ Ba',
          date: '2026-10-06',
          dateDisplay: 'Thứ Ba, 06/10/2026',
          morningTasks: '- Giảng dạy chính khóa.\n- Dự giờ chuyên đề môn Lịch sử 11 (thầy Nam).',
          afternoonTasks: '- Ôn tập học sinh đội tuyển Lịch sử, Địa lí.',
          dutyLeaderOrEvaluation: 'Tổ phó chuyên môn',
          notes: ''
        },
        {
          id: 'day_van_w5_2',
          dayOfWeek: 'Thứ Tư',
          date: '2026-10-07',
          dateDisplay: 'Thứ Tư, 07/10/2026',
          morningTasks: '- Giảng dạy chính khóa.',
          afternoonTasks: '- Sinh hoạt chuyên môn tổ: Đổi mới phương pháp dạy học Ngữ văn theo chương trình GDPT 2018.',
          dutyLeaderOrEvaluation: 'Tổ trưởng chuyên môn',
          notes: 'Phòng họp tổ 14h'
        },
        {
          id: 'day_van_w5_3',
          dayOfWeek: 'Thứ Năm',
          date: '2026-10-08',
          dateDisplay: 'Thứ Năm, 08/10/2026',
          morningTasks: '- Dạy học theo thời khóa biểu.',
          afternoonTasks: '- Ra đề kiểm tra giữa kỳ 1 môn GDKT&PL và Ngữ văn 10, 11, 12.',
          dutyLeaderOrEvaluation: 'BGH trực',
          notes: ''
        },
        {
          id: 'day_van_w5_4',
          dayOfWeek: 'Thứ Sáu',
          date: '2026-10-09',
          dateDisplay: 'Thứ Sáu, 09/10/2026',
          morningTasks: '- Giảng dạy theo phân công.',
          afternoonTasks: '- Chuẩn bị hoạt động ngoại khóa "Em yêu lịch sử quê hương Sơn Lương".',
          dutyLeaderOrEvaluation: '',
          notes: ''
        },
        {
          id: 'day_van_w5_5',
          dayOfWeek: 'Thứ Bảy',
          date: '2026-10-10',
          dateDisplay: 'Thứ Bảy, 10/10/2026',
          morningTasks: '- Dạy học chính khóa.\n- Họp hội đồng trường.',
          afternoonTasks: 'Nghỉ.',
          dutyLeaderOrEvaluation: 'BGH',
          notes: ''
        },
        {
          id: 'day_van_w5_6',
          dayOfWeek: 'Chủ Nhật',
          date: '2026-10-11',
          dateDisplay: 'Chủ Nhật, 11/10/2026',
          morningTasks: 'Nghỉ theo quy định.',
          afternoonTasks: 'Chuẩn bị kế hoạch dạy học tuần sau.',
          dutyLeaderOrEvaluation: '',
          notes: ''
        }
      ]
    };

    // Tuần 6: 12/10/2026 → 18/10/2026
    const sampleToanTuan6: DepartmentWeeklySchedule = {
      id: 'sched_sample_toan_tuan6',
      schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
      departmentId: 'd_toan_ly_tin_cn',
      departmentName: 'TỔ TOÁN - LÝ - TIN - CN',
      weekNumber: 6,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      year: 2026,
      academicYear: '2026-2027',
      status: 'draft',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
      days: [
        {
          id: 'day_toan_w6_0',
          dayOfWeek: 'Thứ Hai',
          date: '2026-10-12',
          dateDisplay: 'Thứ Hai, 12/10/2026',
          morningTasks: '- Chào cờ đầu tuần.\n- Dạy học chính khóa theo TKB.',
          afternoonTasks: '- Bồi dưỡng HSG môn Toán 12.',
          dutyLeaderOrEvaluation: 'Thầy Sáng (HT) trực',
          notes: ''
        },
        {
          id: 'day_toan_w6_1',
          dayOfWeek: 'Thứ Ba',
          date: '2026-10-13',
          dateDisplay: 'Thứ Ba, 13/10/2026',
          morningTasks: '- Dạy học chính khóa.\n- Dự giờ nhóm môn Tin học.',
          afternoonTasks: '- Hướng dẫn học sinh ôn thi HSG.',
          dutyLeaderOrEvaluation: 'Cô Hoa (PHT)',
          notes: ''
        },
        {
          id: 'day_toan_w6_2',
          dayOfWeek: 'Thứ Tư',
          date: '2026-10-14',
          dateDisplay: 'Thứ Tư, 14/10/2026',
          morningTasks: '- Dạy học chính khóa.',
          afternoonTasks: '- Sinh hoạt tổ chuyên môn: Hoàn thiện ngân hàng câu hỏi kiểm tra giữa kỳ 1.',
          dutyLeaderOrEvaluation: 'Tổ trưởng Toán - Tin',
          notes: ''
        },
        {
          id: 'day_toan_w6_3',
          dayOfWeek: 'Thứ Năm',
          date: '2026-10-15',
          dateDisplay: 'Thứ Năm, 15/10/2026',
          morningTasks: '- Dạy học chính khóa các lớp.',
          afternoonTasks: '- Kiểm tra nề nếp sổ sách điện tử.',
          dutyLeaderOrEvaluation: 'Thầy Hưng (TTCM)',
          notes: ''
        },
        {
          id: 'day_toan_w6_4',
          dayOfWeek: 'Thứ Sáu',
          date: '2026-10-16',
          dateDisplay: 'Thứ Sáu, 16/10/2026',
          morningTasks: '- Dạy học theo thời khóa biểu.',
          afternoonTasks: '- Sinh hoạt chuyên đề cụm môn Toán.',
          dutyLeaderOrEvaluation: 'Thầy Tuấn (PHT)',
          notes: ''
        },
        {
          id: 'day_toan_w6_5',
          dayOfWeek: 'Thứ Bảy',
          date: '2026-10-17',
          dateDisplay: 'Thứ Bảy, 17/10/2026',
          morningTasks: '- Dạy học chính khóa tiết 1-4.\n- Kỷ niệm ngày Phụ nữ Việt Nam 20/10.',
          afternoonTasks: 'Nghỉ.',
          dutyLeaderOrEvaluation: 'BGH trực',
          notes: ''
        },
        {
          id: 'day_toan_w6_6',
          dayOfWeek: 'Chủ Nhật',
          date: '2026-10-18',
          dateDisplay: 'Chủ Nhật, 18/10/2026',
          morningTasks: 'Nghỉ theo chế độ.',
          afternoonTasks: 'Soạn giáo án tuần 7.',
          dutyLeaderOrEvaluation: '',
          notes: ''
        }
      ]
    };

    return [sampleToanTuan4, sampleToanTuan5, sampleVanTuan5, sampleToanTuan6];
  }
};
