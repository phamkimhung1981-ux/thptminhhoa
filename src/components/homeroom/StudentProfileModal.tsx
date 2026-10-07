import React, { useState, useEffect } from 'react';
import { X, Calendar, Award, AlertTriangle, User, Phone, MapPin, PlusCircle, MinusCircle, FileText, CheckCircle2, Edit2, Trash2, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { Student, ConductRecord, ConductSettings } from '../../types/homeroom';
import { calculateConductScore, checkStudentHasSpecialWarning, isDatChuaDatCategory, evaluateStudent6Groups } from '../../lib/homeroomData';
import { homeroomService } from '../../services/homeroomService';
import BackButton from '../ui/BackButton';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  records: ConductRecord[];
  settings: ConductSettings;
  onDeleteRecord?: (id: string) => void | Promise<void>;
  onUpdateRecord?: (id: string, updates: Partial<ConductRecord>) => void | Promise<void>;
}

export const EVALUATION_6_GROUPS = [
  { id: 'cat_4', name: 'ĐẠO ĐỨC – ỨNG XỬ', matchWords: ['đạo đức', 'ứng xử', 'dao duc', 'ung xu'] },
  { id: 'cat_5', name: 'HỌC TẬP – KIỂM TRA', matchWords: ['kiểm tra', 'kiem tra', 'học tập'] },
  { id: 'cat_6', name: 'TỆ NẠN – KÍCH THÍCH – CHẤT GÂY CHÁY NỔ', matchWords: ['tệ nạn', 'kích thích', 'cháy nổ', 'thuốc lá', 'hút thuốc'] },
  { id: 'cat_8', name: 'AN NINH – TRẬT TỰ', matchWords: ['an ninh', 'trật tự'] },
  { id: 'cat_10', name: 'AN TOÀN GIAO THÔNG', matchWords: ['giao thông', 'atgt', 'mũ bảo hiểm'] },
  { id: 'cat_9', name: 'VĂN HÓA – NỘI DUNG KHÔNG PHÙ HỢP', matchWords: ['văn hóa', 'nội dung', 'van hoa'] }
];

