import * as XLSX from 'xlsx';
import { Department } from '../types';
import { SCHOOL_NAME_UPPER } from '../constants/schoolConfig';

/**
 * Xuất file Excel mẫu chuẩn cho việc nhập danh sách Cán bộ, Giáo viên, Nhân viên (CBGVNV)
 * File gồm 2 sheet:
 * - DANH_SACH_CBGVNV: Các cột đúng chuẩn trường dữ liệu của hệ thống và 4 dòng dữ liệu mẫu
 * - HUONG_DAN: Hướng dẫn chi tiết quy định nhập liệu, các trường hợp lệ
 */
export function exportTeacherExcelTemplate(departments: Department[] = []) {
  // Sheet 1: DANH_SACH_CBGVNV
  const sampleRows = [
    {
      'STT': 1,
      'Mã GV': 'GV_MAU01',
      'Họ và tên': 'Nguyễn Văn An (DỮ LIỆU MẪU)',
      'Chức vụ': 'Tổ trưởng',
      'Tổ chuyên môn': departments[0]?.name || 'Tổ Toán-Lý-Tin-CN',
      'Môn giảng dạy': 'Toán học',
      'Trạng thái': 'Đang công tác',
      'Số điện thoại': '0912345678',
      'Email': 'nguyenvanan@minhhoa.edu.vn',
      'Ghi chú': 'Dòng dữ liệu mẫu minh họa'
    },
    {
      'STT': 2,
      'Mã GV': 'GV_MAU02',
      'Họ và tên': 'Trần Thị Bình (DỮ LIỆU MẪU)',
      'Chức vụ': 'Giáo viên',
      'Tổ chuyên môn': departments[1]?.name || 'Tổ Văn-Sử-Địa-GDKT&PL-AN',
      'Môn giảng dạy': 'Ngữ văn',
      'Trạng thái': 'Đang công tác',
      'Số điện thoại': '0912345679',
      'Email': 'tranthibinh@minhhoa.edu.vn',
      'Ghi chú': 'Dòng dữ liệu mẫu minh họa'
    },
    {
      'STT': 3,
      'Mã GV': 'GV_MAU03',
      'Họ và tên': 'Lê Văn Cường (DỮ LIỆU MẪU)',
      'Chức vụ': 'Tổ phó',
      'Tổ chuyên môn': departments[2]?.name || 'Tổ Hóa-Lý-Sinh-GDQPAN-NN',
      'Môn giảng dạy': 'Hóa học',
      'Trạng thái': 'Đang công tác',
      'Số điện thoại': '0912345680',
      'Email': 'levancuong@minhhoa.edu.vn',
      'Ghi chú': 'Dòng dữ liệu mẫu minh họa'
    },
    {
      'STT': 4,
      'Mã GV': 'NV_MAU01',
      'Họ và tên': 'Phạm Thị Dung (DỮ LIỆU MẪU)',
      'Chức vụ': 'Nhân viên',
      'Tổ chuyên môn': departments.find(d => d.name.toLowerCase().includes('văn phòng'))?.name || 'Tổ Văn phòng',
      'Môn giảng dạy': 'Kế toán',
      'Trạng thái': 'Đang công tác',
      'Số điện thoại': '0912345681',
      'Email': 'phamthidung@minhhoa.edu.vn',
      'Ghi chú': 'Dòng dữ liệu mẫu minh họa'
    }
  ];

  const wsData = XLSX.utils.json_to_sheet(sampleRows);

  // Đặt độ rộng các cột tự động phù hợp
  wsData['!cols'] = [
    { wch: 8 },  // STT
    { wch: 14 }, // Mã GV
    { wch: 34 }, // Họ và tên
    { wch: 18 }, // Chức vụ
    { wch: 32 }, // Tổ chuyên môn
    { wch: 18 }, // Môn giảng dạy
    { wch: 18 }, // Trạng thái
    { wch: 16 }, // Số điện thoại
    { wch: 32 }, // Email
    { wch: 28 }, // Ghi chú
  ];

  // Bật bộ lọc dữ liệu (autofilter) cho toàn bộ bảng
  wsData['!autofilter'] = { ref: "A1:J5" };

  // Sheet 2: HUONG_DAN
  const deptListStr = departments.map(d => d.name).join('; ');
  const guideRows = [
    { 'MỤC': 'ĐƠN VỊ', 'HƯỚNG DẪN CHI TIẾT': SCHOOL_NAME_UPPER },
    { 'MỤC': 'FILE MẪU', 'HƯỚNG DẪN CHI TIẾT': 'Mẫu nhập danh sách Cán bộ, Giáo viên, Nhân viên (CBGVNV)' },
    { 'MỤC': '1. Quy định chung', 'HƯỚNG DẪN CHI TIẾT': 'Nhập đầy đủ thông tin theo các cột tại sheet "DANH_SACH_CBGVNV". Không xóa dòng tiêu đề (Dòng 1).' },
    { 'MỤC': '2. Không đổi tên cột', 'HƯỚNG DẪN CHI TIẾT': 'Tuyệt đối không thay đổi tên các cột hoặc thứ tự các cột để hệ thống có thể đọc dữ liệu chính xác.' },
    { 'MỤC': '3. Trường bắt buộc', 'HƯỚNG DẪN CHI TIẾT': 'Các trường bắt buộc phải có: "Họ và tên", "Mã GV" (nếu để trống hệ thống sẽ tự sinh mã), "Chức vụ", "Tổ chuyên môn".' },
    { 'MỤC': '4. Chức vụ hợp lệ', 'HƯỚNG DẪN CHI TIẾT': 'Sử dụng một trong các giá trị: Hiệu trưởng, Phó Hiệu trưởng, Tổ trưởng, Tổ phó, Giáo viên, Nhân viên.' },
    { 'MỤC': '5. Tổ chuyên môn', 'HƯỚNG DẪN CHI TIẾT': `Nhập đúng tên tổ đang có trên hệ thống, ví dụ: ${deptListStr || 'Tổ Toán-Lý-Tin-CN, Tổ Văn-Sử-Địa-GDKT&PL-AN, Tổ Hóa-Lý-Sinh-GDQPAN-NN, Tổ Văn phòng'}.` },
    { 'MỤC': '6. Trạng thái hợp lệ', 'HƯỚNG DẪN CHI TIẾT': 'Sử dụng một trong các giá trị: "Đang công tác", "Nghỉ phép", "Đã nghỉ việc" (mặc định là "Đang công tác").' },
    { 'MỤC': '7. Dữ liệu mẫu', 'HƯỚNG DẪN CHI TIẾT': 'Các dòng có chữ "(DỮ LIỆU MẪU)" chỉ nhằm mục đích minh họa. Quý thầy cô hãy xóa các dòng mẫu này hoặc ghi đè bằng thông tin thực tế trước khi tải lên.' },
    { 'MỤC': '8. Thực hiện nhập', 'HƯỚNG DẪN CHI TIẾT': 'Sau khi hoàn thành điền thông tin, lưu file Excel và nhấn nút "Nhập từ Excel" trên phần mềm để tải danh sách vào hệ thống.' },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [
    { wch: 24 },
    { wch: 95 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsData, "DANH_SACH_CBGVNV");
  XLSX.utils.book_append_sheet(wb, wsGuide, "HUONG_DAN");

  XLSX.writeFile(wb, "Mau_nhap_CBGVNV_THPT_Minh_Hoa.xlsx");
}
