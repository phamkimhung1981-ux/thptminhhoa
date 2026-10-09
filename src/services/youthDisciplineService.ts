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
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  YouthDisciplineCriterion,
  YouthViolationRecord,
  YouthDailyCheckSheet,
  YouthWeeklyLockRecord,
  YouthDisciplineSettings,
  YouthAuditLog,
  ClassDisciplineSummary,
  ViolationStatus,
  YouthClassificationConfig,
  StudentWithViolationsSummary
} from '../types/youthDiscipline';
import { Student } from '../types/homeroom';

export function getStudentsWithViolationsByClass(
  violations: YouthViolationRecord[],
  students: Student[] = [],
  classId: string,
  academicYear?: string,
  weekNumber?: number
): StudentWithViolationsSummary[] {
  const normalizeClassStr = (s?: string) => {
    if (!s) return '';
    return s.toLowerCase().replace(/^(lớp|lop|class|c_|c-)\s*/i, '').replace(/[^a-z0-9]/g, '');
  };

  const targetClassNorm = normalizeClassStr(classId);

  // Filter violations by scope
  const scopedViolations = violations.filter(v => {
    if (v.status === 'TU_CHOI') return false;

    // Academic year
    if (academicYear && academicYear !== 'All') {
      const vY = (v.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
      const aY = academicYear.replace(/[\u2010-\u2015]/g, '-').trim();
      if (vY && aY && vY !== aY) return false;
    }

    // Week number
    if (weekNumber !== undefined && weekNumber > 0) {
      if (v.weekNumber !== weekNumber) return false;
    }

    // Class match
    const vNormId = normalizeClassStr(v.classId);
    const vNormName = normalizeClassStr(v.className);

    const isMatch =
      (v.classId && classId && v.classId === classId) ||
      (v.className && classId && v.className.toLowerCase() === classId.toLowerCase()) ||
      (vNormId && targetClassNorm && vNormId === targetClassNorm) ||
      (vNormName && targetClassNorm && vNormName === targetClassNorm);

    return isMatch;
  });

  // Group by studentId
  const map = new Map<string, YouthViolationRecord[]>();

  scopedViolations.forEach(v => {
    const sKey = v.studentId && v.studentId !== 'ALL_CLASS' ? v.studentId : null;
    if (sKey) {
      if (!map.has(sKey)) {
        map.set(sKey, []);
      }
      map.get(sKey)!.push(v);
    }
  });

  const result: StudentWithViolationsSummary[] = [];

  map.forEach((vList, sId) => {
    const foundStu = students.find(s => s.id === sId || s.code === sId);
    const firstV = vList[0];

    const studentName = foundStu?.fullName || foundStu?.name || (firstV.studentName && !firstV.studentName.toLowerCase().includes('tập thể') ? firstV.studentName : 'Không xác định được học sinh');
    const studentCode = foundStu?.code || firstV.studentCode || '';
    const className = foundStu?.className || firstV.className || '';
    const resolvedClassId = foundStu?.classId || firstV.classId || classId;

    const totalDeduction = vList.reduce((sum, item) => sum + Math.abs(Number(item.minusPoints) || 0), 0);

    result.push({
      studentId: sId,
      studentName,
      studentCode,
      classId: resolvedClassId,
      className,
      violationCount: vList.length,
      totalDeduction,
      violations: vList.sort((a, b) => new Date(b.violationDate).getTime() - new Date(a.violationDate).getTime())
    });
  });

  return result.sort((a, b) => {
    if (b.totalDeduction !== a.totalDeduction) return b.totalDeduction - a.totalDeduction;
    if (b.violationCount !== a.violationCount) return b.violationCount - a.violationCount;
    return a.studentName.localeCompare(b.studentName, 'vi');
  });
}
import { classificationService } from './classificationService';
import {
  DEFAULT_YOUTH_CRITERIA,
  DEFAULT_YOUTH_SETTINGS,
  SAMPLE_YOUTH_VIOLATIONS
} from '../lib/youthDisciplineData';
import { ClassInfo } from '../types/homeroom';

const COLLECTIONS = {
  CRITERIA: 'youth_discipline_criteria',
  VIOLATIONS: 'youth_discipline_violations',
  DAILY_CHECKS: 'youth_discipline_daily_checks',
  WEEKLY_LOCKS: 'youth_discipline_weekly_locks',
  SETTINGS: 'youth_discipline_settings',
  AUDIT_LOGS: 'youth_discipline_audit_logs'
};

const CACHE_KEYS = {
  CRITERIA: 'youth_discipline_cached_criteria',
  VIOLATIONS: 'youth_discipline_cached_violations',
  SETTINGS: 'youth_discipline_cached_settings',
  LOCKS: 'youth_discipline_cached_locks',
  DAILY_CHECKS: 'youth_discipline_cached_daily_checks',
  AUDIT_LOGS: 'youth_discipline_cached_audit_logs'
};

let isSeeded = false;

export const youthDisciplineService = {
  // 1. SEED DEFAULT DATA IF EMPTY
  async seedIfEmpty() {
    if (isSeeded) return;
    isSeeded = true;

    try {
      // 1.1 Criteria
      const critSnap = await getDocs(collection(db, COLLECTIONS.CRITERIA));
      if (critSnap.empty) {
        for (const crit of DEFAULT_YOUTH_CRITERIA) {
          await setDoc(doc(db, COLLECTIONS.CRITERIA, crit.id), crit);
        }
        localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(DEFAULT_YOUTH_CRITERIA));
      }

      // 1.2 Settings
      const setSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, DEFAULT_YOUTH_SETTINGS.id));
      if (!setSnap.exists()) {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, DEFAULT_YOUTH_SETTINGS.id), DEFAULT_YOUTH_SETTINGS);
        localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(DEFAULT_YOUTH_SETTINGS));
      }

      // 1.3 Clean up any old sample violations if present
      await this.cleanupSampleViolations();
    } catch (e) {
      console.warn('YouthDiscipline seed error (using local storage fallback):', e);
      if (!localStorage.getItem(CACHE_KEYS.CRITERIA)) {
        localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(DEFAULT_YOUTH_CRITERIA));
      }
      if (!localStorage.getItem(CACHE_KEYS.SETTINGS)) {
        localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(DEFAULT_YOUTH_SETTINGS));
      }
    }
  },

  async cleanupSampleViolations(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.VIOLATIONS));
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          if (docSnap.id.startsWith('yv_sample_')) {
            try {
              await deleteDoc(doc(db, COLLECTIONS.VIOLATIONS, docSnap.id));
            } catch (err) {
              console.warn('Failed to delete sample doc:', docSnap.id, err);
            }
          }
        }
      }
      const cached = localStorage.getItem(CACHE_KEYS.VIOLATIONS);
      if (cached) {
        try {
          const list: YouthViolationRecord[] = JSON.parse(cached);
          const filtered = list.filter(v => !v.id.startsWith('yv_sample_'));
          localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(filtered));
        } catch (err) {
          console.error(err);
        }
      }
    } catch (e) {
      console.warn('cleanupSampleViolations error:', e);
    }
  },

  // 2. CRITERIA CRUD
  async getCriteria(): Promise<YouthDisciplineCriterion[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CRITERIA));
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data() as YouthDisciplineCriterion);
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(list));
        return list;
      }
    } catch (e) {
      console.warn('Cannot fetch youth criteria from Firestore, using cache:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.CRITERIA);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(DEFAULT_YOUTH_CRITERIA));
    return DEFAULT_YOUTH_CRITERIA;
  },

  async saveCriterion(criterion: YouthDisciplineCriterion, userRole: string = 'BI_THU_DOAN'): Promise<void> {
    const isNew = !criterion.id || criterion.id === '';
    const id = isNew ? `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : criterion.id;
    const item: YouthDisciplineCriterion = {
      ...criterion,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: criterion.createdAt || new Date().toISOString()
    };

    // Save local cache
    const current = await this.getCriteria();
    const existingIdx = current.findIndex(c => c.id === id);
    if (existingIdx >= 0) {
      current[existingIdx] = item;
    } else {
      current.push(item);
    }
    localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(current));

    // Save Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.CRITERIA, id), item, { merge: true });
    } catch (e) {
      console.warn('Firestore saveCriterion warning (saved locally):', e);
    }

    try {
      await this.addAuditLog({
        action: isNew ? 'CREATE' : 'UPDATE',
        entityType: 'CRITERION',
        entityId: id,
        performedBy: auth.currentUser?.uid || 'user',
        performedByName: auth.currentUser?.displayName || 'Cán bộ Đoàn',
        performedByRole: userRole,
        timestamp: new Date().toISOString(),
        summary: `${isNew ? 'Thêm mới' : 'Cập nhật'} tiêu chí nền nếp: [${item.code}] ${item.name} (-${item.minusPoints}đ)`,
        newData: item
      });
    } catch (logErr) {
      console.warn('Audit log warning:', logErr);
    }
  },

  async deleteCriterion(id: string, userRole: string = 'BI_THU_DOAN'): Promise<void> {
    const current = await this.getCriteria();
    const target = current.find(c => c.id === id);
    const filtered = current.filter(c => c.id !== id);
    localStorage.setItem(CACHE_KEYS.CRITERIA, JSON.stringify(filtered));

    try {
      await deleteDoc(doc(db, COLLECTIONS.CRITERIA, id));
    } catch (e) {
      console.warn('Firestore deleteCriterion warning (deleted locally):', e);
    }

    if (target) {
      try {
        await this.addAuditLog({
          action: 'DELETE',
          entityType: 'CRITERION',
          entityId: id,
          performedBy: auth.currentUser?.uid || 'user',
          performedByName: auth.currentUser?.displayName || 'Cán bộ Đoàn',
          performedByRole: userRole,
          timestamp: new Date().toISOString(),
          summary: `Xóa tiêu chí nền nếp: [${target.code}] ${target.name}`,
          previousData: target
        });
      } catch (logErr) {
        console.warn('Audit log warning:', logErr);
      }
    }
  },

  // 3. VIOLATIONS CRUD
  async getViolations(filters?: {
    schoolYear?: string;
    weekNumber?: number;
    monthNumber?: number;
    classId?: string;
    studentId?: string;
    date?: string;
    severity?: string;
    status?: string;
  }): Promise<YouthViolationRecord[]> {
    let list: YouthViolationRecord[] = [];

    // 1. Read local cache first
    let cachedList: YouthViolationRecord[] = [];
    const cached = localStorage.getItem(CACHE_KEYS.VIOLATIONS);
    if (cached) {
      try {
        cachedList = JSON.parse(cached) || [];
      } catch (err) {
        console.error('Error parsing cached violations:', err);
      }
    }

    // 2. Fetch Firestore documents
    let firestoreList: YouthViolationRecord[] = [];
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.VIOLATIONS));
      if (!snap.empty) {
        firestoreList = snap.docs.map(d => d.data() as YouthViolationRecord);
      }
    } catch (e) {
      console.warn('Firestore getViolations error, falling back to cache:', e);
    }

    // 3. Merge firestoreList & cachedList by item ID
    const map = new Map<string, YouthViolationRecord>();
    for (const item of firestoreList) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of cachedList) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    list = Array.from(map.values());
    localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(list));

    // Apply filtering
    if (filters) {
      if (filters.schoolYear && filters.schoolYear !== 'All') {
        const fY = filters.schoolYear.replace(/[\u2010-\u2015]/g, '-').trim();
        list = list.filter(v => {
          if (!v.schoolYear) return true;
          const vY = v.schoolYear.replace(/[\u2010-\u2015]/g, '-').trim();
          return vY === fY;
        });
      }
      if (filters.weekNumber !== undefined && filters.weekNumber > 0) {
        list = list.filter(v => Number(v.weekNumber) === Number(filters.weekNumber));
      }
      if (filters.monthNumber !== undefined && filters.monthNumber > 0) {
        list = list.filter(v => Number(v.monthNumber) === Number(filters.monthNumber));
      }
      if (filters.classId && filters.classId !== 'All') {
        list = list.filter(v => v.classId === filters.classId);
      }
      if (filters.studentId && filters.studentId !== 'All') {
        list = list.filter(v => v.studentId === filters.studentId);
      }
      if (filters.date) {
        list = list.filter(v => v.violationDate === filters.date);
      }
      if (filters.severity && filters.severity !== 'All') {
        list = list.filter(v => v.severity === filters.severity);
      }
      if (filters.status && filters.status !== 'All') {
        list = list.filter(v => v.status === filters.status);
      }
    }

    // Sort descending by date & created time
    return list.sort((a, b) => new Date(b.violationDate + 'T' + (b.violationTime || '00:00')).getTime() - new Date(a.violationDate + 'T' + (a.violationTime || '00:00')).getTime());
  },

  async saveViolation(
    violation: YouthViolationRecord,
    performedByRole: string = 'CAN_BO_DOAN'
  ): Promise<YouthViolationRecord> {
    const isNew = !violation.id || violation.id === '';
    const id = isNew ? `yv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : violation.id;
    
    const record: YouthViolationRecord = {
      ...violation,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: violation.createdAt || new Date().toISOString()
    };

    // Check weekly lock status before modifying
    const lock = await this.getWeeklyLock(record.schoolYear, record.weekNumber);
    if (lock.isLocked && performedByRole !== 'ADMIN' && performedByRole !== 'BAN_GIAM_HIEU' && performedByRole !== 'BI_THU_DOAN') {
      throw new Error(`Tuần ${record.weekNumber} đã được chốt kết quả. Vui lòng liên hệ Bí thư Đoàn hoặc BGH để mở khóa.`);
    }

    // Update local cache
    const current = await this.getViolations();
    const existingIdx = current.findIndex(v => v.id === id);
    if (existingIdx >= 0) {
      current[existingIdx] = record;
    } else {
      current.unshift(record);
    }
    localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(current));

    // Save Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.VIOLATIONS, id), record, { merge: true });
    } catch (e) {
      console.warn('Firestore saveViolation warning (saved locally):', e);
    }

    try {
      await this.addAuditLog({
        action: isNew ? 'CREATE' : 'UPDATE',
        entityType: 'VIOLATION',
        entityId: id,
        performedBy: record.recordedBy || 'user',
        performedByName: record.recordedByName || 'Cán bộ ghi nhận',
        performedByRole,
        timestamp: new Date().toISOString(),
        summary: `${isNew ? 'Ghi nhận' : 'Cập nhật'} vi phạm nền nếp lớp ${record.className}: ${record.studentName} - ${record.criterionName} (-${record.minusPoints}đ)`,
        newData: record
      });
    } catch (logErr) {
      console.warn('Audit log warning:', logErr);
    }

    return record;
  },

  async deleteViolation(id: string, performedByName: string = 'Người dùng', performedByRole: string = 'BI_THU_DOAN'): Promise<void> {
    const current = await this.getViolations();
    const target = current.find(v => v.id === id);
    if (target) {
      const lock = await this.getWeeklyLock(target.schoolYear, target.weekNumber);
      if (lock.isLocked && performedByRole !== 'ADMIN' && performedByRole !== 'BAN_GIAM_HIEU' && performedByRole !== 'BI_THU_DOAN') {
        throw new Error(`Tuần ${target.weekNumber} đã được chốt kết quả. Không thể xóa dữ liệu đã chốt.`);
      }
    }

    const filtered = current.filter(v => v.id !== id);
    localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(filtered));

    try {
      await deleteDoc(doc(db, COLLECTIONS.VIOLATIONS, id));
    } catch (e) {
      console.warn('Firestore deleteViolation warning (deleted locally):', e);
    }

    if (target) {
      try {
        await this.addAuditLog({
          action: 'DELETE',
          entityType: 'VIOLATION',
          entityId: id,
          performedBy: auth.currentUser?.uid || 'user',
          performedByName,
          performedByRole,
          timestamp: new Date().toISOString(),
          summary: `Xóa bản ghi vi phạm lớp ${target.className}: ${target.studentName} - ${target.criterionName}`,
          previousData: target
        });
      } catch (logErr) {
        console.warn('Audit log warning:', logErr);
      }
    }
  },

  async deleteMultipleViolations(
    ids: string[],
    performedByName: string = 'Người dùng',
    performedByRole: string = 'BI_THU_DOAN',
    reasonDescription: string = 'Xóa hàng loạt bản ghi vi phạm'
  ): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const current = await this.getViolations();
    const idSet = new Set(ids);
    const deletedItems = current.filter(v => idSet.has(v.id));
    const remaining = current.filter(v => !idSet.has(v.id));

    localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(remaining));

    // Delete in Firestore
    for (const id of ids) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.VIOLATIONS, id));
      } catch (e) {
        console.warn('Firestore batch delete item error:', id, e);
      }
    }

    await this.addAuditLog({
      action: 'DELETE',
      entityType: 'VIOLATION',
      entityId: `batch_${Date.now()}`,
      performedBy: auth.currentUser?.uid || 'user',
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `${reasonDescription} (Đã xóa ${deletedItems.length} bản ghi)`,
      previousData: deletedItems.map(d => ({ id: d.id, student: d.studentName, class: d.className, crit: d.criterionName }))
    });

    return deletedItems.length;
  },

  async deleteLateArrivals(
    schoolYear: string,
    weekNumber?: number,
    date?: string,
    classId?: string,
    performedByName: string = 'Bí thư Đoàn',
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<number> {
    const all = await this.getViolations({ schoolYear });
    const lateViolations = all.filter(v => {
      const isLate = (v.criterionCode && v.criterionCode.toLowerCase().includes('cc02')) ||
                     v.criterionName.toLowerCase().includes('muộn') ||
                     v.content.toLowerCase().includes('muộn') ||
                     v.criterionId === 'crit_cc_2';
      if (!isLate) return false;
      if (weekNumber !== undefined && weekNumber > 0 && v.weekNumber !== weekNumber) return false;
      if (date && v.violationDate !== date) return false;
      if (classId && classId !== 'All' && v.classId !== classId) return false;
      return true;
    });

    const idsToDelete = lateViolations.map(v => v.id);
    if (idsToDelete.length === 0) return 0;

    const count = await this.deleteMultipleViolations(
      idsToDelete,
      performedByName,
      performedByRole,
      `Xóa danh sách ${idsToDelete.length} học sinh đi học muộn ${date ? `ngày ${date}` : weekNumber ? `Tuần ${weekNumber}` : ''}`
    );

    return count;
  },

  async updateViolationStatus(
    id: string,
    status: ViolationStatus,
    confirmedBy: string,
    confirmedByName: string,
    performedByRole: string = 'BI_THU_DOAN'
  ): Promise<void> {
    const current = await this.getViolations();
    const target = current.find(v => v.id === id);
    if (!target) return;

    const prevStatus = target.status;
    target.status = status;
    target.confirmedBy = confirmedBy;
    target.confirmedByName = confirmedByName;
    target.confirmedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();

    localStorage.setItem(CACHE_KEYS.VIOLATIONS, JSON.stringify(current));

    try {
      await updateDoc(doc(db, COLLECTIONS.VIOLATIONS, id), {
        status,
        confirmedBy,
        confirmedByName,
        confirmedAt: target.confirmedAt,
        updatedAt: target.updatedAt
      });
    } catch (e) {
      console.warn('Firestore updateViolationStatus error:', e);
    }

    await this.addAuditLog({
      action: status === 'DA_XAC_NHAN' ? 'CONFIRM' : status === 'CHO_XAC_NHAN' ? 'UNCONFIRM' : 'UPDATE',
      entityType: 'VIOLATION',
      entityId: id,
      performedBy: confirmedBy,
      performedByName: confirmedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Thay đổi trạng thái vi phạm lớp ${target.className} (${target.studentName}) từ "${prevStatus}" sang "${status}"`,
      previousData: { status: prevStatus },
      newData: { status }
    });
  },

  // 4. DAILY QUICK CHECK SHEET
  async getDailyCheckSheet(date: string, session: 'morning' | 'afternoon', schoolYear: string, weekNumber: number): Promise<YouthDailyCheckSheet | null> {
    const sheetId = `check_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${weekNumber}_${date}_${session}`;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.DAILY_CHECKS, sheetId));
      if (snap.exists()) {
        return snap.data() as YouthDailyCheckSheet;
      }
    } catch (e) {
      console.warn('Firestore getDailyCheckSheet error:', e);
    }

    const cached = localStorage.getItem(`${CACHE_KEYS.DAILY_CHECKS}_${sheetId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }
    return null;
  },

  async saveDailyCheckSheet(sheet: YouthDailyCheckSheet, performedByRole: string = 'CAN_BO_DOAN'): Promise<void> {
    const sheetId = sheet.id || `check_${sheet.schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${sheet.weekNumber}_${sheet.checkDate}_${sheet.session}`;
    const payload = { ...sheet, id: sheetId, updatedAt: new Date().toISOString() };

    localStorage.setItem(`${CACHE_KEYS.DAILY_CHECKS}_${sheetId}`, JSON.stringify(payload));

    try {
      await setDoc(doc(db, COLLECTIONS.DAILY_CHECKS, sheetId), payload, { merge: true });
    } catch (e) {
      console.warn('Firestore saveDailyCheckSheet error:', e);
    }

    await this.addAuditLog({
      action: 'UPDATE',
      entityType: 'DAILY_CHECK',
      entityId: sheetId,
      performedBy: sheet.inspectorId,
      performedByName: sheet.inspectorName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Lưu sổ kiểm tra nền nếp hằng ngày (${sheet.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'}) ngày ${sheet.checkDate} (Tuần ${sheet.weekNumber})`,
      newData: payload
    });
  },

  // 5. WEEKLY LOCK / UNLOCK
  async getWeeklyLock(schoolYear: string, weekNumber: number): Promise<YouthWeeklyLockRecord> {
    const lockId = `lock_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${weekNumber}`;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.WEEKLY_LOCKS, lockId));
      if (snap.exists()) {
        return snap.data() as YouthWeeklyLockRecord;
      }
    } catch (e) {
      console.warn('Firestore getWeeklyLock error:', e);
    }

    const cached = localStorage.getItem(`${CACHE_KEYS.LOCKS}_${lockId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }

    return {
      id: lockId,
      schoolYear,
      weekNumber,
      isLocked: false
    };
  },

  async lockWeek(
    schoolYear: string,
    weekNumber: number,
    lockedBy: string,
    lockedByName: string,
    performedByRole: string = 'BI_THU_DOAN',
    snapshotSummary?: any
  ): Promise<YouthWeeklyLockRecord> {
    const lockId = `lock_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${weekNumber}`;
    const payload: YouthWeeklyLockRecord = {
      id: lockId,
      schoolYear,
      weekNumber,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy,
      lockedByName,
      snapshotSummary
    };

    localStorage.setItem(`${CACHE_KEYS.LOCKS}_${lockId}`, JSON.stringify(payload));

    try {
      await setDoc(doc(db, COLLECTIONS.WEEKLY_LOCKS, lockId), payload, { merge: true });
    } catch (e) {
      console.warn('Firestore lockWeek error:', e);
    }

    await this.addAuditLog({
      action: 'LOCK_WEEK',
      entityType: 'WEEK_LOCK',
      entityId: lockId,
      performedBy: lockedBy,
      performedByName: lockedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Chốt kết quả thi đua nền nếp Tuần ${weekNumber} (${schoolYear}) bởi ${lockedByName}`,
      newData: payload
    });

    return payload;
  },

  async unlockWeek(
    schoolYear: string,
    weekNumber: number,
    unlockedBy: string,
    unlockedByName: string,
    reason: string,
    performedByRole: string = 'ADMIN'
  ): Promise<YouthWeeklyLockRecord> {
    const lockId = `lock_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_w${weekNumber}`;
    const payload: YouthWeeklyLockRecord = {
      id: lockId,
      schoolYear,
      weekNumber,
      isLocked: false,
      unlockedAt: new Date().toISOString(),
      unlockedBy,
      unlockedByName,
      unlockReason: reason
    };

    localStorage.setItem(`${CACHE_KEYS.LOCKS}_${lockId}`, JSON.stringify(payload));

    try {
      await setDoc(doc(db, COLLECTIONS.WEEKLY_LOCKS, lockId), payload, { merge: true });
    } catch (e) {
      console.warn('Firestore unlockWeek error:', e);
    }

    await this.addAuditLog({
      action: 'UNLOCK_WEEK',
      entityType: 'WEEK_LOCK',
      entityId: lockId,
      performedBy: unlockedBy,
      performedByName: unlockedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Mở khóa sửa kết quả Tuần ${weekNumber} (${schoolYear}). Lý do: ${reason}`,
      newData: payload
    });

    return payload;
  },

  // 6. SETTINGS
  async getSettings(schoolYear: string = '2026–2027'): Promise<YouthDisciplineSettings> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, DEFAULT_YOUTH_SETTINGS.id));
      if (snap.exists()) {
        const data = snap.data() as YouthDisciplineSettings;
        localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Firestore getSettings error:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.SETTINGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }
    return DEFAULT_YOUTH_SETTINGS;
  },

  async saveSettings(settings: YouthDisciplineSettings, performedByRole: string = 'ADMIN'): Promise<void> {
    localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(settings));
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, settings.id), settings, { merge: true });
    } catch (e) {
      console.warn('Firestore saveSettings error:', e);
    }

    await this.addAuditLog({
      action: 'CONFIG_CHANGE',
      entityType: 'SETTINGS',
      entityId: settings.id,
      performedBy: auth.currentUser?.uid || 'user',
      performedByName: auth.currentUser?.displayName || 'Quản trị viên',
      performedByRole,
      timestamp: new Date().toISOString(),
      summary: `Cập nhật cấu hình điểm nền nếp: Điểm chuẩn ${settings.baseScore}đ, Tốt >= ${settings.thresholdGood}đ, Khá >= ${settings.thresholdFair}đ`,
      newData: settings
    });
  },

  // 7. AUDIT LOGS
  async addAuditLog(log: Omit<YouthAuditLog, 'id'>): Promise<void> {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullLog: YouthAuditLog = { ...log, id };

    // Update local cache
    const current = await this.getAuditLogs(100);
    current.unshift(fullLog);
    localStorage.setItem(CACHE_KEYS.AUDIT_LOGS, JSON.stringify(current.slice(0, 100)));

    try {
      await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, id), fullLog);
    } catch (e) {
      console.warn('Firestore addAuditLog warning:', e);
    }
  },

  async getAuditLogs(limitCount: number = 50): Promise<YouthAuditLog[]> {
    try {
      const q = query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const logs = snap.docs.map(d => d.data() as YouthAuditLog);
        localStorage.setItem(CACHE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
        return logs;
      }
    } catch (e) {
      console.warn('Firestore getAuditLogs error, using cache:', e);
    }

    const cached = localStorage.getItem(CACHE_KEYS.AUDIT_LOGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }
    return [];
  },

  // 8. SUMMARY CALCULATION & STUDENT VIOLATION DEDUCTION
  getStudentsWithViolationsByClass(
    violations: YouthViolationRecord[],
    students: Student[] = [],
    classId: string,
    academicYear?: string,
    weekNumber?: number
  ): StudentWithViolationsSummary[] {
    return getStudentsWithViolationsByClass(violations, students, classId, academicYear, weekNumber);
  },

  calculateClassSummaries(
    classes: ClassInfo[],
    violations: YouthViolationRecord[],
    settings: YouthDisciplineSettings,
    targetWeek?: number,
    targetYear?: string,
    students: Student[] = []
  ): ClassDisciplineSummary[] {
    const baseScore = settings?.baseScore || 100;

    const normalizeClassStr = (s?: string) => {
      if (!s) return '';
      return s.toLowerCase().replace(/^(lớp|lop|class|c_|c-)\s*/i, '').replace(/[^a-z0-9]/g, '');
    };

    // Filter violations by school year and week if provided
    const scopedViolations = violations.filter(v => {
      if (v.status === 'TU_CHOI') return false;
      if (targetYear && targetYear !== 'All') {
        const vY = (v.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        const tY = targetYear.replace(/[\u2010-\u2015]/g, '-').trim();
        if (vY && tY && vY !== tY) return false;
      }
      if (targetWeek !== undefined && targetWeek > 0) {
        if (v.weekNumber !== targetWeek) return false;
      }
      return true;
    });

    const summaries: ClassDisciplineSummary[] = classes.map(cls => {
      const clsNormId = normalizeClassStr(cls.id);
      const clsNormName = normalizeClassStr(cls.name);

      // Find violations belonging to this class
      const classViolations = scopedViolations.filter(v => {
        const vNormId = normalizeClassStr(v.classId);
        const vNormName = normalizeClassStr(v.className);

        return (
          (v.classId && cls.id && v.classId === cls.id) ||
          (v.className && cls.name && v.className.toLowerCase() === cls.name.toLowerCase()) ||
          (vNormId && clsNormId && vNormId === clsNormId) ||
          (vNormName && clsNormName && vNormName === clsNormName) ||
          (vNormId && clsNormName && vNormId === clsNormName) ||
          (vNormName && clsNormId && vNormName === clsNormId)
        );
      });

      // Total deduction: SUM of deduction points
      const totalMinusPoints = classViolations.reduce((sum, v) => sum + Math.abs(Number(v.minusPoints) || 0), 0);
      const finalScore = Math.max(0, baseScore - totalMinusPoints);

      // Distinct violating students calculated via getStudentsWithViolationsByClass helper
      const studentSummaries = getStudentsWithViolationsByClass(
        classViolations,
        students,
        cls.id,
        targetYear,
        targetWeek
      );

      // Dynamic Classification from Classification Service
      const classifMatch = classificationService.getClassificationByScore(
        finalScore,
        targetYear || '2026–2027'
      );
      const classification = classifMatch?.name || (finalScore >= 90 ? 'Tốt' : finalScore >= 80 ? 'Khá' : finalScore >= 65 ? 'Đạt' : 'Chưa đạt');
      const classificationColor = classifMatch?.color || (classification === 'Tốt' ? '#10B981' : classification === 'Khá' ? '#3B82F6' : classification === 'Đạt' ? '#F59E0B' : '#EF4444');

      // Top violations in this class
      const countMap: Record<string, number> = {};
      classViolations.forEach(v => {
        const label = v.criterionName || v.content || 'Lỗi vi phạm';
        countMap[label] = (countMap[label] || 0) + 1;
      });
      const topViolations = Object.entries(countMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade || (cls.name.startsWith('10') ? 10 : cls.name.startsWith('11') ? 11 : 12),
        homeroomTeacherName: cls.homeroomTeacherName,
        totalStudents: cls.totalStudents || 40,
        baseScore,
        totalMinusPoints,
        finalScore,
        violationCount: classViolations.length,
        violatingStudentCount: studentSummaries.length,
        classification,
        classificationColor,
        rank: 1, // Will be computed below
        topViolations
      };
    });

    // Sort by final score descending, then by totalMinusPoints ascending, then by violation count ascending
    summaries.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (a.totalMinusPoints !== b.totalMinusPoints) return a.totalMinusPoints - b.totalMinusPoints;
      if (a.violationCount !== b.violationCount) return a.violationCount - b.violationCount;
      return a.className.localeCompare(b.className);
    });

    // Assign ranks
    let currentRank = 1;
    for (let i = 0; i < summaries.length; i++) {
      if (i > 0 && summaries[i].finalScore < summaries[i - 1].finalScore) {
        currentRank = i + 1;
      }
      summaries[i].rank = currentRank;
    }

    return summaries;
  }
};
