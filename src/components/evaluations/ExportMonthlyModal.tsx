import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sparkles, 
  FileCheck, 
  RefreshCw, 
  UserCheck, 
  Building2, 
  Award,
  FileText,
  Loader2
} from 'lucide-react';
import { Teacher, Department } from '../../types';
import { db } from '../../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { 
  EvaluationExportRecord, 
  CriterionCategory, 
  exportMonthlyEvaluationExcel,
  exportSingleEvaluationDetailToExcel,
  formatYearCode,
  formatMonthCode,
  getExportFileName
} from '../../utils/evaluationExport';
import { exportEvaluationToDocx } from '../../utils/evaluationDocxExport';

interface ExportMonthlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluations: EvaluationExportRecord[];
  teachers: Teacher[];
  departments: Department[];
  criteria: CriterionCategory[];
  currentFilterTerm?: string;
  onSelectPrintRecord: (record: EvaluationExportRecord) => void;
  onBatchPrintRecords?: (records: EvaluationExportRecord[]) => void;
}

export default function ExportMonthlyModal({
  isOpen,
  onClose,
  evaluations,
  teachers,
  departments,
  criteria,
  currentFilterTerm,
  onSelectPrintRecord,
  onBatchPrintRecords,
}: ExportMonthlyModalProps) {
  // Thống kê số lượng bản ghi thực tế theo từng tháng/kỳ
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    evaluations.forEach(ev => {
      const term = ev.term || 'Khác';
      counts[term] = (counts[term] || 0) + 1;
    });
    return counts;
  }, [evaluations]);

  // Tìm tháng ưu tiên: Nếu có filterTerm thì dùng filterTerm, ngược lại chọn tháng có dữ liệu (ưu tiên Tháng 7 hoặc Tháng 8)
  const defaultMonth = useMemo(() => {
    if (currentFilterTerm && currentFilterTerm !== 'All') {
      return currentFilterTerm;
    }
    if (monthCounts['Tháng 7'] && monthCounts['Tháng 7'] > 0) {
      return 'Tháng 7';
    }
    if (monthCounts['Tháng 8'] && monthCounts['Tháng 8'] > 0) {
      return 'Tháng 8';
    }
    const sorted = (Object.entries(monthCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] > 0) {
      return sorted[0][0];
    }
    return `Tháng ${new Date().getMonth() + 1}`;
  }, [monthCounts, currentFilterTerm]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Đồng bộ lại khi modal mở ra: Nếu người dùng đang chọn bộ lọc ngoài trang chính (ví dụ Tháng 7), dùng luôn Tháng 7
  useEffect(() => {
    if (isOpen) {
      if (currentFilterTerm && currentFilterTerm !== 'All') {
        setSelectedMonth(currentFilterTerm);
      } else {
        setSelectedMonth(defaultMonth);
      }
      setSelectedTeacherId('All');
      setSelectedGrade('All');
      setSearchQuery('');
      setExportSuccess(null);
    }
  }, [isOpen, currentFilterTerm, defaultMonth]);

  if (!isOpen) return null;

  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getDeptName = (deptId?: string) => departments.find(d => d.id === deptId)?.name || 'Chưa phân tổ';

  // LỌC THÁNG CHÍNH XÁC:
  // Tháng 7 chỉ lấy tháng 7, không lấy tháng 6 hay tháng 8.
  // Tháng 1 không nhầm với Tháng 10, 11, 12.
  const filteredRecords = useMemo(() => {
    return evaluations.filter(ev => {
      // 1. Kiểm tra khớp tháng
      if (selectedMonth !== 'All') {
        const selNum = selectedMonth.match(/\d+/)?.[0];
        if (selNum) {
          const sInt = parseInt(selNum, 10);
          const termNum = ev.term?.match(/\d+/)?.[0];
          if (termNum) {
            if (parseInt(termNum, 10) !== sInt) return false;
          } else if (ev.date) {
            const parts = ev.date.split('-');
            if (parts.length >= 2 && parseInt(parts[1], 10) !== sInt) return false;
          } else {
            return false;
          }
        } else {
          // Các đợt không có số (Học kỳ 1, Học kỳ 2, Cả năm)
          if (ev.term !== selectedMonth) return false;
        }
      }

      // 2. Kiểm tra khớp năm học / năm dương lịch
      if (selectedYear !== 'All') {
        if (selectedYear === '2026') {
          const matches2026 = (ev.year && ev.year.includes('2026')) || (ev.date && ev.date.startsWith('2026'));
          if (!matches2026) return false;
        } else {
          if (ev.year !== selectedYear) return false;
        }
      }

      // 3. Khớp đối tượng CBGVNV cụ thể
      if (selectedTeacherId !== 'All' && ev.teacherId !== selectedTeacherId) {
        return false;
      }

      // 4. Khớp tổ chuyên môn
      const teacher = getTeacher(ev.teacherId);
      if (selectedDept !== 'All' && teacher?.departmentId !== selectedDept) {
        return false;
      }

      // 5. Khớp xếp loại / trạng thái
      if (selectedGrade !== 'All') {
        const g = ev.finalGrade || '';
        if (!g.toLowerCase().includes(selectedGrade.toLowerCase())) return false;
      }

      // 6. Tìm kiếm từ khóa theo tên hoặc mã viên chức
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tName = teacher?.name?.toLowerCase() || '';
        const tCode = teacher?.code?.toLowerCase() || '';
        if (!tName.includes(q) && !tCode.includes(q)) return false;
      }

      return true;
    });
  }, [evaluations, selectedMonth, selectedYear, selectedTeacherId, selectedDept, selectedGrade, searchQuery, teachers]);

  // Thống kê nhanh kết quả của bộ lọc hiện tại
  const stats = useMemo(() => {
    let xuatSac = 0;
    let tot = 0;
    let hoanThanh = 0;
    let chuaHoanThanh = 0;

    filteredRecords.forEach(r => {
      const grade = r.finalGrade || '';
      if (grade.includes('xuất sắc')) xuatSac++;
      else if (grade.includes('tốt')) tot++;
      else if (grade.includes('Không hoàn thành') || grade.includes('chưa đạt')) chuaHoanThanh++;
      else hoanThanh++;
    });

    return {
      total: filteredRecords.length,
      xuatSac,
      tot,
      hoanThanh,
      chuaHoanThanh
    };
  }, [filteredRecords]);

  // Tạo chuỗi mô tả thời điểm hiện tại (ví dụ: "tháng 7/2026")
  const getPeriodLabel = () => {
    const yLabel = formatYearCode(selectedYear);
    if (selectedMonth === 'All') {
      return `năm ${yLabel}`;
    }
    const mNum = selectedMonth.match(/\d+/)?.[0];
    if (mNum) {
      return `tháng ${mNum}/${yLabel}`;
    }
    return `${selectedMonth.toLowerCase()}/${yLabel}`;
  };

  // KIỂM TRA DỮ LIỆU TRƯỚC KHI XUẤT (Yêu cầu 6)
  const checkAndConfirm = (): boolean => {
    if (filteredRecords.length === 0) {
      alert('Không có phiếu đánh giá trong tháng đã chọn.');
      return false;
    }
    const periodLabel = getPeriodLabel();
    const targetTeacher = selectedTeacherId !== 'All' 
      ? teachers.find(t => t.id === selectedTeacherId) 
      : null;
    const teacherText = targetTeacher ? ` của ${targetTeacher.name}` : '';
    
    // Câu hỏi xác nhận theo ví dụ trong yêu cầu:
    // "Có 41 phiếu đánh giá tháng 7/2026. Bạn có muốn xuất không?"
    const confirmMsg = `Có ${filteredRecords.length} phiếu đánh giá${teacherText} ${periodLabel}. Bạn có muốn xuất không?`;
    return window.confirm(confirmMsg);
  };

  // XUẤT FILE EXCEL DANH SÁCH THEO THÁNG (Yêu cầu 4.A, 5, 10)
  const handleExportSummaryExcel = () => {
    try {
      if (!checkAndConfirm()) return;

      const targetTeacherName = selectedTeacherId !== 'All'
        ? teachers.find(t => t.id === selectedTeacherId)?.name
        : undefined;

      exportMonthlyEvaluationExcel(
        filteredRecords,
        teachers,
        departments,
        criteria,
        selectedMonth,
        selectedYear,
        targetTeacherName
      );

      // Thông báo xuất thành công: "Đã xuất thành công 41 phiếu đánh giá tháng 7/2026."
      const successMsg = `Đã xuất thành công ${filteredRecords.length} phiếu đánh giá ${getPeriodLabel()}.`;
      setExportSuccess(successMsg);
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      alert('Xuất file Excel thất bại. Vui lòng kiểm tra lại dữ liệu và thử lại.');
    }
  };

  // IN / LƯU PDF TẬP PHIẾU ĐÁNH GIÁ (Yêu cầu 4.B, 5, 10)
  const handleBatchPrint = () => {
    try {
      if (!checkAndConfirm()) return;

      if (onBatchPrintRecords) {
        onBatchPrintRecords(filteredRecords);
        const successMsg = `Đã mở ${filteredRecords.length} phiếu đánh giá ${getPeriodLabel()} sẵn sàng in hoặc lưu file PDF.`;
        setExportSuccess(successMsg);
        setTimeout(() => setExportSuccess(null), 6000);
      }
    } catch (error) {
      console.error('Lỗi khi chuẩn bị in tập phiếu:', error);
      alert('Không thể mở tập phiếu in. Vui lòng thử lại.');
    }
  };

  // XUẤT EXCEL CHO TỪNG CÁ NHÂN (Yêu cầu 5: Phieu_danh_gia_Nguyen_Van_A_T07_2026.xlsx)
  const handleExportIndividual = (record: EvaluationExportRecord) => {
    try {
      const t = getTeacher(record.teacherId);
      const ev = record.evaluatorId ? getTeacher(record.evaluatorId) : undefined;
      const deptName = getDeptName(t?.departmentId);

      const confirmMsg = `Bạn có muốn xuất file Excel phiếu đánh giá của ${t?.name || 'viên chức'} thời điểm ${record.term} (${record.year})?`;
      if (!window.confirm(confirmMsg)) return;

      exportSingleEvaluationDetailToExcel(
        record,
        t,
        ev,
        deptName,
        criteria
      );

      const successMsg = `Đã xuất thành công phiếu đánh giá của ${t?.name || 'viên chức'}.`;
      setExportSuccess(successMsg);
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (error) {
      console.error('Lỗi khi xuất phiếu cá nhân:', error);
      alert('Xuất phiếu cá nhân thất bại. Vui lòng thử lại.');
    }
  };

  // XUẤT WORD CHO TỪNG CÁ NHÂN (.DOCX)
  const handleExportWordIndividual = async (record: EvaluationExportRecord) => {
    try {
      const t = getTeacher(record.teacherId);
      const ev = record.evaluatorId ? getTeacher(record.evaluatorId) : undefined;
      const dept = departments.find(d => d.id === t?.departmentId);

      const res = await exportEvaluationToDocx({
        record,
        teacher: t,
        evaluator: ev,
        department: dept,
        criteria
      });

      if (res.success) {
        const successMsg = `Đã xuất phiếu đánh giá của ${t?.name || 'giáo viên'} ${record.term} năm học ${record.year} thành công.`;
        setExportSuccess(successMsg);
        setTimeout(() => setExportSuccess(null), 5000);
      } else {
        console.error('Lỗi khi xuất Word:', res.error);
        alert('Không thể xuất phiếu Word. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi khi xuất phiếu Word cá nhân:', error);
      alert('Không thể xuất phiếu Word. Vui lòng thử lại.');
    }
  };

  // Tạo nhanh phiếu mẫu nếu tháng chưa có dữ liệu để phục vụ kiểm thử
  const handleQuickInitializeMonth = async () => {
    const confirmInit = window.confirm(
      `Hệ thống sẽ khởi tạo phiếu đánh giá chuẩn cho ${teachers.length} giáo viên trường THPT Minh Hòa trong ${selectedMonth} (${selectedYear === 'All' ? '2026-2027' : selectedYear}).\n\nBạn có muốn tiếp tục?`
    );
    if (!confirmInit) return;

    setIsInitializing(true);
    try {
      const yearToUse = selectedYear === 'All' ? '2026-2027' : selectedYear;
      const todayStr = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);

      const defaultScores: Record<string, number> = {};
      criteria.forEach(cat => {
        if (cat.items) cat.items.forEach(it => { defaultScores[it.id] = it.max; });
        if (cat.subCategories) {
          cat.subCategories.forEach(sub => {
            sub.items.forEach(it => { defaultScores[it.id] = it.max; });
          });
        }
      });

      let count = 0;
      teachers.forEach(t => {
        const exists = evaluations.some(e => e.teacherId === t.id && e.term === selectedMonth && e.year === yearToUse);
        if (!exists) {
          const newId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const docRef = doc(db, 'evaluations', newId);
          batch.set(docRef, {
            id: newId,
            teacherId: t.id,
            year: yearToUse,
            term: selectedMonth,
            selfTotal: 100,
            deptTotal: 100,
            finalGrade: 'Hoàn thành xuất sắc nhiệm vụ',
            selfNote: 'Hoàn thành xuất sắc mọi nhiệm vụ công tác trong tháng theo đúng kế hoạch.',
            deptNote: 'Tổ chuyên môn biểu dương và đánh giá hoàn thành xuất sắc nhiệm vụ.',
            date: todayStr,
            scores: defaultScores,
            deptScores: defaultScores,
            evidences: {}
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        setExportSuccess(`Đã tạo thành công ${count} phiếu đánh giá ${selectedMonth}!`);
      } else {
        setExportSuccess(`Tất cả giáo viên đã có phiếu trong ${selectedMonth}!`);
      }
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (err) {
      console.error('Lỗi khi khởi tạo phiếu:', err);
      alert('Không thể kết nối cơ sở dữ liệu để khởi tạo. Vui lòng thử lại.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Danh sách giáo viên được sắp xếp bảng chữ cái
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  }, [teachers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span>XUẤT PHIẾU ĐÁNH GIÁ VIÊN CHỨC THEO THÁNG</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold lowercase">
                  thpt minh hòa
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Xuất file Excel chuẩn, chi tiết 19 tiêu chí hoặc in trọn bộ phiếu đánh giá A4 theo quy định
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-colors"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Thông báo kết quả xuất file */}
          {exportSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in shadow-xs">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {/* Thanh chọn nhanh Tháng có dữ liệu */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                Chọn nhanh tháng đánh giá ({evaluations.length} phiếu trong hệ thống)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Bấm vào nút tháng để chuyển đổi tức thì
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === 'All'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Tất cả ({evaluations.length})
              </button>

              {Array.from({ length: 12 }, (_, i) => {
                const mName = `Tháng ${i + 1}`;
                const count = monthCounts[mName] || 0;
                const isSelected = selectedMonth === mName;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => setSelectedMonth(mName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : count > 0
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 opacity-60'
                    }`}
                  >
                    <span>{mName}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/30 text-white' : 'bg-emerald-200 text-emerald-900 font-bold'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {['Học kỳ 1', 'Học kỳ 2', 'Cả năm'].map(termName => {
                const count = monthCounts[termName] || 0;
                if (count === 0) return null;
                const isSelected = selectedMonth === termName;
                return (
                  <button
                    key={termName}
                    type="button"
                    onClick={() => setSelectedMonth(termName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <span>{termName}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/30 text-white' : 'bg-blue-200 text-blue-900'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BỘ LỌC ĐẦY ĐỦ: Tháng, Năm, Đối tượng, Tổ chuyên môn, Trạng thái (Yêu cầu 1) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Tháng đánh giá */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-blue-600" />
                <span>Tháng đánh giá</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="All">-- Tất cả các tháng --</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const mName = `Tháng ${i + 1}`;
                  const count = monthCounts[mName] || 0;
                  return (
                    <option key={i} value={mName}>
                      {mName} {count > 0 ? `(${count} phiếu)` : ''}
                    </option>
                  );
                })}
                <option value="Học kỳ 1">Học kỳ 1 {monthCounts['Học kỳ 1'] ? `(${monthCounts['Học kỳ 1']} phiếu)` : ''}</option>
                <option value="Học kỳ 2">Học kỳ 2 {monthCounts['Học kỳ 2'] ? `(${monthCounts['Học kỳ 2']} phiếu)` : ''}</option>
                <option value="Cả năm">Cả năm {monthCounts['Cả năm'] ? `(${monthCounts['Cả năm']} phiếu)` : ''}</option>
              </select>
            </div>

            {/* 2. Năm đánh giá */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Filter size={12} className="text-blue-600" />
                <span>Năm đánh giá</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="All">-- Tất cả các năm --</option>
                <option value="2026">Năm 2026 (Toàn bộ)</option>
                <option value="2026-2027">Năm học 2026 - 2027</option>
                <option value="2025-2026">Năm học 2025 - 2026</option>
                <option value="2024-2025">Năm học 2024 - 2025</option>
                <option value="2027-2028">Năm học 2027 - 2028</option>
              </select>
            </div>

            {/* 3. Đối tượng: Tất cả hoặc chọn từng người */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <UserCheck size={12} className="text-blue-600" />
                <span>Đối tượng viên chức</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="All">Tất cả CBGVNV ({teachers.length} người)</option>
                {sortedTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code ? `${t.code} - ` : ''}{t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Tổ chuyên môn */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-blue-600" />
                <span>Tổ chuyên môn</span>
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="All">Tất cả các tổ bộ môn</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Trạng thái / Xếp loại */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Award size={12} className="text-blue-600" />
                <span>Xếp loại phiếu</span>
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="All">Tất cả xếp loại</option>
                <option value="Hoàn thành xuất sắc nhiệm vụ">Hoàn thành xuất sắc</option>
                <option value="Hoàn thành tốt nhiệm vụ">Hoàn thành tốt</option>
                <option value="Hoàn thành nhiệm vụ">Hoàn thành nhiệm vụ</option>
                <option value="Không hoàn thành nhiệm vụ">Không hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Ô TÌM KIẾM NHANH */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc mã viên chức..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Nút đặt lại bộ lọc */}
            {(selectedMonth !== defaultMonth || selectedYear !== 'All' || selectedTeacherId !== 'All' || selectedDept !== 'All' || selectedGrade !== 'All' || searchQuery !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(defaultMonth);
                  setSelectedYear('All');
                  setSelectedTeacherId('All');
                  setSelectedDept('All');
                  setSelectedGrade('All');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          {/* BẢNG THÔNG BÁO TRẠNG THÁI DỮ LIỆU SẴN SÀNG (Yêu cầu 6) */}
          {filteredRecords.length > 0 ? (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <FileCheck size={18} className="text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-950">
                  Có {filteredRecords.length} phiếu đánh giá {getPeriodLabel()} sẵn sàng xuất file.
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-blue-800 font-medium shrink-0">
                <span>Xuất sắc: {stats.xuatSac}</span>
                <span>•</span>
                <span>Tốt: {stats.tot}</span>
                <span>•</span>
                <span>Hoàn thành: {stats.hoanThanh}</span>
                {stats.chuaHoanThanh > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600">Chưa đạt: {stats.chuaHoanThanh}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  Không có phiếu đánh giá trong tháng đã chọn.
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Vui lòng chọn tháng khác có dữ liệu (ví dụ Tháng 7 hoặc Tháng 8) hoặc bấm "Tạo nhanh phiếu Tháng này" để tổ chức đánh giá.
                </p>
              </div>

              <button
                type="button"
                disabled={isInitializing}
                onClick={handleQuickInitializeMonth}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
              >
                {isInitializing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Tạo nhanh phiếu {selectedMonth}</span>
              </button>
            </div>
          )}

          {/* Bảng danh sách viên chức */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                <span>Danh sách viên chức ({filteredRecords.length} phiếu)</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{selectedMonth}</span>
                <span>•</span>
                <span>{selectedYear === 'All' ? 'Tất cả năm' : selectedYear}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">STT</th>
                    <th className="px-3 py-2.5">Viên chức</th>
                    <th className="px-3 py-2.5">Tổ bộ môn</th>
                    <th className="px-3 py-2.5">Thời điểm</th>
                    <th className="px-2 py-2.5 text-center">Tự chấm</th>
                    <th className="px-2 py-2.5 text-center">Tổ trưởng</th>
                    <th className="px-3 py-2.5">Xếp loại</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record, index) => {
                      const teacher = getTeacher(record.teacherId);
                      return (
                        <tr key={record.id || index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 text-center font-semibold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900">{teacher?.name || 'Chưa cập nhật'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{teacher?.code || 'GV'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {getDeptName(teacher?.departmentId)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-700">
                            {record.term} <span className="text-[10px] text-slate-400">({record.year})</span>
                          </td>
                          <td className="px-2 py-2.5 text-center font-bold text-blue-600">
                            {record.selfTotal}
                          </td>
                          <td className="px-2 py-2.5 text-center font-bold text-emerald-600">
                            {record.deptTotal > 0 ? record.deptTotal : '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.finalGrade?.includes('xuất sắc')
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.finalGrade?.includes('tốt')
                                ? 'bg-blue-100 text-blue-800'
                                : record.finalGrade?.includes('Không hoàn thành')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {record.finalGrade || 'Chưa xếp loại'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleExportWordIndividual(record)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-2xs cursor-pointer"
                              title="Xuất file Word (.docx) phiếu đánh giá của giáo viên này"
                            >
                              <FileText size={12} />
                              <span>Word</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectPrintRecord(record)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                              title="In hoặc lưu PDF phiếu A4 của giáo viên này"
                            >
                              <Printer size={12} />
                              <span>In A4</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportIndividual(record)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shadow-2xs cursor-pointer"
                              title="Xuất file Excel chi tiết phiếu của giáo viên này"
                            >
                              <Download size={12} />
                              <span>Excel</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">Không có phiếu đánh giá trong tháng đã chọn.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Vui lòng chọn tháng khác trên thanh công cụ (ví dụ Tháng 7 có 41 phiếu, Tháng 8 có 42 phiếu).
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer (CÁC NÚT XUẤT FILE HOẠT ĐỘNG THỰC - Yêu cầu 10) */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Đang chọn:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-200 font-bold text-slate-800">{selectedMonth}</span>
            <span>•</span>
            <span className="font-bold text-emerald-700">{filteredRecords.length} phiếu sẵn sàng</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filteredRecords.length > 0 && (
              <button
                type="button"
                onClick={handleBatchPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded-xl transition-colors shadow-xs"
                title="Mở toàn bộ phiếu đánh giá trong tháng để in A4 hoặc lưu PDF"
              >
                <Printer size={15} className="text-blue-600" />
                <span>IN TẬP PHIẾU (PDF / A4)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportSummaryExcel}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm shadow-emerald-600/30"
              title="Xuất bảng đánh giá viên chức theo tháng ra file Excel chuẩn"
            >
              <FileSpreadsheet size={16} />
              <span>XUẤT FILE EXCEL (.XLSX)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
