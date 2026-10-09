import { 
  KpiStaffCriterionItem, 
  KpiStaffPositionConfig, 
  StaffPositionKey, 
  KpiStaffPeriod,
  KpiStaffForm,
  KpiStaffScoreItem
} from '../types/kpiStaff';
import { Teacher } from '../types';

/**
 * A. KPI CHUNG – 30 ĐIỂM (Áp dụng cho tất cả nhân viên)
 */
export const GENERAL_STAFF_CRITERIA: KpiStaffCriterionItem[] = [
  {
    id: 'crit_general_NV_A1',
    code: 'NV-A1',
    category: 'A_CHUNG',
    content: 'Chấp hành chủ trương, pháp luật, quy định; trung thực, đoàn kết, có ý thức phục vụ',
    maxScore: 5
  },
  {
    id: 'crit_general_NV_A2',
    code: 'NV-A2',
    category: 'A_CHUNG',
    content: 'Không tham ô, tiêu cực, lãng phí; giữ gìn uy tín và tài sản của nhà trường',
    maxScore: 5
  },
  {
    id: 'crit_general_NV_B1',
    code: 'NV-B1',
    category: 'A_CHUNG',
    content: 'Chấp hành thời gian, phân công, nội quy và quy chế làm việc',
    maxScore: 4
  },
  {
    id: 'crit_general_NV_B2',
    code: 'NV-B2',
    category: 'A_CHUNG',
    content: 'Báo cáo đầy đủ, chính xác; phối hợp với đồng nghiệp và bộ phận liên quan',
    maxScore: 4
  },
  {
    id: 'crit_general_NV_B3',
    code: 'NV-B3',
    category: 'A_CHUNG',
    content: 'Sử dụng hiệu quả thời gian; giữ nơi làm việc gọn gàng, an toàn, tiết kiệm',
    maxScore: 4
  },
  {
    id: 'crit_general_NV_B4',
    code: 'NV-B4',
    category: 'A_CHUNG',
    content: 'Thực hiện nhiệm vụ đột xuất và các công việc khác do lãnh đạo phân công',
    maxScore: 4
  },
  {
    id: 'crit_general_NV_C1',
    code: 'NV-C1',
    category: 'A_CHUNG',
    content: 'Năng lực chuyên môn theo vị trí việc làm; sử dụng phần mềm, ứng dụng phục vụ công việc',
    maxScore: 4
  }
];

export const DEFAULT_STAFF_CRITERIA = GENERAL_STAFF_CRITERIA;

export const DEFAULT_STAFF_GROUPS = [
  {
    id: 'group_A',
    name: 'A. KPI CHUNG',
    maxScore: 30,
    criteria: GENERAL_STAFF_CRITERIA
  }
];

const COMMON_EVIDENCE_GUT = 'hồ sơ/sổ sách vị trí việc làm; báo cáo; phần mềm; biên bản kiểm tra; phiếu giao việc; xác nhận của bộ phận phụ trách.';
const COMMON_TRACKING = 'TTVP/bộ phận phụ trách; BGH kiểm tra, phê duyệt/tổng hợp.';

/**
 * B. BỘ BẢNG ĐIỂM 8 VỊ TRÍ VIỆC LÀM NHÂN VIÊN – 70 ĐIỂM/BỘ
 */
