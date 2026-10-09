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
import { YouthDutySchedule, YouthDutyMetadata } from '../types/youthDuty';
import { DEFAULT_DUTY_METADATA, DEFAULT_SAMPLE_SCHEDULES } from '../lib/youthDutyData';

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

const noBorders = {
  top: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: DocxBorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

function formatBulletParagraphs(tasks: string[] | undefined): DocxParagraph[] {
  if (!tasks || tasks.length === 0) {
    return [
      new DocxParagraph({
        children: [new DocxTextRun({ text: '—', font: 'Times New Roman', size: 24 })],
        spacing: { before: 40, after: 40 }
      })
    ];
  }

  return tasks.map(t => {
    const clean = t.trim().replace(/^[-•*]\s*/, '');
    return new DocxParagraph({
      children: [
        new DocxTextRun({
          text: `- ${clean}`,
          font: 'Times New Roman',
          size: 24
        })
      ],
      spacing: { before: 30, after: 30, line: 260 }
    });
  });
}

/**
 * 1. TẢI FILE MẪU CHUẨN: "PHÂN CÔNG TRỰC Đoàn.docx"
 */
export async function downloadSampleDutyDocx() {
  await exportDutyScheduleToWord(
    DEFAULT_SAMPLE_SCHEDULES,
    DEFAULT_DUTY_METADATA,
    2,
    4,
    'TỪ TUẦN 02 ĐẾN TUẦN 4',
    'PHÂN CÔNG TRỰC Đoàn.docx'
  );
}

/**
 * 2. XUẤT LỊCH TRỰC ĐOÀN RA FILE WORD (.docx) CHUẨN MẪU
 */
export async function exportDutyScheduleToWord(
  schedules: YouthDutySchedule[],
  metadata: YouthDutyMetadata = DEFAULT_DUTY_METADATA,
  fromWeek?: number,
  toWeek?: number,
  customWeekRangeTitle?: string,
  customFileName?: string
) {
  const weekTitle = customWeekRangeTitle || (
    fromWeek && toWeek && fromWeek !== toWeek
      ? `TỪ TUẦN ${String(fromWeek).padStart(2, '0')} ĐẾN TUẦN ${toWeek}`
      : fromWeek
      ? `TUẦN ${String(fromWeek).padStart(2, '0')}`
      : 'TỪ TUẦN 02 ĐẾN TUẦN 4'
  );

  // 1. Header Table (2 columns: Org Left, Date/Union Right)
  const headerTable = new DocxTable({
    width: { size: 100, type: DocxWidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new DocxTableRow({
        children: [
          // Left Cell
          new DocxTableCell({
            width: { size: 50, type: DocxWidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: (metadata.parentOrganizationName || 'ĐOÀN XÃ MINH HÒA').toUpperCase(),
                    bold: false,
                    font: 'Times New Roman',
                    size: 24
                  })
                ]
              }),
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: (metadata.organizationName || 'ĐOÀN TRƯỜNG THPT MINH HÒA').toUpperCase(),
                    bold: true,
                    font: 'Times New Roman',
                    size: 24
                  })
                ]
              })
            ]
          }),
          // Right Cell
          new DocxTableCell({
            width: { size: 50, type: DocxWidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: (metadata.unionTitle || 'ĐOÀN TNCS HỒ CHÍ MINH').toUpperCase(),
                    bold: true,
                    font: 'Times New Roman',
                    size: 24
                  })
                ]
              }),
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: metadata.locationDate || 'Minh Hòa, ngày 17 tháng 09 năm 2026',
                    italics: true,
                    font: 'Times New Roman',
                    size: 24
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // 2. Title Paragraphs
  const titleParagraphs = [
    new DocxParagraph({
      text: '',
      spacing: { before: 180, after: 120 }
    }),
    new DocxParagraph({
      alignment: DocxAlignmentType.CENTER,
      children: [
        new DocxTextRun({
          text: 'LỊCH PHÂN CÔNG TRỰC ĐOÀN TRƯỜNG THPT MINH HÒA',
          bold: true,
          font: 'Times New Roman',
          size: 28
        })
      ],
      spacing: { before: 100, after: 200 }
    })
  ];

  // 3. Main Duty Table Rows
  // Ensure we sort days 2, 3, 4, 5, 6
  const sortedSchedules = [...schedules].sort((a, b) => (a.dayOfWeekNumber || 0) - (b.dayOfWeekNumber || 0));

  const tableHeaderRow1 = new DocxTableRow({
    children: [
      new DocxTableCell({
        width: { size: 10, type: DocxWidthType.PERCENTAGE },
        verticalAlign: DocxVerticalAlign.CENTER,
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Thứ', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      }),
      new DocxTableCell({
        width: { size: 56, type: DocxWidthType.PERCENTAGE },
        columnSpan: 2,
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Nội dung công việc', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      }),
      new DocxTableCell({
        width: { size: 18, type: DocxWidthType.PERCENTAGE },
        verticalAlign: DocxVerticalAlign.CENTER,
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Người thực hiện', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      }),
      new DocxTableCell({
        width: { size: 16, type: DocxWidthType.PERCENTAGE },
        verticalAlign: DocxVerticalAlign.CENTER,
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Ghi chú', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      })
    ]
  });

  const tableHeaderRow2 = new DocxTableRow({
    children: [
      new DocxTableCell({
        width: { size: 10, type: DocxWidthType.PERCENTAGE },
        borders: tableBorders,
        children: [new DocxParagraph({ text: '' })]
      }),
      new DocxTableCell({
        width: { size: 28, type: DocxWidthType.PERCENTAGE },
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Sáng', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      }),
      new DocxTableCell({
        width: { size: 28, type: DocxWidthType.PERCENTAGE },
        borders: tableBorders,
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({ text: 'Chiều', bold: true, font: 'Times New Roman', size: 24 })
            ]
          })
        ]
      }),
      new DocxTableCell({
        width: { size: 18, type: DocxWidthType.PERCENTAGE },
        borders: tableBorders,
        children: [new DocxParagraph({ text: '' })]
      }),
      new DocxTableCell({
        width: { size: 16, type: DocxWidthType.PERCENTAGE },
        borders: tableBorders,
        children: [new DocxParagraph({ text: '' })]
      })
    ]
  });

  const dataRows = sortedSchedules.map(sched => {
    const dayLabel = sched.dayOfWeek.replace(/^Thứ\s*/i, '');
    const morningParas = formatBulletParagraphs(sched.morningTasks);
    const afternoonParas = formatBulletParagraphs(sched.afternoonTasks);

    return new DocxTableRow({
      children: [
        // Col 1: Thứ
        new DocxTableCell({
          width: { size: 10, type: DocxWidthType.PERCENTAGE },
          verticalAlign: DocxVerticalAlign.CENTER,
          borders: tableBorders,
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({
                  text: dayLabel,
                  bold: true,
                  font: 'Times New Roman',
                  size: 26
                })
              ]
            })
          ]
        }),
        // Col 2: Sáng
        new DocxTableCell({
          width: { size: 28, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          children: morningParas
        }),
        // Col 3: Chiều
        new DocxTableCell({
          width: { size: 28, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          children: afternoonParas
        }),
        // Col 4: Người thực hiện
        new DocxTableCell({
          width: { size: 18, type: DocxWidthType.PERCENTAGE },
          verticalAlign: DocxVerticalAlign.CENTER,
          borders: tableBorders,
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({
                  text: sched.assignedPeople || 'Đ/c Phương + Đội cờ đỏ, TNXK',
                  bold: true,
                  font: 'Times New Roman',
                  size: 24
                })
              ],
              spacing: { before: 40, after: 40 }
            })
          ]
        }),
        // Col 5: Ghi chú
        new DocxTableCell({
          width: { size: 16, type: DocxWidthType.PERCENTAGE },
          verticalAlign: DocxVerticalAlign.CENTER,
          borders: tableBorders,
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [
                new DocxTextRun({
                  text: sched.notes || 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp',
                  bold: true,
                  font: 'Times New Roman',
                  size: 24
                })
              ],
              spacing: { before: 40, after: 40 }
            })
          ]
        })
      ]
    });
  });

  const mainDutyTable = new DocxTable({
    width: { size: 100, type: DocxWidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [tableHeaderRow1, tableHeaderRow2, ...dataRows]
  });

  // 4. Footer Signatures Table (TM. BCH Đoàn trường / Xác nhận Ban Chi Ủy)
  const footerTable = new DocxTable({
    width: { size: 100, type: DocxWidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new DocxTableRow({
        children: [
          // Left: TM. BCH Đoàn trường / Bí Thư
          new DocxTableCell({
            width: { size: 50, type: DocxWidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: 'TM. BCH Đoàn trường',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26
                  })
                ],
                spacing: { before: 240, after: 40 }
              }),
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: metadata.secretaryTitle || 'Bí Thư',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24
                  })
                ],
                spacing: { before: 0, after: 700 } // Spacing for signature
              }),
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: metadata.secretaryName || 'Phan Thị Lan Phương',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26
                  })
                ]
              })
            ]
          }),
          // Right: Xác nhận của Ban Chi Ủy
          new DocxTableCell({
            width: { size: 50, type: DocxWidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [
                  new DocxTextRun({
                    text: metadata.partyCommitteeTitle || 'Xác nhận của Ban Chi Ủy',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26
                  })
                ],
                spacing: { before: 240, after: 40 }
              })
            ]
          })
        ]
      })
    ]
  });

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: [
          headerTable,
          ...titleParagraphs,
          mainDutyTable,
          new DocxParagraph({ text: '', spacing: { before: 200, after: 100 } }),
          footerTable
        ]
      }
    ]
  });

  const blob = await DocxPacker.toBlob(doc);
  const fileName = customFileName || `Lich_Truc_Doan_${weekTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  downloadBlob(blob, fileName);
}
