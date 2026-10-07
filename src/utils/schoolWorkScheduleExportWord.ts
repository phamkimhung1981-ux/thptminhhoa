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
import { SchoolWorkSchedule } from '../types/schoolWorkSchedule';

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

export async function exportSchoolWorkScheduleToWord(schedule: SchoolWorkSchedule) {
  const startDateObj = schedule.week_start_date ? new Date(schedule.week_start_date) : null;
  const endDateObj = schedule.week_end_date ? new Date(schedule.week_end_date) : null;

  const startDay = startDateObj ? String(startDateObj.getDate()).padStart(2, '0') : '.....';
  const startMonth = startDateObj ? String(startDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const endDay = endDateObj ? String(endDateObj.getDate()).padStart(2, '0') : '.....';
  const endMonth = endDateObj ? String(endDateObj.getMonth() + 1).padStart(2, '0') : '.....';
  const yearStr = '2026';

  const dateRangeText = `(Từ ngày ${startDay} tháng ${startMonth} đến ngày ${endDay} tháng ${endMonth} năm ${yearStr})`;

  const tableRows: any[] = [];

  // Row 1 Header
  tableRows.push(
    new DocxTableRow({
      tableHeader: true,
      children: [
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
                new DocxTextRun({ text: 'Thứ, ngày', bold: true, font: 'Times New Roman', size: 22 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 33, type: DocxWidthType.PERCENTAGE },
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
          width: { size: 29, type: DocxWidthType.PERCENTAGE },
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
          width: { size: 12, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Ngày hoàn thành', bold: true, font: 'Times New Roman', size: 20 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          rowSpan: 2,
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 12, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Lãnh đạo\ntrực/đánh\ngiá', bold: true, font: 'Times New Roman', size: 19 })
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
          borders: tableBorders,
          shading: { fill: 'F9FAFB' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Nội dung công việc', italics: true, font: 'Times New Roman', size: 20 })
              ]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          borders: tableBorders,
          shading: { fill: 'F9FAFB' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({ text: 'Nội dung công việc', italics: true, font: 'Times New Roman', size: 20 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Rows for each day
  schedule.days.forEach(day => {
    // Morning paragraphs
    const morningParas = (day.morning_tasks && day.morning_tasks.length > 0)
      ? day.morning_tasks.map(t => new DocxParagraph({
          spacing: { after: 60 },
          children: [
            new DocxTextRun({ text: `- ${t.content}`, font: 'Times New Roman', size: 22 }),
            ...(t.assignee ? [new DocxTextRun({ text: ` (${t.assignee})`, italics: true, font: 'Times New Roman', size: 20, color: '1E3A8A' })] : []),
            ...(t.leaderInCharge ? [new DocxTextRun({ text: ` [LĐ: ${t.leaderInCharge}]`, italics: true, font: 'Times New Roman', size: 19, color: '92400E' })] : [])
          ]
        }))
      : [new DocxParagraph({ children: [new DocxTextRun({ text: '—', font: 'Times New Roman', size: 20, color: '9CA3AF' })] })];

    // Afternoon paragraphs
    const afternoonParas = (day.afternoon_tasks && day.afternoon_tasks.length > 0)
      ? day.afternoon_tasks.map(t => new DocxParagraph({
          spacing: { after: 60 },
          children: [
            new DocxTextRun({ text: `- ${t.content}`, font: 'Times New Roman', size: 22 }),
            ...(t.assignee ? [new DocxTextRun({ text: ` (${t.assignee})`, italics: true, font: 'Times New Roman', size: 20, color: '1E3A8A' })] : []),
            ...(t.leaderInCharge ? [new DocxTextRun({ text: ` [LĐ: ${t.leaderInCharge}]`, italics: true, font: 'Times New Roman', size: 19, color: '92400E' })] : [])
          ]
        }))
      : [new DocxParagraph({ children: [new DocxTextRun({ text: '—', font: 'Times New Roman', size: 20, color: '9CA3AF' })] })];

    tableRows.push(
      new DocxTableRow({
        children: [
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({ text: day.day_of_week, bold: true, font: 'Times New Roman', size: 22 }),
                  ...(day.date_str ? [
                    new DocxTextRun({ text: `\n(${day.date_str})`, font: 'Times New Roman', size: 20, italics: true })
                  ] : [])
                ]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.TOP,
            borders: tableBorders,
            children: morningParas
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.TOP,
            borders: tableBorders,
            children: afternoonParas
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({ text: day.completion_date || day.date_str || '', font: 'Times New Roman', size: 20 })
                ]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({ text: day.duty_evaluator || '', bold: true, font: 'Times New Roman', size: 20 })
                ]
              })
            ]
          })
        ]
      })
    );
  });

  const docx = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: [
          // Header: TRƯỜNG THPT SƠN LƯƠNG
          new DocxParagraph({
            alignment: DocxAlignmentType.LEFT,
            children: [
              new DocxTextRun({
                text: 'TRƯỜNG THPT SƠN LƯƠNG',
                bold: true,
                font: 'Times New Roman',
                size: 24
              })
            ]
          }),
          // TỔ: ...
          new DocxParagraph({
            alignment: DocxAlignmentType.LEFT,
            spacing: { after: 120 },
            children: [
              new DocxTextRun({
                text: `TỔ: ${schedule.department_name || '....................................................'}`,
                bold: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          }),
          // TUẦN: ...
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({
                text: `TUẦN: ${schedule.week_number || '.............'}`,
                bold: true,
                font: 'Times New Roman',
                size: 26
              })
            ]
          }),
          // Date Range: (Từ ngày .... tháng.... đến ngày......... tháng...... năm 2026)
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { after: 240 },
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
          })
        ]
      }
    ]
  });

  const blob = await DocxPacker.toBlob(docx);
  const safeDept = (schedule.department_name || 'Toan_Truong').replace(/[^a-zA-Z0-9]/g, '_');
  downloadBlob(blob, `Lich_Cong_Viec_Tuan_${schedule.week_number}_${safeDept}.docx`);
}
