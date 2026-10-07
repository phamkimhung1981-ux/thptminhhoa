export type DocumentCategory = 'incoming' | 'outgoing' | 'internal'; // Văn bản đến | Văn bản đi | Văn bản nội bộ

export type DocumentType = 
  | 'Công văn' 
  | 'Quyết định' 
  | 'Kế hoạch' 
  | 'Thông báo' 
  | 'Tờ trình' 
  | 'Hướng dẫn' 
  | 'Quy chế' 
  | 'Báo cáo';

export type DocumentUrgency = 'Thường' | 'Khẩn' | 'Thượng khẩn';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'archived';

export interface OfficialDocument {
  id: string;
  documentNumber: string; // Số/Ký hiệu: 123/SGDĐT-TCCB
  title: string; // Trích yếu nội dung
  category: DocumentCategory; // 'incoming' | 'outgoing' | 'internal'
  documentType: DocumentType;
  issuingAuthority: string; // Cơ quan ban hành (Sở GD&ĐT Phú Thọ, THPT Sơn Lương...)
  issueDate: string; // Ngày ban hành (YYYY-MM-DD)
  receivedDate?: string; // Ngày đến/xử lý
  urgency: DocumentUrgency;
  assignedDepartmentIds?: string[]; // Các tổ chuyên môn nhận chỉ đạo
  assignedDepartmentNames?: string[];
  signerName?: string; // Người ký
  signerPosition?: string; // Chức vụ người ký
  fileUrl?: string; // Tệp đính kèm
  fileDriveLink?: string;
  fileName?: string;
  summaryNote?: string; // Ghi chú / Chỉ đạo của BGH
  status: DocumentStatus;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
}
