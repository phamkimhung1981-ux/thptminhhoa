import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Department, DisciplineRecord, DisciplineCriterion, Notification, Report, Task, Teacher, CalendarEvent, LeaveRecord, AttendanceRecord, KpiItem, KpiRecord, KpiGroup, KpiCategory, KpiMonthlySetting, GeneralKpi, WorkAssignment, EvaluationCategory, EvaluationCriterion, SchoolStats, KpiEvaluationForm, KpiEvaluationItem, SystemModule, User } from '../types';
import { DEFAULT_SYSTEM_MODULES, isAdminUser } from '../lib/moduleData';
import { KpiStaffForm, KpiStaffPeriod, KpiStaffCriterion } from '../types/kpiStaff';
import { DEFAULT_STAFF_PERIODS, DEFAULT_STAFF_CRITERIA } from '../lib/kpiStaffData';
import { subscribeStaffForms, saveStaffFormsToCache, saveStaffFormToFirestore, loadStaffFormsFromCache } from '../services/kpiStaffService';
import { DEFAULT_TASK_KPIS } from '../lib/kpiTargetAudienceUtils';
import { OFFICIAL_SCHOOL_TASKS_2026_2027 } from '../utils/sampleSchoolTasks';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';

interface AppState {
  teachers: Teacher[];
  departments: Department[];
  tasks: Task[];
  workAssignments: WorkAssignment[];
  reports: Report[];
  disciplineRecords: DisciplineRecord[];
  disciplineCriteria: DisciplineCriterion[];
  generalKpis: GeneralKpi[];
  kpiGroups: KpiGroup[];
  kpiCategories: KpiCategory[];
  kpis: KpiItem[];
  kpiRecords: KpiRecord[];
  kpiEvaluationForms: KpiEvaluationForm[];
  kpiMonthlySettings: KpiMonthlySetting[];
  evaluationCategories: EvaluationCategory[];
  evaluationCriteria: EvaluationCriterion[];
  notifications: Notification[];
  calendarEvents: CalendarEvent[];
  leaveRecords: LeaveRecord[];
  attendanceRecords: AttendanceRecord[];
  schoolStats: SchoolStats;
  modules: SystemModule[];
  kpiStaffForms: KpiStaffForm[];
  kpiStaffPeriods: KpiStaffPeriod[];
  kpiStaffCriteria: KpiStaffCriterion[];
  loading: boolean;
  error: string | null;
}

interface AppContextType extends AppState {
  setKpiStaffForms: (forms: KpiStaffForm[]) => void;
  setKpiStaffPeriods: (periods: KpiStaffPeriod[]) => void;
  setKpiStaffCriteria: (criteria: KpiStaffCriterion[]) => void;
  addModule: (module: SystemModule, currentUser?: User | null) => Promise<void>;
  updateModule: (id: string, data: Partial<SystemModule>, currentUser?: User | null) => Promise<void>;
  deleteModule: (id: string, currentUser?: User | null) => Promise<void>;
  toggleModule: (id: string, currentUser?: User | null) => Promise<void>;
  reorderModules: (newModules: SystemModule[], currentUser?: User | null) => Promise<void>;
  resetModulesToDefault: (currentUser?: User | null) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status'], progress?: number) => void;
  markNotificationRead: (id: string) => void;
  deleteTeacher: (id: string) => void;
  deleteAllTeachers: () => Promise<void>;
  importTeachers: (newTeachers: Teacher[]) => Promise<void>;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  addTeacher: (teacher: Teacher) => void;
  updateDepartment: (id: string, data: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addDepartment: (dept: Department) => void;
  addDisciplineRecord: (record: DisciplineRecord) => void;
  updateDisciplineRecord: (id: string, data: Partial<DisciplineRecord>) => void;
  deleteDisciplineRecord: (id: string) => Promise<void>;
  deleteDisciplineRecords: (ids: string[]) => Promise<void>;
  addDisciplineCriterion: (criterion: DisciplineCriterion) => Promise<void>;
  updateDisciplineCriterion: (id: string, data: Partial<DisciplineCriterion>) => Promise<void>;
  deleteDisciplineCriterion: (id: string) => Promise<void>;
  addGeneralKpi: (kpi: GeneralKpi) => Promise<void>;
  updateGeneralKpi: (id: string, data: Partial<GeneralKpi>) => Promise<void>;
  deleteGeneralKpi: (id: string) => Promise<void>;
  addKpiGroup: (group: KpiGroup) => Promise<void>;
  updateKpiGroup: (id: string, data: Partial<KpiGroup>) => Promise<void>;
  deleteKpiGroup: (id: string, options?: { cascade?: boolean; targetGroupId?: string; deleteRecords?: boolean }) => Promise<void>;
  addKpiCategory: (category: KpiCategory) => Promise<void>;
  updateKpiCategory: (id: string, data: Partial<KpiCategory>) => Promise<void>;
  deleteKpiCategory: (id: string, options?: { cascade?: boolean; targetCategoryId?: string; deleteRecords?: boolean }) => Promise<void>;
  addKpi: (kpi: KpiItem) => Promise<void>;
  updateKpi: (id: string, data: Partial<KpiItem>) => Promise<void>;
  deleteKpi: (id: string, deleteAssociatedRecords?: boolean) => Promise<void>;
  addKpiRecord: (record: KpiRecord) => Promise<void>;
  updateKpiRecord: (id: string, data: Partial<KpiRecord>) => Promise<void>;
  deleteKpiRecord: (id: string) => Promise<void>;
  addKpiEvaluationForm: (form: KpiEvaluationForm) => Promise<void>;
  updateKpiEvaluationForm: (id: string, data: Partial<KpiEvaluationForm>) => Promise<void>;
  deleteKpiEvaluationForm: (id: string) => Promise<void>;
  saveKpiMonthlySetting: (setting: KpiMonthlySetting) => Promise<void>;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addWorkAssignment: (assignment: WorkAssignment) => Promise<void>;
  updateWorkAssignment: (id: string, data: Partial<WorkAssignment>) => Promise<void>;
  deleteWorkAssignment: (id: string) => Promise<void>;
  importWorkAssignments: (assignments: WorkAssignment[]) => Promise<void>;
  seedOrResetSchoolTasks: () => Promise<void>;
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (id: string, data: Partial<Notification>) => void;
  deleteNotification: (id: string) => void;
  addReport: (report: Report) => Promise<void>;
  updateReport: (id: string, data: Partial<Report>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  checkAndRepairKpiData: () => Promise<{ checkedGroups: number; checkedKpis: number; orphanedCount: number; repairedCount: number }>;
  updateSchoolStats: (stats: Partial<SchoolStats>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);


const sanitize = <T extends Record<string, any>>(data: T): T => {
  const cleanDeep = (obj: any): any => {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    if (typeof obj === 'number') {
      return Number.isNaN(obj) ? 0 : obj;
    }
    if (Array.isArray(obj)) {
      return obj
        .map(cleanDeep)
        .filter(item => item !== undefined);
    }
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cv = cleanDeep(value);
          if (cv !== undefined) {
            cleaned[key] = cv;
          }
        }
      }
      return cleaned;
    }
    return obj;
  };
  return (cleanDeep(data) || {}) as T;
};

const handleDbError = (e: any) => {
  console.error("Firebase error:", e);
};


const defaultEvalCategories: EvaluationCategory[] = [
  { id: 'cat_noiquy', name: 'THỰC HIỆN NỘI QUY CƠ QUAN', order: 1, status: 'active' },
  { id: 'cat_chuyenmon', name: 'THỰC HIỆN QUY CHẾ CHUYÊN MÔN', order: 2, status: 'active' },
  { id: 'cat_vanhoa', name: 'VĂN HÓA CÔNG SỞ', order: 3, status: 'active' },
  { id: 'cat_thongtin', name: 'THÔNG TIN, BÁO CÁO', order: 4, status: 'active' }
];

