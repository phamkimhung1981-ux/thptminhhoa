import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WeeklySchedule, ScheduleDay } from '../types/schedule';
import { getWeekInfoByNumber, generateWeekId } from '../utils/schoolWeekUtils';

const COLLECTION_NAME = 'weekly_schedules';
const STORAGE_KEY = 'school_weekly_schedules';

export function createEmptyScheduleForWeek(
  weekNumber: number,
  academicYear: string = '2026–2027'
): WeeklySchedule {
  const weekInfo = getWeekInfoByNumber(weekNumber, academicYear);
  const weekId = generateWeekId(weekNumber, academicYear);
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const startDate = new Date(weekInfo.startDateIso);

  const days: ScheduleDay[] = dayNames.map((name, idx) => {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + idx);
    const dateStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}`;
    const isoDate = curDate.toISOString().split('T')[0];

    return {
      id: `day_${weekNumber}_${idx}`,
      day_of_week: name,
      date: isoDate,
      date_str: dateStr,
      morning_events: [],
      afternoon_events: [],
      duty_leader: idx === 1 || idx === 2 ? 'Ông Hòa' : idx === 3 || idx === 4 ? 'Ông Hùng' : 'Ông Sáng'
    };
  });

  return {
    id: weekId,
    weekId: weekId,
    weekNumber: weekNumber,
    startDate: weekInfo.startDateIso,
    endDate: weekInfo.endDateIso,
    academicYear: academicYear,
    week_number: String(weekNumber),
    week_start_date: weekInfo.startDateIso,
    week_end_date: weekInfo.endDateIso,
    duty_week: `Lớp ${weekNumber === 3 ? '12C' : weekNumber === 4 ? '12B' : '12A'}`,
    school_year: academicYear,
    title: `LỊCH CÔNG TÁC TUẦN ${weekNumber}`,
    header_text: 'SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT SƠN LƯƠNG',
    days,
    footer: {
      working_time: 'Thời gian làm việc: Sáng từ 7h00 - 11h30; Chiều từ 13h30 - 17h00',
      recipients: '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
      principal_name: 'Nguyễn Quang Sáng'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function generateSampleWeek3Schedule(academicYear: string = '2026–2027'): WeeklySchedule {
  const base = createEmptyScheduleForWeek(3, academicYear);
  base.duty_week = 'Lớp 12C';

  // Thứ 2
  base.days[0].morning_events = [
    { id: 'm_3_1', text: 'Tiết 1 (TN-HN): Sinh hoạt tập thể tại nhà vòm (Lớp trực tuần: 12C)', highlight: 'normal' },
    { id: 'm_3_2', text: 'Tiết 2-5: Dạy và học theo Thời khóa biểu', highlight: 'normal' }
  ];
  base.days[0].afternoon_events = [
    { id: 'a_3_1', text: '14h00–17h00: Đại hội Chi đoàn Giáo viên năm học 2026-2027 tại phòng Hội đồng', highlight: 'red' }
  ];
  base.days[0].duty_leader = 'Ông Sáng';

  // Thứ 3
  base.days[1].morning_events = [
    { id: 'm_3_3', text: 'Dạy và học theo TKB. Kiểm tra nền nếp học sinh đầu giờ', highlight: 'normal' }
  ];
  base.days[1].afternoon_events = [
    { id: 'a_3_2', text: '14h00: Bồi dưỡng học sinh giỏi các môn văn hóa khối 10, 11, 12 theo kế hoạch ôn thi tỉnh', highlight: 'normal' }
  ];
  base.days[1].duty_leader = 'Ông Hòa';

  // Thứ 4
  base.days[2].morning_events = [
    { id: 'm_3_4', text: 'Dạy và học theo TKB. Dự giờ thao giảng Tổ Tự nhiên (Toán & Vật lý)', highlight: 'normal' }
  ];
  base.days[2].afternoon_events = [
    { id: 'a_3_3', text: 'Sinh hoạt chuyên môn tổ KHTN và KHXH theo nghiên cứu bài học', highlight: 'normal' }
  ];
  base.days[2].duty_leader = 'Ông Hòa';

  // Thứ 5
  base.days[3].morning_events = [
    { id: 'm_3_5', text: 'Dạy và học theo TKB. BGH kiểm tra hồ sơ giáo án, kế hoạch bài dạy đầu năm học', highlight: 'normal' }
  ];
  base.days[3].afternoon_events = [
    { id: 'a_3_4', text: 'Kiểm tra cơ sở vật chất phòng máy vi tính, phòng thực hành Lý - Hóa - Sinh', highlight: 'normal' }
  ];
  base.days[3].duty_leader = 'Ông Hùng';

  // Thứ 6
  base.days[4].morning_events = [
    { id: 'm_3_6', text: 'Dạy và học theo TKB', highlight: 'normal' }
  ];
  base.days[4].afternoon_events = [
    { id: 'a_3_5', text: '14h00: Họp Hội đồng sư phạm tháng 9 năm học 2026-2027', highlight: 'red' }
  ];
  base.days[4].duty_leader = 'Ông Hùng';

  // Thứ 7
  base.days[5].morning_events = [
    { id: 'm_3_7', text: 'Lao động vệ sinh khuôn viên trường, các phòng học bộ môn (12C trực)', highlight: 'normal' }
  ];
  base.days[5].afternoon_events = [
    { id: 'a_3_6', text: 'Trực ban chuyên môn và rà soát tiến độ giảng dạy tuần 3', highlight: 'normal' }
  ];
  base.days[5].duty_leader = 'Ông Sáng';

  // Chủ nhật
  base.days[6].morning_events = [
    { id: 'm_3_8', text: 'Nghỉ. Trực cơ quan, an ninh trật tự và phòng chống cháy nổ', highlight: 'normal' }
  ];
  base.days[6].afternoon_events = [];
  base.days[6].duty_leader = 'Ông Sáng';

  return base;
}

export function generateSampleWeek4Schedule(academicYear: string = '2026–2027'): WeeklySchedule {
  const base = createEmptyScheduleForWeek(4, academicYear);
  base.duty_week = 'Lớp 12B';

  // Thứ 2
  base.days[0].morning_events = [
    { id: 'm_4_1', text: 'Tiết 1: Chào cờ đầu tuần, sơ kết thi đua tuần 3 và phát động phong trào thi đua tháng 10', highlight: 'normal' },
    { id: 'm_4_2', text: 'Tiết 2-5: Dạy và học theo Thời khóa biểu', highlight: 'normal' }
  ];
  base.days[0].afternoon_events = [
    { id: 'a_4_1', text: '14h00: Họp Ban Giám hiệu rà soát kế hoạch công tác trọng tâm tháng 10', highlight: 'normal' }
  ];
  base.days[0].duty_leader = 'Ông Sáng';

  // Thứ 3
  base.days[1].morning_events = [
    { id: 'm_4_3', text: 'Dạy và học theo TKB. Kiểm tra công tác dạy thêm học thêm trong nhà trường', highlight: 'normal' }
  ];
  base.days[1].afternoon_events = [
    { id: 'a_4_2', text: '14h00: Tiếp tục bồi dưỡng đội tuyển HSG cấp tỉnh các bộ môn văn hóa', highlight: 'normal' }
  ];
  base.days[1].duty_leader = 'Ông Hòa';

  // Thứ 4
  base.days[2].morning_events = [
    { id: 'm_4_4', text: 'Dạy và học theo TKB. Thao giảng tổ Ngoại ngữ - GDQPAN', highlight: 'normal' }
  ];
  base.days[2].afternoon_events = [
    { id: 'a_4_3', text: 'Sinh hoạt chuyên môn các tổ Khoa học Tự nhiên và Khoa học Xã hội', highlight: 'normal' }
  ];
  base.days[2].duty_leader = 'Ông Hòa';

  // Thứ 5
  base.days[3].morning_events = [
    { id: 'm_4_5', text: 'Dạy và học theo TKB. Kiểm tra việc thực hiện chương trình GDPT 2018', highlight: 'normal' }
  ];
  base.days[3].afternoon_events = [
    { id: 'a_4_4', text: 'Kiểm tra nền nếp học sinh bán trú và an toàn trường học', highlight: 'normal' }
  ];
  base.days[3].duty_leader = 'Ông Hùng';

  // Thứ 6
  base.days[4].morning_events = [
    { id: 'm_4_6', text: 'Dạy và học theo TKB', highlight: 'normal' }
  ];
  base.days[4].afternoon_events = [
    { id: 'a_4_5', text: '14h00: Sinh hoạt Chi bộ tháng 10 năm 2026', highlight: 'red' }
  ];
  base.days[4].duty_leader = 'Ông Hùng';

  // Thứ 7
  base.days[5].morning_events = [
    { id: 'm_4_7', text: 'Lao động vệ sinh phong quang trường lớp (Lớp 12B trực tuần)', highlight: 'normal' }
  ];
  base.days[5].afternoon_events = [
    { id: 'a_4_6', text: 'Trực chuyên môn, tổng hợp báo cáo tiến độ tuần 4', highlight: 'normal' }
  ];
  base.days[5].duty_leader = 'Ông Sáng';

  // Chủ nhật
  base.days[6].morning_events = [
    { id: 'm_4_8', text: 'Nghỉ. Trực bảo vệ an ninh trật tự cơ quan', highlight: 'normal' }
  ];
  base.days[6].afternoon_events = [];
  base.days[6].duty_leader = 'Ông Sáng';

  return base;
}

/**
 * Chuẩn hóa và tự động migrate dữ liệu WeeklySchedule cũ/mới
 */
export function normalizeWeeklySchedule(item: any, defaultYear: string = '2026–2027'): WeeklySchedule {
  const weekNum = parseInt(String(item.week_number || item.weekNumber || 3), 10) || 3;
  const year = item.academicYear || item.school_year || defaultYear;
  const weekId = item.weekId || generateWeekId(weekNum, year);
  const weekInfo = getWeekInfoByNumber(weekNum, year);

  // Đảm bảo đủ 7 ngày
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const rawDays = Array.isArray(item.days) ? item.days : [];
  const days: ScheduleDay[] = dayNames.map((name, idx) => {
    const existingDay = rawDays.find((d: any) => 
      (d.day_of_week && d.day_of_week.toLowerCase().includes(name.toLowerCase())) ||
      (d.day_of_week && name.toLowerCase().includes(d.day_of_week.toLowerCase()))
    ) || rawDays[idx];

    const curDate = new Date(weekInfo.startDateIso);
    curDate.setDate(curDate.getDate() + idx);
    const dateStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}`;
    const isoDate = curDate.toISOString().split('T')[0];

    return {
      id: existingDay?.id || `day_${weekNum}_${idx}`,
      day_of_week: name,
      date: existingDay?.date || isoDate,
      date_str: existingDay?.date_str || dateStr,
      morning_events: Array.isArray(existingDay?.morning_events) ? existingDay.morning_events : [],
      afternoon_events: Array.isArray(existingDay?.afternoon_events) ? existingDay.afternoon_events : [],
      duty_leader: existingDay?.duty_leader || (idx === 1 || idx === 2 ? 'Ông Hòa' : idx === 3 || idx === 4 ? 'Ông Hùng' : 'Ông Sáng'),
      duty_leader_confidence: existingDay?.duty_leader_confidence
    };
  });

  return {
    id: weekId,
    weekId: weekId,
    weekNumber: weekNum,
    startDate: item.startDate || item.week_start_date || weekInfo.startDateIso,
    endDate: item.endDate || item.week_end_date || weekInfo.endDateIso,
    academicYear: year,
    week_number: String(weekNum),
    week_start_date: item.week_start_date || weekInfo.startDateIso,
    week_end_date: item.week_end_date || weekInfo.endDateIso,
    duty_week: item.duty_week || `Lớp ${weekNum === 3 ? '12C' : weekNum === 4 ? '12B' : '12A'}`,
    school_year: year,
    title: item.title || `LỊCH CÔNG TÁC TUẦN ${weekNum}`,
    header_text: item.header_text || 'SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT SƠN LƯƠNG',
    days,
    footer: item.footer || {
      working_time: 'Thời gian làm việc: Sáng từ 7h00 - 11h30; Chiều từ 13h30 - 17h00',
      recipients: '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
      principal_name: 'Nguyễn Quang Sáng'
    },
    original_images: item.original_images,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    created_by: item.created_by
  };
}

