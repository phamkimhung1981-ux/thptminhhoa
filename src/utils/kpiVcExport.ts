import * as XLSX from 'xlsx';
import { KpiVcForm, KpiVcCriterion, KpiVcRatingConfig } from '../types/kpiVc';
import { resolveVcClassification, getEffectiveRatingConfig } from '../lib/kpiVcData';

/**
 * Xuất danh sách tổng hợp KPI Giáo viên ra file Excel
 */
export const exportVcSummaryToExcel = (
  forms: KpiVcForm[],
  periodName: string = 'Kỳ đánh giá',
  academicYear: string = '2026-2027',
  ratingConfigs?: KpiVcRatingConfig[]
) => {
  const data = forms.map((f, idx) => {
    const groupI = f.groupScores?.group_I ?? 0;
    const groupII = f.groupScores?.group_II ?? 0;
    const groupIII = f.groupScores?.group_III ?? 0;

    let statusText = 'Bản nháp';
    if (f.status === 'self_evaluated') statusText = 'Đang tự đánh giá';
    if (f.status === 'completed') statusText = 'Đã hoàn thành';
    if (f.status === 'locked') statusText = 'Đã khóa';

    // Xếp loại cá nhân động
    const effectiveCfg = getEffectiveRatingConfig(f.periodId, ratingConfigs);
    let selfRating = f.selfClassification;
    if (!effectiveCfg.isLockedWhenPeriodCompleted || (f.status !== 'locked' && f.status !== 'completed')) {
      selfRating = resolveVcClassification(f.totalScore, f.periodId, ratingConfigs);
    }

    // Xếp loại lãnh đạo / chính thức động
    const finalScore = (f.managerTotalScore !== null && f.managerTotalScore !== undefined) ? f.managerTotalScore : f.totalScore;
    let finalRating = f.leaderClassification || selfRating;
    if (!effectiveCfg.isLockedWhenPeriodCompleted || (f.status !== 'locked' && f.status !== 'completed')) {
      finalRating = resolveVcClassification(finalScore, f.periodId, ratingConfigs);
    }

    return {
      'STT': idx + 1,
      'Họ và tên': f.employeeName,
      'Mã cán bộ': f.employeeCode || '',
      'Chức vụ': f.position,
      'Tổ / Đơn vị công tác': f.department || 'Trường THPT Minh Hòa',
      'Kỳ đánh giá': f.periodName,
      'Năm học': f.academicYear || academicYear,
      'Nhóm I (Tối đa 15)': groupI,
      'Nhóm II (Tối đa 15)': groupII,
      'Nhóm III (Tối đa 70)': groupIII,
      'Điểm tự đánh giá (100đ)': f.totalScore,
      'Điểm lãnh đạo đánh giá (100đ)': f.managerTotalScore !== null && f.managerTotalScore !== undefined ? f.managerTotalScore : 'Chưa chấm',
      'Cá nhân tự xếp loại': selfRating || 'Chưa xếp loại',
      'Xếp loại KPI chính thức': finalRating || 'Chưa xếp loại',
      'Trạng thái': statusText,
      'Ngày cập nhật': f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('vi-VN') : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Thiết lập độ rộng cột
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ tên
    { wch: 14 }, // Mã CB
    { wch: 22 }, // Chức vụ
    { wch: 24 }, // Đơn vị
    { wch: 24 }, // Kỳ
    { wch: 14 }, // Năm học
    { wch: 18 }, // Nhóm I
    { wch: 18 }, // Nhóm II
    { wch: 18 }, // Nhóm III
    { wch: 22 }, // Điểm tự đánh giá
    { wch: 26 }, // Điểm lãnh đạo đánh giá
    { wch: 28 }, // Xếp loại cá nhân
    { wch: 28 }, // Xếp loại chính thức
    { wch: 18 }, // Trạng thái
    { wch: 16 }  // Ngày cập nhật
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tong_Hop_KPI_Giao_Vien');

  const fileName = `Tong_Hop_KPI_Giao_Vien_${periodName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${academicYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Xuất chi tiết một phiếu đánh giá ra file Excel
 */
export const exportSingleVcFormToExcel = (form: KpiVcForm, ratingConfigs?: KpiVcRatingConfig[]) => {
  const dynamicRating = resolveVcClassification(
    form.managerTotalScore !== null && form.managerTotalScore !== undefined ? form.managerTotalScore : form.totalScore,
    form.periodId,
    ratingConfigs
  );
  const headerInfo = [
    { A: 'SỞ GD&ĐT TỈNH PHÚ THỌ', B: '', C: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' },
    { A: 'TRƯỜNG THPT MINH HÒA', B: '', C: 'Độc lập – Tự do – Hạnh phúc' },
    { A: '', B: '', C: '' },
    { A: `PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM NĂM HỌC ${form.academicYear || '2025-2026'}`, B: '', C: '' },
    { A: '(Áp dụng đối với viên chức không giữ chức vụ lãnh đạo, quản lý)', B: '', C: '' },
    { A: '', B: '', C: '' },
    { A: `Họ và tên: ${form.employeeName}`, B: '', C: `Mã cán bộ: ${form.employeeCode || ''}` },
    { A: `Chức vụ: ${form.position}`, B: '', C: `Kỳ đánh giá: ${form.periodName}` },
    { A: `Đơn vị công tác: ${form.department}`, B: '', C: `Năm học: ${form.academicYear}` },
    { A: '', B: '', C: '' },
  ];

  const criteriaRows = form.items.map((item, idx) => {
    let levelText = '';
    if (item.selectedLevelName) {
      levelText = ` [Đã chọn: ${item.selectedLevelName} - ${item.selfScore} điểm]`;
    }
    return {
      'STT': item.criterionCode || `${idx + 1}`,
      'Nội dung đánh giá': item.content + levelText,
      'Điểm tối đa': item.maxScore,
      'Điểm cá nhân tự chấm': item.selfScore
    };
  });

  const summaryRows = [
    {
      'STT': 'TỔNG',
      'Nội dung đánh giá': 'TỔNG ĐIỂM ĐÁNH GIÁ',
      'Điểm tối đa': 100,
      'Điểm cá nhân tự chấm': form.totalScore
    },
    {
      'STT': '',
      'Nội dung đánh giá': `Cá nhân tự xếp loại: ${form.selfClassification || 'Chưa xếp loại'}`,
      'Điểm tối đa': '',
      'Điểm cá nhân tự chấm': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(criteriaRows);
  XLSX.utils.sheet_add_json(worksheet, summaryRows, { origin: -1, skipHeader: true });

  worksheet['!cols'] = [
    { wch: 10 }, // STT
    { wch: 70 }, // Nội dung
    { wch: 14 }, // Max
    { wch: 22 }  // Điểm tự chấm
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Phieu_KPI_Chi_Tiet');

  const fileName = `Phieu_KPI_${form.employeeName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${form.academicYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
