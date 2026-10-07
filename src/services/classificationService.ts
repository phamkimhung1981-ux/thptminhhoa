import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { YouthClassificationConfig, YouthAuditLog } from '../types/youthDiscipline';

const COLLECTIONS = {
  CLASSIFICATIONS: 'classification_configs',
  AUDIT_LOGS: 'youth_discipline_audit_logs'
};

const CACHE_KEYS = {
  CLASSIFICATIONS: 'cached_classification_configs'
};

export const DEFAULT_CLASSIFICATIONS: Omit<YouthClassificationConfig, 'id'>[] = [
  {
    academicYear: '2026–2027',
    name: 'Tốt',
    minScore: 90,
    maxScore: 100,
    color: '#10B981', // Emerald
    sortOrder: 1,
    active: true
  },
  {
    academicYear: '2026–2027',
    name: 'Khá',
    minScore: 80,
    maxScore: 89,
    color: '#3B82F6', // Blue
    sortOrder: 2,
    active: true
  },
  {
    academicYear: '2026–2027',
    name: 'Đạt',
    minScore: 65,
    maxScore: 79,
    color: '#F59E0B', // Amber
    sortOrder: 3,
    active: true
  },
  {
    academicYear: '2026–2027',
    name: 'Chưa đạt',
    minScore: 0,
    maxScore: 64,
    color: '#EF4444', // Rose / Red
    sortOrder: 4,
    active: true
  }
];

const sanitize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    return value === undefined ? null : value;
  }));
};

let isSeededMap: Record<string, boolean> = {};

