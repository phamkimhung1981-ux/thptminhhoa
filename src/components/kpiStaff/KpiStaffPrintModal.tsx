import React from 'react';
import { KpiStaffForm } from '../../types/kpiStaff';
import { POSITION_CONFIGS } from '../../lib/kpiStaffData';
import { Printer, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  form: KpiStaffForm | null;
}

export default function KpiStaffPrintModal({ isOpen, onClose, form }: Props) {
  if (!isOpen || !form) return null;

  const posConfig = POSITION_CONFIGS[form.positionKey] || POSITION_CONFIGS.KE_TOAN;
  const finalScore = form.managerTotalScore ?? form.totalScore;
  const finalClassification = form.leaderClassification || form.selfClassification;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Printable Action Header */}
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between text-white print:hidden shrink-0">
          <span className="text-xs font-bold text-slate-300">Xem trước bản in Phiếu đánh giá KPI Nhân viên</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <Printer size={15} /> In phiếu ngay
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Paper Document Preview */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 font-serif leading-relaxed space-y-6">
          
          {/* Header School */}
          <div className="text-center space-y-1">
            <h3 className="font-bold text-sm uppercase tracking-wide">SỞ GD&ĐT PHÚ THỌ</h3>
            <h3 className="font-bold text-sm uppercase tracking-wide border-b-2 border-slate-900 pb-1 inline-block">TRƯỜNG THPT MINH HÒA</h3>
            <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 pt-3">
              PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI NHÂN VIÊN
            </h1>
            <p className="text-xs italic font-sans text-slate-600">
              Năm học {form.academicYear || '2026–2027'} – Dự thảo vận hành
            </p>
          </div>

          {/* Info Block */}
          <div className="border border-slate-300 rounded p-4 text-xs font-sans space-y-1">
            <p><strong>Họ và tên:</strong> ................................................................ <span className="font-bold text-slate-900">{form.employeeName}</span></p>
            <p><strong>Chức danh/vị trí việc làm:</strong> ................................... <span className="font-bold text-slate-900">{form.position || posConfig.positionName}</span></p>
            <p><strong>Bộ phận/Tổ văn phòng:</strong> ............................................ <span className="font-bold text-slate-900">{form.department || 'Tổ văn phòng'}</span></p>
            <p><strong>Người đánh giá:</strong> ........................................................ <span className="font-bold text-slate-900">{form.evaluatorName || 'TTVP/BGH'}</span></p>
            <p className="text-[11px] italic text-slate-600 pt-1">
              <strong>Cấu trúc điểm:</strong> 30 điểm KPI chung + 70 điểm KPI theo đúng vị trí việc làm. Chỉ kích hoạt một bộ KPI vị trí cho mỗi nhân viên.
            </p>
          </div>

          {/* Section A: 30 ĐIỂM KPI CHUNG */}
          <div className="font-sans text-xs space-y-2">
            <h3 className="font-bold text-sm text-slate-900 uppercase">A. KPI CHUNG – 30 ĐIỂM</h3>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="p-2 border border-slate-300 w-16 text-center">Mã KPI</th>
                  <th className="p-2 border border-slate-300 text-left">Nội dung đánh giá / nhiệm vụ</th>
                  <th className="p-2 border border-slate-300 w-20 text-center">Điểm tối đa</th>
                  <th className="p-2 border border-slate-300 w-20 text-center">Cá nhân tự chấm</th>
                  <th className="p-2 border border-slate-300 text-left">Minh chứng / ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {form.generalItems.map(item => (
                  <tr key={item.code}>
                    <td className="p-2 border border-slate-300 text-center font-bold">{item.code}</td>
                    <td className="p-2 border border-slate-300">{item.content}</td>
                    <td className="p-2 border border-slate-300 text-center">{item.maxScore}</td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-emerald-800">{item.selfScore}</td>
                    <td className="p-2 border border-slate-300 text-slate-600">{item.evidence || ''}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={2} className="p-2 border border-slate-300">TỔNG KPI CHUNG</td>
                  <td className="p-2 border border-slate-300 text-center">30</td>
                  <td className="p-2 border border-slate-300 text-center text-emerald-800">{form.generalTotalSelf}</td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section B: 70 ĐIỂM KPI VỊ TRÍ VIỆC LÀM */}
          <div className="font-sans text-xs space-y-2 pt-2">
            <h3 className="font-bold text-sm text-slate-900 uppercase">{posConfig.title}</h3>
            <p className="text-[11px] italic text-slate-600">Chỉ áp dụng khi nhân viên được phân công đúng vị trí này. Điểm tối đa của bộ vị trí = 70 điểm.</p>
            
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="p-2 border border-slate-300 w-12 text-center">STT</th>
                  <th className="p-2 border border-slate-300 w-16 text-center">Mã KPI</th>
                  <th className="p-2 border border-slate-300 text-left">Nhiệm vụ cụ thể</th>
                  <th className="p-2 border border-slate-300 w-20 text-center">Điểm tối đa</th>
                  <th className="p-2 border border-slate-300 w-20 text-center">Cá nhân tự chấm</th>
                  <th className="p-2 border border-slate-300 text-left">Minh chứng / ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {form.positionItems.map((item, idx) => (
                  <tr key={item.code}>
                    <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 text-center font-bold">{item.code}</td>
                    <td className="p-2 border border-slate-300">{item.content}</td>
                    <td className="p-2 border border-slate-300 text-center">{item.maxScore}</td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-teal-800">{item.selfScore}</td>
                    <td className="p-2 border border-slate-300 text-slate-600">{item.evidence || ''}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={3} className="p-2 border border-slate-300">TỔNG KPI VỊ TRÍ</td>
                  <td className="p-2 border border-slate-300 text-center">70</td>
                  <td className="p-2 border border-slate-300 text-center text-teal-800">{form.positionTotalSelf}</td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
              </tbody>
            </table>

            <div className="text-[11px] space-y-1 text-slate-700 pt-2">
              <p><strong>Minh chứng gợi ý:</strong> {posConfig.evidenceSuggestion}</p>
              <p><strong>Người theo dõi:</strong> {posConfig.trackingPerson}</p>
            </div>
          </div>

          {/* Section C & D: TỔNG HỢP ĐIỂM */}
          <div className="font-sans text-xs space-y-2 pt-2">
            <h3 className="font-bold text-sm text-slate-900 uppercase">D. TỔNG HỢP ĐIỂM</h3>
            <table className="w-full border-collapse border border-slate-300 max-w-lg">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="p-2 border border-slate-300 text-left">Nội dung</th>
                  <th className="p-2 border border-slate-300 w-24 text-center">Điểm tối đa</th>
                  <th className="p-2 border border-slate-300 w-28 text-center">Điểm đạt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-slate-300">KPI chung</td>
                  <td className="p-2 border border-slate-300 text-center">30</td>
                  <td className="p-2 border border-slate-300 text-center font-bold">{form.generalTotalSelf}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-300">KPI vị trí việc làm</td>
                  <td className="p-2 border border-slate-300 text-center">70</td>
                  <td className="p-2 border border-slate-300 text-center font-bold">{form.positionTotalSelf}</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="p-2 border border-slate-300">Tổng điểm KPI</td>
                  <td className="p-2 border border-slate-300 text-center">100</td>
                  <td className="p-2 border border-slate-300 text-center text-emerald-800 text-sm font-extrabold">{finalScore}</td>
                </tr>
                <tr className="font-bold">
                  <td className="p-2 border border-slate-300">Tự xếp loại</td>
                  <td colSpan={2} className="p-2 border border-slate-300 text-center text-emerald-900 uppercase">{finalClassification}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs font-sans">
            <div className="space-y-1">
              <p className="font-bold uppercase">NHÂN VIÊN TỰ ĐÁNH GIÁ</p>
              <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-bold">{form.employeeName}</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold uppercase">BGH PHÊ DUYỆT</p>
              <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-bold">{form.evaluatorName || 'Phạm Kim Hùng'}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
