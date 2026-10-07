import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfficialDocument } from '../types/document';

const DOCUMENTS_COLLECTION = 'official_documents';
const LOCAL_STORAGE_KEY = 'thpt_son_luong_official_documents_v1';

// Seed sample documents for THPT Sơn Lương
const SAMPLE_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'doc-001',
    documentNumber: '1025/SGDĐT-TCCB',
    title: 'V/v Hướng dẫn thực hiện đánh giá, xếp loại chất lượng cán bộ, giáo viên, nhân viên năm học 2026 - 2027',
    category: 'incoming',
    documentType: 'Hướng dẫn',
    issuingAuthority: 'Sở Giáo dục và Đào tạo tỉnh',
    issueDate: '2026-09-05',
    receivedDate: '2026-09-06',
    urgency: 'Khẩn',
    assignedDepartmentIds: ['all'],
    assignedDepartmentNames: ['Toàn trường', 'Ban Giám hiệu', 'Tổ Chuyên môn'],
    signerName: 'Nguyễn Văn Minh',
    signerPosition: 'Giám đốc Sở GD&ĐT',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: '1025_SGDDT_Huong_dan_danh_gia_KPI.pdf',
    summaryNote: 'Yêu cầu BGH và các Tổ trưởng chuyên môn phổ biến đến toàn thể CBGVNV thực hiện đánh giá đúng tiến độ.',
    status: 'processing',
    createdAt: new Date('2026-09-06T08:00:00').toISOString(),
    createdByName: 'Ban Thư ký'
  },
  {
    id: 'doc-002',
    documentNumber: '48/KH-THPTSL',
    title: 'Kế hoạch triển khai nhiệm vụ năm học 2026 - 2027 và phong trào thi đua xây dựng Trường học Hạnh phúc',
    category: 'internal',
    documentType: 'Kế hoạch',
    issuingAuthority: 'Trường THPT Sơn Lương',
    issueDate: '2026-09-10',
    urgency: 'Thường',
    assignedDepartmentIds: ['toan', 'van', 'ngoai-ngu', 'su-dia'],
    assignedDepartmentNames: ['Tổ Toán - Tin', 'Tổ Ngữ Văn', 'Tổ Ngoại Ngữ', 'Tổ Sử - Địa - GDKTPL'],
    signerName: 'Nguyễn Quang Sáng',
    signerPosition: 'Hiệu trưởng',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: '48_KH_Nhiem_vu_nam_hoc_2026_2027.pdf',
    summaryNote: 'Căn cứ triển khai hoạt động chuyên môn, nền nếp và thi đua khen thưởng toàn trường.',
    status: 'completed',
    createdAt: new Date('2026-09-10T09:30:00').toISOString(),
    createdByName: 'Hiệu trưởng'
  },
  {
    id: 'doc-003',
    documentNumber: '88/QC-THPTSL',
    title: 'Quy chế chuyên môn, đánh giá xếp loại học sinh và thực hiện nền nếp công vụ năm học 2026 - 2027',
    category: 'internal',
    documentType: 'Quy chế',
    issuingAuthority: 'Trường THPT Sơn Lương',
    issueDate: '2026-09-12',
    urgency: 'Thường',
    assignedDepartmentIds: ['all'],
    assignedDepartmentNames: ['Toàn thể CBGVNV'],
    signerName: 'Nguyễn Quang Sáng',
    signerPosition: 'Hiệu trưởng',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: '88_Quy_che_chuyen_mon_2026_2027.pdf',
    summaryNote: 'Đề nghị tất cả các tổ chuyên môn quán triệt kỹ quy chế giảng dạy và chấm điểm.',
    status: 'completed',
    createdAt: new Date('2026-09-12T10:00:00').toISOString(),
    createdByName: 'Hiệu trưởng'
  },
  {
    id: 'doc-004',
    documentNumber: '156/CV-THPTSL',
    title: 'Báo cáo công tác chuẩn bị cơ sở vật chất, thiết bị dạy học và kiểm định chất lượng đầu năm học',
    category: 'outgoing',
    documentType: 'Công văn',
    issuingAuthority: 'Trường THPT Sơn Lương',
    issueDate: '2026-09-15',
    urgency: 'Thường',
    assignedDepartmentIds: ['hanh-chinh'],
    assignedDepartmentNames: ['Sở GD&ĐT', 'Tổ Văn phòng'],
    signerName: 'Nguyễn Quang Sáng',
    signerPosition: 'Hiệu trưởng',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: '156_CV_Bao_cao_CSVC_dau_nam.pdf',
    summaryNote: 'Đã gửi Sở GD&ĐT lưu vết thành công.',
    status: 'completed',
    createdAt: new Date('2026-09-15T14:15:00').toISOString(),
    createdByName: 'Văn phòng'
  }
];

