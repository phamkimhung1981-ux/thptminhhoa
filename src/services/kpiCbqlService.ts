import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  KpiCbqlPeriod, 
  KpiCbqlCriteriaGroup, 
  KpiCbqlCriterion, 
  KpiCbqlForm, 
  KpiCbqlAssignment, 
  KpiCbqlEvidence, 
  KpiCbqlComment, 
  KpiCbqlAuditLog 
} from '../types/kpiCbql';
import { 
  DEFAULT_CBQL_CRITERIA_GROUPS, 
  DEFAULT_CBQL_CRITERIA, 
  DEFAULT_CBQL_PERIODS 
} from '../lib/kpiCbqlData';

// Firestore collection names
export const CBQL_COLLECTIONS = {
  PERIODS: 'kpi_cbql_periods',
  CRITERIA_GROUPS: 'kpi_cbql_criteria_groups',
  CRITERIA: 'kpi_cbql_criteria',
  FORMS: 'kpi_cbql_forms',
  ASSIGNMENTS: 'kpi_cbql_assignments',
  SCORES: 'kpi_cbql_scores',
  EVIDENCE: 'kpi_cbql_evidence',
  COMMENTS: 'kpi_cbql_comments',
  AUDIT_LOGS: 'kpi_cbql_audit_logs'
} as const;

/**
 * Recursively removes all `undefined` values from an object, array, or nested structure.
 * Guaranteed to prevent Firestore 'Unsupported field value: undefined' errors.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  if (obj === null) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value === null) {
          cleaned[key] = null;
        } else if (typeof value === 'object') {
          cleaned[key] = cleanFirestoreData(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

export const removeUndefined = cleanFirestoreData;

/**
 * 1. SEED INITIAL DATA IF FIRESTORE IS EMPTY
 */
export async function seedCbqlInitialDataIfNeeded() {
  try {
    // Seed Groups
    const groupsSnap = await getDocs(collection(db, CBQL_COLLECTIONS.CRITERIA_GROUPS));
    if (groupsSnap.empty) {
      for (const group of DEFAULT_CBQL_CRITERIA_GROUPS) {
        await setDoc(doc(db, CBQL_COLLECTIONS.CRITERIA_GROUPS, group.id), cleanFirestoreData(group));
      }
    }

    // Seed Criteria
    const criteriaSnap = await getDocs(collection(db, CBQL_COLLECTIONS.CRITERIA));
    if (criteriaSnap.empty) {
      for (const criterion of DEFAULT_CBQL_CRITERIA) {
        await setDoc(doc(db, CBQL_COLLECTIONS.CRITERIA, criterion.id), cleanFirestoreData(criterion));
      }
    }

    // Seed Periods
    const periodsSnap = await getDocs(collection(db, CBQL_COLLECTIONS.PERIODS));
    if (periodsSnap.empty) {
      for (const period of DEFAULT_CBQL_PERIODS) {
        await setDoc(doc(db, CBQL_COLLECTIONS.PERIODS, period.id), cleanFirestoreData(period));
      }
    }
  } catch (err) {
    console.warn('Error during seeding initial CBQL data:', err);
  }
}

/**
 * 2. REALTIME SUBSCRIPTION HELPERS
 */
export function subscribeCbqlPeriods(onUpdate: (periods: KpiCbqlPeriod[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, CBQL_COLLECTIONS.PERIODS));
    return onSnapshot(q, (snapshot) => {
      const list: KpiCbqlPeriod[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as KpiCbqlPeriod);
      });
      
      // Merge DEFAULT_CBQL_PERIODS to ensure all months (1-12) and semesters are present
      const existingIds = new Set(list.map(p => p.id));
      const combined = [...list];
      for (const defP of DEFAULT_CBQL_PERIODS) {
        if (!existingIds.has(defP.id)) {
          combined.push(defP);
        }
      }

      // Sort by startDate desc or createdAt desc
      combined.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      onUpdate(combined.length > 0 ? combined : DEFAULT_CBQL_PERIODS);
    }, (err) => {
      console.warn('subscribeCbqlPeriods error:', err);
      onUpdate(DEFAULT_CBQL_PERIODS);
    });
  } catch {
    onUpdate(DEFAULT_CBQL_PERIODS);
    return () => {};
  }
}

