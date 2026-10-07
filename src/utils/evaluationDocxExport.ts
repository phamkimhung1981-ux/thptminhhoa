import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  WidthType, 
  AlignmentType, 
  BorderStyle, 
  VerticalAlign,
  HeadingLevel,
  ShadingType
} from 'docx';
import { Teacher, Department } from '../types';
import { 
  EvaluationExportRecord, 
  CriterionCategory, 
  removeVietnameseTones, 
  formatMonthCode
} from './evaluationExport';

/**
 * Chuẩn hóa mã năm học cho tên file
 * Ví dụ: "2025-2026" -> "2025-2026", "2026-2027" -> "2026-2027"
 */
export function formatFullYearCode(yearStr: string): string {
  if (!yearStr || yearStr === 'All' || yearStr === 'Tất cả') return '2025-2026';
  const clean = yearStr.trim().replace(/\s+/g, '_');
  return clean;
}

/**
 * Tạo tên file Word theo chuẩn:
 * Phieu_danh_gia_Tran_Minh_Quang_T07_2025-2026.docx
 */
export function getDocxFileName(
  teacherName: string | undefined, 
  term: string, 
  year: string
): string {
  const cleanTeacher = teacherName ? removeVietnameseTones(teacherName) : 'Vien_chuc';
  const mCode = formatMonthCode(term);
  const yCode = formatFullYearCode(year);
  return `Phieu_danh_gia_${cleanTeacher}_${mCode}_${yCode}.docx`;
}

/**
 * Xuất 1 phiếu đánh giá viên chức ra file Word (.docx) hợp lệ chuẩn Microsoft Word
 */
