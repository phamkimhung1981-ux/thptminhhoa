import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeightRule
} from 'docx';
import { WorkAssignment, Teacher } from '../types';
import { safeFormatLocale } from './dateUtils';

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

interface ExportWordOptions {
  weekNumber: number;
  startDateStr: string;
  endDateStr: string;
  scopeTitle?: string;
  tasks: WorkAssignment[];
  teachers: Teacher[];
  getTeacherNames: (assignment: WorkAssignment) => string;
  getDepartmentName: (assignment: WorkAssignment) => string;
  getEffectiveStatus: (assignment: WorkAssignment) => string;
  getResultText: (assignment: WorkAssignment) => string;
}

export async function exportWeeklyTasksToWord(options: ExportWordOptions) {
  const {
    weekNumber,
    startDateStr,
    endDateStr,
    scopeTitle = 'TOÀN TRƯỜNG',
    tasks,
    getTeacherNames,
    getDepartmentName,
    getEffectiveStatus,
    getResultText
  } = options;

  const tableRows: TableRow[] = [];

  // 1. Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 5, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'STT', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NỘI DUNG CÔNG VIỆC', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NGƯỜI ĐƯỢC GIAO', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'TỔ / ĐƠN VỊ', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NGÀY GIAO', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'HẠN HOÀN THÀNH', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'TRẠNG THÁI', bold: true, size: 20 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'KẾT QUẢ', bold: true, size: 20 })]
            })
          ]
        })
      ]
    })
  );

  // 2. Data rows
  if (tasks.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Không có công việc nào trong tuần này.',
                    italics: true,
                    size: 20
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  } else {
    tasks.forEach((task, index) => {
      const stt = String(index + 1);
      const content = task.content || '';
      const priorityText = task.priority ? ` [Ưu tiên: ${task.priority}]` : '';
      const assignees = getTeacherNames(task);
      const deptName = getDepartmentName(task);
      const workDate = safeFormatLocale(task.workDate, 'toLocaleDateString', '—');
      const deadline = safeFormatLocale(task.deadline, 'toLocaleDateString', '—');
      const status = getEffectiveStatus(task);
      const result = getResultText(task) || '—';

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: stt, size: 19 })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: content, size: 19, bold: true }),
                    task.priority ? new TextRun({ text: priorityText, size: 18, color: task.priority === 'Khẩn cấp' ? 'DC2626' : '2563EB', italics: true }) : new TextRun({ text: '' }),
                    task.requirements ? new TextRun({ text: `\nYêu cầu: ${task.requirements}`, size: 17, italics: true, color: '4B5563' }) : new TextRun({ text: '' }),
                    task.note ? new TextRun({ text: `\nGhi chú: ${task.note}`, size: 17, italics: true, color: '6B7280' }) : new TextRun({ text: '' })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [new TextRun({ text: assignees, size: 19 })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: deptName, size: 19 })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: workDate, size: 19 })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: deadline, size: 19, bold: status === 'Quá hạn', color: status === 'Quá hạn' ? 'DC2626' : '111827' })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: status, size: 19, bold: true, color: status === 'Quá hạn' ? 'DC2626' : (status.includes('Hoàn thành') ? '059669' : '1E3A8A') })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [new TextRun({ text: result, size: 18 })]
                })
              ]
            })
          ]
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1134,
              right: 1134
            }
          }
        },
        children: [
          // National & School header table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'SỞ GD&ĐT PHÚ THỌ\n', size: 20 }),
                          new TextRun({ text: 'TRƯỜNG THPT MINH HÒA', bold: true, size: 20 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n', bold: true, size: 20 }),
                          new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 20 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ text: '', spacing: { before: 200, after: 100 } }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `BẢNG GIAO VIỆC TUẦN ${weekNumber}`,
                bold: true,
                size: 28,
                color: '1E3A8A'
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `(Từ ngày ${startDateStr} đến ngày ${endDateStr})`,
                italics: true,
                size: 22
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: `Đối tượng / Đơn vị: ${scopeTitle}`,
                bold: true,
                size: 20,
                color: '374151'
              })
            ]
          }),

          // The Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          new Paragraph({ text: '', spacing: { before: 400, after: 100 } }),

          // Signature footer
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'NGƯỜI LẬP BẢNG\n', bold: true, size: 20 }),
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `Minh Hòa, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}\n`, italics: true, size: 18 }),
                          new TextRun({ text: 'HIỆU TRƯỞNG / BAN GIÁM HIỆU\n', bold: true, size: 20 }),
                          new TextRun({ text: '(Ký và đóng dấu)', italics: true, size: 18 })
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

  const blob = await Packer.toBlob(doc);
  const fileName = `Bang_Giao_Viec_Tuan_${weekNumber}_THPT_Minh_Hoa.docx`;
  downloadBlob(blob, fileName);
}
