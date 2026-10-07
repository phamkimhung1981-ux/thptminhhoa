import React, { useState } from 'react';
import { X, FileSpreadsheet, Printer, TrendingUp, AlertTriangle, Star, BarChart3, Users, FileText } from 'lucide-react';
import { ClassInfo, Student, ConductRecord, ConductCriterion, ConductSettings } from '../../types/homeroom';
import { exportHomeroomToExcel } from '../../utils/homeroomExport';
import { calculateConductScore, isDatChuaDatCategory, evaluateStudent6Groups } from '../../lib/homeroomData';

interface HomeroomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  students: Student[];
  records: ConductRecord[];
  criteria: ConductCriterion[];
  settings: ConductSettings;
  periodLabel: string;
}

export default function HomeroomReportModal({
  isOpen,
  onClose,
  selectedClass,
  students,
  records,
  criteria,
  settings,
  periodLabel
}: HomeroomReportModalProps) {
  const [activeReportTab, setActiveReportTab] = useState<'violations' | 'frequent' | 'rewards' | 'attention'>('violations');

  if (!isOpen || !selectedClass) return null;

  const violationRecords = records.filter(r => r.pointType === 'minus');
  const rewardRecords = records.filter(r => r.pointType === 'plus');

  // Calculate top frequent violations
  const violationCounts: Record<string, { count: number; name: string; category: string }> = {};
  violationRecords.forEach(r => {
    if (!violationCounts[r.criterionId]) {
      violationCounts[r.criterionId] = { count: 0, name: r.criterionName, category: r.categoryName };
    }
    violationCounts[r.criterionId].count += 1;
  });
  const topViolations = Object.values(violationCounts).sort((a, b) => b.count - a.count);

  // Students requiring attention (Net score < 70 or 3+ violations or CHƯA ĐẠT in 6 groups)
  const studentsNeedingAttention = students.map(st => {
    const stRecords = records.filter(r => r.studentId === st.id);
    let plus = 0;
    let minus = 0;
    stRecords.forEach(r => {
      if (r.recordType === 'TICH_CUC' || r.point === 0) return;
      if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
      if (r.pointType === 'plus') plus += Math.abs(r.point);
      else minus += Math.abs(r.point);
    });
    const evalResult = evaluateStudent6Groups(stRecords);
    const { totalScore, classification } = calculateConductScore(settings.baseScore || 100, plus, minus, settings.thresholds, false, undefined, evalResult);
    return {
      student: st,
      totalScore,
      classification,
      minusCount: stRecords.filter(r => r.pointType === 'minus').length,
      severeCount: stRecords.filter(r => r.level === 'Nghiêm trọng' || r.level === 'Rất nghiêm trọng').length,
      hasChuaDat: evalResult.hasChuaDat
    };
  }).filter(item => item.totalScore < 70 || item.minusCount >= 3 || item.severeCount > 0 || item.hasChuaDat);

  const handleExportExcel = () => {
    exportHomeroomToExcel({
      className: selectedClass.name,
      schoolYear: selectedClass.schoolYear || '2026–2027',
      periodLabel,
      homeroomTeacherName: selectedClass.homeroomTeacherName,
      students,
      records,
      criteria,
      baseScore: settings.baseScore || 100
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 size={20} className="text-amber-300" />
              BÁO CÁO CÔNG TÁC CHỦ NHIỆM - LỚP {selectedClass.name}
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Thời gian: {periodLabel} • GVCN: {selectedClass.homeroomTeacherName || 'Chưa cập nhật'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} /> Xuất Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer size={15} /> In báo cáo
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveReportTab('violations')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeReportTab === 'violations'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileText size={15} /> Nhật ký vi phạm ({violationRecords.length})
          </button>
          <button
            onClick={() => setActiveReportTab('frequent')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeReportTab === 'frequent'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <TrendingUp size={15} /> Lỗi phổ biến nhất
          </button>
          <button
            onClick={() => setActiveReportTab('rewards')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeReportTab === 'rewards'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Star size={15} className="text-amber-500" /> Tuyên dương & Điểm tốt ({rewardRecords.length})
          </button>
          <button
            onClick={() => setActiveReportTab('attention')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
              activeReportTab === 'attention'
                ? 'bg-white text-rose-700 border-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <AlertTriangle size={15} className="text-rose-600" /> Học sinh cần quan tâm ({studentsNeedingAttention.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeReportTab === 'violations' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Họ và tên học sinh</th>
                    <th className="p-3">Lớp</th>
                    <th className="p-3">Loại vi phạm</th>
                    <th className="p-3">Mức độ</th>
                    <th className="p-3">Thời gian vi phạm</th>
                    <th className="p-3">Địa điểm</th>
                    <th className="p-3">Người ghi nhận</th>
                    <th className="p-3 text-center">Cảnh báo đặc biệt</th>
                    <th className="p-3 text-center">Kết quả rèn luyện đề xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violationRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500 italic">Không có lỗi vi phạm nào trong khoảng thời gian này.</td>
                    </tr>
                  ) : (
                    violationRecords.map(r => {
                      const isSpecial = r.special_warning || r.categoryType === 'ATGT' || r.categoryType === 'BẠO LỰC HỌC ĐƯỜNG' || r.categoryType === 'GIAN LẬN THI CỬ';
                      const proposedText = isSpecial ? 'YẾU / CHƯA ĐẠT' : (r.proposedRating || 'Theo dõi');
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
                          <td className="p-3 font-medium text-slate-600">{r.className}</td>
                          <td className="p-3 font-semibold text-slate-700">{r.categoryType || r.categoryName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.level === 'Rất nghiêm trọng' ? 'bg-rose-100 text-rose-800' :
                              r.level === 'Nghiêm trọng' ? 'bg-orange-100 text-orange-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {r.level || 'Nhẹ'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-600">{new Date(r.recordDate).toLocaleDateString('vi-VN')}</td>
                          <td className="p-3 text-slate-600">{r.location || 'Trường'}</td>
                          <td className="p-3 text-slate-500">{r.recordedByName}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isSpecial ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isSpecial ? 'CÓ' : 'KHÔNG'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              isSpecial || proposedText.includes('YẾU') || proposedText.includes('Chưa đạt')
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-blue-50 text-blue-800'
                            }`}>
                              {proposedText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReportTab === 'frequent' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thống kê số lượt vi phạm theo từng tiêu chí
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topViolations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic col-span-2">Chưa có dữ liệu vi phạm.</p>
                ) : (
                  topViolations.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">{item.category}</span>
                        <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      </div>
                      <div className="bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full text-xs shrink-0">
                        {item.count} lượt
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeReportTab === 'rewards' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-bold">
                  <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Họ và tên học sinh</th>
                    <th className="p-3">Nội dung khen thưởng / Việc tốt</th>
                    <th className="p-3 text-center">Điểm cộng</th>
                    <th className="p-3">Người ghi nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewardRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500 italic">Chưa có ghi nhận điểm tốt nào.</td>
                    </tr>
                  ) : (
                    rewardRecords.map(r => (
                      <tr key={r.id} className="hover:bg-emerald-50/50">
                        <td className="p-3 font-medium text-slate-600">{new Date(r.recordDate).toLocaleDateString('vi-VN')}</td>
                        <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
                        <td className="p-3 font-semibold text-emerald-800">{r.criterionName}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">+{r.point}</td>
                        <td className="p-3 text-slate-500">{r.recordedByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReportTab === 'attention' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Danh sách học sinh có điểm rèn luyện giảm mạnh (dưới 70 điểm), vi phạm từ 3 lần trở lên hoặc mắc lỗi nghiêm trọng cần GVCN đôn đốc & phối hợp với phụ huynh:
              </p>
              <div className="border border-rose-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50 border-b border-rose-200 text-rose-900 font-bold">
                    <tr>
                      <th className="p-3">Họ và tên</th>
                      <th className="p-3 text-center">Tổng điểm RL</th>
                      <th className="p-3 text-center">Xếp loại hiện tại</th>
                      <th className="p-3 text-center">Số lượt vi phạm</th>
                      <th className="p-3">Tình trạng cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {studentsNeedingAttention.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-emerald-700 font-medium">
                          🎉 Lớp không có học sinh nào nằm trong danh sách cảnh báo! Nền nếp đạt kết quả rất tốt.
                        </td>
                      </tr>
                    ) : (
                      studentsNeedingAttention.map((item, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="p-3 font-bold text-slate-800">{item.student.name} ({item.student.code})</td>
                          <td className="p-3 text-center font-black text-rose-700">{item.totalScore}</td>
                          <td className="p-3 text-center font-bold">{item.classification}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{item.minusCount} lần</td>
                          <td className="p-3 text-rose-700 font-medium">
                            {item.severeCount > 0 ? 'Mắc vi phạm nghiêm trọng' : 'Điểm rèn luyện xuống thấp'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
