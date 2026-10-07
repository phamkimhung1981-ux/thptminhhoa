import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Save,
  Trash2,
  Edit3,
  AlertCircle,
  History,
  Calendar,
  MapPin,
  Clock,
  RotateCcw,
  Search,
  Tag,
  ShieldAlert,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  Student,
  ConductCategory,
  ConductCriterion,
  ConductRecord,
  ClassInfo,
  ViolationSeverity,
  WarningLevel
} from '../../types/homeroom';
import { useAuth } from '../../store/AuthContext';
import { getDefaultDateForMonthAndWeek, getMonthNumberFromLabel } from '../../utils/schoolWeekUtils';
import { DEFAULT_CONDUCT_CATEGORIES, DEFAULT_CONDUCT_CRITERIA, DEFAULT_SERIOUS_VIOLATION_CONFIGS, isSpecialWarningCategory, isDatChuaDatCategory, getCriterionDeduction, isPassFailCriterion } from '../../lib/homeroomData';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  students: Student[];
  categories?: ConductCategory[];
  criteria?: ConductCriterion[];
  records?: ConductRecord[];
  onSave: (record: Omit<ConductRecord, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateRecord?: (id: string, updates: Partial<ConductRecord>) => Promise<void>;
  onDeleteRecord?: (id: string) => Promise<void>;
  defaultStudentId?: string;
  defaultCriterionId?: string;
  defaultType?: 'plus' | 'minus';
  violationConfigs?: any[];
  selectedWeek?: number;
  selectedMonth?: string;
  selectedSchoolYear?: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
}