// Helper to clean undefined properties before writing to Firestore
function sanitizeData<T extends object>(obj: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized as T;
}

// LocalStorage helpers
function getLocalDocuments(): OfficialDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Local document parse error", e);
  }
  return SAMPLE_DOCUMENTS;
}

function saveLocalDocuments(docs: OfficialDocument[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error("Local document save error", e);
  }
}

/**
 * Real-time subscription to documents in Firestore, with local fallback
 */
export function subscribeToDocuments(callback: (documents: OfficialDocument[]) => void): () => void {
  try {
    const q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed initial documents if Firestore is empty
        seedInitialDocuments().then(() => {
          callback(SAMPLE_DOCUMENTS);
        });
      } else {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OfficialDocument));
        saveLocalDocuments(docs);
        callback(docs);
      }
    }, (error) => {
      console.warn("Firestore documents listen failed, fallback to local:", error);
      callback(getLocalDocuments());
    });

    return unsubscribe;
  } catch (e) {
    console.warn("Firestore setup error, using local fallback:", e);
    callback(getLocalDocuments());
    return () => {};
  }
}

/**
 * Seed initial documents to Firestore
 */
async function seedInitialDocuments() {
  try {
    for (const docItem of SAMPLE_DOCUMENTS) {
      const sanitized = sanitizeData(docItem);
      await setDoc(doc(db, DOCUMENTS_COLLECTION, docItem.id), sanitized, { merge: true });
    }
    saveLocalDocuments(SAMPLE_DOCUMENTS);
  } catch (e) {
    console.warn("Error seeding initial documents:", e);
  }
}

/**
 * Create a new document
 */
export async function createOfficialDocument(docData: Omit<OfficialDocument, 'id' | 'createdAt'>): Promise<OfficialDocument> {
  const id = `doc-${Date.now()}`;
  const newDoc: OfficialDocument = {
    ...docData,
    id,
    createdAt: new Date().toISOString()
  };

  const sanitized = sanitizeData(newDoc);

  try {
    await setDoc(doc(db, DOCUMENTS_COLLECTION, id), sanitized);
  } catch (e) {
    console.warn("Firestore write document error, saving locally:", e);
  }

  // Always update local cache
  const current = getLocalDocuments();
  const updated = [newDoc, ...current];
  saveLocalDocuments(updated);

  return newDoc;
}

/**
 * Update an existing document
 */
export async function updateOfficialDocument(id: string, updates: Partial<OfficialDocument>): Promise<void> {
  const now = new Date().toISOString();
  const payload = sanitizeData({ ...updates, updatedAt: now });

  try {
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, id), payload);
  } catch (e) {
    console.warn("Firestore update document error, updating locally:", e);
  }

  const current = getLocalDocuments();
  const updated = current.map(item => item.id === id ? { ...item, ...updates, updatedAt: now } : item);
  saveLocalDocuments(updated);
}

/**
 * Delete a document
 */
export async function deleteOfficialDocument(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DOCUMENTS_COLLECTION, id));
  } catch (e) {
    console.warn("Firestore delete document error, deleting locally:", e);
  }

  const current = getLocalDocuments();
  const updated = current.filter(item => item.id !== id);
  saveLocalDocuments(updated);
}
