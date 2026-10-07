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