export function subscribeCbqlCriteria(onUpdate: (criteria: KpiCbqlCriterion[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, CBQL_COLLECTIONS.CRITERIA));
    return onSnapshot(q, (snapshot) => {
      const list: KpiCbqlCriterion[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as KpiCbqlCriterion);
      });
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list.length > 0 ? list : DEFAULT_CBQL_CRITERIA);
    }, (err) => {
      console.warn('subscribeCbqlCriteria error:', err);
      onUpdate(DEFAULT_CBQL_CRITERIA);
    });
  } catch {
    onUpdate(DEFAULT_CBQL_CRITERIA);
    return () => {};
  }
}

// Local storage cache for CBQL forms
const CBQL_FORMS_CACHE_KEY = 'kpi_cbql_forms_cache';

const getCbqlFormsCache = (): KpiCbqlForm[] => {
  try {
    const raw = localStorage.getItem(CBQL_FORMS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading CBQL forms cache:', err);
    return [];
  }
};

const saveCbqlFormsCache = (forms: KpiCbqlForm[]) => {
  try {
    localStorage.setItem(CBQL_FORMS_CACHE_KEY, JSON.stringify(forms));
  } catch (err) {
    console.warn('Error saving CBQL forms cache:', err);
  }
};

export function subscribeCbqlForms(onUpdate: (forms: KpiCbqlForm[]) => void): Unsubscribe {
  // Load cache immediately
  const cached = getCbqlFormsCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  try {
    const q = query(collection(db, CBQL_COLLECTIONS.FORMS));
    return onSnapshot(q, (snapshot) => {
      const firestoreList: KpiCbqlForm[] = [];
      snapshot.forEach(docSnap => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() } as KpiCbqlForm);
      });

      const currentCached = getCbqlFormsCache();
      const map = new Map<string, KpiCbqlForm>();
      currentCached.forEach(f => map.set(f.id, f));
      firestoreList.forEach(f => map.set(f.id, f));

      const mergedList = Array.from(map.values());
      mergedList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      saveCbqlFormsCache(mergedList);
      onUpdate(mergedList);
    }, (err) => {
      console.warn('subscribeCbqlForms error, falling back to cache:', err);
      onUpdate(getCbqlFormsCache());
    });
  } catch {
    onUpdate(getCbqlFormsCache());
    return () => {};
  }
}

export function subscribeCbqlAuditLogs(onUpdate: (logs: KpiCbqlAuditLog[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, CBQL_COLLECTIONS.AUDIT_LOGS));
    return onSnapshot(q, (snapshot) => {
      const list: KpiCbqlAuditLog[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as KpiCbqlAuditLog);
      });
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      onUpdate(list);
    }, (err) => {
      console.warn('subscribeCbqlAuditLogs error:', err);
      onUpdate([]);
    });
  } catch {
    onUpdate([]);
    return () => {};
  }
}

/**
 * 3. AUDIT LOGGING HELPER
 */
export async function logCbqlAction(
  action: KpiCbqlAuditLog['action'],
  performedBy: string,
  performedByName: string,
  performedByRole: string,
  details: string,
  formId?: string,
  previousStatus?: string,
  newStatus?: string,
  metadata?: Record<string, any>
) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logEntry: KpiCbqlAuditLog = {
      id: logId,
      formId: formId || undefined,
      action,
      performedBy,
      performedByName,
      performedByRole,
      timestamp: new Date().toISOString(),
      details,
      previousStatus: previousStatus || undefined,
      newStatus: newStatus || undefined,
      metadata: metadata || undefined
    };
    await setDoc(doc(db, CBQL_COLLECTIONS.AUDIT_LOGS, logId), cleanFirestoreData(logEntry));
  } catch (err) {
    console.warn('Could not record CBQL audit log:', err);
  }
}

/**
 * 4. UNIQUE CONSTRAINT CHECK
 * Kiểm tra xem CBQL đã có phiếu trong kỳ đánh giá này chưa
 */
export async function checkCbqlFormExists(evaluateeId: string, periodId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, CBQL_COLLECTIONS.FORMS),
      where('evaluateeId', '==', evaluateeId),
      where('periodId', '==', periodId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.warn('Error checking existing form:', err);
    return false;
  }
}

