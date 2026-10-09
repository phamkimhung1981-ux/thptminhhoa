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
  BorderStyle
} from 'docx';
import { WeeklySchedule } from '../../types/schedule';
import { getWeekInfoByNumber } from '../../utils/schoolWeekUtils';

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

export async function exportScheduleToWord(schedule: WeeklySchedule) {
  const weekNum = Number(schedule.week_number) || schedule.weekNumber || 3;
  const academicYear = schedule.school_year || schedule.academicYear || '2026–2027';
  const weekInfo = getWeekInfoByNumber(weekNum, academicYear);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1417, // ~2.5cm
              right: 1134
            }
          }
        },
        children: [
          // Header Org & National Motto Table
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
                          new TextRun({ text: 'SỞ GD&ĐT PHÚ THỌ', size: 22, font: 'Times New Roman' })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'TRƯỜNG THPT MINH HÒA', bold: true, size: 22, font: 'Times New Roman' })
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
                          new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 22, font: 'Times New Roman' })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 22, font: 'Times New Roman', underline: {} })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: schedule.title || `LỊCH CÔNG TÁC TUẦN ${schedule.week_number}`,
                bold: true,
                size: 28,
                font: 'Times New Roman'
              })
            ]
          }),

          // Date & Duty Week
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `(Từ ngày ${weekInfo.startDateStr} đến ngày ${weekInfo.endDateStr})`,
                italics: true,
                size: 22,
                font: 'Times New Roman'
              }),
              schedule.duty_week ? new TextRun({
                text: `  |  Trực tuần: ${schedule.duty_week}`,
                bold: true,
                size: 22,
                font: 'Times New Roman'
              }) : new TextRun({ text: '' })
            ]
          }),

          // Main Schedule Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
            },
            rows: [
              // Table Header Row
              new TableRow({
                cantSplit: true,
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 18, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'Thứ/Ngày', bold: true, size: 22, font: 'Times New Roman' })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'BUỔI SÁNG', bold: true, size: 22, font: 'Times New Roman' })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'BUỔI CHIỀU', bold: true, size: 22, font: 'Times New Roman' })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'Trực LĐ', bold: true, size: 22, font: 'Times New Roman' })]
                      })
                    ]
                  })
                ]
              }),

              // Table Body Rows
              ...schedule.days.map((day) => {
                const morningRuns = day.morning_events.map(ev => 
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: ev.text,
                        size: 21,
                        font: 'Times New Roman',
                        color: ev.highlight === 'red' ? 'DC2626' : '000000',
                        bold: ev.highlight === 'red'
                      })
                    ]
                  })
                );

                const afternoonRuns = day.afternoon_events.map(ev => 
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: ev.text,
                        size: 21,
                        font: 'Times New Roman',
                        color: ev.highlight === 'red' ? 'DC2626' : '000000',
                        bold: ev.highlight === 'red'
                      })
                    ]
                  })
                );

                return new TableRow({
                  cantSplit: true,
                  children: [
                    // Day / Date Cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: day.day_of_week, bold: true, size: 22, font: 'Times New Roman' })
                          ]
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: day.date_str || day.date || '', size: 20, font: 'Times New Roman', italics: true })
                          ]
                        })
                      ]
                    }),

                    // Morning Cell
                    new TableCell({
                      children: morningRuns.length > 0 ? morningRuns : [new Paragraph({ text: '-' })]
                    }),

                    // Afternoon Cell
                    new TableCell({
                      children: afternoonRuns.length > 0 ? afternoonRuns : [new Paragraph({ text: '-' })]
                    }),

                    // Duty Leader Cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: day.duty_leader || '-', bold: true, size: 21, font: 'Times New Roman' })
                          ]
                        })
                      ]
                    })
                  ]
                });
              })
            ]
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Footer Notes & Signature Table
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
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: schedule.footer?.working_time || 'Thời gian làm việc: Sáng 7h00-11h30; Chiều 13h30-17h00',
                            italics: true,
                            size: 20,
                            font: 'Times New Roman'
                          })
                        ]
                      }),
                      new Paragraph({ text: '', spacing: { after: 100 } }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Nơi nhận:', bold: true, italics: true, size: 20, font: 'Times New Roman' })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: schedule.footer?.recipients || '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
                            size: 19,
                            font: 'Times New Roman'
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'HIỆU TRƯỜNG', bold: true, size: 22, font: 'Times New Roman' })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80, after: 600 },
                        children: [
                          new TextRun({ text: '(Đã ký)', italics: true, size: 20, font: 'Times New Roman' })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: schedule.footer?.principal_name || 'Trịnh Việt Phương',
                            bold: true,
                            size: 22,
                            font: 'Times New Roman'
                          })
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
  const fileName = `Lich_Cong_Tac_Tuan_${schedule.week_number}_THPT_Minh_Hoa.docx`;
  downloadBlob(blob, fileName);
}
