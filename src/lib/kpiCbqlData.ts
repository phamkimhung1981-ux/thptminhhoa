import { 
  KpiCbqlCriteriaGroup, 
  KpiCbqlCriterion, 
  KpiCbqlPeriod, 
  KpiCbqlForm, 
  KpiCbqlScoreItem 
} from '../types/kpiCbql';
import { Teacher, Department } from '../types';
import { isExcludedCbqlEvaluator } from './kpiTargetAudienceUtils';

/**
 * 3 NHÓM TIÊU CHÍ CHUẨN (TỔNG 100 ĐIỂM)
 * I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG: 15 điểm
 * II. TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT: 15 điểm
 * III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ: 70 điểm
 */
export const DEFAULT_CBQL_CRITERIA_GROUPS: KpiCbqlCriteriaGroup[] = [
  {
    id: 'group_I',
    code: 'I',
    name: 'Chính trị tư tưởng, đạo đức lối sống',
    maxScore: 15,
    order: 1,
    description: 'Đánh giá việc chấp hành đường lối, lập trường chính trị, tinh thần cống hiến, học tập làm theo Bác, liêm chính, đoàn kết.'
  },
  {
    id: 'group_II',
    code: 'II',
    name: 'Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật',
    maxScore: 15,
    order: 2,
    description: 'Đánh giá tinh thần trách nhiệm, phương pháp làm việc, văn hóa công vụ, chấp hành phân công, quy chế và báo cáo.'
  },
  {
    id: 'group_III',
    code: 'III',
    name: 'KẾT QUẢ THỰC HIỆN NHIỆM VỤ',
    maxScore: 70,
    order: 3,
    description: 'Đánh giá năng lực và kỹ năng làm việc (10 điểm) cùng Kết quả thực hiện nhiệm vụ được giao (60 điểm).'
  }
];

/**
 * BỘ TIÊU CHÍ CHI TIẾT CBQL THEO ĐÚNG NGUYÊN VĂN FILE PDF ĐÍNH KÈM (CHUẨN 100 ĐIỂM)
 */
