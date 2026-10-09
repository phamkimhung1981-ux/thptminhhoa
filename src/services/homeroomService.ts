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
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  ClassInfo,
  Student,
  HomeroomAssignment,
  ConductCategory,
  ConductCriterion,
  ConductRecord,
  ConductEvaluation,
  ConductSettings,
  SeriousViolationConfig,
  TeacherAssessment,
  EvaluationRatingConfig,
  EvaluationRatingConfigHistory,
  RatingTierItem,
  EvaluationPeriodScopeType,
  TeacherAssessmentCompletion
} from '../types/homeroom';
import {
  DEFAULT_CONDUCT_CATEGORIES,
  DEFAULT_CONDUCT_CRITERIA,
  DEFAULT_CLASSES,
  SAMPLE_STUDENTS,
  DEFAULT_CONDUCT_SETTINGS,
  DEFAULT_SERIOUS_VIOLATION_CONFIGS,
  DEFAULT_RATING_TIERS
} from '../lib/homeroomData';

const sanitize = <T extends Record<string, any>>(data: T): T => {
  const result = { ...data };
  for (const key in result) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Homeroom Error: ', JSON.stringify(errInfo));
}

let hasSeeded = false;

export const homeroomService = {
  // 1. SEED DEFAULT DATA IF EMPTY
  async seedIfEmpty() {
    if (hasSeeded) return;
    hasSeeded = true;
    try {
      // Seed Categories
      const catCol = collection(db, 'conduct_categories');
      const catSnap = await getDocs(catCol);
      if (catSnap.empty) {
        const batch = writeBatch(db);
        DEFAULT_CONDUCT_CATEGORIES.forEach(c => {
          batch.set(doc(db, 'conduct_categories', c.id), sanitize(c));
        });
        await batch.commit();
      }

      // Seed Criteria
      const critCol = collection(db, 'conduct_criteria');
      const critSnap = await getDocs(critCol);
      if (critSnap.empty) {
        const batch = writeBatch(db);
        DEFAULT_CONDUCT_CRITERIA.forEach(c => {
          batch.set(doc(db, 'conduct_criteria', c.id), sanitize(c));
        });
        await batch.commit();
      }

      // Seed Classes
      const clsCol = collection(db, 'classes');
      const clsSnap = await getDocs(clsCol);
      if (clsSnap.empty) {
        const batch = writeBatch(db);
        DEFAULT_CLASSES.forEach(c => {
          batch.set(doc(db, 'classes', c.id), sanitize(c));
        });
        await batch.commit();
      }

      // Seed Students: Do NOT auto-seed fake sample students (Requirement 13)
      // Empty classes remain empty until user imports real Excel files.

      // Seed Homeroom Assignments
      const assignCol = collection(db, 'homeroom_assignments');
      const assignSnap = await getDocs(assignCol);
      if (assignSnap.empty) {
        const sampleAssignments: HomeroomAssignment[] = [
          { id: 'assign_1', teacherId: 't1', teacherName: 'Nguyễn Thị A', classId: 'class_10a1', className: '10A1', schoolYear: '2026–2027', startDate: '2026-09-01', status: 'active' },
          { id: 'assign_2', teacherId: 't2', teacherName: 'Trần Văn B', classId: 'class_10a2', className: '10A2', schoolYear: '2026–2027', startDate: '2026-09-01', status: 'active' },
          { id: 'assign_3', teacherId: 't3', teacherName: 'Lê Thị C', classId: 'class_10a3', className: '10A3', schoolYear: '2026–2027', startDate: '2026-09-01', status: 'active' }
        ];
        const batch = writeBatch(db);
        sampleAssignments.forEach(a => {
          batch.set(doc(db, 'homeroom_assignments', a.id), sanitize(a));
        });
        await batch.commit();
      }

      // Seed Settings
      const setCol = collection(db, 'conduct_settings');
      const setSnap = await getDocs(setCol);
      if (setSnap.empty) {
        await setDoc(doc(db, 'conduct_settings', DEFAULT_CONDUCT_SETTINGS.id), sanitize(DEFAULT_CONDUCT_SETTINGS));
      }

      // Seed Serious Violation Configs
      const vioCol = collection(db, 'serious_violation_configs');
      const vioSnap = await getDocs(vioCol);
      if (vioSnap.empty) {
        const batch = writeBatch(db);
        DEFAULT_SERIOUS_VIOLATION_CONFIGS.forEach(v => {
          batch.set(doc(db, 'serious_violation_configs', v.id), sanitize(v));
        });
        await batch.commit();
      }

      // Seed Default Rating Config
      const ratingCol = collection(db, 'evaluation_rating_configs');
      const ratingSnap = await getDocs(ratingCol);
      if (ratingSnap.empty) {
        const defaultRatingConfig: EvaluationRatingConfig = {
          id: 'rating_config_default_2026_2027',
          school_id: 'thpt_minh_hoa',
          name: 'Cấu hình xếp loại rèn luyện chuẩn (2026–2027)',
          school_year: '2026–2027',
          evaluation_period_type: 'all',
          evaluation_period_id: 'all',
          tiers: DEFAULT_RATING_TIERS,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'Hệ thống',
          updated_by: 'Hệ thống'
        };
        await setDoc(doc(db, 'evaluation_rating_configs', defaultRatingConfig.id), sanitize(defaultRatingConfig));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'homeroom_seed');
    }
  },

  // 2. LISTENERS FOR REAL-TIME SYNC
  async getClasses(): Promise<ClassInfo[]> {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        let classesList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassInfo));

        // Ensure 12I exists or has GVCN Hà Thị Thúy
        const has12I = classesList.some(c => c.name.toUpperCase() === '12I' || c.id === 'class_12i');
        if (!has12I) {
          const class12I: ClassInfo = {
            id: 'class_12i',
            name: '12I',
            grade: 12,
            schoolYear: '2026–2027',
            homeroomTeacherId: 't_hathithuy',
            homeroomTeacherName: 'Hà Thị Thúy',
            room: 'Phòng 309',
            totalStudents: 40,
            status: 'active'
          };
          classesList.push(class12I);
          // Persist to Firestore asynchronously
          try {
            setDoc(doc(db, 'classes', 'class_12i'), sanitize(class12I));
          } catch (e) {
            // ignore
          }
        } else {
          // If 12I has empty homeroomTeacherName, set to Hà Thị Thúy
          classesList = classesList.map(c => {
            if ((c.name.toUpperCase() === '12I' || c.id === 'class_12i') && (!c.homeroomTeacherName || c.homeroomTeacherName === '—')) {
              const updated = { ...c, homeroomTeacherName: 'Hà Thị Thúy', homeroomTeacherId: 't_hathithuy' };
              try {
                updateDoc(doc(db, 'classes', c.id), { homeroomTeacherName: 'Hà Thị Thúy', homeroomTeacherId: 't_hathithuy' });
              } catch (e) {
                // ignore
              }
              return updated;
            }
            return c;
          });
        }

        return classesList.sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.warn('Firestore getClasses error, fallback to defaults:', e);
    }
    return DEFAULT_CLASSES;
  },

  async getAssignments(): Promise<HomeroomAssignment[]> {
    try {
      const snap = await getDocs(collection(db, 'homeroom_assignments'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeroomAssignment));
      }
    } catch (e) {
      console.warn('Firestore getAssignments error:', e);
    }
    return [
      {
        id: 'assign_12i',
        teacherId: 't_hathithuy',
        teacherName: 'Hà Thị Thúy',
        classId: 'class_12i',
        className: '12I',
        schoolYear: '2026–2027',
        startDate: '2026-09-01',
        status: 'active'
      }
    ];
  },

  async getStudents(): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(db, 'students'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      }
    } catch (e) {
      console.warn('Firestore getStudents error:', e);
    }
    return [];
  },

  subscribeClasses(callback: (classes: ClassInfo[]) => void) {
    const q = collection(db, 'classes');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassInfo));
      callback(data.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'classes'));
  },

  subscribeStudents(callback: (students: Student[]) => void) {
    const q = collection(db, 'students');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      callback(data.sort((a, b) => {
        if (a.stt !== undefined && b.stt !== undefined && a.stt !== null && b.stt !== null) {
          const numA = Number(a.stt);
          const numB = Number(b.stt);
          if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        }
        return (a.name || '').localeCompare(b.name || '', 'vi-VN');
      }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'students'));
  },

  subscribeAssignments(callback: (assignments: HomeroomAssignment[]) => void) {
    const q = collection(db, 'homeroom_assignments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HomeroomAssignment));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'homeroom_assignments'));
  },

  subscribeCategories(callback: (categories: ConductCategory[]) => void) {
    const q = collection(db, 'conduct_categories');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConductCategory));
      callback(data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conduct_categories'));
  },

  subscribeCriteria(callback: (criteria: ConductCriterion[]) => void) {
    const q = collection(db, 'conduct_criteria');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConductCriterion));
      callback(data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conduct_criteria'));
  },

  subscribeRecords(callback: (records: ConductRecord[]) => void) {
    const q = collection(db, 'conduct_records');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConductRecord));
      callback(data.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conduct_records'));
  },

  subscribeEvaluations(callback: (evaluations: ConductEvaluation[]) => void) {
    const q = collection(db, 'conduct_evaluations');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConductEvaluation));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conduct_evaluations'));
  },

  subscribeSettings(callback: (settings: ConductSettings) => void) {
    const q = collection(db, 'conduct_settings');
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        callback({ id: d.id, ...d.data() } as ConductSettings);
      } else {
        callback(DEFAULT_CONDUCT_SETTINGS);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conduct_settings'));
  },

  // 3. CRUD ACTIONS FOR CONDUCT RECORDS
  async addConductRecord(record: Omit<ConductRecord, 'id' | 'createdAt'>) {
    try {
      const id = `crec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRecord: ConductRecord = {
        ...record,
        id,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'conduct_records', id), sanitize(newRecord));
      return newRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'conduct_records');
      throw err;
    }
  },

  async updateConductRecord(id: string, data: Partial<ConductRecord>) {
    try {
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'conduct_records', id), sanitize(updateData));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'conduct_records');
      throw err;
    }
  },

  async deleteConductRecord(id: string) {
    try {
      await deleteDoc(doc(db, 'conduct_records', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'conduct_records');
      throw err;
    }
  },

  // 4. CRUD ACTIONS FOR CONDUCT CRITERIA
  async addCriterion(criterion: Omit<ConductCriterion, 'id'>) {
    try {
      const id = `crit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newCrit: ConductCriterion = { ...criterion, id };
      await setDoc(doc(db, 'conduct_criteria', id), sanitize(newCrit));
      return newCrit;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'conduct_criteria');
      throw err;
    }
  },

  async updateCriterion(id: string, data: Partial<ConductCriterion>) {
    try {
      await updateDoc(doc(db, 'conduct_criteria', id), sanitize(data));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'conduct_criteria');
      throw err;
    }
  },

  async deleteCriterion(id: string) {
    try {
      await deleteDoc(doc(db, 'conduct_criteria', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'conduct_criteria');
      throw err;
    }
  },

  // 5. CRUD ACTIONS FOR CONDUCT EVALUATIONS
  async saveEvaluation(evaluation: Omit<ConductEvaluation, 'id' | 'createdAt'> & { id?: string }) {
    try {
      const id = evaluation.id || `eval_${evaluation.studentId}_${evaluation.period.replace(/\s+/g, '_')}_${evaluation.schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const payload: ConductEvaluation = {
        ...evaluation,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'conduct_evaluations', id), sanitize(payload), { merge: true });
      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'conduct_evaluations');
      throw err;
    }
  },

  async updateEvaluationStatus(id: string, updates: Partial<ConductEvaluation>) {
    try {
      await updateDoc(doc(db, 'conduct_evaluations', id), sanitize({ ...updates, updatedAt: new Date().toISOString() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'conduct_evaluations');
      throw err;
    }
  },

  // 6. SETTINGS & HOMEROOM ASSIGNMENTS
  async saveSettings(settings: ConductSettings) {
    try {
      await setDoc(doc(db, 'conduct_settings', settings.id || 'default_conduct_settings'), sanitize(settings), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'conduct_settings');
      throw err;
    }
  },

  async saveAssignment(assignment: Omit<HomeroomAssignment, 'id'> & { id?: string }) {
    try {
      const id = assignment.id || `assign_${Date.now()}`;
      const payload: HomeroomAssignment = { ...assignment, id };
      await setDoc(doc(db, 'homeroom_assignments', id), sanitize(payload), { merge: true });
      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'homeroom_assignments');
      throw err;
    }
  },

  async addStudent(student: Omit<Student, 'id'>) {
    try {
      const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const trimmedName = (student.name || '').trim();
      const payload: Student = {
        ...student,
        id,
        name: trimmedName,
        full_name: trimmedName,
        fullName: trimmedName,
        code: (student.code || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'students', id), sanitize(payload));

      // Sync class total
      if (student.classId) {
        const q = query(collection(db, 'students'), where('classId', '==', student.classId));
        const snap = await getDocs(q);
        await updateDoc(doc(db, 'classes', student.classId), { totalStudents: snap.size });
      }

      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'students');
      throw err;
    }
  },

  /**
   * Smart Upsert Students Bulk from Excel
   * - Uses student code as unique identifier
   * - If student exists -> UPDATE existing record (keeps existing student.id to preserve all records and evaluations)
   * - If student does not exist -> INSERT new record
   * - Accurately updates class totalStudents in database
   */
  async upsertStudentsBulk(
    studentsList: Array<Omit<Student, 'id'> & { id?: string }>,
    defaultClassId?: string,
    defaultClassName?: string
  ): Promise<{
    totalProcessed: number;
    newCount: number;
    updatedCount: number;
    byClass: Record<string, number>;
  }> {
    try {
      if (!studentsList || studentsList.length === 0) {
        return { totalProcessed: 0, newCount: 0, updatedCount: 0, byClass: {} };
      }

      // 1. Fetch all classes to resolve target class IDs by class name
      const clsSnap = await getDocs(collection(db, 'classes'));
      const classesList: ClassInfo[] = clsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassInfo));
      const classMapByName = new Map<string, ClassInfo>();
      const classMapById = new Map<string, ClassInfo>();
      classesList.forEach(c => {
        if (c.name) classMapByName.set(c.name.trim().toLowerCase(), c);
        classMapById.set(c.id, c);
      });

      // 2. Fetch all existing students to perform upsert indexing
      const stdSnap = await getDocs(collection(db, 'students'));
      const existingStudents: Student[] = stdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

      const existingByCode = new Map<string, Student>();
      const existingByNameAndClass = new Map<string, Student>();

      existingStudents.forEach(s => {
        if (s.code) {
          existingByCode.set(s.code.trim().toLowerCase(), s);
        }
        if (s.name && s.classId) {
          const key = `${s.classId}::${s.name.trim().toLowerCase()}`;
          existingByNameAndClass.set(key, s);
        }
      });

      let newCount = 0;
      let updatedCount = 0;
      const byClassSummary: Record<string, number> = {};
      const affectedClassIds = new Set<string>();

      // Track operations to perform
      const operations: Array<{ docId: string; payload: Student; isUpdate: boolean }> = [];

      studentsList.forEach((s, idx) => {
        const rawName = (s.name || '').trim();
        const rawCode = (s.code || '').trim();
        const rawClassName = (s.className || defaultClassName || '').trim();

        // Resolve target class
        let targetClassId = s.classId || defaultClassId || '';
        let targetClassName = rawClassName;

        if (rawClassName) {
          const matchedCls = classMapByName.get(rawClassName.toLowerCase());
          if (matchedCls) {
            targetClassId = matchedCls.id;
            targetClassName = matchedCls.name;
          }
        }

        if (targetClassId) affectedClassIds.add(targetClassId);
        byClassSummary[targetClassName || 'Chưa phân lớp'] = (byClassSummary[targetClassName || 'Chưa phân lớp'] || 0) + 1;

        // Check if student already exists in DB
        let existing: Student | undefined = undefined;
        if (rawCode) {
          existing = existingByCode.get(rawCode.toLowerCase());
        }
        if (!existing && targetClassId && rawName) {
          existing = existingByNameAndClass.get(`${targetClassId}::${rawName.toLowerCase()}`);
        }

        if (existing) {
          // UPDATE EXISTING RECORD: Keep existing.id so all records/evaluations are preserved
          const updatedPayload: Student = {
            ...existing,
            classId: targetClassId || existing.classId,
            className: targetClassName || existing.className,
            code: rawCode || existing.code,
            name: rawName || existing.name,
            full_name: rawName || existing.name,
            fullName: rawName || existing.name,
            gender: s.gender || existing.gender || 'Nam',
            dob: s.dob || existing.dob,
            stt: s.stt !== undefined ? s.stt : existing.stt,
            parentPhone: s.parentPhone || existing.parentPhone,
            parentName: s.parentName || existing.parentName,
            address: s.address || existing.address,
            updatedAt: new Date().toISOString()
          };
          operations.push({ docId: existing.id, payload: updatedPayload, isUpdate: true });
          updatedCount++;
        } else {
          // INSERT NEW RECORD
          const newId = s.id || `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          const newPayload: Student = {
            id: newId,
            classId: targetClassId,
            className: targetClassName,
            code: rawCode || `HS${String(idx + 1).padStart(3, '0')}`,
            name: rawName,
            full_name: rawName,
            fullName: rawName,
            gender: s.gender || 'Nam',
            dob: s.dob || '2009-01-01',
            stt: s.stt !== undefined ? s.stt : idx + 1,
            parentPhone: s.parentPhone,
            parentName: s.parentName,
            address: s.address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          operations.push({ docId: newId, payload: newPayload, isUpdate: false });
          // Index this new student for subsequent rows in same import
          if (rawCode) existingByCode.set(rawCode.toLowerCase(), newPayload);
          if (targetClassId && rawName) existingByNameAndClass.set(`${targetClassId}::${rawName.toLowerCase()}`, newPayload);
          newCount++;
        }
      });

      // Commit batches (max 400 per batch)
      for (let i = 0; i < operations.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = operations.slice(i, i + 400);
        chunk.forEach(op => {
          batch.set(doc(db, 'students', op.docId), sanitize(op.payload), { merge: true });
        });
        await batch.commit();
      }

      // 3. Recalculate and update totalStudents in classes
      for (const cId of affectedClassIds) {
        const q = query(collection(db, 'students'), where('classId', '==', cId));
        const snap = await getDocs(q);
        await updateDoc(doc(db, 'classes', cId), { totalStudents: snap.size });
      }

      return {
        totalProcessed: studentsList.length,
        newCount,
        updatedCount,
        byClass: byClassSummary
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students_upsert_bulk');
      throw err;
    }
  },

  async addStudentsBulk(studentsList: Omit<Student, 'id'>[]) {
    return this.upsertStudentsBulk(studentsList);
  },

  async updateStudent(id: string, updates: Partial<Student>) {
    try {
      await updateDoc(doc(db, 'students', id), sanitize(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'students');
      throw err;
    }
  },

  async deleteStudent(id: string) {
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students');
      throw err;
    }
  },

  async deleteStudentsBulk(ids: string[], classId?: string) {
    try {
      if (ids.length === 0) return;
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = ids.slice(i, i + 400);
        chunk.forEach(id => {
          batch.delete(doc(db, 'students', id));
        });
        await batch.commit();
      }

      if (classId) {
        const q = query(collection(db, 'students'), where('classId', '==', classId));
        const snap = await getDocs(q);
        await updateDoc(doc(db, 'classes', classId), { totalStudents: snap.size });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students_bulk');
      throw err;
    }
  },

  /**
   * Save permanent A-B-C ranking and sorted STT order for a class into Firestore
   */
  async saveClassAbcRanking(
    classId: string,
    rankedStudents: Array<{
      id: string;
      stt: number;
      xepLoaiABC?: string;
      xep_loai_abc?: string;
      sortOrder?: number;
    }>,
    sortMode: string = 'name_asc'
  ): Promise<{ success: boolean; count: number }> {
    try {
      if (!rankedStudents || rankedStudents.length === 0) {
        return { success: true, count: 0 };
      }

      const now = new Date().toISOString();
      // Batch write up to 400 items per batch
      for (let i = 0; i < rankedStudents.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = rankedStudents.slice(i, i + 400);
        chunk.forEach(st => {
          const studentRef = doc(db, 'students', st.id);
          const updates: Partial<Student> = {
            stt: st.stt,
            sortOrder: st.sortOrder !== undefined ? st.sortOrder : st.stt,
            xepLoaiABC: st.xepLoaiABC,
            xep_loai_abc: st.xep_loai_abc || st.xepLoaiABC,
            updatedAt: now
          };
          batch.set(studentRef, sanitize(updates), { merge: true });
        });
        await batch.commit();
      }

      // Also persist the sort configuration and last timestamp on the class document if classId exists
      if (classId) {
        try {
          const classRef = doc(db, 'classes', classId);
          await setDoc(classRef, {
            preferredSortMode: sortMode,
            lastAbcRankedAt: now
          }, { merge: true });
        } catch (e) {
          // Non-critical if class doc doesn't exist
        }
      }

      return { success: true, count: rankedStudents.length };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students_save_abc_ranking');
      throw err;
    }
  },

  async syncAllClassStudentCounts() {
    try {
      const clsSnap = await getDocs(collection(db, 'classes'));
      const stdSnap = await getDocs(collection(db, 'students'));
      const students = stdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

      for (const cDoc of clsSnap.docs) {
        const clsData = cDoc.data() as ClassInfo;
        const count = students.filter(s => 
          s.classId === cDoc.id || 
          (s.className && clsData.name && s.className.trim().toLowerCase() === clsData.name.trim().toLowerCase())
        ).length;
        if (clsData.totalStudents !== count) {
          await updateDoc(cDoc.ref, { totalStudents: count });
        }
      }
    } catch (err) {
      console.error('Error syncing class student counts:', err);
    }
  },

  async deleteAllStudentsOfClass(classId: string, options?: { deleteRecordsAndAssessments?: boolean }) {
    try {
      if (!classId) return { deletedCount: 0 };

      // 1. Get all students of this class
      const q = query(collection(db, 'students'), where('classId', '==', classId));
      const snap = await getDocs(q);
      const studentIds = snap.docs.map(d => d.id);

      if (studentIds.length > 0) {
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = snap.docs.slice(i, i + 400);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // 2. Also clean up related conduct records, evaluations, teacher assessments
      if (options?.deleteRecordsAndAssessments !== false && studentIds.length > 0) {
        // Conduct records
        const recQuery = query(collection(db, 'conduct_records'), where('classId', '==', classId));
        const recSnap = await getDocs(recQuery);
        if (!recSnap.empty) {
          for (let i = 0; i < recSnap.docs.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = recSnap.docs.slice(i, i + 400);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }

        // Conduct evaluations
        const evalQuery = query(collection(db, 'conduct_evaluations'), where('classId', '==', classId));
        const evalSnap = await getDocs(evalQuery);
        if (!evalSnap.empty) {
          for (let i = 0; i < evalSnap.docs.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = evalSnap.docs.slice(i, i + 400);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }

        // Teacher assessments
        const taQuery = query(collection(db, 'teacher_assessments'), where('classId', '==', classId));
        const taSnap = await getDocs(taQuery);
        if (!taSnap.empty) {
          for (let i = 0; i < taSnap.docs.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = taSnap.docs.slice(i, i + 400);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }

      // 3. Update totalStudents in class
      try {
        await updateDoc(doc(db, 'classes', classId), { totalStudents: 0 });
      } catch (e) {
        // ignore if class doc missing
      }

      return { deletedCount: studentIds.length };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students_deleteAll');
      throw err;
    }
  },

  // 7. CLASS MANAGEMENT
  async addClass(classInfo: Omit<ClassInfo, 'id'>) {
    try {
      const slug = classInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const id = `class_${slug}_${Date.now()}`;
      const payload: ClassInfo = {
        name: classInfo.name.trim().toUpperCase(),
        grade: Number(classInfo.grade) || 10,
        schoolYear: classInfo.schoolYear || '2026–2027',
        homeroomTeacherId: classInfo.homeroomTeacherId || '',
        homeroomTeacherName: classInfo.homeroomTeacherName || '',
        room: classInfo.room || '',
        totalStudents: Number(classInfo.totalStudents) || 0,
        status: classInfo.status || 'active',
        id
      };
      await setDoc(doc(db, 'classes', id), sanitize(payload));

      // Also create a default homeroom assignment if teacher is assigned
      if (classInfo.homeroomTeacherName) {
        await this.saveAssignment({
          teacherId: classInfo.homeroomTeacherId || `teacher_${Date.now()}`,
          teacherName: classInfo.homeroomTeacherName,
          classId: id,
          className: classInfo.name,
          schoolYear: classInfo.schoolYear || '2026–2027',
          startDate: new Date().toISOString().split('T')[0],
          status: classInfo.status === 'inactive' ? 'inactive' : 'active'
        });
      }

      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
      throw err;
    }
  },

  async addClassesBulk(classesList: Omit<ClassInfo, 'id'>[]) {
    try {
      const batch = writeBatch(db);
      const created: ClassInfo[] = [];

      classesList.forEach((c, idx) => {
        const slug = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const id = `class_${slug}_${Date.now()}_${idx}`;
        const payload: ClassInfo = {
          name: c.name.trim().toUpperCase(),
          grade: Number(c.grade) || 10,
          schoolYear: c.schoolYear || '2026–2027',
          homeroomTeacherId: c.homeroomTeacherId || '',
          homeroomTeacherName: c.homeroomTeacherName || '',
          room: c.room || '',
          totalStudents: Number(c.totalStudents) || 0,
          status: c.status || 'active',
          id
        };
        batch.set(doc(db, 'classes', id), sanitize(payload));
        created.push(payload);
      });

      await batch.commit();
      return created;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'classes_bulk');
      throw err;
    }
  },

  async updateClass(id: string, updates: Partial<ClassInfo>) {
    try {
      await updateDoc(doc(db, 'classes', id), sanitize(updates));

      // Sync with homeroom_assignments
      if (
        updates.homeroomTeacherName !== undefined ||
        updates.homeroomTeacherId !== undefined ||
        updates.name !== undefined ||
        updates.status !== undefined ||
        updates.schoolYear !== undefined
      ) {
        const q = query(collection(db, 'homeroom_assignments'), where('classId', '==', id));
        const snap = await getDocs(q);
        const batch = writeBatch(db);

        if (updates.homeroomTeacherName === '') {
          // Unassigned: set any active assignments to inactive
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'active') {
              batch.update(docSnap.ref, {
                status: 'inactive',
                endDate: new Date().toISOString().split('T')[0]
              });
            }
          });
        } else if (updates.homeroomTeacherName) {
          // Assigned/Updated: update active or create new
          let hasActive = false;
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'active') {
              hasActive = true;
              batch.update(docSnap.ref, {
                teacherId: updates.homeroomTeacherId || data.teacherId,
                teacherName: updates.homeroomTeacherName,
                className: updates.name || data.className,
                schoolYear: updates.schoolYear || data.schoolYear || '2026–2027',
                status: updates.status === 'inactive' ? 'inactive' : 'active'
              });
            } else if (updates.name) {
              // Update name for inactive assignments too for historical correctness
              batch.update(docSnap.ref, { className: updates.name });
            }
          });

          if (!hasActive) {
            const assignId = `assign_${Date.now()}`;
            const newAssign = {
              id: assignId,
              teacherId: updates.homeroomTeacherId || `teacher_${Date.now()}`,
              teacherName: updates.homeroomTeacherName,
              classId: id,
              className: updates.name || '',
              schoolYear: updates.schoolYear || '2026–2027',
              startDate: new Date().toISOString().split('T')[0],
              status: updates.status === 'inactive' ? 'inactive' : 'active'
            };
            batch.set(doc(db, 'homeroom_assignments', assignId), sanitize(newAssign));
          }
        } else {
          // No teacher change but status or name changed
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const fieldUpdates: any = {};
            if (updates.name !== undefined) fieldUpdates.className = updates.name;
            if (updates.schoolYear !== undefined) fieldUpdates.schoolYear = updates.schoolYear;
            if (updates.status !== undefined) {
              fieldUpdates.status = updates.status;
              if (updates.status === 'inactive') {
                fieldUpdates.endDate = new Date().toISOString().split('T')[0];
              }
            }
            if (Object.keys(fieldUpdates).length > 0) {
              batch.update(docSnap.ref, fieldUpdates);
            }
          });
        }
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'classes');
      throw err;
    }
  },

  async deleteClass(id: string) {
    try {
      await deleteDoc(doc(db, 'classes', id));
      
      // Also delete related assignments
      const q = query(collection(db, 'homeroom_assignments'), where('classId', '==', id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // Also update related students to have empty classId
      const qStd = query(collection(db, 'students'), where('classId', '==', id));
      const snapStd = await getDocs(qStd);
      if (!snapStd.empty) {
        const batchStd = writeBatch(db);
        snapStd.docs.forEach((docSnap) => {
          batchStd.update(docSnap.ref, { classId: '' });
        });
        await batchStd.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'classes');
      throw err;
    }
  },

  // 10. SERIOUS VIOLATION CONFIGS CRUD
  subscribeViolationConfigs(callback: (configs: SeriousViolationConfig[]) => void) {
    const q = collection(db, 'serious_violation_configs');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SeriousViolationConfig));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'serious_violation_configs'));
  },

  async saveViolationConfig(config: SeriousViolationConfig) {
    try {
      const id = config.id || `cfg_${Date.now()}`;
      await setDoc(doc(db, 'serious_violation_configs', id), sanitize({ ...config, id }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'serious_violation_configs');
      throw err;
    }
  },

  async deleteViolationConfig(id: string) {
    try {
      await deleteDoc(doc(db, 'serious_violation_configs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'serious_violation_configs');
      throw err;
    }
  },

  // 11. BGH RECORD & EVALUATION APPROVAL
  async updateRecordBghApproval(
    recordId: string, 
    bghApprovalStatus: 'Chưa duyệt' | 'Đã duyệt' | 'Điều chỉnh' | 'Yêu cầu bổ sung',
    bghComment?: string,
    bghApprovedBy?: string,
    proposedRating?: string
  ) {
    try {
      const ref = doc(db, 'conduct_records', recordId);
      const payload: any = {
        bghApprovalStatus,
        bghComment: bghComment || '',
        bghApprovedBy: bghApprovedBy || 'BGH',
        bghApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (proposedRating) {
        payload.proposedRating = proposedRating;
      }
      await updateDoc(ref, sanitize(payload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'conduct_records');
      throw err;
    }
  },

  async updateEvaluationBghStatus(
    evaluationId: string,
    confirmationStatus: 'Chờ GVCN đánh giá' | 'Đã GVCN đánh giá' | 'Chờ BGH xác nhận' | 'Đã xác nhận' | 'Yêu cầu điều chỉnh',
    classification?: any,
    principalComment?: string,
    confirmedBy?: string
  ) {
    try {
      const ref = doc(db, 'conduct_evaluations', evaluationId);
      const updatePayload: any = {
        confirmationStatus,
        principalComment: principalComment || '',
        confirmedBy: confirmedBy || 'BGH',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (classification) {
        updatePayload.classification = classification;
      }
      await updateDoc(ref, sanitize(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'conduct_evaluations');
      throw err;
    }
  },

  // 12. RESET / DELETE ALL CONDUCT RESULTS BY EXACT SCOPE
  async clearConductData(options: {
    schoolYear: string;
    classId: string;
    weekNumber: number;
    monthNumber: number;
    monthLabel?: string;
    resetTeacherAssessments?: boolean;
    // Backward compatibility if called with old signature
    scope?: 'all' | 'class' | 'student';
    targetId?: string;
    deleteRecords?: boolean;
    deleteEvaluations?: boolean;
  }) {
    try {
      const {
        schoolYear,
        classId,
        weekNumber,
        monthNumber,
        monthLabel = `Tháng ${String(monthNumber).padStart(2, '0')}`,
        resetTeacherAssessments = true,
        scope,
        targetId
      } = options;

      let deletedRecordsCount = 0;
      let deletedEvaluationsCount = 0;
      let deletedAssessmentsCount = 0;

      const targetClassId = classId || (scope === 'class' ? targetId : '');

      if (targetClassId) {
        // 1. Delete conduct_records matching classId + schoolYear + weekNumber + monthNumber
        const recQuery = query(collection(db, 'conduct_records'), where('classId', '==', targetClassId));
        const recSnap = await getDocs(recQuery);
        if (!recSnap.empty) {
          const matchingRecDocs = recSnap.docs.filter(docSnap => {
            const data = docSnap.data();
            const matchYear = !schoolYear || !data.schoolYear || data.schoolYear === schoolYear;
            const matchWeek = weekNumber === undefined || Number(data.weekNumber) === Number(weekNumber);
            const matchMonth = monthNumber === undefined || !data.monthNumber || Number(data.monthNumber) === Number(monthNumber);
            return matchYear && matchWeek && matchMonth;
          });

          if (matchingRecDocs.length > 0) {
            for (let i = 0; i < matchingRecDocs.length; i += 400) {
              const batch = writeBatch(db);
              const chunk = matchingRecDocs.slice(i, i + 400);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
            deletedRecordsCount = matchingRecDocs.length;
          }
        }

        // 2. Delete conduct_evaluations matching classId + schoolYear + period
        const evalQuery = query(collection(db, 'conduct_evaluations'), where('classId', '==', targetClassId));
        const evalSnap = await getDocs(evalQuery);
        if (!evalSnap.empty) {
          const matchingEvalDocs = evalSnap.docs.filter(docSnap => {
            const data = docSnap.data();
            const matchYear = !schoolYear || !data.schoolYear || data.schoolYear === schoolYear;
            const matchPeriod = !monthLabel ||
              data.period === monthLabel ||
              (weekNumber !== undefined && (
                data.period === `Tuần ${String(weekNumber).padStart(2, '0')}` ||
                data.period === `Tuần ${weekNumber}`
              ));
            return matchYear && matchPeriod;
          });

          if (matchingEvalDocs.length > 0) {
            for (let i = 0; i < matchingEvalDocs.length; i += 400) {
              const batch = writeBatch(db);
              const chunk = matchingEvalDocs.slice(i, i + 400);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
            deletedEvaluationsCount = matchingEvalDocs.length;
          }
        }

        // 3. Reset/Delete teacher_assessments (Ghi nhận GVCN) for this class + schoolYear
        if (resetTeacherAssessments) {
          const taQuery = query(collection(db, 'teacher_assessments'), where('classId', '==', targetClassId));
          const taSnap = await getDocs(taQuery);
          if (!taSnap.empty) {
            const matchingTaDocs = taSnap.docs.filter(docSnap => {
              const data = docSnap.data();
              const matchYear = !schoolYear || !data.schoolYear || data.schoolYear === schoolYear;
              const matchMonth = !monthNumber || Number(data.monthNumber) === Number(monthNumber) || data.month === monthLabel;
              return matchYear && matchMonth;
            });

            if (matchingTaDocs.length > 0) {
              for (let i = 0; i < matchingTaDocs.length; i += 400) {
                const batch = writeBatch(db);
                const chunk = matchingTaDocs.slice(i, i + 400);
                chunk.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
              deletedAssessmentsCount = matchingTaDocs.length;
            }
          }
        }
      }

      return {
        deletedRecordsCount,
        deletedEvaluationsCount,
        deletedAssessmentsCount
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'clear_conduct_data');
      throw err;
    }
  },

  // 13. TEACHER ASSESSMENTS (GHI NHẬN GVCN)
  subscribeTeacherAssessments(callback: (assessments: TeacherAssessment[]) => void) {
    const q = collection(db, 'teacher_assessments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAssessment));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'teacher_assessments'));
  },

  async saveTeacherAssessment(assessmentPayload: Partial<TeacherAssessment>): Promise<{ payload: TeacherAssessment; isUpdate: boolean }> {
    try {
      const now = new Date().toISOString();
      const month = assessmentPayload.month || 'Tháng 09';
      const parsedMonth = parseInt(month.replace(/\D/g, ''), 10);
      const monthNumber = assessmentPayload.monthNumber !== undefined ? assessmentPayload.monthNumber : (!isNaN(parsedMonth) ? parsedMonth : 9);
      const schoolYear = assessmentPayload.schoolYear || '2026–2027';
      const studentId = assessmentPayload.studentId || '';

      // Determine existing doc to distinguish UPDATE vs INSERT
      let targetId = assessmentPayload.id || '';
      let existingDocData: any = null;

      if (targetId) {
        const docRef = doc(db, 'teacher_assessments', targetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existingDocData = docSnap.data();
        }
      }

      // If no doc found by targetId, check by (studentId + schoolYear + semester + month / monthNumber) to prevent any duplicate insertion
      if (!existingDocData && studentId) {
        const q = query(
          collection(db, 'teacher_assessments'),
          where('studentId', '==', studentId),
          where('schoolYear', '==', schoolYear)
        );
        const snap = await getDocs(q);
        const found = snap.docs.find(d => {
          const data = d.data();
          const matchSemester = !assessmentPayload.semester || !data.semester || data.semester === assessmentPayload.semester;
          return (Number(data.monthNumber) === monthNumber || data.month === month) && matchSemester;
        });
        if (found) {
          targetId = found.id;
          existingDocData = found.data();
        }
      }

      const isUpdate = !!existingDocData;

      if (!targetId) {
        const semesterSlug = (assessmentPayload.semester || 'HocKyI').replace(/[^a-zA-Z0-9]/g, '_');
        targetId = `ta_${studentId}_${schoolYear.replace(/[^a-zA-Z0-9]/g, '_')}_${semesterSlug}_m${monthNumber}`;
      }

      const recordDate = assessmentPayload.recordDate || existingDocData?.recordDate || now.split('T')[0];

      // Keep original creator if updating, unless newly provided
      const recordedBy = existingDocData?.recordedBy || assessmentPayload.recordedBy || 'GVCN';
      const teacherId = existingDocData?.teacherId || assessmentPayload.teacherId || 'gvcn';
      const teacherName = existingDocData?.teacherName || assessmentPayload.teacherName || 'Giáo viên chủ nhiệm';
      const createdAt = existingDocData?.createdAt || assessmentPayload.createdAt || now;

      const payload: TeacherAssessment = {
        id: targetId,
        studentId,
        studentName: assessmentPayload.studentName || existingDocData?.studentName || '',
        studentCode: assessmentPayload.studentCode || existingDocData?.studentCode || '',
        classId: assessmentPayload.classId || existingDocData?.classId || '',
        className: assessmentPayload.className || existingDocData?.className || '',
        teacherId,
        teacherName,
        semester: assessmentPayload.semester || existingDocData?.semester || 'Học kỳ I',
        schoolYear,
        month,
        monthNumber,
        recordDate,
        assessment: assessmentPayload.assessment || existingDocData?.assessment || {},
        comment: assessmentPayload.comment !== undefined ? assessmentPayload.comment : (existingDocData?.comment || ''),
        levelRating: assessmentPayload.levelRating || existingDocData?.levelRating || 'Tốt',
        needsMonitoring: assessmentPayload.needsMonitoring !== undefined ? !!assessmentPayload.needsMonitoring : (!!existingDocData?.needsMonitoring),
        teacherProposedRating: assessmentPayload.teacherProposedRating || existingDocData?.teacherProposedRating || 'Tốt',
        specialWarning: assessmentPayload.specialWarning !== undefined ? !!assessmentPayload.specialWarning : (!!existingDocData?.specialWarning),
        recordedBy,
        createdAt,
        updatedAt: now,
        updatedBy: assessmentPayload.updatedBy || 'GVCN'
      };

      await setDoc(doc(db, 'teacher_assessments', targetId), sanitize(payload), { merge: true });

      return { payload, isUpdate };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessments');
      throw err;
    }
  },

  async bulkSaveTeacherAssessments(params: {
    students: Student[];
    classId: string;
    className: string;
    schoolYear: string;
    semester?: string;
    month: string;
    monthNumber?: number;
    assessment?: {
      ruleCompliance?: string;
      learningAttitude?: string;
      responsibility?: string;
      collectiveActivities?: string;
      relationships?: string;
      selfDiscipline?: string;
    };
    content?: string;
    comment: string;
    levelRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
    teacherProposedRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt';
    needsMonitoring?: boolean;
    recordDate?: string;
    teacherId?: string;
    teacherName?: string;
    recordedBy?: string;
    updatedBy?: string;
    skipDuplicates?: boolean;
  }): Promise<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    failedStudents: { id: string; name: string; reason: string }[];
    skippedDuplicatesCount: number;
    updatedCount: number;
    newCount: number;
    savedAssessments: TeacherAssessment[];
  }> {
    try {
      const {
        students,
        classId,
        className,
        schoolYear = '2026–2027',
        semester = 'Học kỳ I',
        month = 'Tháng 09',
        monthNumber = parseInt(month.replace(/\D/g, ''), 10) || 9,
        assessment = {},
        content,
        comment,
        levelRating = 'Tốt',
        teacherProposedRating = 'Tốt',
        needsMonitoring = false,
        recordDate = new Date().toISOString().split('T')[0],
        teacherId = 'gvcn',
        teacherName = 'Giáo viên chủ nhiệm',
        recordedBy = 'GVCN',
        updatedBy = 'GVCN',
        skipDuplicates = false
      } = params;

      if (students.length === 0) {
        return {
          totalProcessed: 0,
          successCount: 0,
          failedCount: 0,
          failedStudents: [],
          skippedDuplicatesCount: 0,
          updatedCount: 0,
          newCount: 0,
          savedAssessments: []
        };
      }

      // Query existing assessments for this class & schoolYear
      const q = query(
        collection(db, 'teacher_assessments'),
        where('classId', '==', classId),
        where('schoolYear', '==', schoolYear)
      );
      const snap = await getDocs(q);
      const existingMap = new Map<string, any>();
      snap.docs.forEach(d => {
        const data = d.data();
        const matchMonth = Number(data.monthNumber) === monthNumber || data.month === month;
        const matchSemester = !data.semester || data.semester === semester;
        if (matchMonth && matchSemester && data.studentId) {
          existingMap.set(data.studentId, { id: d.id, ...data });
        }
      });

      const now = new Date().toISOString();
      const savedAssessments: TeacherAssessment[] = [];
      const failedStudents: { id: string; name: string; reason: string }[] = [];
      let updatedCount = 0;
      let newCount = 0;
      let skippedDuplicatesCount = 0;

      const operations: { id: string; payload: any; isUpdate: boolean }[] = [];
      const semesterSlug = semester.replace(/[^a-zA-Z0-9]/g, '_');
      const yearSlug = schoolYear.replace(/[^a-zA-Z0-9]/g, '_');
      const finalContent = content || comment || 'Thực hiện nghiêm túc nội quy nhà trường.';

      students.forEach(st => {
        try {
          if (!st.id) {
            failedStudents.push({ id: 'unknown', name: st.name || 'Học sinh', reason: 'Không tìm thấy student_id hợp lệ.' });
            return;
          }

          const existing = existingMap.get(st.id);

          // Check duplicate condition: same date, same levelRating, same content/comment
          if (existing && skipDuplicates) {
            const sameDate = (existing.recordDate || existing.date) === recordDate;
            const sameContent = (existing.comment || existing.content || '').trim() === finalContent.trim();
            const sameRating = existing.levelRating === levelRating;
            if (sameDate && sameContent && sameRating) {
              skippedDuplicatesCount++;
              return;
            }
          }

          const studentName = st.full_name || st.fullName || st.name || (existing ? existing.studentName : '');
          const studentCode = st.code || (existing ? existing.studentCode : '');

          if (existing) {
            const payload: any = {
              ...existing,
              id: existing.id,
              // Strictly save student_id, class_id, teacher_id as per Section 11
              studentId: st.id,
              student_id: st.id,
              studentName,
              studentCode,
              classId,
              class_id: classId,
              className,
              teacherId,
              teacher_id: teacherId,
              teacherName,
              semester,
              schoolYear,
              month,
              monthNumber,
              date: recordDate || existing.recordDate || now.split('T')[0],
              recordDate: recordDate || existing.recordDate || now.split('T')[0],
              content: finalContent,
              evaluation_type: 'GHI_NHAN_GVCN',
              result: levelRating,
              note: finalContent,
              assessment: {
                ruleCompliance: assessment.ruleCompliance || existing.assessment?.ruleCompliance || finalContent,
                learningAttitude: assessment.learningAttitude || existing.assessment?.learningAttitude || 'Đi học đầy đủ, đúng giờ, hăng hái phát biểu xây dựng bài.',
                responsibility: assessment.responsibility || existing.assessment?.responsibility || 'Có tinh thần trách nhiệm cao trong công việc được giao.',
                collectiveActivities: assessment.collectiveActivities || existing.assessment?.collectiveActivities || 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp.',
                relationships: assessment.relationships || existing.assessment?.relationships || 'Kính trọng thầy cô, hòa đồng, thân thiện với bạn bè.',
                selfDiscipline: assessment.selfDiscipline || existing.assessment?.selfDiscipline || 'Có ý thức tự giác cao trong học tập và rèn luyện.'
              },
              comment: finalContent,
              levelRating,
              needsMonitoring: Boolean(needsMonitoring),
              teacherProposedRating,
              updatedAt: now,
              updated_at: now,
              updatedBy
            };
            operations.push({ id: existing.id, payload, isUpdate: true });
            savedAssessments.push(payload as TeacherAssessment);
            updatedCount++;
          } else {
            const targetId = `ta_${st.id}_${yearSlug}_${semesterSlug}_m${monthNumber}`;
            const payload: any = {
              id: targetId,
              // Strictly save student_id, class_id, teacher_id as per Section 11
              studentId: st.id,
              student_id: st.id,
              studentName,
              studentCode,
              classId,
              class_id: classId,
              className,
              teacherId,
              teacher_id: teacherId,
              teacherName,
              semester,
              schoolYear,
              month,
              monthNumber,
              date: recordDate,
              recordDate,
              content: finalContent,
              evaluation_type: 'GHI_NHAN_GVCN',
              result: levelRating,
              note: finalContent,
              assessment: {
                ruleCompliance: assessment.ruleCompliance || finalContent,
                learningAttitude: assessment.learningAttitude || 'Đi học đầy đủ, đúng giờ, hăng hái phát biểu xây dựng bài.',
                responsibility: assessment.responsibility || 'Có tinh thần trách nhiệm cao trong công việc được giao.',
                collectiveActivities: assessment.collectiveActivities || 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp.',
                relationships: assessment.relationships || 'Kính trọng thầy cô, hòa đồng, thân thiện với bạn bè.',
                selfDiscipline: assessment.selfDiscipline || 'Có ý thức tự giác cao trong học tập và rèn luyện.'
              },
              comment: finalContent,
              levelRating,
              needsMonitoring: Boolean(needsMonitoring),
              teacherProposedRating,
              specialWarning: false,
              recordedBy,
              createdAt: now,
              created_at: now,
              updatedAt: now,
              updated_at: now,
              updatedBy
            };
            operations.push({ id: targetId, payload, isUpdate: false });
            savedAssessments.push(payload as TeacherAssessment);
            newCount++;
          }
        } catch (err: any) {
          failedStudents.push({ id: st.id, name: st.name || 'Học sinh', reason: err.message || 'Lỗi không xác định' });
        }
      });

      // Commit batches (max 400 per batch)
      for (let i = 0; i < operations.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = operations.slice(i, i + 400);
        chunk.forEach(op => {
          batch.set(doc(db, 'teacher_assessments', op.id), sanitize(op.payload), { merge: true });
        });
        await batch.commit();
      }

      return {
        totalProcessed: operations.length,
        successCount: operations.length,
        failedCount: failedStudents.length,
        failedStudents,
        skippedDuplicatesCount,
        updatedCount,
        newCount,
        savedAssessments
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessments_bulk');
      throw err;
    }
  },

  async bulkSaveGoodTeacherAssessments(params: {
    students: Student[];
    classId: string;
    className: string;
    schoolYear: string;
    semester?: string;
    month: string;
    monthNumber?: number;
    assessment: {
      ruleCompliance: string;
      learningAttitude: string;
      responsibility: string;
      collectiveActivities: string;
      relationships: string;
      selfDiscipline: string;
    };
    comment: string;
    levelRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
    teacherProposedRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt';
    needsMonitoring?: boolean;
    recordDate?: string;
    teacherId?: string;
    teacherName?: string;
    recordedBy?: string;
    updatedBy?: string;
  }): Promise<{
    totalProcessed: number;
    updatedCount: number;
    newCount: number;
    savedAssessments: TeacherAssessment[];
  }> {
    return this.bulkSaveTeacherAssessments(params);
  },

  async deleteTeacherAssessment(id: string) {
    try {
      await deleteDoc(doc(db, 'teacher_assessments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teacher_assessments');
      throw err;
    }
  },

  // 14. EVALUATION RATING CONFIGS & AUDIT LOGS
  subscribeRatingConfigs(callback: (configs: EvaluationRatingConfig[]) => void) {
    const q = collection(db, 'evaluation_rating_configs');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationRatingConfig));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'evaluation_rating_configs'));
  },

  subscribeRatingHistory(callback: (history: EvaluationRatingConfigHistory[]) => void) {
    const q = collection(db, 'evaluation_rating_config_history');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationRatingConfigHistory));
      callback(data.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'evaluation_rating_config_history'));
  },

  async saveRatingConfig(
    config: EvaluationRatingConfig,
    userPerformed: { name: string; role?: string },
    previousTiers?: RatingTierItem[] | null,
    note?: string
  ): Promise<EvaluationRatingConfig> {
    try {
      const now = new Date().toISOString();
      const periodIdSlug = (config.evaluation_period_id || 'all').replace(/[^a-zA-Z0-9]/g, '_');
      const yearSlug = config.school_year.replace(/[^a-zA-Z0-9]/g, '_');
      const id = config.id || `rating_cfg_${yearSlug}_${config.evaluation_period_type}_${periodIdSlug}`;

      const payload: EvaluationRatingConfig = {
        ...config,
        id,
        updated_at: now,
        updated_by: userPerformed.name || 'BGH'
      };
      if (!payload.created_at) {
        payload.created_at = now;
        payload.created_by = userPerformed.name || 'BGH';
      }

      await setDoc(doc(db, 'evaluation_rating_configs', id), sanitize(payload), { merge: true });

      // Record audit history (Requirement 12)
      const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const historyEntry: EvaluationRatingConfigHistory = {
        id: historyId,
        config_id: id,
        action: previousTiers ? 'update' : 'create',
        performed_by: userPerformed.name || 'BGH',
        performed_by_role: userPerformed.role || 'BGH',
        performed_at: now,
        before_change: previousTiers || null,
        after_change: config.tiers,
        note: note || `Cập nhật cấu hình xếp loại ${config.evaluation_period_type === 'all' ? 'mặc định' : config.evaluation_period_id} (${config.school_year})`
      };

      await setDoc(doc(db, 'evaluation_rating_config_history', historyId), sanitize(historyEntry));

      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'evaluation_rating_configs');
      throw err;
    }
  },

  async restoreDefaultRatingConfig(
    schoolYear: string,
    periodType: EvaluationPeriodScopeType,
    periodId: string,
    userPerformed: { name: string; role?: string },
    previousTiers?: RatingTierItem[]
  ): Promise<EvaluationRatingConfig> {
    const periodIdSlug = (periodId || 'all').replace(/[^a-zA-Z0-9]/g, '_');
    const yearSlug = schoolYear.replace(/[^a-zA-Z0-9]/g, '_');
    const configId = `rating_cfg_${yearSlug}_${periodType}_${periodIdSlug}`;

    const payload: EvaluationRatingConfig = {
      id: configId,
      school_id: 'thpt_minh_hoa',
      name: `Cấu hình xếp loại rèn luyện (${schoolYear})`,
      school_year: schoolYear,
      evaluation_period_type: periodType,
      evaluation_period_id: periodId,
      tiers: DEFAULT_RATING_TIERS,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userPerformed.name || 'BGH',
      updated_by: userPerformed.name || 'BGH'
    };

    return this.saveRatingConfig(payload, userPerformed, previousTiers, 'Khôi phục về cấu hình xếp loại mặc định của nhà trường');
  },

  // 17. THEO DÕI VÀ BÁO CÁO HOÀN THÀNH XẾP LOẠI HỌC SINH CỦA GVCN
  subscribeTeacherAssessmentCompletions(callback: (completions: TeacherAssessmentCompletion[]) => void) {
    const q = collection(db, 'teacher_assessment_completions');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherAssessmentCompletion));
      callback(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'teacher_assessment_completions'));
  },

  async reportTeacherAssessmentCompletion(data: {
    classId: string;
    className: string;
    schoolYear: string;
    month: string;
    semester: string;
    totalStudents: number;
    evaluatedCount: number;
    ratingCounts?: Record<string, number>;
    note?: string;
    user?: { id?: string; name?: string; role?: string };
  }): Promise<TeacherAssessmentCompletion> {
    try {
      const yearSlug = (data.schoolYear || '2026–2027').replace(/[^a-zA-Z0-9]/g, '_');
      const monthSlug = (data.month || 'Thang_09').replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `completion_${data.classId}_${yearSlug}_${monthSlug}`;
      const now = new Date();
      const dateStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const payload: TeacherAssessmentCompletion = {
        id: docId,
        classId: data.classId,
        className: data.className,
        schoolYear: data.schoolYear,
        month: data.month,
        semester: data.semester,
        totalStudents: data.totalStudents,
        evaluatedCount: data.evaluatedCount,
        isCompleted: true,
        completedAt: dateStr,
        completedBy: data.user?.id || 'gvcn',
        completedByName: data.user?.name || 'Giáo viên Chủ nhiệm',
        ratingCounts: data.ratingCounts,
        note: data.note || '',
        approvalStatus: 'Chờ BGH duyệt',
        updatedAt: now.toISOString()
      };

      await setDoc(doc(db, 'teacher_assessment_completions', docId), sanitize(payload), { merge: true });
      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessment_completions');
      throw err;
    }
  },

  async reopenTeacherAssessmentCompletion(classId: string, schoolYear: string, month: string): Promise<void> {
    try {
      const yearSlug = (schoolYear || '2026–2027').replace(/[^a-zA-Z0-9]/g, '_');
      const monthSlug = (month || 'Thang_09').replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `completion_${classId}_${yearSlug}_${monthSlug}`;
      await setDoc(doc(db, 'teacher_assessment_completions', docId), { isCompleted: false, approvalStatus: undefined, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessment_completions');
      throw err;
    }
  },

  // 18. PHÊ DUYỆT XẾP LOẠI CỦA BAN GIÁM HIỆU
  async updateTeacherAssessmentCompletionApproval(
    docId: string,
    status: 'Đã duyệt' | 'Yêu cầu điều chỉnh',
    bghComment?: string,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<void> {
    try {
      const now = new Date();
      const dateStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      
      const payload: Partial<TeacherAssessmentCompletion> = {
        approvalStatus: status,
        approvedBy: user?.id || 'bgh',
        approvedByName: user?.name || 'Ban Giám hiệu',
        approvedAt: dateStr,
        bghComment: bghComment || '',
        updatedAt: now.toISOString()
      };

      await setDoc(doc(db, 'teacher_assessment_completions', docId), sanitize(payload), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessment_completions');
      throw err;
    }
  },

  async updateStudentTeacherAssessmentBghApproval(
    assessmentId: string,
    status: 'Đã duyệt' | 'Điều chỉnh' | 'Yêu cầu điều chỉnh',
    adjustedRating?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt',
    bghComment?: string,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<void> {
    try {
      const now = new Date();
      const dateStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const payload: Partial<TeacherAssessment> = {
        bghApprovalStatus: status,
        bghApprovedBy: user?.id || 'bgh',
        bghApprovedByName: user?.name || 'Ban Giám hiệu',
        bghApprovedAt: dateStr,
        bghComment: bghComment || '',
        updatedAt: now.toISOString(),
        updatedBy: user?.name || 'BGH'
      };

      if (adjustedRating) {
        payload.bghAdjustedRating = adjustedRating;
        payload.levelRating = adjustedRating;
        payload.teacherProposedRating = adjustedRating as any;
      }

      await setDoc(doc(db, 'teacher_assessments', assessmentId), sanitize(payload), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teacher_assessments');
      throw err;
    }
  }
};

