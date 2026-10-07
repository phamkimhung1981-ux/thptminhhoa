export interface SystemRelease {
  version: string;
  releaseDate: string;
  title: string;
  modulesModified: string[];
  changes: string[];
}

export const CURRENT_SYSTEM_VERSION = 'v1.2.3';
export const LAST_UPDATED = '2026-09-29';

export const RELEASE_HISTORY: SystemRelease[] = [
  {
    version: 'v1.2.3',
    releaseDate: '2026-09-29',
    title: 'Sửa triệt để chức năng XẾP A–B–C và Lưu kết quả bền vững vào Database',
    modulesModified: ['Quản lý học sinh & GVCN', 'Dữ liệu học sinh', 'Sắp xếp danh sách'],
    changes: [
      'Nút "XẾP A–B–C" thực hiện đồng thời: Xếp A–B–C theo tên tiếng Việt -> Cập nhật STT và Xếp loại -> Lưu trực tiếp vào Firestore Database.',
      'Lưu kết quả theo từng học sinh duy nhất (dựa trên ID) và theo đúng lớp.',
      'Tự động khôi phục kết quả đã lưu khi reload trang, đổi lớp, đóng mở module hoặc đăng nhập lại.',
      'Bổ sung trạng thái Đang lưu / Đã lưu ✓ trên nút bấm để chống bấm liên tục.'
    ]
  },
  {
    version: 'v1.2.2',
    releaseDate: '2026-09-29',
    title: 'Tự động lưu dữ liệu (Auto-save) ngay khi chỉnh sửa trên web',
    modulesModified: ['Lịch giao việc tổ CM', 'Lịch công việc trường'],
    changes: [
      'Kích hoạt auto-save tức thì khi nhập liệu lịch công việc trường và tổ chuyên môn.'
    ]
  },
  {
    version: 'v1.2.1',
    releaseDate: '2026-09-29',
    title: 'Sửa triệt để hiển thị nội dung giao việc (Auto-resize textarea & Bỏ thanh cuộn trong ô)',
    modulesModified: ['Lịch giao việc tổ CM', 'Lịch công việc trường', 'Giao việc'],
    changes: [
      'Xây dựng AutoResizeTextarea tự động co giãn chiều cao theo nội dung thực tế (scrollHeight).',
      'Loại bỏ hoàn toàn thanh cuộn dọc (scrollbar) bên trong các ô Sáng, Chiều, Lãnh đạo trực/đánh giá, Ghi chú.',
      'Hiển thị 100% nội dung phân công nhiều dòng, dấu gạch đầu dòng và khoảng cách dòng.',
      'Hàng của bảng tự động cao lên tương ứng mà không che khuất hay cắt bớt dữ liệu.'
    ]
  },
  {
    version: 'v1.2.0',
    releaseDate: '2026-09-29',
    title: 'Bổ sung module Lịch công việc trường & tính năng Tải file từ Word',
    modulesModified: ['Lịch công việc trường', 'Thanh điều hướng', 'Giao diện bảng'],
    changes: [
      'Tạo module Lịch công việc trường THPT Sơn Lương (/school-work-schedule) đúng 5 cột theo file mẫu.',
      'Kẻ viền ô rõ nét, tương phản cao, hỗ trợ Lãnh đạo nhập nhận xét và đánh giá trực tiếp.',
      'Tích hợp tính năng Tải file từ Word (.docx) và Xuất Word/Excel chuẩn văn bản.',
      'Cấu hình vercel.json chống cache stale và hỗ trợ SPA routing cho production.'
    ]
  },
  {
    version: 'v1.1.0',
    releaseDate: '2026-09-27',
    title: 'Nâng cấp Lịch giao việc tổ CM và hệ thống KPI',
    modulesModified: ['Lịch giao việc tổ CM', 'KPI CBQL', 'KPI Giáo viên', 'KPI Nhân viên'],
    changes: [
      'Hoàn thiện hệ thống đánh giá KPI CBQL, GV, NV theo tháng/học kỳ.',
      'Tích hợp lịch giao việc tổ chuyên môn và đồng bộ dữ liệu giáo viên.'
    ]
  },
  {
    version: 'v1.0.0',
    releaseDate: '2026-09-20',
    title: 'Khởi tạo Hệ thống Quản lý Giáo viên THPT Sơn Lương',
    modulesModified: ['Toàn bộ hệ thống'],
    changes: [
      'Quản lý danh sách CBGVNV, phân quyền BGH, TTCM, Giáo viên, Nhân viên.',
      'Quản lý văn bản, nghỉ phép, nền nếp nội quy và báo cáo thống kê.'
    ]
  }
];