export const POSITION_CONFIGS: Record<StaffPositionKey, KpiStaffPositionConfig> = {
  KE_TOAN: {
    key: 'KE_TOAN',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: KẾ TOÁN – 70 ĐIỂM',
    positionName: 'Kế toán',
    keywords: ['kế toán', 'ke toan', 'tài chính', 'thu chi kế toán'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVKT_1', code: 'NVKT-1', stt: 1, category: 'B_VI_TRI', content: 'Chứng từ, sổ sách, hồ sơ kế toán đầy đủ; trình ký đúng quy trình', maxScore: 12 },
      { id: 'NVKT_2', code: 'NVKT-2', stt: 2, category: 'B_VI_TRI', content: 'Tham mưu kịp thời chế độ đối với CBGVNV; theo dõi dự toán được duyệt', maxScore: 10 },
      { id: 'NVKT_3', code: 'NVKT-3', stt: 3, category: 'B_VI_TRI', content: 'Công khai tài chính định kỳ; báo cáo tháng/quý và đối chiếu đúng hạn', maxScore: 10 },
      { id: 'NVKT_4', code: 'NVKT-4', stt: 4, category: 'B_VI_TRI', content: 'Theo dõi tài sản, kiểm kê học kỳ/năm; hồ sơ bảo quản đầy đủ', maxScore: 10 },
      { id: 'NVKT_5', code: 'NVKT-5', stt: 5, category: 'B_VI_TRI', content: 'Đối chiếu thu-chi hằng tháng; hướng dẫn hồ sơ quyết toán của các bộ phận', maxScore: 8 },
      { id: 'NVKT_6', code: 'NVKT-6', stt: 6, category: 'B_VI_TRI', content: 'Hạn chế tối đa sai sót; bảo mật hồ sơ, dữ liệu, chứng từ', maxScore: 8 },
      { id: 'NVKT_7', code: 'NVKT-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành nhiệm vụ tài chính phát sinh/đột xuất đúng yêu cầu', maxScore: 12 }
    ]
  },
  THU_QUY: {
    key: 'THU_QUY',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: THỦ QUỸ – 70 ĐIỂM',
    positionName: 'Thủ quỹ',
    keywords: ['thủ quỹ', 'thu quy', 'quản lý quỹ', 'tiền mặt'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVTQ_1', code: 'NVTQ-1', stt: 1, category: 'B_VI_TRI', content: 'Thu, chi đúng chứng từ và phê duyệt; không chi khi chưa được phép', maxScore: 12 },
      { id: 'NVTQ_2', code: 'NVTQ-2', stt: 2, category: 'B_VI_TRI', content: 'Lập sổ quỹ, chốt sổ hằng tháng, đối chiếu với kế toán đúng hạn', maxScore: 12 },
      { id: 'NVTQ_3', code: 'NVTQ-3', stt: 3, category: 'B_VI_TRI', content: 'Báo cáo Hiệu trưởng định kỳ về các khoản thu chi ngân sách và ngoài ngân sách', maxScore: 10 },
      { id: 'NVTQ_4', code: 'NVTQ-4', stt: 4, category: 'B_VI_TRI', content: 'Lưu trữ chứng từ, hồ sơ thu-chi đầy đủ, dễ kiểm tra', maxScore: 8 },
      { id: 'NVTQ_5', code: 'NVTQ-5', stt: 5, category: 'B_VI_TRI', content: 'Bảo đảm an toàn tiền mặt; không để thất thoát do chủ quan', maxScore: 10 },
      { id: 'NVTQ_6', code: 'NVTQ-6', stt: 6, category: 'B_VI_TRI', content: 'Phối hợp kế toán thu, nộp các khoản phí đúng quy định', maxScore: 8 },
      { id: 'NVTQ_7', code: 'NVTQ-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành nhiệm vụ thu-chi, kiểm kê, đối soát phát sinh đúng yêu cầu', maxScore: 10 }
    ]
  },
  VAN_THU: {
    key: 'VAN_THU',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: VĂN THƯ – 70 ĐIỂM',
    positionName: 'Văn thư',
    keywords: ['văn thư', 'van thu', 'văn bản', 'hồ sơ lưu trữ', 'lưu trữ'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVVT_1', code: 'NVVT-1', stt: 1, category: 'B_VI_TRI', content: 'Tiếp nhận, vào sổ, phân loại, chuyển văn bản kịp thời đến đúng bộ phận', maxScore: 12 },
      { id: 'NVVT_2', code: 'NVVT-2', stt: 2, category: 'B_VI_TRI', content: 'Kiểm tra thể thức trước khi trình ký; phát hành đúng quy trình', maxScore: 12 },
      { id: 'NVVT_3', code: 'NVVT-3', stt: 3, category: 'B_VI_TRI', content: 'Bảo quản hồ sơ đầy đủ; sắp xếp, lưu trữ dễ tìm, không tự ý cho mượn', maxScore: 12 },
      { id: 'NVVT_4', code: 'NVVT-4', stt: 4, category: 'B_VI_TRI', content: 'Bảo quản và sử dụng con dấu đúng quy định, đúng thẩm quyền', maxScore: 10 },
      { id: 'NVVT_5', code: 'NVVT-5', stt: 5, category: 'B_VI_TRI', content: 'Chuyển tải thông tin, báo cáo kịp thời; bảo đảm bí mật hồ sơ', maxScore: 8 },
      { id: 'NVVT_6', code: 'NVVT-6', stt: 6, category: 'B_VI_TRI', content: 'Cập nhật dữ liệu, văn bản điện tử chính xác, đúng thời hạn', maxScore: 6 },
      { id: 'NVVT_7', code: 'NVVT-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành công tác văn thư phát sinh, hội họp, hồ sơ theo phân công', maxScore: 10 }
    ]
  },
  Y_TE: {
    key: 'Y_TE',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: NHÂN VIÊN Y TẾ – 70 ĐIỂM',
    positionName: 'Nhân viên Y tế',
    keywords: ['y tế', 'y te', 'chăm sóc sức khỏe', 'phòng y tế'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVYT_1', code: 'NVYT-1', stt: 1, category: 'B_VI_TRI', content: 'Trực phòng y tế; khám sức khỏe ban đầu, cấp thuốc/sơ cứu theo quy định', maxScore: 12 },
      { id: 'NVYT_2', code: 'NVYT-2', stt: 2, category: 'B_VI_TRI', content: 'Phát hiện, báo ngay lãnh đạo khi học sinh bệnh nặng/tai nạn; phối hợp xử lý', maxScore: 10 },
      { id: 'NVYT_3', code: 'NVYT-3', stt: 3, category: 'B_VI_TRI', content: 'Đầy đủ hồ sơ, sổ sách, cơ số thuốc và trang thiết bị theo quy định', maxScore: 10 },
      { id: 'NVYT_4', code: 'NVYT-4', stt: 4, category: 'B_VI_TRI', content: 'Lập kế hoạch và báo cáo tháng, học kỳ, năm đúng hạn', maxScore: 10 },
      { id: 'NVYT_5', code: 'NVYT-5', stt: 5, category: 'B_VI_TRI', content: 'Theo dõi hồ sơ BHYT/BHTN; chăm sóc sức khỏe học sinh và CBGVNV', maxScore: 10 },
      { id: 'NVYT_6', code: 'NVYT-6', stt: 6, category: 'B_VI_TRI', content: 'Giám sát vệ sinh trường học, phối hợp hoạt động chăm sóc sức khỏe', maxScore: 8 },
      { id: 'NVYT_7', code: 'NVYT-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành nhiệm vụ y tế phát sinh/đột xuất theo phân công', maxScore: 10 }
    ]
  },
  BAO_VE: {
    key: 'BAO_VE',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: BẢO VỆ – 70 ĐIỂM',
    positionName: 'Bảo vệ',
    keywords: ['bảo vệ', 'bao ve', 'an ninh', 'bảo vệ trường'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVBV_1', code: 'NVBV-1', stt: 1, category: 'B_VI_TRI', content: 'Thực hiện đúng ca trực theo phân công; bảo đảm giờ giấc trực', maxScore: 12 },
      { id: 'NVBV_2', code: 'NVBV-2', stt: 2, category: 'B_VI_TRI', content: 'Quan sát, ghi nhận diễn biến bất thường; báo cáo kịp thời', maxScore: 12 },
      { id: 'NVBV_3', code: 'NVBV-3', stt: 3, category: 'B_VI_TRI', content: 'Hướng dẫn khách, kiểm soát ra vào và bố trí phương tiện theo quy định', maxScore: 10 },
      { id: 'NVBV_4', code: 'NVBV-4', stt: 4, category: 'B_VI_TRI', content: 'Phòng ngừa mất mát, hư hỏng; phát hiện và báo cáo nguy cơ', maxScore: 12 },
      { id: 'NVBV_5', code: 'NVBV-5', stt: 5, category: 'B_VI_TRI', content: 'Thực hiện yêu cầu PCCC, phối hợp xử lý tình huống an toàn', maxScore: 8 },
      { id: 'NVBV_6', code: 'NVBV-6', stt: 6, category: 'B_VI_TRI', content: 'Ghi chép ca trực, bàn giao đầy đủ, trung thực', maxScore: 6 },
      { id: 'NVBV_7', code: 'NVBV-7', stt: 7, category: 'B_VI_TRI', content: 'Hỗ trợ hội họp, sự kiện, xử lý tình huống phát sinh theo phân công', maxScore: 10 }
    ]
  },
  PHUC_VU: {
    key: 'PHUC_VU',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: NHÂN VIÊN PHỤC VỤ/VỆ SINH – 70 ĐIỂM',
    positionName: 'Nhân viên Phục vụ/Vệ sinh',
    keywords: ['phục vụ', 'vệ sinh', 'tạp vụ', 'phuc vu', 've sinh', 'tap vu'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVPV_1', code: 'NVPV-1', stt: 1, category: 'B_VI_TRI', content: 'Vệ sinh phòng lãnh đạo, phòng họp, khuôn viên, công trình vệ sinh theo phân công', maxScore: 15 },
      { id: 'NVPV_2', code: 'NVPV-2', stt: 2, category: 'B_VI_TRI', content: 'Thực hiện vệ sinh đúng lịch, bảo đảm sạch sẽ, gọn gàng', maxScore: 12 },
      { id: 'NVPV_3', code: 'NVPV-3', stt: 3, category: 'B_VI_TRI', content: 'Sử dụng, bảo quản dụng cụ và vật tư vệ sinh tiết kiệm', maxScore: 8 },
      { id: 'NVPV_4', code: 'NVPV-4', stt: 4, category: 'B_VI_TRI', content: 'Thực hiện yêu cầu an toàn, PCCC, tiết kiệm điện nước', maxScore: 10 },
      { id: 'NVPV_5', code: 'NVPV-5', stt: 5, category: 'B_VI_TRI', content: 'Chuẩn bị phòng, cơ sở phục vụ các cuộc họp/sự kiện theo phân công', maxScore: 10 },
      { id: 'NVPV_6', code: 'NVPV-6', stt: 6, category: 'B_VI_TRI', content: 'Kịp thời báo hỏng hóc, mất an toàn, thiếu vật tư cho người phụ trách', maxScore: 5 },
      { id: 'NVPV_7', code: 'NVPV-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành nhiệm vụ phát sinh theo phân công', maxScore: 10 }
    ]
  },
  THU_VIEN: {
    key: 'THU_VIEN',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: THƯ VIỆN – 70 ĐIỂM',
    positionName: 'Thư viện',
    keywords: ['thư viện', 'thu vien', 'cán bộ thư viện', 'sách'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVTV_1', code: 'NVTV-1', stt: 1, category: 'B_VI_TRI', content: 'Lập thư mục, sắp xếp, bảo quản sách; thực hiện đầy đủ sổ sách thư viện', maxScore: 12 },
      { id: 'NVTV_2', code: 'NVTV-2', stt: 2, category: 'B_VI_TRI', content: 'Quản lý thẻ, thời gian mượn-trả, ký nhận; thu hồi sách cuối năm', maxScore: 10 },
      { id: 'NVTV_3', code: 'NVTV-3', stt: 3, category: 'B_VI_TRI', content: 'Kiểm tra sách báo; lập danh mục mất, hỏng, cần thanh lý', maxScore: 10 },
      { id: 'NVTV_4', code: 'NVTV-4', stt: 4, category: 'B_VI_TRI', content: 'Lập kế hoạch, nội quy phòng đọc; phối hợp phát triển văn hóa đọc', maxScore: 10 },
      { id: 'NVTV_5', code: 'NVTV-5', stt: 5, category: 'B_VI_TRI', content: 'Cập nhật sách chuyên môn, giới thiệu sách mới, bài viết phù hợp', maxScore: 8 },
      { id: 'NVTV_6', code: 'NVTV-6', stt: 6, category: 'B_VI_TRI', content: 'Báo cáo lượt đọc, mượn, tình hình sách và bổ sung hằng tháng', maxScore: 10 },
      { id: 'NVTV_7', code: 'NVTV-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành mua/bổ sung sách và nhiệm vụ thư viện theo phân công', maxScore: 10 }
    ]
  },
  THIET_BI: {
    key: 'THIET_BI',
    title: 'B. KPI VỊ TRÍ VIỆC LÀM: THIẾT BỊ – 70 ĐIỂM',
    positionName: 'Thiết bị',
    keywords: ['thiết bị', 'thiet bi', 'phòng thí nghiệm', 'cán bộ thiết bị'],
    totalScore: 70,
    evidenceSuggestion: COMMON_EVIDENCE_GUT,
    trackingPerson: COMMON_TRACKING,
    criteria: [
      { id: 'NVTB_1', code: 'NVTB-1', stt: 1, category: 'B_VI_TRI', content: 'Sắp xếp, bảo quản thiết bị an toàn, dễ tìm; hồ sơ quản lý đầy đủ', maxScore: 12 },
      { id: 'NVTB_2', code: 'NVTB-2', stt: 2, category: 'B_VI_TRI', content: 'Phục vụ giáo viên mượn/trả thiết bị; theo dõi tình trạng sử dụng', maxScore: 10 },
      { id: 'NVTB_3', code: 'NVTB-3', stt: 3, category: 'B_VI_TRI', content: 'Bảo đảm chuẩn bị thiết bị phục vụ các tiết thực hành theo kế hoạch', maxScore: 12 },
      { id: 'NVTB_4', code: 'NVTB-4', stt: 4, category: 'B_VI_TRI', content: 'Lập danh mục cần bổ sung, thay thế, thanh lý; kiểm kê đúng kỳ', maxScore: 10 },
      { id: 'NVTB_5', code: 'NVTB-5', stt: 5, category: 'B_VI_TRI', content: 'Báo cáo tình hình sử dụng, bảo quản thiết bị và thực hành hằng tháng', maxScore: 10 },
      { id: 'NVTB_6', code: 'NVTB-6', stt: 6, category: 'B_VI_TRI', content: 'Đề xuất giải pháp phát huy hiệu quả thiết bị, thí nghiệm', maxScore: 6 },
      { id: 'NVTB_7', code: 'NVTB-7', stt: 7, category: 'B_VI_TRI', content: 'Hoàn thành chuẩn bị thiết bị, hỗ trợ sự kiện/thực hành phát sinh', maxScore: 10 }
    ]
  }
};

