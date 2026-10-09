import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  KpiStaffForm, 
  KpiStaffPeriod, 
  KpiStaffCriterion, 
  KpiStaffCriteriaGroup 
} from '../types/kpiStaff';
import { 
  DEFAULT_STAFF_GROUPS, 
  DEFAULT_STAFF_CRITERIA, 
  DEFAULT_STAFF_PERIODS 
} from '../lib/kpiStaffData';

export const cleanFirestoreData = <T extends Record<string, any>>(data: T): Record<string, any> => {
  const cleanDeep = (val: any): any => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === 'number') {
      return Number.isNaN(val) ? 0 : val;
    }
    if (Array.isArray(val)) {
      return val.map(cleanDeep).filter(item => item !== undefined);
    }
    if (typeof val === 'object' && !(val instanceof Date)) {
      const cleanedObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          const cv = cleanDeep(v);
          if (cv !== undefined) cleanedObj[k] = cv;
        }
      }
      return cleanedObj;
    }
    return val;
  };
  return (cleanDeep(data) || {}) as Record<string, any>;
};

export const STAFF_COLLECTIONS = {
  FORMS: 'kpi_staff_forms',
  PERIODS: 'kpi_staff_periods',
  CRITERIA: 'kpi_staff_criteria',
  GROUPS: 'kpi_staff_groups'
};

const STAFF_FORMS_CACHE_KEY = 'kpi_staff_forms_cache';

// Periods Cache Helpers
const STAFF_PERIODS_CACHE_KEY = 'kpi_staff_periods_cache';

export const loadStaffPeriodsFromCache = (): KpiStaffPeriod[] => {
  try {
    const raw = localStorage.getItem(STAFF_PERIODS_CACHE_KEY);
    if (!raw) return DEFAULT_STAFF_PERIODS;
    const cached: KpiStaffPeriod[] = JSON.parse(raw);
    if (!Array.isArray(cached) || cached.length === 0) return DEFAULT_STAFF_PERIODS;
    
    // Check if any default period from 2026-2027 is missing
    const cachedIds = new Set(cached.map(p => p.id));
    const missing = DEFAULT_STAFF_PERIODS.filter(p => !cachedIds.has(p.id));
    if (missing.length > 0) {
      const merged = [...cached, ...missing];
      saveStaffPeriodsToCache(merged);
      return merged;
    }
    return cached;
  } catch {
    return DEFAULT_STAFF_PERIODS;
  }
};

export const saveStaffPeriodsToCache = (periods: KpiStaffPeriod[]) => {
  try {
    localStorage.setItem(STAFF_PERIODS_CACHE_KEY, JSON.stringify(periods));
  } catch (err) {
    console.error('Failed saving staff periods to cache:', err);
  }
};

export const subscribeStaffPeriods = (callback: (periods: KpiStaffPeriod[]) => void) => {
  try {
    const colRef = collection(db, STAFF_COLLECTIONS.PERIODS);
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // Seed initial periods if empty
        DEFAULT_STAFF_PERIODS.forEach(p => saveStaffPeriodToFirestore(p));
        saveStaffPeriodsToCache(DEFAULT_STAFF_PERIODS);
        callback(DEFAULT_STAFF_PERIODS);
      } else {
        const periodsList: KpiStaffPeriod[] = [];
        snapshot.forEach(docSnap => {
          periodsList.push({ id: docSnap.id, ...docSnap.data() } as KpiStaffPeriod);
        });

        // Ensure all default 2026-2027 periods (Kỳ I, Kỳ II, Cả năm & 12 tháng) are present
        const existingIds = new Set(periodsList.map(p => p.id));
        const missingDefaults = DEFAULT_STAFF_PERIODS.filter(dp => !existingIds.has(dp.id));
        if (missingDefaults.length > 0) {
          missingDefaults.forEach(dp => {
            saveStaffPeriodToFirestore(dp);
            periodsList.push(dp);
          });
        }

        saveStaffPeriodsToCache(periodsList);
        callback(periodsList);
      }
    }, (err) => {
      console.warn('Firestore subscription warning for staff periods:', err);
      callback(loadStaffPeriodsFromCache());
    });
  } catch (err) {
    console.warn('Firestore subscription fallback for staff periods:', err);
    callback(loadStaffPeriodsFromCache());
    return () => {};
  }
};

export const saveStaffPeriodToFirestore = async (period: KpiStaffPeriod) => {
  const docRef = doc(db, STAFF_COLLECTIONS.PERIODS, period.id);
  await setDoc(docRef, cleanFirestoreData(period), { merge: true });
};

export const deleteStaffPeriodFromFirestore = async (periodId: string) => {
  await deleteDoc(doc(db, STAFF_COLLECTIONS.PERIODS, periodId));
};

// Criteria Cache Helpers
const STAFF_CRITERIA_CACHE_KEY = 'kpi_staff_criteria_cache';

