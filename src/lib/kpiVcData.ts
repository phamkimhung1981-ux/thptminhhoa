import { 
  KpiVcCriteriaGroup, 
  KpiVcCriterion, 
  KpiVcPeriod, 
  KpiVcScoreItem, 
  KpiVcCriteriaSnapshot,
  KpiVcLevel,
  KpiVcRatingTier,
  KpiVcRatingConfig
} from '../types/kpiVc';
import { Teacher, Department } from '../types';

/**
 * CẤU HÌNH XẾP LOẠI KPI MẶC ĐỊNH THEO THANG ĐIỂM 100
 * Áp dụng quy tắc khoảng điểm chuẩn:
 * - Mức 1 (Xuất sắc): 90 <= điểm <= 100
 * - Mức 2 (Hoàn thành tốt): 80 <= điểm < 90
 * - Mức 3 (Hoàn thành): 65 <= điểm < 80
 * - Mức 4 (Không hoàn thành): 0 <= điểm < 65
 */
export const DEFAULT_VC_RATING_TIERS: KpiVcRatingTier[] = [
  {
    id: 'tier_1',
    ratingName: 'Hoàn thành xuất sắc nhiệm vụ',
    minScore: 90,
    maxScore: 100,
    badgeColor: 'emerald',
    sortOrder: 1,
    isActive: true,
    description: 'Từ 90 đến 100 điểm'
  },
  {
    id: 'tier_2',
    ratingName: 'Hoàn thành tốt nhiệm vụ',
    minScore: 80,
    maxScore: 90,
    badgeColor: 'blue',
    sortOrder: 2,
    isActive: true,
    description: 'Từ 80 đến dưới 90 điểm'
  },
  {
    id: 'tier_3',
    ratingName: 'Hoàn thành nhiệm vụ',
    minScore: 65,
    maxScore: 80,
    badgeColor: 'amber',
    sortOrder: 3,
    isActive: true,
    description: 'Từ 65 đến dưới 80 điểm'
  },
  {
    id: 'tier_4',
    ratingName: 'Không hoàn thành nhiệm vụ',
    minScore: 0,
    maxScore: 65,
    badgeColor: 'rose',
    sortOrder: 4,
    isActive: true,
    description: 'Từ 0 đến dưới 65 điểm'
  }
];

export const KPI_RATING_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Xanh lá (Emerald)'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    label: 'Xanh dương (Blue)'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    label: 'Xanh chàm (Indigo)'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    label: 'Tím (Purple)'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'Vàng cam (Amber)'
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    label: 'Đỏ hồng (Rose)'
  },
  slate: {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    label: 'Xám (Slate)'
  }
};

/**
 * Kiểm tra hợp lệ các khoảng điểm xếp loại (Validation)
 * - Không được trùng/chồng lấn khoảng điểm
 * - Min <= Max và nằm trong khoảng [0, 100]
 * - Không bỏ trống tên xếp loại
 */
export const validateRatingTiers = (tiers: KpiVcRatingTier[]): { isValid: boolean; error?: string } => {
  const activeTiers = tiers.filter(t => t.isActive);
  if (activeTiers.length === 0) {
    return { isValid: false, error: 'Phải có ít nhất 1 mức xếp loại đang hoạt động.' };
  }

  for (const tier of activeTiers) {
    if (!tier.ratingName || !tier.ratingName.trim()) {
      return { isValid: false, error: 'Tên xếp loại không được để trống.' };
    }
    const min = Number(tier.minScore);
    const max = Number(tier.maxScore);
    if (isNaN(min) || isNaN(max)) {
      return { isValid: false, error: `Điểm nhập vào của mức "${tier.ratingName}" không hợp lệ.` };
    }
    if (min < 0 || min > 100 || max < 0 || max > 100) {
      return { isValid: false, error: `Điểm của mức "${tier.ratingName}" phải nằm trong khoảng từ 0 đến 100.` };
    }
    if (min > max) {
      return { isValid: false, error: `Điểm tối thiểu (${min}) không được lớn hơn điểm tối đa (${max}) ở mức "${tier.ratingName}".` };
    }
  }

  // Sắp xếp theo minScore tăng dần để kiểm tra chồng lấn
  const sorted = [...activeTiers].sort((a, b) => Number(a.minScore) - Number(b.minScore));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    // Nếu max của tier hiện tại lớn hơn min của tier kế tiếp -> Chồng lấn!
    if (Number(current.maxScore) > Number(next.minScore)) {
      return {
        isValid: false,
        error: `Khoảng điểm đang bị chồng lấn giữa "${current.ratingName}" (${current.minScore} - ${current.maxScore}) và "${next.ratingName}" (${next.minScore} - ${next.maxScore}).`
      };
    }
  }

  return { isValid: true };
};

/**
 * 3 NHÓM TIÊU CHÍ CHUẨN THEO FILE PDF:
 * I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG: 15 điểm
 * II. TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT: 15 điểm
 * III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ: 70 điểm
 * TỔNG CỘNG: 100 ĐIỂM
 */