const defaultEvalCriteria: EvaluationCriterion[] = [
  { id: 'crit_nq_1', categoryId: 'cat_noiquy', name: 'Chấp hành thời gian làm việc', order: 1, status: 'active' },
  { id: 'crit_nq_2', categoryId: 'cat_noiquy', name: 'Thực hiện đúng giờ làm việc', order: 2, status: 'active' },
  { id: 'crit_nq_3', categoryId: 'cat_noiquy', name: 'Chấp hành quy định nghỉ phép, nghỉ việc', order: 3, status: 'active' },
  { id: 'crit_nq_4', categoryId: 'cat_noiquy', name: 'Chấp hành quy định của nhà trường', order: 4, status: 'active' },
  { id: 'crit_nq_5', categoryId: 'cat_noiquy', name: 'Thực hiện nhiệm vụ trực, trực cơ quan theo phân công', order: 5, status: 'active' },
  { id: 'crit_nq_6', categoryId: 'cat_noiquy', name: 'Chấp hành các quy định về bảo vệ tài sản công', order: 6, status: 'active' },
  { id: 'crit_nq_7', categoryId: 'cat_noiquy', name: 'Chấp hành quy định về an toàn, an ninh trường học', order: 7, status: 'active' },
  { id: 'crit_nq_8', categoryId: 'cat_noiquy', name: 'Thực hiện các quy định khác của cơ quan', order: 8, status: 'active' },
  
  { id: 'crit_cm_1', categoryId: 'cat_chuyenmon', name: 'Thực hiện đầy đủ hồ sơ chuyên môn', order: 1, status: 'active' },
  { id: 'crit_cm_2', categoryId: 'cat_chuyenmon', name: 'Thực hiện kế hoạch giáo dục', order: 2, status: 'active' },
  { id: 'crit_cm_3', categoryId: 'cat_chuyenmon', name: 'Thực hiện đúng tiến độ chương trình', order: 3, status: 'active' },
  { id: 'crit_cm_4', categoryId: 'cat_chuyenmon', name: 'Thực hiện kiểm tra, đánh giá học sinh', order: 4, status: 'active' },
  { id: 'crit_cm_5', categoryId: 'cat_chuyenmon', name: 'Thực hiện nhập điểm/cập nhật dữ liệu đúng thời hạn', order: 5, status: 'active' },
  { id: 'crit_cm_6', categoryId: 'cat_chuyenmon', name: 'Thực hiện các nhiệm vụ chuyên môn được phân công', order: 6, status: 'active' },
  { id: 'crit_cm_7', categoryId: 'cat_chuyenmon', name: 'Tham gia sinh hoạt tổ/nhóm chuyên môn', order: 7, status: 'active' },
  { id: 'crit_cm_8', categoryId: 'cat_chuyenmon', name: 'Thực hiện các quy định chuyên môn của nhà trường', order: 8, status: 'active' },
  { id: 'crit_cm_9', categoryId: 'cat_chuyenmon', name: 'Thực hiện nhiệm vụ bồi dưỡng chuyên môn', order: 9, status: 'active' },
  { id: 'crit_cm_10', categoryId: 'cat_chuyenmon', name: 'Thực hiện chế độ báo cáo chuyên môn', order: 10, status: 'active' },

  { id: 'crit_vh_1', categoryId: 'cat_vanhoa', name: 'Giao tiếp với đồng nghiệp', order: 1, status: 'active' },
  { id: 'crit_vh_2', categoryId: 'cat_vanhoa', name: 'Giao tiếp với học sinh, cha mẹ học sinh', order: 2, status: 'active' },
  { id: 'crit_vh_3', categoryId: 'cat_vanhoa', name: 'Tinh thần phối hợp, trách nhiệm', order: 3, status: 'active' },
  { id: 'crit_vh_4', categoryId: 'cat_vanhoa', name: 'Tác phong, trang phục làm việc', order: 4, status: 'active' },
  { id: 'crit_vh_5', categoryId: 'cat_vanhoa', name: 'Ứng xử văn minh, giữ gìn hình ảnh', order: 5, status: 'active' },

  { id: 'crit_tt_1', categoryId: 'cat_thongtin', name: 'Thực hiện báo cáo đúng thời hạn', order: 1, status: 'active' },
  { id: 'crit_tt_2', categoryId: 'cat_thongtin', name: 'Cung cấp thông tin đầy đủ, chính xác', order: 2, status: 'active' },
  { id: 'crit_tt_3', categoryId: 'cat_thongtin', name: 'Không để chậm trễ báo cáo', order: 3, status: 'active' },
  
  { id: 'crit_vh_1', categoryId: 'cat_vanhoa', name: 'Giao tiếp, ứng xử với đồng nghiệp', order: 1, status: 'active' },
  { id: 'crit_vh_2', categoryId: 'cat_vanhoa', name: 'Giao tiếp, ứng xử với học sinh', order: 2, status: 'active' },
  { id: 'crit_vh_3', categoryId: 'cat_vanhoa', name: 'Giao tiếp, ứng xử với phụ huynh', order: 3, status: 'active' },
  { id: 'crit_vh_4', categoryId: 'cat_vanhoa', name: 'Tinh thần phối hợp trong công việc', order: 4, status: 'active' },
  { id: 'crit_vh_5', categoryId: 'cat_vanhoa', name: 'Ý thức trách nhiệm', order: 5, status: 'active' },
  { id: 'crit_vh_6', categoryId: 'cat_vanhoa', name: 'Tác phong làm việc', order: 6, status: 'active' },
  { id: 'crit_vh_7', categoryId: 'cat_vanhoa', name: 'Trang phục, hình thức phù hợp môi trường giáo dục', order: 7, status: 'active' },
  { id: 'crit_vh_8', categoryId: 'cat_vanhoa', name: 'Giữ gìn môi trường làm việc', order: 8, status: 'active' },
  { id: 'crit_vh_9', categoryId: 'cat_vanhoa', name: 'Sử dụng ngôn ngữ, thái độ phù hợp', order: 9, status: 'active' },
  { id: 'crit_vh_10', categoryId: 'cat_vanhoa', name: 'Giữ gìn hình ảnh, uy tín của nhà trường', order: 10, status: 'active' }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    teachers: [],
    departments: [],
    tasks: [],
    workAssignments: [],
    reports: [],
    disciplineRecords: [],
    disciplineCriteria: [],
    generalKpis: [],
    kpiGroups: [],
    kpiCategories: [],
    kpis: [],
    kpiRecords: [],
    kpiEvaluationForms: [],
    kpiMonthlySettings: [],
    evaluationCategories: defaultEvalCategories,
    evaluationCriteria: defaultEvalCriteria,
    notifications: [],
    calendarEvents: [],
    leaveRecords: [],
    attendanceRecords: [],
    schoolStats: {
      totalTeachers: 42,
      totalStudents: 1236,
      totalClasses: 36,
      schoolYear: '2026 - 2027',
      motto: 'Nơi chắp cánh những ước mơ',
      welcomeMessage: 'Chào mừng bạn!'
    },
    modules: (() => {
      try {
        const stored = localStorage.getItem('app_system_modules');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return DEFAULT_SYSTEM_MODULES;
    })(),
    kpiStaffForms: loadStaffFormsFromCache(),
    kpiStaffPeriods: DEFAULT_STAFF_PERIODS,
    kpiStaffCriteria: DEFAULT_STAFF_CRITERIA,
    loading: true,
    error: null,
  });

  // Staff KPI subscription
  useEffect(() => {
    const unsub = subscribeStaffForms((forms) => {
      setState(prev => ({ ...prev, kpiStaffForms: forms }));
    });
    return () => unsub();
  }, []);

  const setKpiStaffForms = (forms: KpiStaffForm[]) => {
    setState(prev => ({ ...prev, kpiStaffForms: forms }));
    saveStaffFormsToCache(forms);
    forms.forEach(f => saveStaffFormToFirestore(f));
  };

  const setKpiStaffPeriods = (periods: KpiStaffPeriod[]) => {
    setState(prev => ({ ...prev, kpiStaffPeriods: periods }));
  };

  const setKpiStaffCriteria = (criteria: KpiStaffCriterion[]) => {
    setState(prev => ({ ...prev, kpiStaffCriteria: criteria }));
  };

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const handleSnapshot = (colName: string, key: keyof AppState) => {
      const q = collection(db, colName);
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setState(prev => ({ ...prev, [key]: data }));
      }, (error) => {
        console.error(`Error fetching ${colName}:`, error);
        setState(prev => ({ ...prev, error: "Không thể kết nối cơ sở dữ liệu. Dữ liệu chưa được tải." }));
      });
      unsubscribes.push(unsub);
    };

    handleSnapshot('teachers', 'teachers');
    handleSnapshot('departments', 'departments');
    handleSnapshot('tasks', 'tasks');
    handleSnapshot('workAssignments', 'workAssignments');
    handleSnapshot('reports', 'reports');
    handleSnapshot('disciplineRecords', 'disciplineRecords');
    handleSnapshot('disciplineCriteria', 'disciplineCriteria');
    handleSnapshot('generalKpis', 'generalKpis');
    handleSnapshot('kpiGroups', 'kpiGroups');
    handleSnapshot('kpiCategories', 'kpiCategories');
    handleSnapshot('kpis', 'kpis');
    handleSnapshot('kpiRecords', 'kpiRecords');
    handleSnapshot('kpi_evaluation_forms', 'kpiEvaluationForms');
    handleSnapshot('kpiMonthlySettings', 'kpiMonthlySettings');
    handleSnapshot('evaluationCategories', 'evaluationCategories');
    handleSnapshot('evaluationCriteria', 'evaluationCriteria');
    handleSnapshot('notifications', 'notifications');
    handleSnapshot('calendarEvents', 'calendarEvents');
    handleSnapshot('leaveRecords', 'leaveRecords');
    handleSnapshot('attendance', 'attendanceRecords');

    // Quản lý System Modules từ Firestore
    const modulesColRef = collection(db, 'system_modules');
    const unsubModules = onSnapshot(modulesColRef, (snap) => {
      if (!snap.empty) {
        const loadedModules = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SystemModule[];
        loadedModules.sort((a, b) => (a.order || 0) - (b.order || 0));
        setState(prev => ({ ...prev, modules: loadedModules }));
        try {
          localStorage.setItem('app_system_modules', JSON.stringify(loadedModules));
        } catch (e) {}
      } else {
        // Khởi tạo từ default modules nếu chưa có document nào
        setState(prev => {
          if (!prev.modules || prev.modules.length === 0) {
            return { ...prev, modules: DEFAULT_SYSTEM_MODULES };
          }
          return prev;
        });
      }
    }, (err) => {
      console.warn('Error fetching system_modules from firestore:', err);
    });
    unsubscribes.push(unsubModules);

    // Thống kê trường học THPT Sơn Lương từ Database
    const statsDocRef = doc(db, 'systemSettings', 'schoolStats');
    const unsubStats = onSnapshot(statsDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<SchoolStats>;
        setState(prev => ({
          ...prev,
          schoolStats: {
            totalTeachers: d.totalTeachers ?? (prev.teachers.length > 0 ? prev.teachers.length : 42),
            totalStudents: d.totalStudents ?? 1236,
            totalClasses: d.totalClasses ?? 36,
            schoolYear: d.schoolYear ?? '2026 - 2027',
            motto: d.motto ?? 'Nơi chắp cánh những ước mơ',
            welcomeMessage: d.welcomeMessage ?? 'Chào mừng bạn!'
          }
        }));
      } else {
        setDoc(statsDocRef, {
          totalTeachers: 42,
          totalStudents: 1236,
          totalClasses: 36,
          schoolYear: '2026 - 2027',
          motto: 'Nơi chắp cánh những ước mơ',
          welcomeMessage: 'Chào mừng bạn!'
        }, { merge: true }).catch(e => console.warn('Could not seed schoolStats:', e));
      }
    }, (err) => {
      console.warn('Error fetching schoolStats from firestore:', err);
    });
    unsubscribes.push(unsubStats);

    // Khởi tạo & migration cấu trúc phân cấp KPI 3 cấp (Nhóm KPI Cấp 1 -> Nhóm Tiêu chí Cấp 2 -> Tiêu chí Cấp 3)
    const migrateAndSeedHierarchyIfEmpty = async () => {
      try {
        const generalKpiCol = collection(db, 'generalKpis');
        const genSnap = await getDocs(generalKpiCol);
        let defaultGenId = 'kpic_thpt';

        if (genSnap.empty) {
          const defaultGen: GeneralKpi = {
            id: 'kpic_thpt',
            code: 'KPIC_THPT',
            name: 'Đánh giá viên chức CBGVNV',
            description: 'Khung tiêu chuẩn đánh giá kết quả công tác và hoàn thành nhiệm vụ CBGVNV trường THPT',
            targetAudience: 'Tất cả CBGVNV',
            applicableYear: '2025-2026',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'Ban Giám Hiệu'
          };
          await setDoc(doc(db, 'generalKpis', defaultGen.id), sanitize(defaultGen));
        } else {
          defaultGenId = genSnap.docs[0].id;
        }

        // Nhóm KPI (KPI_GROUP) - Cấp 1
        const groupCol = collection(db, 'kpiGroups');
        const snap = await getDocs(groupCol);
        let n01GroupId = 'kpig_n01';

        if (snap.empty) {
          const defaultGroups: KpiGroup[] = [
            { id: 'kpig_n01', generalKpiId: defaultGenId, code: 'N01', name: 'Tư tưởng, đạo đức, lối sống', description: 'Chấp hành chủ trương đường lối, đạo đức nhà giáo, lối sống mẫu mực và tinh thần trách nhiệm', groupScore: 25, order: 1, status: 'active', createdAt: new Date().toISOString() },
            { id: 'kpig_cm', generalKpiId: defaultGenId, code: 'CM', name: 'Thực hiện nhiệm vụ chuyên môn', description: 'Thực hiện quy chế chuyên môn, giáo án, sổ sách, tiến độ giảng dạy', groupScore: 35, order: 2, status: 'active', createdAt: new Date().toISOString() },
            { id: 'kpig_nn', generalKpiId: defaultGenId, code: 'NNKL', name: 'Nền nếp, kỷ luật', description: 'Theo dõi chấp hành nền nếp, giờ giấc, nội quy cơ quan, hội họp', groupScore: 20, order: 3, status: 'active', createdAt: new Date().toISOString() },
            { id: 'kpig_ph', generalKpiId: defaultGenId, code: 'TTPH', name: 'Tinh thần phối hợp', description: 'Phối hợp công tác, sinh hoạt tập thể, tương trợ đồng nghiệp', groupScore: 15, order: 4, status: 'active', createdAt: new Date().toISOString() },
            { id: 'kpig_kh', generalKpiId: defaultGenId, code: 'NVK', name: 'Thực hiện nhiệm vụ khác', description: 'Các nhiệm vụ đột xuất, phong trào thi đua, công tác kiêm nhiệm khác', groupScore: 15, order: 5, status: 'active', createdAt: new Date().toISOString() },
            { id: 'kpig_unassigned', generalKpiId: defaultGenId, code: 'CPN', name: 'Chưa phân nhóm', description: 'Các tiêu chí chuyển tiếp cần phân loại', groupScore: 0, order: 99, status: 'active', createdAt: new Date().toISOString() },
          ];
          const batch = writeBatch(db);
          defaultGroups.forEach(g => {
            batch.set(doc(db, 'kpiGroups', g.id), sanitize(g));
          });
          await batch.commit();
        } else {
          // Kiểm tra xem nhóm N01 đã có chưa
          const existingN01 = snap.docs.find(d => {
            const data = d.data() as KpiGroup;
            return data.code === 'N01' || (data.name && data.name.includes('Tư tưởng, đạo đức'));
          });
          if (existingN01) {
            n01GroupId = existingN01.id;
          } else {
            // Tạo nhóm N01 nếu chưa có
            const groupN01: KpiGroup = {
              id: 'kpig_n01',
              generalKpiId: defaultGenId,
              code: 'N01',
              name: 'Tư tưởng, đạo đức, lối sống',
              description: 'Chấp hành chủ trương đường lối, đạo đức nhà giáo, lối sống mẫu mực và tinh thần trách nhiệm',
              groupScore: 25,
              order: 1,
              status: 'active',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'kpiGroups', groupN01.id), sanitize(groupN01));
          }

          // Kiểm tra và gán generalKpiId cho các nhóm cũ chưa có
          const groupsNeedingUpdate: { id: string; generalKpiId: string }[] = [];
          snap.docs.forEach(d => {
            const data = d.data() as KpiGroup;
            if (!data.generalKpiId) {
              groupsNeedingUpdate.push({ id: d.id, generalKpiId: defaultGenId });
            }
          });
          if (groupsNeedingUpdate.length > 0) {
            const batch = writeBatch(db);
            groupsNeedingUpdate.forEach(u => {
              batch.update(doc(db, 'kpiGroups', u.id), { generalKpiId: u.generalKpiId });
            });
            await batch.commit();
          }
        }

        // Nhóm Tiêu Chí KPI (KPI_CATEGORY) - Cấp 2
        const catCol = collection(db, 'kpiCategories');
        const catSnap = await getDocs(catCol);
        if (catSnap.empty) {
          const defaultCategories: KpiCategory[] = [
            {
              id: 'kpicat_n01_01',
              groupId: n01GroupId,
              group_id: n01GroupId,
              code: 'N01.01',
              name: 'Chính trị, tư tưởng',
              description: 'Lập trường tư tưởng chính trị vững vàng, chấp hành tốt chủ trương chính sách',
              order: 1,
              status: 'active',
              createdAt: new Date().toISOString()
            },
            {
              id: 'kpicat_n01_02',
              groupId: n01GroupId,
              group_id: n01GroupId,
              code: 'N01.02',
              name: 'Đạo đức, lối sống',
              description: 'Giữ gìn phẩm chất đạo đức, lối sống mẫu mực, tinh thần trách nhiệm',
              order: 2,
              status: 'active',
              createdAt: new Date().toISOString()
            },
            {
              id: 'kpicat_n01_03',
              groupId: n01GroupId,
              group_id: n01GroupId,
              code: 'N01.03',
              name: 'Tinh thần đoàn kết, phối hợp',
              description: 'Đoàn kết nội bộ, tích cực phối hợp trong công tác và hoạt động giáo dục',
              order: 3,
              status: 'active',
              createdAt: new Date().toISOString()
            },
            {
              id: 'kpicat_n01_04',
              groupId: n01GroupId,
              group_id: n01GroupId,
              code: 'N01.04',
              name: 'Ý thức tổ chức, kỷ luật',
              description: 'Chấp hành nghiêm túc quy định, phân công công tác và kỷ luật cơ quan',
              order: 4,
              status: 'active',
              createdAt: new Date().toISOString()
            }
          ];

          // Tạo nhóm tiêu chí mặc định cho các nhóm khác đang tồn tại
          if (!snap.empty) {
            snap.docs.forEach((gDoc) => {
              const g = gDoc.data() as KpiGroup;
              if (g.id !== n01GroupId && g.code !== 'N01') {
                defaultCategories.push({
                  id: `kpicat_${g.code.toLowerCase().replace(/[^a-z0-9]/g, '') || g.id}_01`,
                  groupId: g.id,
                  group_id: g.id,
                  code: `${g.code}.01`,
                  name: `Tiêu chuẩn ${g.name}`,
                  description: `Nhóm tiêu chí chuẩn cho ${g.name}`,
                  order: 1,
                  status: 'active',
                  createdAt: new Date().toISOString()
                });
              }
            });
          }

          const catBatch = writeBatch(db);
          defaultCategories.forEach(cat => {
            catBatch.set(doc(db, 'kpiCategories', cat.id), sanitize(cat));
          });
          await catBatch.commit();

          // Tạo các tiêu chí KPI thành phần chuẩn cho N01.02 theo đúng yêu cầu đề bài
          const sampleCriteria: KpiItem[] = [
            {
              id: 'kpi_n01_02_01',
              code: 'N01.02.01',
              groupId: n01GroupId,
              group_id: n01GroupId,
              categoryId: 'kpicat_n01_02',
              category_id: 'kpicat_n01_02',
              group: 'Tư tưởng, đạo đức, lối sống',
              categoryName: 'Đạo đức, lối sống',
              name: 'Giữ gìn phẩm chất đạo đức',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_1', name: 'Nhắc nhở về tác phong', deductionScore: 1, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_2', name: 'Vi phạm đạo đức nhà giáo', deductionScore: 5, unit: 'Lần', status: 'active', order: 2 }
              ],
              unit: 'Lần',
              status: 'active',
              order: 1,
              description: 'Thực hiện chuẩn mực đạo đức nghề nghiệp, mô phạm trước học sinh và đồng nghiệp'
            },
            {
              id: 'kpi_n01_02_02',
              code: 'N01.02.02',
              groupId: n01GroupId,
              group_id: n01GroupId,
              categoryId: 'kpicat_n01_02',
              category_id: 'kpicat_n01_02',
              group: 'Tư tưởng, đạo đức, lối sống',
              categoryName: 'Đạo đức, lối sống',
              name: 'Có lối sống lành mạnh',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_3', name: 'Lối sống không chuẩn mực', deductionScore: 2, unit: 'Lần', status: 'active', order: 1 }
              ],
              unit: 'Lần',
              status: 'active',
              order: 2,
              description: 'Lối sống trung thực, giản dị, hòa đồng, văn minh'
            },
            {
              id: 'kpi_n01_02_03',
              code: 'N01.02.03',
              groupId: n01GroupId,
              group_id: n01GroupId,
              categoryId: 'kpicat_n01_02',
              category_id: 'kpicat_n01_02',
              group: 'Tư tưởng, đạo đức, lối sống',
              categoryName: 'Đạo đức, lối sống',
              name: 'Không vi phạm quy định',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_4', name: 'Vi phạm quy định nhà trường mức nhẹ', deductionScore: 2, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_5', name: 'Vi phạm quy định nhà trường mức nghiêm trọng', deductionScore: 5, unit: 'Lần', status: 'active', order: 2 }
              ],
              unit: 'Lần',
              status: 'active',
              order: 3,
              description: 'Chấp hành nghiêm ngặt điều lệ trường phổ thông và quy chế ngành'
            },
            {
              id: 'kpi_n01_02_04',
              code: 'N01.02.04',
              groupId: n01GroupId,
              group_id: n01GroupId,
              categoryId: 'kpicat_n01_02',
              category_id: 'kpicat_n01_02',
              group: 'Tư tưởng, đạo đức, lối sống',
              categoryName: 'Đạo đức, lối sống',
              name: 'Có tinh thần trách nhiệm',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_6', name: 'Thiếu tinh thần trách nhiệm trong công việc', deductionScore: 2, unit: 'Lần', status: 'active', order: 1 }
              ],
              unit: 'Lần',
              status: 'active',
              order: 4,
              description: 'Tận tụy với công việc, hoàn thành tốt nhiệm vụ được giao'
            }
          ];

          const critBatch = writeBatch(db);
          sampleCriteria.forEach(sc => {
            critBatch.set(doc(db, 'kpis', sc.id), sanitize(sc));
          });
          await critBatch.commit();
        }
      } catch (e) {
        console.warn('Could not migrate/seed KPI Hierarchy:', e);
      }
    };
    migrateAndSeedHierarchyIfEmpty();

    // Khởi tạo danh mục KPI chuẩn nếu chưa có
    const seedKpisIfEmpty = async () => {
      try {
        const kpiCol = collection(db, 'kpis');
        const snap = await getDocs(kpiCol);
        if (snap.empty) {
          const defaultKpis: KpiItem[] = [
            {
              id: 'kpi_ct01',
              code: 'CT01',
              groupId: 'kpig_tt',
              group: 'Tư tưởng chính trị',
              name: 'Tư tưởng chính trị',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_ct1', name: 'Vi phạm mức 1', deductionScore: 1, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_ct2', name: 'Vi phạm mức 2', deductionScore: 2, unit: 'Lần', status: 'active', order: 2 },
                { id: 'r_ct3', name: 'Vi phạm mức 3', deductionScore: 5, unit: 'Lần', status: 'active', order: 3 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 1,
              description: 'Chấp hành chủ trương, đường lối, chính sách của Đảng và pháp luật của Nhà nước'
            },
            {
              id: 'kpi_nn01',
              code: 'NN01',
              groupId: 'kpig_nn',
              group: 'Nền nếp',
              name: 'Nền nếp, tác phong và giờ giấc làm việc',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 20,
              standardScore: 20,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_nn1', name: 'Không đeo thẻ công sở', deductionScore: 1, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_nn2', name: 'Đi muộn / vào tiết muộn', deductionScore: 2, unit: 'Lần', status: 'active', order: 2 },
                { id: 'r_nn3', name: 'Bỏ chấm công / quên chấm công', deductionScore: 3, unit: 'Lần', status: 'active', order: 3 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 2,
              description: 'Chấp hành nghiêm quy định về thời gian làm việc và tác phong'
            },
            {
              id: 'kpi_cm01',
              code: 'CM01',
              groupId: 'kpig_cm',
              group: 'Chuyên môn',
              name: 'Thực hiện nhiệm vụ chuyên môn và quy chế',
              targetAudience: 'Giáo viên',
              pointType: 'minus',
              pointValue: 30,
              standardScore: 30,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_cm1', name: 'Không thực hiện đúng quy chế chuyên môn', deductionScore: 5, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_cm2', name: 'Hồ sơ chuyên môn không đầy đủ / chậm nộp', deductionScore: 3, unit: 'Lần', status: 'active', order: 2 },
                { id: 'r_cm3', name: 'Vi phạm quy định chuyên môn khác', deductionScore: 5, unit: 'Lần', status: 'active', order: 3 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 3,
              description: 'Thực hiện đầy đủ kế hoạch giảng dạy, hồ sơ giáo án, sổ điểm'
            },
            {
              id: 'kpi_vh01',
              code: 'VH01',
              groupId: 'kpig_vh',
              group: 'Văn hóa công sở',
              name: 'Tác phong, văn hóa công sở và ứng xử',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 15,
              standardScore: 15,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_vh1', name: 'Vi phạm quy tắc ứng xử mức nhẹ', deductionScore: 1, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_vh2', name: 'Vi phạm quy tắc ứng xử mức vừa', deductionScore: 2, unit: 'Lần', status: 'active', order: 2 },
                { id: 'r_vh3', name: 'Vi phạm nghiêm trọng', deductionScore: 3, unit: 'Lần', status: 'active', order: 3 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 4,
              description: 'Đoàn kết nội bộ, giao tiếp chuẩn mực, xây dựng môi trường sư phạm'
            },
            {
              id: 'kpi_cn01',
              code: 'CN01',
              groupId: 'kpig_cn',
              group: 'Chủ nhiệm',
              name: 'Công tác chủ nhiệm lớp / quản lý học sinh',
              targetAudience: 'Giáo viên chủ nhiệm',
              pointType: 'minus',
              pointValue: 15,
              standardScore: 15,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_cn1', name: 'Để lớp vi phạm nề nếp / trật tự', deductionScore: 2, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_cn2', name: 'Chậm báo cáo công tác chủ nhiệm', deductionScore: 3, unit: 'Lần', status: 'active', order: 2 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 5,
              description: 'Nhiệm vụ quản lý, giáo dục học sinh và phối hợp phụ huynh'
            },
            {
              id: 'kpi_cv01',
              code: 'CV01',
              groupId: 'kpig_cv',
              group: 'Công việc',
              name: 'Thực hiện các nhiệm vụ được giao khác',
              targetAudience: 'Tất cả CBGVNV',
              pointType: 'minus',
              pointValue: 10,
              standardScore: 10,
              hasDeduction: true,
              deductionRules: [
                { id: 'r_cv1', name: 'Chậm tiến độ thực hiện nhiệm vụ', deductionScore: 2, unit: 'Lần', status: 'active', order: 1 },
                { id: 'r_cv2', name: 'Không hoàn thành nhiệm vụ được phân công', deductionScore: 5, unit: 'Lần', status: 'active', order: 2 },
              ],
              unit: 'Lần',
              status: 'active',
              order: 6,
              description: 'Thực hiện các nhiệm vụ đột xuất hoặc theo phân công của BGH'
            }
          ];
          const batch = writeBatch(db);
          defaultKpis.forEach(k => {
            batch.set(doc(db, 'kpis', k.id), sanitize(k));
          });
          await batch.commit();
        }
      } catch (e) {
        console.warn('Could not seed KPIs:', e);
      }
    };
    seedKpisIfEmpty();

    // Khởi tạo các tiêu chí KPI đặc thù theo công việc cho 4 nhóm đối tượng: CNQL; TTCM, TPCM, TTVP; Giáo viên; Nhân viên
    const seedTaskKpisForTargetGroups = async () => {
      try {
        const kpiCol = collection(db, 'kpis');
        const snap = await getDocs(kpiCol);
        const existingCodes = new Set(snap.docs.map(d => (d.data().code || '').toUpperCase()));
        const existingIds = new Set(snap.docs.map(d => d.id));

        const missingKpis = DEFAULT_TASK_KPIS.filter(tk => 
          !existingIds.has(tk.id) && !existingCodes.has(tk.code.toUpperCase())
        );

        if (missingKpis.length > 0) {
          const batch = writeBatch(db);
          missingKpis.forEach((tk, idx) => {
            const kpiDoc: KpiItem = {
              id: tk.id,
              code: tk.code,
              groupId: tk.groupId,
              group_id: tk.groupId,
              group: tk.group,
              categoryId: 'kpicat_task',
              category_id: 'kpicat_task',
              categoryName: 'Thực hiện nhiệm vụ được giao',
              name: tk.name,
              targetAudiences: [tk.targetGroup],
              targetAudience: tk.targetAudience,
              pointType: tk.pointType,
              pointValue: tk.pointValue,
              standardScore: tk.standardScore,
              evidenceRequirement: 'Báo cáo công việc / Biên bản kiểm tra / Sổ theo dõi',
              evaluatorRole: tk.targetGroup === 'CBQL' ? 'BGH / Cấp trên' : (tk.targetGroup === 'TTCM_TPCM' ? 'BGH' : 'BGH / Tổ trưởng'),
              hasDeduction: true,
              deductionRules: [
                {
                  id: `rule_${tk.id}_1`,
                  name: tk.deductionName,
                  deductionScore: tk.deductionScore,
                  unit: 'Lần',
                  status: 'active',
                  order: 1
                }
              ],
              unit: 'Lần',
              status: 'active',
              order: 10 + idx,
              description: tk.description,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            batch.set(doc(db, 'kpis', kpiDoc.id), sanitize(kpiDoc));
          });
          await batch.commit();
        }

        // Tự động chuẩn hóa dữ liệu cũ của TTCM / TPCM thành TTCM_TPCM chung nếu chưa có targetAudiences
        const legacyDocsToUpdate = snap.docs.filter(d => {
          const data = d.data();
          const aud = (data.targetAudience || '').toLowerCase();
          const hasLegacyAud = aud.includes('ttcm') || aud.includes('tpcm') || aud.includes('tổ trưởng') || aud.includes('tổ phó');
          return hasLegacyAud && (!data.targetAudiences || !data.targetAudiences.includes('TTCM_TPCM'));
        });

        if (legacyDocsToUpdate.length > 0) {
          const legacyBatch = writeBatch(db);
          legacyDocsToUpdate.forEach(d => {
            legacyBatch.update(doc(db, 'kpis', d.id), {
              targetAudiences: ['TTCM_TPCM'],
              targetAudience: 'TTCM/TPCM (Tổ trưởng & Tổ phó)',
              updatedAt: new Date().toISOString()
            });
          });
          await legacyBatch.commit();
        }
      } catch (e) {
        console.warn('Could not seed task KPIs for target groups:', e);
      }
    };
    seedTaskKpisForTargetGroups();

    // Khởi tạo 5 tiêu chí mặc định nếu chưa có trong Firestore
    const seedCriteriaIfEmpty = async () => {
      try {
        const critCol = collection(db, 'disciplineCriteria');
        const snap = await getDocs(critCol);
        if (snap.empty) {
          const defaultCriteria: DisciplineCriterion[] = [
            { id: 'crit_1', name: 'Thực hiện Nội quy nhà trường', description: 'Chấp hành giờ giấc, tác phong, văn hóa học đường', order: 1, status: 'active' },
            { id: 'crit_2', name: 'Thực hiện Quy chế chuyên môn', description: 'Hồ sơ giáo án, lịch báo giảng, sổ điểm, tiến độ chương trình', order: 2, status: 'active' },
            { id: 'crit_3', name: 'Thực hiện Văn hóa công sở', description: 'Giao tiếp chuẩn mực, đoàn kết nội bộ, tinh thần hợp tác', order: 3, status: 'active' },
            { id: 'crit_4', name: 'Thực hiện Chế độ hội họp', description: 'Tham gia họp hội đồng, sinh hoạt chuyên môn đầy đủ, đúng giờ', order: 4, status: 'active' },
            { id: 'crit_5', name: 'Tham gia sinh hoạt tập thể', description: 'Tham gia các hoạt động chung, phong trào thi đua của trường', order: 5, status: 'active' },
          ];
          const batch = writeBatch(db);
          defaultCriteria.forEach(c => {
            batch.set(doc(db, 'disciplineCriteria', c.id), sanitize(c));
          });
          await batch.commit();
        }
      } catch (e) {
        console.warn('Could not check or seed disciplineCriteria:', e);
      }
    };
    seedCriteriaIfEmpty();

    const seedWorkAssignmentsIfEmpty = async () => {
      try {
        const waCol = collection(db, 'workAssignments');
        const snap = await getDocs(waCol);
        if (snap.empty) {
          const batch = writeBatch(db);
          OFFICIAL_SCHOOL_TASKS_2026_2027.forEach(wa => {
            batch.set(doc(db, 'workAssignments', wa.id), sanitize(wa));
          });
          await batch.commit();
          console.log('Seeded official school work assignments for THPT Sơn Lương successfully.');
        }
      } catch (e) {
        console.warn('Could not seed work assignments:', e);
      }
    };
    seedWorkAssignmentsIfEmpty();

    const seedReportsIfEmpty = async () => {
      try {
        const reportCol = collection(db, 'reports');
        const snap = await getDocs(reportCol);
        if (snap.empty) {
          const defaultReports: Report[] = [
            {
              id: 'rep_01',
              title: 'Báo cáo kế hoạch chuyên môn Tháng 09/2026',
              authorId: 't1',
              departmentId: 'd1',
              date: '2026-09-05',
              type: 'Báo cáo chuyên môn',
              content: 'Báo cáo chi tiết kế hoạch thực hiện giảng dạy, hội giảng và thao giảng cấp trường Tháng 9.',
              status: 'Đã duyệt',
              reviewDate: '2026-09-06',
              feedback: 'Kế hoạch đầy đủ, đồng ý triển khai.'
            },
            {
              id: 'rep_02',
              title: 'Báo cáo kiểm tra nền nếp tuần 1 Tháng 09',
              authorId: 't2',
              departmentId: 'd2',
              date: '2026-09-10',
              type: 'Báo cáo tuần',
              content: 'Tình hình nề nếp thi đua các lớp khối 10, 11, 12 tuần 1. Đã ghi nhận các trường hợp đi muộn và vi phạm đồng phục.',
              status: 'Chờ duyệt'
            },
            {
              id: 'rep_03',
              title: 'Báo cáo tổng hợp đánh giá KPI CBGVNV Tháng 08',
              authorId: 't3',
              departmentId: 'd3',
              date: '2026-08-31',
              type: 'Báo cáo KPI',
              content: 'Tổng hợp xếp loại thi đua CBGVNV toàn trường tháng 8 năm học 2026-2027.',
              status: 'Đã duyệt'
            }
          ];
          const batch = writeBatch(db);
          defaultReports.forEach(r => batch.set(doc(db, 'reports', r.id), sanitize(r)));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Could not seed reports:', e);
      }
    };
    seedReportsIfEmpty();

    const rename16MemberDepartmentToVanSuDia = async () => {
      try {
        const deptCol = collection(db, 'departments');
        const teacherCol = collection(db, 'teachers');

        const [deptSnap, teacherSnap] = await Promise.all([
          getDocs(deptCol),
          getDocs(teacherCol)
        ]);

        const teachersList = teacherSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

        const batch = writeBatch(db);
        let neededUpdate = false;

        deptSnap.docs.forEach(docSnap => {
          const deptData = docSnap.data();
          const deptId = docSnap.id;
          const currentName = deptData.name || '';

          // Count members belonging to this department ID
          const membersCount = teachersList.filter(t => t.departmentId === deptId).length;

          // Rule: If department name is "Tổ Văn phòng" AND member count is 16 (or > 10) OR if doc.id is 'd_van_su_dia_gdkt_pl_an'
          // ABSOLUTELY DO NOT rename the "Tổ Văn phòng" record that has 5 members!
          if ((currentName === 'Tổ Văn phòng' && membersCount === 16) ||
              (currentName === 'Tổ Văn phòng' && membersCount > 10) ||
              (deptId === 'd_van_su_dia_gdkt_pl_an' && currentName !== 'Tổ Văn-Sử-Địa-GDKT&PL-AN')) {
            batch.update(docSnap.ref, {
              name: 'Tổ Văn-Sử-Địa-GDKT&PL-AN',
              updatedAt: new Date().toISOString()
            });
            neededUpdate = true;
          }
        });

        if (neededUpdate) {
          await batch.commit();
        }
      } catch (e) {
        console.warn('Could not execute department rename migration:', e);
      }
    };
    rename16MemberDepartmentToVanSuDia();

    const seedDepartmentsIfEmpty = async () => {
      try {
        const deptCol = collection(db, 'departments');
        const snap = await getDocs(deptCol);
        
        const requestedDepts = [
          { id: 'd_toan_ly_tin_cn', name: 'Tổ Toán-Lý-Tin-CN', headId: 't1' },
          { id: 'd_hoa_ly_sinh_gdqpan_nn', name: 'Tổ Hóa-Lý-Sinh-GDQPAN-NN', headId: 't3' },
          { id: 'd_van_su_dia_gdkt_pl_an', name: 'Tổ Văn-Sử-Địa-GDKT&PL-AN', headId: 't2' },
          { id: 'd_van_phong', name: 'Tổ Văn phòng', headId: 't4' }
        ];

        const batch = writeBatch(db);
        let neededToSeed = false;

        // Sync missing default departments without overwriting existing ones
        for (const d of requestedDepts) {
          const existingDoc = snap.docs.find(docSnap => docSnap.id === d.id);
          if (!existingDoc) {
            batch.set(doc(db, 'departments', d.id), d);
            neededToSeed = true;
          }
        }

        if (neededToSeed) {
          await batch.commit();
        }
      } catch (e) {
        console.warn('Could not seed departments:', e);
      }
    };

    const seedAndRepairTeachers = async () => {
      try {
        const teacherCol = collection(db, 'teachers');
        const snap = await getDocs(teacherCol);

        if (snap.empty) {
          const defaultTeachers: Teacher[] = [
            {
              id: 't_ht',
              username: 'hieutruong',
              code: 'BGH001',
              name: 'Nguyễn Quang Sáng',
              role: 'BGH',
              position: 'Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'nguyenquangsang@sonluong.edu.vn',
              phone: '0988888888',
              subject: 'Quản lý giáo dục',
              joinDate: '2015-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't_pht1',
              username: 'phohieutruong1',
              code: 'BGH002',
              name: 'Phạm Kim Hùng',
              role: 'BGH',
              position: 'Phó Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'phamkimhung@sonluong.edu.vn',
              phone: '0977777777',
              subject: 'Quản lý chuyên môn',
              joinDate: '2017-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't_pht2',
              username: 'phohieutruong2',
              code: 'BGH003',
              name: 'Nguyễn Anh Hòa',
              role: 'BGH',
              position: 'Phó Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'nguyenanhhoa@sonluong.edu.vn',
              phone: '0966666666',
              subject: 'Quản lý cơ sở vật chất',
              joinDate: '2018-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't1',
              username: 'gv001',
              code: 'GV001',
              name: 'Nguyễn Văn An',
              role: 'GIAO_VIEN',
              departmentId: 'd_toan_ly_tin_cn',
              status: 'Đang công tác',
              email: 'nguyenvanan@sonluong.edu.vn',
              phone: '0912345678',
              subject: 'Toán',
              joinDate: '2020-09-01',
              degree: 'Cử nhân'
            },
            {
              id: 't2',
              username: 'gv002',
              code: 'GV002',
              name: 'Trần Thị Bình',
              role: 'GIAO_VIEN',
              departmentId: 'd_van_su_dia_gdkt_pt_an',
              status: 'Đang công tác',
              email: 'tranthibinh@sonluong.edu.vn',
              phone: '0923456789',
              subject: 'Ngữ văn',
              joinDate: '2019-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't3',
              username: 'gv003',
              code: 'GV003',
              name: 'Lê Văn Cường',
              role: 'GIAO_VIEN',
              departmentId: 'd_hoa_sinh_qpan_tc_nn',
              status: 'Đang công tác',
              email: 'levancuong@sonluong.edu.vn',
              phone: '0934567890',
              subject: 'Tiếng Anh',
              joinDate: '2021-09-01',
              degree: 'Cử nhân'
            },
            {
              id: 't4',
              username: 'gv004',
              code: 'GV004',
              name: 'Phạm Thị Dung',
              role: 'GIAO_VIEN',
              departmentId: 'd_van_phong',
              status: 'Đang công tác',
              email: 'phamthidung@sonluong.edu.vn',
              phone: '0945678901',
              subject: 'Tin học',
              joinDate: '2018-09-01',
              degree: 'Cử nhân'
            },
            {
              id: 't5',
              username: 'gv005',
              code: 'GV005',
              name: 'Hoàng Văn Em',
              role: 'GIAO_VIEN',
              departmentId: 'd_hoa_sinh_qpan_tc_nn',
              status: 'Đang công tác',
              email: 'hoangvanem@sonluong.edu.vn',
              phone: '0956789012',
              subject: 'Sinh học',
              joinDate: '2022-09-01',
              degree: 'Cử nhân'
            }
          ];

          const batch = writeBatch(db);
          defaultTeachers.forEach(t => {
            batch.set(doc(db, 'teachers', t.id), sanitize(t));
          });
          await batch.commit();
          console.log('Seeded default teachers successfully with correct BGH.');
        } else {
          // Repair existing teachers and ensure correct BGH names
          let hasCorrupted = false;
          const batch = writeBatch(db);

          const bghList: Teacher[] = [
            {
              id: 't_ht',
              username: 'hieutruong',
              code: 'BGH001',
              name: 'Nguyễn Quang Sáng',
              role: 'BGH',
              position: 'Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'nguyenquangsang@sonluong.edu.vn',
              phone: '0988888888',
              subject: 'Quản lý giáo dục',
              joinDate: '2015-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't_pht1',
              username: 'phohieutruong1',
              code: 'BGH002',
              name: 'Phạm Kim Hùng',
              role: 'BGH',
              position: 'Phó Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'phamkimhung@sonluong.edu.vn',
              phone: '0977777777',
              subject: 'Quản lý chuyên môn',
              joinDate: '2017-09-01',
              degree: 'Thạc sĩ'
            },
            {
              id: 't_pht2',
              username: 'phohieutruong2',
              code: 'BGH003',
              name: 'Nguyễn Anh Hòa',
              role: 'BGH',
              position: 'Phó Hiệu trưởng',
              departmentId: 'd_bgh',
              departmentName: 'Ban Giám hiệu',
              status: 'Đang công tác',
              email: 'nguyenanhhoa@sonluong.edu.vn',
              phone: '0966666666',
              subject: 'Quản lý cơ sở vật chất',
              joinDate: '2018-09-01',
              degree: 'Thạc sĩ'
            }
          ];

          bghList.forEach(b => {
            batch.set(doc(db, 'teachers', b.id), sanitize(b), { merge: true });
          });
          hasCorrupted = true;
          const replacementNames = [
            'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Cường', 'Phạm Thị Dung', 'Hoàng Văn Em',
            'Vũ Thị Hồng', 'Phan Văn Giang', 'Bùi Thị Hà', 'Đỗ Minh Khang', 'Nguyễn Thị Lan',
            'Lê Hồng Phong', 'Trần Văn Hải', 'Phạm Minh Đức', 'Nguyễn Thị Mai', 'Hoàng Quốc Việt'
          ];

          snap.docs.forEach((d, idx) => {
            const t = d.data() as Teacher;
            let changed = false;
            let newCode = t.code;
            let newName = t.name;

            const isCodeCorrupt = !t.code || t.code.includes('${') || t.code.includes('random') || t.code.includes('undefined') || t.code.includes('GVS');
            const isNameCorrupt = !t.name || t.name.includes('${') || t.name.includes('random') || t.name.includes('undefined') || t.name.includes('GVS') || t.name.trim() === '';

            if (isCodeCorrupt) {
              newCode = `GV${100 + (idx % 900)}`;
              changed = true;
            }
            if (isNameCorrupt) {
              newName = replacementNames[idx % replacementNames.length];
              changed = true;
            }

            if (changed) {
              hasCorrupted = true;
              batch.update(doc(db, 'teachers', d.id), {
                code: newCode,
                name: newName,
                username: t.username || newCode.toLowerCase(),
                updatedAt: new Date().toISOString()
              });
            }
          });

          if (hasCorrupted) {
            await batch.commit();
            console.log('Repaired corrupted teacher records successfully.');
          }
        }
      } catch (e) {
        console.warn('Could not seed or repair teachers:', e);
      }
    };

    const initData = async () => {
      await seedDepartmentsIfEmpty();
      await seedAndRepairTeachers();
      setState(prev => ({ ...prev, loading: false }));
    };
    initData();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Tự động kiểm tra và chuẩn hóa liên kết groupId cho kpis và kpiRecords
  useEffect(() => {
    if (state.kpiGroups.length === 0 || state.kpis.length === 0) return;

    const autoSyncMissingGroupIds = async () => {
      try {
        const batch = writeBatch(db);
        let hasChanges = false;

        // 1. Đồng bộ groupId cho các tiêu chí KPI chưa có hoặc sai groupId
        state.kpis.forEach(kpi => {
          const targetGroupId = kpi.groupId;
          const groupExists = targetGroupId && state.kpiGroups.some(g => g.id === targetGroupId);

          if (!groupExists) {
            // Tìm theo ID hoặc tên nhóm/mã nhóm chính xác
            const matched = state.kpiGroups.find(
              g => g.id === targetGroupId ||
                   (kpi.group && g.name.trim().toLowerCase() === kpi.group.trim().toLowerCase()) ||
                   (kpi.group && g.code.trim().toLowerCase() === kpi.group.trim().toLowerCase())
            );
            if (matched) {
              const kpiRef = doc(db, 'kpis', kpi.id);
              batch.update(kpiRef, {
                groupId: matched.id,
                group_id: matched.id,
                updatedAt: new Date().toISOString()
              });
              hasChanges = true;
            }
          }

          // 2. Đồng bộ categoryId nếu tiêu chí chưa có categoryId nhưng có groupId và kpiCategories có dữ liệu
          if ((!kpi.categoryId || !kpi.category_id) && (kpi.groupId || kpi.group_id) && state.kpiCategories.length > 0) {
            const currentGroupId = kpi.groupId || kpi.group_id;
            const matchedCat = state.kpiCategories.find(c => c.groupId === currentGroupId || c.group_id === currentGroupId);
            if (matchedCat) {
              const kpiRef = doc(db, 'kpis', kpi.id);
              batch.update(kpiRef, {
                categoryId: matchedCat.id,
                category_id: matchedCat.id,
                categoryName: matchedCat.name,
                updatedAt: new Date().toISOString()
              });
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          await batch.commit();
        }
      } catch (err) {
        console.warn('Auto KPI group/category migration error:', err);
      }
    };

    autoSyncMissingGroupIds();
  }, [state.kpiGroups, state.kpiCategories, state.kpis]);

  const updateTaskStatus = async (taskId: string, status: Task['status'], progress?: number) => {
    try {
      const data: any = { status };
      if (progress !== undefined) data.progress = progress;
      await updateDoc(doc(db, 'tasks', taskId), data);
    } catch (e) { handleDbError(e); }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) { handleDbError(e); }
  };

  const deleteTeacher = async (id: string) => {
    try { await deleteDoc(doc(db, 'teachers', id)); } catch (e) { handleDbError(e); }
  };

  const deleteAllTeachers = async () => {
    try {
      const batch = writeBatch(db);
      state.teachers.forEach(t => {
        batch.delete(doc(db, 'teachers', t.id));
      });
      await batch.commit();
    } catch (e) {
      handleDbError(e);
      throw e;
    }
  };

  const importTeachers = async (newTeachers: Teacher[]) => {
    try {
      const batch = writeBatch(db);
      newTeachers.forEach(t => {
        if (!t.id) t.id = `t${Date.now()}_${Math.random()}`;
        const ref = doc(db, 'teachers', t.id);
        batch.set(ref, sanitize(t));
      });
      await batch.commit();
    } catch (e) { 
      handleDbError(e); 
      throw e; 
    }
  };

  const updateTeacher = async (id: string, data: Partial<Teacher>) => {
    try { await updateDoc(doc(db, 'teachers', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  const addTeacher = async (teacher: Teacher) => {
    try {
      if (!teacher.id) teacher.id = `t${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'teachers', teacher.id), sanitize(teacher));
    } catch (e) { handleDbError(e); }
  };

  const updateDepartment = async (id: string, data: Partial<Department>) => {
    try {
      await updateDoc(doc(db, 'departments', id), sanitize(data));
      if (data.headId) {
        await updateDoc(doc(db, 'teachers', data.headId), { departmentId: id });
      }
    } catch (e) { handleDbError(e); }
  };

  const deleteDepartment = async (id: string) => {
    try { await deleteDoc(doc(db, 'departments', id)); } catch (e) { handleDbError(e); }
  };

  const addDepartment = async (dept: Department) => {
    try {
      if (!dept.id) dept.id = `d${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'departments', dept.id), sanitize(dept));
    } catch (e) { handleDbError(e); }
  };

  
  const addDisciplineRecord = async (record: DisciplineRecord) => {
    try {
      if (!record.id) record.id = `dr${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'disciplineRecords', record.id), sanitize(record));
    } catch (e) { handleDbError(e); }
  };

  const updateDisciplineRecord = async (id: string, data: Partial<DisciplineRecord>) => {
    try { await updateDoc(doc(db, 'disciplineRecords', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  
  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>) => {
    try {
      const id = `ar${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newRecord = { ...sanitize(record), id, createdAt: new Date().toISOString() } as AttendanceRecord;
      setState(prev => ({
        ...prev,
        attendanceRecords: [...prev.attendanceRecords.filter(a => !(a.teacherId === newRecord.teacherId && a.date === newRecord.date)), newRecord]
      }));
      await setDoc(doc(db, 'attendance', id), newRecord);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>) => {
    try {
      const sanitizedUpdates = { ...sanitize(updates), updatedAt: new Date().toISOString() };
      setState(prev => ({
        ...prev,
        attendanceRecords: prev.attendanceRecords.map(a => a.id === id ? { ...a, ...sanitizedUpdates } : a)
      }));
      await setDoc(doc(db, 'attendance', id), sanitizedUpdates, { merge: true });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        attendanceRecords: prev.attendanceRecords.filter(a => a.id !== id)
      }));
      await deleteDoc(doc(db, 'attendance', id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const addLeaveRecord = async (record: Omit<LeaveRecord, 'id'>) => {
    try {
      const id = `lr${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRecord = { ...sanitize(record), id } as LeaveRecord;
      setState(prev => ({
        ...prev,
        leaveRecords: [newRecord, ...prev.leaveRecords]
      }));
      await setDoc(doc(db, 'leaveRecords', id), newRecord);
    } catch (e) { handleDbError(e); }
  };

  const updateLeaveRecord = async (id: string, updates: Partial<LeaveRecord>) => {
    try {
      const sanitizedUpdates = sanitize(updates);
      setState(prev => ({
        ...prev,
        leaveRecords: prev.leaveRecords.map(r => r.id === id ? { ...r, ...sanitizedUpdates } : r)
      }));
      await setDoc(doc(db, 'leaveRecords', id), sanitizedUpdates, { merge: true });
    } catch (e) { handleDbError(e); }
  };

  const deleteLeaveRecord = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        leaveRecords: prev.leaveRecords.filter(r => r.id !== id)
      }));
      await deleteDoc(doc(db, 'leaveRecords', id));
    } catch (e) { handleDbError(e); }
  };


  const deleteDisciplineRecord = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        disciplineRecords: prev.disciplineRecords.filter(r => r.id !== id)
      }));
      await deleteDoc(doc(db, 'disciplineRecords', id));
    } catch (e) {
      handleDbError(e);
    }
  };

  const deleteDisciplineRecords = async (ids: string[]) => {
    try {
      if (!ids || ids.length === 0) return;
      const idSet = new Set(ids);
      setState(prev => ({
        ...prev,
        disciplineRecords: prev.disciplineRecords.filter(r => !idSet.has(r.id))
      }));

      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'disciplineRecords', id));
        });
        await batch.commit();
      }
    } catch (e) {
      handleDbError(e);
    }
  };

  const addDisciplineCriterion = async (criterion: DisciplineCriterion) => {
    try {
      if (!criterion.id) criterion.id = `crit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'disciplineCriteria', criterion.id), sanitize(criterion));
    } catch (e) { handleDbError(e); }
  };

  const updateDisciplineCriterion = async (id: string, data: Partial<DisciplineCriterion>) => {
    try {
      await updateDoc(doc(db, 'disciplineCriteria', id), sanitize(data));
    } catch (e) { handleDbError(e); }
  };

  const deleteDisciplineCriterion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'disciplineCriteria', id));
    } catch (e) { handleDbError(e); }
  };

  const addGeneralKpi = async (kpi: GeneralKpi) => {
    try {
      if (!kpi.id) kpi.id = `kpic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      kpi.createdAt = new Date().toISOString();
      kpi.updatedAt = new Date().toISOString();
      setState(prev => ({
        ...prev,
        generalKpis: [...prev.generalKpis, kpi]
      }));
      await setDoc(doc(db, 'generalKpis', kpi.id), sanitize(kpi));
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateGeneralKpi = async (id: string, data: Partial<GeneralKpi>) => {
    try {
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      setState(prev => ({
        ...prev,
        generalKpis: prev.generalKpis.map(g => g.id === id ? { ...g, ...updateData } : g)
      }));
      await updateDoc(doc(db, 'generalKpis', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteGeneralKpi = async (id: string) => {
    try {
      const dependentGroups = state.kpiGroups.filter(g => g.generalKpiId === id);
      const dependentKpis = state.kpis.filter(k => k.generalKpiId === id);
      if (dependentGroups.length > 0 || dependentKpis.length > 0) {
        throw new Error(`Không thể xóa KPI chung này vì đang có ${dependentGroups.length} nhóm KPI và ${dependentKpis.length} tiêu chí trực thuộc. Vui lòng di chuyển hoặc xóa dữ liệu phụ thuộc trước.`);
      }

      setState(prev => ({
        ...prev,
        generalKpis: prev.generalKpis.filter(g => g.id !== id)
      }));
      await deleteDoc(doc(db, 'generalKpis', id));
    } catch (e) { handleDbError(e); throw e; }
  };

  const addKpiGroup = async (group: KpiGroup) => {
    try {
      if (!group.id) group.id = `kpig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      group.createdAt = new Date().toISOString();
      group.updatedAt = new Date().toISOString();
      setState(prev => ({
        ...prev,
        kpiGroups: [...prev.kpiGroups, group]
      }));
      await setDoc(doc(db, 'kpiGroups', group.id), sanitize(group));
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateKpiGroup = async (id: string, data: Partial<KpiGroup>) => {
    try {
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      setState(prev => ({
        ...prev,
        kpiGroups: prev.kpiGroups.map(g => g.id === id ? { ...g, ...updateData } : g)
      }));
      await updateDoc(doc(db, 'kpiGroups', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteKpiGroup = async (
    id: string, 
    options?: { cascade?: boolean; targetGroupId?: string; deleteRecords?: boolean }
  ) => {
    try {
      const childCats = state.kpiCategories.filter(c => c.groupId === id || c.group_id === id);
      const childKpis = state.kpis.filter(k => k.groupId === id || k.group_id === id || childCats.some(c => c.id === (k.categoryId || k.category_id)));
      const hasChildren = childCats.length > 0 || childKpis.length > 0;

      const batch = writeBatch(db);

      if (options?.targetGroupId) {
        // Safe Migrate: chuyển category và kpi sang targetGroupId trước khi xóa nhóm cũ
        const targetGId = options.targetGroupId;
        childCats.forEach(c => {
          batch.update(doc(db, 'kpiCategories', c.id), { groupId: targetGId, group_id: targetGId, updatedAt: new Date().toISOString() });
        });
        childKpis.forEach(k => {
          batch.update(doc(db, 'kpis', k.id), { groupId: targetGId, group_id: targetGId, updatedAt: new Date().toISOString() });
        });
        batch.delete(doc(db, 'kpiGroups', id));

        setState(prev => ({
          ...prev,
          kpiGroups: prev.kpiGroups.filter(g => g.id !== id),
          kpiCategories: prev.kpiCategories.map(c => (c.groupId === id || c.group_id === id) ? { ...c, groupId: targetGId, group_id: targetGId } : c),
          kpis: prev.kpis.map(k => (k.groupId === id || k.group_id === id) ? { ...k, groupId: targetGId, group_id: targetGId } : k)
        }));
      } else if (options?.cascade || !hasChildren) {
        // Xóa cascade hoặc nhóm không có dữ liệu con
        batch.delete(doc(db, 'kpiGroups', id));
        childCats.forEach(c => {
          batch.delete(doc(db, 'kpiCategories', c.id));
        });
        childKpis.forEach(k => {
          batch.delete(doc(db, 'kpis', k.id));
        });

        const childKpiIds = new Set(childKpis.map(k => k.id));
        const recordsToDelete = state.kpiRecords.filter(r => childKpiIds.has(r.kpiId));
        if (options?.deleteRecords && recordsToDelete.length > 0) {
          recordsToDelete.forEach(r => {
            batch.delete(doc(db, 'kpiRecords', r.id));
          });
        }

        setState(prev => ({
          ...prev,
          kpiGroups: prev.kpiGroups.filter(g => g.id !== id),
          kpiCategories: prev.kpiCategories.filter(c => c.groupId !== id && c.group_id !== id),
          kpis: prev.kpis.filter(k => k.groupId !== id && k.group_id !== id && !childKpiIds.has(k.id)),
          kpiRecords: (options?.deleteRecords && recordsToDelete.length > 0)
            ? prev.kpiRecords.filter(r => !childKpiIds.has(r.kpiId))
            : prev.kpiRecords
        }));
      } else {
        throw new Error(`Nhóm KPI này đang chứa ${childCats.length} nhóm tiêu chí và ${childKpis.length} tiêu chí thành phần. Vui lòng chọn xóa kèm dữ liệu con hoặc chuyển sang nhóm khác.`);
      }

      await batch.commit();
    } catch (e) { handleDbError(e); throw e; }
  };

  const addKpiCategory = async (category: KpiCategory) => {
    try {
      if (!category.groupId && !category.group_id) {
        throw new Error('Bắt buộc phải chọn Nhóm KPI cha!');
      }
      const parentGroupId = category.groupId || category.group_id!;
      if (!category.id) category.id = `kpicat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      category.groupId = parentGroupId;
      category.group_id = parentGroupId;
      category.createdAt = new Date().toISOString();
      category.updatedAt = new Date().toISOString();
      setState(prev => ({
        ...prev,
        kpiCategories: [...prev.kpiCategories, category]
      }));
      await setDoc(doc(db, 'kpiCategories', category.id), sanitize(category));
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateKpiCategory = async (id: string, data: Partial<KpiCategory>) => {
    try {
      const updateData: any = { ...data, updatedAt: new Date().toISOString() };
      if (updateData.groupId) updateData.group_id = updateData.groupId;
      setState(prev => ({
        ...prev,
        kpiCategories: prev.kpiCategories.map(c => c.id === id ? { ...c, ...updateData } : c)
      }));
      await updateDoc(doc(db, 'kpiCategories', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteKpiCategory = async (
    id: string, 
    options?: { cascade?: boolean; targetCategoryId?: string; deleteRecords?: boolean }
  ) => {
    try {
      const childKpis = state.kpis.filter(k => k.categoryId === id || k.category_id === id);
      const hasChildren = childKpis.length > 0;
      const batch = writeBatch(db);

      if (options?.targetCategoryId) {
        // Safe Migrate: chuyển các tiêu chí con sang targetCategoryId trước khi xóa nhóm tiêu chí này
        const targetCatId = options.targetCategoryId;
        const targetCat = state.kpiCategories.find(c => c.id === targetCatId);
        const targetGroupId = targetCat?.groupId || targetCat?.group_id;

        childKpis.forEach(k => {
          const updates: any = { 
            categoryId: targetCatId, 
            category_id: targetCatId, 
            updatedAt: new Date().toISOString() 
          };
          if (targetGroupId) {
            updates.groupId = targetGroupId;
            updates.group_id = targetGroupId;
          }
          batch.update(doc(db, 'kpis', k.id), updates);
        });
        batch.delete(doc(db, 'kpiCategories', id));

        setState(prev => ({
          ...prev,
          kpiCategories: prev.kpiCategories.filter(c => c.id !== id),
          kpis: prev.kpis.map(k => (k.categoryId === id || k.category_id === id) ? {
            ...k,
            categoryId: targetCatId,
            category_id: targetCatId,
            ...(targetGroupId ? { groupId: targetGroupId, group_id: targetGroupId } : {})
          } : k)
        }));
      } else if (options?.cascade || !hasChildren) {
        // Cascade delete: xóa nhóm tiêu chí và toàn bộ tiêu chí con bên trong
        batch.delete(doc(db, 'kpiCategories', id));
        childKpis.forEach(k => {
          batch.delete(doc(db, 'kpis', k.id));
        });

        const childKpiIds = new Set(childKpis.map(k => k.id));
        const recordsToDelete = state.kpiRecords.filter(r => childKpiIds.has(r.kpiId));
        if (options?.deleteRecords && recordsToDelete.length > 0) {
          recordsToDelete.forEach(r => {
            batch.delete(doc(db, 'kpiRecords', r.id));
          });
        }

        setState(prev => ({
          ...prev,
          kpiCategories: prev.kpiCategories.filter(c => c.id !== id),
          kpis: prev.kpis.filter(k => k.categoryId !== id && k.category_id !== id),
          kpiRecords: (options?.deleteRecords && recordsToDelete.length > 0)
            ? prev.kpiRecords.filter(r => !childKpiIds.has(r.kpiId))
            : prev.kpiRecords
        }));
      } else {
        throw new Error(`Nhóm tiêu chí này đang chứa ${childKpis.length} tiêu chí con. Vui lòng chọn xóa kèm tiêu chí con hoặc chuyển sang nhóm tiêu chí khác.`);
      }

      await batch.commit();
    } catch (e) { handleDbError(e); throw e; }
  };

  const addKpi = async (kpi: KpiItem) => {
    try {
      if (!kpi.groupId && !kpi.group_id) {
        throw new Error('Bắt buộc phải chọn Nhóm KPI!');
      }
      if (!kpi.categoryId && !kpi.category_id) {
        throw new Error('Bắt buộc phải chọn Nhóm tiêu chí KPI!');
      }
      if (!kpi.id) kpi.id = `kpi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      kpi.groupId = kpi.groupId || kpi.group_id!;
      kpi.group_id = kpi.groupId;
      kpi.categoryId = kpi.categoryId || kpi.category_id!;
      kpi.category_id = kpi.categoryId;
      kpi.createdAt = new Date().toISOString();
      kpi.updatedAt = new Date().toISOString();
      setState(prev => ({
        ...prev,
        kpis: [...prev.kpis, kpi]
      }));
      await setDoc(doc(db, 'kpis', kpi.id), sanitize(kpi));
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateKpi = async (id: string, data: Partial<KpiItem>) => {
    try {
      const updateData: any = { ...data, updatedAt: new Date().toISOString() };
      if (updateData.groupId) updateData.group_id = updateData.groupId;
      if (updateData.categoryId) updateData.category_id = updateData.categoryId;
      setState(prev => ({
        ...prev,
        kpis: prev.kpis.map(k => k.id === id ? { ...k, ...updateData } : k)
      }));
      await updateDoc(doc(db, 'kpis', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteKpi = async (id: string, deleteAssociatedRecords: boolean = false) => {
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        kpis: prev.kpis.filter(k => k.id !== id),
        kpiRecords: deleteAssociatedRecords 
          ? prev.kpiRecords.filter(r => r.kpiId !== id)
          : prev.kpiRecords
      }));

      const batch = writeBatch(db);
      batch.delete(doc(db, 'kpis', id));

      if (deleteAssociatedRecords) {
        const recordsToDelete = state.kpiRecords.filter(r => r.kpiId === id);
        recordsToDelete.forEach(r => {
          batch.delete(doc(db, 'kpiRecords', r.id));
        });
      }

      await batch.commit();
    } catch (e) { 
      handleDbError(e); 
      throw e; 
    }
  };

  const addKpiRecord = async (record: KpiRecord) => {
    try {
      if (!record.id) record.id = `kpir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      record.createdAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'kpiRecords', record.id), sanitize(record));
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateKpiRecord = async (id: string, data: Partial<KpiRecord>) => {
    try {
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'kpiRecords', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteKpiRecord = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        kpiRecords: prev.kpiRecords.filter(r => r.id !== id)
      }));
      await deleteDoc(doc(db, 'kpiRecords', id));
    } catch (e) { handleDbError(e); throw e; }
  };

  const addKpiEvaluationForm = async (form: KpiEvaluationForm) => {
    try {
      const teacherId = form.teacherId || form.employee_id;
      const month = form.month;
      const academicYear = form.academicYear || form.academic_year;

      // Tìm xem đã tồn tại phiếu cho CBGVNV này trong cùng tháng + năm học chưa
      const existingForm = state.kpiEvaluationForms.find(f => 
        (f.teacherId === teacherId || f.employee_id === teacherId) &&
        f.month === month &&
        (f.academicYear === academicYear || f.academic_year === academicYear)
      );

      const safeYear = (academicYear || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_');
      const safeMonth = String(month || '09').padStart(2, '0');
      const safeEmp = teacherId || 'unknown';
      const targetId = existingForm ? existingForm.id : (form.id || `kpif_${safeYear}_m${safeMonth}_${safeEmp}`);

      form.id = targetId;
      form.teacherId = teacherId || '';
      form.employee_id = teacherId || '';
      form.month = month;
      form.academicYear = academicYear || '2026-2027';
      form.academic_year = academicYear || '2026-2027';
      form.createdAt = existingForm?.createdAt || form.createdAt || new Date().toISOString();
      form.updatedAt = new Date().toISOString();

      setState(prev => ({
        ...prev,
        kpiEvaluationForms: [form, ...prev.kpiEvaluationForms.filter(f => f.id !== targetId)]
      }));
      await setDoc(doc(db, 'kpi_evaluation_forms', targetId), sanitize(form), { merge: true });
    } catch (e) { handleDbError(e); throw e; }
  };

  const updateKpiEvaluationForm = async (id: string, data: Partial<KpiEvaluationForm>) => {
    try {
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      setState(prev => ({
        ...prev,
        kpiEvaluationForms: prev.kpiEvaluationForms.map(f => f.id === id ? { ...f, ...updateData } : f)
      }));
      await updateDoc(doc(db, 'kpi_evaluation_forms', id), sanitize(updateData));
    } catch (e) { handleDbError(e); throw e; }
  };

  const deleteKpiEvaluationForm = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        kpiEvaluationForms: prev.kpiEvaluationForms.filter(f => f.id !== id)
      }));
      await deleteDoc(doc(db, 'kpi_evaluation_forms', id));
    } catch (e) { handleDbError(e); throw e; }
  };

  const saveKpiMonthlySetting = async (setting: KpiMonthlySetting) => {
    try {
      const settingId = setting.id || `setting_${setting.academicYear}_${setting.month || 'all'}`;
      const dataToSave = {
        ...setting,
        id: settingId,
        updatedAt: new Date().toISOString()
      };
      setState(prev => {
        const existing = prev.kpiMonthlySettings.filter(s => s.id !== settingId);
        return {
          ...prev,
          kpiMonthlySettings: [...existing, dataToSave]
        };
      });
      await setDoc(doc(db, 'kpiMonthlySettings', settingId), sanitize(dataToSave));
    } catch (e) {
      handleDbError(e);
      throw e;
    }
  };

  const addTask = async (task: Task) => {
    try {
      if (!task.id) task.id = `task${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'tasks', task.id), sanitize(task));
    } catch (e) { handleDbError(e); }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    try { await updateDoc(doc(db, 'tasks', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  const deleteTask = async (id: string) => {
    try { await deleteDoc(doc(db, 'tasks', id)); } catch (e) { handleDbError(e); }
  };

  const addWorkAssignment = async (assignment: WorkAssignment) => {
    try {
      if (!assignment.id) assignment.id = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setState(prev => ({
        ...prev,
        workAssignments: [assignment, ...prev.workAssignments]
      }));
      await setDoc(doc(db, 'workAssignments', assignment.id), sanitize(assignment));
    } catch (e) { handleDbError(e); }
  };

  const updateWorkAssignment = async (id: string, data: Partial<WorkAssignment>) => {
    try {
      setState(prev => ({
        ...prev,
        workAssignments: prev.workAssignments.map(w => w.id === id ? { ...w, ...data, updatedAt: new Date().toISOString() } : w)
      }));
      await updateDoc(doc(db, 'workAssignments', id), sanitize(data));
    } catch (e) { handleDbError(e); }
  };

  const deleteWorkAssignment = async (id: string) => {
    try { await deleteDoc(doc(db, 'workAssignments', id)); } catch (e) { handleDbError(e); }
  };

  const importWorkAssignments = async (assignments: WorkAssignment[]) => {
    try {
      const batch = writeBatch(db);
      assignments.forEach(wa => {
        if (!wa.id) wa.id = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        batch.set(doc(db, 'workAssignments', wa.id), sanitize(wa));
      });
      await batch.commit();
      setState(prev => ({
        ...prev,
        workAssignments: [...assignments, ...prev.workAssignments.filter(w => !assignments.some(a => a.id === w.id))]
      }));
    } catch (e) {
      handleDbError(e);
      throw e;
    }
  };

  const seedOrResetSchoolTasks = async () => {
    try {
      const batch = writeBatch(db);
      OFFICIAL_SCHOOL_TASKS_2026_2027.forEach(wa => {
        batch.set(doc(db, 'workAssignments', wa.id), sanitize(wa));
      });
      await batch.commit();
      setState(prev => ({
        ...prev,
        workAssignments: [...OFFICIAL_SCHOOL_TASKS_2026_2027, ...prev.workAssignments.filter(w => !OFFICIAL_SCHOOL_TASKS_2026_2027.some(o => o.id === w.id))]
      }));
    } catch (e) {
      handleDbError(e);
      throw e;
    }
  };

  const addCalendarEvent = async (event: CalendarEvent) => {
    try {
      if (!event.id) event.id = `ev${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'calendarEvents', event.id), sanitize(event));
    } catch (e) { handleDbError(e); }
  };

  const updateCalendarEvent = async (id: string, data: Partial<CalendarEvent>) => {
    try { await updateDoc(doc(db, 'calendarEvents', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  const deleteCalendarEvent = async (id: string) => {
    try { await deleteDoc(doc(db, 'calendarEvents', id)); } catch (e) { handleDbError(e); }
  };

  const addNotification = async (notification: Notification) => {
    try {
      if (!notification.id) notification.id = `notif${Date.now()}_${Math.random()}`;
      await setDoc(doc(db, 'notifications', notification.id), sanitize(notification));
    } catch (e) { handleDbError(e); }
  };

  const updateNotification = async (id: string, data: Partial<Notification>) => {
    try { await updateDoc(doc(db, 'notifications', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  const deleteNotification = async (id: string) => {
    try { await deleteDoc(doc(db, 'notifications', id)); } catch (e) { handleDbError(e); }
  };

  const addReport = async (report: Report) => {
    try {
      if (!report.id) report.id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'reports', report.id), sanitize(report));
    } catch (e) { handleDbError(e); }
  };

  const updateReport = async (id: string, data: Partial<Report>) => {
    try { await updateDoc(doc(db, 'reports', id), sanitize(data)); } catch (e) { handleDbError(e); }
  };

  const deleteReport = async (id: string) => {
    try { await deleteDoc(doc(db, 'reports', id)); } catch (e) { handleDbError(e); }
  };

  const checkAndRepairKpiData = async () => {
    try {
      const batch = writeBatch(db);
      const groups = state.kpiGroups;
      const kpisList = state.kpis;
      
      let unassignedGroup = groups.find(g => g.id === 'kpig_unassigned');
      
      if (!unassignedGroup) {
        const defaultGenId = state.generalKpis[0]?.id || 'kpic_thpt';
        const newGroup: KpiGroup = {
          id: 'kpig_unassigned',
          generalKpiId: defaultGenId,
          code: 'DL_CHO_XL',
          name: 'Dữ liệu cần xử lý',
          description: 'Các tiêu chí chuyển tiếp hoặc mồ côi cần phân loại lại để đảm bảo liên kết ID chuẩn',
          groupScore: 0,
          order: 99,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        batch.set(doc(db, 'kpiGroups', newGroup.id), sanitize(newGroup));
        unassignedGroup = newGroup;
      } else if (unassignedGroup.code !== 'DL_CHO_XL' || unassignedGroup.name !== 'Dữ liệu cần xử lý') {
        batch.update(doc(db, 'kpiGroups', 'kpig_unassigned'), {
          code: 'DL_CHO_XL',
          name: 'Dữ liệu cần xử lý',
          updatedAt: new Date().toISOString()
        });
      }

      let unassignedCategory = state.kpiCategories.find(c => c.id === 'kpicat_unassigned');
      if (!unassignedCategory) {
        const newCat: KpiCategory = {
          id: 'kpicat_unassigned',
          groupId: 'kpig_unassigned',
          group_id: 'kpig_unassigned',
          code: 'DL_CHO_XL.01',
          name: 'Tiêu chí cần xử lý',
          description: 'Nhóm tiêu chí mặc định để xử lý liên kết',
          order: 1,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        batch.set(doc(db, 'kpiCategories', newCat.id), sanitize(newCat));
      }

      let orphanedCount = 0;
      let repairedCount = 0;

      kpisList.forEach(kpi => {
        const targetGroupId = kpi.groupId || kpi.group_id;
        const groupExists = targetGroupId && groups.some(g => g.id === targetGroupId);

        if (!groupExists) {
          orphanedCount++;
          const kpiRef = doc(db, 'kpis', kpi.id);
          batch.update(kpiRef, {
            groupId: 'kpig_unassigned',
            group_id: 'kpig_unassigned',
            group: 'Dữ liệu cần xử lý',
            categoryId: 'kpicat_unassigned',
            category_id: 'kpicat_unassigned',
            categoryName: 'Tiêu chí cần xử lý',
            updatedAt: new Date().toISOString()
          });
          repairedCount++;
        }
      });

      await batch.commit();

      return {
        checkedGroups: groups.length,
        checkedKpis: kpisList.length,
        orphanedCount,
        repairedCount
      };
    } catch (err) {
      console.error('Error during KPI data check and repair:', err);
      throw err;
    }
  };

  const updateSchoolStats = async (data: Partial<SchoolStats>) => {
    try {
      const statsDocRef = doc(db, 'systemSettings', 'schoolStats');
      await setDoc(statsDocRef, sanitize(data), { merge: true });
      setState(prev => ({
        ...prev,
        schoolStats: { ...prev.schoolStats, ...data }
      }));
    } catch (e) {
      handleDbError(e);
    }
  };

  return (
    <AppContext.Provider value={{ ...state, updateTaskStatus, markNotificationRead, deleteTeacher, deleteAllTeachers, importTeachers, updateTeacher, addTeacher, updateDepartment, deleteDepartment, addDepartment, addDisciplineRecord, updateDisciplineRecord, deleteDisciplineRecord, deleteDisciplineRecords,
        addDisciplineCriterion, updateDisciplineCriterion, deleteDisciplineCriterion,
        addGeneralKpi, updateGeneralKpi, deleteGeneralKpi,
        addKpiGroup, updateKpiGroup, deleteKpiGroup,
        addKpiCategory, updateKpiCategory, deleteKpiCategory,
        addKpi, updateKpi, deleteKpi, addKpiRecord, updateKpiRecord, deleteKpiRecord,
        addKpiEvaluationForm, updateKpiEvaluationForm, deleteKpiEvaluationForm,
        saveKpiMonthlySetting,
        addAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord, addLeaveRecord,
        updateLeaveRecord,
        deleteLeaveRecord, addTask, updateTask, deleteTask, addWorkAssignment, updateWorkAssignment, deleteWorkAssignment,
        importWorkAssignments, seedOrResetSchoolTasks,
         addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, addNotification, updateNotification, deleteNotification,
        addReport, updateReport, deleteReport, checkAndRepairKpiData, updateSchoolStats,
        setKpiStaffForms, setKpiStaffPeriods, setKpiStaffCriteria }}>
      {state.error && (
        <div className="fixed top-0 left-0 right-0 bg-rose-500 text-white text-center py-2 z-50 shadow-md">
          {state.error}
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
