import { KpiVcForm } from '../types/kpiVc';
import { KpiCbqlForm } from '../types/kpiCbql';

/**
 * Loại bỏ dấu tiếng Việt để tạo tên file chuẩn
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Cấu trúc tên file theo yêu cầu: PHIEU_DANH_GIA_VIEN_CHUC_[HO_TEN]_[NAM_HOC].docx
 * Ví dụ: PHIEU_DANH_GIA_VIEN_CHUC_NGUYEN_VAN_A_2026-2027.docx
 */
export function generateWordFileName(name: string, academicYear: string): string {
  const cleanName = removeVietnameseAccents(name || 'CAN_BO').toUpperCase();
  const cleanYear = (academicYear || '2026-2027').replace(/[^a-zA-Z0-9-]/g, '');
  return `PHIEU_DANH_GIA_VIEN_CHUC_${cleanName}_${cleanYear}.docx`;
}

/**
 * Xuất Phiếu đánh giá KPI Giáo viên ra file Word (.docx)
 */
export const exportVcFormToWord = async (form: KpiVcForm): Promise<void> => {
  if (!form || !form.id) {
    alert('Vui lòng lưu phiếu trước khi xuất Word.');
    return;
  }

  try {
    const groupI = form.groupScores?.group_I ?? 0;
    const groupII = form.groupScores?.group_II ?? 0;
    const groupIII = form.groupScores?.group_III ?? 0;

    const ttcmGroupI = form.ttcmGroupScores?.group_I ?? '---';
    const ttcmGroupII = form.ttcmGroupScores?.group_II ?? '---';
    const ttcmGroupIII = form.ttcmGroupScores?.group_III ?? '---';

    const mgrGroupI = form.managerGroupScores?.group_I ?? '---';
    const mgrGroupII = form.managerGroupScores?.group_II ?? '---';
    const mgrGroupIII = form.managerGroupScores?.group_III ?? '---';

    const items = form.items || [];
    const groupIItems = items.filter(it => it.groupId === 'group_I');
    const groupIIItems = items.filter(it => it.groupId === 'group_II');
    const groupIIIItems = items.filter(it => it.groupId === 'group_III');

    const groupIIIaItems = groupIIIItems.filter(it => it.subGroup === 'A' || it.criterionCode.startsWith('III.A') || it.criterionCode === 'III.1');
    const groupIIIbItems = groupIIIItems.filter(it => it.subGroup === 'B' || it.criterionCode.startsWith('GV') || it.criterionCode.startsWith('III.B') || it.criterionCode === 'III.2');

    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>Phiếu đánh giá, chấm điểm viên chức</title>
      <!--[if gte mso 9]>
      <xml>
       <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
       </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 15mm 15mm 15mm 15mm;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-paper-source: 0;
        }
        div.WordSection1 {
          page: WordSection1;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.3;
          color: #000000;
        }
        p {
          margin-top: 2pt;
          margin-bottom: 2pt;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: none !important;
          margin-bottom: 12pt;
        }
        .header-table td {
          border: none !important;
          vertical-align: top;
          padding: 0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8pt;
          margin-bottom: 10pt;
        }
        table.data-table, table.data-table th, table.data-table td {
          border: 1px solid #000000;
        }
        table.data-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
          padding: 5pt 3pt;
          font-size: 11pt;
        }
        table.data-table td {
          padding: 4pt 3pt;
          font-size: 10.5pt;
          vertical-align: top;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          border: none !important;
          margin-top: 15pt;
        }
        .signature-table td {
          border: none !important;
          vertical-align: top;
          text-align: center;
          padding: 4pt;
        }
      </style>
      </head>
      <body>
      <div class="WordSection1">
        
        <!-- HEADER CƠ QUAN / QUỐC HUY -->
        <table class="header-table">
          <tr>
            <td style="width: 45%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 10.5pt;">SỞ GD&ĐT PHÚ THỌ</p>
              <p class="font-bold uppercase" style="font-size: 11.5pt;">TRƯỜNG THPT SƠN LƯƠNG</p>
              <div style="border-bottom: 1px solid black; width: 90px; margin: 2pt auto;"></div>
            </td>
            <td style="width: 55%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 10.5pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p class="font-bold" style="font-size: 11pt; text-decoration: underline;">Độc lập – Tự do – Hạnh phúc</p>
            </td>
          </tr>
        </table>

        <!-- TIÊU ĐỀ PHIẾU -->
        <div style="text-align: center; margin-top: 8pt; margin-bottom: 12pt;">
          <p class="font-bold uppercase" style="font-size: 13.5pt; margin: 0;">
            PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI GIÁO VIÊN NĂM HỌC ${form.academicYear || '2026–2027'}
          </p>
          <p class="italic" style="font-size: 11pt; margin-top: 2pt;">
            (Dự thảo vận hành – đề nghị nhà trường xác nhận trước khi ban hành)
          </p>
        </div>

        <!-- THÔNG TIN VIÊN CHỨC -->
        <div style="margin-bottom: 10pt; font-size: 11.5pt; line-height: 1.4;">
          <p><span class="font-bold">Họ và tên:</span> ${form.employeeName || ''}</p>
          <p><span class="font-bold">Chức vụ / môn:</span> ${form.position || 'Giáo viên'} ${form.subject ? `• Môn ${form.subject}` : ''}</p>
          <p><span class="font-bold">Tổ chuyên môn:</span> ${form.department || 'Trường THPT Sơn Lương'}</p>
          <p><span class="font-bold">Tổ trưởng chuyên môn đánh giá:</span> ${form.ttcmEvaluatorName || '....................'} &nbsp;&nbsp;&nbsp;&nbsp; <span class="font-bold">Tổ:</span> ${form.ttcmEvaluatorDepartment || form.department || '....................'}</p>
          <p><span class="font-bold">Ban Giám hiệu đánh giá:</span> ${form.bghEvaluatorName || form.evaluatorName || '....................'} &nbsp;&nbsp;&nbsp;&nbsp; <span class="font-bold">Chức vụ:</span> ${form.bghEvaluatorRole || form.evaluatorRole || 'Ban Giám hiệu'}</p>
        </div>

        <!-- CĂN CỨ MẪU PHIẾU -->
        <p style="font-size: 10.5pt; text-align: justify; margin-bottom: 10pt; font-style: italic; line-height: 1.35;">
          Căn cứ mẫu Phiếu đánh giá, chấm điểm năm học 2025–2026 của Trường THPT Sơn Lương, phiếu này giữ cấu trúc 100 điểm gồm: (I) Chính trị tư tưởng, đạo đức lối sống 15 điểm; (II) Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật 15 điểm; (III) Kết quả thực hiện nhiệm vụ 70 điểm. Các nhiệm vụ ở phần III được chi tiết hóa để thuận lợi cho tự đánh giá, đánh giá của tổ chuyên môn và BGH. Các mức điểm KPI chi tiết dưới đây là đề xuất quản trị nội bộ, cần được nhà trường xác nhận trước khi áp dụng chính thức.
        </p>

        <p class="font-bold uppercase" style="font-size: 11.5pt; margin-bottom: 4pt;">A. NỘI DUNG CHẤM ĐIỂM</p>

        <!-- BẢNG ĐÁNH GIÁ TIÊU CHÍ KPI (7 CỘT) -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25pt;">STT</th>
              <th style="text-align: left;">NỘI DUNG ĐÁNH GIÁ</th>
              <th style="width: 40pt;">ĐIỂM TỐI ĐA</th>
              <th style="width: 55pt;">GIÁO VIÊN TỰ CHẤM</th>
              <th style="width: 55pt;">TTCM ĐÁNH GIÁ</th>
              <th style="width: 55pt;">CBQL ĐÁNH GIÁ</th>
              <th style="width: 65pt;">NHẬN XÉT</th>
            </tr>
          </thead>
          <tbody>
            
            <!-- NHÓM I -->
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td class="text-center font-bold">I</td>
              <td class="font-bold uppercase">CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG</td>
              <td class="text-center font-bold">15</td>
              <td class="text-center font-bold">${groupI}</td>
              <td class="text-center font-bold">${ttcmGroupI}</td>
              <td class="text-center font-bold">${mgrGroupI}</td>
              <td></td>
            </tr>
            ${groupIItems.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.content || ''}</td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.ttcmScore !== undefined && item.ttcmScore !== null ? item.ttcmScore : ''}</td>
                <td class="text-center font-bold">${item.managerScore !== undefined && item.managerScore !== null ? item.managerScore : ''}</td>
                <td style="font-size: 10pt;">${item.note || ''}</td>
              </tr>
            `).join('')}

            <!-- NHÓM II -->
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td class="text-center font-bold">II</td>
              <td class="font-bold uppercase">TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT</td>
              <td class="text-center font-bold">15</td>
              <td class="text-center font-bold">${groupII}</td>
              <td class="text-center font-bold">${ttcmGroupII}</td>
              <td class="text-center font-bold">${mgrGroupII}</td>
              <td></td>
            </tr>
            ${groupIIItems.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.content || ''}</td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.ttcmScore !== undefined && item.ttcmScore !== null ? item.ttcmScore : ''}</td>
                <td class="text-center font-bold">${item.managerScore !== undefined && item.managerScore !== null ? item.managerScore : ''}</td>
                <td style="font-size: 10pt;">${item.note || ''}</td>
              </tr>
            `).join('')}

            <!-- NHÓM III -->
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td class="text-center font-bold">III</td>
              <td class="font-bold uppercase">KẾT QUẢ THỰC HIỆN NHIỆM VỤ</td>
              <td class="text-center font-bold">70</td>
              <td class="text-center font-bold">${groupIII}</td>
              <td class="text-center font-bold">${ttcmGroupIII}</td>
              <td class="text-center font-bold">${mgrGroupIII}</td>
              <td></td>
            </tr>

            <!-- III.A -->
            <tr style="background-color: #fafafa; font-weight: bold;">
              <td class="text-center">A</td>
              <td class="font-bold">A. NĂNG LỰC VÀ KỸ NĂNG LÀM VIỆC</td>
              <td class="text-center font-bold">10</td>
              <td class="text-center font-bold">${groupIIIaItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}</td>
              <td class="text-center font-bold">${groupIIIaItems.some(i => i.ttcmScore != null) ? groupIIIaItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0) : ''}</td>
              <td class="text-center font-bold">${groupIIIaItems.some(i => i.managerScore != null) ? groupIIIaItems.reduce((acc, i) => acc + (i.managerScore || 0), 0) : ''}</td>
              <td></td>
            </tr>
            ${groupIIIaItems.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.content || ''}</td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.ttcmScore !== undefined && item.ttcmScore !== null ? item.ttcmScore : ''}</td>
                <td class="text-center font-bold">${item.managerScore !== undefined && item.managerScore !== null ? item.managerScore : ''}</td>
                <td style="font-size: 10pt;">${item.note || ''}</td>
              </tr>
            `).join('')}

            <!-- III.B -->
            <tr style="background-color: #fafafa; font-weight: bold;">
              <td class="text-center">2</td>
              <td class="font-bold">II. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (60 ĐIỂM)</td>
              <td class="text-center font-bold">60</td>
              <td class="text-center font-bold">${groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}</td>
              <td class="text-center font-bold">${groupIIIbItems.some(i => i.ttcmScore != null) ? groupIIIbItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0) : ''}</td>
              <td class="text-center font-bold">${groupIIIbItems.some(i => i.managerScore != null) ? groupIIIbItems.reduce((acc, i) => acc + (i.managerScore || 0), 0) : ''}</td>
              <td></td>
            </tr>
            ${groupIIIbItems.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.content || ''}</td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.ttcmScore !== undefined && item.ttcmScore !== null ? item.ttcmScore : ''}</td>
                <td class="text-center font-bold">${item.managerScore !== undefined && item.managerScore !== null ? item.managerScore : ''}</td>
                <td style="font-size: 10pt;">${item.note || ''}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <td></td>
              <td class="font-bold uppercase">Tổng mục II: ${groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}/60 điểm</td>
              <td class="text-center font-bold">60</td>
              <td class="text-center font-bold">${groupIIIbItems.reduce((acc, i) => acc + (i.selfScore || 0), 0)}/60</td>
              <td class="text-center font-bold">${groupIIIbItems.some(i => i.ttcmScore != null) ? `${groupIIIbItems.reduce((acc, i) => acc + (i.ttcmScore || 0), 0)}/60` : ''}</td>
              <td class="text-center font-bold">${groupIIIbItems.some(i => i.managerScore != null) ? `${groupIIIbItems.reduce((acc, i) => acc + (i.managerScore || 0), 0)}/60` : ''}</td>
              <td></td>
            </tr>

            <!-- TỔNG ĐIỂM -->
            <tr style="font-weight: bold; background-color: #e6e6e6;">
              <td colspan="2" class="font-bold uppercase">TỔNG ĐIỂM TỐI ĐA</td>
              <td class="text-center font-bold">100/100</td>
              <td class="text-center font-bold">100/100</td>
              <td class="text-center font-bold">100/100</td>
              <td class="text-center font-bold">100/100</td>
              <td></td>
            </tr>
            <tr style="font-weight: bold;">
              <td colspan="3" class="font-bold uppercase">TỔNG GIÁO VIÊN TỰ CHẤM</td>
              <td colspan="3" class="text-center font-bold">${form.totalScore}/100</td>
              <td></td>
            </tr>
            <tr style="font-weight: bold;">
              <td colspan="3" class="font-bold uppercase">TỔNG TTCM ĐÁNH GIÁ</td>
              <td colspan="3" class="text-center font-bold">${form.ttcmTotalScore !== null && form.ttcmTotalScore !== undefined ? `${form.ttcmTotalScore}/100` : '___/100'}</td>
              <td></td>
            </tr>
            <tr style="font-weight: bold;">
              <td colspan="3" class="font-bold uppercase">TỔNG CBQL ĐÁNH GIÁ</td>
              <td colspan="3" class="text-center font-bold">${form.managerTotalScore !== null && form.managerTotalScore !== undefined ? `${form.managerTotalScore}/100` : '___/100'}</td>
              <td></td>
            </tr>
            <tr style="font-weight: bold; background-color: #d9edf7;">
              <td colspan="3" class="font-bold uppercase">ĐIỂM ĐÁNH GIÁ CUỐI CÙNG</td>
              <td colspan="3" class="text-center font-bold">${form.managerTotalScore !== null && form.managerTotalScore !== undefined ? form.managerTotalScore : (form.ttcmTotalScore !== null && form.ttcmTotalScore !== undefined ? form.ttcmTotalScore : form.totalScore)}/100</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <!-- QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT -->
        <div style="margin-top: 12pt; margin-bottom: 10pt; font-size: 10.5pt;">
          <p class="font-bold uppercase" style="font-size: 11pt; margin-bottom: 4pt;">QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT</p>
          <ol style="margin-top: 2pt; margin-bottom: 4pt; padding-left: 18pt; line-height: 1.35;">
            <li>Giáo viên tự chấm dựa trên kết quả thực hiện thực tế và minh chứng; không tự chấm chỉ dựa vào cảm nhận.</li>
            <li>Mỗi nhiệm vụ được chấm trong phạm vi điểm tối đa của dòng đó; không cộng vượt 100 điểm.</li>
            <li>Nhiệm vụ không được giao hoặc không phát sinh theo vị trí việc làm được đánh dấu “N/A – Không áp dụng”, không quy về 0 điểm; tổng điểm được chuẩn hóa theo các nhiệm vụ áp dụng.</li>
            <li>Kết quả học tập của học sinh chỉ là một nguồn minh chứng cho chất lượng và sự tiến bộ, không sử dụng điểm thi/điểm trung bình của học sinh làm tiêu chí duy nhất để quy trách nhiệm cho giáo viên.</li>
            <li>Nhiệm vụ chủ nhiệm/kiêm nhiệm chỉ áp dụng đối với giáo viên được phân công.</li>
            <li>Khi có vi phạm nghiêm trọng, việc xử lý điểm phải căn cứ quy định của nhà trường và quy định hiện hành; không tự động suy diễn từ một chỉ số đơn lẻ.</li>
          </ol>
        </div>

        <!-- GỢI Ý XẾP LOẠI KPI NỘI BỘ -->
        <div style="margin-top: 10pt; margin-bottom: 12pt; font-size: 10.5pt;">
          <p class="font-bold uppercase" style="font-size: 11pt; margin-bottom: 4pt;">Gợi ý xếp loại KPI nội bộ (CẦN NHÀ TRƯỜNG XÁC NHẬN)</p>
          <table style="width: 70%; border-collapse: collapse; border: 1px solid black; margin-bottom: 8pt;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold;">
                <td style="border: 1px solid black; padding: 4pt; text-align: left; width: 50%;">Tổng điểm KPI</td>
                <td style="border: 1px solid black; padding: 4pt; text-align: left;">Mức xếp loại đề xuất</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid black; padding: 4pt;">Dưới 70</td>
                <td style="border: 1px solid black; padding: 4pt;">Chưa hoàn thành</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 4pt;">70 đến dưới 85</td>
                <td style="border: 1px solid black; padding: 4pt;">Hoàn thành</td>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 4pt;">85 đến dưới 95</td>
                <td style="border: 1px solid black; padding: 4pt;">Hoàn thành tốt</td>
              </tr>
              <tr style="font-weight: bold;">
                <td style="border: 1px solid black; padding: 4pt;">95 đến 100</td>
                <td style="border: 1px solid black; padding: 4pt;">Hoàn thành xuất sắc</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 8pt; margin-bottom: 12pt; font-size: 11pt;">
          <p><span class="font-bold">Cá nhân tự xếp loại:</span> ${form.selfClassification || '....................................................'}</p>
          <p style="text-align: right; font-style: italic; margin-top: 10pt;">
            ............, ngày ...... tháng ...... năm 2026
          </p>
        </div>

        <!-- BẢNG 3 CHỮ KÝ XÁC NHẬN Ở CUỐI PHIẾU (NGƯỜI TỰ ĐÁNH GIÁ, TỔ CHUYÊN MÔN, NGƯỜI CÓ THẨM QUYỀN PHÊ DUYỆT) -->
        <table class="signature-table" style="margin-top: 15pt;">
          <tr>
            <td style="width: 33.3%;">
              <p class="font-bold uppercase" style="font-size: 10.5pt;">NGƯỜI TỰ ĐÁNH GIÁ</p>
              <p class="italic" style="font-size: 9.5pt;">(Ký, ghi rõ họ tên)</p>
              <br/><br/><br/><br/>
              <p class="font-bold" style="font-size: 11pt;">${form.employeeName}</p>
            </td>

            <td style="width: 33.3%;">
              <p class="font-bold uppercase" style="font-size: 10.5pt;">TỔ TRƯỞNG CHUYÊN MÔN</p>
              <p class="italic" style="font-size: 9.5pt;">(Ký, ghi rõ họ tên)</p>
              <br/><br/><br/><br/>
              <p class="font-bold" style="font-size: 11pt;">${form.ttcmEvaluatorName || '...............................'}</p>
            </td>

            <td style="width: 33.3%;">
              <p class="font-bold uppercase" style="font-size: 10.5pt;">BAN GIÁM HIỆU PHÊ DUYỆT</p>
              <p class="font-bold uppercase" style="font-size: 10.5pt;">DUYỆT</p>
              <p class="italic" style="font-size: 9.5pt;">(Ký, ghi rõ họ tên)</p>
              <br/><br/><br/>
              <p class="font-bold" style="font-size: 11pt;">${form.bghEvaluatorName || form.evaluatorName || '...............................'}</p>
            </td>
          </tr>
        </table>

      </div>
      </body>
      </html>
    `;

    const fileName = generateWordFileName(form.employeeName, form.academicYear);
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi xuất Word KPI Viên chức:', error);
    alert('Đã có lỗi xảy ra khi tạo file Word: ' + (error instanceof Error ? error.message : 'Không xác định'));
  }
};