export const DEFAULT_STAFF_PERIODS: KpiStaffPeriod[] = [
  // 1. CÁC KỲ TỔNG HỢP (Kỳ I, Kỳ II, Cả năm)
  {
    id: 'period_staff_2026_hk1',
    name: 'Kỳ I (2026-2027)',
    academicYear: '2026-2027',
    periodType: 'term',
    periodValue: 'HK1',
    startDate: '2026-09-01',
    endDate: '2027-01-15',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Kỳ I năm học 2026-2027'
  },
  {
    id: 'period_staff_2026_hk2',
    name: 'Kỳ II (2026-2027)',
    academicYear: '2026-2027',
    periodType: 'term',
    periodValue: 'HK2',
    startDate: '2027-01-16',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Kỳ II năm học 2026-2027'
  },
  {
    id: 'period_staff_2026_2027',
    name: 'Cả năm (2026-2027)',
    academicYear: '2026-2027',
    periodType: 'year',
    periodValue: 'FULL_YEAR',
    startDate: '2026-09-01',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Tổng kết đánh giá, chấm điểm KPI Nhân viên Cả năm học 2026-2027 (Khung 30đ + 70đ)'
  },

  // 2. CÁC THÁNG TRONG NĂM HỌC 2026-2027
  {
    id: 'period_staff_2026_m09',
    name: 'Tháng 9/2026',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '09',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 9 năm học 2026-2027'
  },
  {
    id: 'period_staff_2026_m10',
    name: 'Tháng 10/2026',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 10 năm học 2026-2027'
  },
  {
    id: 'period_staff_2026_m11',
    name: 'Tháng 11/2026',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '11',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 11 năm học 2026-2027'
  },
  {
    id: 'period_staff_2026_m12',
    name: 'Tháng 12/2026',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '12',
    startDate: '2026-12-01',
    endDate: '2026-12-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 12 năm học 2026-2027'
  },
  {
    id: 'period_staff_2027_m01',
    name: 'Tháng 1/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '01',
    startDate: '2027-01-01',
    endDate: '2027-01-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 1 năm 2027'
  },
  {
    id: 'period_staff_2027_m02',
    name: 'Tháng 2/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '02',
    startDate: '2027-02-01',
    endDate: '2027-02-28',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 2 năm 2027'
  },
  {
    id: 'period_staff_2027_m03',
    name: 'Tháng 3/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '03',
    startDate: '2027-03-01',
    endDate: '2027-03-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 3 năm 2027'
  },
  {
    id: 'period_staff_2027_m04',
    name: 'Tháng 4/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '04',
    startDate: '2027-04-01',
    endDate: '2027-04-30',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 4 năm 2027'
  },
  {
    id: 'period_staff_2027_m05',
    name: 'Tháng 5/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '05',
    startDate: '2027-05-01',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 5 năm 2027'
  },
  {
    id: 'period_staff_2027_m06',
    name: 'Tháng 6/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '06',
    startDate: '2027-06-01',
    endDate: '2027-06-30',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 6 năm 2027'
  },
  {
    id: 'period_staff_2027_m07',
    name: 'Tháng 7/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '07',
    startDate: '2027-07-01',
    endDate: '2027-07-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 7 năm 2027'
  },
  {
    id: 'period_staff_2027_m08',
    name: 'Tháng 8/2027',
    academicYear: '2026-2027',
    periodType: 'month',
    periodValue: '08',
    startDate: '2027-08-01',
    endDate: '2027-08-31',
    status: 'active',
    description: 'Đánh giá KPI Nhân viên Tháng 8 năm 2027'
  }
];