/**
 * 5. FORM CRUD OPERATIONS
 */

// Tạo phiếu mới
export async function createCbqlForm(
  formData: Omit<KpiCbqlForm, 'id' | 'createdAt'>,
  user: { id: string; name: string; role?: string }
): Promise<string> {
  // Validate unique constraint
  const exists = await checkCbqlFormExists(formData.evaluateeId, formData.periodId);
  if (exists) {
    throw new Error(`Cán bộ quản lý ${formData.evaluateeName} đã có phiếu đánh giá cho ${formData.periodName}. Mỗi cán bộ chỉ được tạo 01 phiếu trong một kỳ!`);
  }

  const formId = `cbql_${formData.periodId}_${formData.evaluateeId}`;
  const now = new Date().toISOString();
  
  const newForm: KpiCbqlForm = {
    ...formData,
    id: formId,
    createdAt: now,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(newForm);
  await setDoc(doc(db, CBQL_COLLECTIONS.FORMS, formId), safeData);

  // Update local cache immediately
  const cachedForms = getCbqlFormsCache();
  const existingIdx = cachedForms.findIndex(f => f.id === formId);
  if (existingIdx >= 0) {
    cachedForms[existingIdx] = newForm;
  } else {
    cachedForms.unshift(newForm);
  }
  saveCbqlFormsCache(cachedForms);

  // Ghi log
  await logCbqlAction(
    'create_form',
    user.id,
    user.name,
    user.role || 'CBQL',
    `Tạo phiếu đánh giá KPI CBQL cho ${formData.evaluateeName} - Kỳ: ${formData.periodName}`,
    formId,
    undefined,
    formData.status
  );

  return formId;
}

// Cập nhật phần tự đánh giá
export async function saveCbqlSelfEvaluation(
  formId: string,
  updates: Partial<KpiCbqlForm>,
  user: { id: string; name: string; role?: string }
) {
  const formRef = doc(db, CBQL_COLLECTIONS.FORMS, formId);
  const now = new Date().toISOString();
  
  const payload = {
    ...updates,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await updateDoc(formRef, safeData);

  await logCbqlAction(
    'save_self_evaluation',
    user.id,
    user.name,
    user.role || 'CBQL',
    `Lưu bản tự đánh giá (Điểm tự chấm: ${updates.selfTotalScore ?? 'N/A'})`,
    formId
  );
}

// Gửi phiếu lên cấp trên đánh giá (Chuyển sang pending_evaluation)
export async function submitCbqlForm(
  formId: string,
  updates: Partial<KpiCbqlForm>,
  user: { id: string; name: string; role?: string }
) {
  const formRef = doc(db, CBQL_COLLECTIONS.FORMS, formId);
  const now = new Date().toISOString();
  
  const payload = {
    ...updates,
    status: 'pending_evaluation' as const,
    submittedAt: now,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await updateDoc(formRef, safeData);

  await logCbqlAction(
    'submit_form',
    user.id,
    user.name,
    user.role || 'CBQL',
    `Gửi phiếu đánh giá cho thủ trưởng/người đánh giá: ${updates.evaluatorName || 'Cấp trên'} (Điểm tự chấm: ${updates.selfTotalScore ?? 'N/A'})`,
    formId,
    'draft',
    'pending_evaluation'
  );
}

// Thủ trưởng / Người đánh giá chấm điểm
export async function evaluateCbqlForm(
  formId: string,
  updates: Partial<KpiCbqlForm>,
  user: { id: string; name: string; role?: string }
) {
  const formRef = doc(db, CBQL_COLLECTIONS.FORMS, formId);
  const now = new Date().toISOString();
  
  const payload = {
    ...updates,
    status: 'evaluated' as const,
    evaluatedAt: now,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await updateDoc(formRef, safeData);

  await logCbqlAction(
    'evaluate',
    user.id,
    user.name,
    user.role || 'Thủ trưởng',
    `Thủ trưởng đánh giá phiếu (Điểm đánh giá: ${updates.evaluatorTotalScore ?? 'N/A'}, Xếp loại: ${updates.grade ?? 'N/A'})`,
    formId,
    'pending_evaluation',
    'evaluated'
  );
}

// Chốt phiếu (Khóa hoàn thành)
export async function lockCbqlForm(
  formId: string,
  user: { id: string; name: string; role?: string }
) {
  const formRef = doc(db, CBQL_COLLECTIONS.FORMS, formId);
  const now = new Date().toISOString();
  
  const payload = {
    status: 'locked' as const,
    lockedAt: now,
    lockedBy: user.name,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await updateDoc(formRef, safeData);

  await logCbqlAction(
    'lock_form',
    user.id,
    user.name,
    user.role || 'BGH',
    `Chốt kết quả đánh giá KPI CBQL, khóa phiếu không cho sửa đổi`,
    formId,
    'evaluated',
    'locked'
  );
}

// Mở khóa phiếu (Dành cho Admin / BGH)
export async function unlockCbqlForm(
  formId: string,
  user: { id: string; name: string; role?: string },
  reason?: string
) {
  const formRef = doc(db, CBQL_COLLECTIONS.FORMS, formId);
  const now = new Date().toISOString();
  
  const payload = {
    status: 'evaluated' as const,
    unlockedAt: now,
    unlockedBy: user.name,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await updateDoc(formRef, safeData);

  await logCbqlAction(
    'unlock_form',
    user.id,
    user.name,
    user.role || 'Admin',
    `Mở khóa phiếu đánh giá để chỉnh sửa bổ sung. Lý do: ${reason || 'Yêu cầu điều chỉnh'}`,
    formId,
    'locked',
    'evaluated'
  );
}

// Xóa phiếu (Dành cho Admin hoặc bản nháp)
export async function deleteCbqlForm(
  formId: string,
  user: { id: string; name: string; role?: string }
) {
  await deleteDoc(doc(db, CBQL_COLLECTIONS.FORMS, formId));

  await logCbqlAction(
    'delete_form',
    user.id,
    user.name,
    user.role || 'Admin',
    `Xóa phiếu đánh giá ID: ${formId}`,
    formId
  );
}

/**
 * 6. QUẢN LÝ KỲ ĐÁNH GIÁ (PERIODS)
 */
export async function saveCbqlPeriod(
  period: KpiCbqlPeriod,
  user: { id: string; name: string; role?: string }
) {
  const isNew = !period.id;
  const id = period.id || `period_${Date.now()}`;
  const now = new Date().toISOString();
  
  const payload: KpiCbqlPeriod = {
    ...period,
    id,
    createdAt: period.createdAt || now,
    createdBy: period.createdBy || user.id,
    updatedAt: now
  };

  const safeData = cleanFirestoreData(payload);
  await setDoc(doc(db, CBQL_COLLECTIONS.PERIODS, id), safeData);

  await logCbqlAction(
    'update_period',
    user.id,
    user.name,
    user.role || 'Admin',
    `${isNew ? 'Thêm mới' : 'Cập nhật'} kỳ đánh giá: ${period.name} (${period.academicYear})`,
    undefined
  );
}

export async function deleteCbqlPeriod(
  periodId: string,
  user: { id: string; name: string; role?: string }
) {
  await deleteDoc(doc(db, CBQL_COLLECTIONS.PERIODS, periodId));

  await logCbqlAction(
    'update_period',
    user.id,
    user.name,
    user.role || 'Admin',
    `Xóa kỳ đánh giá ID: ${periodId}`,
    undefined
  );
}

/**
 * 7. QUẢN LÝ TIÊU CHÍ (CRITERIA)
 */
export async function saveCbqlCriterion(
  criterion: KpiCbqlCriterion,
  user: { id: string; name: string; role?: string }
) {
  const isNew = !criterion.id;
  const id = criterion.id || `cbql_${Date.now()}`;
  
  const safeData = cleanFirestoreData({
    ...criterion,
    id
  });
  await setDoc(doc(db, CBQL_COLLECTIONS.CRITERIA, id), safeData);

  await logCbqlAction(
    'update_criteria',
    user.id,
    user.name,
    user.role || 'Admin',
    `${isNew ? 'Thêm' : 'Sửa'} tiêu chí ${criterion.code}: ${criterion.name} (Tối đa: ${criterion.maxScore}đ)`
  );
}
