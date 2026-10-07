import React, { useState } from 'react';
import { X, ShieldAlert, Download, FileSpreadsheet, Filter, Printer, Calendar, Search } from 'lucide-react';
import { ConductRecord, ClassInfo, Student } from '../../types/homeroom';

interface SeriousViolationsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ConductRecord[];
  classes: ClassInfo[];
  students: Student[];
}

export default function SeriousViolationsReportModal({
  isOpen,
  onClose,
  records,
  classes,
  students
}: SeriousViolationsReportModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  // Filter serious records
  const seriousRecords = records.filter(r => {
    const isSerious = r.hasConductWarning ||
      r.requiresBghApproval ||
      r.categoryType === 'ATGT' ||
      r.categoryType === 'BẠO LỰC HỌC ĐƯỜNG' ||
      r.categoryType === 'GIAN LẬN THI CỬ' ||
      r.level === 'Nghiêm trọng' ||
      r.level === 'Rất nghiêm trọng';

    if (!isSerious) return false;

    if (selectedClassId !== 'all' && r.classId !== selectedClassId) return false;
    if (selectedCategoryType !== 'all' && r.categoryType !== selectedCategoryType) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.studentName.toLowerCase().includes(q) || r.className.toLowerCase().includes(q) || (r.note && r.note.toLowerCase().includes(q));
    }

    return true;
  });

  const handleExportCSV = () => {
    if (seriousRecords.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    const headers = ['Mã HS', 'Họ và tên', 'Lớp', 'Loại vi phạm', 'Nội dung vi phạm', 'Mức độ', 'Điểm trừ', 'Địa điểm', 'Ngày vi phạm', 'Trạng thái BGH'];
    const rows = seriousRecords.map(r => {
      const std = students.find(s => s.id === r.studentId);
      return [
        std?.code || '',
        `"${r.studentName}"`,
        r.className,
        `"${r.categoryType || r.categoryName}"`,
        `"${r.note || r.criterionName}"`,
        r.level || 'Nghiêm trọng',
        r.point,
        `"${r.location || ''}"`,
        r.recordDate,
        r.bghApprovalStatus || 'Chờ duyệt'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_cao_vi_pham_nghiem_trong_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-rose-300">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">DANH SÁCH HỌC SINH CÓ VI PHẠM NGHIÊM TRỌNG</h2>
              <p className="text-xs text-rose-200">Thống kê chi tiết học sinh vi phạm ATGT, Bạo lực học đường, Gian lận thi cử</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="font-bold text-slate-700 mr-1.5">Lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium outline-none"
              >
                <option value="all">Tất cả lớp</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <span className="font-bold text-slate-700 mr-1.5">Loại vi phạm:</span>
              <select
                value={selectedCategoryType}
                onChange={(e) => setSelectedCategoryType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="ATGT">An toàn giao thông (ATGT)</option>
                <option value="BẠO LỰC HỌC ĐƯỜNG">Bạo lực học đường</option>
                <option value="GIAN LẬN THI CỬ">Gian lận thi cử</option>
                <option value="NỘI QUY">Vi phạm nội quy</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50 text-rose-950 font-bold border-b border-rose-200">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Họ và tên / Mã HS</th>
                  <th className="p-3">Lớp</th>
                  <th className="p-3">Danh mục vi phạm</th>
                  <th className="p-3">Nội dung / Địa điểm</th>
                  <th className="p-3 text-center">Mức độ & Điểm</th>
                  <th className="p-3 text-center">Ngày vi phạm</th>
                  <th className="p-3 text-center">Phê duyệt BGH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seriousRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      Không có ghi nhận vi phạm nghiêm trọng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  seriousRecords.map((r, idx) => {
                    const std = students.find(s => s.id === r.studentId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-400 font-mono font-semibold">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{r.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{std?.code || ''}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{r.className}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {r.categoryType || r.categoryName}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-800">{r.note || r.criterionName}</p>
                          {r.location && <p className="text-[10px] text-slate-500">📍 {r.location}</p>}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-rose-700">{r.level || 'Nghiêm trọng'}</span>
                          <p className="text-[10px] text-rose-600 font-bold">{r.point} điểm</p>
                        </td>
                        <td className="p-3 text-center text-slate-600 font-mono">{r.recordDate}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.bghApprovalStatus === 'Đã duyệt' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {r.bghApprovalStatus || 'Chờ duyệt'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