/**
 * Tự động xác định bộ Vị trí việc làm dựa trên tên chức danh / công việc của nhân viên
 */
export const detectPositionKey = (positionStr: string): StaffPositionKey => {
  const p = (positionStr || '').toLowerCase();
  
  if (p.includes('thủ quỹ') || p.includes('thu quy')) return 'THU_QUY';
  if (p.includes('kế toán') || p.includes('ke toan') || p.includes('tài chính')) return 'KE_TOAN';
  if (p.includes('văn thư') || p.includes('van thu') || p.includes('lưu trữ')) return 'VAN_THU';
  if (p.includes('y tế') || p.includes('y te') || p.includes('sức khỏe')) return 'Y_TE';
  if (p.includes('bảo vệ') || p.includes('bao ve') || p.includes('an ninh')) return 'BAO_VE';
  if (p.includes('phục vụ') || p.includes('vệ sinh') || p.includes('tạp vụ') || p.includes('phuc vu')) return 'PHUC_VU';
  if (p.includes('thư viện') || p.includes('thu vien')) return 'THU_VIEN';
  if (p.includes('thiết bị') || p.includes('thiet bi') || p.includes('thí nghiệm')) return 'THIET_BI';

  return 'KE_TOAN'; // default fallback
};

/**
 * Lấy danh sách nhân viên hợp lệ thuộc Khối Nhân viên / Tổ Văn phòng
 */