export const classificationService = {
  // 1. SEED DEFAULT CONFIG IF EMPTY
  async seedIfEmpty(academicYear: string = '2026–2027'): Promise<void> {
    const normYear = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();
    if (isSeededMap[normYear]) return;
    isSeededMap[normYear] = true;

    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CLASSIFICATIONS));
      const existingInYear = snap.docs.filter(d => {
        const data = d.data() as YouthClassificationConfig;
        const dY = (data.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        return dY === normYear;
      });

      if (existingInYear.length === 0) {
        const seedItems: YouthClassificationConfig[] = DEFAULT_CLASSIFICATIONS.map((c, i) => ({
          ...c,
          id: `classif_${normYear.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}`,
          academicYear,
          createdAt: new Date().toISOString()
        }));

        for (const item of seedItems) {
          await setDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, item.id), sanitize(item));
        }

        const currentCache = this.getLocalCached();
        const updated = [...currentCache.filter(c => (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim() !== normYear), ...seedItems];
        localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Firestore classification seed error, using local fallback:', e);
      const currentCache = this.getLocalCached();
      const existingLocal = currentCache.filter(c => (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim() === normYear);
      if (existingLocal.length === 0) {
        const seedItems: YouthClassificationConfig[] = DEFAULT_CLASSIFICATIONS.map((c, i) => ({
          ...c,
          id: `classif_${normYear.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}`,
          academicYear,
          createdAt: new Date().toISOString()
        }));
        localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify([...currentCache, ...seedItems]));
      }
    }
  },

  getLocalCached(): YouthClassificationConfig[] {
    const cached = localStorage.getItem(CACHE_KEYS.CLASSIFICATIONS);
    if (cached) {
      try {
        return JSON.parse(cached) as YouthClassificationConfig[];
      } catch (err) {
        console.error(err);
      }
    }
    return [];
  },

  // 2. GET ALL CLASSIFICATIONS (BY ACADEMIC YEAR)
  async getClassifications(academicYear: string = '2026–2027', includeInactive: boolean = false): Promise<YouthClassificationConfig[]> {
    const normYear = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();

    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CLASSIFICATIONS));
      if (!snap.empty) {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as YouthClassificationConfig));
        localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(all));

        let filtered = all.filter(c => {
          const cY = (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
          return !cY || cY === normYear;
        });

        if (!includeInactive) {
          filtered = filtered.filter(c => c.active !== false);
        }

        return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || b.minScore - a.minScore);
      }
    } catch (e) {
      console.warn('Firestore getClassifications error, using local cache:', e);
    }

    const cached = this.getLocalCached();
    if (cached.length > 0) {
      let filtered = cached.filter(c => {
        const cY = (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        return !cY || cY === normYear;
      });
      if (!includeInactive) {
        filtered = filtered.filter(c => c.active !== false);
      }
      if (filtered.length > 0) {
        return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || b.minScore - a.minScore);
      }
    }

    // Fallback default
    return DEFAULT_CLASSIFICATIONS.map((c, i) => ({
      ...c,
      id: `classif_default_${i + 1}`,
      academicYear
    }));
  },

  // 3. UNIFIED CLASSIFICATION BY SCORE FUNCTION
  /**
   * Evaluates classification corresponding to a specific score for an academic year.
   * Logic:
   * 1. Get active configs for year.
   * 2. Find level where minScore <= score <= maxScore.
   * 3. Return level details or null if no match found.
   */
  getClassificationByScore(
    score: number,
    academicYear: string = '2026–2027',
    customConfigs?: YouthClassificationConfig[]
  ): {
    name: string;
    minScore: number;
    maxScore: number;
    color: string;
    sortOrder: number;
  } | null {
    const roundScore = Math.round(score * 10) / 10;
    const configsToUse = (customConfigs || this.getLocalCached()).filter(c => {
      if (c.active === false) return false;
      if (!academicYear || academicYear === 'All') return true;
      const cY = (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
      const aY = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();
      return !cY || cY === aY;
    });

    // If no configs in cache/params, fallback to standard defaults
    const activeList = configsToUse.length > 0
      ? configsToUse
      : DEFAULT_CLASSIFICATIONS.map((c, i) => ({ ...c, id: `def_${i}` }));

    // Find matching range
    const match = activeList.find(c => roundScore >= c.minScore && roundScore <= c.maxScore);
    if (match) {
      return {
        name: match.name,
        minScore: match.minScore,
        maxScore: match.maxScore,
        color: match.color || '#3B82F6',
        sortOrder: match.sortOrder || 1
      };
    }

    return null;
  },

  // 4. RANGE VALIDATION
  /**
   * Validates score ranges:
   * - 0 <= minScore <= maxScore <= 100
   * - No overlapping ranges among active levels
   * - Checks if entire 0-100 spectrum is covered (returns warning if gap exists)
   */
  validateClassificationRanges(configs: YouthClassificationConfig[]): {
    valid: boolean;
    error?: string;
    warning?: string;
  } {
    const activeConfigs = configs.filter(c => c.active !== false);

    if (activeConfigs.length === 0) {
      return { valid: false, error: 'Phải có ít nhất một mức xếp loại đang hoạt động.' };
    }

    // Check individual bounds
    for (const c of activeConfigs) {
      if (!c.name.trim()) {
        return { valid: false, error: 'Tên mức xếp loại không được để trống.' };
      }
      if (c.minScore < 0 || c.maxScore > 100) {
        return { valid: false, error: `Mức "${c.name}": Điểm phải nằm trong khoảng từ 0 đến 100.` };
      }
      if (c.minScore > c.maxScore) {
        return { valid: false, error: `Mức "${c.name}": Điểm tối thiểu (${c.minScore}) không được lớn hơn điểm tối đa (${c.maxScore}).` };
      }
    }

    // Check overlaps
    for (let i = 0; i < activeConfigs.length; i++) {
      for (let j = i + 1; j < activeConfigs.length; j++) {
        const a = activeConfigs[i];
        const b = activeConfigs[j];
        // Overlap condition: max(a.min, b.min) <= min(a.max, b.max)
        if (Math.max(a.minScore, b.minScore) <= Math.min(a.maxScore, b.maxScore)) {
          return {
            valid: false,
            error: `Khoảng điểm của "${a.name}" (${a.minScore}–${a.maxScore}) đang bị chồng lấn với "${b.name}" (${b.minScore}–${b.maxScore}).`
          };
        }
      }
    }

    // Check coverage across 0..100
    // Sort ascending
    const sorted = [...activeConfigs].sort((a, b) => a.minScore - b.minScore);
    const gaps: string[] = [];

    if (sorted[0].minScore > 0) {
      gaps.push(`0–${sorted[0].minScore - 1}`);
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentMax = sorted[i].maxScore;
      const nextMin = sorted[i + 1].minScore;
      if (nextMin > currentMax + 1) {
        gaps.push(`${currentMax + 1}–${nextMin - 1}`);
      }
    }

    const lastMax = sorted[sorted.length - 1].maxScore;
    if (lastMax < 100) {
      gaps.push(`${lastMax + 1}–100`);
    }

    let warning: string | undefined = undefined;
    if (gaps.length > 0) {
      warning = `Cấu hình chưa bao phủ toàn bộ khoảng điểm 0–100 (Còn thiếu khoảng: ${gaps.join(', ')}).`;
    }

    return { valid: true, warning };
  },

  // 5. CREATE CLASSIFICATION
  async createClassification(
    config: Omit<YouthClassificationConfig, 'id'>,
    performedByName: string = 'Quản trị viên',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<YouthClassificationConfig> {
    const id = `classif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: YouthClassificationConfig = {
      ...config,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const current = this.getLocalCached();
    current.push(record);
    localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(current));

    try {
      await setDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, id), sanitize(record));
    } catch (e) {
      console.warn('Firestore createClassification error:', e);
    }

    await this.addAuditLog({
      action: 'CREATE',
      entityType: 'SETTINGS',
      entityId: id,
      performedBy: auth.currentUser?.uid || 'admin',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Thêm mức xếp loại nề nếp mới: "${record.name}" (${record.minScore}–${record.maxScore} điểm, năm học ${record.academicYear})`,
      newData: record
    });

    return record;
  },

  // 6. UPDATE CLASSIFICATION
  async updateClassification(
    id: string,
    updates: Partial<YouthClassificationConfig>,
    performedByName: string = 'Quản trị viên',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<YouthClassificationConfig> {
    const current = this.getLocalCached();
    const idx = current.findIndex(c => c.id === id);
    const prevData = idx >= 0 ? { ...current[idx] } : null;

    const updatedRecord: YouthClassificationConfig = {
      ...(prevData || (updates as YouthClassificationConfig)),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      current[idx] = updatedRecord;
    } else {
      current.push(updatedRecord);
    }
    localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(current));

    try {
      await setDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, id), sanitize(updatedRecord), { merge: true });
    } catch (e) {
      console.warn('Firestore updateClassification error:', e);
    }

    await this.addAuditLog({
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: id,
      performedBy: auth.currentUser?.uid || 'admin',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Cập nhật mức xếp loại "${updatedRecord.name}": ${updatedRecord.minScore}–${updatedRecord.maxScore}đ (Năm học ${updatedRecord.academicYear})`,
      previousData: prevData,
      newData: updatedRecord
    });

    return updatedRecord;
  },

  // 7. DEACTIVATE (SOFT DELETE)
  async deactivateClassification(
    id: string,
    performedByName: string = 'Quản trị viên',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<void> {
    const current = this.getLocalCached();
    const target = current.find(c => c.id === id);
    if (!target) return;

    target.active = false;
    target.updatedAt = new Date().toISOString();
    localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(current));

    try {
      await updateDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, id), {
        active: false,
        updatedAt: target.updatedAt
      });
    } catch (e) {
      console.warn('Firestore deactivateClassification error:', e);
    }

    await this.addAuditLog({
      action: 'CONFIG_CHANGE',
      entityType: 'SETTINGS',
      entityId: id,
      performedBy: auth.currentUser?.uid || 'admin',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Ngừng sử dụng mức xếp loại nề nếp: "${target.name}" (${target.minScore}–${target.maxScore}đ)`,
      previousData: { active: true },
      newData: { active: false }
    });
  },

  // 8. RESTORE
  async restoreClassification(
    id: string,
    performedByName: string = 'Quản trị viên',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<void> {
    const current = this.getLocalCached();
    const target = current.find(c => c.id === id);
    if (!target) return;

    target.active = true;
    target.updatedAt = new Date().toISOString();
    localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(current));

    try {
      await updateDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, id), {
        active: true,
        updatedAt: target.updatedAt
      });
    } catch (e) {
      console.warn('Firestore restoreClassification error:', e);
    }

    await this.addAuditLog({
      action: 'CONFIG_CHANGE',
      entityType: 'SETTINGS',
      entityId: id,
      performedBy: auth.currentUser?.uid || 'admin',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Khôi phục hoạt động mức xếp loại nề nếp: "${target.name}" (${target.minScore}–${target.maxScore}đ)`,
      previousData: { active: false },
      newData: { active: true }
    });
  },

  // 9. RESTORE DEFAULT CONFIGS FOR YEAR
  async restoreDefaults(
    academicYear: string = '2026–2027',
    performedByName: string = 'Quản trị viên',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<YouthClassificationConfig[]> {
    const normYear = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();
    const current = this.getLocalCached();

    // Remove existing for this year
    const remaining = current.filter(c => (c.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim() !== normYear);

    const defaultItems: YouthClassificationConfig[] = DEFAULT_CLASSIFICATIONS.map((c, i) => ({
      ...c,
      id: `classif_${normYear.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}_${Date.now()}`,
      academicYear,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const combined = [...remaining, ...defaultItems];
    localStorage.setItem(CACHE_KEYS.CLASSIFICATIONS, JSON.stringify(combined));

    try {
      // Delete old from firestore
      const snap = await getDocs(collection(db, COLLECTIONS.CLASSIFICATIONS));
      for (const d of snap.docs) {
        const data = d.data() as YouthClassificationConfig;
        if ((data.academicYear || '').replace(/[\u2010-\u2015]/g, '-').trim() === normYear) {
          await deleteDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, d.id));
        }
      }

      // Add default items
      for (const item of defaultItems) {
        await setDoc(doc(db, COLLECTIONS.CLASSIFICATIONS, item.id), sanitize(item));
      }
    } catch (e) {
      console.warn('Firestore restoreDefaults error:', e);
    }

    await this.addAuditLog({
      action: 'CONFIG_CHANGE',
      entityType: 'SETTINGS',
      entityId: `restore_${normYear}`,
      performedBy: auth.currentUser?.uid || 'admin',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Khôi phục cấu hình điểm xếp loại nề nếp mặc định cho năm học ${academicYear} (Tốt 90-100, Khá 80-89, Đạt 65-79, Chưa đạt 0-64)`,
      newData: defaultItems
    });

    return defaultItems;
  },

  // 10. AUDIT LOG HELPER
  async addAuditLog(log: Omit<YouthAuditLog, 'id'>): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullLog: YouthAuditLog = { ...log, id };

    try {
      await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, id), sanitize(fullLog));
    } catch (e) {
      console.warn('Firestore classification audit log error:', e);
    }
  }
};