/**
 * Xuất Phiếu đánh giá KPI Cán bộ Quản lý (CBQL) ra file Word (.doc)
 */
export const exportCbqlFormToWord = async (form: KpiCbqlForm): Promise<void> => {
  if (!form || !form.id) {
    alert('Vui lòng lưu phiếu trước khi xuất Word.');
    return;
  }

  try {
    const items = form.items || [];
    const groupIItems = items.filter(it => it.groupId === 'group_I');
    const groupIIItems = items.filter(it => it.groupId === 'group_II');
    const groupIIIItems = items.filter(it => it.groupId === 'group_III');

    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>Phiếu đánh giá KPI CBQL</title>
      <!--[if gte mso 9]>
      <xml>
       <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
       </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 20mm 20mm 20mm 20mm;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-paper-source: 0;
        }
        div.WordSection1 {
          page: WordSection1;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13pt;
          line-height: 1.35;
          color: #000000;
        }
        p {
          margin-top: 3pt;
          margin-bottom: 3pt;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: none !important;
          margin-bottom: 15pt;
        }
        .header-table td {
          border: none !important;
          vertical-align: top;
          padding: 0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10pt;
          margin-bottom: 12pt;
        }
        table.data-table, table.data-table th, table.data-table td {
          border: 1px solid #000000;
        }
        table.data-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
          padding: 6pt 4pt;
          font-size: 12pt;
        }
        table.data-table td {
          padding: 5pt 4pt;
          font-size: 11.5pt;
          vertical-align: top;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          border: none !important;
          margin-top: 15pt;
        }
        .signature-table td {
          border: none !important;
          vertical-align: top;
          text-align: center;
        }
      </style>
      </head>
      <body>
      <div class="WordSection1">
        
        <!-- HEADER CƠ QUAN -->
        <table class="header-table">
          <tr>
            <td style="width: 45%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 11pt;">SỞ GD&ĐT TỈNH PHÚ THỌ</p>
              <p class="font-bold uppercase" style="font-size: 12pt;">TRƯỜNG THPT SƠN LƯƠNG</p>
              <div style="border-bottom: 1px solid black; width: 100px; margin: 2pt auto;"></div>
            </td>
            <td style="width: 55%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p class="font-bold" style="font-size: 11pt; text-decoration: underline;">Độc lập – Tự do – Hạnh phúc</p>
            </td>
          </tr>
        </table>

        <!-- TIÊU ĐỀ PHIẾU -->
        <div style="text-align: center; margin-top: 10pt; margin-bottom: 15pt;">
          <p class="font-bold uppercase" style="font-size: 14pt; margin: 0;">
            PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI CÁN BỘ QUẢN LÝ
          </p>
          <p class="font-bold" style="font-size: 13pt; margin-top: 3pt;">
            ${form.periodName} - NĂM HỌC ${form.academicYear}
          </p>
        </div>

        <!-- THÔNG TIN CBQL -->
        <div style="margin-bottom: 12pt; font-size: 13pt;">
          <p><span class="font-bold">Họ và tên người được đánh giá:</span> ${form.evaluateeName}</p>
          <p><span class="font-bold">Chức vụ:</span> ${form.evaluateePosition}</p>
          <p><span class="font-bold">Đơn vị:</span> ${form.evaluateeDepartmentName || 'Trường THPT Sơn Lương'}</p>
          <p><span class="font-bold">Người đánh giá (Thủ trưởng):</span> ${form.evaluatorName} - ${form.evaluatorPosition}</p>
        </div>

        <!-- BẢNG ĐÁNH GIÁ TIÊU CHÍ -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40pt;">Mã TC</th>
              <th style="text-align: left;">Tên Tiêu Chí & Nội dung đánh giá</th>
              <th style="width: 50pt;">Mức tối đa</th>
              <th style="width: 65pt;">Tự đánh giá</th>
              <th style="width: 70pt;">Thủ trưởng chấm</th>
            </tr>
          </thead>
          <tbody>
            
            <!-- NHÓM I -->
            <tr style="background-color: #f2f2f2;">
              <td class="text-center font-bold">I</td>
              <td class="font-bold">CHÍNH TRỊ TƯ TƯỞNG, ĐẠO ĐỨC LỐI SỐNG</td>
              <td class="text-center font-bold">15</td>
              <td class="text-center font-bold">${form.selfGroupScores?.group_I || 0}</td>
              <td class="text-center font-bold">${form.evaluatorGroupScores?.group_I || 0}</td>
            </tr>
            ${groupIItems.map(item => `
              <tr>
                <td class="text-center font-bold">${item.criterionCode}</td>
                <td>
                  <p class="font-bold">${item.criterionName}</p>
                  ${item.selfLevelLabel ? `<p class="italic" style="font-size: 10.5pt; color: #444444;">- Chọn: ${item.selfLevelLabel}</p>` : ''}
                </td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.evaluatorScore}</td>
              </tr>
            `).join('')}

            <!-- NHÓM II -->
            <tr style="background-color: #f2f2f2;">
              <td class="text-center font-bold">II</td>
              <td class="font-bold">TÁC PHONG, LỀ LỐI LÀM VIỆC, Ý THỨC TỔ CHỨC KỶ LUẬT</td>
              <td class="text-center font-bold">15</td>
              <td class="text-center font-bold">${form.selfGroupScores?.group_II || 0}</td>
              <td class="text-center font-bold">${form.evaluatorGroupScores?.group_II || 0}</td>
            </tr>
            ${groupIIItems.map(item => `
              <tr>
                <td class="text-center font-bold">${item.criterionCode}</td>
                <td>
                  <p class="font-bold">${item.criterionName}</p>
                  ${item.selfLevelLabel ? `<p class="italic" style="font-size: 10.5pt; color: #444444;">- Chọn: ${item.selfLevelLabel}</p>` : ''}
                </td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.evaluatorScore}</td>
              </tr>
            `).join('')}

            <!-- NHÓM III -->
            <tr style="background-color: #f2f2f2;">
              <td class="text-center font-bold">III</td>
              <td class="font-bold">KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO</td>
              <td class="text-center font-bold">70</td>
              <td class="text-center font-bold">${form.selfGroupScores?.group_III || 0}</td>
              <td class="text-center font-bold">${form.evaluatorGroupScores?.group_III || 0}</td>
            </tr>
            ${groupIIIItems.map(item => `
              <tr>
                <td class="text-center font-bold">${item.criterionCode}</td>
                <td>
                  <p class="font-bold">${item.criterionName}</p>
                  ${item.selfLevelLabel ? `<p class="italic" style="font-size: 10.5pt; color: #444444;">- Chọn: ${item.selfLevelLabel}</p>` : ''}
                </td>
                <td class="text-center">${item.maxScore}</td>
                <td class="text-center font-bold">${item.selfScore}</td>
                <td class="text-center font-bold">${item.evaluatorScore}</td>
              </tr>
            `).join('')}

            <!-- TỔNG ĐIỂM -->
            <tr style="font-weight: bold; background-color: #e6f0fa;">
              <td colspan="2" class="text-center uppercase font-bold">TỔNG ĐIỂM ĐÁNH GIÁ</td>
              <td class="text-center font-bold">100</td>
              <td class="text-center font-bold">${form.selfTotalScore || 0}</td>
              <td class="text-center font-bold">${form.evaluatorTotalScore || 0}</td>
            </tr>
          </tbody>
        </table>

        <!-- NHẬN XÉT CÁ NHÂN & THỦ TRƯỞNG -->
        <div style="margin-top: 10pt;">
          <p><span class="font-bold">Xếp loại kết quả:</span> ${form.grade || 'Chưa xếp loại'}</p>
          ${form.selfComment ? `<p><span class="font-bold">Tự nhận xét của CBQL:</span> ${form.selfComment}</p>` : ''}
          ${form.evaluatorComment ? `<p><span class="font-bold">Nhận xét của Thủ trưởng:</span> ${form.evaluatorComment}</p>` : ''}
        </div>

        <!-- CHỮ KÝ -->
        <table class="signature-table">
          <tr>
            <td style="width: 50%;">
              <p class="font-bold uppercase">NGƯỜI TỰ ĐÁNH GIÁ</p>
              <p class="italic" style="font-size: 10pt;">(Ký và ghi rõ họ tên)</p>
              <br/><br/><br/>
              <p class="font-bold">${form.evaluateeName}</p>
            </td>
            <td style="width: 50%;">
              <p class="italic">Sơn Lương, ngày .... tháng .... năm 2026</p>
              <p class="font-bold uppercase">THỦ TRƯỞNG ĐÁNH GIÁ</p>
              <p class="italic" style="font-size: 10pt;">(Ký, ghi rõ họ tên và đóng dấu)</p>
              <br/><br/><br/>
              <p class="font-bold">${form.evaluatorName}</p>
            </td>
          </tr>
        </table>

      </div>
      </body>
      </html>
    `;

    const fileName = generateWordFileName(form.evaluateeName, form.academicYear);
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi xuất Word KPI CBQL:', error);
    alert('Đã có lỗi xảy ra khi tạo file Word: ' + (error instanceof Error ? error.message : 'Không xác định'));
  }
};