export const scheduleService = {
  // Lấy tất cả lịch tuần (sắp xếp tuần tăng dần)
  async getWeeklySchedules(academicYear: string = '2026–2027'): Promise<WeeklySchedule[]> {
    let list: WeeklySchedule[] = [];

    // 1. Thử lấy từ Firestore
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach((d) => {
          const raw = { id: d.id, ...d.data() };
          list.push(normalizeWeeklySchedule(raw, academicYear));
        });
      }
    } catch (error) {
      console.warn('Firestore getWeeklySchedules warning, checking LocalStorage cache:', error);
    }

    // 2. Thử lấy từ localStorage nếu Firestore rỗng
    if (list.length === 0 && typeof window !== 'undefined') {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed.map(item => normalizeWeeklySchedule(item, academicYear));
          }
        } catch (e) {
          console.error('Error parsing local weekly schedules:', e);
        }
      }
    }

    // 3. Nếu danh sách vẫn rỗng, tự động khởi tạo Tuần 3 và Tuần 4
    if (list.length === 0) {
      const w3 = generateSampleWeek3Schedule(academicYear);
      const w4 = generateSampleWeek4Schedule(academicYear);
      list = [w3, w4];

      // Lưu ngay vào localStorage và Firestore
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      try {
        await Promise.all([
          setDoc(doc(db, COLLECTION_NAME, w3.id), JSON.parse(JSON.stringify(w3)), { merge: true }),
          setDoc(doc(db, COLLECTION_NAME, w4.id), JSON.parse(JSON.stringify(w4)), { merge: true })
        ]);
      } catch (e) {
        console.warn('Initial Firestore seed error:', e);
      }
    }

    // Đảm bảo không trùng weekId hoặc weekNumber
    const uniqueMap = new Map<string, WeeklySchedule>();
    list.forEach(item => {
      const key = `${item.academicYear || academicYear}_${item.week_number}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    list = Array.from(uniqueMap.values());

    // Sắp xếp số tuần tăng dần: Tuần 1, Tuần 2, Tuần 3, Tuần 4, Tuần 5...
    list.sort((a, b) => {
      const numA = Number(a.week_number) || (a.weekNumber ?? 0);
      const numB = Number(b.week_number) || (b.weekNumber ?? 0);
      return numA - numB;
    });

    // Đồng bộ lại localStorage cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    return list;
  },

  // Lưu hoặc cập nhật lịch tuần
  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    const normalized = normalizeWeeklySchedule(schedule, schedule.school_year || schedule.academicYear || '2026–2027');
    normalized.updated_at = new Date().toISOString();
    const docId = normalized.weekId || normalized.id;

    // 1. Lưu ngay vào localStorage
    if (typeof window !== 'undefined') {
      try {
        const localData = localStorage.getItem(STORAGE_KEY);
        let list: WeeklySchedule[] = localData ? JSON.parse(localData) : [];
        const idx = list.findIndex(s => s.id === docId || s.weekId === docId || s.week_number === normalized.week_number);
        if (idx >= 0) {
          list[idx] = normalized;
        } else {
          list.push(normalized);
        }
        list.sort((a, b) => Number(a.week_number) - Number(b.week_number));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }

    // 2. Lưu vào Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(docRef, JSON.parse(JSON.stringify(normalized)), { merge: true });
    } catch (error) {
      console.warn('Firestore saveWeeklySchedule warning (saved locally):', error);
    }
  },

  // Xóa một tuần lịch công tác
  async deleteWeeklySchedule(weekIdOrId: string): Promise<void> {
    // 1. Xóa khỏi localStorage ngay lập tức
    if (typeof window !== 'undefined') {
      try {
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
          const list: WeeklySchedule[] = JSON.parse(localData);
          const filtered = list.filter(s => s.id !== weekIdOrId && s.weekId !== weekIdOrId);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      } catch (err) {
        console.error('Error updating localStorage on delete:', err);
      }
    }

    // 2. Xóa khỏi Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, weekIdOrId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Firestore deleteWeeklySchedule warning:', error);
    }
  },

  // Tạo tuần mới tiếp theo một cách an toàn
  async createNextWeekSchedule(academicYear: string = '2026–2027'): Promise<WeeklySchedule> {
    const existingList = await this.getWeeklySchedules(academicYear);
    
    // Tìm tuần có số tuần lớn nhất hiện có
    let maxWeekNum = 0;
    existingList.forEach(s => {
      const num = Number(s.week_number) || s.weekNumber || 0;
      if (num > maxWeekNum) maxWeekNum = num;
    });

    const nextWeekNum = maxWeekNum > 0 ? maxWeekNum + 1 : 1;
    const newSchedule = createEmptyScheduleForWeek(nextWeekNum, academicYear);

    await this.saveWeeklySchedule(newSchedule);
    return newSchedule;
  },

  // Tạo một tuần cụ thể nếu chưa tồn tại
  async ensureWeekExists(weekNumber: number, academicYear: string = '2026–2027'): Promise<WeeklySchedule> {
    const existingList = await this.getWeeklySchedules(academicYear);
    const found = existingList.find(s => Number(s.week_number) === weekNumber || s.weekNumber === weekNumber);
    if (found) return found;

    const newSchedule = (weekNumber === 3) 
      ? generateSampleWeek3Schedule(academicYear)
      : (weekNumber === 4)
      ? generateSampleWeek4Schedule(academicYear)
      : createEmptyScheduleForWeek(weekNumber, academicYear);

    await this.saveWeeklySchedule(newSchedule);
    return newSchedule;
  }
};
