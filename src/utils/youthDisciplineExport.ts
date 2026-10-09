import * as XLSX from 'xlsx';
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
import {
  YouthViolationRecord,
  ClassDisciplineSummary,
  YouthDisciplineSettings
} from '../types/youthDiscipline';

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

// 1. EXPORT EXCEL
export function exportYouthDisciplineToExcel(
  summaries: ClassDisciplineSummary[],
  violations: YouthViolationRecord[],
  scopeTitle: string,
  schoolYear: string = '2026–2027'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng hợp thi đua nề nếp các lớp
  const summaryRows: any[][] = [
    ['ĐOÀN TNCS HỒ CHÍ MINH - TRƯỜNG THPT MINH HÒA'],
    [`BẢNG TỔNG HỢP THI ĐUA NỀN NẾP HỌC SINH - ${scopeTitle.toUpperCase()}`],
    [`Năm học: ${schoolYear}`],
    [],
    [
      'Xếp hạng',
      'Lớp',
      'Khối',
      'Giáo viên chủ nhiệm',
      'Sĩ số',
      'Điểm chuẩn',
      'Tổng điểm trừ',
      'Điểm nền nếp',
      'Số lượt vi phạm',
      'Số HS vi phạm',
      'Xếp loại'
    ]
  ];

  summaries.forEach((s) => {
    summaryRows.push([
      `#${s.rank}`,
      s.className,
      `Khối ${s.grade}`,
      s.homeroomTeacherName || '—',
      s.totalStudents,
      s.baseScore,
      s.totalMinusPoints,
      s.finalScore,
      s.violationCount,
      s.violatingStudentCount,
      s.classification
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ThiDuaLop');

  // Sheet 2: Danh sách chi tiết các lượt vi phạm
  const violationRows: any[][] = [
    ['DANH SÁCH CHI TIẾT CÁC LƯỢT VI PHẠM NỀN NẾP'],
    [`Thời gian: ${scopeTitle}`],
    [],
    [
      'STT',
      'Ngày',
      'Thời gian',
      'Tuần',
      'Lớp',
      'Học sinh',
      'Mã học sinh',
      'Nhóm vi phạm',
      'Nội dung vi phạm',
      'Mức độ',
      'Điểm trừ',
      'Địa điểm',
      'Người ghi nhận',
      'Trạng thái'
    ]
  ];

  violations.forEach((v, idx) => {
    violationRows.push([
      idx + 1,
      v.violationDate,
      v.violationTime || '',
      `Tuần ${v.weekNumber}`,
      v.className,
      v.studentName,
      v.studentCode || '',
      v.categoryName,
      v.content || v.criterionName,
      v.severity,
      v.minusPoints,
      v.location || '',
      v.recordedByName,
      v.status === 'DA_XAC_NHAN' ? 'Đã xác nhận' : v.status === 'CHO_XAC_NHAN' ? 'Chờ xác nhận' : v.status
    ]);
  });

  const wsViolations = XLSX.utils.aoa_to_sheet(violationRows);
  XLSX.utils.book_append_sheet(wb, wsViolations, 'ChiTietViPham');

  const safeFileName = `Bao_Cao_Nen_Nep_Doan_TN_${scopeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

// 2. EXPORT WORD (.docx)
export async function exportYouthDisciplineToWord(
  summaries: ClassDisciplineSummary[],
  violations: YouthViolationRecord[],
  scopeTitle: string,
  schoolYear: string = '2026–2027',
  inspectorName: string = 'Ban Thường vụ Đoàn trường'
) {
  const tableRows: DocxTableRow[] = [];

  // Header row
  tableRows.push(
    new DocxTableRow({
      tableHeader: true,
      children: [
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 8, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Hạng', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 10, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Lớp', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 22, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Giáo viên chủ nhiệm', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 10, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Sĩ số', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 12, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Điểm trừ', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 14, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Điểm thi đua', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 12, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Số vi phạm', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 12, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Xếp loại', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        })
      ]
    })
  );

  // Rows for each class
  summaries.forEach((s) => {
    tableRows.push(
      new DocxTableRow({
        children: [
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: `#${s.rank}`, bold: true, font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: s.className, bold: true, font: 'Times New Roman', size: 20, color: '1E3A8A' })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                children: [new DocxTextRun({ text: s.homeroomTeacherName || '—', font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: String(s.totalStudents), font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: `-${s.totalMinusPoints}`, font: 'Times New Roman', size: 20, color: 'DC2626' })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: `${s.finalScore} đ`, bold: true, font: 'Times New Roman', size: 20, color: '047857' })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: String(s.violationCount), font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: s.classification, bold: true, font: 'Times New Roman', size: 20 })]
              })
            ]
          })
        ]
      })
    );
  });

  // Create Docx
  const docx = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({
                text: 'ĐOÀN TNCS HỒ CHÍ MINH TRƯỜNG THPT MINH HÒA',
                bold: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new DocxTextRun({
                text: '***',
                bold: true,
                font: 'Times New Roman',
                size: 20
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({
                text: 'BÁO CÁO TỔNG HỢP NỀN NẾP & THI ĐUA HỌC SINH',
                bold: true,
                font: 'Times New Roman',
                size: 26,
                color: '1E3A8A'
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new DocxTextRun({
                text: `${scopeTitle.toUpperCase()} - NĂM HỌC ${schoolYear}`,
                bold: true,
                italics: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          }),
          new DocxTable({
            width: { size: 100, type: DocxWidthType.PERCENTAGE },
            rows: tableRows
          }),
          new DocxParagraph({
            spacing: { before: 360 },
            alignment: DocxAlignmentType.RIGHT,
            children: [
              new DocxTextRun({
                text: 'Minh Hòa, ngày ..... tháng ..... năm 2026',
                italics: true,
                font: 'Times New Roman',
                size: 20
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.RIGHT,
            children: [
              new DocxTextRun({
                text: 'TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG\nBÍ THƯ',
                bold: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await DocxPacker.toBlob(docx);
  const safeFileName = `Bao_Cao_Nen_Nep_Doan_TN_${scopeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  downloadBlob(blob, safeFileName);
}

// 3. EXPORT LATE STUDENTS LIST TO EXCEL
export function exportLateStudentsToExcel(
  lateList: YouthViolationRecord[],
  scopeTitle: string,
  schoolYear: string = '2026–2027'
) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['ĐOÀN TNCS HỒ CHÍ MINH - TRƯỜNG THPT MINH HÒA'],
    [`DANH SÁCH HỌC SINH ĐI HỌC MUỘN - ${scopeTitle.toUpperCase()}`],
    [`Năm học: ${schoolYear} | Tổng số: ${lateList.length} lượt`],
    [],
    [
      'STT',
      'Ngày vi phạm',
      'Giờ đến',
      'Buổi',
      'Tuần',
      'Lớp',
      'Họ và tên học sinh',
      'Mã học sinh',
      'Điểm trừ',
      'Lý do / Nội dung',
      'Địa điểm',
      'Người ghi nhận',
      'Trạng thái'
    ]
  ];

  lateList.forEach((v, idx) => {
    rows.push([
      idx + 1,
      v.violationDate,
      v.violationTime || '',
      v.periodSlot || 'Sáng',
      `Tuần ${v.weekNumber}`,
      v.className,
      v.studentName,
      v.studentCode || '',
      `-${v.minusPoints} đ`,
      v.content || 'Đi học muộn',
      v.location || 'Cổng trường',
      v.recordedByName,
      v.status === 'DA_XAC_NHAN' ? 'Đã xác nhận' : 'Chờ xác nhận'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'HocSinhDiMuon');

  const safeFileName = `Danh_Sach_Hoc_Sinh_Di_Muon_${scopeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

// 4. EXPORT LATE STUDENTS LIST TO WORD
export async function exportLateStudentsToWord(
  lateList: YouthViolationRecord[],
  scopeTitle: string,
  schoolYear: string = '2026–2027',
  inspectorName: string = 'Đội Cờ đỏ / Đoàn trường'
) {
  const tableRows: DocxTableRow[] = [];

  // Header row
  tableRows.push(
    new DocxTableRow({
      tableHeader: true,
      children: [
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 6, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'STT', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 14, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Ngày / Giờ', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 10, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Lớp', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 22, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Họ và tên học sinh', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 10, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Mã HS', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 20, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Lý do / Nội dung', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        }),
        new DocxTableCell({
          verticalAlign: DocxVerticalAlign.CENTER,
          width: { size: 18, type: DocxWidthType.PERCENTAGE },
          borders: tableBorders,
          shading: { fill: 'F3F4F6' },
          children: [
            new DocxParagraph({
              alignment: DocxAlignmentType.CENTER,
              children: [new DocxTextRun({ text: 'Người ghi nhận', bold: true, font: 'Times New Roman', size: 20 })]
            })
          ]
        })
      ]
    })
  );

  lateList.forEach((v, idx) => {
    tableRows.push(
      new DocxTableRow({
        children: [
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 6, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: `${idx + 1}`, font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 14, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                children: [
                  new DocxTextRun({ text: `${v.violationDate}`, font: 'Times New Roman', size: 20, bold: true }),
                  new DocxTextRun({ text: `\n${v.violationTime || ''} (${v.periodSlot || 'Sáng'})`, font: 'Times New Roman', size: 18, color: '666666' })
                ]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 10, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: v.className, bold: true, font: 'Times New Roman', size: 20, color: '1E3A8A' })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 22, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                children: [new DocxTextRun({ text: v.studentName, bold: true, font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 10, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                alignment: DocxAlignmentType.CENTER,
                children: [new DocxTextRun({ text: v.studentCode || '—', font: 'Times New Roman', size: 18 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 20, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                children: [new DocxTextRun({ text: v.content || 'Đi học muộn', font: 'Times New Roman', size: 20 })]
              })
            ]
          }),
          new DocxTableCell({
            verticalAlign: DocxVerticalAlign.CENTER,
            width: { size: 18, type: DocxWidthType.PERCENTAGE },
            borders: tableBorders,
            children: [
              new DocxParagraph({
                children: [new DocxTextRun({ text: v.recordedByName, font: 'Times New Roman', size: 18 })]
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
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1000 }
          }
        },
        children: [
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            children: [
              new DocxTextRun({
                text: 'ĐOÀN TNCS HỒ CHÍ MINH - TRƯỜNG THPT MINH HÒA',
                bold: true,
                font: 'Times New Roman',
                size: 20
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
            children: [
              new DocxTextRun({
                text: 'DANH SÁCH HỌC SINH ĐI HỌC MUỘN',
                bold: true,
                font: 'Times New Roman',
                size: 26,
                color: 'DC2626'
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new DocxTextRun({
                text: `${scopeTitle.toUpperCase()} - NĂM HỌC ${schoolYear} (Tổng số: ${lateList.length} em)`,
                bold: true,
                italics: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          }),
          new DocxTable({
            width: { size: 100, type: DocxWidthType.PERCENTAGE },
            rows: tableRows
          }),
          new DocxParagraph({
            spacing: { before: 360 },
            alignment: DocxAlignmentType.RIGHT,
            children: [
              new DocxTextRun({
                text: 'Minh Hòa, ngày ..... tháng ..... năm 2026',
                italics: true,
                font: 'Times New Roman',
                size: 20
              })
            ]
          }),
          new DocxParagraph({
            alignment: DocxAlignmentType.RIGHT,
            children: [
              new DocxTextRun({
                text: 'NGƯỜI LẬP DANH SÁCH / ĐỘI CỜ ĐỎ\n(Ký và ghi rõ họ tên)',
                bold: true,
                font: 'Times New Roman',
                size: 22
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await DocxPacker.toBlob(docx);
  const safeFileName = `Danh_Sach_Hoc_Sinh_Di_Muon_${scopeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  downloadBlob(blob, safeFileName);
}
