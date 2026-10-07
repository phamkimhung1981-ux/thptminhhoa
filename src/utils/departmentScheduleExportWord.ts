import {
  Document as DocxDocument,
  Packer as DocxPacker,
  Paragraph as DocxParagraph,
  TextRun as DocxTextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType as DocxWidthType,
  AlignmentType as DocxAlignmentType,
  BorderStyle as DocxBorderStyle,
  VerticalAlign as DocxVerticalAlign
} from 'docx';
import { DepartmentWeeklySchedule, DepartmentScheduleDayItem } from '../types/departmentSchedule';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const tableBorders = {
  top: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: DocxBorderStyle.SINGLE, size: 4, color: '000000' }
};

/**
 * Exports a completed Department Weekly Task Schedule to .docx
 */
export async function exportDepartmentScheduleToWord(schedule: DepartmentWeeklySchedule) {
  const startDateObj = schedule.startDate ? new Date(schedule.startDate) : null;
  const endDateObj = schedule.endDate ? new Date(schedule.endDate) : null;

  const startDay = startDateObj ? String(startDateObj.getDate()).padStart(2, '0') : '.....';
  const startMonth = startDateObj ? String(startDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const endDay = endDateObj ? String(endDateObj.getDate()).padStart(2, '0') : '.....';
  const endMonth = endDateObj ? String(endDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const yearStr = schedule.year ? String(schedule.year) : '2026';

  const dateRangeText = `(Từ ngày ${startDay} tháng ${startMonth} đến ngày ${endDay} tháng ${endMonth} năm ${yearStr})`;

  // Build Table
  const tableRows: any[] = [];

  // Row 1 Header
  tableRows.push(
    new DocxTableRow({
      tableHeader: true,
      children: [
        new DocxTableCell({
          rowSpan: 2,
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 16, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Thứ, ngày', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 32, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Sáng', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 30, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Chiều', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          rowSpan: 2,
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 14, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Lãnh đạo trực/đánh giá', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          rowSpan: 2,
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 8, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Ghi chú', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Row 2 Subheader (Nội dung công việc)
  tableRows.push(
    new DocxTableRow({
      tableHeader: true,
      children: [
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 32, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F9FAFB' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Nội dung công việc', font: 'Times New Roman', size: 20, italics: true })
              ]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 30, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F9FAFB' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Nội dung công việc', font: 'Times New Roman', size: 20, italics: true })
              ]
            })
          ]
        })
      ]
    })
  );

  // Data rows
  const daysList = schedule.days && schedule.days.length > 0 ? schedule.days : [];
  daysList.forEach((day) => {
    // Helper to format multiline content into paragraphs
    const formatParagraphs = (content: string, isCenter = false, isBold = false) => {
      if (!content || !content.trim()) {
        return [
          new DocxParagraph({
            spacing: { before: 60, after: 60 },
            children: [new DocxTextRun({ text: '', font: 'Times New Roman', size: 22 })]
          })
        ];
      }
      return content.split('\n').filter(l => l.trim()).map(line => (
        new DocxParagraph({
          alignment: isCenter ? DocxAlignmentType.CENTER : DocxAlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
          children: [
            new DocxTextRun({
              text: line.trim(),
              font: 'Times New Roman',
              size: 22,
              bold: isBold
            })
          ]
        })
      ));
    };

    // Day display text
    const dayLabel = day.dayOfWeek || '';
    const dateFormatted = day.date ? (day.dateDisplay || day.date) : '';
    const dayCellParagraphs: any[] = [
      new DocxParagraph({
        alignment: DocxAlignmentType.CENTER,
        spacing: { before: 40, after: 20 },
        children: [
          new DocxTextRun({ text: dayLabel, bold: true, font: 'Times New Roman', size: 22 })
        ]
      })
    ];

    if (dateFormatted && dateFormatted !== dayLabel) {
      // Extract date string like 28/09/2026 or 28/09
      const match = dateFormatted.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
      const str = match ? match[1] : dateFormatted.replace(dayLabel, '').replace(/^,\s*/, '').trim();
      if (str) {
        dayCellParagraphs.push(
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new DocxTextRun({ text: `(${str})`, italics: true, font: 'Times New Roman', size: 20 })
            ]
          })
        );
      }
    }

    tableRows.push(
      new DocxTableRow({
        cantSplit: true,
        children: [
          // Col 1: Thứ, ngày
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 16, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: dayCellParagraphs
          }),
          // Col 2: Sáng - Nội dung công việc
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.TOP,
            width: { size: 32, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: formatParagraphs(day.morningTasks)
          }),
          // Col 3: Chiều - Nội dung công việc
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.TOP,
            width: { size: 30, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: formatParagraphs(day.afternoonTasks)
          }),
          // Col 4: Lãnh đạo trực/đánh giá
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 14, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: formatParagraphs(day.dutyLeaderOrEvaluation, true)
          }),
          // Col 5: Ghi chú
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 8, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: formatParagraphs(day.notes, true)
          })
        ]
      })
    );
  });

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000
            }
          }
        },
        children: [
          // Header: School & Department
          new DocxParagraph({
            alignment: DocxAlignmentType.LEFT,
            spacing: { before: 0, after: 60 },
            children: [
              new DocxTextRun({
                text: schedule.schoolName || 'TRƯỜNG THPT SƠN LƯƠNG',
                bold: true,
                font: 'Times New Roman',
                size: 24
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.LEFT,
            spacing: { before: 0, after: 140 },
            children: [
              new DocxTextRun({
                text: `TỔ: ${schedule.departmentName ? schedule.departmentName.toUpperCase() : '……………………………………………..'}`,
                bold: true,
                font: 'Times New Roman',
                size: 24
              })
            ]
          }),

          // Center: Week Title
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              new DocxTextRun({
                text: `TUẦN: ${schedule.weekNumber || '……………'}`,
                bold: true,
                font: 'Times New Roman',
                size: 28
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new DocxTextRun({
                text: dateRangeText,
                italics: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          }),

          // Schedule Table
          new DocxTable({
            width: { size: 100, type: DocxWidthType.PERCENTAGE },
            rows: tableRows
          }),

          // Footer Signatures
          new DocxParagraph({
            spacing: { before: 300, after: 60 },
            alignment: DocxAlignmentType.RIGHT,
            children: [
              new DocxTextRun({
                text: `Sơn Lương, ngày .... tháng .... năm ${yearStr}`,
                italics: true,
                font: 'Times New Roman',
                size: 20
              })
            ]
          }),
          new DocxTable({
            width: { size: 100, type: DocxWidthType.PERCENTAGE },
            borders: {
              top: { style: DocxBorderStyle.NONE },
              bottom: { style: DocxBorderStyle.NONE },
              left: { style: DocxBorderStyle.NONE },
              right: { style: DocxBorderStyle.NONE },
              insideHorizontal: { style: DocxBorderStyle.NONE },
              insideVertical: { style: DocxBorderStyle.NONE }
            },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: { size: 33, type: DocxWidthType.PERCENTAGE },
                    children: [
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        children: [
                          new DocxTextRun({ text: 'NGƯỜI LẬP BIỂU', bold: true, font: 'Times New Roman', size: 22 })
                        ]
                      }),
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        spacing: { before: 40, after: 500 },
                        children: [
                          new DocxTextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, font: 'Times New Roman', size: 18 })
                        ]
                      })
                    ]
                  }),
                  new DocxTableCell({
                    width: { size: 33, type: DocxWidthType.PERCENTAGE },
                    children: [
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        children: [
                          new DocxTextRun({ text: 'TỔ TRƯỞNG CHUYÊN MÔN', bold: true, font: 'Times New Roman', size: 22 })
                        ]
                      }),
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        spacing: { before: 40, after: 500 },
                        children: [
                          new DocxTextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, font: 'Times New Roman', size: 18 })
                        ]
                      })
                    ]
                  }),
                  new DocxTableCell({
                    width: { size: 34, type: DocxWidthType.PERCENTAGE },
                    children: [
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        children: [
                          new DocxTextRun({ text: 'BAN GIÁM HIỆU DUYỆT', bold: true, font: 'Times New Roman', size: 22 })
                        ]
                      }),
                      new DocxParagraph({
                        alignment: DocxAlignmentType.CENTER,
                        spacing: { before: 40, after: 500 },
                        children: [
                          new DocxTextRun({ text: '(Ký và đóng dấu)', italics: true, font: 'Times New Roman', size: 18 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await DocxPacker.toBlob(doc);
  const safeDept = (schedule.departmentName || 'to_chuyen_mon').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const fileName = `Lich_Giao_Viec_${safeDept}_Tuan_${schedule.weekNumber || '1'}_${yearStr}.docx`;
  downloadBlob(blob, fileName);
}

/**
 * Generates and downloads a Blank Word Template matching the uploaded image exactly
 */
export async function downloadBlankTemplateWord(departmentName = '', weekNumber = '') {
  const blankDays = [
    { label: 'Thứ Hai' },
    { label: 'Thứ Ba' },
    { label: 'Thứ Tư' },
    { label: 'Thứ Năm' },
    { label: 'Thứ Sáu' },
    { label: 'Thứ Bảy' },
    { label: 'Chủ Nhật' },
  ];

  const blankSchedule: DepartmentWeeklySchedule = {
    id: 'template',
    schoolName: 'TRƯỜNG THPT SƠN LƯƠNG',
    departmentId: '',
    departmentName: departmentName || '……………………………………………..',
    weekNumber: (weekNumber ? Number(weekNumber) : '') as any,
    startDate: '',
    endDate: '',
    year: 2026,
    academicYear: '2026-2027',
    status: 'draft',
    createdAt: '',
    updatedAt: '',
    days: blankDays.map(d => ({
      id: d.label,
      dayOfWeek: d.label,
      date: '',
      dateDisplay: '',
      morningTasks: '',
      afternoonTasks: '',
      dutyLeaderOrEvaluation: '',
      notes: ''
    }))
  };

  await exportDepartmentScheduleToWord(blankSchedule);
}
