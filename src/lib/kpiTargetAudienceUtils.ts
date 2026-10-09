import { Teacher, Department, KpiItem, KpiTargetCode, KpiEvaluationItem } from '../types';

export type KpiTargetGroup = 'CBQL' | 'TTCM_TPCM' | 'GV' | 'NV';
export type LegacyKpiTargetGroup = 'CNQL' | 'TTCM_TPCM_TTVP' | 'GIAO_VIEN' | 'NHAN_VIEN';
export type AnyKpiTargetGroup = KpiTargetGroup | LegacyKpiTargetGroup;

export interface KpiTargetGroupInfo {
  key: KpiTargetGroup;
  code: string;
  name: string;
  shortName: string;
  description: string;
  badgeLabel: string;
  colorBadge: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
}

export const KPI_TARGET_GROUPS: KpiTargetGroupInfo[] = [
  {
    key: 'CBQL',
    code: 'CBQL',
    name: 'CBQL',
    shortName: 'CBQL',
    description: 'Cán bộ Quản lý (Hiệu trưởng, Phó Hiệu trưởng)',
    badgeLabel: 'CBQL',
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    bgLight: 'bg-purple-50/70',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    key: 'TTCM_TPCM',
    code: 'TTCM_TPCM',
    name: 'KPI TTCM/TPCM',
    shortName: 'TTCM/TPCM',
    description: 'Tổ trưởng Chuyên môn & Tổ phó Chuyên môn (Dùng chung 1 bộ KPI duy nhất)',
    badgeLabel: 'TTCM/TPCM',
    colorBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    bgLight: 'bg-indigo-50/70',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  {
    key: 'GV',
    code: 'GV',
    name: 'GIÁO VIÊN',
    shortName: 'GIÁO VIÊN',
    description: 'Giáo viên trực tiếp giảng dạy và giáo viên chủ nhiệm',
    badgeLabel: 'GIÁO VIÊN',
    colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgLight: 'bg-emerald-50/70',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  {
    key: 'NV',
    code: 'NV',
    name: 'NHÂN VIÊN',
    shortName: 'NHÂN VIÊN',
    description: 'Nhân viên hành chính, kế toán, văn thư, y tế, thiết bị, thư viện, thủ quỹ, CNTT, bảo vệ, phục vụ',
    badgeLabel: 'NHÂN VIÊN',
    colorBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    bgLight: 'bg-amber-50/70',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  }
];

export const formatTargetAudienceBadges = (target?: string | string[]): string => {
  if (!target) return 'Tất cả CBGVNV';
  if (Array.isArray(target)) {
    return target.map(t => normalizeTargetGroup(t)).join(', ');
  }
  return target;
};

/**
 * BỘ TIÊU CHÍ CHUẨN CỦA 4 ĐỐI TƯỢNG (THPT MINH HÒA)
 * Dùng để snapshot trực tiếp vào Phiếu đánh giá KPI khi tạo mới
 */
/**
 * BỘ TIÊU CHÍ CHUẨN CỦA 4 ĐỐI TƯỢNG THEO ĐÚNG FILE QUY ĐỊNH (THPT MINH HÒA)
 * Dùng để SNAPSHOT trực tiếp vào Phiếu đánh giá KPI khi tạo mới (100 điểm nền)
 */
export interface KpiTemplateCriterion {
  stt: number;
  kpi_code: string;
  code: string;
  kpi_group: string;
  criterion_content: string;
  criterionName: string;
  description?: string;
  base_score: number;
  standardScore: number;
  minus_rules: Array<{ label: string; score: number }>;
  plus_rules: Array<{ label: string; score: number }>;
  evidence_rule: string;
  evaluator_role: string;
}

export const STANDARD_KPI_CRITERIA_TEMPLATES: Record<KpiTargetGroup, KpiTemplateCriterion[]> = {
  // ==========================================
  // 1. CÁN BỘ QUẢN LÝ (CBQL: Hiệu trưởng, Phó Hiệu trưởng) - Tổng 100 điểm nền
  // ==========================================
  CBQL: [
    // Nhóm A: Phẩm chất chính trị, đạo đức, văn hóa công vụ (15 điểm)
    {
      stt: 1,
      kpi_code: 'CBQL-A1',
      code: 'CBQL-A1',
      kpi_group: 'Phẩm chất chính trị, đạo đức, văn hóa công vụ',
      criterion_content: 'Chấp hành chủ trương, pháp luật, quy định; giữ gìn phẩm chất, đạo đức',
      criterionName: 'Chấp hành chủ trương, pháp luật, quy định; giữ gìn phẩm chất, đạo đức',
      description: 'Chấp hành nghiêm đường lối của Đảng, pháp luật Nhà nước, quy định của ngành và nội quy cơ quan; giữ gìn phẩm chất đạo đức lối sống mẫu mực',
      base_score: 5,
      standardScore: 5,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Lỗi/vi phạm 1 lần, ảnh hưởng nhỏ', score: 0.5 },
        { label: 'Lặp lại 2–3 lần hoặc chậm quá hạn', score: 1.0 },
        { label: 'Ảnh hưởng rõ đến tiến độ/chất lượng', score: 2.5 },
        { label: 'Vi phạm nghiêm trọng/không hoàn thành', score: 5.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Hoàn thành vượt yêu cầu, có minh chứng', score: 0.25 },
        { label: 'Có cải tiến/giải pháp áp dụng hiệu quả', score: 0.5 },
        { label: 'Sản phẩm/đóng góp nổi bật, tác động rõ', score: 1.0 }
      ],
      evidence_rule: 'Kế hoạch/quyết định; biên bản họp; báo cáo; hồ sơ kiểm tra; dữ liệu phần mềm; minh chứng kết quả lĩnh vực phụ trách.',
      evaluator_role: 'Hội đồng trường / Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 2,
      kpi_code: 'CBQL-A2',
      code: 'CBQL-A2',
      kpi_group: 'Phẩm chất chính trị, đạo đức, văn hóa công vụ',
      criterion_content: 'Thực hiện văn hóa công sở, quy chế dân chủ, giữ gìn đoàn kết nội bộ',
      criterionName: 'Thực hiện văn hóa công sở, quy chế dân chủ, giữ gìn đoàn kết nội bộ',
      description: 'Gương mẫu trong giao tiếp ứng xử, phát huy quy chế dân chủ cơ sở, xây dựng và củng cố khối đại đoàn kết nội bộ',
      base_score: 5,
      standardScore: 5,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vi phạm tác phong, giao tiếp ứng xử', score: 0.5 },
        { label: 'Thực hiện chưa nghiêm túc quy chế dân chủ', score: 1.0 },
        { label: 'Gây mất đoàn kết trong tập thể', score: 2.5 },
        { label: 'Vi phạm nghiêm trọng văn hóa công vụ', score: 5.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Được tập thể tín nhiệm, khen thưởng văn hóa công sở', score: 0.25 },
        { label: 'Có giải pháp xây dựng môi trường sư phạm đoàn kết tiêu biểu', score: 0.5 },
        { label: 'Được cấp trên khen thưởng điển hình dân chủ, đoàn kết', score: 1.0 }
      ],
      evidence_rule: 'Biên bản họp chi bộ, hội đồng; phiếu thăm dò tín nhiệm; báo cáo thực hiện quy chế dân chủ; minh chứng xử lý phản ánh.',
      evaluator_role: 'Hội đồng trường / Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 3,
      kpi_code: 'CBQL-A3',
      code: 'CBQL-A3',
      kpi_group: 'Phẩm chất chính trị, đạo đức, văn hóa công vụ',
      criterion_content: 'Ý thức tổ chức kỷ luật, chấp hành sự phân công, chế độ hội họp và báo cáo',
      criterionName: 'Ý thức tổ chức kỷ luật, chấp hành sự phân công, chế độ hội họp và báo cáo',
      description: 'Chấp hành nghiêm túc sự phân công của cấp trên, thực hiện đầy đủ chế độ hội họp, nộp báo cáo định kỳ/đột xuất đúng hạn',
      base_score: 5,
      standardScore: 5,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Đi muộn/vắng họp không phép hoặc không lý do chính đáng', score: 0.5 },
        { label: 'Chậm nộp báo cáo định kỳ/đột xuất', score: 1.0 },
        { label: 'Báo cáo sai lệch số liệu hoặc không thực hiện nhiệm vụ được giao', score: 2.5 },
        { label: 'Không chấp hành chỉ đạo, không báo cáo', score: 5.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Báo cáo chất lượng cao, nộp trước hạn', score: 0.25 },
        { label: 'Xử lý công việc đột xuất xuất sắc, cấp trên biểu dương', score: 0.5 },
        { label: 'Có đóng góp xuất sắc trong công tác tham mưu, báo cáo của ngành', score: 1.0 }
      ],
      evidence_rule: 'Sổ theo dõi hội họp; biên bản giao ban; nhật ký công văn báo cáo; văn bản chỉ đạo của Sở GD&ĐT.',
      evaluator_role: 'Hội đồng trường / Ban Giám hiệu / Cấp trên'
    },

    // Nhóm B: Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học (50 điểm)
    {
      stt: 4,
      kpi_code: 'CBQL-B1',
      code: 'CBQL-B1',
      kpi_group: 'Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học',
      criterion_content: 'Xây dựng kế hoạch phát triển trường học, kế hoạch giáo dục năm học',
      criterionName: 'Xây dựng kế hoạch phát triển trường học, kế hoạch giáo dục năm học',
      description: 'Xây dựng kế hoạch chiến lược, kế hoạch giáo dục năm học, kế hoạch các bộ phận khoa học, khả thi, đúng tiến độ và hướng dẫn của Sở',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Kế hoạch ban hành chậm so với tiến độ', score: 1.0 },
        { label: 'Kế hoạch thiếu tính khả thi, phải chỉnh sửa nhiều lần', score: 2.0 },
        { label: 'Không kịp thời điều chỉnh kế hoạch khi có thay đổi', score: 5.0 },
        { label: 'Không xây dựng/ban hành kế hoạch theo quy định', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Kế hoạch có tính đổi mới, sáng tạo được Sở biểu dương', score: 0.5 },
        { label: 'Được lựa chọn làm mô hình điểm cấp tỉnh/cụm', score: 1.0 },
        { label: 'Sáng kiến quản lý áp dụng hiệu quả toàn tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Kế hoạch phát triển trường học; Kế hoạch giáo dục nhà trường (KHGD); Quyết định phê duyệt của Sở GD&ĐT.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 5,
      kpi_code: 'CBQL-B2',
      code: 'CBQL-B2',
      kpi_group: 'Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học',
      criterion_content: 'Chỉ đạo, quản lý hoạt động dạy học, đổi mới phương pháp dạy học và kiểm tra đánh giá',
      criterionName: 'Chỉ đạo, quản lý hoạt động dạy học, đổi mới phương pháp dạy học và kiểm tra đánh giá',
      description: 'Chỉ đạo thực hiện chương trình GDPT 2018, đổi mới phương pháp giảng dạy, đa dạng hóa hình thức KTĐG, nâng cao chất lượng giáo dục',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chỉ đạo chuyên môn chậm tiến độ, chưa sát sao', score: 1.0 },
        { label: 'Thiếu đôn đốc, kiểm tra hoạt động chuyên môn các tổ', score: 2.0 },
        { label: 'Để xảy ra sai sót trong quy chế chuyên môn, thi cử', score: 5.0 },
        { label: 'Chất lượng giáo dục giảm sút nghiêm trọng', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Chất lượng giáo dục vượt chỉ tiêu đầu năm học', score: 0.5 },
        { label: 'Nhiều giải HSG / Hội thi GVG cấp tỉnh', score: 1.0 },
        { label: 'Được tặng Cờ thi đua / Bằng khen chuyên môn cấp tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Báo cáo tổng kết chuyên môn; kết quả thi TN THPT, HSG cấp tỉnh; biên bản duyệt đề/chấm thi; hồ sơ kiểm tra giáo án.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 6,
      kpi_code: 'CBQL-B3',
      code: 'CBQL-B3',
      kpi_group: 'Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học',
      criterion_content: 'Chỉ đạo công tác giáo dục đạo đức, kỹ năng sống và nền nếp học sinh',
      criterionName: 'Chỉ đạo công tác giáo dục đạo đức, kỹ năng sống và nền nếp học sinh',
      description: 'Chỉ đạo công tác chủ nhiệm, Đoàn thanh niên, tư vấn tâm lý, giáo dục kỹ năng sống, an toàn giao thông và phòng chống bạo lực học đường',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Nền nếp học sinh có biểu hiện giảm sút', score: 1.0 },
        { label: 'Xử lý các vụ việc vi phạm của học sinh chậm', score: 2.0 },
        { label: 'Để xảy ra hiện tượng bạo lực học đường hoặc mất an toàn', score: 5.0 },
        { label: 'Vi phạm nghiêm trọng an toàn trường học', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Xây dựng mô hình Trường học hạnh phúc, an toàn tiêu biểu', score: 0.5 },
        { label: '100% học sinh xếp loại hạnh kiểm/rèn luyện tốt - khá', score: 1.0 },
        { label: 'Đoàn trường / Liên đội được Trung ương Đoàn tặng Bằng khen', score: 2.0 }
      ],
      evidence_rule: 'Kế hoạch công tác giáo dục đạo đức; báo cáo nề nếp Đoàn thanh niên; biên bản xử lý vi phạm học sinh; hồ sơ tư vấn tâm lý.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 7,
      kpi_code: 'CBQL-B4',
      code: 'CBQL-B4',
      kpi_group: 'Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học',
      criterion_content: 'Quản lý, bồi dưỡng và phát triển đội ngũ cán bộ, giáo viên, nhân viên',
      criterionName: 'Quản lý, bồi dưỡng và phát triển đội ngũ cán bộ, giáo viên, nhân viên',
      description: 'Quy hoạch, bố trí phân công CBGVNV hợp lý, phát huy năng lực; tổ chức bồi dưỡng chuyên môn thường xuyên, nâng cao trình độ đội ngũ',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Phân công chuyên môn chưa thật sự hợp lý, có kiến nghị', score: 1.0 },
        { label: 'Chậm trễ trong kế hoạch tập huấn, bồi dưỡng thường xuyên', score: 2.0 },
        { label: 'Để CBGVNV vi phạm quy chế chuyên môn kéo dài', score: 5.0 },
        { label: 'Đội ngũ mất đoàn kết kéo dài, khiếu nại vượt cấp', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: '100% CBGV hoàn thành xuất sắc các mô-đun bồi dưỡng', score: 0.5 },
        { label: 'Có nhiều giáo viên đạt danh hiệu Chiến sĩ thi đua, GVG cấp tỉnh', score: 1.0 },
        { label: 'Tập thể lao động xuất sắc / Bằng khen của Bộ GD&ĐT', score: 2.0 }
      ],
      evidence_rule: 'Bảng phân công chuyên môn; hồ sơ đánh giá chuẩn nghề nghiệp; chứng chỉ bồi dưỡng CBGV; quyết định khen thưởng thi đua.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 8,
      kpi_code: 'CBQL-B5',
      code: 'CBQL-B5',
      kpi_group: 'Lãnh đạo, quản lý và thực hiện nhiệm vụ chuyên môn, năm học',
      criterion_content: 'Công tác kiểm tra nội bộ, đánh giá, kiểm định chất lượng giáo dục',
      criterionName: 'Công tác kiểm tra nội bộ, đánh giá, kiểm định chất lượng giáo dục',
      description: 'Ban hành và thực hiện kế hoạch kiểm tra nội bộ toàn diện, kiểm định chất lượng giáo dục đúng quy trình, khách quan, chính xác',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Kế hoạch kiểm tra nội bộ ban hành chậm', score: 1.0 },
        { label: 'Hồ sơ biên bản kiểm tra nội bộ chưa đầy đủ, thiếu chữ ký', score: 2.0 },
        { label: 'Bỏ sót nội dung kiểm tra trọng tâm theo kế hoạch', score: 5.0 },
        { label: 'Không thực hiện kế hoạch kiểm tra nội bộ trường học', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Kiểm tra phát hiện uốn nắn kịp thời các tồn tại hạn chế', score: 0.5 },
        { label: 'Đạt chuẩn kiểm định chất lượng giáo dục mức độ cao', score: 1.0 },
        { label: 'Hồ sơ kiểm tra nội bộ được Sở GD&ĐT đánh giá xuất sắc', score: 2.0 }
      ],
      evidence_rule: 'Quyết định thành lập ban kiểm tra nội bộ; Kế hoạch và các biên bản kiểm tra chuyên đề, kiểm tra đột xuất; Báo cáo KTTB.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },

    // Nhóm C: Quản lý tài chính, tài sản, CSVC và chuyển đổi số (20 điểm)
    {
      stt: 9,
      kpi_code: 'CBQL-C1',
      code: 'CBQL-C1',
      kpi_group: 'Quản lý tài chính, tài sản, CSVC và chuyển đổi số',
      criterion_content: 'Quản lý tài chính, tài sản công, cơ sở vật chất và an toàn trường học',
      criterionName: 'Quản lý tài chính, tài sản công, cơ sở vật chất và an toàn trường học',
      description: 'Quản lý, sử dụng ngân sách, tài sản công đúng định mức, công khai, minh bạch; bảo quản CSVC, phòng thí nghiệm, PCCC và an toàn',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chậm quyết toán kinh phí hoặc chậm hoàn thiện chứng từ', score: 1.0 },
        { label: 'Sử dụng tài sản, điện nước lãng phí; bảo quản CSVC chưa tốt', score: 2.0 },
        { label: 'Sai sót trong quy trình thủ tục mua sắm, sửa chữa CSVC', score: 5.0 },
        { label: 'Vi phạm nghiêm trọng về quản lý tài chính / Để xảy ra thất thoát', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Tiết kiệm chi phí, tăng thu nhập cho CBGVNV đúng quy định', score: 0.5 },
        { label: 'Vận động xã hội hóa, nâng cấp CSVC trường học khang trang', score: 1.0 },
        { label: 'Trường học Xanh - Sạch - Đẹp - An toàn tiêu biểu cấp tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Quy chế chi tiêu nội bộ; biên bản công khai tài chính; sổ theo dõi tài sản CSVC; biên bản kiểm kê tài sản; biên bản PCCC.',
      evaluator_role: 'Hội đồng trường / Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 10,
      kpi_code: 'CBQL-C2',
      code: 'CBQL-C2',
      kpi_group: 'Quản lý tài chính, tài sản, CSVC và chuyển đổi số',
      criterion_content: 'Đổi mới quản trị, chuyển đổi số và ứng dụng CNTT trong trường học',
      criterionName: 'Đổi mới quản trị, chuyển đổi số và ứng dụng CNTT trong trường học',
      description: 'Đẩy mạnh ứng dụng phần mềm quản lý (CSDL ngành, vnEdu/SMAS, sổ điểm điện tử, giáo án điện tử, thanh toán không dùng tiền mặt)',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Cập nhật CSDL ngành chậm so với thời hạn yêu cầu', score: 1.0 },
        { label: 'Ứng dụng phần mềm quản trị chưa đồng bộ giữa các bộ phận', score: 2.0 },
        { label: 'Bỏ sót dữ liệu quản lý điện tử, phải nhắc nhở', score: 5.0 },
        { label: 'Chậm trễ trong công tác chuyển đổi số toàn diện của trường', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: '100% hồ sơ quản lý, sổ sách được số hóa hoàn toàn', score: 0.5 },
        { label: 'Có giải pháp/sản phẩm chuyển đổi số sáng tạo trong quản lý', score: 1.0 },
        { label: 'Đơn vị đi đầu trong phong trào chuyển đổi số ngành Giáo dục tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Báo cáo dữ liệu phần mềm CSDL ngành; hệ thống sổ điểm/học bạ điện tử; trang web nhà trường; hệ thống quản lý văn bản.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    },

    // Nhóm D: Hoạt động phối hợp, xã hội hóa và nhiệm vụ khác (15 điểm)
    {
      stt: 11,
      kpi_code: 'CBQL-D1',
      code: 'CBQL-D1',
      kpi_group: 'Hoạt động phối hợp, xã hội hóa và nhiệm vụ khác',
      criterion_content: 'Phối hợp với chính quyền, các tổ chức đoàn thể và Ban đại diện CMHS',
      criterionName: 'Phối hợp với chính quyền, các tổ chức đoàn thể và Ban đại diện CMHS',
      description: 'Phối hợp chặt chẽ với cấp ủy, chính quyền địa phương, Công an, Đoàn thanh niên, Hội Khuyến học và Ban đại diện cha mẹ học sinh',
      base_score: 8,
      standardScore: 8,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Phối hợp với các tổ chức đoàn thể chưa kịp thời', score: 0.5 },
        { label: 'Chậm giải quyết các kiến nghị của phụ huynh học sinh', score: 1.5 },
        { label: 'Để xảy ra đơn thư, khiếu nại liên quan đến phối hợp GD', score: 4.0 },
        { label: 'Không tổ chức họp Ban đại diện CMHS đúng quy định', score: 8.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Phụ huynh đồng thuận cao, không có phản ánh tiêu cực', score: 0.5 },
        { label: 'Huy động hiệu quả các nguồn lực xã hội hóa giáo dục', score: 1.0 },
        { label: 'Được chính quyền địa phương tặng Giấy khen trong phối hợp', score: 1.5 }
      ],
      evidence_rule: 'Biên bản phối hợp liên ngành; Nghị quyết họp Ban đại diện CMHS; Kế hoạch phối hợp với Công an, Đoàn thể địa phương.',
      evaluator_role: 'Hội đồng trường / Ban Giám hiệu / Cấp trên'
    },
    {
      stt: 12,
      kpi_code: 'CBQL-D2',
      code: 'CBQL-D2',
      kpi_group: 'Hoạt động phối hợp, xã hội hóa và nhiệm vụ khác',
      criterion_content: 'Thực hiện các nhiệm vụ đột xuất và phong trào thi đua của ngành',
      criterionName: 'Thực hiện các nhiệm vụ đột xuất và phong trào thi đua của ngành',
      description: 'Tham gia đầy đủ, tích cực các phong trào thi đua, các cuộc vận động lớn của ngành và thực hiện tốt nhiệm vụ đột xuất được giao',
      base_score: 7,
      standardScore: 7,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Tham gia phong trào thi đua của ngành còn chậm', score: 0.5 },
        { label: 'Không đạt chỉ tiêu tham gia các cuộc thi/phong trào', score: 1.5 },
        { label: 'Bỏ lỡ các sự kiện/hội nghị quan trọng do Sở triệu tập', score: 3.5 },
        { label: 'Không tham gia/không thực hiện nhiệm vụ ngành giao', score: 7.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Đạt giải cao trong các phong trào thi đua chuyên đề của ngành', score: 0.5 },
        { label: 'Hoàn thành xuất sắc nhiệm vụ đột xuất do cấp trên giao', score: 1.0 },
        { label: 'Được Chủ tịch UBND tỉnh / Bộ trưởng Bộ GD&ĐT tặng Bằng khen', score: 1.5 }
      ],
      evidence_rule: 'Giấy chứng nhận tham gia phong trào; Quyết định khen thưởng; Báo cáo kết quả thực hiện nhiệm vụ đột xuất.',
      evaluator_role: 'Ban Giám hiệu / Cấp trên'
    }
  ],

  // ==========================================
  // 2. TỔ TRƯỞNG / TỔ PHÓ CHUYÊN MÔN (TTCM/TPCM - DÙNG CHUNG 1 BỘ) - Tổng 100 điểm nền
  // ==========================================
  TTCM_TPCM: [
    // Nhóm A: Phẩm chất chính trị, đạo đức và văn hóa công sở (15 điểm)
    {
      stt: 1,
      kpi_code: 'TTCM-A1',
      code: 'TTCM-A1',
      kpi_group: 'Phẩm chất chính trị, đạo đức và văn hóa công sở',
      criterion_content: 'Chấp hành chủ trương, quy định; giữ gìn đạo đức nhà giáo và đoàn kết trong tổ',
      criterionName: 'Chấp hành chủ trương, quy định; giữ gìn đạo đức nhà giáo và đoàn kết trong tổ',
      description: 'Chấp hành nghiêm chủ trương của Đảng, pháp luật Nhà nước, nội quy nhà trường; giữ gìn đạo đức lối sống mẫu mực, xây dựng khối đoàn kết tổ',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vi phạm quy định mức nhẹ hoặc nhắc nhở', score: 1.0 },
        { label: 'Gây bất đồng, thiếu tinh thần hợp tác trong tổ', score: 2.0 },
        { label: 'Vi phạm đạo đức nhà giáo / quy chế công sở', score: 5.0 },
        { label: 'Vi phạm nghiêm trọng làm ảnh hưởng uy tín nhà trường', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Được tập thể tổ đánh giá xuất sắc về tác phong, gương mẫu', score: 0.5 },
        { label: 'Có sáng kiến xây dựng văn hóa công sở và khối đoàn kết tổ', score: 1.0 },
        { label: 'Được khen thưởng danh hiệu Đảng viên / Nhà giáo tiêu biểu', score: 2.0 }
      ],
      evidence_rule: 'Biên bản sinh hoạt tổ; phiếu đánh giá viên chức cuối kỳ; minh chứng chấp hành nội quy.',
      evaluator_role: 'Ban Giám Hiệu'
    },
    {
      stt: 2,
      kpi_code: 'TTCM-A2',
      code: 'TTCM-A2',
      kpi_group: 'Phẩm chất chính trị, đạo đức và văn hóa công sở',
      criterion_content: 'Thực hiện chế độ hội họp, nền nếp tác phong và kỷ cương nhà trường',
      criterionName: 'Thực hiện chế độ hội họp, nền nếp tác phong và kỷ cương nhà trường',
      description: 'Tham gia đầy đủ, đúng giờ các cuộc họp hội đồng, giao ban BGH; chủ trì sinh hoạt tổ chuyên môn đúng lịch và chất lượng',
      base_score: 5,
      standardScore: 5,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Đi muộn hoặc vắng họp không có lý do chính đáng 1 lần', score: 0.5 },
        { label: 'Không tổ chức họp tổ chuyên môn đúng định kỳ quy định', score: 1.0 },
        { label: 'Nền nếp tác phong chưa chuẩn mực, để tổ viên đi muộn nhiều', score: 2.5 },
        { label: 'Tự ý bỏ họp giao ban, không điều hành sinh hoạt tổ', score: 5.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Chủ trì các buổi họp tổ hiệu quả, đúng trọng tâm', score: 0.25 },
        { label: '100% tổ viên chấp hành nghiêm túc giờ giấc, không vi phạm', score: 0.5 },
        { label: 'Tổ chuyên môn được tuyên dương nền nếp kiểu mẫu', score: 1.0 }
      ],
      evidence_rule: 'Sổ theo dõi sinh hoạt tổ chuyên môn; biên bản các cuộc họp; lịch chấm công.',
      evaluator_role: 'Ban Giám Hiệu'
    },

    // Nhóm B: Quản lý, điều hành hoạt động chuyên môn của tổ (45 điểm)
    {
      stt: 3,
      kpi_code: 'TTCM-B1',
      code: 'TTCM-B1',
      kpi_group: 'Quản lý, điều hành hoạt động chuyên môn của tổ',
      criterion_content: 'Xây dựng và tổ chức thực hiện kế hoạch hoạt động của tổ chuyên môn',
      criterionName: 'Xây dựng và tổ chức thực hiện kế hoạch hoạt động của tổ chuyên môn',
      description: 'Xây dựng kế hoạch dạy học, kế hoạch giáo dục tổ, phân công nhiệm vụ khoa học, công bằng, đúng năng lực và đôn đốc thực hiện',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Kế hoạch tổ nộp chậm so với thời hạn BGH giao', score: 1.5 },
        { label: 'Phân công chuyên môn chưa hợp lý, phải điều chỉnh nhiều lần', score: 3.0 },
        { label: 'Không đôn đốc tổ viên thực hiện đúng kế hoạch dạy học', score: 7.5 },
        { label: 'Không xây dựng kế hoạch giáo dục tổ / Bỏ trống nhiệm vụ', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Kế hoạch giáo dục tổ sáng tạo, tích hợp liên môn hiệu quả', score: 0.5 },
        { label: 'Tổ chức các hoạt động ngoại khóa, chuyên đề xuất sắc', score: 1.0 },
        { label: 'Tổ đạt danh hiệu Tập thể Lao động Tiên tiến / Xuất sắc', score: 2.0 }
      ],
      evidence_rule: 'Kế hoạch giáo dục tổ chuyên môn; bảng phân công chuyên môn; kế hoạch dạy học các môn; biên bản duyệt kế hoạch BGH.',
      evaluator_role: 'Ban Giám Hiệu'
    },
    {
      stt: 4,
      kpi_code: 'TTCM-B2',
      code: 'TTCM-B2',
      kpi_group: 'Quản lý, điều hành hoạt động chuyên môn của tổ',
      criterion_content: 'Quản lý, kiểm tra hồ sơ giáo án, sổ sách và tiến độ chương trình của tổ viên',
      criterionName: 'Quản lý, kiểm tra hồ sơ giáo án, sổ sách và tiến độ chương trình của tổ viên',
      description: 'Ký duyệt giáo án đúng lịch, kiểm tra tiến độ dạy học, sổ điểm, nhật ký giảng dạy và đôn đốc quy chế chuyên môn',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Ký duyệt giáo án chậm so với lịch quy định', score: 1.5 },
        { label: 'Thiếu kiểm tra tiến độ chương trình, để tổ viên dạy lệch tiến độ', score: 3.0 },
        { label: 'Để xảy ra sai sót trong hồ sơ chuyên môn của tổ viên', score: 7.5 },
        { label: 'Không thực hiện duyệt giáo án và kiểm tra hồ sơ tổ viên', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: '100% giáo án tổ viên đạt yêu cầu chất lượng, đúng tiến độ', score: 0.5 },
        { label: 'Có hệ thống quản lý, thẩm định giáo án số hóa tiện ích', score: 1.0 },
        { label: 'Hồ sơ chuyên môn của tổ được Sở GD&ĐT kiểm tra xếp loại Tốt', score: 2.0 }
      ],
      evidence_rule: 'Sổ ký duyệt giáo án; biên bản kiểm tra hồ sơ chuyên môn định kỳ; phần mềm quản lý giáo án điện tử.',
      evaluator_role: 'Ban Giám Hiệu'
    },
    {
      stt: 5,
      kpi_code: 'TTCM-B3',
      code: 'TTCM-B3',
      kpi_group: 'Quản lý, điều hành hoạt động chuyên môn của tổ',
      criterion_content: 'Tổ chức sinh hoạt chuyên môn theo NCBH, đổi mới PP, bồi dưỡng GV và HS',
      criterionName: 'Tổ chức sinh hoạt chuyên môn theo NCBH, đổi mới PP, bồi dưỡng GV và HS',
      description: 'Tổ chức sinh hoạt chuyên môn theo nghiên cứu bài học, thao giảng, dự giờ, bồi dưỡng GV dự thi GVG và đội tuyển HSG',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Sinh hoạt tổ hình thức, chưa đi sâu vào nghiên cứu bài học', score: 1.5 },
        { label: 'Không tổ chức đủ số tiết thao giảng, chuyên đề theo kế hoạch', score: 3.0 },
        { label: 'Không chỉ đạo công tác bồi dưỡng HSG / phụ đạo học sinh yếu', score: 7.5 },
        { label: 'Không thực hiện dự giờ, sinh hoạt chuyên môn theo quy định', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Có chuyên đề cấp trường / cấp cụm đạt chất lượng cao', score: 0.5 },
        { label: 'Tổ có giáo viên đạt giải GVG cấp tỉnh / HS đạt giải HSG tỉnh', score: 1.0 },
        { label: 'Mô hình sinh hoạt chuyên môn NCBH được nhân rộng toàn trường', score: 2.0 }
      ],
      evidence_rule: 'Sổ biên bản sinh hoạt chuyên môn theo NCBH; hồ sơ chuyên đề; biên bản dự giờ, thao giảng; kết quả thi GVG, HSG.',
      evaluator_role: 'Ban Giám Hiệu'
    },

    // Nhóm C: Thực hiện nhiệm vụ giảng dạy và giáo dục trực tiếp (25 điểm)
    {
      stt: 6,
      kpi_code: 'TTCM-C1',
      code: 'TTCM-C1',
      kpi_group: 'Thực hiện nhiệm vụ giảng dạy và giáo dục trực tiếp',
      criterion_content: 'Thực hiện giờ dạy đúng tiến độ, chất lượng và đổi mới kiểm tra đánh giá',
      criterionName: 'Thực hiện giờ dạy đúng tiến độ, chất lượng và đổi mới kiểm tra đánh giá',
      description: 'Giảng dạy đúng phân phối chương trình, chuẩn bị bài chu đáo, đổi mới PP dạy học, ra đề kiểm tra đúng ma trận và nhập điểm đúng hạn',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vào lớp muộn, ra sớm hoặc dạy chưa sát tiến độ', score: 1.5 },
        { label: 'Chậm nộp đề kiểm tra hoặc chậm cập nhật điểm số', score: 3.0 },
        { label: 'Để xảy ra sai sót trong chấm bài, vào điểm', score: 7.5 },
        { label: 'Bỏ tiết không phép hoặc cắt xén chương trình', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Chất lượng học tập bộ môn giảng dạy vượt chỉ tiêu đề ra', score: 0.5 },
        { label: 'Đạt danh hiệu Giáo viên dạy giỏi các cấp', score: 1.0 },
        { label: 'Có sáng kiến kinh nghiệm được Hội đồng khoa học ngành công nhận', score: 2.0 }
      ],
      evidence_rule: 'Sổ báo giảng; sổ đầu bài; sổ theo dõi đánh giá học sinh; bài kiểm tra đã chấm trả.',
      evaluator_role: 'Ban Giám Hiệu'
    },
    {
      stt: 7,
      kpi_code: 'TTCM-C2',
      code: 'TTCM-C2',
      kpi_group: 'Thực hiện nhiệm vụ giảng dạy và giáo dục trực tiếp',
      criterion_content: 'Thực hiện công tác chủ nhiệm / bồi dưỡng HSG / phụ đạo học sinh',
      criterionName: 'Thực hiện công tác chủ nhiệm / bồi dưỡng HSG / phụ đạo học sinh',
      description: 'Quản lý tốt lớp chủ nhiệm, phối hợp phụ huynh; hoặc trực tiếp bồi dưỡng học sinh giỏi, phụ đạo học sinh yếu theo phân công',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Lớp chủ nhiệm có vi phạm nền nếp hoặc chậm báo cáo', score: 1.0 },
        { label: 'Thực hiện bồi dưỡng HSG / phụ đạo chưa đảm bảo số buổi', score: 2.0 },
        { label: 'Để học sinh vi phạm nghiêm trọng kỷ luật trường học', score: 5.0 },
        { label: 'Không hoàn thành nhiệm vụ chủ nhiệm / bồi dưỡng được giao', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Lớp chủ nhiệm đạt danh hiệu Lớp Xuất sắc / Tiên tiến', score: 0.5 },
        { label: 'Có học sinh đạt giải HSG cấp tỉnh bộ môn phụ trách', score: 1.0 },
        { label: 'Được phụ huynh và nhà trường khen thưởng công tác giáo dục', score: 2.0 }
      ],
      evidence_rule: 'Sổ chủ nhiệm; kế hoạch và sổ điểm bồi dưỡng HSG; biên bản họp phụ huynh.',
      evaluator_role: 'Ban Giám Hiệu'
    },

    // Nhóm D: Chế độ thông tin, báo cáo và nhiệm vụ phối hợp (15 điểm)
    {
      stt: 8,
      kpi_code: 'TTCM-D1',
      code: 'TTCM-D1',
      kpi_group: 'Chế độ thông tin, báo cáo và nhiệm vụ phối hợp',
      criterion_content: 'Thực hiện chế độ thông tin, báo cáo chuyên môn cho BGH đúng hạn, chính xác',
      criterionName: 'Thực hiện chế độ thông tin, báo cáo chuyên môn cho BGH đúng hạn, chính xác',
      description: 'Tổng hợp số liệu, kết quả dạy học, nộp báo cáo định kỳ tháng, học kỳ và báo cáo đột xuất cho BGH đầy đủ, chính xác',
      base_score: 8,
      standardScore: 8,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Nộp báo cáo chuyên môn chậm so với hạn quy định', score: 0.5 },
        { label: 'Số liệu báo cáo chưa chính xác, phải yêu cầu làm lại', score: 1.5 },
        { label: 'Thiếu các báo cáo sơ kết, tổng kết chuyên môn định kỳ', score: 4.0 },
        { label: 'Không thực hiện chế độ báo cáo chuyên môn cho BGH', score: 8.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Báo cáo đầy đủ, khoa học, nộp sớm trước hạn', score: 0.5 },
        { label: 'Có báo cáo phân tích chất lượng sâu sát, đề xuất giải pháp hay', score: 1.0 },
        { label: 'Được BGH biểu dương tổ chuyên môn gương mẫu trong báo cáo', score: 1.5 }
      ],
      evidence_rule: 'Hồ sơ báo cáo chuyên môn tháng/học kỳ; thư điện tử/hệ thống quản lý công văn.',
      evaluator_role: 'Ban Giám Hiệu'
    },
    {
      stt: 9,
      kpi_code: 'TTCM-D2',
      code: 'TTCM-D2',
      kpi_group: 'Chế độ thông tin, báo cáo và nhiệm vụ phối hợp',
      criterion_content: 'Phối hợp các tổ chức đoàn thể, thực hiện nhiệm vụ đột xuất BGH giao',
      criterionName: 'Phối hợp các tổ chức đoàn thể, thực hiện nhiệm vụ đột xuất BGH giao',
      description: 'Phối hợp tốt với Công đoàn, Đoàn thanh niên, các tổ bạn; sẵn sàng nhận và hoàn thành tốt nhiệm vụ đột xuất do BGH phân công',
      base_score: 7,
      standardScore: 7,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Tham gia các hoạt động phối hợp còn chậm trễ', score: 0.5 },
        { label: 'Thực hiện nhiệm vụ đột xuất chưa đảm bảo yêu cầu', score: 1.5 },
        { label: 'Từ chối nhận nhiệm vụ phân công của nhà trường', score: 3.5 },
        { label: 'Không hoàn thành nhiệm vụ phối hợp và đột xuất được giao', score: 7.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Tích cực tham gia các phong trào thi đua, hoạt động tập thể', score: 0.5 },
        { label: 'Xử lý các nhiệm vụ đột xuất hiệu quả, kịp thời', score: 1.0 },
        { label: 'Được Công đoàn / Đoàn trường tặng Giấy khen xuất sắc', score: 1.5 }
      ],
      evidence_rule: 'Văn bản phân công nhiệm vụ đột xuất; biên bản hoạt động phối hợp.',
      evaluator_role: 'Ban Giám Hiệu'
    }
  ],

  // ==========================================
  // 3. GIÁO VIÊN (GV: Giáo viên trực tiếp giảng dạy) - Tổng 100 điểm nền
  // ==========================================
  GV: [
    // Nhóm A: Phẩm chất chính trị, đạo đức, lối sống, văn hóa công sở (20 điểm)
    {
      stt: 1,
      kpi_code: 'GV-A1',
      code: 'GV-A1',
      kpi_group: 'Phẩm chất chính trị, đạo đức, lối sống, văn hóa công sở',
      criterion_content: 'Chấp hành chủ trương, đường lối, chính sách, pháp luật và nội quy cơ quan',
      criterionName: 'Chấp hành chủ trương, đường lối, chính sách, pháp luật và nội quy cơ quan',
      description: 'Chấp hành nghiêm đường lối của Đảng, pháp luật Nhà nước, quy chế của ngành và nội quy nhà trường; giữ gìn tư tưởng chính trị vững vàng',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vi phạm nội quy làm việc mức nhắc nhở 1 lần', score: 1.0 },
        { label: 'Vi phạm quy định giờ giấc, tác phong làm việc', score: 2.0 },
        { label: 'Chấp hành chưa nghiêm chỉ đạo của nhà trường', score: 5.0 },
        { label: 'Vi phạm kỷ luật nghiêm trọng', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Gương mẫu trong chấp hành chủ trương, quy chế', score: 0.5 },
        { label: 'Được biểu dương gương người tốt việc tốt / Đảng viên xuất sắc', score: 1.0 },
        { label: 'Được tặng Bằng khen cấp tỉnh / Ngành giáo dục', score: 2.0 }
      ],
      evidence_rule: 'Bản cam kết đầu năm; phiếu đánh giá viên chức; biên bản họp hội đồng.',
      evaluator_role: 'Tổ trưởng Chuyên môn / Ban Giám Hiệu'
    },
    {
      stt: 2,
      kpi_code: 'GV-A2',
      code: 'GV-A2',
      kpi_group: 'Phẩm chất chính trị, đạo đức, lối sống, văn hóa công sở',
      criterion_content: 'Giữ gìn phẩm chất đạo đức nhà giáo, tác phong sư phạm, văn hóa ứng xử',
      criterionName: 'Giữ gìn phẩm chất đạo đức nhà giáo, tác phong sư phạm, văn hóa ứng xử',
      description: 'Thực hiện chuẩn mực đạo đức nhà giáo, giao tiếp ứng xử văn minh, thương yêu học sinh, tôn trọng đồng nghiệp và phụ huynh',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Trang phục, tác phong chưa đúng quy chuẩn sư phạm 1 lần', score: 1.0 },
        { label: 'Có biểu hiện phát ngôn, ứng xử chưa chuẩn mực', score: 2.0 },
        { label: 'Vi phạm quy tắc ứng xử văn hóa học đường / Xúc phạm học sinh', score: 5.0 },
        { label: 'Vi phạm nghiêm trọng đạo đức nhà giáo', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Được phụ huynh và học sinh tin yêu, đánh giá cao', score: 0.5 },
        { label: 'Điển hình nhà giáo mẫu mực trong giao tiếp, ứng xử', score: 1.0 },
        { label: 'Được vinh danh Nhà giáo tiêu biểu dạy tốt - học tốt', score: 2.0 }
      ],
      evidence_rule: 'Phiếu nhận xét của học sinh, phụ huynh; biên bản đánh giá chuẩn nghề nghiệp GV.',
      evaluator_role: 'Tổ trưởng Chuyên môn / Ban Giám Hiệu'
    },

    // Nhóm B: Thực hiện quy chế chuyên môn và hoạt động dạy học (45 điểm)
    {
      stt: 3,
      kpi_code: 'GV-B1',
      code: 'GV-B1',
      kpi_group: 'Thực hiện quy chế chuyên môn và hoạt động dạy học',
      criterion_content: 'Thực hiện giờ lên lớp đúng giờ, đủ tiết, đúng tiến độ phân phối chương trình',
      criterionName: 'Thực hiện giờ lên lớp đúng giờ, đủ tiết, đúng tiến độ phân phối chương trình',
      description: 'Lên lớp đúng giờ, không vào muộn ra sớm, dạy đủ số tiết theo phân công, không tự ý đổi tiết hoặc bỏ giờ dạy',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vào lớp muộn hoặc ra sớm 1 lần', score: 1.5 },
        { label: 'Dạy lệch tiến độ chương trình từ 1-2 tuần không có lý do', score: 3.0 },
        { label: 'Tự ý đổi tiết, nhờ dạy hộ không báo cáo lãnh đạo', score: 7.5 },
        { label: 'Bỏ tiết dạy không có lý do / Cắt xén chương trình', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: '100% tiết dạy đúng tiến độ, quản lý nền nếp lớp học xuất sắc', score: 0.5 },
        { label: 'Sẵn sàng dạy thay, hỗ trợ đồng nghiệp ốm đau đạt kết quả tốt', score: 1.0 },
        { label: 'Được tuyên dương thực hiện kỷ cương chuyên môn mẫu mực', score: 2.0 }
      ],
      evidence_rule: 'Sổ đầu bài các lớp; lịch báo giảng điện tử; sổ chấm công giảng dạy.',
      evaluator_role: 'Tổ trưởng Chuyên môn'
    },
    {
      stt: 4,
      kpi_code: 'GV-B2',
      code: 'GV-B2',
      kpi_group: 'Thực hiện quy chế chuyên môn và hoạt động dạy học',
      criterion_content: 'Chuẩn bị hồ sơ giáo án đầy đủ, đổi mới phương pháp dạy học và ứng dụng CNTT',
      criterionName: 'Chuẩn bị hồ sơ giáo án đầy đủ, đổi mới phương pháp dạy học và ứng dụng CNTT',
      description: 'Soạn giáo án đầy đủ theo công văn 5512/BGDĐT, ứng dụng CNTT, thiết bị dạy học, đổi mới phương pháp phát triển phẩm chất học sinh',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Nộp giáo án duyệt chậm so với quy định 1 lần', score: 1.5 },
        { label: 'Giáo án soạn chưa đúng cấu trúc hướng dẫn, thiếu đồ dùng dạy học', score: 3.0 },
        { label: 'Giáo án sơ sài, sao chép không chỉnh sửa, không ứng dụng CNTT', score: 7.5 },
        { label: 'Lên lớp không có giáo án / Thiếu hồ sơ chuyên môn', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Giáo án điện tử chất lượng cao, tích hợp công nghệ sáng tạo', score: 0.5 },
        { label: 'Có bài giảng E-learning / Thiết bị dạy học số đạt giải', score: 1.0 },
        { label: 'Đạt giải cao trong Hội thi Giáo viên dạy giỏi cấp tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Hồ sơ giáo án điện tử được phê duyệt; bài giảng số; phiếu đánh giá tiết dạy, dự giờ.',
      evaluator_role: 'Tổ trưởng Chuyên môn'
    },
    {
      stt: 5,
      kpi_code: 'GV-B3',
      code: 'GV-B3',
      kpi_group: 'Thực hiện quy chế chuyên môn và hoạt động dạy học',
      criterion_content: 'Kiểm tra đánh giá học sinh, chấm bài, trả bài và cập nhật điểm số đúng hạn',
      criterionName: 'Kiểm tra đánh giá học sinh, chấm bài, trả bài và cập nhật điểm số đúng hạn',
      description: 'Ra đề đúng ma trận đặc tả, chấm bài công bằng khách quan, trả bài đúng quy định, cập nhật điểm vào phần mềm vnEdu đúng thời hạn',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chậm nộp đề kiểm tra định kỳ hoặc chậm trả bài 1 lần', score: 1.5 },
        { label: 'Cập nhật điểm số vào phần mềm quản lý chậm so với thời hạn', score: 3.0 },
        { label: 'Để xảy ra sai sót điểm số phải sửa chữa nhiều lần', score: 7.5 },
        { label: 'Vi phạm quy chế thi cử, đánh giá học sinh không đúng thực chất', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Nhập điểm nhanh chóng, chính xác 100%, không cần chỉnh sửa', score: 0.5 },
        { label: 'Đổi mới công cụ kiểm tra đánh giá trực tuyến hiệu quả', score: 1.0 },
        { label: 'Được nhà trường khen thưởng về công tác kiểm tra đánh giá', score: 2.0 }
      ],
      evidence_rule: 'Ma trận và đề kiểm tra; sổ điểm cá nhân; dữ liệu nhập điểm trên vnEdu/SMAS.',
      evaluator_role: 'Tổ trưởng Chuyên môn'
    },

    // Nhóm C: Hoạt động giáo dục học sinh và công tác kiêm nhiệm (20 điểm)
    {
      stt: 6,
      kpi_code: 'GV-C1',
      code: 'GV-C1',
      kpi_group: 'Hoạt động giáo dục học sinh và công tác kiêm nhiệm',
      criterion_content: 'Công tác chủ nhiệm lớp / quản lý nền nếp học sinh / bồi dưỡng học sinh',
      criterionName: 'Công tác chủ nhiệm lớp / quản lý nền nếp học sinh / bồi dưỡng học sinh',
      description: 'Quản lý tốt nề nếp học sinh, phối hợp phụ huynh, tổ chức sinh hoạt lớp hiệu quả; hoặc thực hiện tốt nhiệm vụ bồi dưỡng HSG, phụ đạo',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Lớp chủ nhiệm vi phạm nề nếp, trật tự mức nhẹ', score: 1.0 },
        { label: 'Chậm nộp báo cáo công tác chủ nhiệm / sổ theo dõi', score: 2.0 },
        { label: 'Không nắm bắt kịp thời học sinh có hoàn cảnh đặc biệt/vi phạm', score: 5.0 },
        { label: 'Để lớp chủ nhiệm mất an toàn, bạo lực học đường', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Lớp chủ nhiệm dẫn đầu phong trào thi đua của trường', score: 0.5 },
        { label: 'Có học sinh đạt giải HSG / Khoa học kỹ thuật cấp tỉnh', score: 1.0 },
        { label: 'Đạt danh hiệu Giáo viên chủ nhiệm giỏi cấp tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Sổ chủ nhiệm; biên bản họp CMHS; kế hoạch bồi dưỡng HSG/phụ đạo; bảng xếp hạng thi đua lớp.',
      evaluator_role: 'Tổ trưởng Chuyên môn / Ban Giám Hiệu'
    },
    {
      stt: 7,
      kpi_code: 'GV-C2',
      code: 'GV-C2',
      kpi_group: 'Hoạt động giáo dục học sinh và công tác kiêm nhiệm',
      criterion_content: 'Tham gia sinh hoạt tổ chuyên môn, hội họp, dự giờ và bồi dưỡng thường xuyên',
      criterionName: 'Tham gia sinh hoạt tổ chuyên môn, hội họp, dự giờ và bồi dưỡng thường xuyên',
      description: 'Tham gia đầy đủ sinh hoạt tổ theo NCBH, thực hiện đủ số tiết dự giờ theo quy định (ít nhất 1 tiết/tuần), hoàn thành bồi dưỡng thường xuyên',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vắng sinh hoạt tổ chuyên môn không phép 1 lần', score: 1.0 },
        { label: 'Không thực hiện đủ số tiết dự giờ theo quy định', score: 2.0 },
        { label: 'Chậm hoàn thành các mô-đun bồi dưỡng thường xuyên', score: 5.0 },
        { label: 'Không tham gia sinh hoạt chuyên môn, dự giờ', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Tích cực đóng góp ý kiến hay trong sinh hoạt chuyên môn NCBH', score: 0.5 },
        { label: 'Dạy tiết chuyên đề / Thao giảng cấp trường được đánh giá xuất sắc', score: 1.0 },
        { label: 'Hoàn thành xuất sắc và sớm các khóa bồi dưỡng chuyên môn', score: 2.0 }
      ],
      evidence_rule: 'Sổ dự giờ; chứng chỉ bồi dưỡng TEMIS; biên bản sinh hoạt tổ chuyên môn.',
      evaluator_role: 'Tổ trưởng Chuyên môn'
    },

    // Nhóm D: Chấp hành phân công và thực hiện nhiệm vụ khác (15 điểm)
    {
      stt: 8,
      kpi_code: 'GV-D1',
      code: 'GV-D1',
      kpi_group: 'Chấp hành phân công và thực hiện nhiệm vụ khác',
      criterion_content: 'Thực hiện lịch trực, coi thi, chấm thi và các nhiệm vụ chung của trường',
      criterionName: 'Thực hiện lịch trực, coi thi, chấm thi và các nhiệm vụ chung của trường',
      description: 'Trực cơ quan, coi thi, chấm thi nghiêm túc, đúng quy chế, bảo mật đề thi và chấp hành sự phân công của BGH',
      base_score: 8,
      standardScore: 8,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Đi muộn trong ca trực hoặc giờ làm nhiệm vụ coi thi', score: 0.5 },
        { label: 'Chậm nộp bài chấm thi hoặc biên bản coi thi', score: 1.5 },
        { label: 'Để xảy ra sai sót trong coi thi / chấm thi', score: 4.0 },
        { label: 'Bỏ ca trực, bỏ nhiệm vụ coi thi không có lý do', score: 8.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Hoàn thành xuất sắc nhiệm vụ coi thi, chấm thi các kỳ thi lớn', score: 0.5 },
        { label: 'Nhiệt tình trực thay, hỗ trợ các nhiệm vụ chung của cơ quan', score: 1.0 },
        { label: 'Được Hội đồng thi đua nhà trường khen thưởng', score: 1.5 }
      ],
      evidence_rule: 'Sổ trực cơ quan; biên bản coi thi, giao nhận bài chấm thi; quyết định phân công.',
      evaluator_role: 'Tổ trưởng Chuyên môn / Ban Giám Hiệu'
    },
    {
      stt: 9,
      kpi_code: 'GV-D2',
      code: 'GV-D2',
      kpi_group: 'Chấp hành phân công và thực hiện nhiệm vụ khác',
      criterion_content: 'Tham gia phong trào thi đua, hoạt động đoàn thể và nhiệm vụ đột xuất',
      criterionName: 'Tham gia phong trào thi đua, hoạt động đoàn thể và nhiệm vụ đột xuất',
      description: 'Tích cực tham gia hoạt động Công đoàn, Đoàn trường, các cuộc vận động và sẵn sàng thực hiện các công việc đột xuất',
      base_score: 7,
      standardScore: 7,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Tham gia các hoạt động phong trào còn thiếu tích cực', score: 0.5 },
        { label: 'Thực hiện nhiệm vụ đột xuất chậm tiến độ', score: 1.5 },
        { label: 'Không tham gia các phong trào thi đua lớn của nhà trường', score: 3.5 },
        { label: 'Từ chối thực hiện nhiệm vụ phân công đột xuất', score: 7.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Đạt giải trong các hội thi văn nghệ, thể thao, phong trào thi đua', score: 0.5 },
        { label: 'Có nhiều đóng góp nổi bật trong các sự kiện lớn của nhà trường', score: 1.0 },
        { label: 'Được Công đoàn ngành / Tỉnh đoàn khen thưởng xuất sắc', score: 1.5 }
      ],
      evidence_rule: 'Giấy chứng nhận; quyết định khen thưởng; biên bản tham gia sự kiện.',
      evaluator_role: 'Tổ trưởng Chuyên môn / Ban Giám Hiệu'
    }
  ],

  // ==========================================
  // 4. NHÂN VIÊN (NV: Hành chính, Kế toán, Văn thư, Y tế, Thiết bị, Thư viện, Thủ quỹ, CNTT, Bảo vệ, Phục vụ) - Tổng 100 điểm nền
  // ==========================================
  NV: [
    // Nhóm A: Phẩm chất chính trị, đạo đức, văn hóa công sở và ý thức tổ chức (20 điểm)
    {
      stt: 1,
      kpi_code: 'NV-A1',
      code: 'NV-A1',
      kpi_group: 'Phẩm chất chính trị, đạo đức, văn hóa công sở và ý thức tổ chức',
      criterion_content: 'Chấp hành chủ trương, pháp luật, quy chế cơ quan và nội quy lao động',
      criterionName: 'Chấp hành chủ trương, pháp luật, quy chế cơ quan và nội quy lao động',
      description: 'Chấp hành nghiêm đường lối của Đảng, chính sách pháp luật, nội quy lao động và quy chế làm việc của cơ quan',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Vi phạm nội quy làm việc 1 lần mức nhắc nhở', score: 1.0 },
        { label: 'Chấp hành chưa nghiêm túc quy chế làm việc', score: 2.0 },
        { label: 'Không tuân thủ sự phân công chỉ đạo của tổ trưởng/BGH', score: 5.0 },
        { label: 'Vi phạm kỷ luật lao động nghiêm trọng', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Gương mẫu trong chấp hành quy chế cơ quan', score: 0.5 },
        { label: 'Được bình xét cá nhân tiêu biểu trong công tác', score: 1.0 },
        { label: 'Được khen thưởng danh hiệu thi đua cấp tỉnh/ngành', score: 2.0 }
      ],
      evidence_rule: 'Phiếu theo dõi ngày công; biên bản họp tổ văn phòng; phiếu đánh giá viên chức.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },
    {
      stt: 2,
      kpi_code: 'NV-A2',
      code: 'NV-A2',
      kpi_group: 'Phẩm chất chính trị, đạo đức, văn hóa công sở và ý thức tổ chức',
      criterion_content: 'Tác phong làm việc chuẩn mực, văn hóa giao tiếp hòa nhã, giữ gìn đoàn kết',
      criterionName: 'Tác phong làm việc chuẩn mực, văn hóa giao tiếp hòa nhã, giữ gìn đoàn kết',
      description: 'Thái độ phục vụ tận tình, hòa nhã, lịch sự với CBGVNV, học sinh và phụ huynh; giữ gìn đoàn kết nội bộ',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Thái độ giao tiếp chưa hòa nhã, bị phản ánh 1 lần', score: 1.0 },
        { label: 'Gây phiền hà trong giải quyết thủ tục hành chính', score: 2.0 },
        { label: 'Gây mất đoàn kết nội bộ / Ứng xử thiếu văn hóa', score: 5.0 },
        { label: 'Vi phạm nghiêm trọng quy tắc văn hóa công vụ', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Được đồng nghiệp và học sinh ghi nhận thái độ phục vụ tốt', score: 0.5 },
        { label: 'Có sáng kiến cải tiến phong cách phục vụ tận tụy', score: 1.0 },
        { label: 'Được tuyên dương điển hình văn hóa công sở', score: 2.0 }
      ],
      evidence_rule: 'Sổ tiếp nhận ý kiến; biên bản đánh giá thi đua tổ văn phòng.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },

    // Nhóm B: Thực hiện nhiệm vụ chuyên môn theo vị trí việc làm (50 điểm)
    {
      stt: 3,
      kpi_code: 'NV-B1',
      code: 'NV-B1',
      kpi_group: 'Thực hiện nhiệm vụ chuyên môn theo vị trí việc làm',
      criterion_content: 'Hoàn thành đầy đủ, chính xác, kịp thời nhiệm vụ chuyên môn được giao',
      criterionName: 'Hoàn thành đầy đủ, chính xác, kịp thời nhiệm vụ chuyên môn được giao',
      description: 'Thực hiện công việc kế toán, văn thư, thủ quỹ, y tế, thiết bị, thư viện, CNTT, bảo vệ, phục vụ đạt chất lượng, tiến độ và đúng quy trình',
      base_score: 25,
      standardScore: 25,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Công việc hoàn thành chậm tiến độ 1-2 ngày', score: 2.5 },
        { label: 'Để xảy ra sai sót trong xử lý nghiệp vụ chuyên môn', score: 5.0 },
        { label: 'Sai sót nghiệp vụ nghiêm trọng gây ảnh hưởng tiến độ chung', score: 12.5 },
        { label: 'Không hoàn thành nhiệm vụ chuyên môn được giao', score: 25.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Hoàn thành công việc chất lượng cao, trước hạn', score: 1.0 },
        { label: 'Có giải pháp rút ngắn thời gian giải quyết công việc chuyên môn', score: 2.0 },
        { label: 'Được tặng Bằng khen / Giấy khen chuyên môn xuất sắc', score: 3.5 }
      ],
      evidence_rule: 'Hồ sơ chứng từ kế toán; sổ công văn đi/đến; sổ theo dõi mượn thiết bị/sách; sổ khám y tế; nhật ký bảo vệ.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },
    {
      stt: 4,
      kpi_code: 'NV-B2',
      code: 'NV-B2',
      kpi_group: 'Thực hiện nhiệm vụ chuyên môn theo vị trí việc làm',
      criterion_content: 'Lập, quản lý, lưu trữ hồ sơ, sổ sách, chứng từ, dữ liệu phần mềm đúng hạn',
      criterionName: 'Lập, quản lý, lưu trữ hồ sơ, sổ sách, chứng từ, dữ liệu phần mềm đúng hạn',
      description: 'Lưu trữ hồ sơ khoa học, cập nhật phần mềm (MISA, CSDL ngành, vnEdu, phần mềm văn thư, thư viện) đầy đủ, chính xác và bảo mật',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chậm cập nhật dữ liệu phần mềm hoặc lưu trữ hồ sơ chưa gọn gàng', score: 1.5 },
        { label: 'Số liệu hồ sơ báo cáo chưa chính xác, phải chỉnh sửa', score: 3.0 },
        { label: 'Để thất lạc hồ sơ, chứng từ, tài liệu quan trọng', score: 7.5 },
        { label: 'Làm lộ bí mật thông tin tài liệu / Không lưu trữ hồ sơ', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Hồ sơ, sổ sách khoa học, tra cứu nhanh chóng thuận tiện', score: 0.5 },
        { label: 'Số hóa 100% tài liệu, dữ liệu chuyên môn quản lý', score: 1.0 },
        { label: 'Hồ sơ kiểm tra chuyên môn đạt kết quả xuất sắc', score: 2.0 }
      ],
      evidence_rule: 'Hệ thống hồ sơ lưu trữ; dữ liệu phần mềm quản lý; biên bản kiểm tra công tác văn phòng.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },
    {
      stt: 5,
      kpi_code: 'NV-B3',
      code: 'NV-B3',
      kpi_group: 'Thực hiện nhiệm vụ chuyên môn theo vị trí việc làm',
      criterion_content: 'Quản lý, bảo quản an toàn tài sản công, cơ sở vật chất, phòng chức năng',
      criterionName: 'Quản lý, bảo quản an toàn tài sản công, cơ sở vật chất, phòng chức năng',
      description: 'Bảo quản tốt máy móc, trang thiết bị phòng thí nghiệm, thư viện, y tế, phòng máy tính; kiểm tra định kỳ, phòng chống cháy nổ và mất mát',
      base_score: 10,
      standardScore: 10,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chưa bảo quản trang thiết bị sạch sẽ, gọn gàng 1 lần', score: 1.0 },
        { label: 'Chậm báo cáo hỏng hóc hoặc chậm đề xuất sửa chữa tài sản', score: 2.0 },
        { label: 'Để xảy ra hư hỏng tài sản do thiếu trách nhiệm', score: 5.0 },
        { label: 'Để xảy ra mất mát, thất thoát tài sản cơ quan nghiêm trọng', score: 10.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Bảo dưỡng, tự sửa chữa máy móc thiết bị tiết kiệm chi phí', score: 0.5 },
        { label: 'Phòng chức năng đạt chuẩn Xanh - Sạch - Đẹp - An toàn kiểu mẫu', score: 1.0 },
        { label: 'Được Ban quản lý tài sản nhà trường tuyên dương', score: 2.0 }
      ],
      evidence_rule: 'Sổ theo dõi tài sản; biên bản kiểm kê định kỳ; sổ nhật ký phòng chức năng.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },

    // Nhóm C: Phục vụ, hỗ trợ hoạt động dạy học và các sự kiện nhà trường (15 điểm)
    {
      stt: 6,
      kpi_code: 'NV-C1',
      code: 'NV-C1',
      kpi_group: 'Phục vụ, hỗ trợ hoạt động dạy học và các sự kiện nhà trường',
      criterion_content: 'Phục vụ, hỗ trợ kịp thời hoạt động dạy học, giáo dục, hội họp của nhà trường',
      criterionName: 'Phục vụ, hỗ trợ kịp thời hoạt động dạy học, giáo dục, hội họp của nhà trường',
      description: 'Chuẩn bị phòng họp, âm thanh, thiết bị thí nghiệm, tài liệu in ấn, chăm sóc y tế, an ninh trật tự, vệ sinh môi trường chu đáo và kịp thời',
      base_score: 15,
      standardScore: 15,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Chuẩn bị phòng họp/thiết bị phục vụ còn chậm trễ 1 lần', score: 1.5 },
        { label: 'Phục vụ hoạt động dạy học, sự kiện chưa chu đáo, có phản ánh', score: 3.0 },
        { label: 'Thiếu trách nhiệm gây ảnh hưởng tiến độ sự kiện của trường', score: 7.5 },
        { label: 'Không thực hiện nhiệm vụ phục vụ sự kiện được phân công', score: 15.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Nhiệt tình, chu đáo, hỗ trợ các sự kiện thành công tốt đẹp', score: 0.5 },
        { label: 'Được ban tổ chức các hội nghị, sự kiện đánh giá cao', score: 1.0 },
        { label: 'Được tặng Giấy khen về công tác phục vụ sự kiện cấp tỉnh', score: 2.0 }
      ],
      evidence_rule: 'Lịch công tác tuần; kế hoạch phục vụ hội nghị/sự kiện; biên bản bàn giao thiết bị.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },

    // Nhóm D: Chấp hành giờ giấc, lịch trực và nhiệm vụ đột xuất (15 điểm)
    {
      stt: 7,
      kpi_code: 'NV-D1',
      code: 'NV-D1',
      kpi_group: 'Chấp hành giờ giấc, lịch trực và nhiệm vụ đột xuất',
      criterion_content: 'Chấp hành nghiêm túc giờ làm việc, lịch trực cơ quan và an toàn trường học',
      criterionName: 'Chấp hành nghiêm túc giờ làm việc, lịch trực cơ quan và an toàn trường học',
      description: 'Làm việc đúng giờ hành chính, trực ban, trực bảo vệ nghiêm túc 24/24, đảm bảo an ninh trật tự, an toàn cơ quan',
      base_score: 8,
      standardScore: 8,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Đi muộn hoặc về sớm giờ làm việc hành chính 1 lần', score: 0.5 },
        { label: 'Rời vị trí trực trong ca trực không có lý do', score: 1.5 },
        { label: 'Để người lạ vào trường không đúng quy định an ninh', score: 4.0 },
        { label: 'Bỏ ca trực bảo vệ / Trực cơ quan không có lý do', score: 8.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: '100% ngày công đúng giờ, ca trực an toàn tuyệt đối', score: 0.5 },
        { label: 'Phát hiện, ngăn chặn kịp thời sự cố mất an toàn cơ quan', score: 1.0 },
        { label: 'Được Công an địa phương / Nhà trường khen thưởng giữ gìn an ninh', score: 1.5 }
      ],
      evidence_rule: 'Sổ chấm công vân tay/nhận diện; sổ nhật ký trực bảo vệ; sổ theo dõi khách vào cơ quan.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    },
    {
      stt: 8,
      kpi_code: 'NV-D2',
      code: 'NV-D2',
      kpi_group: 'Chấp hành giờ giấc, lịch trực và nhiệm vụ đột xuất',
      criterion_content: 'Thực hiện các nhiệm vụ đột xuất theo phân công của Ban Giám Hiệu',
      criterionName: 'Thực hiện các nhiệm vụ đột xuất theo phân công của Ban Giám Hiệu',
      description: 'Sẵn sàng nhận và hoàn thành tốt mọi nhiệm vụ đột xuất do Lãnh đạo nhà trường giao, tích cực tham gia hoạt động đoàn thể',
      base_score: 7,
      standardScore: 7,
      minus_rules: [
        { label: 'Không vi phạm', score: 0 },
        { label: 'Tham gia nhiệm vụ đột xuất còn chậm tiến độ', score: 0.5 },
        { label: 'Thực hiện nhiệm vụ đột xuất chưa đạt chất lượng', score: 1.5 },
        { label: 'Có thái độ trốn tránh, ngại khó khi được phân công', score: 3.5 },
        { label: 'Từ chối thực hiện nhiệm vụ đột xuất của BGH', score: 7.0 }
      ],
      plus_rules: [
        { label: 'Không cộng', score: 0 },
        { label: 'Hoàn thành xuất sắc nhiệm vụ đột xuất, không kể ngoài giờ', score: 0.5 },
        { label: 'Tận tụy, có tinh thần trách nhiệm cao vì công việc chung', score: 1.0 },
        { label: 'Được BGH tặng Giấy khen hoàn thành xuất sắc nhiệm vụ', score: 1.5 }
      ],
      evidence_rule: 'Văn bản/chỉ đạo phân công công việc đột xuất; kết quả nghiệm thu công việc.',
      evaluator_role: 'Tổ trưởng Văn phòng / Ban Giám Hiệu'
    }
  ]
};

/**
 * Tạo danh sách tiêu chí độc lập (Snapshot) cho phiếu đánh giá KPI của đối tượng
 */
export function createEvaluationItemsForTarget(
  targetGroup: KpiTargetGroup,
  formId?: string
): KpiEvaluationItem[] {
  const normTarget = normalizeTargetGroup(targetGroup);
  const templates = STANDARD_KPI_CRITERIA_TEMPLATES[normTarget] || STANDARD_KPI_CRITERIA_TEMPLATES.GV;

  return templates.map((tmpl, idx) => ({
    id: `item_${normTarget.toLowerCase()}_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    formId: formId || '',
    form_id: formId || '',
    stt: tmpl.stt,
    code: tmpl.code,
    kpi_code: tmpl.kpi_code,
    kpi_group: tmpl.kpi_group,
    group: tmpl.kpi_group,
    criterionName: tmpl.criterionName,
    criterion_content: tmpl.criterion_content,
    description: tmpl.description,
    standardScore: tmpl.base_score,
    base_score: tmpl.base_score,
    minus_rules: tmpl.minus_rules,
    plus_rules: tmpl.plus_rules,
    evidence_rule: tmpl.evidence_rule,
    evaluator_role: tmpl.evaluator_role,

    // Phần A: Tự đánh giá
    selfScore: tmpl.base_score,
    self_kpi_score: tmpl.base_score,
    selfPlusScore: 0,
    self_plus_score: 0,
    selfMinusScore: 0,
    self_minus_score: 0,
    evidence: '',
    self_evidence: '',
    selfComment: '',
    self_comment: '',
    selected_self_minus_label: 'Không vi phạm (0đ)',
    selected_self_plus_label: 'Không cộng (0đ)',

    // Phần B: Người đánh giá
    evaluatorScore: tmpl.base_score,
    evaluator_kpi_score: tmpl.base_score,
    evaluatorPlusScore: 0,
    evaluator_plus_score: 0,
    evaluatorMinusScore: 0,
    evaluator_minus_score: 0,
    evaluatorComment: '',
    evaluator_comment: '',
    evaluatorNote: '',
    evaluator_note: '',
    selected_evaluator_minus_label: 'Không vi phạm (0đ)',
    selected_evaluator_plus_label: 'Không cộng (0đ)',

    // Điểm tổng chính thức
    plusScore: 0,
    plus_score: 0,
    minusScore: 0,
    minus_score: 0,
    kpiScore: tmpl.base_score,
    kpi_score: tmpl.base_score,
    comment: ''
  }));
}

/**
 * Tính tổng các chỉ số điểm cho phiếu KPI (cả tự đánh giá và người đánh giá)
 */
export function calculateEvaluationFormTotals(items: KpiEvaluationItem[]): {
  totalStandardScore: number;
  totalSelfScore: number;
  totalEvaluatorScore: number;
  totalPlusScore: number;
  totalMinusScore: number;
  totalKpiScore: number;
  selfTotalMinus: number;
  selfTotalPlus: number;
  evaluatorTotalMinus: number;
  evaluatorTotalPlus: number;
} {
  let totalStandard = 0;
  let totalSelf = 0;
  let totalEvaluator = 0;
  let totalPlus = 0;
  let totalMinus = 0;
  let selfTotalMinus = 0;
  let selfTotalPlus = 0;
  let evaluatorTotalMinus = 0;
  let evaluatorTotalPlus = 0;

  for (const item of items) {
    const std = Number(item.base_score ?? item.standardScore) || 0;
    
    // Tự đánh giá
    const sPlus = Math.max(0, Number(item.self_plus_score ?? item.selfPlusScore) || 0);
    const sMinus = Math.max(0, Number(item.self_minus_score ?? item.selfMinusScore) || 0);
    const sScore = Math.max(0, std - sMinus + sPlus);
    selfTotalMinus += sMinus;
    selfTotalPlus += sPlus;
    totalSelf += sScore;

    // Người đánh giá
    const ePlus = Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore) || 0);
    const eMinus = Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore) || 0);
    const eScore = Math.max(0, std - eMinus + ePlus);
    evaluatorTotalMinus += eMinus;
    evaluatorTotalPlus += ePlus;
    totalEvaluator += eScore;

    // Chính thức (Ưu tiên điểm của Người đánh giá, nếu chưa đánh giá thì dùng điểm tự ĐG / chuẩn)
    const activePlus = Math.max(0, Number(item.evaluator_plus_score ?? item.evaluatorPlusScore ?? item.plusScore ?? item.self_plus_score ?? item.selfPlusScore) || 0);
    const activeMinus = Math.max(0, Number(item.evaluator_minus_score ?? item.evaluatorMinusScore ?? item.minusScore ?? item.self_minus_score ?? item.selfMinusScore) || 0);

    totalStandard += std;
    totalPlus += activePlus;
    totalMinus += activeMinus;
  }

  // Luôn đảm bảo tổng chuẩn = 100 nếu đầy đủ
  const totalKpi = Math.max(0, Math.round((totalEvaluator || (totalStandard - totalMinus + totalPlus)) * 100) / 100);

  return {
    totalStandardScore: totalStandard || 100,
    totalSelfScore: Math.round(totalSelf * 100) / 100,
    totalEvaluatorScore: Math.round(totalEvaluator * 100) / 100,
    totalPlusScore: Math.round(totalPlus * 100) / 100,
    totalMinusScore: Math.round(totalMinus * 100) / 100,
    totalKpiScore: totalKpi,
    selfTotalMinus: Math.round(selfTotalMinus * 100) / 100,
    selfTotalPlus: Math.round(selfTotalPlus * 100) / 100,
    evaluatorTotalMinus: Math.round(evaluatorTotalMinus * 100) / 100,
    evaluatorTotalPlus: Math.round(evaluatorTotalPlus * 100) / 100
  };
}

/**
 * Lọc danh sách CBGVNV phù hợp với đối tượng được chọn
 */
export function filterTeachersByTargetGroup(
  teachers: Teacher[],
  targetGroup: KpiTargetGroup
): Teacher[] {
  const norm = normalizeTargetGroup(targetGroup);
  return teachers.filter(t => resolveTeacherTargetGroup(t) === norm);
}

/**
 * Chuẩn hóa mã nhóm đối tượng từ mọi định dạng (kể cả dữ liệu cũ)
 */
export function normalizeTargetGroup(group?: string | null): KpiTargetGroup {
  if (!group) return 'GV';
  const g = group.toUpperCase().trim();
  if (
    g === 'CBQL' || 
    g === 'CNQL' || 
    g.includes('QUẢN LÝ') || 
    g.includes('HIỆU TRƯỞNG') || 
    g === 'BGH'
  ) {
    return 'CBQL';
  }
  if (
    g === 'TTCM_TPCM' || 
    g === 'TTCM' || 
    g === 'TPCM' || 
    g === 'TTCM_TPCM_TTVP' || 
    g.includes('TỔ TRƯỞNG') || 
    g.includes('TỔ PHÓ') ||
    g.includes('TTCM') ||
    g.includes('TPCM')
  ) {
    return 'TTCM_TPCM';
  }
  if (
    g === 'NV' || 
    g === 'NHAN_VIEN' || 
    g.includes('NHÂN VIÊN') || 
    g.includes('VĂN PHÒNG') ||
    g.includes('HÀNH CHÍNH')
  ) {
    return 'NV';
  }
  return 'GV';
}

/**
 * Tự động nhận diện nhóm đối tượng của giáo viên/nhân viên dựa trên chức vụ, vai trò và bộ môn
 * Tuân thủ quy định:
 * - Hiệu trưởng, Phó Hiệu trưởng -> CBQL
 * - Tổ trưởng chuyên môn, Tổ phó chuyên môn -> TTCM_TPCM (CHUNG 1 bộ KPI duy nhất)
 * - Nhân viên -> NV
 * - Giáo viên -> GV
 */
export function resolveTeacherTargetGroup(teacher?: Partial<Teacher> | null): KpiTargetGroup {
  if (!teacher) return 'GV';

  const pos = (teacher.position || '').toLowerCase().trim();
  const role = teacher.role;
  const sub = (teacher.subject || '').toLowerCase().trim();
  const deptName = (teacher.departmentName || '').toLowerCase().trim();
  const deptId = (teacher.departmentId || '').toLowerCase().trim();

  // 1. Cán bộ quản lý (CBQL): Hiệu trưởng, Phó Hiệu trưởng, Ban Giám hiệu
  if (
    role === 'BGH' ||
    pos.includes('hiệu trưởng') ||
    pos.includes('phó hiệu trưởng') ||
    pos.includes('bgh') ||
    pos.includes('quản lý') ||
    pos.includes('ban giám hiệu') ||
    pos.includes('cnql') ||
    pos.includes('cbql')
  ) {
    return 'CBQL';
  }

  // 2. Tổ trưởng CM, Tổ phó CM (TTCM_TPCM - MỘT BỘ KPI CHUNG)
  if (
    role === 'TTCM' ||
    pos.includes('tổ trưởng chuyên môn') ||
    pos.includes('tổ phó chuyên môn') ||
    pos.includes('tổ trưởng cm') ||
    pos.includes('tổ phó cm') ||
    pos.includes('ttcm') ||
    pos.includes('tpcm') ||
    pos.includes('tổ trưởng') ||
    pos.includes('tổ phó') ||
    pos.includes('ttvp') ||
    pos.includes('nhóm trưởng')
  ) {
    return 'TTCM_TPCM';
  }

  // 3. Nhân viên (NV): Kế toán, Văn thư, Y tế, Thiết bị, Thủ quỹ, Thư viện, Bảo vệ, Phục vụ, Văn phòng...
  if (
    pos.includes('nhân viên') ||
    pos.includes('kế toán') ||
    pos.includes('văn thư') ||
    pos.includes('thủ quỹ') ||
    pos.includes('y tế') ||
    pos.includes('thiết bị') ||
    pos.includes('thư viện') ||
    pos.includes('phục vụ') ||
    pos.includes('bảo vệ') ||
    pos.includes('hành chính') ||
    role === 'GIAO_VU' ||
    role === 'NHAN_SU' ||
    deptId === 'd_van_phong' ||
    deptName.includes('văn phòng') ||
    sub.includes('kế toán') ||
    sub.includes('văn thư') ||
    sub.includes('y tế') ||
    sub.includes('thư viện') ||
    sub.includes('thiết bị')
  ) {
    return 'NV';
  }

  // 4. Mặc định: Giáo viên (GV)
  return 'GV';
}

/**
 * Lấy thông tin nhóm đối tượng từ mã nhóm hoặc đối tượng bất kỳ
 */
export function getKpiTargetGroupInfo(group: AnyKpiTargetGroup | string): KpiTargetGroupInfo {
  const normKey = normalizeTargetGroup(group);
  return KPI_TARGET_GROUPS.find(g => g.key === normKey) || KPI_TARGET_GROUPS[2];
}

/**
 * Kiểm tra xem một tiêu chí KPI có áp dụng cho nhóm đối tượng cụ thể hay không.
 * Hỗ trợ:
 * - Chuỗi đối tượng hoặc Mảng đối tượng (targetAudiences)
 * - Tương thích ngược với các mã cũ (CNQL, TTCM_TPCM_TTVP, GIAO_VIEN, NHAN_VIEN)
 */
export function matchKpiToTargetGroup(
  kpiTargetAudience: string | string[] | undefined, 
  groupKey: AnyKpiTargetGroup | string
): boolean {
  if (!kpiTargetAudience) return true;
  const normGroup = normalizeTargetGroup(groupKey);

  // Trường hợp truyền mảng đối tượng
  if (Array.isArray(kpiTargetAudience)) {
    if (kpiTargetAudience.length === 0) return true;
    for (const aud of kpiTargetAudience) {
      if (typeof aud === 'string') {
        const audUpper = aud.toUpperCase().trim();
        if (audUpper === 'ALL' || audUpper.includes('TẤT CẢ') || normalizeTargetGroup(aud) === normGroup) {
          return true;
        }
      }
    }
    return false;
  }

  const target = kpiTargetAudience.toLowerCase().trim();
  if (
    target === '' ||
    target === 'tất cả' || 
    target === 'tất cả cbgvnv' || 
    target === 'all' || 
    target === 'cá nhân' ||
    target.includes('tất cả')
  ) {
    return true;
  }

  if (normGroup === 'CBQL') {
    return (
      target.includes('cbql') || 
      target.includes('cnql') || 
      target.includes('quản lý') || 
      target.includes('hiệu trưởng') ||
      target.includes('bgh')
    );
  }

  if (normGroup === 'TTCM_TPCM') {
    return (
      target.includes('ttcm') || 
      target.includes('tpcm') || 
      target.includes('ttvp') || 
      target.includes('tổ trưởng') || 
      target.includes('tổ phó') ||
      target.includes('chuyên môn')
    );
  }

  if (normGroup === 'GV') {
    return (
      target.includes('giáo viên') || 
      target.includes('gv') || 
      target.includes('chủ nhiệm') || 
      target.includes('gvcn')
    );
  }

  if (normGroup === 'NV') {
    return (
      target.includes('nhân viên') || 
      target.includes('nv') || 
      target.includes('văn phòng') || 
      target.includes('hành chính') ||
      target.includes('kế toán') ||
      target.includes('y tế') ||
      target.includes('thiết bị') ||
      target.includes('thư viện')
    );
  }

  return true;
}

/**
 * Kiểm tra tiêu chí KPI có áp dụng cho một giáo viên/nhân viên cụ thể không
 */
export function isKpiApplicableToTeacher(kpi: Partial<KpiItem>, teacher?: Partial<Teacher> | null): boolean {
  if (!teacher || kpi.status === 'inactive') return false;
  const teacherGroup = resolveTeacherTargetGroup(teacher);
  if (kpi.targetAudiences && kpi.targetAudiences.length > 0) {
    return matchKpiToTargetGroup(kpi.targetAudiences, teacherGroup);
  }
  return matchKpiToTargetGroup(kpi.targetAudience, teacherGroup);
}

/**
 * Danh sách các tiêu chí KPI công việc mẫu đặc thù cho 4 nhóm đối tượng
 */
export const DEFAULT_TASK_KPIS: Array<{
  id: string;
  code: string;
  name: string;
  group: string;
  groupId: string;
  targetAudience: string;
  targetGroup: KpiTargetGroup;
  pointType: 'plus' | 'minus';
  pointValue: number;
  standardScore: number;
  description: string;
  deductionName: string;
  deductionScore: number;
}> = [
  // 1. DÀNH CHO CBQL
  {
    id: 'kpi_task_cnql_01',
    code: 'CBQL.CV01',
    name: 'Chỉ đạo và phân công công việc theo kế hoạch',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'CBQL',
    targetGroup: 'CBQL',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Chỉ đạo, ban hành và giao việc cho các tổ/bộ phận đúng kế hoạch, rõ ràng',
    deductionName: 'Chậm trễ trong chỉ đạo, phân công công việc',
    deductionScore: 2
  },
  {
    id: 'kpi_task_cnql_02',
    code: 'CBQL.CV02',
    name: 'Kiểm tra, đôn đốc và đánh giá tiến độ công việc',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'CBQL',
    targetGroup: 'CBQL',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Thường xuyên đôn đốc, kiểm tra kết quả công việc, xử lý vướng mắc kịp thời',
    deductionName: 'Thiếu kiểm tra, giám sát tiến độ thực hiện nhiệm vụ',
    deductionScore: 2
  },
  {
    id: 'kpi_task_cnql_03',
    code: 'CBQL.CV03',
    name: 'Báo cáo công tác quản lý điều hành cấp trên đúng hạn',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'CBQL',
    targetGroup: 'CBQL',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Tổng hợp báo cáo số liệu và tiến độ theo yêu cầu của Sở/Bộ GD đúng hạn',
    deductionName: 'Chậm trễ hoặc sai sót báo cáo cấp trên',
    deductionScore: 2
  },
  {
    id: 'kpi_task_cnql_04',
    code: 'CBQL.CV04',
    name: 'Quản lý hồ sơ pháp lý, tài chính, tài sản nhà trường',
    group: 'Thực hiện nhiệm vụ khác',
    groupId: 'kpig_kh',
    targetAudience: 'CBQL',
    targetGroup: 'CBQL',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Đảm bảo tính pháp lý, minh bạch và an toàn tài sản trường học',
    deductionName: 'Sai sót hoặc chậm trễ thủ tục hồ sơ, tài sản',
    deductionScore: 2
  },

  // 2. DÀNH CHO TTCM/TPCM (DÙNG CHUNG 1 BỘ KPI DUY NHẤT)
  {
    id: 'kpi_task_ttcm_01',
    code: 'TTCM.CV01',
    name: 'Xây dựng và triển khai kế hoạch hoạt động của tổ',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'TTCM_TPCM',
    targetGroup: 'TTCM_TPCM',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Xây dựng kế hoạch tháng/tuần của tổ, duyệt giáo án và phân công tổ viên',
    deductionName: 'Chậm nộp hoặc không xây dựng kế hoạch tổ đúng hạn',
    deductionScore: 2
  },
  {
    id: 'kpi_task_ttcm_02',
    code: 'TTCM.CV02',
    name: 'Kiểm tra, đôn đốc nộp hồ sơ, giáo án và công việc của tổ viên',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'TTCM_TPCM',
    targetGroup: 'TTCM_TPCM',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Đôn đốc tổ viên nộp bài kiểm tra, điểm số, giáo án, báo cáo đúng hạn',
    deductionName: 'Không đôn đốc để tổ viên nộp chậm hồ sơ, giáo án',
    deductionScore: 2
  },
  {
    id: 'kpi_task_ttcm_03',
    code: 'TTCM.CV03',
    name: 'Tổ chức sinh hoạt chuyên môn, hội thảo theo kế hoạch',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'TTCM_TPCM',
    targetGroup: 'TTCM_TPCM',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Tổ chức sinh hoạt chuyên môn, dự giờ, thao giảng định kỳ đúng lịch',
    deductionName: 'Bỏ hoặc hoãn sinh hoạt tổ không có lý do chính đáng',
    deductionScore: 2
  },
  {
    id: 'kpi_task_ttcm_04',
    code: 'TTCM.CV04',
    name: 'Nộp báo cáo chuyên môn/văn phòng định kỳ đúng thời hạn',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'TTCM_TPCM',
    targetGroup: 'TTCM_TPCM',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Tổng kết đánh giá, nộp báo cáo hoạt động tổ cho Ban Giám hiệu đúng hạn',
    deductionName: 'Nộp báo cáo tổ chậm muộn',
    deductionScore: 2
  },

  // 3. DÀNH CHO GIÁO VIÊN
  {
    id: 'kpi_task_gv_01',
    code: 'GV.CV01',
    name: 'Thực hiện giảng dạy đúng giờ, đủ tiết, đúng tiến độ',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'GV',
    targetGroup: 'GV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Lên lớp đúng giờ, không bỏ tiết, dạy đúng tiến độ chương trình',
    deductionName: 'Vào lớp muộn hoặc ra sớm / chậm tiến độ tiết dạy',
    deductionScore: 2
  },
  {
    id: 'kpi_task_gv_02',
    code: 'GV.CV02',
    name: 'Đánh giá học sinh, chấm bài, cập nhật điểm số đúng hạn',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'GV',
    targetGroup: 'GV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Chấm trả bài kiểm tra, vào điểm trên phần mềm quản lý đúng hạn quy định',
    deductionName: 'Cập nhật điểm hoặc nộp kết quả kiểm tra muộn',
    deductionScore: 2
  },
  {
    id: 'kpi_task_gv_03',
    code: 'GV.CV03',
    name: 'Hoàn thành hồ sơ giáo án, sổ sách chuyên môn đúng thời hạn',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'GV',
    targetGroup: 'GV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Chuẩn bị bài dạy đầy đủ, nộp giáo án kiểm tra đúng lịch quy định',
    deductionName: 'Nộp giáo án, sổ sách chuyên môn muộn hoặc thiếu',
    deductionScore: 2
  },
  {
    id: 'kpi_task_gv_04',
    code: 'GV.CV04',
    name: 'Thực hiện phân công coi thi, chấm thi, bồi dưỡng học sinh',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'GV',
    targetGroup: 'GV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Tham gia đầy đủ, đúng giờ các đợt coi thi, chấm thi, phụ đạo học sinh',
    deductionName: 'Đi muộn hoặc vắng mặt trong buổi coi thi/chấm thi',
    deductionScore: 3
  },
  {
    id: 'kpi_task_gv_05',
    code: 'GV.CV05',
    name: 'Báo cáo kết quả thực hiện công việc được giao đúng hạn',
    group: 'Thực hiện nhiệm vụ khác',
    groupId: 'kpig_kh',
    targetAudience: 'GV',
    targetGroup: 'GV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Hoàn thành và báo cáo công việc đột xuất hoặc phân công từ BGH/Tổ trưởng',
    deductionName: 'Chậm trễ trong báo cáo kết quả công việc',
    deductionScore: 1
  },

  // 4. DÀNH CHO NHÂN VIÊN
  {
    id: 'kpi_task_nv_01',
    code: 'NV.CV01',
    name: 'Hoàn thành nghiệp vụ chuyên môn văn phòng/kế toán/y tế/thiết bị',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'NV',
    targetGroup: 'NV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Thực hiện các công việc chuyên môn kế toán, văn thư, thủ quỹ, thiết bị, y tế đúng hạn',
    deductionName: 'Chậm tiến độ xử lý nghiệp vụ chuyên môn',
    deductionScore: 2
  },
  {
    id: 'kpi_task_nv_02',
    code: 'NV.CV02',
    name: 'Lập và nộp báo cáo số liệu, chứng từ đúng hạn quy định',
    group: 'Thực hiện nhiệm vụ chuyên môn',
    groupId: 'kpig_cm',
    targetAudience: 'NV',
    targetGroup: 'NV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Nộp báo cáo tài chính, báo cáo thống kê, sổ sách lưu trữ đúng thời hạn',
    deductionName: 'Nộp báo cáo số liệu hoặc chứng từ chậm muộn',
    deductionScore: 2
  },
  {
    id: 'kpi_task_nv_03',
    code: 'NV.CV03',
    name: 'Quản lý, bảo quản tài sản, hồ sơ, cơ sở vật chất an toàn',
    group: 'Thực hiện nhiệm vụ khác',
    groupId: 'kpig_kh',
    targetAudience: 'NV',
    targetGroup: 'NV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Sắp xếp, lưu trữ tài liệu ngăn nắp, bảo dưỡng trang thiết bị trường học',
    deductionName: 'Để thất lạc hồ sơ, hư hỏng thiết bị do thiếu trách nhiệm',
    deductionScore: 3
  },
  {
    id: 'kpi_task_nv_04',
    code: 'NV.CV04',
    name: 'Phục vụ, hỗ trợ kịp thời hoạt động dạy học và sự kiện',
    group: 'Thực hiện nhiệm vụ khác',
    groupId: 'kpig_kh',
    targetAudience: 'NV',
    targetGroup: 'NV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Chuẩn bị phòng họp, thiết bị thí nghiệm, y tế học đường, vệ sinh chu đáo',
    deductionName: 'Chuẩn bị chậm trễ ảnh hưởng hoạt động nhà trường',
    deductionScore: 2
  },
  {
    id: 'kpi_task_nv_05',
    code: 'NV.CV05',
    name: 'Chấp hành lịch trực cơ quan và phân công công tác đột xuất',
    group: 'Nền nếp, kỷ luật',
    groupId: 'kpig_nn',
    targetAudience: 'NV',
    targetGroup: 'NV',
    pointType: 'minus',
    pointValue: 10,
    standardScore: 10,
    description: 'Trực cơ quan đúng giờ, trực bảo vệ, hỗ trợ công việc đột xuất của nhà trường',
    deductionName: 'Vắng trực hoặc đi muộn buổi trực cơ quan',
    deductionScore: 2
  }
];

/**
 * Kiểm tra xem nhân sự có phải là Bí thư Đoàn trường hay không
 */
export function isTeacherYouthUnionLeader(teacher?: Partial<Teacher> | null): boolean {
  if (!teacher) return false;
  const pos = (teacher.position || '').toLowerCase().trim();
  const sub = (teacher.subject || '').toLowerCase().trim();
  return (
    pos.includes('bí thư') ||
    pos.includes('đoàn trường') ||
    pos.includes('đoàn thanh niên') ||
    pos.includes('btd') ||
    pos.includes('bt đoàn') ||
    sub.includes('bí thư đoàn')
  );
}

/**
 * Kiểm tra xem nhân sự có phải là thành viên Ban Giám Hiệu (CBQL) hay không
 */
export function isTeacherBgh(teacher?: Partial<Teacher> | null): boolean {
  if (!teacher) return false;
  const role = String(teacher.role || '').toUpperCase();
  const pos = (teacher.position || '').toLowerCase().trim();
  const name = (teacher.name || '').toLowerCase().trim();
  const title = ((teacher as any).title || '').toLowerCase().trim();
  const code = String(teacher.code || '').toUpperCase();
  return (
    role === 'BGH' ||
    role === 'ADMIN' ||
    role === 'CBQL' ||
    role === 'HIỆU TRƯỜNG' ||
    role === 'HIEU TRUONG' ||
    role === 'PHÓ HIỆU TRƯỜNG' ||
    role === 'PHO HIEU TRUONG' ||
    teacher.id === 'admin' ||
    teacher.id === 't_hieutruong' ||
    teacher.id === 't_phohieutruong_1' ||
    teacher.id === 't_phohieutruong_2' ||
    code.includes('BGH') ||
    code.includes('HT') ||
    pos.includes('hiệu trưởng') ||
    pos.includes('hieu truong') ||
    pos.includes('phó hiệu trưởng') ||
    pos.includes('pho hieu truong') ||
    pos.includes('ban giám hiệu') ||
    pos.includes('bgh') ||
    pos.includes('cbql') ||
    pos.includes('cnql') ||
    title.includes('hiệu trưởng') ||
    title.includes('phó hiệu trưởng')
  );
}

/**
 * Kiểm tra xem nhân sự có phải là Tổ trưởng Chuyên môn (TTCM) hay không
 */
export function isTeacherTtcm(teacher?: Partial<Teacher> | null, departments: Department[] = []): boolean {
  if (!teacher) return false;
  if (isExcludedCbqlEvaluator(teacher)) return false;
  if (isTeacherBgh(teacher)) return false;

  const name = String(teacher.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (name.includes('ha thuy linh')) {
    return false; // Hà Thùy Linh không phải TTCM
  }
  if (name.includes('nguyen trung kien')) {
    return true; // Nguyễn Trung Kiên là TTCM Tổ Hóa - Sinh - TD - QPAN
  }

  const role = String(teacher.role || '').trim();
  const pos = String(teacher.position || '').trim();
  const title = String((teacher as any).title || '').trim();
  const isDeptHead = departments.some(d => d.headId === teacher.id);
  
  const normRole = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normPos = pos.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  return (
    normRole.includes('ttcm') ||
    normRole.includes('to truong') ||
    normRole.includes('to_truong') ||
    normRole.includes('totruong') ||
    normRole.includes('truong to') ||
    normRole.includes('truong bo mon') ||
    normRole === 'tt' ||
    isDeptHead ||
    normPos.includes('to truong') ||
    normPos.includes('ttcm') ||
    normPos.includes('truong bo mon') ||
    normPos.includes('truong to') ||
    normPos.includes('to pho') ||
    normPos.includes('truong') ||
    normPos.includes('to') ||
    normTitle.includes('to truong') ||
    normTitle.includes('ttcm') ||
    Boolean((teacher as any).isTtcm) ||
    Boolean((teacher as any).is_ttcm)
  );
}

export interface EligibleEvaluatorsResult {
  evaluators: Teacher[];
  defaultEvaluatorId: string;
  defaultEvaluator: Teacher | null;
  explanation: string;
  ruleType: 'GV' | 'TTCM_TPCM' | 'DOAN' | 'CBQL' | 'NV';
}

export interface TtcmEvaluatorOption {
  id: string;
  name: string;
  code?: string;
  departmentId?: string;
  departmentName: string;
  position: string;
  displayLabel: string;
  teacher: Teacher;
}

export interface BghEvaluatorOption {
  id: string;
  name: string;
  code?: string;
  position: string;
  displayLabel: string;
  teacher: Teacher;
}

/**
 * Chuẩn hóa chuỗi tìm kiếm tổ bộ môn
 */
function normalizeDeptKeyword(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Lấy danh sách Tổ trưởng chuyên môn trong hệ thống
 * Chỉ lấy cán bộ có vai trò TTCM / Trưởng bộ môn / headId của Tổ
 * Tuyệt đối không lấy giáo viên bình thường
 */
export function getTtcmEvaluatorList(teachers: Teacher[], departments: Department[] = []): TtcmEvaluatorOption[] {
  const activeTeachers = teachers.filter(t => {
    const rawStatus = (t.status as string) || '';
    const isInactive = rawStatus === 'Đã nghỉ việc' || rawStatus === 'inactive' || rawStatus === 'Nghỉ việc';
    return !isInactive && !isExcludedCbqlEvaluator(t);
  });

  const ttcmList: TtcmEvaluatorOption[] = [];

  const addTtcmOption = (t: Teacher) => {
    let deptName = t.departmentName || '';
    if (!deptName && t.departmentId) {
      const foundDept = departments.find(d => d.id === t.departmentId);
      if (foundDept) deptName = foundDept.name;
    }
    if (!deptName) {
      const headDept = departments.find(d => d.headId === t.id);
      if (headDept) deptName = headDept.name;
    }
    if (!deptName && (t as any).department) {
      deptName = (t as any).department;
    }
    if (!deptName) {
      const pos = t.position || '';
      if (pos.toLowerCase().includes('tổ')) {
        const match = pos.match(/tổ\s+[^,-]+/i);
        if (match) deptName = match[0];
      }
    }
    if (!deptName) deptName = 'Tổ chuyên môn';

    const cleanDeptName = deptName.startsWith('Tổ ') ? deptName : `Tổ ${deptName}`;
    const displayLabel = `${t.name} — Tổ trưởng ${cleanDeptName}`;

    if (!ttcmList.some(item => item.id === t.id)) {
      ttcmList.push({
        id: t.id,
        name: t.name,
        code: t.code,
        departmentId: t.departmentId,
        departmentName: deptName,
        position: t.position || `Tổ trưởng ${cleanDeptName}`,
        displayLabel,
        teacher: t
      });
    }
  };

  activeTeachers.forEach(t => {
    if (isTeacherTtcm(t, departments)) {
      addTtcmOption(t);
    }
  });

  // Đảm bảo mỗi tổ/phòng ban (bao gồm Tổ Hóa - Sinh và các tổ khác) đều có ít nhất 1 đại diện TTCM/Tổ trưởng
  departments.forEach(dept => {
    const hasDeptRep = ttcmList.some(item => 
      item.departmentId === dept.id || 
      item.departmentName.toLowerCase().includes(dept.name.toLowerCase()) || 
      dept.name.toLowerCase().includes(item.departmentName.toLowerCase()) ||
      (dept.name.toLowerCase().includes('hóa') && item.departmentName.toLowerCase().includes('hóa')) ||
      (dept.name.toLowerCase().includes('sinh') && item.departmentName.toLowerCase().includes('sinh'))
    );

    if (!hasDeptRep) {
      let repTeacher = dept.headId ? activeTeachers.find(t => t.id === dept.headId) : null;
      if (!repTeacher) {
        repTeacher = activeTeachers.find(t => t.departmentId === dept.id && !isTeacherBgh(t));
      }
      if (!repTeacher) {
        const normDept = dept.name.toLowerCase();
        repTeacher = activeTeachers.find(t => {
          if (isTeacherBgh(t)) return false;
          const sub = (t.subject || '').toLowerCase();
          const deptStr = (t.departmentName || (t as any).department || '').toLowerCase();
          return (normDept.includes('hóa') && (deptStr.includes('hóa') || deptStr.includes('sinh') || sub.includes('hóa') || sub.includes('sinh'))) ||
                 (normDept.includes('sinh') && (deptStr.includes('hóa') || deptStr.includes('sinh') || sub.includes('hóa') || sub.includes('sinh'))) ||
                 (normDept.includes('toán') && (sub.includes('toán') || sub.includes('lý') || sub.includes('tin'))) ||
                 (normDept.includes('văn') && (sub.includes('văn') || sub.includes('sử') || sub.includes('địa')));
        });
      }
      // Nếu vẫn không tìm thấy, lấy giáo viên đầu tiên thuộc tổ hoặc bất kỳ giáo viên nào chưa được phân công
      if (!repTeacher && activeTeachers.length > 0) {
        repTeacher = activeTeachers.find(t => !isTeacherBgh(t) && !ttcmList.some(item => item.id === t.id));
      }

      if (repTeacher) {
        addTtcmOption(repTeacher);
      }
    }
  });

  return ttcmList;
}

/**
 * Lấy danh sách Ban Giám hiệu trong hệ thống
 */
export function getBghEvaluatorList(teachers: Teacher[]): BghEvaluatorOption[] {
  const activeTeachers = teachers.filter(t => {
    const rawStatus = (t.status as string) || '';
    const isInactive = rawStatus === 'Đã nghỉ việc' || rawStatus === 'inactive' || rawStatus === 'Nghỉ việc';
    return !isInactive && !isExcludedCbqlEvaluator(t);
  });

  const bghList: BghEvaluatorOption[] = [];

  activeTeachers.forEach(t => {
    if (isTeacherBgh(t)) {
      const pos = t.position || 'Ban Giám hiệu';
      const displayLabel = `${t.name} — ${pos}`;
      if (!bghList.some(item => item.id === t.id)) {
        bghList.push({
          id: t.id,
          name: t.name,
          code: t.code,
          position: pos,
          displayLabel,
          teacher: t
        });
      }
    }
  });

  return bghList;
}

/**
 * Tìm Tổ trưởng chuyên môn cho một tổ cụ thể
 * Hỗ trợ tìm kiếm thông minh đa cấp:
 * 1. headId trong cấu hình departments (Ưu tiên ID chính xác)
 * 2. Nhân sự có role/position TTCM trong cùng departmentId
 * 3. Khớp tên tổ / từ khóa tổ (Toán - Tin, Hóa - Sinh, Văn - Sử, Ngoại ngữ, Văn phòng...)
 */
export function findTtcmForDepartment(
  deptId: string,
  teachers: Teacher[],
  departments: Department[] = []
): Teacher | null {
  if (!deptId) return null;

  // 1. Tìm department object
  const dept = departments.find(d => d.id === deptId || d.name === deptId);

  // 1.1 Kiểm tra headId của department (Ưu tiên số 1 theo ID người dùng)
  if (dept && dept.headId) {
    const head = teachers.find(t => t.id === dept.headId && !isExcludedCbqlEvaluator(t));
    if (head) return head;
  }

  // 2. Tìm nhân sự là TTCM trong cùng departmentId (Khớp ID phòng ban và vai trò TTCM)
  const ttcmInDept = teachers.find(t => {
    if (isExcludedCbqlEvaluator(t)) return false;
    const isSameDeptId = t.departmentId === deptId || (dept && t.departmentId === dept.id);
    return isSameDeptId && isTeacherTtcm(t, departments);
  });
  if (ttcmInDept) return ttcmInDept;

  // 3. Khớp theo departmentName hoặc department string
  const targetDeptName = dept?.name || deptId;
  const normTarget = normalizeDeptKeyword(targetDeptName);

  if (normTarget) {
    const ttcmByName = teachers.find(t => {
      if (isExcludedCbqlEvaluator(t)) return false;
      const tDeptName = t.departmentName || (t as any).department || '';
      const normTDept = normalizeDeptKeyword(tDeptName);
      const isMatch = normTDept && (normTDept.includes(normTarget) || normTarget.includes(normTDept));
      return isMatch && isTeacherTtcm(t, departments);
    });
    if (ttcmByName) return ttcmByName;

    // 4. Khớp theo từ khóa đặc trưng của 05 tổ chuyên môn chính thức
    const keywords = [
      { key: 'toan_cong_nghe', match: ['toan', 'cong nghe', 'congnghe', 'cn'] },
      { key: 'van_su_dia_gdkt', match: ['van', 'su', 'dia', 'gdkt', 'nguvan', 'lichsu', 'diali'] },
      { key: 'ly_hoa_sinh', match: ['ly', 'vatli', 'vatly', 'hoa', 'sinh'] },
      { key: 'ngoai_ngu_tin_hoc_gdtc_gdqpan', match: ['ngoaingu', 'tienganh', 'tin', 'tinhoc', 'gdtc', 'theduc', 'gdqp', 'qpan'] },
      { key: 'van_phong', match: ['vanphong', 'hanhchinh', 'ketoan', 'yte', 'thuvien', 'thietbi', 'thuquy', 'vanthu'] }
    ];

    for (const group of keywords) {
      const targetHasKeyword = group.match.some(m => normTarget.includes(m));
      if (targetHasKeyword) {
        const found = teachers.find(t => {
          if (isExcludedCbqlEvaluator(t)) return false;
          if (!isTeacherTtcm(t, departments)) return false;
          const tDept = normalizeDeptKeyword(t.departmentName || (t as any).department || t.position || '');
          return group.match.some(m => tDept.includes(m));
        });
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Lấy danh sách chọn Tổ trưởng chuyên môn cho từng tổ chuyên môn cụ thể
 * Chỉ hiển thị cán bộ đang có vai trò / chức vụ Tổ trưởng chuyên môn thuộc tổ
 */
export function getDepartmentTtcmDropdownOptions(
  deptId: string,
  teachers: Teacher[],
  departments: Department[] = []
): TtcmEvaluatorOption[] {
  const activeTeachers = teachers.filter(t => {
    const rawStatus = (t.status as string) || '';
    const isInactive = rawStatus === 'Đã nghỉ việc' || rawStatus === 'inactive' || rawStatus === 'Nghỉ việc';
    return !isInactive && !isExcludedCbqlEvaluator(t);
  });

  const dept = departments.find(d => d.id === deptId || d.name === deptId);
  const deptName = dept?.name || deptId || 'Tổ chuyên môn';
  const cleanDeptName = deptName.startsWith('Tổ ') ? deptName : `Tổ ${deptName}`;

  // 1. Tổ trưởng được xác định của tổ này
  const deptHead = findTtcmForDepartment(deptId, teachers, departments);

  const options: TtcmEvaluatorOption[] = [];

  if (deptHead) {
    options.push({
      id: deptHead.id,
      name: deptHead.name,
      code: deptHead.code,
      departmentId: deptHead.departmentId,
      departmentName: deptName,
      position: deptHead.position || `Tổ trưởng ${cleanDeptName}`,
      displayLabel: `${deptHead.name} — Tổ trưởng ${cleanDeptName}`,
      teacher: deptHead
    });
  }

  // 2. Các nhân sự khác trong tổ nếu có vai trò TTCM
  activeTeachers.forEach(t => {
    const inSameDept = (dept && t.departmentId === dept.id) || t.departmentId === deptId;
    if (inSameDept && isTeacherTtcm(t, departments) && (!deptHead || t.id !== deptHead.id)) {
      options.push({
        id: t.id,
        name: t.name,
        code: t.code,
        departmentId: t.departmentId,
        departmentName: deptName,
        position: t.position || `Tổ trưởng ${cleanDeptName}`,
        displayLabel: `${t.name} — Tổ trưởng ${cleanDeptName}`,
        teacher: t
      });
    }
  });

  // 3. Nếu tổ chưa xác định được TTCM, liệt kê các CBGVNV trong tổ để người quản lý lựa chọn
  if (options.length === 0) {
    activeTeachers.forEach(t => {
      const inSameDept = (dept && t.departmentId === dept.id) || t.departmentId === deptId;
      if (inSameDept && !isTeacherBgh(t)) {
        options.push({
          id: t.id,
          name: t.name,
          code: t.code,
          departmentId: t.departmentId,
          departmentName: deptName,
          position: t.position || t.role || 'Giáo viên',
          displayLabel: `${t.name} (${t.position || t.role || 'Giáo viên'})`,
          teacher: t
        });
      }
    });
  }

  return options;
}

/**
 * Kiểm tra xem một nhân sự có thuộc danh sách LOẠI TRỪ khỏi vai trò Cán bộ quản lý đánh giá (Thủ trưởng) hay không:
 * 1. Nguyễn Quang Sáng
 * 2. Phạm Kim Hùng
 * 3. Nguyễn Anh Hòa
 * 4. Trần Thị Thu Hiền
 */
export function isExcludedCbqlEvaluator(teacher?: Partial<Teacher> | any | null): boolean {
  if (!teacher) return false;
  const id = String(teacher.id || '').trim();
  if (id === 'd8sotdwua' || id === 't_ht' || id === 't_pht1' || id === 't_pht2') return true;

  const rawName = String(teacher.name || '').trim().toLowerCase();
  const normalizedName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const email = String(teacher.email || '').trim().toLowerCase();
  const username = String(teacher.username || '').trim().toLowerCase();

  // 1. Nguyễn Quang Sáng
  if (
    rawName.includes('nguyễn quang sáng') ||
    normalizedName.includes('nguyen quang sang') ||
    rawName.includes('quang sáng') ||
    normalizedName.includes('quang sang') ||
    rawName.includes('ông sáng') ||
    rawName.includes('thầy sáng') ||
    email.includes('quangsang') ||
    username.includes('quangsang')
  ) {
    return true;
  }

  // 2. Phạm Kim Hùng
  if (
    rawName.includes('phạm kim hùng') ||
    normalizedName.includes('pham kim hung') ||
    rawName.includes('kim hùng') ||
    normalizedName.includes('kim hung') ||
    rawName.includes('ông hùng') ||
    rawName.includes('thầy hùng') ||
    email.includes('phamkimhung') ||
    email.includes('kimhung') ||
    email === 'phamkimhung1981@gmail.com' ||
    username.includes('phamkimhung') ||
    username.includes('kimhung')
  ) {
    return true;
  }

  // 3. Nguyễn Anh Hòa
  if (
    rawName.includes('nguyễn anh hòa') ||
    normalizedName.includes('nguyen anh hoa') ||
    rawName.includes('anh hòa') ||
    normalizedName.includes('anh hoa') ||
    rawName.includes('ông hòa') ||
    rawName.includes('thầy hòa') ||
    email.includes('anhhoa') ||
    username.includes('anhhoa')
  ) {
    return true;
  }

  // 4. Trần Thị Thu Hiền
  if (
    rawName.includes('trần thị thu hiền') || 
    normalizedName.includes('tran thi thu hien') ||
    email.includes('thuhien') ||
    username.includes('thuhien')
  ) {
    return true;
  }

  return false;
}

/**
 * Lọc danh sách Người đánh giá hợp lệ theo đúng quy định chức vụ và phân quyền:
 * 1. GIÁO VIÊN: Chỉ được chọn Tổ trưởng chuyên môn (TTCM). Ưu tiên TTCM của tổ mình.
 * 2. TTCM / TPCM: Bắt buộc chọn Ban Giám hiệu (BGH).
 * 3. BÍ THƯ ĐOÀN: Bắt buộc chọn Ban Giám hiệu (BGH).
 * 4. CBQL (Hiệu trưởng, Phó Hiệu trưởng): Chọn BGH / Hội đồng quản lý.
 * 5. NHÂN VIÊN: Chọn Tổ trưởng Văn phòng hoặc BGH phụ trách.
 * - Chỉ lấy CBGVNV đang hoạt động (không lấy người đã nghỉ việc).
 * - Loại bỏ các nhân sự bị loại trừ khỏi danh sách CBQL đánh giá (Nguyễn Trung Kiên, Trần Thị Thu Hiền).
 * - Không cho phép chọn học sinh, giáo viên bình thường hoặc nhập tự do.
 */
export function getEligibleEvaluators(
  evaluatee: Partial<Teacher> | null | undefined,
  teachers: Teacher[],
  departments: Department[] = []
): EligibleEvaluatorsResult {
  // Chỉ lấy CBGVNV đang hoạt động (không lấy người đã nghỉ việc/khóa) và KHÔNG thuộc danh sách bị loại trừ
  const activeTeachers = teachers.filter(t => {
    const rawStatus = (t.status as string) || '';
    const isInactive = rawStatus === 'Đã nghỉ việc' || rawStatus === 'inactive' || rawStatus === 'Nghỉ việc';
    return !isInactive && !isExcludedCbqlEvaluator(t);
  });

  if (!evaluatee) {
    // Nếu chưa chọn evaluatee, trả về danh sách TTCM và BGH
    const defaultList = activeTeachers.filter(t => isTeacherTtcm(t, departments) || isTeacherBgh(t));
    return {
      evaluators: defaultList.length > 0 ? defaultList : activeTeachers,
      defaultEvaluatorId: defaultList[0]?.id || '',
      defaultEvaluator: defaultList[0] || null,
      explanation: 'Vui lòng chọn Cán bộ / Giáo viên / Nhân viên để lọc danh sách Người đánh giá theo quy định.',
      ruleType: 'GV'
    };
  }

  // 1. Trường hợp: BÍ THƯ ĐOÀN TRƯỜNG -> Người đánh giá là BAN GIÁM HIỆU
  if (isTeacherYouthUnionLeader(evaluatee)) {
    const bghList = activeTeachers.filter(t => isTeacherBgh(t) && t.id !== evaluatee.id);
    const defaultEvaluator = bghList[0] || activeTeachers.find(t => isTeacherBgh(t)) || null;
    return {
      evaluators: bghList.length > 0 ? bghList : activeTeachers.filter(isTeacherBgh),
      defaultEvaluatorId: defaultEvaluator?.id || '',
      defaultEvaluator,
      explanation: 'Bí thư Đoàn trường được phân công đánh giá bởi Ban Giám hiệu (Hiệu trưởng / Phó Hiệu trưởng).',
      ruleType: 'DOAN'
    };
  }

  const targetGroup = resolveTeacherTargetGroup(evaluatee);

  // 2. Trường hợp: TTCM / TPCM -> Người đánh giá là BAN GIÁM HIỆU
  if (targetGroup === 'TTCM_TPCM') {
    const bghList = activeTeachers.filter(t => isTeacherBgh(t) && t.id !== evaluatee.id);
    const defaultEvaluator = bghList[0] || activeTeachers.find(t => isTeacherBgh(t)) || null;
    return {
      evaluators: bghList.length > 0 ? bghList : activeTeachers.filter(isTeacherBgh),
      defaultEvaluatorId: defaultEvaluator?.id || '',
      defaultEvaluator,
      explanation: 'Tổ trưởng và Tổ phó Chuyên môn được đánh giá bởi Ban Giám hiệu (Hiệu trưởng / Phó Hiệu trưởng).',
      ruleType: 'TTCM_TPCM'
    };
  }

  // 3. Trường hợp: CBQL (Hiệu trưởng, Phó Hiệu trưởng) -> Đánh giá bởi BGH / Quản lý
  if (targetGroup === 'CBQL') {
    const otherBgh = activeTeachers.filter(t => isTeacherBgh(t) && t.id !== evaluatee.id);
    const evaluators = otherBgh.length > 0 ? otherBgh : activeTeachers.filter(isTeacherBgh);
    const defaultEvaluator = evaluators[0] || null;
    return {
      evaluators,
      defaultEvaluatorId: defaultEvaluator?.id || '',
      defaultEvaluator,
      explanation: 'Cán bộ Quản lý (Hiệu trưởng, Phó Hiệu trưởng) được đánh giá bởi Ban Giám hiệu / Hội đồng trường.',
      ruleType: 'CBQL'
    };
  }

  // 4. Trường hợp: NHÂN VIÊN (Văn phòng, Kế toán, Y tế, Thư viện, Thiết bị...)
  if (targetGroup === 'NV') {
    // Ưu tiên: Tổ trưởng tổ Văn phòng hoặc BGH phụ trách khối hành chính
    const vanPhongDept = departments.find(d => 
      d.id === 'd_van_phong' || 
      d.name.toLowerCase().includes('văn phòng') || 
      d.name.toLowerCase().includes('hành chính')
    );
    
    // Tìm tổ trưởng văn phòng
    const ttvpList = activeTeachers.filter(t => 
      t.id !== evaluatee.id && (
        (vanPhongDept && t.departmentId === vanPhongDept.id && (isTeacherTtcm(t, departments) || t.role === 'TTCM')) ||
        (t.departmentId === evaluatee.departmentId && isTeacherTtcm(t, departments)) ||
        (t.position || '').toLowerCase().includes('tổ trưởng') && (t.departmentId === 'd_van_phong' || (t.departmentName || '').toLowerCase().includes('văn phòng'))
      )
    );

    // Thành viên BGH
    const bghList = activeTeachers.filter(isTeacherBgh);

    // Ghép danh sách: TTVP trước, tiếp theo là BGH
    const nvEvaluators: Teacher[] = [];
    ttvpList.forEach(t => {
      if (!nvEvaluators.some(x => x.id === t.id)) nvEvaluators.push(t);
    });
    bghList.forEach(t => {
      if (!nvEvaluators.some(x => x.id === t.id)) nvEvaluators.push(t);
    });

    const defaultEvaluator = nvEvaluators[0] || bghList[0] || null;

    return {
      evaluators: nvEvaluators.length > 0 ? nvEvaluators : bghList,
      defaultEvaluatorId: defaultEvaluator?.id || '',
      defaultEvaluator,
      explanation: 'Nhân viên hành chính - văn phòng do Tổ trưởng Văn phòng hoặc Ban Giám hiệu phụ trách đánh giá.',
      ruleType: 'NV'
    };
  }

  // 5. Trường hợp mặc định: GIÁO VIÊN (GV)
  // Danh sách Cán bộ Quản lý đánh giá gồm:
  // - Tổ trưởng / Tổ phó Chuyên môn của tổ mình (TTCM/TPCM)
  // - Ban Giám hiệu (Hiệu trưởng, Phó Hiệu trưởng)
  // - Các Tổ trưởng Chuyên môn khác
  const bghList = activeTeachers.filter(t => t.id !== evaluatee.id && isTeacherBgh(t));

  const allTtcm = activeTeachers.filter(t => 
    t.id !== evaluatee.id && 
    isTeacherTtcm(t, departments)
  );

  // Tìm TTCM của chính tổ mà giáo viên đang công tác
  const myDept = departments.find(d => d.id === evaluatee.departmentId);
  const myDeptTtcm = allTtcm.filter(t => 
    (evaluatee.departmentId && t.departmentId === evaluatee.departmentId) ||
    (myDept && myDept.headId === t.id)
  );

  // Các TTCM tổ khác
  const otherTtcm = allTtcm.filter(t => !myDeptTtcm.some(m => m.id === t.id) && !bghList.some(b => b.id === t.id));

  // Sắp xếp thứ tự ưu tiên hiển thị:
  // 1. TTCM tổ trực thuộc (ưu tiên mặc định)
  // 2. Ban Giám hiệu (Hiệu trưởng, Phó Hiệu trưởng)
  // 3. Các TTCM khác
  const sortedEvaluators: Teacher[] = [];

  myDeptTtcm.forEach(t => {
    if (!sortedEvaluators.some(x => x.id === t.id)) sortedEvaluators.push(t);
  });

  bghList.forEach(t => {
    if (!sortedEvaluators.some(x => x.id === t.id)) sortedEvaluators.push(t);
  });

  otherTtcm.forEach(t => {
    if (!sortedEvaluators.some(x => x.id === t.id)) sortedEvaluators.push(t);
  });

  const finalEvaluators = sortedEvaluators.length > 0 ? sortedEvaluators : activeTeachers;
  const defaultEvaluator = myDeptTtcm[0] || bghList[0] || finalEvaluators[0] || null;

  return {
    evaluators: finalEvaluators,
    defaultEvaluatorId: defaultEvaluator?.id || '',
    defaultEvaluator,
    explanation: myDeptTtcm.length > 0
      ? `Giáo viên có thể chọn Tổ trưởng Chuyên môn (${myDept?.name || 'Tổ chuyên môn'}) hoặc Ban Giám hiệu (Hiệu trưởng, Phó Hiệu trưởng) thực hiện đánh giá.`
      : 'Giáo viên có thể chọn Tổ trưởng Chuyên môn hoặc Ban Giám hiệu (Hiệu trưởng, Phó Hiệu trưởng) thực hiện đánh giá.',
    ruleType: 'GV'
  };
}

/**
 * Trả về badge cấu hình và tên hiển thị cho trạng thái Phiếu KPI
 */
export function getKpiFormStatusInfo(status?: string): {
  label: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
} {
  const norm = (status || '').toLowerCase().trim();

  switch (norm) {
    case 'draft':
      return {
        label: 'Bản nháp',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
        dotColor: 'bg-amber-500'
      };
    case 'self_assessing':
      return {
        label: 'Đang tự đánh giá',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
        bgClass: 'bg-sky-50',
        textClass: 'text-sky-700',
        borderClass: 'border-sky-200',
        dotColor: 'bg-sky-500'
      };
    case 'self_assessed':
      return {
        label: 'Đã hoàn thành tự ĐG',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
        dotColor: 'bg-amber-500'
      };
    case 'pending_evaluator':
    case 'pending_evaluation':
    case 'submitted':
    case 'pending':
      return {
        label: 'Chờ người đánh giá',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
        dotColor: 'bg-blue-500'
      };
    case 'evaluating':
      return {
        label: 'Đang đánh giá',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        bgClass: 'bg-indigo-50',
        textClass: 'text-indigo-700',
        borderClass: 'border-indigo-200',
        dotColor: 'bg-indigo-500'
      };
    case 'confirmed':
    case 'evaluated':
      return {
        label: 'Đã đánh giá',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-200',
        dotColor: 'bg-emerald-500'
      };
    case 'locked':
      return {
        label: 'Đã khóa',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        bgClass: 'bg-slate-50',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-200',
        dotColor: 'bg-slate-500'
      };
    case 'rejected':
      return {
        label: 'Yêu cầu xem lại',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
        bgClass: 'bg-rose-50',
        textClass: 'text-rose-700',
        borderClass: 'border-rose-200',
        dotColor: 'bg-rose-500'
      };
    default:
      return {
        label: 'Chờ đánh giá',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        bgClass: 'bg-slate-50',
        textClass: 'text-slate-600',
        borderClass: 'border-slate-200',
        dotColor: 'bg-slate-400'
      };
  }
}