export const DEFAULT_VC_GROUPS: KpiVcCriteriaGroup[] = [
  {
    id: 'group_I',
    code: 'I',
    name: 'Chính trị tư tưởng, đạo đức lối sống',
    maxScore: 15,
    order: 1,
    description: 'Chấp hành chủ trương của Đảng, pháp luật Nhà nước, lối sống trung thực, giản dị, tinh thần đoàn kết.',
    isActive: true
  },
  {
    id: 'group_II',
    code: 'II',
    name: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    maxScore: 15,
    order: 2,
    description: 'Tinh thần trách nhiệm, phương pháp làm việc, văn hóa công sở, chấp hành nội quy và sự phân công.',
    isActive: true
  },
  {
    id: 'group_III',
    code: 'III',
    name: 'Kết quả thực hiện nhiệm vụ',
    maxScore: 70,
    order: 3,
    description: 'Bao gồm Năng lực & Kỹ năng làm việc (10 điểm) và Kết quả thực hiện nhiệm vụ được giao (60 điểm).',
    isActive: true
  }
];

export const DEFAULT_VC_LEVELS_III_2: KpiVcLevel[] = [
  {
    id: 'level_2_1',
    code: '2.1',
    name: 'MỨC 1',
    score: 60,
    description: 'Hoàn thành 100% công việc theo kế hoạch, lịch công tác, đúng tiến độ, bảo đảm chất lượng, hiệu quả cao: tối đa 60 điểm.',
    order: 1
  },
  {
    id: 'level_2_2',
    code: '2.2',
    name: 'MỨC 2',
    score: 50,
    description: 'Hoàn thành 100% công việc theo kế hoạch, lịch công tác, đúng tiến độ, bảo đảm chất lượng, hiệu quả: tối đa 50 điểm.',
    order: 2
  },
  {
    id: 'level_2_3',
    code: '2.3',
    name: 'MỨC 3',
    score: 30,
    description: 'Hoàn thành 100% công việc theo kế hoạch, lịch công tác, có nhiệm vụ hiệu quả thấp: tối đa 30 điểm.',
    order: 3
  },
  {
    id: 'level_2_4',
    code: '2.4',
    name: 'MỨC 4',
    score: 20,
    description: 'Hoàn thành từ 50% đến dưới 100% công việc theo kế hoạch: tối đa 20 điểm.',
    order: 4
  },
  {
    id: 'level_2_5',
    code: '2.5',
    name: 'MỨC 5',
    score: 10,
    description: 'Hoàn thành dưới 50% công việc theo kế hoạch: tối đa 10 điểm.',
    order: 5
  }
];