export const isEligibleStaffEmployee = (t: Teacher): boolean => {
  if (!t) return false;
  const roleStr = (t.role || '').toUpperCase();
  const posStr = (t.position || '').toLowerCase();
  const deptStr = (t.departmentName || '').toLowerCase();

  if (roleStr === 'BGH' || posStr.includes('hiệu trưởng') || posStr.includes('phó hiệu trưởng')) {
    return false;
  }

  const keywords = ['nhân viên', 'kế toán', 'văn thư', 'thủ quỹ', 'y tế', 'thư viện', 'thiết bị', 'bảo vệ', 'tạp vụ', 'phục vụ', 'lái xe', 'tổ văn phòng'];
  if (keywords.some(kw => posStr.includes(kw) || deptStr.includes(kw))) {
    return true;
  }

  if (t.departmentId === 'd_van_phong' || t.departmentId === 'van_phong') {
    return true;
  }

  return false;
};

export const getEligibleStaffMembers = (teachers: Teacher[]): Teacher[] => {
  const staff = teachers.filter(t => isEligibleStaffEmployee(t));
  if (staff.length > 0) return staff;
  return teachers.filter(t => t.role !== 'BGH');
};

/**
 * Khởi tạo dữ liệu phiếu chấm cho một Nhân viên theo bộ Vị trí đã chọn
 */
