import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ScheduleAuditLog {
  id: string;
  timestamp: string;
  formattedTime: string;
  action: 'delete_single' | 'delete_batch' | 'delete_week';
  actionLabel: string;
  userName: string;
  userAccount: string;
  userRole: string;
  scheduleId: string;
  taskId?: string;
  taskContent: string;
  taskDate?: string;
  department: string;
  scope: 'Toàn trường' | 'Tổ chuyên môn';
  hasEvaluation: boolean;
  result: 'Thành công' | 'Thất bại';
  reason?: string;
}

const COLLECTION_NAME = 'schedule_audit_logs';
const CACHE_KEY = 'school_schedule_audit_logs_cache';

export const scheduleAuditService = {
  /**
   * Ghi một mục nhật ký thao tác xóa lịch giao việc
   */
  async logDeletion(
    entry: Omit<ScheduleAuditLog, 'id' | 'timestamp' | 'formattedTime'>
  ): Promise<ScheduleAuditLog> {
    const now = new Date();
    const id = `audit_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;
    const pad = (n: number) => String(n).padStart(2, '0');
    const formattedTime = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const logItem: ScheduleAuditLog = {
      id,
      timestamp: now.toISOString(),
      formattedTime,
      ...entry
    };

    // 1. Lưu vào localStorage cache
    try {
      const existingStr = localStorage.getItem(CACHE_KEY);
      const existing: ScheduleAuditLog[] = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(logItem);
      localStorage.setItem(CACHE_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch (e) {
      console.warn('Lỗi ghi cache audit log:', e);
    }

    // 2. Lưu vào Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, JSON.parse(JSON.stringify(logItem)));
    } catch (e) {
      console.warn('Lỗi lưu audit log lên Firestore:', e);
    }

    return logItem;
  },

  /**
   * Lấy danh sách lịch sử nhật ký thao tác xóa gần nhất
   */
  async getRecentLogs(limitCount: number = 50): Promise<ScheduleAuditLog[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: ScheduleAuditLog[] = [];
        snap.forEach(d => list.push(d.data() as ScheduleAuditLog));
        return list;
      }
    } catch (e) {
      console.warn('Lỗi đọc audit log Firestore, fallback cache:', e);
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    return [];
  }
};