export const DEFAULT_VC_CRITERIA: KpiVcCriterion[] = [
  // --- NHÓM I: CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (15 ĐIỂM - 8 TIÊU CHÍ) ---
  {
    id: 'crit_I_1',
    code: 'I.1',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 1,
    content: 'Chấp hành chủ trương, đường lối của Đảng, chính sách, pháp luật của Nhà nước; thực hiện đúng quy định của ngành và của nhà trường.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_2',
    code: 'I.2',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 2,
    content: 'Có lập trường, bản lĩnh chính trị vững vàng; có ý thức trách nhiệm, không dao động trước khó khăn; thực hiện nghiêm nhiệm vụ được giao.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_3',
    code: 'I.3',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 3,
    content: 'Đặt lợi ích của tập thể, học sinh và nhà trường lên trên lợi ích cá nhân; có tinh thần trách nhiệm với chất lượng giáo dục.',
    maxScore: 1.5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_4',
    code: 'I.4',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 4,
    content: 'Chủ động nghiên cứu, học tập, cập nhật nghị quyết, chỉ thị, văn bản chỉ đạo và vận dụng phù hợp vào nhiệm vụ giáo dục.',
    maxScore: 1.5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_5',
    code: 'I.5',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 5,
    content: 'Không tham ô, tham nhũng, tiêu cực, lãng phí; không gian lận trong đánh giá học sinh; không có hành vi gây ảnh hưởng quyền lợi chính đáng của học sinh.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_6',
    code: 'I.6',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 6,
    content: 'Trung thực, khiêm tốn, chân thành, chuẩn mực; giữ gìn phẩm chất, uy tín và danh dự nhà giáo.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_7',
    code: 'I.7',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 7,
    content: 'Đoàn kết, tôn trọng, hỗ trợ đồng nghiệp; phối hợp xây dựng tổ chuyên môn và nhà trường.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_I_8',
    code: 'I.8',
    groupId: 'group_I',
    groupName: 'Chính trị tư tưởng, đạo đức lối sống',
    order: 8,
    content: 'Không để người thân, người quen lợi dụng vị trí công tác để trục lợi; không lợi dụng nhiệm vụ giáo dục để vụ lợi cá nhân.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },

  // --- NHÓM II: TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT (15 ĐIỂM - 8 TIÊU CHÍ) ---
  {
    id: 'crit_II_1',
    code: 'II.1',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 1,
    content: 'Có trách nhiệm với công việc; chủ động, năng động, sáng tạo; hoàn thành nhiệm vụ đúng thời hạn.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_2',
    code: 'II.2',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 2,
    content: 'Lập kế hoạch công việc khoa học; thực hiện nhiệm vụ theo thứ tự ưu tiên; lưu trữ hồ sơ, minh chứng đầy đủ.',
    maxScore: 1.5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_3',
    code: 'II.3',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 3,
    content: 'Có tinh thần phối hợp với TTCM, GVCN, giáo viên bộ môn, BGH, Đoàn trường và các bộ phận liên quan.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_4',
    code: 'II.4',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 4,
    content: 'Ứng xử chuẩn mực với học sinh, cha mẹ học sinh, đồng nghiệp; thực hiện văn hóa công sở và văn hóa nhà trường.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_5',
    code: 'II.5',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 5,
    content: 'Chấp hành sự phân công của tổ chức; thực hiện nghiêm nhiệm vụ chuyên môn, kiêm nhiệm và nhiệm vụ đột xuất được giao.',
    maxScore: 1.5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_6',
    code: 'II.6',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 6,
    content: 'Thực hiện đúng quy chế chuyên môn, nội quy, quy chế làm việc; bảo đảm giờ giấc, thời khóa biểu, quy trình xin nghỉ, dạy thay, đổi tiết, dạy bù.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_7',
    code: 'II.7',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 7,
    content: 'Thực hiện đầy đủ, đúng hạn các báo cáo; cung cấp thông tin chính xác, khách quan; cập nhật dữ liệu trên các phần mềm được giao.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_II_8',
    code: 'II.8',
    groupId: 'group_II',
    groupName: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    order: 8,
    content: 'Tham gia đầy đủ họp hội đồng, sinh hoạt tổ/nhóm chuyên môn, tập huấn và hoạt động chung theo phân công; có tinh thần hợp tác.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },

  // --- NHÓM III.1: NĂNG LỰC VÀ KỸ NĂNG LÀM VIỆC (10 ĐIỂM - 4 TIÊU CHÍ) ---
  {
    id: 'crit_III_A_1',
    code: 'III.1.1',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'A',
    order: 1,
    content: 'Năng lực chuyên môn, nghiệp vụ theo vị trí việc làm; nắm vững chương trình, nội dung môn học/hoạt động giáo dục.',
    maxScore: 3,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_A_2',
    code: 'III.1.2',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'A',
    order: 2,
    content: 'Khả năng đáp ứng nhiệm vụ thường xuyên và nhiệm vụ đột xuất; chủ động xử lý công việc trong phạm vi trách nhiệm.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_A_3',
    code: 'III.1.3',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'A',
    order: 3,
    content: 'Sử dụng thành thạo phần mềm quản lý, hồ sơ điện tử, công cụ CNTT và công cụ số phục vụ công việc.',
    maxScore: 2,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_A_4',
    code: 'III.1.4',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'A',
    order: 4,
    content: 'Có khả năng phân tích dữ liệu học tập, phát hiện vấn đề, điều chỉnh biện pháp dạy học và hỗ trợ học sinh.',
    maxScore: 3,
    scoreType: 'input_score',
    isActive: true
  },

  // --- NHÓM III.2: KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (60 ĐIỂM - 10 TIÊU CHÍ) ---
  {
    id: 'crit_III_B_GV01',
    code: '1',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 5,
    content: 'Thực hiện đúng chương trình, thời khóa biểu và tiến độ dạy học; không tự ý bỏ tiết/đổi tiết; báo cáo và xử lý kịp thời khi có phát sinh.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV02',
    code: '2',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 6,
    content: 'Xây dựng và thực hiện kế hoạch giáo dục môn học; kế hoạch bài dạy đầy đủ, đúng yêu cầu, đúng tiến độ; cập nhật kho hồ sơ điện tử theo quy định.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV03',
    code: '3',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 7,
    content: 'Tổ chức giờ dạy hiệu quả: quản lý nền nếp, phát huy hoạt động học của học sinh, sử dụng phương pháp/kỹ thuật dạy học phù hợp đối tượng.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV04',
    code: '4',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 8,
    content: 'Đổi mới phương pháp, ứng dụng CNTT/AI và học liệu số phù hợp, có kiểm soát; không lạm dụng công nghệ; có sản phẩm hoặc minh chứng sử dụng.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV05',
    code: '5',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 9,
    content: 'Theo dõi sự tiến bộ của học sinh; xác định học sinh cần hỗ trợ; thực hiện phụ đạo, bồi dưỡng hoặc biện pháp hỗ trợ theo phân công.',
    maxScore: 7,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV06',
    code: '6',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 10,
    content: 'Thực hiện kiểm tra, đánh giá đúng kế hoạch; xây dựng ma trận/đặc tả/đề/đáp án theo thống nhất chuyên môn; bảo đảm phân hóa và công bằng.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV07',
    code: '7',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 11,
    content: 'Chấm, chữa, nhận xét; trả bài; cập nhật điểm và hồ sơ điện tử đúng thời hạn; sửa điểm/thông tin học sinh đúng quy trình.',
    maxScore: 6,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV08',
    code: '8',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 12,
    content: 'Tham gia dự giờ, thao giảng, nghiên cứu bài học; tiếp thu và thực hiện điều chỉnh sau góp ý chuyên môn.',
    maxScore: 5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV09',
    code: '9',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 13,
    content: 'Tham gia sinh hoạt chuyên môn, tập huấn, bồi dưỡng; có sản phẩm chia sẻ chuyên môn, học liệu, chuyên đề, sáng kiến hoặc giải pháp cải tiến.',
    maxScore: 5,
    scoreType: 'input_score',
    isActive: true
  },
  {
    id: 'crit_III_B_GV10',
    code: '10',
    groupId: 'group_III',
    groupName: 'Kết quả thực hiện nhiệm vụ',
    subGroup: 'B',
    order: 14,
    content: 'Hoàn thành nhiệm vụ chủ nhiệm/kiêm nhiệm/nhiệm vụ khác được giao; phối hợp với CMHS và các lực lượng giáo dục; theo dõi, hỗ trợ học sinh có nguy cơ bỏ học hoặc vi phạm.',
    maxScore: 7,
    scoreType: 'input_score',
    isActive: true
  }
];

export const DEFAULT_VC_PERIODS: KpiVcPeriod[] = [
  // Năm học 2026-2027
  {
    id: 'vc_period_2026_2027_ca_nam',
    name: 'Cả năm học 2026-2027',
    academicYear: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Tổng kết đánh giá KPI viên chức cả năm học 2026-2027'
  },
  {
    id: 'vc_period_2026_2027_hk2',
    name: 'Học kỳ II năm học 2026-2027',
    academicYear: '2026-2027',
    startDate: '2027-01-16',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ II năm học 2026-2027'
  },
  {
    id: 'vc_period_2026_2027_hk1',
    name: 'Học kỳ I năm học 2026-2027',
    academicYear: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-01-15',
    status: 'active',
    description: 'Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ I năm học 2026-2027'
  },
  { id: 'vc_period_2026_01', name: 'Tháng 1/2026', academicYear: '2025-2026', startDate: '2026-01-01', endDate: '2026-01-31', status: 'active', description: 'Đánh giá KPI tháng 1 năm 2026' },
  { id: 'vc_period_2026_02', name: 'Tháng 2/2026', academicYear: '2025-2026', startDate: '2026-02-01', endDate: '2026-02-28', status: 'active', description: 'Đánh giá KPI tháng 2 năm 2026' },
  { id: 'vc_period_2026_03', name: 'Tháng 3/2026', academicYear: '2025-2026', startDate: '2026-03-01', endDate: '2026-03-31', status: 'active', description: 'Đánh giá KPI tháng 3 năm 2026' },
  { id: 'vc_period_2026_04', name: 'Tháng 4/2026', academicYear: '2025-2026', startDate: '2026-04-01', endDate: '2026-04-30', status: 'active', description: 'Đánh giá KPI tháng 4 năm 2026' },
  { id: 'vc_period_2026_05', name: 'Tháng 5/2026', academicYear: '2025-2026', startDate: '2026-05-01', endDate: '2026-05-31', status: 'active', description: 'Đánh giá KPI tháng 5 năm 2026' },
  { id: 'vc_period_2026_06', name: 'Tháng 6/2026', academicYear: '2025-2026', startDate: '2026-06-01', endDate: '2026-06-30', status: 'active', description: 'Đánh giá KPI tháng 6 năm 2026' },
  { id: 'vc_period_2026_07', name: 'Tháng 7/2026', academicYear: '2025-2026', startDate: '2026-07-01', endDate: '2026-07-31', status: 'active', description: 'Đánh giá KPI tháng 7 năm 2026' },
  { id: 'vc_period_2026_08', name: 'Tháng 8/2026', academicYear: '2025-2026', startDate: '2026-08-01', endDate: '2026-08-31', status: 'active', description: 'Đánh giá KPI tháng 8 năm 2026' },
  { id: 'vc_period_2026_09', name: 'Tháng 9/2026', academicYear: '2026-2027', startDate: '2026-09-01', endDate: '2026-09-30', status: 'active', description: 'Đánh giá KPI tháng 9 năm 2026' },
  { id: 'vc_period_2026_10', name: 'Tháng 10/2026', academicYear: '2026-2027', startDate: '2026-10-01', endDate: '2026-10-31', status: 'active', description: 'Đánh giá KPI tháng 10 năm 2026' },
  { id: 'vc_period_2026_11', name: 'Tháng 11/2026', academicYear: '2026-2027', startDate: '2026-11-01', endDate: '2026-11-30', status: 'active', description: 'Đánh giá KPI tháng 11 năm 2026' },
  { id: 'vc_period_2026_12', name: 'Tháng 12/2026', academicYear: '2026-2027', startDate: '2026-12-01', endDate: '2026-12-31', status: 'active', description: 'Đánh giá KPI tháng 12 năm 2026' },
  { id: 'vc_period_2027_01', name: 'Tháng 1/2027', academicYear: '2026-2027', startDate: '2027-01-01', endDate: '2027-01-31', status: 'active', description: 'Đánh giá KPI tháng 1 năm 2027' },
  { id: 'vc_period_2027_02', name: 'Tháng 2/2027', academicYear: '2026-2027', startDate: '2027-02-01', endDate: '2027-02-28', status: 'active', description: 'Đánh giá KPI tháng 2 năm 2027' },
  { id: 'vc_period_2027_03', name: 'Tháng 3/2027', academicYear: '2026-2027', startDate: '2027-03-01', endDate: '2027-03-31', status: 'active', description: 'Đánh giá KPI tháng 3 năm 2027' },
  { id: 'vc_period_2027_04', name: 'Tháng 4/2027', academicYear: '2026-2027', startDate: '2027-04-01', endDate: '2027-04-30', status: 'active', description: 'Đánh giá KPI tháng 4 năm 2027' },
  { id: 'vc_period_2027_05', name: 'Tháng 5/2027', academicYear: '2026-2027', startDate: '2027-05-01', endDate: '2027-05-31', status: 'active', description: 'Đánh giá KPI tháng 5 năm 2027' },
  { id: 'vc_period_2027_06', name: 'Tháng 6/2027', academicYear: '2026-2027', startDate: '2027-06-01', endDate: '2027-06-30', status: 'active', description: 'Đánh giá KPI tháng 6 năm 2027' },
  { id: 'vc_period_2027_07', name: 'Tháng 7/2027', academicYear: '2026-2027', startDate: '2027-07-01', endDate: '2027-07-31', status: 'active', description: 'Đánh giá KPI tháng 7 năm 2027' },
  { id: 'vc_period_2027_08', name: 'Tháng 8/2027', academicYear: '2026-2027', startDate: '2027-08-01', endDate: '2027-08-31', status: 'active', description: 'Đánh giá KPI tháng 8 năm 2027' },

  // Năm học 2025-2026
  {
    id: 'vc_period_2025_2026_ca_nam',
    name: 'Cả năm học 2025-2026',
    academicYear: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-05-31',
    status: 'active',
    description: 'Tổng kết đánh giá KPI viên chức cả năm học 2025-2026'
  },
  {
    id: 'vc_period_2025_2026_hk2',
    name: 'Học kỳ II năm học 2025-2026',
    academicYear: '2025-2026',
    startDate: '2026-01-16',
    endDate: '2026-05-31',
    status: 'active',
    description: 'Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ II năm học 2025-2026'
  },
  {
    id: 'vc_period_2025_2026_hk1',
    name: 'Kỳ đánh giá Học kỳ I',
    academicYear: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-01-15',
    status: 'active',
    description: 'Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ I năm học 2025-2026'
  }
];

/**
 * Kiểm tra xem một cán bộ/giáo viên có phải là VIÊN CHỨC KHÔNG GIỮ CHỨC VỤ LÃNH ĐẠO / QUẢN LÝ hay không
 * (Giáo viên, Nhân viên; Không bao gồm Hiệu trưởng, Phó Hiệu trưởng).
 */
export const isEligibleVcEmployee = (t: Teacher): boolean => {
  if (!t) return false;
  const roleStr = (t.role || '').toUpperCase();
  const posStr = (t.position || '').toLowerCase();
  const nameStr = (t.name || '').toLowerCase();

  // Loại trừ Hiệu trưởng, Phó Hiệu trưởng, Ban Giám hiệu lãnh đạo cao nhất
  if (roleStr === 'BGH' || roleStr === 'ADMIN' && t.id === 'admin') {
    if (posStr.includes('hiệu trưởng') || posStr.includes('phó hiệu trưởng') || posStr.includes('bgh')) {
      return false;
    }
  }
  if (posStr.includes('hiệu trưởng') || posStr.includes('phó hiệu trưởng')) {
    return false;
  }
  if (nameStr.includes('hiệu trưởng') || nameStr.includes('phó hiệu trưởng')) {
    return false;
  }

  return true;
};

/**
 * Lấy danh sách Giáo viên & Nhân viên hợp lệ cho module này
 */
export const getEligibleVcTeachers = (teachers: Teacher[]): Teacher[] => {
  return teachers.filter(t => isEligibleVcEmployee(t));
};

/**
 * Tạo snapshot bộ tiêu chí hiện tại
 */
export const createCriteriaSnapshot = (
  groups: KpiVcCriteriaGroup[] = DEFAULT_VC_GROUPS,
  criteria: KpiVcCriterion[] = DEFAULT_VC_CRITERIA
): KpiVcCriteriaSnapshot => {
  return {
    version: 1,
    snapshotDate: new Date().toISOString(),
    groups: groups.filter(g => g.isActive),
    criteria: criteria.filter(c => c.isActive)
  };
};

/**
 * Khởi tạo danh sách Score Items từ criteria
 */
export const initializeVcScoreItems = (criteria: KpiVcCriterion[] = DEFAULT_VC_CRITERIA): KpiVcScoreItem[] => {
  const activeCriteria = criteria.filter(c => c.isActive);

  return activeCriteria.map(c => {
    let selfScore = 0;
    let selectedLevelId: string | undefined = undefined;
    let selectedLevelName: string | undefined = undefined;
    let selectedLevelCode: string | undefined = undefined;

    if (c.scoreType === 'select_level' && c.levels && c.levels.length > 0) {
      // Không chọn mặc định để GV tự tích vào hộp kiểm
      selectedLevelId = undefined;
      selectedLevelName = undefined;
      selectedLevelCode = undefined;
      selfScore = 0;
    } else {
      // Mặc định điểm tối đa
      selfScore = c.maxScore;
    }

    return {
      criterionId: c.id,
      criterionCode: c.code,
      groupId: c.groupId,
      groupName: c.groupName,
      subGroup: c.subGroup,
      order: c.order,
      content: c.content,
      maxScore: c.maxScore,
      scoreType: c.scoreType,
      selectedLevelId,
      selectedLevelName,
      selectedLevelCode,
      selfScore,
      note: '',
      ttcmScore: null,
      ttcmComment: '',
      managerScore: null,
      managerComment: ''
    };
  });
};

/**
 * Tính tổng điểm TTCM theo từng nhóm và tổng cộng (Tối đa 100)
 */
export const calculateVcTtcmTotals = (items: KpiVcScoreItem[]) => {
  const ttcmGroupScores: Record<string, number> = {
    group_I: 0,
    group_II: 0,
    group_III: 0
  };

  let ttcmTotalScore = 0;
  let evaluatedCount = 0;

  for (const item of items) {
    if (item.ttcmScore !== undefined && item.ttcmScore !== null && !isNaN(Number(item.ttcmScore))) {
      evaluatedCount++;
      const score = Math.max(0, Math.min(item.maxScore, Number(item.ttcmScore) || 0));
      if (!ttcmGroupScores[item.groupId]) {
        ttcmGroupScores[item.groupId] = 0;
      }
      ttcmGroupScores[item.groupId] += score;
      ttcmTotalScore += score;
    }
  }

  // Làm tròn 1 chữ số thập phân
  Object.keys(ttcmGroupScores).forEach(key => {
    ttcmGroupScores[key] = Math.round(ttcmGroupScores[key] * 10) / 10;
  });
  ttcmTotalScore = Math.round(ttcmTotalScore * 10) / 10;
  ttcmTotalScore = Math.min(100, Math.max(0, ttcmTotalScore));

  const ratio = Math.round((ttcmTotalScore / 100) * 1000) / 10;

  return {
    ttcmGroupScores,
    ttcmTotalScore,
    evaluatedCount,
    ratio
  };
};

/**
 * Biệt danh hỗ trợ cho calculateVcTctmTotals (tránh lỗi lệch ký tự)
 */
export const calculateVcTctmTotals = calculateVcTtcmTotals;

/**
 * Tính tổng điểm CBQL theo từng nhóm và tổng cộng (Tối đa 100)
 */
export const calculateVcManagerTotals = (items: KpiVcScoreItem[]) => {
  const managerGroupScores: Record<string, number> = {
    group_I: 0,
    group_II: 0,
    group_III: 0
  };

  let managerTotalScore = 0;
  let evaluatedCount = 0;

  for (const item of items) {
    if (item.managerScore !== undefined && item.managerScore !== null && !isNaN(Number(item.managerScore))) {
      evaluatedCount++;
      const score = Math.max(0, Math.min(item.maxScore, Number(item.managerScore) || 0));
      if (!managerGroupScores[item.groupId]) {
        managerGroupScores[item.groupId] = 0;
      }
      managerGroupScores[item.groupId] += score;
      managerTotalScore += score;
    }
  }

  // Làm tròn 1 chữ số thập phân
  Object.keys(managerGroupScores).forEach(key => {
    managerGroupScores[key] = Math.round(managerGroupScores[key] * 10) / 10;
  });
  managerTotalScore = Math.round(managerTotalScore * 10) / 10;
  managerTotalScore = Math.min(100, Math.max(0, managerTotalScore));

  const ratio = Math.round((managerTotalScore / 100) * 1000) / 10; // e.g. 92.0%

  return {
    managerGroupScores,
    managerTotalScore,
    evaluatedCount,
    ratio
  };
};

/**
 * Tính tổng điểm Giáo viên tự chấm theo từng nhóm và tổng cộng (Tối đa 100)
 */
export const calculateVcTotals = (items: KpiVcScoreItem[]) => {
  const groupScores: Record<string, number> = {
    group_I: 0,
    group_II: 0,
    group_III: 0
  };

  let totalScore = 0;

  for (const item of items) {
    const score = Math.max(0, Math.min(item.maxScore, Number(item.selfScore) || 0));
    if (!groupScores[item.groupId]) {
      groupScores[item.groupId] = 0;
    }
    groupScores[item.groupId] += score;
    totalScore += score;
  }

  // Làm tròn 1 chữ số thập phân
  Object.keys(groupScores).forEach(key => {
    groupScores[key] = Math.round(groupScores[key] * 10) / 10;
  });
  totalScore = Math.round(totalScore * 10) / 10;

  // Giới hạn max 100
  totalScore = Math.min(100, Math.max(0, totalScore));

  return {
    groupScores,
    totalScore
  };
};

export const calculateVcSelfTotals = calculateVcTotals;

/**
 * Kết quả tính xếp loại KPI
 */
export interface KpiRatingResult {
  ratingName: string;
  minScore: number;
  maxScore: number;
  badgeColor: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}

/**
 * Lấy cấu hình xếp loại có hiệu lực cho một kỳ đánh giá
 */
export const getEffectiveRatingConfig = (
  periodId?: string,
  configs?: KpiVcRatingConfig[]
): { tiers: KpiVcRatingTier[]; isLockedWhenPeriodCompleted?: boolean } => {
  if (configs && configs.length > 0) {
    if (periodId && periodId !== 'all') {
      const match = configs.find(c => c.periodId === periodId && c.isActive);
      if (match && match.tiers && match.tiers.length > 0) {
        return {
          tiers: match.tiers.filter(t => t.isActive),
          isLockedWhenPeriodCompleted: match.isLockedWhenPeriodCompleted
        };
      }
    }
    const defaultCfg = configs.find(c => (c.periodId === 'all' || c.periodId === 'default') && c.isActive);
    if (defaultCfg && defaultCfg.tiers && defaultCfg.tiers.length > 0) {
      return {
        tiers: defaultCfg.tiers.filter(t => t.isActive),
        isLockedWhenPeriodCompleted: defaultCfg.isLockedWhenPeriodCompleted
      };
    }
  }
  return { tiers: DEFAULT_VC_RATING_TIERS };
};

/**
 * HÀM TÍNH XẾP LOẠI DÙNG CHUNG TOÀN HỆ THỐNG
 * - Lấy cấu hình xếp loại của kỳ (hoặc mặc định)
 * - Sắp xếp theo ngưỡng điểm giảm dần
 * - Tìm khoảng chứa điểm:
 *   + Mức cao nhất (maxScore = 100): minScore <= điểm <= 100
 *   + Các mức khác: minScore <= điểm < maxScore
 *   + Biên điểm 0: 0 <= điểm < maxScore
 * - Trả về tên xếp loại, khoảng điểm, màu sắc và style nhãn
 */
export const getKpiRating = (
  score: number,
  periodId?: string,
  configs?: KpiVcRatingConfig[]
): KpiRatingResult => {
  const numScore = isNaN(Number(score)) ? 0 : Math.max(0, Math.min(100, Number(score)));
  const { tiers } = getEffectiveRatingConfig(periodId, configs);
  
  const activeTiers = (tiers.length > 0 ? tiers : DEFAULT_VC_RATING_TIERS)
    .filter(t => t.isActive)
    .sort((a, b) => Number(b.minScore) - Number(a.minScore));

  if (activeTiers.length === 0) {
    return {
      ratingName: 'Chưa xếp loại',
      minScore: 0,
      maxScore: 100,
      badgeColor: 'slate',
      badgeStyle: KPI_RATING_COLOR_MAP.slate
    };
  }

  // Tìm mức cao nhất (có maxScore lớn nhất)
  const highestMax = Math.max(...activeTiers.map(t => Number(t.maxScore)));

  for (const tier of activeTiers) {
    const min = Number(tier.minScore);
    const max = Number(tier.maxScore);

    // Mức cao nhất: [min, max] (cho phép điểm = 100 hoặc = highestMax)
    if (max >= highestMax) {
      if (numScore >= min && numScore <= max) {
        const colorKey = tier.badgeColor || 'blue';
        const style = KPI_RATING_COLOR_MAP[colorKey] || KPI_RATING_COLOR_MAP.blue;
        return {
          ratingName: tier.ratingName,
          minScore: min,
          maxScore: max,
          badgeColor: colorKey,
          badgeStyle: style
        };
      }
    } else {
      // Các mức khác: [min, max) (nửa khoảng: min <= score < max)
      // Ngoại lệ: Nếu numScore == 0 và min == 0
      if (numScore >= min && numScore < max) {
        const colorKey = tier.badgeColor || 'blue';
        const style = KPI_RATING_COLOR_MAP[colorKey] || KPI_RATING_COLOR_MAP.blue;
        return {
          ratingName: tier.ratingName,
          minScore: min,
          maxScore: max,
          badgeColor: colorKey,
          badgeStyle: style
        };
      }
    }
  }

  // Fallback: nếu điểm đúng 0 mà chưa khớp, hoặc nằm sát biên dưới
  if (numScore === 0) {
    const lowestTier = activeTiers[activeTiers.length - 1];
    const colorKey = lowestTier.badgeColor || 'rose';
    return {
      ratingName: lowestTier.ratingName,
      minScore: Number(lowestTier.minScore),
      maxScore: Number(lowestTier.maxScore),
      badgeColor: colorKey,
      badgeStyle: KPI_RATING_COLOR_MAP[colorKey] || KPI_RATING_COLOR_MAP.rose
    };
  }

  // Fallback chung
  const fallbackTier = activeTiers[0];
  const colorKey = fallbackTier.badgeColor || 'blue';
  return {
    ratingName: fallbackTier.ratingName,
    minScore: Number(fallbackTier.minScore),
    maxScore: Number(fallbackTier.maxScore),
    badgeColor: colorKey,
    badgeStyle: KPI_RATING_COLOR_MAP[colorKey] || KPI_RATING_COLOR_MAP.blue
  };
};

/**
 * Tự động xếp loại theo điểm số và cấu hình kỳ đánh giá
 */
export const resolveVcClassification = (
  totalScore: number,
  periodId?: string,
  configs?: KpiVcRatingConfig[]
): string => {
  return getKpiRating(totalScore, periodId, configs).ratingName;
};

/**
 * Lấy kiểu dáng nhãn hiển thị cho một tên xếp loại hoặc một điểm số
 */
export const getVcClassificationBadge = (
  ratingNameOrScore: string | number,
  periodId?: string,
  configs?: KpiVcRatingConfig[]
): { bg: string; text: string; border: string; dot: string } => {
  if (typeof ratingNameOrScore === 'number') {
    return getKpiRating(ratingNameOrScore, periodId, configs).badgeStyle;
  }

  const { tiers } = getEffectiveRatingConfig(periodId, configs);
  const matchedTier = tiers.find(t => t.ratingName.trim().toLowerCase() === String(ratingNameOrScore).trim().toLowerCase());
  if (matchedTier && matchedTier.badgeColor && KPI_RATING_COLOR_MAP[matchedTier.badgeColor]) {
    return KPI_RATING_COLOR_MAP[matchedTier.badgeColor];
  }

  const str = String(ratingNameOrScore || '').toLowerCase();
  if (str.includes('xuất sắc')) return KPI_RATING_COLOR_MAP.emerald;
  if (str.includes('tốt')) return KPI_RATING_COLOR_MAP.blue;
  if (str.includes('không') || str.includes('chưa')) return KPI_RATING_COLOR_MAP.rose;
  if (str.includes('hoàn thành')) return KPI_RATING_COLOR_MAP.amber;

  return KPI_RATING_COLOR_MAP.slate;
};

/**
 * Tra cứu chức vụ chuẩn của giáo viên / nhân viên
 */
export const resolveVcTeacherPosition = (teacher: Teacher | null | undefined, departments: Department[] = []): string => {
  if (!teacher) return 'Viên chức';
  if (teacher.position && teacher.position.trim()) return teacher.position.trim();
  
  const roleStr = String(teacher.role || '').toUpperCase();
  if (roleStr === 'BGH' || roleStr === 'CBQL' || roleStr === 'HIỆU TRƯỜNG' || roleStr.includes('HIỆU TRƯỜNG')) {
    if (teacher.name.toLowerCase().includes('phó') || teacher.username?.includes('phohieutruong') || teacher.code?.includes('002') || teacher.code?.includes('003')) {
      return 'Phó Hiệu trưởng';
    }
    return 'Hiệu trưởng';
  }

  if (teacher.subject) {
    return `Giáo viên ${teacher.subject}`;
  }

  const dept = departments.find(d => d.id === teacher.departmentId);
  if (dept) {
    if (dept.id.toLowerCase().includes('van_phong') || dept.name.toLowerCase().includes('văn phòng')) {
      return 'Nhân viên';
    }
    return `Giáo viên ${dept.name}`;
  }

  return 'Giáo viên';
};

/**
 * Tra cứu đơn vị công tác chuẩn
 */
export const resolveVcTeacherDepartment = (teacher: Teacher | null | undefined, departments: Department[] = []): string => {
  if (!teacher) return 'Trường THPT Sơn Lương';
  if (teacher.departmentName && teacher.departmentName.trim()) {
    return teacher.departmentName.trim();
  }
  const dept = departments.find(d => d.id === teacher.departmentId);
  if (dept) return dept.name;
  return 'Trường THPT Sơn Lương';
};