export const createInitialStaffForm = (
  staff: Teacher,
  period: KpiStaffPeriod,
  positionKey?: StaffPositionKey
): KpiStaffForm => {
  const activeKey = positionKey || detectPositionKey(staff.position || '');
  const posConfig = POSITION_CONFIGS[activeKey];

  const generalItems: KpiStaffScoreItem[] = GENERAL_STAFF_CRITERIA.map(c => ({
    criterionId: c.id,
    code: c.code,
    category: 'A_CHUNG',
    content: c.content,
    maxScore: c.maxScore,
    selfScore: c.maxScore,
    evidence: ''
  }));

  const positionItems: KpiStaffScoreItem[] = posConfig.criteria.map(c => ({
    criterionId: c.id,
    code: c.code,
    category: 'B_VI_TRI',
    content: c.content,
    maxScore: c.maxScore,
    selfScore: c.maxScore,
    evidence: ''
  }));

  const genSelf = generalItems.reduce((acc, curr) => acc + curr.selfScore, 0);
  const posSelf = positionItems.reduce((acc, curr) => acc + curr.selfScore, 0);

  return {
    id: `form_staff_${staff.id}_${period.id}`,
    employeeId: staff.id,
    employeeName: staff.name,
    employeeCode: staff.code,
    employeeUsername: staff.username,
    position: staff.position || posConfig.positionName,
    positionKey: activeKey,
    department: staff.departmentName || 'Tổ Văn phòng',
    departmentId: staff.departmentId || 'd_van_phong',
    evaluatorName: 'TTVP/BGH',
    periodId: period.id,
    periodName: period.name,
    academicYear: period.academicYear,
    generalItems,
    positionItems,
    generalTotalSelf: genSelf,
    positionTotalSelf: posSelf,
    totalScore: genSelf + posSelf,
    selfClassification: getClassificationByScore(genSelf + posSelf),
    selfDate: new Date().toISOString().split('T')[0],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: staff.id
  };
};

export const getClassificationByScore = (score: number): string => {
  if (score >= 90) return 'Hoàn thành xuất sắc nhiệm vụ';
  if (score >= 80) return 'Hoàn thành tốt nhiệm vụ';
  if (score >= 50) return 'Hoàn thành nhiệm vụ';
  return 'Không hoàn thành nhiệm vụ';
};
