import * as XLSX from 'xlsx';
import { KpiCbqlForm, KpiCbqlPeriod } from '../types/kpiCbql';

/**
 * XUẤT PHIẾU ĐÁNH GIÁ CHI TIẾT RA FILE EXCEL
 */
export function exportSingleCbqlFormToExcel(form: KpiCbqlForm) {
  const wsData: any[][] = [];

  // Header cơ quan
  wsData.push(['SỞ GD&ĐT LÀO CAI', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  wsData.push(['TRƯỜNG THPT MINH HÒA', '', '', 'Độc lập - Tự do - Hạnh phúc']);
  wsData.push(['', '', '', '------------------------']);
  wsData.push(['']);
  wsData.push(['PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ (KPI) CỦA CÁN BỘ QUẢN LÝ']);
  wsData.push([`Kỳ đánh giá: ${form.periodName} (Năm học: ${form.academicYear})`]);
  wsData.push(['']);

  // Thông tin cán bộ
  wsData.push(['Họ và tên người được đánh giá:', form.evaluateeName, 'Chức vụ:', form.evaluateePosition]);
  wsData.push(['Đơn vị công tác:', form.evaluateeDepartmentName || 'Ban Giám hiệu', 'Mã định danh:', form.evaluateeCode || 'N/A']);
  wsData.push(['Người đánh giá (Thủ trưởng):', form.evaluatorName, 'Chức vụ người ĐG:', form.evaluatorPosition]);
  wsData.push(['Trạng thái phiếu:', form.status === 'locked' ? 'Đã chốt kết quả' : form.status === 'evaluated' ? 'Đã đánh giá' : form.status === 'pending_evaluation' ? 'Chờ đánh giá' : 'Bản nháp']);
  wsData.push(['']);

  // Tiêu đề bảng điểm
  wsData.push([
    'Mã TC',
    'Nội dung tiêu chí đánh giá',
    'Điểm tối đa',
    'Điểm tự chấm',
    'Mức tự chấm',
    'Minh chứng đã nộp',
    'Điểm thủ trưởng chấm',
    'Mức thủ trưởng chấm',
    'Nhận xét của thủ trưởng'
  ]);

  // Phân chia theo nhóm
  let currentGroup = '';
  form.items.forEach(item => {
    if (item.groupCode !== currentGroup) {
      currentGroup = item.groupCode;
      const groupName = currentGroup === 'I' 
        ? 'I. CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG (15 điểm)'
        : currentGroup === 'II'
        ? 'II. TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT (15 điểm)'
        : 'III. KẾT QUẢ THỰC HIỆN NHIỆM VỤ (70 điểm)';
      wsData.push(['', groupName, '', '', '', '', '', '', '']);
    }

    if (item.subCategoryTitle && item.criterionCode.endsWith('.1')) {
      wsData.push(['', item.subCategoryTitle, '', '', '', '', '', '', '']);
    }

    wsData.push([
      item.criterionCode,
      item.criterionName,
      item.maxScore,
      item.selfScore,
      item.selfLevelLabel || '',
      item.selfEvidence || '',
      item.evaluatorScore,
      item.evaluatorLevelLabel || '',
      item.evaluatorNote || ''
    ]);
  });

  // Tổng kết các nhóm
  wsData.push(['']);
  wsData.push(['TỔNG KẾT ĐIỂM THEO NHÓM TIÊU CHÍ']);
  wsData.push(['Nhóm I (Chính trị tư tưởng, đạo đức):', '', '15.0', form.selfGroupScores?.group_I || 0, '', '', form.evaluatorGroupScores?.group_I || 0]);
  wsData.push(['Nhóm II (Tác phong, lề lối làm việc):', '', '15.0', form.selfGroupScores?.group_II || 0, '', '', form.evaluatorGroupScores?.group_II || 0]);
  wsData.push(['Nhóm III (Kết quả thực hiện nhiệm vụ):', '', '70.0', form.selfGroupScores?.group_III || 0, '', '', form.evaluatorGroupScores?.group_III || 0]);
  wsData.push(['TỔNG ĐIỂM TOÀN PHIẾU:', '', '100.0', form.selfTotalScore, '', '', form.evaluatorTotalScore]);
  wsData.push(['Chênh lệch điểm (Đánh giá - Tự chấm):', '', '', form.scoreDifference > 0 ? `+${form.scoreDifference}` : form.scoreDifference]);
  wsData.push(['Xếp loại chất lượng:', '', '', form.grade || 'Chưa xếp loại']);
  wsData.push(['']);

  // Ý kiến nhận xét
  wsData.push(['TỰ NHẬN XÉT CỦA CÁN BỘ QUẢN LÝ:']);
  wsData.push([form.selfComment || '(Không có)']);
  wsData.push(['']);
  wsData.push(['Ý KIẾN ĐÁNH GIÁ, NHẬN XÉT CỦA THỦ TRƯỞNG / CẤP TRÊN:']);
  wsData.push([form.evaluatorComment || '(Không có)']);
  wsData.push(['']);
  wsData.push(['', '', '', 'Minh Hòa, ngày ..... tháng ..... năm 202...']);
  wsData.push(['NGƯỜI TỰ ĐÁNH GIÁ', '', '', 'THỦ TRƯỞNG ĐƠN VỊ ĐÁNH GIÁ']);
  wsData.push(['(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên và đóng dấu)']);
  wsData.push(['']);
  wsData.push(['']);
  wsData.push([form.evaluateeName, '', '', form.evaluatorName]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 10 },
    { wch: 45 },
    { wch: 12 },
    { wch: 14 },
    { wch: 22 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Phieu_KPI_CBQL');
  const filename = `KPI_CBQL_${form.evaluateeName.replace(/\s+/g, '_')}_${form.periodName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * XUẤT DANH SÁCH TỔNG HỢP KPI CBQL THEO KỲ RA FILE EXCEL
 */
export function exportCbqlSummaryListToExcel(forms: KpiCbqlForm[], periodName: string, academicYear: string) {
  const data: any[] = forms.map((f, idx) => ({
    'STT': idx + 1,
    'Mã CBQL': f.evaluateeCode || `CBQL_${idx + 1}`,
    'Họ và tên CBQL': f.evaluateeName,
    'Chức vụ': f.evaluateePosition,
    'Đơn vị': f.evaluateeDepartmentName || 'Ban Giám hiệu',
    'Kỳ đánh giá': f.periodName,
    'Năm học': f.academicYear,
    'Điểm tự chấm (Nhóm I /15)': f.selfGroupScores?.group_I || 0,
    'Điểm tự chấm (Nhóm II /15)': f.selfGroupScores?.group_II || 0,
    'Điểm tự chấm (Nhóm III /70)': f.selfGroupScores?.group_III || 0,
    'TỔNG ĐIỂM TỰ CHẤM (/100)': f.selfTotalScore || 0,
    'Điểm ĐG (Nhóm I /15)': f.evaluatorGroupScores?.group_I || 0,
    'Điểm ĐG (Nhóm II /15)': f.evaluatorGroupScores?.group_II || 0,
    'Điểm ĐG (Nhóm III /70)': f.evaluatorGroupScores?.group_III || 0,
    'TỔNG ĐIỂM ĐÁNH GIÁ (/100)': f.evaluatorTotalScore || 0,
    'Chênh lệch (+/-)': f.scoreDifference || 0,
    'Xếp loại': f.grade || 'Chưa xếp loại',
    'Trạng thái': f.status === 'locked' ? 'Đã chốt kết quả' : f.status === 'evaluated' ? 'Đã đánh giá' : f.status === 'pending_evaluation' ? 'Chờ đánh giá' : 'Bản nháp',
    'Người đánh giá': f.evaluatorName,
    'Chức vụ người ĐG': f.evaluatorPosition,
    'Ngày chốt': f.lockedAt ? new Date(f.lockedAt).toLocaleDateString('vi-VN') : ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tong_Hop_KPI_CBQL');
  const filename = `Tong_hop_KPI_CBQL_${periodName.replace(/\s+/g, '_')}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, filename);
}
