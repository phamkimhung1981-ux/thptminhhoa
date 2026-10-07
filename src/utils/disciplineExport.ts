import * as XLSX from 'xlsx';
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
import { Teacher, Department, DisciplineRecord } from '../types';
import { EvaluationSessionData } from '../components/discipline/EvaluationDetailModal';
import { safeFormatLocale } from './dateUtils';
import { removeVietnameseTones, formatMonthCode } from './evaluationExport';

/**
 * Trình tải workbook Excel an toàn
 */
function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    }, 250);
  } catch (err) {
    console.warn('Fallback XLSX.writeFile:', err);
    XLSX.writeFile(workbook, fileName);
  }
}

/**
 * Xuất danh sách các phiếu đánh giá Nền nếp & Nội quy ra file Excel (.xlsx)
 */
export function exportDisciplineSessionsToExcel({
  sessions,
  teachers,
  departments,
  titleText = 'BÁO CÁO ĐÁNH GIÁ NỀN NẾP & NỘI QUY',
  fileNamePrefix = 'Phieu_Danh_Gia_Nen_Nep_Noi_Quy'
}: {
  sessions: EvaluationSessionData[];
  teachers: Teacher[];
  departments: Department[];
  titleText?: string;
  fileNamePrefix?: string;
}) {
  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getDeptName = (deptId: string, teacher?: Teacher) => {
    if (teacher) {
      const dept = departments.find(d => d.id === teacher.departmentId);
      if (dept) return dept.name;
    }
    const dept = departments.find(d => d.id === deptId);
    if (dept) return dept.name;
    if (deptId === 'd_van_phong' || deptId === 'van_phong' || deptId === 'vp') return 'Tổ Văn phòng';
    return 'Chưa phân tổ';
  };

  // Trang 1: Tổng hợp danh sách phiếu
  const summaryRows: any[] = [];
  summaryRows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÀO CAI']);
  summaryRows.push(['TRƯỜNG THPT SƠN LƯƠNG']);
  summaryRows.push([]);
  summaryRows.push([titleText.toUpperCase()]);
  summaryRows.push([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`]);
  summaryRows.push([]);

  const summaryHeaders = [
    'STT',
    'Mã CBGVNV',
    'Họ và tên CBGVNV',
    'Chức vụ / Vị trí',
    'Tổ chuyên môn / Văn phòng',
    'Ngày đánh giá',
    'Số lượng tiêu chí ghi nhận',
    'Danh sách các tiêu chí',
    'Nhận xét chung TTCM',
    'Nhận xét chỉ đạo BGH',
    'Trạng thái phê duyệt'
  ];
  summaryRows.push(summaryHeaders);

  let countBghComment = 0;
  let countTtcmComment = 0;

  sessions.forEach((s, idx) => {
    const teacher = getTeacher(s.teacherId);
    const deptName = getDeptName(s.departmentId, teacher);

    const criteriaList = s.evaluations.map(e => e.criteria).join('; ');
    const hasTtcmNote = Boolean(s.ttcmGeneralNote?.trim() || s.note?.trim());
    const hasBghNote = Boolean(s.bghGeneralNote?.trim());

    if (hasTtcmNote) countTtcmComment++;
    if (hasBghNote) countBghComment++;

    let statusText = 'Đã có nhận xét TTCM';
    if (hasBghNote) {
      statusText = 'Đã có chỉ đạo BGH';
    } else if (!hasTtcmNote) {
      statusText = 'Chưa có nhận xét';
    }

    summaryRows.push([
      idx + 1,
      teacher?.code || '',
      teacher?.name || 'Không xác định',
      teacher?.position || teacher?.role || 'Giáo viên',
      deptName,
      safeFormatLocale(s.date, 'toLocaleDateString', s.date),
      s.evaluations.length,
      criteriaList,
      s.ttcmGeneralNote || s.note || '',
      s.bghGeneralNote || '',
      statusText
    ]);
  });

  // Dòng thống kê tổng
  summaryRows.push([]);
  summaryRows.push([
    'TỔNG HỢP:',
    `Tổng số phiếu: ${sessions.length}`,
    '',
    '',
    '',
    '',
    `Số phiếu có nhận xét TTCM: ${countTtcmComment}`,
    '',
    `Số phiếu có nhận xét BGH: ${countBghComment}`,
    '',
    ''
  ]);

  summaryRows.push([]);
  summaryRows.push(['', '', 'NGƯỜI LẬP BÁO CÁO', '', '', '', 'TỔ TRƯỞNG CHUYÊN MÔN', '', 'BAN GIÁM HIỆU']);
  summaryRows.push(['', '', '(Ký và ghi rõ họ tên)', '', '', '', '(Ký và ghi rõ họ tên)', '', '(Ký, đóng dấu)']);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã
    { wch: 25 }, // Tên
    { wch: 18 }, // Chức vụ
    { wch: 22 }, // Tổ
    { wch: 14 }, // Ngày
    { wch: 10 }, // Số tiêu chí
    { wch: 40 }, // Tiêu chí
    { wch: 35 }, // Nhận xét TTCM
    { wch: 35 }, // Nhận xét BGH
    { wch: 20 }, // Trạng thái
  ];

  // Trang 2: Chi tiết từng tiêu chí nền nếp
  const detailRows: any[] = [];
  detailRows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÀO CAI']);
  detailRows.push(['TRƯỜNG THPT SƠN LƯƠNG']);
  detailRows.push([]);
  detailRows.push(['CHI TIẾT NHẬN XÉT TỪNG TIÊU CHÍ NỀN NẾP & NỘI QUY']);
  detailRows.push([]);

  detailRows.push([
    'STT',
    'Mã CBGVNV',
    'Họ và tên',
    'Tổ chuyên môn / Văn phòng',
    'Ngày đánh giá',
    'Tên tiêu chí nền nếp',
    'Nhận xét chi tiết TTCM',
    'Nhận xét chỉ đạo BGH'
  ]);

  let detailIdx = 1;
  sessions.forEach((s) => {
    const teacher = getTeacher(s.teacherId);
    const deptName = getDeptName(s.departmentId, teacher);

    s.evaluations.forEach((ev) => {
      detailRows.push([
        detailIdx++,
        teacher?.code || '',
        teacher?.name || 'Không xác định',
        deptName,
        safeFormatLocale(s.date, 'toLocaleDateString', s.date),
        ev.criteria,
        ev.ttcmComment || '',
        ev.bghComment || ''
      ]);
    });
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã
    { wch: 25 }, // Tên
    { wch: 22 }, // Tổ
    { wch: 14 }, // Ngày
    { wch: 35 }, // Tiêu chí
    { wch: 40 }, // Nhận xét TTCM
    { wch: 40 }, // Nhận xét BGH
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tong_Hop_Phieu');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi_Tiet_Tieu_Chi');

  const nowStr = new Date().toISOString().split('T')[0];
  const fileName = `${fileNamePrefix}_${nowStr}.xlsx`;

  saveWorkbook(workbook, fileName);
}

/**
 * Xuất 1 hoặc nhiều Phiếu Đánh Giá Nền Nếp & Nội Quy ra file Word (.docx)
 */
export async function exportDisciplineSessionToDocx({
  session,
  teacher,
  department
}: {
  session: EvaluationSessionData;
  teacher?: Teacher;
  department?: Department;
}): Promise<{ success: boolean; fileName: string; error?: any }> {
  try {
    const teacherName = teacher?.name || 'Chưa xác định';
    const teacherCode = teacher?.code || 'CBGV';
    const deptName = department?.name || 'Tổ chuyên môn';
    const position = teacher?.position || teacher?.role || 'Cán bộ / Giáo viên / Nhân viên';
    const evalDate = safeFormatLocale(session.date, 'toLocaleDateString', session.date);

    const cleanTeacherName = removeVietnameseTones(teacherName);
    const fileName = `Phieu_Danh_Gia_Nen_Nep_${cleanTeacherName}_${session.date}.docx`;

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

    // Table Quốc hiệu
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
                  children: [new TextRun({ text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO LÀO CAI', size: 19 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'TRƯỜNG THPT SƠN LƯƠNG', bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '-----------------------', size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4800, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 19 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '-----------------------', size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Bảng tiêu chí đánh giá
    const criteriaTableRows: TableRow[] = [
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
            width: { size: 3000, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'NỘI DUNG TIÊU CHÍ NỀN NẾP', bold: true, size: 19 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'NHẬN XÉT CỦA TTCM', bold: true, size: 19 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'NHẬN XÉT CỦA BGH', bold: true, size: 19 })],
              }),
            ],
          }),
        ],
      }),
    ];

    session.evaluations.forEach((ev, index) => {
      criteriaTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${index + 1}`, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ev.criteria, bold: true, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ev.ttcmComment || '(Chưa có nhận xét)', size: 18, italics: !ev.ttcmComment })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ev.bghComment || '(Chưa có nhận xét)', size: 18, italics: !ev.bghComment })],
                }),
              ],
            }),
          ],
        })
      );
    });

    const criteriaTable = new Table({
      width: { size: 9600, type: WidthType.DXA },
      borders: tableBorders,
      rows: criteriaTableRows,
    });

    // Bảng chữ ký
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
                  children: [new TextRun({ text: 'CÁN BỘ ĐƯỢC ĐÁNH GIÁ', bold: true, size: 19 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 17 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: teacherName, bold: true, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3200, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'TỔ TRƯỞNG CHUYÊN MÔN', bold: true, size: 19 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 17 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Tổ trưởng chuyên môn', bold: true, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3200, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'BAN GIÁM HIỆU', bold: true, size: 19 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(Ký, đóng dấu, ghi rõ họ tên)', italics: true, size: 17 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n\n\n\n', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Ban Giám Hiệu', bold: true, size: 19 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

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
            new Paragraph({ text: '', spacing: { before: 150, after: 100 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 100, after: 60 },
              children: [
                new TextRun({
                  text: 'PHIẾU ĐÁNH GIÁ NỀN NẾP & NỘI QUY',
                  bold: true,
                  size: 26,
                  color: '0F172A',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 250 },
              children: [
                new TextRun({
                  text: `Thời gian ghi nhận: ${evalDate}`,
                  italics: true,
                  size: 20,
                  color: '334155',
                }),
              ],
            }),

            // Thông tin cá nhân
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({ text: 'I. THÔNG TIN CÁN BỘ ĐƯỢC ĐÁNH GIÁ', bold: true, size: 21, color: '1E293B' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: '• Họ và tên: ', bold: true, size: 19 }),
                new TextRun({ text: teacherName, bold: true, color: '1D4ED8', size: 19 }),
                new TextRun({ text: '        • Mã CBGVNV: ', bold: true, size: 19 }),
                new TextRun({ text: teacherCode, size: 19 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 150 },
              children: [
                new TextRun({ text: '• Chức vụ / Vị trí: ', bold: true, size: 19 }),
                new TextRun({ text: position, size: 19 }),
                new TextRun({ text: '        • Tổ chuyên môn/Văn phòng: ', bold: true, size: 19 }),
                new TextRun({ text: deptName, size: 19 }),
              ],
            }),

            // Bảng tiêu chí
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 150, after: 100 },
              children: [
                new TextRun({ text: 'II. NỘI DUNG ĐÁNH GIÁ VÀ NHẬN XÉT CỤ THỂ', bold: true, size: 21, color: '1E293B' }),
              ],
            }),
            criteriaTable,

            // Nhận xét chung
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({ text: 'III. NHẬN XẾT CHUNG TOÀN DIỆN', bold: true, size: 21, color: '1E293B' }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: '1. Nhận xét của Tổ trưởng chuyên môn: ', bold: true, size: 19 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 0, after: 100 },
              children: [
                new TextRun({
                  text: session.ttcmGeneralNote || session.note || '(Chưa có nhận xét chung)',
                  italics: !(session.ttcmGeneralNote || session.note),
                  size: 19,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: '2. Nhận xét & Chỉ đạo của Ban Giám Hiệu: ', bold: true, size: 19 }),
              ],
            }),
            new Paragraph({
              spacing: { before: 0, after: 200 },
              children: [
                new TextRun({
                  text: session.bghGeneralNote || '(Chưa có chỉ đạo của BGH)',
                  italics: !session.bghGeneralNote,
                  size: 19,
                }),
              ],
            }),

            // Chữ ký
            new Paragraph({
              spacing: { before: 200, after: 150 },
              children: [
                new TextRun({ text: 'Sơn Lương, ngày .... tháng .... năm 202...', italics: true, size: 18 }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
            signatureTable,
          ],
        },
      ],
    });

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
    console.error('Error exporting discipline session to docx:', error);
    return { success: false, fileName: '', error };
  }
}
