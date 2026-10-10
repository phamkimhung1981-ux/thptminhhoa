import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  Search,
  ShieldAlert,
  AlertTriangle,
  User,
  Users,
  Calendar,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import {
  YouthViolationRecord,
  StudentWithViolationsSummary
} from '../../types/youthDiscipline';
import { ClassInfo, Student, HomeroomAssignment } from '../../types/homeroom';
import { Teacher } from '../../types';
import { ACADEMIC_YEARS, getAllWeeksInYear, ALL_MONTH_OPTIONS } from '../../utils/schoolWeekUtils';
import {
  exportStudentViolationsListToExcel,
  exportStudentViolationsListToWord,
  StudentViolationExportItem
} from '../../utils/youthDisciplineExport';

interface ExportStudentViolationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: YouthViolationRecord[];
  classes: ClassInfo[];
  students: Student[];
  teachers?: Teacher[];
  assignments?: HomeroomAssignment[];
  workAssignments?: any[];
  defaultSchoolYear?: string;
  defaultWeek?: number;
  defaultMonth?: number;
  defaultClassId?: string;
}

export default function ExportStudentViolationsModal({
  isOpen,
  onClose,
  violations,
  classes,
  students,
  teachers = [],
  assignments = [],
  workAssignments = [],
  defaultSchoolYear = '2026–2027',
  defaultWeek = 0,
  defaultMonth = 0,
  defaultClassId = 'All'
}: ExportStudentViolationsModalProps) {
  if (!isOpen) return null;

  // Filter State
  const [selectedYear, setSelectedYear] = useState<string>(defaultSchoolYear);
  const [scopeType, setScopeType] = useState<'all' | 'grade' | 'class'>(
    defaultClassId && defaultClassId !== 'All' ? 'class' : 'all'
  );
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || 'All');

  const [timeScopeType, setTimeScopeType] = useState<'all' | 'week' | 'month'>(
    defaultWeek > 0 ? 'week' : defaultMonth > 0 ? 'month' : 'all'
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek || 1);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth || 10);

  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'violations' | 'deduction' | 'name'>('violations');

  const [signerTitle, setSignerTitle] = useState<string>('BÍ THƯ ĐOÀN TRƯỜNG');
  const [signerName, setSignerName] = useState<string>('Ban Thường vụ Đoàn trường');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const allWeeks = useMemo(() => getAllWeeksInYear(selectedYear), [selectedYear]);

  // Helper to get Homeroom teacher name
  const getHomeroomTeacherName = (clsIdOrName: string): string => {
    if (!clsIdOrName) return '—';

    // 12I special case
    if (clsIdOrName.toUpperCase() === '12I' || clsIdOrName.toLowerCase().includes('12i')) {
      return 'Hà Thị Thúy';
    }

    const foundClass = classes.find(c => c.id === clsIdOrName || c.name === clsIdOrName);
    if (foundClass?.homeroomTeacherName && foundClass.homeroomTeacherName.trim() !== '—') {
      return foundClass.homeroomTeacherName;
    }

    if (foundClass?.homeroomTeacherId && teachers.length > 0) {
      const t = teachers.find(teacher => teacher.id === foundClass.homeroomTeacherId);
      if (t) return t.name || (t as any).fullName || '';
    }

    if (assignments && assignments.length > 0) {
      const a = assignments.find(assign => assign.classId === clsIdOrName || assign.className === clsIdOrName);
      if (a?.teacherName) return a.teacherName;
    }

    return '—';
  };

  // Filter raw violations based on criteria
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      if (v.status === 'TU_CHOI') return false;

      // Filter by School Year
      if (selectedYear) {
        const vY = (v.schoolYear || '').replace(/[\u2010-\u2015]/g, '-').trim();
        const sY = selectedYear.replace(/[\u2010-\u2015]/g, '-').trim();
        if (vY && sY && vY !== sY) return false;
      }

      // Filter by Time Scope
      if (timeScopeType === 'week') {
        if (Number(v.weekNumber) !== Number(selectedWeek)) return false;
      } else if (timeScopeType === 'month') {
        if (v.monthNumber) {
          if (Number(v.monthNumber) !== Number(selectedMonth)) return false;
        } else if (v.violationDate) {
          const m = parseInt(v.violationDate.split('-')[1], 10);
          if (m !== Number(selectedMonth)) return false;
        }
      }

      // Filter by Class / Grade Scope
      if (scopeType === 'class') {
        if (selectedClassId !== 'All') {
          const matchClass =
            v.classId === selectedClassId ||
            v.className?.toLowerCase() === selectedClassId.toLowerCase() ||
            classes.some(c => c.id === selectedClassId && c.name?.toLowerCase() === v.className?.toLowerCase());
          if (!matchClass) return false;
        }
      } else if (scopeType === 'grade') {
        const matchGradeClass = classes.some(
          c => String(c.grade) === selectedGrade && (c.id === v.classId || c.name === v.className)
        );
        const matchGradeName = v.className?.startsWith(selectedGrade);
        if (!matchGradeClass && !matchGradeName) return false;
      }

      // Filter by Severity
      if (selectedSeverity !== 'All') {
        if (selectedSeverity === 'SERIOUS_ONLY') {
          if (v.severity !== 'Nghiêm trọng' && v.severity !== 'Rất nghiêm trọng') return false;
        } else if (v.severity !== selectedSeverity) {
          return false;
        }
      }

      return true;
    });
  }, [
    violations,
    selectedYear,
    timeScopeType,
    selectedWeek,
    selectedMonth,
    scopeType,
    selectedClassId,
    selectedGrade,
    selectedSeverity,
    classes
  ]);

  // Aggregate violating students
  const aggregatedStudents: StudentViolationExportItem[] = useMemo(() => {
    const studentMap = new Map<string, YouthViolationRecord[]>();

    filteredViolations.forEach(v => {
      const sKey = v.studentId && v.studentId !== 'ALL_CLASS' ? v.studentId : v.studentCode || `${v.studentName}_${v.className}`;
      if (!studentMap.has(sKey)) {
        studentMap.set(sKey, []);
      }
      studentMap.get(sKey)!.push(v);
    });

    const list: StudentViolationExportItem[] = [];

    studentMap.forEach((vList, sKey) => {
      const firstV = vList[0];
      const matchedStu = students.find(
        s => s.id === sKey || s.code === sKey || (s.code && s.code === firstV.studentCode) || (s.name === firstV.studentName && s.className === firstV.className)
      );

      const studentName = matchedStu?.fullName || matchedStu?.name || firstV.studentName || 'Học sinh';
      const studentCode = matchedStu?.code || firstV.studentCode || '';
      const className = matchedStu?.className || firstV.className || '';
      const classId = matchedStu?.classId || firstV.classId || '';

      const totalDeduction = vList.reduce((sum, item) => sum + Math.abs(Number(item.minusPoints) || 0), 0);
      const homeroomTeacher = getHomeroomTeacherName(className || classId);

      // Determine grade
      const grade = className.match(/^(\d+)/)?.[1] || '';

      list.push({
        studentId: sKey,
        studentName,
        studentCode,
        classId,
        className,
        violationCount: vList.length,
        totalDeduction,
        violations: vList.sort((a, b) => new Date(b.violationDate).getTime() - new Date(a.violationDate).getTime()),
        homeroomTeacherName: homeroomTeacher,
        grade,
        classification: totalDeduction >= 20 ? 'Chưa đạt' : totalDeduction >= 10 ? 'Đạt' : 'Khá'
      });
    });

    // Search filter
    let result = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        st =>
          st.studentName.toLowerCase().includes(q) ||
          (st.studentCode && st.studentCode.toLowerCase().includes(q)) ||
          st.className.toLowerCase().includes(q)
      );
    }

    // Sort
    return result.sort((a, b) => {
      if (sortBy === 'violations') {
        if (b.violationCount !== a.violationCount) return b.violationCount - a.violationCount;
        return b.totalDeduction - a.totalDeduction;
      } else if (sortBy === 'deduction') {
        if (b.totalDeduction !== a.totalDeduction) return b.totalDeduction - a.totalDeduction;
        return b.violationCount - a.violationCount;
      } else {
        // Name sort
        const compClass = a.className.localeCompare(b.className, 'vi');
        if (compClass !== 0) return compClass;
        return a.studentName.localeCompare(b.studentName, 'vi');
      }
    });
  }, [filteredViolations, students, classes, searchQuery, sortBy]);

  // Total metrics
  const totalStudentsCount = aggregatedStudents.length;
  const totalViolationsCount = aggregatedStudents.reduce((sum, s) => sum + s.violationCount, 0);
  const totalDeductionPoints = aggregatedStudents.reduce((sum, s) => sum + s.totalDeduction, 0);
  const uniqueClassesCount = new Set(aggregatedStudents.map(s => s.className)).size;

  // Title for scope
  const scopeTitle = useMemo(() => {
    let scopePart = 'Toàn trường';
    if (scopeType === 'grade') {
      scopePart = `Khối ${selectedGrade}`;
    } else if (scopeType === 'class') {
      const found = classes.find(c => c.id === selectedClassId);
      scopePart = `Lớp ${found?.name || selectedClassId}`;
    }

    let timePart = 'Cả năm học';
    if (timeScopeType === 'week') {
      timePart = `Tuần ${selectedWeek}`;
    } else if (timeScopeType === 'month') {
      timePart = `Tháng ${selectedMonth}`;
    }

    return `${scopePart} - ${timePart}`;
  }, [scopeType, selectedGrade, selectedClassId, classes, timeScopeType, selectedWeek, selectedMonth]);

  // Execute Excel Export
  const handleExportExcel = () => {
    if (aggregatedStudents.length === 0) {
      alert('Không có học sinh vi phạm nào trong phạm vi đã chọn để xuất file.');
      return;
    }
    setIsExporting(true);
    try {
      exportStudentViolationsListToExcel(
        aggregatedStudents,
        filteredViolations,
        scopeTitle,
        selectedYear,
        'TRƯỜNG THPT MINH HÒA'
      );
      setExportSuccessMsg(`Đã xuất thành công danh sách ${aggregatedStudents.length} học sinh vi phạm ra file Excel (.xlsx)!`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Lỗi xuất Excel:', err);
      alert('Có lỗi xảy ra khi tạo file Excel: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // Execute Word Export
  const handleExportWord = async () => {
    if (aggregatedStudents.length === 0) {
      alert('Không có học sinh vi phạm nào trong phạm vi đã chọn để xuất file.');
      return;
    }
    setIsExporting(true);
    try {
      await exportStudentViolationsListToWord(
        aggregatedStudents,
        scopeTitle,
        selectedYear,
        'TRƯỜNG THPT MINH HÒA',
        signerTitle,
        signerName
      );
      setExportSuccessMsg(`Đã xuất thành công danh sách ${aggregatedStudents.length} học sinh vi phạm ra văn bản Word (.docx)!`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Lỗi xuất Word:', err);
      alert('Có lỗi xảy ra khi tạo văn bản Word: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-rose-200 shadow-inner">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>XUẤT DANH SÁCH HỌC SINH VI PHẠM NỀN NẾP</span>
              </h2>
              <p className="text-xs text-rose-200 font-medium">
                Xuất file Excel (.xlsx) & Văn bản Word (.docx) chuẩn thể thức phục vụ họp giao ban, gửi GVCN & thông báo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={22} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {exportSuccessMsg && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Filter Controls Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200/80 space-y-3.5 flex-shrink-0 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Năm học */}
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Năm học</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-rose-500 shadow-2xs"
              >
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Phạm vi Lớp / Khối */}
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Phạm vi lớp học</label>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => { setScopeType('all'); setSelectedClassId('All'); }}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    scopeType === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Toàn trường
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('grade')}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    scopeType === 'grade' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Theo khối
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('class')}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    scopeType === 'class' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Theo lớp
                </button>
              </div>

              {scopeType === 'grade' && (
                <select
                  value={selectedGrade}
                  onChange={e => setSelectedGrade(e.target.value)}
                  className="w-full p-1.5 bg-white border border-rose-300 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="10">Khối 10 (Toàn bộ lớp 10)</option>
                  <option value="11">Khối 11 (Toàn bộ lớp 11)</option>
                  <option value="12">Khối 12 (Toàn bộ lớp 12)</option>
                </select>
              )}

              {scopeType === 'class' && (
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full p-1.5 bg-white border border-rose-300 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="All">-- Chọn tất cả các lớp --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.homeroomTeacherName ? `(GVCN: ${c.homeroomTeacherName})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Phạm vi Thời gian (Tuần / Tháng / Cả năm) */}
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Thời gian thống kê</label>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => setTimeScopeType('all')}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    timeScopeType === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cả năm
                </button>
                <button
                  type="button"
                  onClick={() => setTimeScopeType('month')}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    timeScopeType === 'month' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Theo tháng
                </button>
                <button
                  type="button"
                  onClick={() => setTimeScopeType('week')}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    timeScopeType === 'week' ? 'bg-rose-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Theo tuần
                </button>
              </div>

              {timeScopeType === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-rose-300 rounded-xl font-bold text-slate-900 outline-none"
                >
                  {ALL_MONTH_OPTIONS.map((mStr, idx) => {
                    const mNum = parseInt(mStr.replace(/\D/g, ''), 10) || idx + 1;
                    return (
                      <option key={mStr} value={mNum}>
                        {mStr}
                      </option>
                    );
                  })}
                </select>
              )}

              {timeScopeType === 'week' && (
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-rose-300 rounded-xl font-bold text-slate-900 outline-none"
                >
                  {allWeeks.map(w => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 4. Mức độ & Sắp xếp */}
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Mức độ vi phạm</label>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-rose-500 shadow-2xs mb-1.5"
              >
                <option value="All">Tất cả các mức độ</option>
                <option value="SERIOUS_ONLY">Chỉ lỗi Nghiêm trọng & Rất nghiêm trọng</option>
                <option value="Nhẹ">Nhẹ</option>
                <option value="Vừa">Vừa</option>
                <option value="Nghiêm trọng">Nghiêm trọng</option>
                <option value="Rất nghiêm trọng">Rất nghiêm trọng</option>
              </select>
            </div>
          </div>

          {/* Sub Toolbar: Search + Sort + Signer Info */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên học sinh, mã HS hoặc lớp..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-rose-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-slate-600 whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="violations">Nhiều lần vi phạm nhất</option>
                  <option value="deduction">Điểm trừ cao nhất</option>
                  <option value="name">Theo Lớp & Tên A-Z</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 text-[11px] whitespace-nowrap">Chức danh ký Word:</span>
              <input
                type="text"
                value={signerTitle}
                onChange={e => setSignerTitle(e.target.value)}
                placeholder="BÍ THƯ ĐOÀN TRƯỜNG"
                className="w-40 p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="px-6 py-2.5 bg-rose-50/70 border-b border-rose-200/60 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="text-rose-600">📌</span> Phạm vi xuất: <span className="text-rose-900 font-black">{scopeTitle}</span>
            </span>
          </div>

          <div className="flex items-center gap-5 font-bold">
            <span className="text-slate-700">
              Tổng số học sinh: <span className="text-rose-700 font-black text-sm">{totalStudentsCount}</span> em
            </span>
            <span className="text-slate-700">
              Tổng lượt vi phạm: <span className="text-amber-700 font-black text-sm">{totalViolationsCount}</span> lượt
            </span>
            <span className="text-slate-700">
              Tổng điểm trừ: <span className="text-rose-700 font-black text-sm">-{totalDeductionPoints}</span> đ
            </span>
            <span className="text-slate-700">
              Lớp liên quan: <span className="text-blue-700 font-black text-sm">{uniqueClassesCount}</span> lớp
            </span>
          </div>
        </div>

        {/* Live Preview Table */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {aggregatedStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-500 italic space-y-2">
              <ShieldAlert size={44} className="mx-auto text-slate-300" />
              <p className="font-extrabold text-slate-700 text-sm">
                Không tìm thấy học sinh nào vi phạm trong phạm vi được chọn.
              </p>
              <p className="text-slate-400 text-xs">
                Hãy thử chọn tuần/tháng khác hoặc mở rộng phạm vi lớp học.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 divide-x divide-slate-200">
                    <th className="py-2.5 px-3 text-center w-12">STT</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3 text-center">Mã HS</th>
                    <th className="py-2.5 px-3 text-center">Lớp</th>
                    <th className="py-2.5 px-3">GVCN</th>
                    <th className="py-2.5 px-3 text-center">Số lượt</th>
                    <th className="py-2.5 px-3 text-center">Điểm trừ</th>
                    <th className="py-2.5 px-4">Nội dung các lỗi vi phạm</th>
                    <th className="py-2.5 px-3 text-center">Mức độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {aggregatedStudents.map((st, idx) => {
                    const uniqueErrors = Array.from(
                      new Set(st.violations.map(v => v.criterionName || v.content || 'Vi phạm'))
                    ).join(', ');

                    const hasCritical = st.violations.some(
                      v => v.severity === 'Rất nghiêm trọng' || v.severity === 'Nghiêm trọng'
                    );

                    return (
                      <tr key={st.studentId} className="hover:bg-rose-50/30 transition-colors divide-x divide-slate-200">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{st.studentName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">{st.studentCode || '—'}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-blue-900">{st.className}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{st.homeroomTeacherName || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-extrabold rounded-md text-[11px]">
                            {st.violationCount} lượt
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-rose-600">
                          -{st.totalDeduction} đ
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-medium leading-relaxed">
                          {uniqueErrors}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasCritical ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold rounded-md text-[10px] uppercase">
                              Nghiêm trọng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[10px]">
                              Thường
                            </span>
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

        {/* Modal Footer with Export Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <span>Định dạng hỗ trợ:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">.xlsx (Excel)</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">.docx (Word)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs"
              title="In danh sách này"
            >
              <Printer size={16} />
              <span>In danh sách</span>
            </button>

            <button
              type="button"
              disabled={isExporting || aggregatedStudents.length === 0}
              onClick={handleExportWord}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer text-xs flex items-center gap-2 shadow-md hover:shadow-lg"
              title="Tải văn bản Word .docx danh sách học sinh vi phạm"
            >
              <FileText size={16} />
              <span>Xuất file Word (.docx)</span>
            </button>

            <button
              type="button"
              disabled={isExporting || aggregatedStudents.length === 0}
              onClick={handleExportExcel}
              className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-all cursor-pointer text-xs flex items-center gap-2 shadow-md hover:shadow-lg"
              title="Tải bảng tính Excel .xlsx danh sách học sinh vi phạm"
            >
              <FileSpreadsheet size={16} />
              <span>Xuất file Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
