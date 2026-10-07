import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { YouthDutySchedule, YouthDutyTaskConfig, YouthDutyMetadata } from '../types/youthDuty';
import { DEFAULT_DUTY_TASKS, DEFAULT_DUTY_METADATA, DEFAULT_SAMPLE_SCHEDULES } from '../lib/youthDutyData';

const COLLECTIONS = {
  SCHEDULES: 'do_duty_schedules',
  TASKS: 'duty_task_configs',
  METADATA: 'duty_metadata'
};

const CACHE_KEYS = {
  SCHEDULES: 'cached_do_duty_schedules',
  TASKS: 'cached_duty_task_configs',
  METADATA: 'cached_duty_metadata'
};

const sanitize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    return value === undefined ? null : value;
  }));
};

let isSeeded = false;

export const youthDutyService = {
  // 1. SEED DEFAULT DATA IF EMPTY
  async seedIfEmpty() {
    if (isSeeded) return;
    isSeeded = true;

    try {
      // 1.1 Tasks
      const taskSnap = await getDocs(collection(db, COLLECTIONS.TASKS));
      if (taskSnap.empty) {
        for (const t of DEFAULT_DUTY_TASKS) {
          await setDoc(doc(db, COLLECTIONS.TASKS, t.id), sanitize(t));
        }
        localStorage.setItem(CACHE_KEYS.TASKS, JSON.stringify(DEFAULT_DUTY_TASKS));
      }

      // 1.2 Metadata
      const metaSnap = await getDoc(doc(db, COLLECTIONS.METADATA, 'default_meta'));
      if (!metaSnap.exists()) {
        await setDoc(doc(db, COLLECTIONS.METADATA, 'default_meta'), sanitize(DEFAULT_DUTY_METADATA));
        localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(DEFAULT_DUTY_METADATA));
      }

      // 1.3 Schedules
      const schedSnap = await getDocs(collection(db, COLLECTIONS.SCHEDULES));
      if (schedSnap.empty) {
        for (const s of DEFAULT_SAMPLE_SCHEDULES) {
          await setDoc(doc(db, COLLECTIONS.SCHEDULES, s.id), sanitize(s));
        }
        localStorage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SAMPLE_SCHEDULES));
      }
    } catch (e) {
      console.warn('Firestore seed youthDuty error, using local fallback:', e);
      if (!localStorage.getItem(CACHE_KEYS.TASKS)) {
        localStorage.setItem(CACHE_KEYS.TASKS, JSON.stringify(DEFAULT_DUTY_TASKS));
      }
      if (!localStorage.getItem(CACHE_KEYS.METADATA)) {
        localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(DEFAULT_DUTY_METADATA));
      }
      if (!localStorage.getItem(CACHE_KEYS.SCHEDULES)) {
        localStorage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SAMPLE_SCHEDULES));
      }
    }
  },

  // 2. SCHEDULES CRUD
  async getSchedules(academicYear?: string, fromWeek?: number, toWeek?: number): Promise<YouthDutySchedule[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.SCHEDULES));
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as YouthDutySchedule));
        localStorage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(list));
        return this.filterAndSortSchedules(list, academicYear, fromWeek, toWeek);
      }
    } catch (e) {
      console.warn('Firestore getSchedules error, using cache:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.SCHEDULES);
    if (cached) {
      try {
        const list = JSON.parse(cached) as YouthDutySchedule[];
        return this.filterAndSortSchedules(list, academicYear, fromWeek, toWeek);
      } catch (err) {
        console.error(err);
      }
    }

    return this.filterAndSortSchedules(DEFAULT_SAMPLE_SCHEDULES, academicYear, fromWeek, toWeek);
  },

  filterAndSortSchedules(
    list: YouthDutySchedule[],
    academicYear?: string,
    fromWeek?: number,
    toWeek?: number
  ): YouthDutySchedule[] {
    let filtered = [...list];

    if (academicYear && academicYear !== 'All') {
      const normAY = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();
      filtered = filtered.filter(s => {
        const sAY = (s.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        return !sAY || sAY === normAY;
      });
    }

    if (fromWeek !== undefined && fromWeek > 0) {
      if (toWeek !== undefined && toWeek >= fromWeek) {
        filtered = filtered.filter(s => {
          const w = s.weekNumber;
          const toW = s.toWeekNumber || w;
          // Check if schedule overlaps with requested range
          return (w >= fromWeek && w <= toWeek) || (toW >= fromWeek && w <= toWeek);
        });
      } else {
        filtered = filtered.filter(s => {
          const w = s.weekNumber;
          const toW = s.toWeekNumber || w;
          return fromWeek >= w && fromWeek <= toW;
        });
      }
    }

    return filtered.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
      return (a.dayOfWeekNumber || 0) - (b.dayOfWeekNumber || 0);
    });
  },

  async saveSchedule(schedule: YouthDutySchedule, performedByRole: string = 'BI_THU_DOAN'): Promise<YouthDutySchedule> {
    const isNew = !schedule.id || schedule.id.trim() === '';
    const id = isNew ? `duty_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : schedule.id;

    const record: YouthDutySchedule = {
      ...schedule,
      id,
      updatedAt: new Date().toISOString()
    };
    if (isNew) {
      record.createdAt = new Date().toISOString();
      record.createdBy = auth.currentUser?.uid || 'bi_thu_doan';
    }

    // LocalStorage
    const current = await this.getSchedules();
    const idx = current.findIndex(s => s.id === id);
    if (idx >= 0) {
      current[idx] = record;
    } else {
      current.push(record);
    }
    localStorage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(current));

    // Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.SCHEDULES, id), sanitize(record), { merge: true });
    } catch (e) {
      console.warn('Firestore saveSchedule error:', e);
    }

    return record;
  },

  async deleteSchedule(id: string, performedByRole: string = 'BI_THU_DOAN'): Promise<void> {
    const current = await this.getSchedules();
    const remaining = current.filter(s => s.id !== id);
    localStorage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(remaining));

    try {
      await deleteDoc(doc(db, COLLECTIONS.SCHEDULES, id));
    } catch (e) {
      console.warn('Firestore deleteSchedule error:', e);
    }
  },

  async copyWeekSchedules(
    fromWeek: number,
    toWeek: number,
    academicYear: string,
    overwrite: boolean = false
  ): Promise<number> {
    const all = await this.getSchedules();
    const normAY = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();

    const sourceSchedules = all.filter(s => {
      const sAY = (s.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
      return (!sAY || sAY === normAY) && s.weekNumber === fromWeek;
    });

    if (sourceSchedules.length === 0) {
      throw new Error(`Không tìm thấy lịch trực nào của Tuần ${fromWeek} để sao chép.`);
    }

    // Existing target week schedules
    const existingTarget = all.filter(s => {
      const sAY = (s.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
      return (!sAY || sAY === normAY) && s.weekNumber === toWeek;
    });

    if (existingTarget.length > 0 && !overwrite) {
      throw new Error(`Tuần ${toWeek} đã có ${existingTarget.length} lịch trực. Vui lòng chọn ghi đè hoặc chỉnh sửa lịch hiện tại.`);
    }

    // Delete existing target if overwrite
    if (overwrite && existingTarget.length > 0) {
      for (const old of existingTarget) {
        await this.deleteSchedule(old.id);
      }
    }

    let copiedCount = 0;
    for (const src of sourceSchedules) {
      const newSchedule: YouthDutySchedule = {
        ...src,
        id: `duty_${Date.now()}_w${toWeek}_${src.dayOfWeekNumber}_${Math.random().toString(36).substring(2, 6)}`,
        weekNumber: toWeek,
        toWeekNumber: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.saveSchedule(newSchedule);
      copiedCount++;
    }

    return copiedCount;
  },

  // 3. TASK CONFIGS
  async getTaskConfigs(): Promise<YouthDutyTaskConfig[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.TASKS));
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as YouthDutyTaskConfig));
        localStorage.setItem(CACHE_KEYS.TASKS, JSON.stringify(list));
        return list.sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.warn('Firestore getTaskConfigs error:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.TASKS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }

    return DEFAULT_DUTY_TASKS;
  },

  async saveTaskConfig(task: YouthDutyTaskConfig): Promise<void> {
    const isNew = !task.id || task.id.trim() === '';
    const id = isNew ? `task_${Date.now()}` : task.id;
    const record = { ...task, id };

    const current = await this.getTaskConfigs();
    const idx = current.findIndex(t => t.id === id);
    if (idx >= 0) {
      current[idx] = record;
    } else {
      current.push(record);
    }
    localStorage.setItem(CACHE_KEYS.TASKS, JSON.stringify(current));

    try {
      await setDoc(doc(db, COLLECTIONS.TASKS, id), sanitize(record), { merge: true });
    } catch (e) {
      console.warn('Firestore saveTaskConfig error:', e);
    }
  },

  async deleteTaskConfig(id: string): Promise<void> {
    const current = await this.getTaskConfigs();
    const remaining = current.filter(t => t.id !== id);
    localStorage.setItem(CACHE_KEYS.TASKS, JSON.stringify(remaining));

    try {
      await deleteDoc(doc(db, COLLECTIONS.TASKS, id));
    } catch (e) {
      console.warn('Firestore deleteTaskConfig error:', e);
    }
  },

  // 4. METADATA
  async getMetadata(academicYear: string = '2026–2027'): Promise<YouthDutyMetadata> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.METADATA, 'default_meta'));
      if (snap.exists()) {
        const data = snap.data() as YouthDutyMetadata;
        localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Firestore getMetadata error:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.METADATA);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }

    return { ...DEFAULT_DUTY_METADATA, academicYear };
  },

  async saveMetadata(metadata: YouthDutyMetadata): Promise<void> {
    localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
    try {
      await setDoc(doc(db, COLLECTIONS.METADATA, 'default_meta'), sanitize(metadata), { merge: true });
    } catch (e) {
      console.warn('Firestore saveMetadata error:', e);
    }
  }
};