export async function exportEvaluationToDocx({
  record,
  teacher,
  evaluator,
  department,
  criteria,
}: {
  record: EvaluationExportRecord;
  teacher?: Teacher;
  evaluator?: Teacher;
  department?: Department;
  criteria: CriterionCategory[];
}): Promise<{ success: boolean; fileName: string; error?: any }> {
  try {
    const teacherName = teacher?.name || 'Chưa xác định';
    const teacherCode = teacher?.code || 'CBGV';
    const deptName = department?.name || 'Tổ chuyên môn';
    const position = teacher?.role === 'BGH' ? 'Ban Giám Hiệu' : teacher?.role === 'TTCM' ? 'Tổ trưởng chuyên môn' : 'Giáo viên';
    const evaluatorName = evaluator?.name || 'Tổ trưởng chuyên môn';
    const term = record.term || 'Học kỳ 1';
    const year = record.year || '2025-2026';
    const evalDate = record.date || new Date().toISOString().split('T')[0];

    const fileName = getDocxFileName(teacher?.name, term, year);

    // Tính toán lại điểm an toàn, không lấy từ state ngoài
    const recScores = record.scores || {};
    const recDeptScores = record.deptScores || {};
    const recEvidences = record.evidences || {};

    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    };

    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };

    // Header bảng tiêu chí
    const tableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'STT', bold: true, size: 19 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'NỘI DUNG TIÊU CHÍ ĐÁNH GIÁ', bold: true, size: 19 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'ĐIỂM TỐI ĐA', bold: true, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'CÁ NHÂN TỰ CHẤM', bold: true, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'ĐIỂM ĐÁNH GIÁ', bold: true, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'MINH CHỨNG', bold: true, size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ];

    // Tạo các dòng dữ liệu tiêu chí
    criteria.forEach((cat) => {
      // Dòng nhóm lớn (I, II, III)
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: cat.categoryIndex, bold: true, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4500, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cat.categoryName.toUpperCase(), bold: true, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 900, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${cat.maxScore}`, bold: true, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        })
      );

      // Nếu có mục trực tiếp
      if (cat.items) {
        cat.items.forEach((item) => {
          const selfScore = typeof recScores[item.id] === 'number' ? recScores[item.id] : item.max;
          const deptScore = typeof recDeptScores[item.id] === 'number' ? recDeptScores[item.id] : selfScore;
          const evidence = recEvidences[item.id] || '';

          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: item.index, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 4500, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: item.label, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 900, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: `${item.max}`, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: `${selfScore}`, bold: true, color: '1D4ED8', size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: `${deptScore}`, bold: true, color: '047857', size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: evidence || 'Đầy đủ', size: 18, italics: !evidence })],
                    }),
                  ],
                }),
              ],
            })
          );
        });
      }

      // Nếu có nhóm con (subCategories)
      if (cat.subCategories) {
        cat.subCategories.forEach((sub) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: sub.subIndex, bold: true, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 4500, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: sub.title, bold: true, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 900, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: `${sub.maxScore}`, bold: true, size: 19 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [] })],
                }),
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [] })],
                }),
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [] })],
                }),
              ],
            })
          );

          sub.items.forEach((item) => {
            const selfScore = typeof recScores[item.id] === 'number' ? recScores[item.id] : item.max;
            const deptScore = typeof recDeptScores[item.id] === 'number' ? recDeptScores[item.id] : selfScore;
            const evidence = recEvidences[item.id] || '';

            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 600, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: item.index, size: 19 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: item.label, size: 19 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 900, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: `${item.max}`, size: 19 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 1000, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: `${selfScore}`, bold: true, color: '1D4ED8', size: 19 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 1000, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: `${deptScore}`, bold: true, color: '047857', size: 19 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 1600, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: evidence || 'Đầy đủ', size: 18, italics: !evidence })],
                      }),
                    ],
                  }),
                ],
              })
            );
          });
        });
      }
    });

    // Dòng tổng cộng điểm
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5100, type: WidthType.DXA },
            columnSpan: 2,
            shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'TỔNG CỘNG ĐIỂM ĐÁNH GIÁ:', bold: true, size: 21 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '100', bold: true, size: 21 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${record.selfTotal}`, bold: true, color: '1D4ED8', size: 21 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${record.deptTotal > 0 ? record.deptTotal : record.selfTotal}`, bold: true, color: '047857', size: 21 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: record.finalGrade, bold: true, color: 'B45309', size: 19 })],
              }),
            ],
          }),
        ],
      })
    );

    // Bảng tiêu chí hoàn chỉnh
    const criteriaTable = new Table({
      width: { size: 9600, type: WidthType.DXA },
      borders: tableBorders,
      rows: tableRows,
    });

    // Bảng Quốc hiệu & Tên trường
    const headerTable = new Table({
      width: { size: 9600, type: WidthType.DXA },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4800, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO YÊN BÁI', size: 20 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'TRƯỜNG THPT SƠN LƯƠNG', bold: true, size: 21 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: '-----------------------', size: 18 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4800, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 21 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: '-----------------------', size: 18 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Bảng Chữ ký cuối phiếu
    const signatureTable = new Table({
      width: { size: 9600, type: WidthType.DXA },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3200, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'NGƯỜI ĐƯỢC ĐÁNH GIÁ', bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 20 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: teacherName, bold: true, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3200, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'TỔ TRƯỞNG CHUYÊN MÔN', bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 20 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: evaluatorName, bold: true, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3200, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'HIỆU TRƯỞNG', bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, đóng dấu, ghi rõ họ tên)', italics: true, size: 18 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 20 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Nguyễn Tiến Quảng', bold: true, size: 20 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Tạo toàn bộ cấu trúc Document Word
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                bottom: 1000,
                left: 1200,
                right: 1200,
              },
            },
          },
          children: [
            headerTable,
            new Paragraph({ text: '', spacing: { before: 200, after: 100 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({
                  text: 'PHIẾU ĐÁNH GIÁ, XẾP LOẠI VIÊN CHỨC',
                  bold: true,
                  size: 28,
                  color: '0F172A',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 300 },
              children: [
                new TextRun({
                  text: `Thời gian đánh giá: ${term} - Năm học: ${year}`,
                  italics: true,
                  size: 21,
                  color: '334155',
                }),
              ],
            }),

            // PHẦN I
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 150, after: 100 },
              children: [
                new TextRun({ text: 'I. THÔNG TIN CÁN BỘ, GIÁO VIÊN, NHÂN VIÊN', bold: true, size: 22, color: '1E293B' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: '• Họ và tên: ', bold: true, size: 20 }),
                new TextRun({ text: teacherName, bold: true, color: '1D4ED8', size: 20 }),
                new TextRun({ text: '        • Mã giáo viên: ', bold: true, size: 20 }),
                new TextRun({ text: teacherCode, size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: '• Chức vụ / Vị trí việc làm: ', bold: true, size: 20 }),
                new TextRun({ text: position, size: 20 }),
                new TextRun({ text: '        • Tổ chuyên môn: ', bold: true, size: 20 }),
                new TextRun({ text: deptName, size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 200 },
              children: [
                new TextRun({ text: '• Đơn vị công tác: ', bold: true, size: 20 }),
                new TextRun({ text: 'Trường THPT Sơn Lương', size: 20 }),
                new TextRun({ text: '        • Ngày đánh giá: ', bold: true, size: 20 }),
                new TextRun({ text: evalDate, size: 20 }),
              ],
            }),

            // PHẦN II: BẢNG TIÊU CHÍ
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 150, after: 120 },
              children: [
                new TextRun({ text: 'II. KẾT QUẢ ĐÁNH GIÁ, CHẤM ĐIỂM CHI TIẾT', bold: true, size: 22, color: '1E293B' }),
              ],
            }),
            criteriaTable,

            // PHẦN III: TỔNG KẾT & XẾP LOẠI
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 250, after: 100 },
              children: [
                new TextRun({ text: 'III. TỔNG HỢP KẾT QUẢ VÀ XẾP LOẠI', bold: true, size: 22, color: '1E293B' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 50, after: 50 },
              children: [
                new TextRun({ text: '1. Tổng điểm cá nhân tự chấm: ', bold: true, size: 20 }),
                new TextRun({ text: `${record.selfTotal} / 100 điểm`, bold: true, color: '1D4ED8', size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 50, after: 50 },
              children: [
                new TextRun({ text: '2. Tổng điểm Tổ chuyên môn / Hội đồng đánh giá: ', bold: true, size: 20 }),
                new TextRun({ text: `${record.deptTotal > 0 ? record.deptTotal : record.selfTotal} / 100 điểm`, bold: true, color: '047857', size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 50, after: 200 },
              children: [
                new TextRun({ text: '3. Kết quả xếp loại chính thức: ', bold: true, size: 20 }),
                new TextRun({ text: record.finalGrade.toUpperCase(), bold: true, color: 'B45309', size: 21 }),
              ],
            }),

            // PHẦN IV: Ý KIẾN NHẬN XÉT
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 150, after: 100 },
              children: [
                new TextRun({ text: 'IV. Ý KIẾN NHẬN XÉT CỦA CÁC CẤP', bold: true, size: 22, color: '1E293B' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 60 },
              children: [
                new TextRun({ text: '1. Ý kiến tự nhận xét của viên chức:', bold: true, size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 0, after: 120 },
              children: [
                new TextRun({
                  text: record.selfNote || 'Thực hiện tốt các nhiệm vụ được phân công trong kỳ đánh giá, chấp hành tốt nội quy nhà trường.',
                  italics: !record.selfNote,
                  size: 20,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 60 },
              children: [
                new TextRun({ text: '2. Ý kiến nhận xét, đánh giá của Tổ trưởng chuyên môn:', bold: true, size: 20 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 0, after: 250 },
              children: [
                new TextRun({
                  text: record.deptNote || 'Hoàn thành tốt nhiệm vụ giảng dạy và công tác chuyên môn theo kế hoạch của tổ.',
                  italics: !record.deptNote,
                  size: 20,
                }),
              ],
            }),

            // PHẦN V: CHỮ KÝ
            new Paragraph({
              spacing: { before: 200, after: 150 },
              children: [
                new TextRun({ text: 'Sơn Lương, ngày .... tháng .... năm 202...', italics: true, size: 19 }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
            signatureTable,
          ],
        },
      ],
    });

    // Tạo blob và kích hoạt download
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 500);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting evaluation to docx:', error);
    return { success: false, fileName: '', error };
  }
}