export default function StudentProfileModal({
  isOpen,
  onClose,
  student,
  records,
  settings,
  onDeleteRecord,
  onUpdateRecord
}: StudentProfileModalProps) {
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'violation' | 'plus'>('all');

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<ConductRecord | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editEvaluationStatus, setEditEvaluationStatus] = useState<'dat' | 'chua_dat' | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete confirm state
  const [recordToDelete, setRecordToDelete] = useState<ConductRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string>('');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const studentRecords = records
    .filter(r => r.studentId === student.id)
    .filter(r => {
      if (filterType === 'positive') return r.recordType === 'TICH_CUC';
      if (filterType === 'violation') return r.recordType !== 'TICH_CUC' && (r.pointType === 'minus' || r.point < 0 || Boolean(r.level));
      if (filterType === 'plus') return r.recordType !== 'TICH_CUC' && r.pointType === 'plus' && r.point > 0;
      return true;
    })
    .sort((a, b) => new Date(b.recordDate || b.createdAt).getTime() - new Date(a.recordDate || a.createdAt).getTime());

  // Count distinct categories for badges
  const allStudentRecords = records.filter(r => r.studentId === student.id);
  const positiveCount = allStudentRecords.filter(r => r.recordType === 'TICH_CUC').length;
  const violationCount = allStudentRecords.filter(r => r.recordType !== 'TICH_CUC' && (r.pointType === 'minus' || r.point < 0 || Boolean(r.level))).length;
  const plusCount = allStudentRecords.filter(r => r.recordType !== 'TICH_CUC' && r.pointType === 'plus' && r.point > 0).length;

  let totalPlus = 0;
  let totalMinus = 0;
  const hasSpecialWarning = checkStudentHasSpecialWarning(allStudentRecords);

  // Requirement: Không tính điểm trừ từ 6 nhóm ĐẠT / CHƯA ĐẠT và bản ghi tích cực TICH_CUC
  allStudentRecords.forEach(r => {
    if (r.recordType === 'TICH_CUC' || r.point === 0) return;
    if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
    if (r.pointType === 'plus') totalPlus += Math.abs(r.point);
    else totalMinus += Math.abs(r.point);
  });

  const evalResult = evaluateStudent6Groups(allStudentRecords);

  const { totalScore, classification, ratingResult } = calculateConductScore(
    settings.baseScore || 100,
    totalPlus,
    totalMinus,
    settings.thresholds,
    hasSpecialWarning,
    undefined,
    evalResult
  );

  const getBadgeColor = (cls: string) => {
    if (cls.includes('CHƯA ĐẠT') || cls.toLowerCase().includes('chưa đạt')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (cls.includes('ĐẠT') || cls.toLowerCase().trim() === 'đạt') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    }
    switch (cls) {
      case 'Tốt': return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Khá': return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'Đạt': return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      default: return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
  };

  const handleStartEdit = (r: ConductRecord) => {
    setEditingRecord(r);
    setEditContent(r.criterionName || '');
    setEditNote(r.note || '');
    setEditDate(r.recordDate || new Date().toISOString().split('T')[0]);
    setEditEvaluationStatus(r.evaluationStatus || null);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !onUpdateRecord) return;
    if (!editContent.trim()) {
      alert('Vui lòng nhập nội dung ghi nhận.');
      return;
    }
    try {
      setIsSavingEdit(true);
      const isDatChuaDat = isDatChuaDatCategory(editingRecord.categoryId, editingRecord.categoryName) || Boolean(editingRecord.evaluationStatus);
      await onUpdateRecord(editingRecord.id, {
        criterionName: editContent.trim(),
        note: editNote.trim(),
        recordDate: editDate,
        ...(isDatChuaDat && editEvaluationStatus ? { evaluationStatus: editEvaluationStatus, point: 0 } : {})
      });
      showToast('Đã cập nhật ghi nhận thành công');
      setEditingRecord(null);
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + (err.message || err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getGroupRecords = (grp: typeof EVALUATION_6_GROUPS[0]) => {
    return allStudentRecords.filter(r => {
      if (r.categoryId === grp.id) return true;
      const catName = (r.categoryName || '').toLowerCase();
      const critName = (r.criterionName || '').toLowerCase();
      if (grp.id === 'cat_5') {
        if (catName.includes('nền nếp') || catName.includes('nen nep')) return false;
      }
      return grp.matchWords.some(w => catName.includes(w) || critName.includes(w));
    });
  };

  const getGroupStatus = (grp: typeof EVALUATION_6_GROUPS[0]) => {
    const recs = getGroupRecords(grp);
    if (recs.length === 0) return 'ĐẠT';
    const hasChuaDat = recs.some(r => r.evaluationStatus === 'chua_dat');
    if (hasChuaDat) return 'CHƯA ĐẠT';
    return 'ĐẠT';
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !onDeleteRecord) return;
    try {
      setIsDeleting(true);
      await onDeleteRecord(recordToDelete.id);
      showToast('Đã xóa ghi nhận thành công');
      setRecordToDelete(null);
    } catch (err: any) {
      alert('Lỗi khi xóa: ' + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6">
        
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[70] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top border border-emerald-400">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="mb-4">
            <BackButton 
              onClick={onClose} 
              className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 hover:!text-white" 
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center text-3xl font-bold shadow-inner shrink-0">
              {student.name.charAt(student.name.lastIndexOf(' ') + 1) || 'H'}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-semibold">
                  {student.code}
                </span>
                {positiveCount > 0 && (
                  <span className="text-xs bg-emerald-500/80 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles size={12} /> {positiveCount} ghi nhận tích cực
                  </span>
                )}
                {violationCount > 0 && (
                  <span className="text-xs bg-rose-500/80 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle size={12} /> {violationCount} vi phạm
                  </span>
                )}
              </div>
              <p className="text-blue-100 text-sm flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <span>Lớp: <strong className="text-white">{student.className}</strong></span>
                <span>•</span>
                <span>Giới tính: {student.gender}</span>
                <span>•</span>
                <span>Ngày sinh: {student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info & Conduct Summary Cards */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-500 font-medium block mb-1">Điểm ban đầu</span>
              <span className="text-xl font-bold text-slate-800">{settings.baseScore || 100}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-xs text-emerald-600 font-medium block mb-1">Tổng điểm cộng</span>
              <span className="text-xl font-bold text-emerald-600">+{totalPlus}</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-xs text-rose-600 font-medium block mb-1">Tổng điểm trừ</span>
              <span className="text-xl font-bold text-rose-600">-{totalMinus}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <span className="text-xs text-blue-600 font-medium block mb-1">Tổng điểm rèn luyện</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-blue-700">{totalScore}</span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold border ${getBadgeColor(classification)}`}>
                  {classification}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          {(student.parentPhone || student.parentName || student.address) && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {student.parentName && (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-600" />
                  <span>Phụ huynh: <strong>{student.parentName}</strong></span>
                </div>
              )}
              {student.parentPhone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-blue-600" />
                  <span>SĐT liên hệ: <strong>{student.parentPhone}</strong></span>
                </div>
              )}
              {student.address && (
                <div className="flex items-center gap-2 col-span-1 sm:col-span-3">
                  <MapPin size={14} className="text-blue-600 shrink-0" />
                  <span className="truncate">Địa chỉ: {student.address}</span>
                </div>
              )}
            </div>
          )}

          {/* KHU VỰC: KẾT QUẢ ĐÁNH GIÁ 6 NHÓM TIÊU CHÍ NỀN NẾP (ĐẠT / CHƯA ĐẠT) (Requirement 6) */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Award size={18} className="text-blue-600" />
                  KẾT QUẢ ĐÁNH GIÁ 6 NHÓM TIÊU CHÍ NỀN NẾP
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cơ chế đánh giá Đạt / Chưa đạt • Không tính điểm trừ vào điểm rèn luyện
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                Đánh giá theo từng nhóm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EVALUATION_6_GROUPS.map(grp => {
                const status = getGroupStatus(grp);
                const isDat = status === 'ĐẠT';
                const recs = getGroupRecords(grp);

                return (
                  <div
                    key={grp.id}
                    className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-2 ${
                      isDat
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-slate-800" title={grp.name}>
                        {grp.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {recs.length > 0 ? `${recs.length} lượt ghi nhận` : 'Chấp hành tốt'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate-400 font-bold text-xs">→</span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 border ${
                          isDat
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        }`}
                      >
                        {isDat ? '🟢 ĐẠT' : '🔴 CHƯA ĐẠT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KHU VỰC: LỊCH SỬ GHI NHẬN (Requirement 9 & 10) */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  LỊCH SỬ GHI NHẬN ({allStudentRecords.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Theo dõi lịch sử biểu dương tích cực, vi phạm nề nếp và các điểm rèn luyện
                </p>
              </div>

              {/* Bộ lọc phân loại */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({allStudentRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('positive')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    filterType === 'positive' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span>🟢</span> Tích cực ({positiveCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('violation')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    filterType === 'violation' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>🔴</span> Vi phạm ({violationCount})
                </button>
                {plusCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('plus')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'plus' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    ⭐ Điểm cộng ({plusCount})
                  </button>
                )}
              </div>
            </div>

            {studentRecords.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                Không có ghi nhận nào trong danh mục này.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Ngày</th>
                      <th className="p-3 whitespace-nowrap">Nhóm danh mục</th>
                      <th className="p-3">Nội dung ghi nhận</th>
                      <th className="p-3 text-center whitespace-nowrap">Số lần</th>
                      <th className="p-3 text-center whitespace-nowrap">Điểm/lần</th>
                      <th className="p-3 text-center whitespace-nowrap">Tổng điểm trừ</th>
                      <th className="p-3 text-center whitespace-nowrap">Kết quả</th>
                      <th className="p-3">Người ghi nhận</th>
                      <th className="p-3">Ghi chú</th>
                      <th className="p-3 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRecords.map(r => {
                      const isPlus = r.pointType === 'plus' || r.recordType === 'TICH_CUC';
                      const isDatChuaDat = isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus);

                      const critHistoryCount = allStudentRecords.filter(item => 
                        (r.criterionId && item.criterionId === r.criterionId) || 
                        (!r.criterionId && item.criterionName === r.criterionName)
                      ).length;
                      const recCount = r.violationCount || critHistoryCount || 1;
                      const recDeductionPerOcc = isDatChuaDat ? 0 : Math.abs(
                        r.deductionPerOccurrence !== undefined && r.deductionPerOccurrence !== null
                          ? Number(r.deductionPerOccurrence)
                          : (r.point !== undefined && r.point !== null ? Number(r.point) : 0)
                      );
                      const recTotalDed = isDatChuaDat ? 0 : (r.totalDeduction !== undefined ? Math.abs(Number(r.totalDeduction)) : (recCount * recDeductionPerOcc));

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Ngày */}
                          <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                            {r.recordDate ? new Date(r.recordDate).toLocaleDateString('vi-VN') : '—'}
                          </td>

                          {/* Nhóm danh mục */}
                          <td className="p-3 font-semibold text-slate-700 text-[11px] whitespace-nowrap">
                            {r.categoryName || '—'}
                          </td>

                          {/* Nội dung */}
                          <td className="p-3 font-semibold text-slate-800 max-w-xs">
                            <div className="leading-snug">{r.criterionName}</div>
                            {r.positiveContents && r.positiveContents.length > 1 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.positiveContents.map((c, i) => (
                                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {r.warningLabel && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] bg-rose-100 text-rose-800 border border-rose-300 rounded-md font-bold">
                                {r.warningLabel}
                              </span>
                            )}
                            {r.level && (
                              <span className="ml-1 text-[10px] text-slate-500 font-normal">
                                (Mức: {r.level})
                              </span>
                            )}
                          </td>

                          {/* Số lần */}
                          <td className="p-3 text-center font-bold text-blue-900 whitespace-nowrap">
                            {isDatChuaDat || isPlus ? '—' : `${recCount} lần`}
                          </td>

                          {/* Điểm/lần */}
                          <td className="p-3 text-center font-bold text-slate-700 whitespace-nowrap">
                            {isDatChuaDat || isPlus ? '—' : `-${recDeductionPerOcc}đ`}
                          </td>

                          {/* Tổng điểm trừ */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {isDatChuaDat ? (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Không áp dụng điểm trừ">
                                0đ
                              </span>
                            ) : isPlus ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                +{Math.abs(r.point || 5)}đ
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                -{recTotalDed}đ
                              </span>
                            )}
                          </td>

                          {/* Kết quả */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {r.evaluationStatus === 'dat' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 ĐẠT
                              </span>
                            ) : (r.evaluationStatus === 'chua_dat' || (isDatChuaDat && (r.pointType === 'minus' || (r.point || 0) < 0 || Boolean(r.level) || r.recordType === 'VI_PHAM'))) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                🔴 CHƯA ĐẠT
                              </span>
                            ) : isDatChuaDat ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 ĐẠT
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Người ghi nhận */}
                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            {r.recordedByName || r.recordedBy}
                          </td>

                          {/* Ghi chú */}
                          <td className="p-3 text-slate-500 italic max-w-xs">
                            {r.note || '—'}
                          </td>

                          {/* Thao tác (Sửa / Xóa) */}
                          <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                            {onUpdateRecord && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(r)}
                                className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Sửa ghi nhận"
                              >
                                <Edit2 size={11} />
                                <span>Sửa</span>
                              </button>
                            )}
                            {onDeleteRecord && (
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(r)}
                                className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Xóa ghi nhận"
                              >
                                <Trash2 size={11} />
                                <span>Xóa</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal chỉnh sửa ghi nhận (Requirement 10) */}
        {editingRecord && (
          <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Edit2 size={16} className="text-blue-600" />
                  SỬA GHI NHẬN {editingRecord.recordType === 'TICH_CUC' ? 'TÍCH CỰC' : 'NỀN NẾP'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Thông tin học sinh cố định */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-slate-700 space-y-1">
                <div>Học sinh: <strong className="text-blue-900">{student.name}</strong> ({student.code})</div>
                <div>Lớp: <strong className="text-slate-800">{student.className}</strong></div>
                <div>Nhóm: <strong className="text-slate-800">{editingRecord.categoryName || '—'}</strong></div>
                <div>Người tạo ban đầu: <strong>{editingRecord.recordedByName || editingRecord.recordedBy}</strong></div>
              </div>

              {/* Đánh giá Đạt / Chưa đạt nếu thuộc 6 nhóm */}
              {(isDatChuaDatCategory(editingRecord.categoryId, editingRecord.categoryName) || Boolean(editingRecord.evaluationStatus)) && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kết quả đánh giá:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditEvaluationStatus('dat')}
                      className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                        editEvaluationStatus === 'dat'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      <span>🟢 ĐẠT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditEvaluationStatus('chua_dat')}
                      className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                        editEvaluationStatus === 'chua_dat'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                          : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      <span>🔴 CHƯA ĐẠT</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Nội dung ghi nhận */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung ghi nhận:
                </label>
                <textarea
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Nhập nội dung ghi nhận..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ngày ghi nhận */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày ghi nhận:
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú thêm:
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  disabled={isSavingEdit}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xác nhận xóa ghi nhận (Requirement 10) */}
        {recordToDelete && (
          <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 text-xs text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 uppercase">
                  XÁC NHẬN XÓA GHI NHẬN?
                </h4>
                <p className="text-slate-500 mt-1 text-[11px]">
                  Bạn có chắc chắn muốn xóa bản ghi ghi nhận này của học sinh <strong className="text-slate-800">{student.name}</strong>?
                </p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left space-y-1">
                <div className="text-slate-600">Nội dung: <strong className="text-slate-800">{recordToDelete.criterionName}</strong></div>
                <div className="text-slate-600">Ngày: <strong className="text-slate-800">{recordToDelete.recordDate}</strong></div>
                <div className="text-slate-600">Phân loại: <strong className="text-slate-800">{recordToDelete.recordType === 'TICH_CUC' ? '🟢 Tích cực' : '🔴 Vi phạm'}</strong></div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