export default function RecordModal({
  isOpen,
  onClose,
  selectedClass,
  students,
  categories = [],
  criteria = [],
  records = [],
  onSave,
  onUpdateRecord,
  onDeleteRecord,
  defaultStudentId,
  defaultCriterionId,
  defaultType = 'minus',
  selectedWeek,
  selectedMonth,
  selectedSchoolYear
}: RecordModalProps) {
  const { user } = useAuth();

  // Active student state
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Mode: 'minus' (Vi phạm) or 'plus' (Điểm cộng / Khen thưởng)
  const [pointType, setPointType] = useState<'plus' | 'minus'>('minus');

  // Evaluation result state for the 6 Dat/ChuaDat categories: 'dat' | 'chua_dat' | null
  const [evaluationStatus, setEvaluationStatus] = useState<'dat' | 'chua_dat' | null>(null);

  // Category & Criterion selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>('');
  const [criterionSearch, setCriterionSearch] = useState<string>('');

  // Form Fields
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pointMagnitude, setPointMagnitude] = useState<number>(0);
  const [formViolationCount, setFormViolationCount] = useState<number>(1);
  const [level, setLevel] = useState<ViolationSeverity>('Vừa');
  const [location, setLocation] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [customCriterionName, setCustomCriterionName] = useState<string>('');

  // Combined categories & criteria (fallback to defaults if empty)
  const activeCategories = useMemo(() => {
    return categories.length > 0 ? categories : DEFAULT_CONDUCT_CATEGORIES;
  }, [categories]);

  const activeCriteria = useMemo(() => {
    return criteria.length > 0 ? criteria : DEFAULT_CONDUCT_CRITERIA;
  }, [criteria]);

  // Active student object
  const currentStudent = students.find(s => s.id === activeStudentId) || (students.length > 0 ? students[0] : null);

  // Previous count of this violation for current student (for reference hint)
  const previousViolationCount = useMemo(() => {
    if (!currentStudent) return 0;
    return records.filter(r => 
      r.studentId === currentStudent.id && 
      ((selectedCriterionId && r.criterionId === selectedCriterionId) || 
       (!selectedCriterionId && customCriterionName && r.criterionName.toLowerCase() === customCriterionName.toLowerCase()))
    ).length;
  }, [selectedCriterionId, customCriterionName, currentStudent, records]);

  // Edit record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string>('');

  // History records for current student
  const currentStudentHistory = useMemo(() => {
    return records.filter(r => r.studentId === currentStudent?.id);
  }, [records, currentStudent]);

  // Derived objects for category and criterion
  const selectedCatObj = activeCategories.find(c => c.id === selectedCategoryId);
  const currentCriterion = activeCriteria.find(c => c.id === selectedCriterionId);
  const critCatObj = currentCriterion ? activeCategories.find(c => c.id === currentCriterion.categoryId) : null;

  // Determine if the current selection is one of the 6 "ĐẠT / CHƯA ĐẠT" categories or a pass-fail criterion
  const isEvaluationGroup = useMemo(() => {
    // If a criterion is selected, check if it's pass-fail or in a dat/chua_dat category
    if (currentCriterion) {
      if (isPassFailCriterion(currentCriterion) || isDatChuaDatCategory(currentCriterion.categoryId, currentCriterion.categoryName || critCatObj?.name, currentCriterion)) {
        return true;
      }
    }
    // If category dropdown has a selection other than 'all'
    if (selectedCategoryId && selectedCategoryId !== 'all') {
      if (isDatChuaDatCategory(selectedCategoryId, selectedCatObj?.name)) {
        return true;
      }
    }
    return false;
  }, [currentCriterion, critCatObj, selectedCategoryId, selectedCatObj]);

  // Filtered criteria based on pointType, category, search
  const filteredCriteria = useMemo(() => {
    return activeCriteria.filter(c => {
      // Status
      if (c.status === 'inactive') return false;
      // Point type
      if (c.pointType !== pointType) return false;
      // Category
      if (selectedCategoryId !== 'all' && c.categoryId !== selectedCategoryId) return false;
      // Search
      if (criterionSearch.trim()) {
        const q = criterionSearch.trim().toLowerCase();
        const codeMatch = (c.code || '').toLowerCase().includes(q);
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [activeCriteria, pointType, selectedCategoryId, criterionSearch]);

  // Initialize modal state
  useEffect(() => {
    if (isOpen) {
      const mNum = getMonthNumberFromLabel(selectedMonth || 'Tháng 09');
      const wNum = selectedWeek !== undefined ? selectedWeek : 3;
      setRecordDate(getDefaultDateForMonthAndWeek(mNum, wNum, selectedSchoolYear || '2026–2027'));

      if (defaultStudentId) {
        setActiveStudentId(defaultStudentId);
      } else if (students.length > 0 && !activeStudentId) {
        setActiveStudentId(students[0].id);
      }

      setPointType(defaultType || 'minus');
      setSelectedCategoryId('all');
      setCriterionSearch('');
      setEditingRecordId(null);
      setEvaluationStatus(null);
      setErrorMsg('');
      setSuccessToast('');
      setLocation('');
      setNote('');
      setCustomCriterionName('');
      setPointMagnitude(0);
      setFormViolationCount(1);

      // Pick default criterion if provided
      if (defaultCriterionId) {
        const found = activeCriteria.find(c => c.id === defaultCriterionId);
        if (found) {
          applyCriterion(found);
          return;
        }
      }

      // Do not auto-select first criterion on open; leave "Chưa chọn tiêu chí"
      setSelectedCriterionId('');
    }
  }, [isOpen, defaultStudentId, defaultCriterionId, defaultType, students, activeCriteria]);

  // Select criterion handler
  const applyCriterion = (crit: ConductCriterion) => {
    // 1. Reset old criterion and clear custom name
    setSelectedCriterionId(crit.id);
    setCustomCriterionName('');

    // 2. Check if category belongs to the 6 "ĐẠT / CHƯA ĐẠT" categories or pass-fail criterion
    const isCatDatChuaDat = isPassFailCriterion(crit) || isDatChuaDatCategory(crit.categoryId, crit.categoryName, crit);

    // 3. Extract exact deduction for this criterion (no hardcoded fallback)
    const rawDeduction = getCriterionDeduction(crit);
    const deduction = isCatDatChuaDat ? 0 : Math.abs(rawDeduction);
    setPointMagnitude(deduction);

    // 4. Reset violation count to 1 as required
    setFormViolationCount(1);

    // 5. Reset evaluation status & set severity
    setEvaluationStatus(null);
    setLevel(crit.severity || (crit.pointType === 'plus' ? 'Nhẹ' : 'Vừa'));

    // 6. Synchronize category selection if user was on a different specific category
    if (selectedCategoryId !== 'all' && crit.categoryId && selectedCategoryId !== crit.categoryId) {
      setSelectedCategoryId(crit.categoryId);
    }
  };

  const handleSelectCriterion = (crit: ConductCriterion) => {
    applyCriterion(crit);
  };

  // Switch point type (Vi phạm vs Khen thưởng)
  const handleTogglePointType = (type: 'plus' | 'minus') => {
    setPointType(type);
    setSelectedCriterionId('');
    setCustomCriterionName('');
    setSelectedCategoryId('all');
    setFormViolationCount(1);
    setPointMagnitude(0);
    setEvaluationStatus(null);
    setLevel('Vừa');
  };

  // Handle Edit existing record from history
  const handleEditHistoryRecord = (rec: ConductRecord) => {
    setEditingRecordId(rec.id);
    setRecordDate(rec.recordDate || new Date().toISOString().split('T')[0]);
    setPointType(rec.pointType || 'minus');
    const isCatDatChuaDat = isDatChuaDatCategory(rec.categoryId, rec.categoryName) || Boolean(rec.evaluationStatus);
    const deductionPerOcc = isCatDatChuaDat
      ? 0
      : Math.abs(
          rec.deductionPerOccurrence !== undefined && rec.deductionPerOccurrence !== null
            ? Number(rec.deductionPerOccurrence)
            : (rec.point !== undefined && rec.point !== null ? Number(rec.point) : 0)
        );
    setPointMagnitude(deductionPerOcc);
    setLevel(rec.level || 'Vừa');
    setLocation(rec.location || '');
    setNote(rec.note || '');
    setEvaluationStatus(rec.evaluationStatus || null);

    setFormViolationCount(rec.violationCount || 1);

    if (rec.criterionId) {
      setSelectedCriterionId(rec.criterionId);
      const crit = activeCriteria.find(c => c.id === rec.criterionId);
      if (crit?.categoryId && selectedCategoryId !== 'all') {
        setSelectedCategoryId(crit.categoryId);
      }
    } else {
      setSelectedCriterionId('');
      setCustomCriterionName(rec.criterionName || '');
    }

    setSuccessToast(`✏️ Đã tải lại bản ghi [${rec.criterionName}] để chỉnh sửa.`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEvaluationStatus(null);
    setLocation('');
    setNote('');
    setCustomCriterionName('');
    setSelectedCriterionId('');
    setPointMagnitude(0);
    setFormViolationCount(1);
  };

  // Delete record from history
  const handleDeleteHistoryRecord = async (recId: string) => {
    if (!onDeleteRecord) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi nề nếp / vi phạm này của học sinh?')) {
      try {
        setSubmitting(true);
        await onDeleteRecord(recId);
        if (editingRecordId === recId) {
          handleCancelEdit();
        }
        setSuccessToast('✅ Đã xóa bản ghi thành công.');
        setSubmitting(false);
        setTimeout(() => setSuccessToast(''), 3000);
      } catch (err: any) {
        setErrorMsg('Lỗi khi xóa bản ghi: ' + err.message);
        setSubmitting(false);
      }
    }
  };

  // Save record handler
  const handleSave = async () => {
    try {
      if (!currentStudent) {
        throw new Error('Chưa chọn học sinh để ghi nhận.');
      }

      setSubmitting(true);
      setErrorMsg('');
      setSuccessToast('');

      const selCrit = activeCriteria.find(c => c.id === selectedCriterionId);
      const criterionName = selCrit ? selCrit.name : customCriterionName.trim();

      if (!criterionName) {
        throw new Error('Vui lòng chọn tiêu chí vi phạm.');
      }

      const dateObj = new Date(recordDate);
      const parsedMonth = selectedMonth ? parseInt(selectedMonth.replace(/\D/g, ''), 10) : NaN;
      const monthNumber = !isNaN(parsedMonth) && parsedMonth > 0 ? parsedMonth : (dateObj.getMonth() + 1);
      const weekNumber = selectedWeek !== undefined ? selectedWeek : Math.ceil(((dateObj.getTime() - new Date(dateObj.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
      const schoolYear = selectedSchoolYear || selectedClass?.schoolYear || '2026–2027';

      // Category info
      const catObj = activeCategories.find(c => c.id === (selCrit?.categoryId || selectedCategoryId));
      const categoryId = catObj?.id || selCrit?.categoryId || 'cat_other';
      const categoryName = catObj?.name || selCrit?.categoryName || 'NỘI QUY NHÀ TRƯỜNG';

      // Check if current category is one of the 6 "ĐẠT / CHƯA ĐẠT" categories
      const isTargetEvaluationCategory = isEvaluationGroup || isDatChuaDatCategory(categoryId, categoryName);

      if (isTargetEvaluationCategory) {
        if (!evaluationStatus) {
          throw new Error('Vui lòng chọn kết quả đánh giá (ĐẠT hoặc CHƯA ĐẠT) trước khi ghi nhận.');
        }
      }

      // Point calculation (+ or -) with occurrence count multiplication
      const baseRate = isTargetEvaluationCategory 
        ? 0 
        : (pointMagnitude > 0 ? pointMagnitude : Math.abs(getCriterionDeduction(selCrit)));
      const count = isTargetEvaluationCategory ? 1 : Math.max(1, formViolationCount);
      const totalDeduction = isTargetEvaluationCategory 
        ? 0 
        : (pointType === 'minus' ? -(count * baseRate) : (count * baseRate));
      const numericPoint = totalDeduction;

      // Warning and special warning checks (ONLY for non-evaluation groups)
      const isATGT = !isTargetEvaluationCategory && (categoryName.toUpperCase().includes('GIAO THÔNG') || criterionName.toLowerCase().includes('mũ bảo hiểm') || criterionName.toLowerCase().includes('giao thông'));
      const isViolence = !isTargetEvaluationCategory && (categoryName.toUpperCase().includes('ĐẠO ĐỨC') || criterionName.toLowerCase().includes('đánh nhau') || criterionName.toLowerCase().includes('xúc phạm'));
      const isCheating = !isTargetEvaluationCategory && (categoryName.toUpperCase().includes('KIỂM TRA') || criterionName.toLowerCase().includes('gian lận'));
      const isSpecial = isATGT || isViolence || isCheating;

      let warningLabel = '';
      if (isATGT) warningLabel = '⚠ ATGT';
      else if (isViolence) warningLabel = '🔴 BẠO LỰC HỌC ĐƯỜNG';
      else if (isCheating) warningLabel = '🔴 GIAN LẬN THI CỬ';
      else if (!isTargetEvaluationCategory && (level === 'Nghiêm trọng' || level === 'Rất nghiêm trọng')) warningLabel = '🔴 VI PHẠM NGHIÊM TRỌNG';

      const payload = {
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        classId: selectedClass?.id || currentStudent.classId,
        className: selectedClass?.name || currentStudent.className || '10A',
        schoolYear,
        weekNumber,
        monthNumber,
        criterionId: selCrit?.id || `crit_custom_${Date.now()}`,
        criterionName,
        categoryId,
        categoryName,
        categoryType: (isTargetEvaluationCategory ? 'NỘI QUY' : isATGT ? 'ATGT' : isViolence ? 'BẠO LỰC HỌC ĐƯỜNG' : isCheating ? 'GIAN LẬN THI CỬ' : 'NỘI QUY') as any,
        location: location.trim(),
        pointType,
        point: numericPoint,
        violationCount: isTargetEvaluationCategory ? undefined : count,
        deductionPerOccurrence: isTargetEvaluationCategory ? undefined : (pointType === 'minus' ? -baseRate : baseRate),
        totalDeduction: isTargetEvaluationCategory ? undefined : totalDeduction,
        level,
        evaluationStatus: isTargetEvaluationCategory ? evaluationStatus : undefined,
        hasConductWarning: !isTargetEvaluationCategory && pointType === 'minus' && (isSpecial || level === 'Nghiêm trọng' || level === 'Rất nghiêm trọng'),
        special_warning: isSpecial,
        special_warning_message: isSpecial ? `Học sinh có vi phạm thuộc nhóm cảnh báo đặc biệt: ${warningLabel}.` : undefined,
        conduct_rating: isSpecial ? 'YẾU / CHƯA ĐẠT' : undefined,
        warningLevel: (isSpecial ? 'critical' : (level === 'Rất nghiêm trọng' ? 'critical' : 'serious')) as WarningLevel,
        warningLabel: !isTargetEvaluationCategory && pointType === 'minus' ? warningLabel : undefined,
        proposedRating: isSpecial ? 'YẾU / CHƯA ĐẠT' : (level === 'Vừa' ? 'Khống chế Khá' : 'Theo dõi'),
        requiresBghApproval: isSpecial || (!isTargetEvaluationCategory && (level === 'Nghiêm trọng' || level === 'Rất nghiêm trọng')),
        bghApprovalStatus: (isSpecial || (!isTargetEvaluationCategory && (level === 'Nghiêm trọng' || level === 'Rất nghiêm trọng'))) ? ('Chưa duyệt' as const) : undefined,
        note: note.trim(),
        recordedBy: user?.id || 'gvcn',
        recordedByName: user?.name || 'Giáo viên Chủ nhiệm',
        recordDate
      };

      if (editingRecordId && onUpdateRecord) {
        await onUpdateRecord(editingRecordId, payload);
        if (isTargetEvaluationCategory) {
          setSuccessToast(`✅ Đã cập nhật bản ghi [${criterionName}] • Kết quả: ${evaluationStatus === 'dat' ? '🟢 ĐẠT' : '🔴 CHƯA ĐẠT'} (0đ) cho ${currentStudent.name}!`);
        } else {
          setSuccessToast(`✅ Đã cập nhật bản ghi [${criterionName}] (${numericPoint > 0 ? '+' : ''}${numericPoint}đ) cho ${currentStudent.name}!`);
        }
        setEditingRecordId(null);
      } else {
        await onSave(payload);
        if (isTargetEvaluationCategory) {
          setSuccessToast(`✅ Đã ghi nhận [${criterionName}] • Kết quả: ${evaluationStatus === 'dat' ? '🟢 ĐẠT' : '🔴 CHƯA ĐẠT'} (0đ) cho ${currentStudent.name}!`);
        } else {
          setSuccessToast(`✅ Đã ghi nhận [${criterionName}] (${numericPoint > 0 ? '+' : ''}${numericPoint}đ) cho ${currentStudent.name}!`);
        }
      }

      // Reset form fields
      setEvaluationStatus(null);
      setLocation('');
      setNote('');
      setCustomCriterionName('');

      setSubmitting(false);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu ghi nhận.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <ShieldAlert size={20} className="text-amber-300 shrink-0" />
              GHI NHẬN NỀN NẾP & VI PHẠM HỌC SINH
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Chọn tiêu chí nền nếp • Điểm cộng / Điểm trừ • Tự động đối soát quy định rèn luyện
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Student Switcher Banner */}
        {currentStudent ? (
          <div className="bg-blue-50/90 border-b border-blue-200 p-3.5 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-base shadow-xs shrink-0">
                {currentStudent.name.split(' ').pop()?.charAt(0) || 'H'}
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                  👤 HỌC SINH ĐƯỢC GHI NHẬN
                </span>
                <div className="font-black text-blue-950 text-base flex items-center gap-2">
                  <span>{currentStudent.name}</span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                    Mã HS: <strong className="font-mono text-blue-900">{currentStudent.code}</strong>
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                    Lớp: <strong className="text-blue-900">{selectedClass?.name || currentStudent.className || '10A'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Switch student dropdown */}
            {students.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium">Đổi HS khác:</span>
                <select
                  value={activeStudentId}
                  onChange={(e) => {
                    setActiveStudentId(e.target.value);
                    setEditingRecordId(null);
                    setEvaluationStatus(null);
                  }}
                  className="bg-transparent font-bold text-xs text-blue-950 outline-none cursor-pointer"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Form Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Toast Notice */}
          {successToast && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs p-3 rounded-xl flex items-center gap-2 font-bold shadow-xs animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            {/* Header row: Loại ghi nhận (Điểm trừ / Điểm cộng) & Ngày ghi nhận */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Loại ghi nhận:</span>
                <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleTogglePointType('minus')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pointType === 'minus'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🔴 Vi phạm (- điểm)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePointType('plus')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pointType === 'plus'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🟢 Điểm cộng (+ điểm)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700">
                  Ngày ghi nhận:
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  required
                />

                {editingRecordId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer flex items-center gap-1 ml-2"
                  >
                    <RotateCcw size={12} /> Hủy sửa
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter & Search row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers size={13} className="text-blue-600" />
                  <span>Nhóm danh mục tiêu chí:</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSelectedCategoryId(newCat);
                    if (newCat !== 'all' && selectedCriterionId) {
                      const crit = activeCriteria.find(c => c.id === selectedCriterionId);
                      if (crit && crit.categoryId !== newCat) {
                        setSelectedCriterionId('');
                        setCustomCriterionName('');
                        setFormViolationCount(1);
                        setPointMagnitude(0);
                        setEvaluationStatus(null);
                        setLevel('Vừa');
                      }
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                >
                  <option value="all">-- Tất cả các nhóm danh mục ({activeCategories.length}) --</option>
                  {activeCategories.map(cat => {
                    const isDatCĐ = isDatChuaDatCategory(cat.id, cat.name);
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {isDatCĐ ? '— [ĐÁNH GIÁ ĐẠT/CHƯA ĐẠT]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Search size={13} className="text-blue-600" />
                  <span>Tìm nhanh tiêu chí:</span>
                </label>
                <input
                  type="text"
                  value={criterionSearch}
                  onChange={(e) => setCriterionSearch(e.target.value)}
                  placeholder="Nhập tên tiêu chí, nội dung vi phạm (Ví dụ: muộn, đồng phục, đánh nhau, gian lận...)"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Criteria Selection List / Grid */}
            <div>
              <label className="block text-xs font-extrabold text-blue-950 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>DANH SÁCH TIÊU CHÍ NỀN NẾP ({filteredCriteria.length})</span>
                {currentCriterion ? (
                  <span className="text-[11px] font-bold text-blue-600">
                    Đã chọn: [{currentCriterion.code}] {currentCriterion.name}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400">
                    Đã chọn: Chưa chọn tiêu chí
                  </span>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                {filteredCriteria.length === 0 ? (
                  <div className="sm:col-span-2 p-6 text-center text-xs text-slate-400">
                    Không tìm thấy tiêu chí nào phù hợp với bộ lọc tìm kiếm.
                  </div>
                ) : (
                  filteredCriteria.map((crit) => {
                    const isSelected = selectedCriterionId === crit.id;
                    const isMinus = crit.pointType === 'minus';
                    const isCritDatCĐ = isDatChuaDatCategory(crit.categoryId, crit.categoryName, crit) || isPassFailCriterion(crit);

                    return (
                      <button
                        key={crit.id}
                        type="button"
                        onClick={() => handleSelectCriterion(crit)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 text-blue-950 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {crit.code}
                            </span>
                            <span className="text-xs font-bold truncate">
                              {crit.name}
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {crit.description}
                            </p>
                          )}
                        </div>

                        <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-md border ${
                          isCritDatCĐ
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[11px]'
                            : isMinus
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {isCritDatCĐ
                            ? '[ĐẠT/CHƯA ĐẠT]'
                            : crit.defaultPoint > 0 ? `+${crit.defaultPoint}` : `${crit.defaultPoint}đ`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom criterion input if needed */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hoặc nhập tiêu chí / nội dung vi phạm tự do (nếu không có trong danh sách trên):
              </label>
              <input
                type="text"
                value={customCriterionName}
                onChange={(e) => {
                  setCustomCriterionName(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedCriterionId('');
                  }
                }}
                placeholder="Nhập tên nội dung nền nếp / vi phạm cụ thể..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              />
            </div>

            {/* Points & Severity Level row OR Dat/ChuaDat Evaluation for 6 Groups */}
            {isEvaluationGroup ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* 1. Đánh giá Đạt / Chưa đạt */}
                <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border-2 border-blue-300 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={16} className="text-blue-600" />
                      <span>KẾT QUẢ ĐÁNH GIÁ (BẮT BUỘC CHỌN)</span>
                    </label>
                    {evaluationStatus ? (
                      <div className={`text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs border ${
                        evaluationStatus === 'dat'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        <span>{evaluationStatus === 'dat' ? '🟢 KẾT QUẢ: ĐẠT' : '🔴 KẾT QUẢ: CHƯA ĐẠT'}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg animate-pulse">
                        ⚠️ Chưa chọn kết quả
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEvaluationStatus('dat')}
                      className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                        evaluationStatus === 'dat'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300 scale-[1.01]'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500'
                      }`}
                    >
                      <span className="text-base">🟢</span>
                      <span>ĐẠT</span>
                      {evaluationStatus === 'dat' && <CheckCircle2 size={18} className="text-white ml-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEvaluationStatus('chua_dat')}
                      className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                        evaluationStatus === 'chua_dat'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300 scale-[1.01]'
                          : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300 hover:border-rose-500'
                      }`}
                    >
                      <span className="text-base">🔴</span>
                      <span>CHƯA ĐẠT</span>
                      {evaluationStatus === 'chua_dat' && <CheckCircle2 size={18} className="text-white ml-1" />}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium italic">
                    * Nhóm tiêu chí này áp dụng cơ chế đánh giá Đạt / Chưa đạt, <strong>không trừ điểm</strong> (Điểm trừ = 0) và không làm giảm điểm rèn luyện của học sinh.
                  </p>
                </div>

                {/* 2. Điểm trừ: Không áp dụng điểm trừ (khóa cố định) & Mức độ */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điểm trừ:
                    </label>
                    <div className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Không áp dụng điểm trừ</span>
                      <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">0 điểm</span>
                    </div>
                  </div>

                  {/* Mức độ vi phạm / đánh giá */}
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức độ đánh giá:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { val: 'Nhẹ', label: '🟢 Nhẹ' },
                        { val: 'Vừa', label: '🟡 Vừa' },
                        { val: 'Nghiêm trọng', label: '🔴 Nghiêm trọng' },
                        { val: 'Rất nghiêm trọng', label: '🚨 Rất nghiêm trọng' }
                      ].map(item => (
                        <label
                          key={item.val}
                          className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                            level === item.val
                              ? 'bg-blue-100 border-blue-400 text-blue-950 font-black shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="severity_level_radio"
                            value={item.val}
                            checked={level === item.val}
                            onChange={() => setLevel(item.val as any)}
                            className="accent-blue-600 shrink-0"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pointType === 'minus' && !isEvaluationGroup && (
                  <div className="bg-blue-50/90 border-2 border-blue-300 rounded-2xl p-4 space-y-3 shadow-2xs mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider block">TIÊU CHÍ & SỐ LẦN MẮC LỖI</span>
                        <strong className="text-sm font-black text-blue-950">
                          {currentCriterion ? `[${currentCriterion.code}] ${currentCriterion.name}` : (customCriterionName || 'Nội dung tùy chỉnh')}
                        </strong>
                      </div>
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-xl border border-rose-300">
                        Điểm trừ mỗi lần: -{pointMagnitude} điểm/lần
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/80 items-center">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                          <span>SỐ LẦN MẮC LỖI:</span>
                          {previousViolationCount > 0 && (
                            <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                              (Đã có {previousViolationCount} lần vi phạm trước đó)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formViolationCount}
                          onChange={(e) => setFormViolationCount(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 text-xs font-black border border-blue-300 rounded-xl bg-white text-blue-950 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          TỔNG ĐIỂM TRỪ (Tự động tính):
                        </label>
                        <div className="px-3 py-2 text-sm font-black border border-rose-300 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-between">
                          <span>Tổng cộng:</span>
                          <span className="font-mono text-base">-{formViolationCount * pointMagnitude} điểm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
                {/* Điểm */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Điểm số {pointType === 'minus' ? 'trừ' : 'cộng'}:
                  </label>
                  <div className="relative">
                    <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 font-black text-sm ${
                      pointType === 'minus' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {pointType === 'minus' ? '-' : '+'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pointMagnitude}
                      onChange={(e) => setPointMagnitude(Math.abs(Number(e.target.value)))}
                      className={`w-full pl-6 pr-3 py-1.5 text-xs font-bold border rounded-lg outline-none focus:ring-2 ${
                        pointType === 'minus'
                          ? 'border-rose-300 text-rose-700 bg-rose-50 focus:ring-rose-400'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Mức độ vi phạm */}
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mức độ vi phạm / đánh giá:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { val: 'Nhẹ', label: '🟢 Nhẹ' },
                      { val: 'Vừa', label: '🟡 Vừa' },
                      { val: 'Nghiêm trọng', label: '🔴 Nghiêm trọng' },
                      { val: 'Rất nghiêm trọng', label: '🚨 Rất nghiêm trọng' }
                    ].map(item => (
                      <label
                        key={item.val}
                        className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                          level === item.val
                            ? 'bg-rose-100 border-rose-400 text-rose-950 font-black shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="severity_level_radio"
                          value={item.val}
                          checked={level === item.val}
                          onChange={() => setLevel(item.val as any)}
                          className="accent-rose-600 shrink-0"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* Địa điểm vi phạm */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin size={13} className="text-blue-600" />
                <span>Địa điểm vi phạm (nếu có):</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Cổng trường, Sân trường, Phòng 204, Bãi gửi xe, Tuyến đường ngoài trường..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Ghi chú / mô tả */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú / mô tả chi tiết:
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập chi tiết về diễn biến vụ việc hoặc lưu ý thêm..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Lịch sử ghi nhận của học sinh này */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-2 p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <History size={16} className="text-blue-600" />
                LỊCH SỬ GHI NHẬN CỦA HỌC SINH NÀY ({currentStudent?.name})
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                Tổng số lượt đã ghi nhận: <strong className="text-rose-700">{currentStudentHistory.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 min-w-[120px]">Nhóm danh mục</th>
                    <th className="p-2.5 min-w-[170px]">Tiêu chí / Nội dung</th>
                    <th className="p-2.5 w-16 text-center">Số lần</th>
                    <th className="p-2.5 w-20 text-center">Điểm/lần</th>
                    <th className="p-2.5 w-24 text-center">Tổng điểm trừ</th>
                    <th className="p-2.5 w-28 text-center">Kết quả</th>
                    <th className="p-2.5 w-20 text-center">Mức độ</th>
                    <th className="p-2.5 w-24 text-center">Ngày</th>
                    <th className="p-2.5 min-w-[120px]">Địa điểm & Ghi chú</th>
                    <th className="p-2.5 w-24 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentStudentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400">
                        Học sinh {currentStudent?.name} chưa có bản ghi nền nếp / vi phạm nào.
                      </td>
                    </tr>
                  ) : (
                    currentStudentHistory.map((rec) => {
                      const isPlus = rec.pointType === 'plus' || rec.recordType === 'TICH_CUC';
                      const isDatChuaDat = isDatChuaDatCategory(rec.categoryId, rec.categoryName) || Boolean(rec.evaluationStatus);

                      const critHistoryCount = currentStudentHistory.filter(item => 
                        (rec.criterionId && item.criterionId === rec.criterionId) || 
                        (!rec.criterionId && item.criterionName === rec.criterionName)
                      ).length;
                      const recCount = rec.violationCount || critHistoryCount || 1;
                      const recDeductionPerOcc = isDatChuaDat ? 0 : Math.abs(
                        rec.deductionPerOccurrence !== undefined && rec.deductionPerOccurrence !== null
                          ? Number(rec.deductionPerOccurrence)
                          : (rec.point !== undefined && rec.point !== null ? Number(rec.point) : 0)
                      );
                      const recTotalDed = isDatChuaDat ? 0 : (rec.totalDeduction !== undefined ? Math.abs(Number(rec.totalDeduction)) : (recCount * recDeductionPerOcc));

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-semibold text-slate-700 text-[11px]">
                            {rec.categoryName || '—'}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            <div>
                              <span>{rec.criterionName}</span>
                              {rec.special_warning && (
                                <span className="ml-1 text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                                  Cảnh báo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-blue-900">
                            {isDatChuaDat || isPlus ? '—' : `${recCount} lần`}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-700">
                            {isDatChuaDat || isPlus ? '—' : `-${recDeductionPerOcc}đ`}
                          </td>
                          <td className="p-2.5 text-center">
                            {isDatChuaDat ? (
                              <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap" title="Không áp dụng điểm trừ">
                                0đ
                              </span>
                            ) : isPlus ? (
                              <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                +{Math.abs(rec.point || 0)}đ
                              </span>
                            ) : (
                              <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
                                -{recTotalDed}đ
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {rec.evaluationStatus === 'dat' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                🟢 ĐẠT
                              </span>
                            ) : (rec.evaluationStatus === 'chua_dat' || (isDatChuaDat && (rec.pointType === 'minus' || (rec.point || 0) < 0 || Boolean(rec.level) || rec.recordType === 'VI_PHAM'))) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
                                🔴 CHƯA ĐẠT
                              </span>
                            ) : isDatChuaDat ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                🟢 ĐẠT
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-slate-600 font-medium whitespace-nowrap">
                            {rec.level || 'Nhẹ'}
                          </td>
                          <td className="p-2.5 text-center text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {rec.recordDate}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] max-w-[160px]">
                            {rec.location && <div className="font-semibold text-slate-700">📍 {rec.location}</div>}
                            <div className="truncate">{rec.note || '—'}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditHistoryRecord(rec)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                                title="Sửa bản ghi này"
                              >
                                <Edit3 size={11} /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHistoryRecord(rec.id)}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                                title="Xóa bản ghi này"
                              >
                                <Trash2 size={11} /> Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Ghi nhận nền nếp cho học sinh <strong className="text-slate-800">{currentStudent?.name}</strong>.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Hủy / Đóng
            </button>

            {/* Save Record button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-5 py-2.5 bg-[#1457D9] hover:bg-[#123B78] active:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              {submitting
                ? 'Đang lưu...'
                : editingRecordId
                ? '💾 CẬP NHẬT BẢN GHI'
                : `💾 GHI NHẬN CHO ${currentStudent?.name?.toUpperCase() || 'HỌC SINH'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
