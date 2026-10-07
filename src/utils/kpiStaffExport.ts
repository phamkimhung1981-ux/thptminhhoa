import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { KpiStaffForm } from '../types/kpiStaff';
import { POSITION_CONFIGS } from '../lib/kpiStaffData';

/**
 * Xuất tổng hợp danh sách KPI Nhân viên ra file Excel
 */
export const exportStaffSummaryToExcel = (
  forms: KpiStaffForm[],
  periodName: string = 'Năm học 2026–2027',
  academicYear: string = '2026–2027'
) => {
  const data = forms.map((f, idx) => {
    const posConfig = POSITION_CONFIGS[f.positionKey] || POSITION_CONFIGS.KE_TOAN;
    const finalScore = f.managerTotalScore ?? f.totalScore;

    return {
      'STT': idx + 1,
      'Mã NV': f.employeeCode || f.employeeId || '---',
      'Họ và tên': f.employeeName,
      'Chức danh / Vị trí': f.position || posConfig.positionName,
      'Bộ KPI Vị trí': posConfig.title,
      'Bộ phận / Tổ': f.department || 'Tổ Văn phòng',
      'Kỳ đánh giá': f.periodName || periodName,
      'Năm học': f.academicYear || academicYear,
      'KPI Chung (Tối đa 30đ)': f.generalTotalSelf,
      'KPI Vị trí (Tối đa 70đ)': f.positionTotalSelf,
      'Tổng điểm Tự chấm': f.totalScore,
      'Tổng điểm BGH Duyệt': f.managerTotalScore ?? '---',
      'Điểm chính thức': finalScore,
      'Xếp loại Tự chấm': f.selfClassification || '---',
      'Xếp loại BGH': f.leaderClassification || f.selfClassification || '---',
      'Trạng thái': f.status === 'completed' || f.status === 'locked' ? 'Nghiệm thu / Đã khóa' : f.status === 'submitted' ? 'Đã gửi' : 'Bản nháp'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã NV
    { wch: 25 }, // Họ tên
    { wch: 22 }, // Chức danh
    { wch: 40 }, // Bộ KPI Vị trí
    { wch: 18 }, // Tổ
    { wch: 22 }, // Kỳ
    { wch: 12 }, // Năm học
    { wch: 20 }, // KPI Chung
    { wch: 20 }, // KPI Vị trí
    { wch: 18 }, // Tự chấm
    { wch: 18 }, // BGH Duyệt
    { wch: 16 }, // Điểm chính thức
    { wch: 28 }, // Xếp loại tự chấm
    { wch: 28 }, // Xếp loại BGH
    { wch: 20 }  // Trạng thái
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI_Nhan_Vien_THPT_Son_Luong');

  const fileName = `Tong_Hop_KPI_Nhan_Vien_${periodName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Xuất Phiếu đánh giá KPI Nhân viên ra file Word (.docx) chuẩn theo mẫu SỞ GD&ĐT PHÚ THỌ
 */
export const exportStaffFormToWord = async (form: KpiStaffForm): Promise<void> => {
  if (!form || !form.id) {
    alert('Không tìm thấy thông tin phiếu đánh giá!');
    return;
  }

  const posConfig = POSITION_CONFIGS[form.positionKey] || POSITION_CONFIGS.KE_TOAN;
  const finalScore = form.managerTotalScore ?? form.totalScore;
  const finalClassification = form.leaderClassification || form.selfClassification;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 }
          }
        },
        children: [
          // Header School Name
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'SỞ GD&ĐT PHÚ THỌ\n', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: 'TRƯỜNG THPT SƠN LƯƠNG', bold: true, size: 24, font: 'Times New Roman' }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: 'PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI NHÂN VIÊN', bold: true, size: 28, font: 'Times New Roman', color: '1E3A8A' }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `Năm học ${form.academicYear || '2026–2027'} – Dự thảo vận hành`, italics: true, size: 22, font: 'Times New Roman' }),
            ]
          }),

          // Employee Info Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Họ và tên:', bold: true, size: 22, font: 'Times New Roman' })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: form.employeeName, size: 22, font: 'Times New Roman' })] })], width: { size: 70, type: WidthType.PERCENTAGE } })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chức danh/vị trí việc làm:', bold: true, size: 22, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: form.position || posConfig.positionName, size: 22, font: 'Times New Roman' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bộ phận/Tổ văn phòng:', bold: true, size: 22, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: form.department || 'Tổ Văn phòng', size: 22, font: 'Times New Roman' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Người đánh giá:', bold: true, size: 22, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: form.evaluatorName || 'TTVP/BGH', size: 22, font: 'Times New Roman' })] })] })
                ]
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: 'Cấu trúc điểm: 30 điểm KPI chung + 70 điểm KPI theo đúng vị trí việc làm. Chỉ kích hoạt một bộ KPI vị trí cho mỗi nhân viên.', italics: true, size: 20, font: 'Times New Roman' })
            ]
          }),

          // Section A Title
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: 'A. KPI CHUNG – 30 ĐIỂM', bold: true, size: 24, font: 'Times New Roman', color: '0F172A' })
            ]
          }),

          // Section A Items Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mã KPI', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung đánh giá / nhiệm vụ', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm tối đa', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tự chấm', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Minh chứng / ghi chú', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 13, type: WidthType.PERCENTAGE } })
                ]
              }),
              ...form.generalItems.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.code, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.content, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.maxScore}`, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.selfScore}`, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.evidence || '', size: 20, font: 'Times New Roman' })] })] })
                ]
              })),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TỔNG KPI CHUNG', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '30', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${form.generalTotalSelf}`, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] })
                ]
              })
            ]
          }),

          // Section B Title
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new TextRun({ text: posConfig.title, bold: true, size: 24, font: 'Times New Roman', color: '0F172A' })
            ]
          }),

          // Section B Items Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 8, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mã KPI', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 14, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nhiệm vụ cụ thể', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm tối đa', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tự chấm', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Minh chứng', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 11, type: WidthType.PERCENTAGE } })
                ]
              }),
              ...form.positionItems.map((item, idx) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.code, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.content, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.maxScore}`, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.selfScore}`, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.evidence || '', size: 20, font: 'Times New Roman' })] })] })
                ]
              })),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TỔNG KPI VỊ TRÍ', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '70', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${form.positionTotalSelf}`, bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] })
                ]
              })
            ]
          }),

          // Total Summary Section D
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: 'D. TỔNG HỢP ĐIỂM', bold: true, size: 24, font: 'Times New Roman', color: '0F172A' })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm tối đa', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm đạt', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 25, type: WidthType.PERCENTAGE } })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'KPI chung', size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '30', size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${form.generalTotalSelf}`, bold: true, size: 20, font: 'Times New Roman' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'KPI vị trí việc làm', size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '70', size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${form.positionTotalSelf}`, bold: true, size: 20, font: 'Times New Roman' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tổng điểm KPI', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '100', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${finalScore}`, bold: true, size: 20, font: 'Times New Roman', color: '166534' })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tự xếp loại', bold: true, size: 20, font: 'Times New Roman' })] })] }),
                  new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: finalClassification, bold: true, size: 20, font: 'Times New Roman', color: '1E3A8A' })] })] })
                ]
              })
            ]
          }),

          // Signatures Section
          new Paragraph({
            spacing: { before: 500 },
            children: [
              new TextRun({ text: '                  NHÂN VIÊN TỰ ĐÁNH GIÁ                                    BGH PHÊ DUYỆT', bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            spacing: { after: 700 },
            children: [
              new TextRun({ text: '                       (Ký và ghi rõ họ tên)                                              (Ký và ghi rõ họ tên)', italics: true, size: 20, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `                       ${form.employeeName}                                              ${form.evaluatorName || 'Hiệu trưởng'}`, bold: true, size: 22, font: 'Times New Roman' })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Phieu_KPI_Nhan_Vien_${form.employeeName.replace(/\s+/g, '_')}_${form.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