export const DEFAULT_CBQL_CRITERIA: KpiCbqlCriterion[] = [
  // =========================================================================
  // I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (15 ĐIỂM)
  // =========================================================================
  {
    id: 'cbql_i_1',
    groupId: 'group_I',
    groupCode: 'I',
    code: '1',
    name: 'Chấp hành chủ trương, đường lối, quy định của Đảng, chính sách, pháp luật của Nhà nước và các nguyên tắc tổ chức, kỷ luật của Đảng, nhất là nguyên tắc tập trung dân chủ, tự phê bình và phê bình',
    description: 'Chấp hành nghiêm túc, gương mẫu đường lối, chính sách, pháp luật và nguyên tắc tập trung dân chủ, tự phê bình và phê bình.',
    maxScore: 2.0,
    order: 1,
    levels: [
      { id: 'i1_1', label: 'Mức 1 (Tốt / Đầy đủ)', score: 2.0, description: 'Chấp hành tốt, gương mẫu tuyệt đối' },
      { id: 'i1_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Chấp hành đầy đủ' },
      { id: 'i1_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Còn có điểm cần khắc phục' },
      { id: 'i1_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Chưa chấp hành nghiêm túc' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_2',
    groupId: 'group_I',
    groupCode: 'I',
    code: '2',
    name: 'Có quan điểm, bản lĩnh chính trị vững vàng; kiên định lập trường; không dao động trước mọi khó khăn, thách thức',
    description: 'Bản lĩnh chính trị vững vàng, kiên định lập trường, an tâm công tác trước mọi khó khăn, thách thức.',
    maxScore: 2.0,
    order: 2,
    levels: [
      { id: 'i2_1', label: 'Mức 1 (Tốt / Vững vàng)', score: 2.0, description: 'Bản lĩnh chính trị rất vững vàng, kiên định' },
      { id: 'i2_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Lập trường kiên định' },
      { id: 'i2_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Đôi lúc còn băn khoăn' },
      { id: 'i2_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Còn dao động trước khó khăn' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_3',
    groupId: 'group_I',
    groupCode: 'I',
    code: '3',
    name: 'Đặt lợi ích của Đảng, quốc gia - dân tộc, nhân dân, tập thể lên trên lợi ích cá nhân',
    description: 'Luôn đặt lợi ích chung của tập thể, nhà trường và nhân dân lên trên lợi ích cá nhân.',
    maxScore: 1.5,
    order: 3,
    levels: [
      { id: 'i3_1', label: 'Mức 1 (Tốt / Gương mẫu)', score: 1.5, description: 'Luôn đặt lợi ích tập thể lên trên hết' },
      { id: 'i3_2', label: 'Mức 2 (Khá)', score: 1.0, description: 'Tôn trọng và chấp hành lợi ích chung' },
      { id: 'i3_3', label: 'Mức 3 (Đạt)', score: 0.5, description: 'Đôi khi còn tính toán cá nhân' },
      { id: 'i3_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Đặt lợi ích cá nhân lên trên tập thể' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_4',
    groupId: 'group_I',
    groupCode: 'I',
    code: '4',
    name: 'Có ý thức nghiên cứu, học tập, vận dụng chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh, nghị quyết, chỉ thị, quyết định và các văn bản của Đảng',
    description: 'Tích cực nghiên cứu, học tập và vận dụng sáng tạo tư tưởng Hồ Chí Minh và nghị quyết của Đảng vào thực tiễn quản lý.',
    maxScore: 1.5,
    order: 4,
    levels: [
      { id: 'i4_1', label: 'Mức 1 (Tốt / Tích cực)', score: 1.5, description: 'Tích cực học tập, nghiên cứu và vận dụng hiệu quả' },
      { id: 'i4_2', label: 'Mức 2 (Khá)', score: 1.0, description: 'Tham gia học tập đầy đủ các đợt bồi dưỡng' },
      { id: 'i4_3', label: 'Mức 3 (Đạt)', score: 0.5, description: 'Học tập ở mức độ hoàn thành cơ bản' },
      { id: 'i4_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Chưa có ý thức nghiên cứu, học tập' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_5',
    groupId: 'group_I',
    groupCode: 'I',
    code: '5',
    name: 'Không tham ô, tham nhũng, tiêu cực, lãng phí, quan liêu, cơ hội, vụ lợi, hách dịch, cửa quyền; không có biểu hiện suy thoái về đạo đức, lối sống, tự diễn biến, tự chuyển hóa',
    description: 'Giữ gìn phẩm chất liêm chính, không tiêu cực, lãng phí; không có biểu hiện suy thoái đạo đức, lối sống.',
    maxScore: 2.0,
    order: 5,
    levels: [
      { id: 'i5_1', label: 'Mức 1 (Tốt / Liêm chính)', score: 2.0, description: 'Tuyệt đối trong sạch, liêm khiết, không tiêu cực' },
      { id: 'i5_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Không có biểu hiện tiêu cực, lãng phí' },
      { id: 'i5_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Cần nâng cao ý thức chống lãng phí' },
      { id: 'i5_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Có biểu hiện hoặc phản ánh về tiêu cực' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_6',
    groupId: 'group_I',
    groupCode: 'I',
    code: '6',
    name: 'Có lối sống trung thực, khiêm tốn, chân thành, trong sáng, giản dị',
    description: 'Lối sống mẫu mực, trung thực, hòa đồng, khiêm tốn, được đồng nghiệp và học sinh tín nhiệm.',
    maxScore: 2.0,
    order: 6,
    levels: [
      { id: 'i6_1', label: 'Mức 1 (Tốt / Mẫu mực)', score: 2.0, description: 'Lối sống mẫu mực, trong sáng, giản dị, khiêm tốn' },
      { id: 'i6_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Trung thực, chân thành, hòa đồng' },
      { id: 'i6_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Lối sống bình thường' },
      { id: 'i6_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Có phản ánh về lối sống chưa chuẩn mực' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_7',
    groupId: 'group_I',
    groupCode: 'I',
    code: '7',
    name: 'Có tinh thần đoàn kết, xây dựng cơ quan, tổ chức, đơn vị trong sạch, vững mạnh',
    description: 'Chủ động giữ gìn và xây dựng mối đoàn kết nội bộ, góp phần xây dựng nhà trường trong sạch, vững mạnh.',
    maxScore: 2.0,
    order: 7,
    levels: [
      { id: 'i7_1', label: 'Mức 1 (Tốt / Đoàn kết cao)', score: 2.0, description: 'Gương mẫu đi đầu xây dựng khối đoàn kết nội bộ vững mạnh' },
      { id: 'i7_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Tích cực giữ gìn đoàn kết cơ quan' },
      { id: 'i7_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Chưa tích cực đóng góp xây dựng đoàn kết' },
      { id: 'i7_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Để xảy ra mâu thuẫn, mất đoàn kết' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_i_8',
    groupId: 'group_I',
    groupCode: 'I',
    code: '8',
    name: 'Không để người thân, người quen lợi dụng chức vụ, quyền hạn của mình để trục lợi',
    description: 'Thực hiện nghiêm quy định liêm chính, không để người thân can thiệp vụ lợi vào công việc của đơn vị.',
    maxScore: 2.0,
    order: 8,
    levels: [
      { id: 'i8_1', label: 'Mức 1 (Tốt / Minh bạch)', score: 2.0, description: 'Tuyệt đối công tâm, không để trục lợi hoặc ưu ái' },
      { id: 'i8_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Thực hiện đúng quy định' },
      { id: 'i8_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Cần minh bạch hơn' },
      { id: 'i8_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Có phản ánh về việc để người thân trục lợi' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },

  // =========================================================================
  // II. TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT (15 ĐIỂM)
  // =========================================================================
  {
    id: 'cbql_ii_1',
    groupId: 'group_II',
    groupCode: 'II',
    code: '1',
    name: 'Có trách nhiệm với công việc; năng động, sáng tạo, dám nghĩ, dám làm, linh hoạt trong thực hiện nhiệm vụ',
    description: 'Trách nhiệm cao với chức trách được giao; năng động, sáng tạo, linh hoạt, dám chịu trách nhiệm.',
    maxScore: 2.0,
    order: 9,
    levels: [
      { id: 'ii1_1', label: 'Mức 1 (Tốt / Sáng tạo)', score: 2.0, description: 'Trách nhiệm cao, năng động, sáng tạo, dám nghĩ dám làm' },
      { id: 'ii1_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Có tinh thần trách nhiệm, hoàn thành công việc' },
      { id: 'ii1_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Còn thụ động, ít đổi mới sáng tạo' },
      { id: 'ii1_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Thiếu trách nhiệm với nhiệm vụ' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_2',
    groupId: 'group_II',
    groupCode: 'II',
    code: '2',
    name: 'Phương pháp làm việc khoa học, dân chủ, đúng nguyên tắc',
    description: 'Làm việc có kế hoạch khoa học, phát huy dân chủ, tuân thủ đúng nguyên tắc và quy chế chuyên môn.',
    maxScore: 1.5,
    order: 10,
    levels: [
      { id: 'ii2_1', label: 'Mức 1 (Tốt / Khoa học)', score: 1.5, description: 'Phương pháp làm việc rất khoa học, dân chủ, đúng nguyên tắc' },
      { id: 'ii2_2', label: 'Mức 2 (Khá)', score: 1.0, description: 'Làm việc có kế hoạch, dân chủ' },
      { id: 'ii2_3', label: 'Mức 3 (Đạt)', score: 0.5, description: 'Đôi lúc phương pháp làm việc chưa thật khoa học' },
      { id: 'ii2_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Làm việc tùy tiện, thiếu nguyên tắc' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_3',
    groupId: 'group_II',
    groupCode: 'II',
    code: '3',
    name: 'Có tinh thần trách nhiệm và phối hợp trong thực hiện nhiệm vụ',
    description: 'Chủ động phối hợp tốt với các đồng nghiệp, các tổ chuyên môn và các bộ phận trong nhà trường.',
    maxScore: 2.0,
    order: 11,
    levels: [
      { id: 'ii3_1', label: 'Mức 1 (Tốt / Phối hợp tốt)', score: 2.0, description: 'Chủ động và phối hợp rất nhịp nhàng, hiệu quả cao' },
      { id: 'ii3_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Phối hợp tốt trong công việc' },
      { id: 'ii3_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Chưa chủ động trong phối hợp nhiệm vụ' },
      { id: 'ii3_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Thiếu tinh thần phối hợp công tác' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_4',
    groupId: 'group_II',
    groupCode: 'II',
    code: '4',
    name: 'Có thái độ đúng mực và phong cách ứng xử, lề lối làm việc chuẩn mực, đáp ứng yêu cầu của văn hóa công vụ',
    description: 'Giao tiếp ứng xử văn minh, lịch thiệp, tôn trọng đồng nghiệp và phụ huynh, đáp ứng văn hóa công vụ.',
    maxScore: 2.0,
    order: 12,
    levels: [
      { id: 'ii4_1', label: 'Mức 1 (Tốt / Chuẩn mực)', score: 2.0, description: 'Ứng xử sư phạm mẫu mực, văn hóa công vụ tốt' },
      { id: 'ii4_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Tác phong đàng hoàng, đúng mực' },
      { id: 'ii4_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Đôi lúc giao tiếp chưa thật khéo léo' },
      { id: 'ii4_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Có phản ánh về thái độ ứng xử không phù hợp' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_5',
    groupId: 'group_II',
    groupCode: 'II',
    code: '5',
    name: 'Chấp hành sự phân công của tổ chức',
    description: 'Chấp hành nghiêm túc sự phân công, điều động công tác của Chi bộ, BGH và cấp trên.',
    maxScore: 1.5,
    order: 13,
    levels: [
      { id: 'ii5_1', label: 'Mức 1 (Tốt / Nghiêm túc)', score: 1.5, description: 'Tuyệt đối chấp hành mọi phân công của tổ chức' },
      { id: 'ii5_2', label: 'Mức 2 (Khá)', score: 1.0, description: 'Chấp hành đầy đủ nhiệm vụ được giao' },
      { id: 'ii5_3', label: 'Mức 3 (Đạt)', score: 0.5, description: 'Còn ngần ngại khi nhận nhiệm vụ mới' },
      { id: 'ii5_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Không chấp hành sự phân công' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_6',
    groupId: 'group_II',
    groupCode: 'II',
    code: '6',
    name: 'Thực hiện các quy định, quy chế, nội quy của cơ quan, tổ chức, đơn vị nơi công tác',
    description: 'Chấp hành nghiêm túc nội quy, quy chế làm việc của trường học và ngành Giáo dục.',
    maxScore: 2.0,
    order: 14,
    levels: [
      { id: 'ii6_1', label: 'Mức 1 (Tốt / Nghiêm chỉnh)', score: 2.0, description: 'Gương mẫu đi đầu thực hiện 100% nội quy, quy chế' },
      { id: 'ii6_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Thực hiện tốt nội quy cơ quan' },
      { id: 'ii6_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Có lần thực hiện chưa kịp thời' },
      { id: 'ii6_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Vi phạm nội quy, quy chế làm việc' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_7',
    groupId: 'group_II',
    groupCode: 'II',
    code: '7',
    name: 'Thực hiện việc kê khai và công khai tài sản, thu nhập theo quy định',
    description: 'Thực hiện việc kê khai, công khai tài sản, thu nhập trung thực, đúng thời hạn theo quy định pháp luật.',
    maxScore: 2.0,
    order: 15,
    levels: [
      { id: 'ii7_1', label: 'Mức 1 (Tốt / Đúng hạn)', score: 2.0, description: 'Kê khai đầy đủ, trung thực, nộp đúng và trước hạn' },
      { id: 'ii7_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Kê khai đúng quy định' },
      { id: 'ii7_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Kê khai còn chậm hoặc phải bổ sung thông tin' },
      { id: 'ii7_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Không kê khai hoặc kê khai không trung thực' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_ii_8',
    groupId: 'group_II',
    groupCode: 'II',
    code: '8',
    name: 'Báo cáo đầy đủ, trung thực, cung cấp thông tin chính xác, khách quan về những nội dung liên quan đến việc thực hiện chức trách, nhiệm vụ được giao và hoạt động của cơ quan, tổ chức, đơn vị với cấp trên khi được yêu cầu',
    description: 'Chế độ thông tin, báo cáo trung thực, đầy đủ, kịp thời và khách quan theo yêu cầu của cấp trên.',
    maxScore: 2.0,
    order: 16,
    levels: [
      { id: 'ii8_1', label: 'Mức 1 (Tốt / Kịp thời)', score: 2.0, description: 'Báo cáo đầy đủ, trung thực, số liệu chuẩn xác, đúng hạn' },
      { id: 'ii8_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Báo cáo đúng hạn, tương đối đầy đủ' },
      { id: 'ii8_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Báo cáo còn chậm hoặc phải đôn đốc' },
      { id: 'ii8_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Không nộp báo cáo hoặc báo cáo sai lệch' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },

  // =========================================================================
  // III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ (70 ĐIỂM)
  // =========================================================================
  // 1. Năng lực và kỹ năng làm việc (10 điểm)
  {
    id: 'cbql_iii_1_1',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '1',
    subCategoryTitle: '1. Năng lực và kỹ năng làm việc (10 điểm)',
    code: '1.1',
    name: 'Chủ động nghiên cứu, cập nhật kịp thời các kiến thức pháp luật và văn bản chuyên môn nghiệp vụ; tham mưu đầy đủ, có chất lượng các văn bản phục vụ công tác chỉ đạo, điều hành của đơn vị theo chỉ đạo của lãnh đạo và chương trình, kế hoạch công tác',
    description: 'Chủ động nghiên cứu, cập nhật kiến thức pháp luật, văn bản chuyên môn; tham mưu có chất lượng cho công tác lãnh đạo, chỉ đạo điều hành.',
    maxScore: 2.0,
    order: 17,
    levels: [
      { id: 'iii1_1_1', label: 'Mức 1 (Tốt / Chất lượng cao)', score: 2.0, description: 'Chủ động cập nhật, tham mưu rất tốt, chất lượng văn bản cao' },
      { id: 'iii1_1_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Có cập nhật và tham mưu đầy đủ' },
      { id: 'iii1_1_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Tham mưu còn chậm hoặc văn bản cần chỉnh sửa' },
      { id: 'iii1_1_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Không chủ động nghiên cứu, tham mưu kém chất lượng' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_1_2',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '1',
    subCategoryTitle: '1. Năng lực và kỹ năng làm việc (10 điểm)',
    code: '1.2',
    name: 'Chủ động đề xuất giải pháp, thực hiện hiệu quả các công việc phát sinh; có khả năng phản ứng kịp thời, đáp ứng với yêu cầu, nhiệm vụ đột xuất.',
    description: 'Chủ động đề xuất giải pháp xử lý hiệu quả các việc phát sinh, nhiệm vụ đột xuất.',
    maxScore: 2.0,
    order: 18,
    levels: [
      { id: 'iii1_2_1', label: 'Mức 1 (Tốt / Linh hoạt)', score: 2.0, description: 'Đề xuất giải pháp kịp thời, xử lý rất tốt các việc phát sinh đột xuất' },
      { id: 'iii1_2_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Xử lý tốt các nhiệm vụ được giao' },
      { id: 'iii1_2_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Còn lúng túng khi có việc phát sinh' },
      { id: 'iii1_2_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Không xử lý được nhiệm vụ đột xuất' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_1_3',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '1',
    subCategoryTitle: '1. Năng lực và kỹ năng làm việc (10 điểm)',
    code: '1.3',
    name: 'Sử dụng thành thạo các phần mềm, ứng dụng công nghệ thông tin đáp ứng yêu cầu công việc',
    description: 'Sử dụng thành thạo máy tính, phần mềm quản lý trường học, CSDL ngành và các ứng dụng CNTT.',
    maxScore: 2.0,
    order: 19,
    levels: [
      { id: 'iii1_3_1', label: 'Mức 1 (Tốt / Thành thạo)', score: 2.0, description: 'Sử dụng rất thành thạo các phần mềm, ứng dụng CNTT hiệu quả' },
      { id: 'iii1_3_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Sử dụng tốt phần mềm đáp ứng công việc' },
      { id: 'iii1_3_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Sử dụng ở mức cơ bản' },
      { id: 'iii1_3_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Chưa đáp ứng yêu cầu ứng dụng CNTT' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_1_4',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '1',
    subCategoryTitle: '1. Năng lực và kỹ năng làm việc (10 điểm)',
    code: '1.4',
    name: 'Phân công nhiệm vụ và điều phối công việc cho cấp dưới linh hoạt, có chỉ đạo, định hướng, hướng dẫn; lãnh đạo, quản lý điều hành, giám sát việc thực hiện nhiệm vụ của cơ quan, đơn vị, bộ phận đảm bảo kịp thời, không bỏ sót nhiệm vụ',
    description: 'Phân công, điều phối công việc linh hoạt; chỉ đạo hướng dẫn cấp dưới kịp thời, giám sát không bỏ sót việc.',
    maxScore: 2.0,
    order: 20,
    levels: [
      { id: 'iii1_4_1', label: 'Mức 1 (Tốt / Điều hành xuất sắc)', score: 2.0, description: 'Phân công khoa học, điều phối linh hoạt, giám sát sâu sát, không bỏ sót việc' },
      { id: 'iii1_4_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Phân công và điều hành tốt' },
      { id: 'iii1_4_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Đôi lúc điều phối công việc còn chậm' },
      { id: 'iii1_4_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Điều hành kém, để bỏ sót nhiều nhiệm vụ' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_1_5',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '1',
    subCategoryTitle: '1. Năng lực và kỹ năng làm việc (10 điểm)',
    code: '1.5',
    name: 'Có năng lực tập hợp viên chức và lao động hợp đồng, xây dựng cơ quan, đơn vị đoàn kết, thống nhất; phối hợp, tạo lập mối quan hệ tốt với cá nhân, cơ quan, đơn vị có liên quan trong thực hiện nhiệm vụ',
    description: 'Quy tụ sức mạnh tập thể, xây dựng đơn vị đoàn kết; thiết lập mối quan hệ phối hợp tốt trong công việc.',
    maxScore: 2.0,
    order: 21,
    levels: [
      { id: 'iii1_5_1', label: 'Mức 1 (Tốt / Quy tụ tốt)', score: 2.0, description: 'Tập hợp tốt viên chức, tạo lập mối quan hệ phối hợp rất chặt chẽ' },
      { id: 'iii1_5_2', label: 'Mức 2 (Khá)', score: 1.5, description: 'Xây dựng tập thể đoàn kết, phối hợp tốt' },
      { id: 'iii1_5_3', label: 'Mức 3 (Đạt)', score: 1.0, description: 'Khả năng tập hợp ở mức trung bình' },
      { id: 'iii1_5_4', label: 'Mức 4 (Chưa đạt)', score: 0.0, description: 'Thiếu năng lực tập hợp, quan hệ phối hợp hạn chế' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },

  // 2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)
  {
    id: 'cbql_iii_2_1',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.1',
    name: 'Quán triệt, thể chế hóa và thực hiện chủ trương, đường lối của Đảng, chính sách, pháp luật của nhà nước tại đơn vị',
    description: 'Thực hiện quán triệt, cụ thể hóa các văn bản chỉ đạo của Đảng và Nhà nước tại nhà trường/đơn vị.',
    maxScore: 2.5,
    order: 22,
    levels: [
      { id: 'iii2_1_1', label: 'Thực hiện tốt', score: 2.5, description: 'Thực hiện tốt, triển khai kịp thời, sâu rộng' },
      { id: 'iii2_1_2', label: 'Có thực hiện đầy đủ', score: 2.0, description: 'Có thực hiện đầy đủ theo hướng dẫn' },
      { id: 'iii2_1_3', label: 'Có thực hiện nhưng chưa đầy đủ', score: 1.0, description: 'Có thực hiện nhưng chưa đầy đủ' },
      { id: 'iii2_1_4', label: 'Không thực hiện', score: 0.0, description: 'Không thực hiện' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_2',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.2',
    name: 'Duy trì kỷ luật, kỷ cương trong cơ quan, đơn vị; không để xảy ra các vụ việc, vụ vi phạm pháp luật phải xử lý, tình trạng khiếu nại tố cáo kéo dài; phòng chống tham nhũng, lãng phí trong phạm vi đơn vị',
    description: 'Duy trì nền nếp kỷ cương; không có vụ việc vi phạm pháp luật, khiếu nại tố cáo kéo dài; phòng chống lãng phí tốt.',
    maxScore: 2.5,
    order: 23,
    levels: [
      { id: 'iii2_2_1', label: 'Thực hiện tốt', score: 2.5, description: 'Thực hiện tốt kỷ cương, không có vi phạm hay khiếu nại' },
      { id: 'iii2_2_2', label: 'Có thực hiện đầy đủ', score: 2.0, description: 'Có thực hiện đầy đủ công tác duy trì kỷ luật' },
      { id: 'iii2_2_3', label: 'Có thực hiện nhưng chưa đầy đủ', score: 1.0, description: 'Có thực hiện nhưng chưa đầy đủ' },
      { id: 'iii2_2_4', label: 'Không thực hiện', score: 0.0, description: 'Không thực hiện' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_3',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.3',
    name: 'Lãnh đạo, chỉ đạo, tổ chức kiểm tra, thanh tra, giám sát, giải quyết khiếu nại tố cáo theo thẩm quyền; chỉ đạo thực hiện công tác cải cách hành chính, cải cách chế độ công vụ, công chức tại đơn vị',
    description: 'Lãnh đạo công tác kiểm tra, giải quyết khiếu nại tố cáo theo thẩm quyền; đẩy mạnh cải cách hành chính.',
    maxScore: 2.5,
    order: 24,
    levels: [
      { id: 'iii2_3_1', label: 'Thực hiện tốt', score: 2.5, description: 'Thực hiện tốt công tác kiểm tra, giám sát và cải cách hành chính' },
      { id: 'iii2_3_2', label: 'Có thực hiện đầy đủ', score: 2.0, description: 'Có thực hiện đầy đủ' },
      { id: 'iii2_3_3', label: 'Có thực hiện nhưng chưa đầy đủ', score: 1.0, description: 'Có thực hiện nhưng chưa đầy đủ' },
      { id: 'iii2_3_4', label: 'Không thực hiện', score: 0.0, description: 'Không thực hiện' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_4',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.4',
    name: 'Xây dựng chương trình, kế hoạch hoạt động hàng năm của đơn vị được giao quản lý phụ trách, trong đó xác định rõ kết quả thực hiện các chỉ tiêu, nhiệm vụ, lượng hóa bằng sản phẩm cụ thể',
    description: 'Xây dựng chương trình kế hoạch năm học rõ ràng, lượng hóa chỉ tiêu và sản phẩm cụ thể.',
    maxScore: 2.5,
    order: 25,
    levels: [
      { id: 'iii2_4_1', label: 'Thực hiện tốt', score: 2.5, description: 'Thực hiện tốt, kế hoạch rõ ràng, lượng hóa sản phẩm cụ thể' },
      { id: 'iii2_4_2', label: 'Có thực hiện đầy đủ', score: 2.0, description: 'Có thực hiện đầy đủ kế hoạch hoạt động' },
      { id: 'iii2_4_3', label: 'Có thực hiện nhưng chưa đầy đủ', score: 1.0, description: 'Có thực hiện nhưng chưa đầy đủ' },
      { id: 'iii2_4_4', label: 'Không thực hiện', score: 0.0, description: 'Không thực hiện' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_5',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.5',
    name: 'Các tiêu chí về kết quả thực hiện nhiệm vụ được giao hoặc theo hợp đồng làm việc đã ký kết',
    description: 'Mức độ hoàn thành các chỉ tiêu, nhiệm vụ chuyên môn và công tác năm học theo tiến độ, chất lượng và hiệu quả.',
    maxScore: 40.0,
    order: 26,
    levels: [
      { id: 'iii2_5_1', label: 'Thực hiện hoàn thành đúng tiến độ, bảo đảm chất lượng, hiệu quả cao', score: 40.0, description: 'Hoàn thành đúng tiến độ, chất lượng và hiệu quả rất cao' },
      { id: 'iii2_5_2', label: 'Thực hiện hoàn thành đúng tiến độ, bảo đảm chất lượng, hiệu quả', score: 30.0, description: 'Hoàn thành đúng tiến độ, chất lượng và hiệu quả' },
      { id: 'iii2_5_3', label: 'Thực hiện hoàn thành, trong đó có không quá 20% tiêu chí chưa đảm bảo chất lượng, tiến độ hoặc hiệu quả thấp', score: 20.0, description: 'Không quá 20% tiêu chí chưa đảm bảo chất lượng/tiến độ' },
      { id: 'iii2_5_4', label: 'Có trên 50% các tiêu chí về kết quả thực hiện nhiệm vụ chưa đảm bảo tiến độ, chất lượng, hiệu quả', score: 10.0, description: 'Trên 50% tiêu chí chưa đảm bảo tiến độ, chất lượng' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_6',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.6',
    name: 'Lãnh đạo, chỉ đạo, điều hành đơn vị',
    description: 'Mức độ hoàn thành các chỉ tiêu, nhiệm vụ chung của đơn vị do cá nhân lãnh đạo, quản lý phụ trách.',
    maxScore: 5.0,
    order: 27,
    levels: [
      { id: 'iii2_6_1', label: 'Hoàn thành tất cả các chỉ tiêu, nhiệm vụ trong đó ít nhất 50% chỉ tiêu, nhiệm vụ hoàn thành vượt mức', score: 5.0, description: 'Hoàn thành tất cả, ít nhất 50% chỉ tiêu vượt mức' },
      { id: 'iii2_6_2', label: 'Hoàn thành tất cả các chỉ tiêu, nhiệm vụ trong đó ít nhất 80% hoàn thành đúng tiến độ, bảo đảm chất lượng', score: 4.0, description: 'Hoàn thành tất cả, ít nhất 80% đúng tiến độ và chất lượng' },
      { id: 'iii2_6_3', label: 'Hoàn thành trên 70% các chỉ tiêu, nhiệm vụ', score: 3.0, description: 'Hoàn thành trên 70% các chỉ tiêu, nhiệm vụ' },
      { id: 'iii2_6_4', label: 'Hoàn thành dưới 50% chỉ tiêu, nhiệm vụ', score: 0.0, description: 'Hoàn thành dưới 50% chỉ tiêu, nhiệm vụ' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  },
  {
    id: 'cbql_iii_2_7',
    groupId: 'group_III',
    groupCode: 'III',
    subCategoryIndex: '2',
    subCategoryTitle: '2. Kết quả thực hiện nhiệm vụ được giao (60 điểm)',
    code: '2.7',
    name: 'Cơ quan, tổ chức thuộc thẩm quyền phụ trách, quản lý trực tiếp thực hiện nhiệm vụ trong năm',
    description: 'Kết quả đánh giá chất lượng cuối năm của tập thể, đơn vị thuộc thẩm quyền phụ trách trực tiếp.',
    maxScore: 5.0,
    order: 28,
    levels: [
      { id: 'iii2_7_1', label: '100% được đánh giá hoàn thành nhiệm vụ trở lên, trong đó ít nhất 70% hoàn thành tốt nhiệm vụ trở lên', score: 5.0, description: '100% hoàn thành nhiệm vụ trở lên (ít nhất 70% tốt trở lên)' },
      { id: 'iii2_7_2', label: '100% được đánh giá hoàn thành nhiệm vụ trở lên', score: 4.0, description: '100% được đánh giá hoàn thành nhiệm vụ trở lên' },
      { id: 'iii2_7_3', label: 'Ít nhất 70% được đánh giá hoàn thành nhiệm vụ trở lên', score: 3.0, description: 'Ít nhất 70% được đánh giá hoàn thành nhiệm vụ trở lên' },
      { id: 'iii2_7_4', label: 'Liên quan đến tham ô, tham nhũng, lãng phí và bị xử lý theo quy định của pháp luật', score: 0.0, description: 'Liên quan đến vi phạm và bị xử lý theo quy định pháp luật' }
    ],
    evaluatorRole: 'Thủ trưởng đơn vị',
    status: 'active'
  }
];

/**
 * TẠO BỘ SCORE ITEMS KHỞI TẠO CHO PHIẾU MỚI
 */
export function initializeCbqlScoreItems(): KpiCbqlScoreItem[] {
  return DEFAULT_CBQL_CRITERIA.map(c => {
    // Mặc định tự chấm mức 1 (Tốt/Khá) hoặc 0 để người dùng chọn
    const defaultLevel = c.levels[0]; // Mức cao nhất làm gợi ý ban đầu
    return {
      criterionId: c.id,
      criterionCode: c.code,
      criterionName: c.name,
      groupId: c.groupId,
      groupCode: c.groupCode,
      subCategoryTitle: c.subCategoryTitle,
      maxScore: c.maxScore,
      
      selfScore: defaultLevel.score,
      selfLevelId: defaultLevel.id,
      selfLevelLabel: defaultLevel.label,
      selfEvidence: '',
      selfNote: '',
      
      evaluatorScore: defaultLevel.score,
      evaluatorLevelId: defaultLevel.id,
      evaluatorLevelLabel: defaultLevel.label,
      evaluatorNote: ''
    };
  });
}

/**
 * HÀM TÍNH ĐIỂM CHUẨN XÁC VÀ TỰ ĐỘNG
 * - Nhóm I: Max 15
 * - Nhóm II: Max 15
 * - Nhóm III: Max 70
 * - Toàn phiếu: Max 100
 */
export function calculateCbqlFormTotals(items: KpiCbqlScoreItem[]) {
  let selfGroupI = 0;
  let selfGroupII = 0;
  let selfGroupIII = 0;

  let evalGroupI = 0;
  let evalGroupII = 0;
  let evalGroupIII = 0;

  items.forEach(item => {
    const sScore = Math.max(0, Math.min(item.maxScore, Number(item.selfScore) || 0));
    const eScore = Math.max(0, Math.min(item.maxScore, Number(item.evaluatorScore) || 0));

    if (item.groupId === 'group_I' || item.groupCode === 'I') {
      selfGroupI += sScore;
      evalGroupI += eScore;
    } else if (item.groupId === 'group_II' || item.groupCode === 'II') {
      selfGroupII += sScore;
      evalGroupII += eScore;
    } else {
      selfGroupIII += sScore;
      evalGroupIII += eScore;
    }
  });

  // Khống chế điểm tối đa từng nhóm
  selfGroupI = Math.min(15, Math.round(selfGroupI * 100) / 100);
  selfGroupII = Math.min(15, Math.round(selfGroupII * 100) / 100);
  selfGroupIII = Math.min(70, Math.round(selfGroupIII * 100) / 100);

  evalGroupI = Math.min(15, Math.round(evalGroupI * 100) / 100);
  evalGroupII = Math.min(15, Math.round(evalGroupII * 100) / 100);
  evalGroupIII = Math.min(70, Math.round(evalGroupIII * 100) / 100);

  const selfTotalScore = Math.min(100, Math.round((selfGroupI + selfGroupII + selfGroupIII) * 100) / 100);
  const evaluatorTotalScore = Math.min(100, Math.round((evalGroupI + evalGroupII + evalGroupIII) * 100) / 100);
  const scoreDifference = Math.round((evaluatorTotalScore - selfTotalScore) * 100) / 100;

  // Xếp loại dựa trên điểm thủ trưởng chấm (hoặc điểm tự chấm nếu chưa đánh giá)
  const scoreToGrade = evaluatorTotalScore > 0 ? evaluatorTotalScore : selfTotalScore;
  let grade: 'Xuất sắc' | 'Tốt' | 'Hoàn thành' | 'Không hoàn thành' | 'Chưa xếp loại' = 'Chưa xếp loại';
  
  if (scoreToGrade >= 90) {
    grade = 'Xuất sắc';
  } else if (scoreToGrade >= 80) {
    grade = 'Tốt';
  } else if (scoreToGrade >= 70) {
    grade = 'Hoàn thành';
  } else if (scoreToGrade > 0) {
    grade = 'Không hoàn thành';
  }

  return {
    selfGroupScores: {
      group_I: selfGroupI,
      group_II: selfGroupII,
      group_III: selfGroupIII
    },
    selfTotalScore,
    evaluatorGroupScores: {
      group_I: evalGroupI,
      group_II: evalGroupII,
      group_III: evalGroupIII
    },
    evaluatorTotalScore,
    scoreDifference,
    grade
  };
}

/**
 * CÁC KỲ ĐÁNH GIÁ MẪU CHO NĂM HỌC 2026-2027
 */
export const DEFAULT_CBQL_PERIODS: KpiCbqlPeriod[] = [
  {
    id: 'cbql_period_2026_2027_ca_nam',
    name: 'Cả năm học 2026-2027',
    academicYear: '2026-2027',
    periodType: 'year',
    periodValue: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Tổng kết đánh giá KPI Cán bộ quản lý cả năm học 2026-2027',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'cbql_period_2026_2027_hk2',
    name: 'Học kỳ II năm học 2026-2027',
    academicYear: '2026-2027',
    periodType: 'term',
    periodValue: 'HK2',
    startDate: '2027-01-16',
    endDate: '2027-05-31',
    status: 'active',
    description: 'Đánh giá KPI Cán bộ quản lý Học kỳ II năm học 2026-2027',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'cbql_period_2026_2027_hk1',
    name: 'Học kỳ I năm học 2026-2027',
    academicYear: '2026-2027',
    periodType: 'term',
    periodValue: 'HK1',
    startDate: '2026-09-01',
    endDate: '2027-01-15',
    status: 'active',
    description: 'Đánh giá KPI Cán bộ quản lý Học kỳ I năm học 2026-2027',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  { id: 'cbql_period_2026_01', name: 'Tháng 1/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '01', startDate: '2026-01-01', endDate: '2026-01-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 1 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_02', name: 'Tháng 2/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '02', startDate: '2026-02-01', endDate: '2026-02-28', status: 'active', description: 'Đánh giá KPI CBQL tháng 2 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_03', name: 'Tháng 3/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '03', startDate: '2026-03-01', endDate: '2026-03-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 3 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_04', name: 'Tháng 4/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '04', startDate: '2026-04-01', endDate: '2026-04-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 4 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_05', name: 'Tháng 5/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '05', startDate: '2026-05-01', endDate: '2026-05-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 5 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_06', name: 'Tháng 6/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '06', startDate: '2026-06-01', endDate: '2026-06-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 6 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_07', name: 'Tháng 7/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 7 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_08', name: 'Tháng 8/2026', academicYear: '2025-2026', periodType: 'month', periodValue: '08', startDate: '2026-08-01', endDate: '2026-08-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 8 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_09', name: 'Tháng 9/2026', academicYear: '2026-2027', periodType: 'month', periodValue: '09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 9 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_10', name: 'Tháng 10/2026', academicYear: '2026-2027', periodType: 'month', periodValue: '10', startDate: '2026-10-01', endDate: '2026-10-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 10 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_11', name: 'Tháng 11/2026', academicYear: '2026-2027', periodType: 'month', periodValue: '11', startDate: '2026-11-01', endDate: '2026-11-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 11 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2026_12', name: 'Tháng 12/2026', academicYear: '2026-2027', periodType: 'month', periodValue: '12', startDate: '2026-12-01', endDate: '2026-12-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 12 năm 2026', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_01', name: 'Tháng 1/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '01', startDate: '2027-01-01', endDate: '2027-01-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 1 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_02', name: 'Tháng 2/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '02', startDate: '2027-02-01', endDate: '2027-02-28', status: 'active', description: 'Đánh giá KPI CBQL tháng 2 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_03', name: 'Tháng 3/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '03', startDate: '2027-03-01', endDate: '2027-03-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 3 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_04', name: 'Tháng 4/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '04', startDate: '2027-04-01', endDate: '2027-04-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 4 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_05', name: 'Tháng 5/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '05', startDate: '2027-05-01', endDate: '2027-05-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 5 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_06', name: 'Tháng 6/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '06', startDate: '2027-06-01', endDate: '2027-06-30', status: 'active', description: 'Đánh giá KPI CBQL tháng 6 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_07', name: 'Tháng 7/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '07', startDate: '2027-07-01', endDate: '2027-07-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 7 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  { id: 'cbql_period_2027_08', name: 'Tháng 8/2027', academicYear: '2026-2027', periodType: 'month', periodValue: '08', startDate: '2027-08-01', endDate: '2027-08-31', status: 'active', description: 'Đánh giá KPI CBQL tháng 8 năm 2027', createdAt: new Date().toISOString(), createdBy: 'admin' },
  {
    id: 'cbql_period_2025_2026_ca_nam',
    name: 'Cả năm học 2025-2026',
    academicYear: '2025-2026',
    periodType: 'year',
    periodValue: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-05-31',
    status: 'active',
    description: 'Tổng kết đánh giá KPI Cán bộ quản lý cả năm học 2025-2026',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'cbql_period_2025_2026_hk2',
    name: 'Học kỳ II năm học 2025-2026',
    academicYear: '2025-2026',
    periodType: 'term',
    periodValue: 'HK2',
    startDate: '2026-01-16',
    endDate: '2026-05-31',
    status: 'active',
    description: 'Đánh giá KPI Cán bộ quản lý Học kỳ II năm học 2025-2026',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'cbql_period_2025_2026_hk1',
    name: 'Học kỳ I năm học 2025-2026',
    academicYear: '2025-2026',
    periodType: 'term',
    periodValue: 'HK1',
    startDate: '2025-09-01',
    endDate: '2026-01-15',
    status: 'active',
    description: 'Đánh giá KPI Cán bộ quản lý Học kỳ I năm học 2025-2026',
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  }
];

/**
 * KIỂM TRA MỘT GIÁO VIÊN CÓ PHẢI LÀ CÁN BỘ QUẢN LÝ (CBQL) HAY KHÔNG
 */
export function isTeacherCbql(t: Teacher | null | undefined, departments?: Department[]): boolean {
  if (!t) return false;
  const pos = (t.position || '').toLowerCase().trim();
  const role = ((t.role as string) || '').toUpperCase().trim();
  const name = (t.name || '').toLowerCase();
  
  // Kiểm tra nếu là Tổ trưởng / Trưởng bộ phận trong danh sách phòng ban
  const isHeadOfDept = Boolean(departments && departments.some(d => d.headId === t.id));

  return (
    isHeadOfDept ||
    role === 'BGH' ||
    role === 'TTCM' ||
    role === 'CBQL' ||
    role === 'CNQL' ||
    role === 'HIỆU TRƯỞNG' ||
    role === 'HIÊU TRƯỞNG' ||
    role === 'PHÓ HIỆU TRƯỞNG' ||
    role === 'TỔ TRƯỞNG' ||
    role === 'TỔ PHÓ' ||
    t.id === 'admin' ||
    pos.includes('hiệu trưởng') ||
    pos.includes('phó hiệu trưởng') ||
    pos.includes('bgh') ||
    pos.includes('ban giám hiệu') ||
    pos.includes('tổ trưởng') ||
    pos.includes('tổ phó') ||
    pos.includes('quản lý') ||
    pos.includes('lãnh đạo') ||
    pos.includes('cbql') ||
    pos.includes('cnql') ||
    pos.includes('chủ tịch công đoàn') ||
    pos.includes('chủ tịch') ||
    pos.includes('bí thư đoàn') ||
    pos.includes('bí thư') ||
    pos.includes('trưởng ban') ||
    pos.includes('trưởng phòng') ||
    name.includes('hiệu trưởng')
  );
}

/**
 * XÁC ĐỊNH CHỨC VỤ CHUẨN CỦA CBQL
 */
export function resolveCbqlTeacherPosition(t: Teacher | null | undefined, departments?: Department[]): string {
  if (!t) return 'Cán bộ Quản lý';
  if (t.position && t.position.trim().length > 0) return t.position.trim();
  
  const role = ((t.role as string) || '').toUpperCase().trim();
  const headDept = departments?.find(d => d.headId === t.id);

  if (role === 'BGH' || t.id === 'admin') {
    return 'Ban Giám hiệu / Hiệu trưởng';
  }
  if (headDept) {
    return `Tổ trưởng (${headDept.name})`;
  }
  if (role === 'TTCM') {
    return 'Tổ trưởng Chuyên môn';
  }
  if (role === 'GIAO_VIEN') {
    return 'Giáo viên';
  }
  if (role === 'GIAO_VU' || role === 'NHAN_SU') {
    return 'Nhân viên';
  }
  return 'Cán bộ Quản lý';
}

/**
 * XÁC ĐỊNH ĐƠN VỊ CÔNG TÁC CỦA CBQL
 */
export function resolveCbqlTeacherDepartmentName(t: Teacher | null | undefined, departments?: Department[]): string {
  if (!t) return 'Trường THPT Sơn Lương';
  if (departments && departments.length > 0) {
    const matchedDept = departments.find(d => d.id === t.departmentId || d.headId === t.id);
    if (matchedDept) return matchedDept.name;
  }
  if (t.departmentName && t.departmentName.trim().length > 0) {
    return t.departmentName.trim();
  }
  return 'Trường THPT Sơn Lương';
}

/**
 * LỌC RA DANH SÁCH CÁN BỘ QUẢN LÝ (CBQL) TỪ DANH SÁCH GIÁO VIÊN
 */
export function getCbqlTeachers(teachers: Teacher[], departments?: Department[], currentUser?: any): Teacher[] {
  if (!teachers) teachers = [];
  
  let allList = [...teachers];
  
  // Nếu có currentUser là admin hoặc BGH mà chưa nằm trong danh sách teachers
  if (currentUser && (currentUser.role === 'BGH' || currentUser.id === 'admin') && !allList.some(t => t.id === currentUser.id)) {
    allList.unshift({
      id: currentUser.id,
      name: currentUser.name || 'Ban Giám hiệu (Admin)',
      username: currentUser.username || 'admin',
      role: 'BGH',
      position: currentUser.position || 'Hiệu trưởng / Ban Giám hiệu',
      departmentName: 'Trường THPT Sơn Lương',
      code: 'BGH_ADMIN',
      subject: 'Quản lý',
      phone: '',
      email: '',
      joinDate: '2020-09-01',
      degree: 'Thạc sĩ Quản lý Giáo dục',
      status: 'Đang công tác'
    } as Teacher);
  }

  const cbqlOnly = allList.filter(t => isTeacherCbql(t, departments));
  return cbqlOnly.length > 0 ? cbqlOnly : allList;
}

/**
 * LỌC RA DANH SÁCH NGƯỜI ĐÁNH GIÁ ĐỦ THẨM QUYỀN CHO MỘT CBQL
 */
export function getEligibleCbqlEvaluators(evaluatee: Teacher | null, teachers: Teacher[], departments?: Department[]): Teacher[] {
  if (!teachers || teachers.length === 0) return [];
  
  // Những người có quyền đánh giá CBQL:
  // - Hiệu trưởng, BGH, Cấp trên (loại trừ người trong danh sách loại trừ CBQL đánh giá)
  const eligible = teachers.filter(t => {
    // Không tự đánh giá chính mình
    if (evaluatee && t.id === evaluatee.id) return false;
    // Không bao gồm người bị loại trừ khỏi danh sách CBQL đánh giá
    if (isExcludedCbqlEvaluator(t)) return false;
    
    const pos = (t.position || '').toLowerCase();
    const role = ((t.role as string) || '').toUpperCase();
    const isHead = departments ? departments.some(d => d.headId === t.id) : false;

    return (
      role === 'BGH' ||
      role === 'HIỆU TRƯỞNG' ||
      role === 'PHÓ HIỆU TRƯỞNG' ||
      pos.includes('hiệu trưởng') ||
      pos.includes('phó hiệu trưởng') ||
      pos.includes('bgh') ||
      pos.includes('chủ tịch') ||
      pos.includes('bí thư') ||
      pos.includes('cấp trên') ||
      pos.includes('lãnh đạo') ||
      t.id === 'admin' ||
      isHead
    );
  });

  if (eligible.length > 0) return eligible;
  return teachers.filter(t => (!evaluatee || t.id !== evaluatee.id) && !isExcludedCbqlEvaluator(t));
}

/**
 * THÔNG TIN TRẠNG THÁI PHIẾU
 */
export function getCbqlFormStatusBadge(status: KpiCbqlForm['status']) {
  switch (status) {
    case 'draft':
      return {
        label: 'Bản nháp (Đang tự đánh giá)',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-700'
      };
    case 'pending_evaluation':
      return {
        label: 'Chờ đánh giá',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        badgeBg: 'bg-amber-100',
        textColor: 'text-amber-800'
      };
    case 'evaluated':
      return {
        label: 'Đã đánh giá',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        badgeBg: 'bg-blue-100',
        textColor: 'text-blue-800'
      };
    case 'locked':
      return {
        label: 'Đã chốt (Hoàn thành)',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        badgeBg: 'bg-emerald-100',
        textColor: 'text-emerald-800'
      };
    default:
      return {
        label: 'Chưa rõ',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        badgeBg: 'bg-gray-100',
        textColor: 'text-gray-700'
      };
  }
}