export const loadStaffCriteriaFromCache = (): KpiStaffCriterion[] => {
  try {
    const raw = localStorage.getItem(STAFF_CRITERIA_CACHE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_STAFF_CRITERIA;
  } catch {
    return DEFAULT_STAFF_CRITERIA;
  }
};

export const saveStaffCriteriaToCache = (criteria: KpiStaffCriterion[]) => {
  try {
    localStorage.setItem(STAFF_CRITERIA_CACHE_KEY, JSON.stringify(criteria));
  } catch (err) {
    console.error('Failed saving staff criteria to cache:', err);
  }
};

export const subscribeStaffCriteria = (callback: (criteria: KpiStaffCriterion[]) => void) => {
  try {
    const colRef = collection(db, STAFF_COLLECTIONS.CRITERIA);
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_STAFF_CRITERIA.forEach(c => saveStaffCriterionToFirestore(c));
        callback(DEFAULT_STAFF_CRITERIA);
      } else {
        const criteriaList: KpiStaffCriterion[] = [];
        snapshot.forEach(docSnap => {
          criteriaList.push({ id: docSnap.id, ...docSnap.data() } as KpiStaffCriterion);
        });
        criteriaList.sort((a, b) => a.order - b.order);
        saveStaffCriteriaToCache(criteriaList);
        callback(criteriaList);
      }
    }, (err) => {
      console.warn('Firestore subscription warning for staff criteria:', err);
      callback(loadStaffCriteriaFromCache());
    });
  } catch (err) {
    console.warn('Firestore subscription fallback for staff criteria:', err);
    callback(loadStaffCriteriaFromCache());
    return () => {};
  }
};

export const saveStaffCriterionToFirestore = async (criterion: KpiStaffCriterion) => {
  const docRef = doc(db, STAFF_COLLECTIONS.CRITERIA, criterion.id);
  await setDoc(docRef, cleanFirestoreData(criterion), { merge: true });
};

export const deleteStaffCriterionFromFirestore = async (criterionId: string) => {
  await deleteDoc(doc(db, STAFF_COLLECTIONS.CRITERIA, criterionId));
};

export const loadStaffFormsFromCache = (): KpiStaffForm[] => {
  try {
    const raw = localStorage.getItem(STAFF_FORMS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStaffFormsToCache = (forms: KpiStaffForm[]) => {
  try {
    localStorage.setItem(STAFF_FORMS_CACHE_KEY, JSON.stringify(forms));
  } catch (err) {
    console.error('Failed saving staff forms to localStorage cache:', err);
  }
};

export const subscribeStaffForms = (callback: (forms: KpiStaffForm[]) => void) => {
  try {
    const colRef = collection(db, STAFF_COLLECTIONS.FORMS);
    return onSnapshot(colRef, (snapshot) => {
      const formsList: KpiStaffForm[] = [];
      snapshot.forEach(docSnap => {
        formsList.push(docSnap.data() as KpiStaffForm);
      });
      saveStaffFormsToCache(formsList);
      callback(formsList);
    }, (err) => {
      console.warn('Firestore subscription warning for staff forms:', err);
      callback(loadStaffFormsFromCache());
    });
  } catch (err) {
    console.warn('Firestore subscription fallback for staff forms:', err);
    callback(loadStaffFormsFromCache());
    return () => {};
  }
};

export const saveStaffFormToFirestore = async (form: KpiStaffForm) => {
  try {
    const docRef = doc(db, STAFF_COLLECTIONS.FORMS, form.id);
    await setDoc(docRef, cleanFirestoreData(form), { merge: true });
  } catch (err) {
    console.error('Error saving staff form to Firestore:', err);
  }
};

export const deleteStaffFormFromFirestore = async (formId: string) => {
  try {
    await deleteDoc(doc(db, STAFF_COLLECTIONS.FORMS, formId));
  } catch (err) {
    console.error('Error deleting staff form from Firestore:', err);
  }
};

export const deleteAllStaffFormsFromFirestore = async (periodId?: string): Promise<number> => {
  try {
    const colRef = collection(db, STAFF_COLLECTIONS.FORMS);
    const snapshot = await getDocs(colRef);
    let deletedCount = 0;

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as KpiStaffForm;
      if (!periodId || periodId === 'all' || data.periodId === periodId) {
        deletePromises.push(deleteDoc(docSnap.ref));
        deletedCount++;
      }
    });

    await Promise.all(deletePromises);

    // Update localStorage cache
    const currentForms = loadStaffFormsFromCache();
    const remainingForms = currentForms.filter(f => periodId && periodId !== 'all' ? f.periodId !== periodId : false);
    saveStaffFormsToCache(remainingForms);

    return deletedCount;
  } catch (err) {
    console.error('Error deleting all staff forms from Firestore:', err);
    return 0;
  }
};
