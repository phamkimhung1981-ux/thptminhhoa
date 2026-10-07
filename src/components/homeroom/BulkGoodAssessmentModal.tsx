import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  FileText,
  Users,
  Calendar,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Student, ClassInfo, TeacherAssessment, EvaluationRatingConfig } from '../../types/homeroom';
import { DEFAULT_RATING_TIERS } from '../../lib/homeroomData';
import { useAuth } from '../../store/AuthContext';

export const DEFAULT_GOOD_ASSESSMENT = {
  ruleCompliance: 'Chấp hành tốt mọi nội quy nhà trường và quy định của lớp.',
  learningAttitude: 'Đi học đầy đủ, đúng giờ, hăng hái phát biểu xây dựng bài.',
  responsibility: 'Có tinh thần trách nhiệm cao trong công việc được giao.',
  collectiveActivities: 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp.',
  relationships: 'Kính trọng thầy cô, hòa đồng, thân thiện với bạn bè.',
  selfDiscipline: 'Có ý thức tự giác cao trong học tập và rèn luyện.',
  comment: 'Học sinh thực hiện nghiêm túc nội quy, có ý thức tốt trong học tập và rèn luyện.',
  levelRating: 'Tốt' as const,
  teacherProposedRating: 'Tốt' as const,
  needsMonitoring: false
};

interface BulkGoodAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  students: Student[];
  schoolYear: string;
  semester?: string;
  month: string;
  monthNumber?: number;
  existingAssessments: TeacherAssessment[];
  ratingConfig?: EvaluationRatingConfig | null;
  studentScores?: Record<string, number>;
  initialSelectMode?: 'all' | 'unevaluated';
  onSaveBulk: (
    selectedStudentIds: string[],
    data: {
      ruleCompliance: string;
      learningAttitude: string;
      responsibility: string;
      collectiveActivities: string;
      relationships: string;
      selfDiscipline: string;
      comment: string;
      levelRating: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
      teacherProposedRating: 'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt';
      needsMonitoring: boolean;
      recordDate: string;
    }
  ) => Promise<{ totalProcessed: number; updatedCount: number; newCount: number }>;
}

export default function BulkGoodAssessmentModal({
  isOpen,
  onClose,
  selectedClass,
  students,
  schoolYear,
  semester = 'Học kỳ I',
  month,
  monthNumber,
  existingAssessments,
  ratingConfig,
  studentScores,
  initialSelectMode = 'all',
  onSaveBulk
}: BulkGoodAssessmentModalProps) {
  const { user } = useAuth();

  // Find Good tier from active configuration (Requirement 8)
  const goodTier = useMemo(() => {
    const configTiers = ratingConfig?.tiers && ratingConfig.tiers.length > 0 ? ratingConfig.tiers : DEFAULT_RATING_TIERS;
    return configTiers.find(t => t.name.trim().toLowerCase() === 'tốt') || configTiers[0] || DEFAULT_RATING_TIERS[0];
  }, [ratingConfig]);

  // Search in student list
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student IDs
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Assessment content fields
  const [ruleCompliance, setRuleCompliance] = useState(DEFAULT_GOOD_ASSESSMENT.ruleCompliance);
  const [learningAttitude, setLearningAttitude] = useState(DEFAULT_GOOD_ASSESSMENT.learningAttitude);
  const [responsibility, setResponsibility] = useState(DEFAULT_GOOD_ASSESSMENT.responsibility);
  const [collectiveActivities, setCollectiveActivities] = useState(DEFAULT_GOOD_ASSESSMENT.collectiveActivities);
  const [relationships, setRelationships] = useState(DEFAULT_GOOD_ASSESSMENT.relationships);
  const [selfDiscipline, setSelfDiscipline] = useState(DEFAULT_GOOD_ASSESSMENT.selfDiscipline);
  const [generalComment, setGeneralComment] = useState(DEFAULT_GOOD_ASSESSMENT.comment);

  // Ratings
  const [levelRating, setLevelRating] = useState<'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'>('Tốt');
  const [teacherProposedRating, setTeacherProposedRating] = useState<'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt'>('Tốt');
  const [needsMonitoring, setNeedsMonitoring] = useState(false);
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Loading & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    totalProcessed: number;
    updatedCount: number;
    newCount: number;
  } | null>(null);

  // Warning modal state when selected students already have existing assessments
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [conflictingCount, setConflictingCount] = useState(0);

  // Map of existing assessments for current class & period
  const existingMap = useMemo(() => {
    const map = new Map<string, TeacherAssessment>();
    existingAssessments.forEach(a => {
      const matchSchoolYear = !a.schoolYear || a.schoolYear === schoolYear;
      const matchSemester = !a.semester || a.semester === semester;
      const parsedMonth = a.monthNumber !== undefined ? Number(a.monthNumber) : (a.month ? parseInt(a.month.replace(/\D/g, ''), 10) : 9);
      const curMonthNum = monthNumber !== undefined ? monthNumber : (month ? parseInt(month.replace(/\D/g, ''), 10) : 9);
      const matchMonth = parsedMonth === curMonthNum || a.month === month;

      if (matchSchoolYear && matchSemester && matchMonth && a.studentId) {
        map.set(a.studentId, a);
      }
    });
    return map;
  }, [existingAssessments, schoolYear, semester, month, monthNumber]);

  // Students who have not been evaluated in this period
  const unevaluatedStudentIds = useMemo(() => {
    return students.filter(s => !existingMap.has(s.id)).map(s => s.id);
  }, [students, existingMap]);

  // Initialize selection on open or mode change
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessInfo(null);
      setShowOverrideWarning(false);
      setSearchQuery('');
      setRecordDate(new Date().toISOString().split('T')[0]);

      // Reset default texts
      setRuleCompliance(DEFAULT_GOOD_ASSESSMENT.ruleCompliance);
      setLearningAttitude(DEFAULT_GOOD_ASSESSMENT.learningAttitude);
      setResponsibility(DEFAULT_GOOD_ASSESSMENT.responsibility);
      setCollectiveActivities(DEFAULT_GOOD_ASSESSMENT.collectiveActivities);
      setRelationships(DEFAULT_GOOD_ASSESSMENT.relationships);
      setSelfDiscipline(DEFAULT_GOOD_ASSESSMENT.selfDiscipline);
      setGeneralComment(DEFAULT_GOOD_ASSESSMENT.comment);
      setLevelRating('Tốt');
      setTeacherProposedRating('Tốt');
      setNeedsMonitoring(false);

      if (initialSelectMode === 'unevaluated') {
        setSelectedStudentIds(unevaluatedStudentIds);
      } else {
        setSelectedStudentIds(students.map(s => s.id));
      }
    }
  }, [isOpen, students, initialSelectMode, unevaluatedStudentIds]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const name = (s.full_name || s.fullName || s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [students, searchQuery]);

  if (!isOpen) return null;

  // Toggle individual student
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Select all in current class
  const handleSelectAll = () => {
    setSelectedStudentIds(students.map(s => s.id));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Select only unevaluated students
  const handleSelectOnlyUnevaluated = () => {
    setSelectedStudentIds(unevaluatedStudentIds);
  };

  // Requirement 8: Select students matching Good tier score range from dynamic rating config (not hardcoded >= 90)
  const handleSelectGoodScoreStudents = () => {
    const min = Number(goodTier.min_score);
    const max = Number(goodTier.max_score);
    const matchedIds = students.filter(st => {
      const score = studentScores ? (studentScores[st.id] ?? 100) : 100;
      return score >= min && score <= max;
    }).map(st => st.id);
    setSelectedStudentIds(matchedIds);
  };

  // Reset text to default good assessment
  const handleResetToDefaults = () => {
    setRuleCompliance(DEFAULT_GOOD_ASSESSMENT.ruleCompliance);
    setLearningAttitude(DEFAULT_GOOD_ASSESSMENT.learningAttitude);
    setResponsibility(DEFAULT_GOOD_ASSESSMENT.responsibility);
    setCollectiveActivities(DEFAULT_GOOD_ASSESSMENT.collectiveActivities);
    setRelationships(DEFAULT_GOOD_ASSESSMENT.relationships);
    setSelfDiscipline(DEFAULT_GOOD_ASSESSMENT.selfDiscipline);
    setGeneralComment(DEFAULT_GOOD_ASSESSMENT.comment);
    setLevelRating('Tốt');
    setTeacherProposedRating('Tốt');
    setNeedsMonitoring(false);
  };

  // Validate and initiate save
  const handlePreSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (selectedStudentIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 học sinh để áp dụng đánh giá.');
      return;
    }

    if (!generalComment.trim()) {
      setErrorMessage('Vui lòng nhập nhận xét chung của GVCN.');
      return;
    }

    // Check how many of the selected students already have an evaluation
    const alreadyEvaluatedCount = selectedStudentIds.filter(id => existingMap.has(id)).length;
    if (alreadyEvaluatedCount > 0) {
      setConflictingCount(alreadyEvaluatedCount);
      setShowOverrideWarning(true);
      return;
    }

    // No conflict, proceed directly
    executeBulkSave();
  };

  // Execute bulk save
  const executeBulkSave = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setShowOverrideWarning(false);

      const payload = {
        ruleCompliance,
        learningAttitude,
        responsibility,
        collectiveActivities,
        relationships,
        selfDiscipline,
        comment: generalComment,
        levelRating,
        teacherProposedRating,
        needsMonitoring,
        recordDate
      };

      const result = await onSaveBulk(selectedStudentIds, payload);

      setSuccessInfo(result);
      setIsSubmitting(false);

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error saving bulk good assessment:', err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi khi lưu đánh giá hàng loạt.');
      setIsSubmitting(false);
    }
  };

  const isAllSelected = students.length > 0 && selectedStudentIds.length === students.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-3 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20 shadow-xs">
              <Sparkles size={24} className="text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>ĐÁNH GIÁ HỌC SINH THỰC HIỆN TỐT</span>
                <span className="text-[10px] bg-emerald-500/80 text-white font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300/40">
                  XẾP LOẠI TỐT
                </span>
              </h2>
              <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5">
                <span>Lớp: <strong className="text-white font-black">{selectedClass?.name || '---'}</strong></span>
                <span>•</span>
                <span>Kỳ: <strong className="text-white">{month}</strong> ({semester} • {schoolYear})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-header Summary Bar */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap font-medium">
            <span className="text-slate-600">
              Lớp: <strong className="text-emerald-950 font-black">{selectedClass?.name}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Tổng số học sinh: <strong className="text-slate-900 font-extrabold">{students.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Đã có phiếu đánh giá: <strong className="text-blue-700 font-bold">{existingMap.size}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Chưa đánh giá: <strong className="text-amber-700 font-bold">{unevaluatedStudentIds.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Đã chọn:</span>
            <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs">
              {selectedStudentIds.length} / {students.length} học sinh
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl space-y-1 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Đã cập nhật đánh giá cho {successInfo.totalProcessed} học sinh. Xếp loại: Tốt.</span>
              </div>
              <p className="text-xs text-emerald-800 font-medium pl-6">
                → Đã đánh giá: {students.length} • Xếp loại Tốt: {selectedStudentIds.length} 
                {successInfo.updatedCount > 0 && ` (Cập nhật: ${successInfo.updatedCount}, Tạo mới: ${successInfo.newCount})`}
              </p>
            </div>
          )}

          {/* SECTION 1: DANH SÁCH CHỌN HỌC SINH */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. DANH SÁCH HỌC SINH ÁP DỤNG
                </h3>
              </div>

              {/* Quick action buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    isAllSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                  title="Chọn tất cả học sinh trong lớp"
                >
                  <CheckSquare size={13} />
                  <span>Chọn tất cả ({students.length})</span>
                </button>

                {studentScores && (
                  <button
                    type="button"
                    onClick={handleSelectGoodScoreStudents}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    title={`Chọn những học sinh có điểm rèn luyện thuộc khoảng xếp loại ${goodTier.name} (${goodTier.min_score}–${goodTier.max_score} điểm)`}
                  >
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>⭐ Chọn HS điểm {goodTier.name} ({goodTier.min_score}–{goodTier.max_score}đ)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSelectOnlyUnevaluated}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Chỉ chọn những học sinh chưa có phiếu đánh giá trong tháng này"
                >
                  <span>🟡 Chọn tất cả HS chưa đánh giá ({unevaluatedStudentIds.length})</span>
                </button>

                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-all cursor-pointer text-xs"
                    title="Bỏ chọn tất cả"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* Search Box & Select All Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) handleSelectAll();
                    else handleDeselectAll();
                  }}
                  className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>☑ CHỌN TẤT CẢ HỌC SINH ({students.length})</span>
              </label>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm học sinh theo mã hoặc họ tên..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Scrollable Student List */}
            <div className="max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-inner">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs italic">
                  Không tìm thấy học sinh nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredStudents.map((st, idx) => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  const existingEval = existingMap.get(st.id);

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleToggleStudent(st.id)}
                      className={`p-2.5 px-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <span className="text-[11px] font-bold text-slate-400 w-6 text-center shrink-0">
                          {st.stt !== undefined ? String(st.stt).padStart(2, '0') : String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs text-slate-900 block truncate">
                            {st.full_name || st.fullName || st.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Mã: {st.code || '---'} • {st.gender || 'Nam'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {studentScores && studentScores[st.id] !== undefined && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            studentScores[st.id] >= Number(goodTier.min_score) && studentScores[st.id] <= Number(goodTier.max_score)
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {studentScores[st.id]} đ
                          </span>
                        )}
                        {existingEval ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Đã có phiếu • {existingEval.levelRating || existingEval.teacherProposedRating || 'Tốt'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Chưa đánh giá
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Đang chọn {selectedStudentIds.length} trên tổng số {students.length} học sinh của lớp</span>
              {selectedStudentIds.length > 0 && existingMap.size > 0 && (
                <span className="text-amber-700 font-medium">
                  (Trong đó có {selectedStudentIds.filter(id => existingMap.has(id)).length} học sinh đã có phiếu trước)
                </span>
              )}
            </div>
          </div>

          {/* SECTION 2: NỘI DUNG ĐÁNH GIÁ MẶC ĐỊNH & CHỈNH SỬA */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  2. NỘI DUNG ĐÁNH GIÁ MẪU &ldquo;THỰC HIỆN TỐT&rdquo;
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                title="Khôi phục lại toàn bộ nội dung mẫu chuẩn"
              >
                <RotateCcw size={12} />
                <span>Khôi phục nội dung mẫu</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Nội dung dưới đây được tự động áp dụng cho tất cả học sinh đã chọn. Thầy/Cô có thể chỉnh sửa lại câu từ nếu muốn trước khi xác nhận.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. Ý thức chấp hành nội quy */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Ý thức chấp hành nội quy:
                </label>
                <textarea
                  rows={2}
                  value={ruleCompliance}
                  onChange={(e) => setRuleCompliance(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>

              {/* 2. Ý thức học tập */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Ý thức học tập:
                </label>
                <textarea
                  rows={2}
                  value={learningAttitude}
                  onChange={(e) => setLearningAttitude(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>

              {/* 3. Thái độ và tinh thần trách nhiệm */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Thái độ và tinh thần trách nhiệm:
                </label>
                <textarea
                  rows={2}
                  value={responsibility}
                  onChange={(e) => setResponsibility(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>

              {/* 4. Ý thức tham gia hoạt động tập thể */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  4. Ý thức tham gia hoạt động tập thể:
                </label>
                <textarea
                  rows={2}
                  value={collectiveActivities}
                  onChange={(e) => setCollectiveActivities(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>

              {/* 5. Quan hệ với thầy cô và bạn bè */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  5. Quan hệ với thầy cô và bạn bè:
                </label>
                <textarea
                  rows={2}
                  value={relationships}
                  onChange={(e) => setRelationships(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>

              {/* 6. Ý thức tự giác */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  6. Ý thức tự giác:
                </label>
                <textarea
                  rows={2}
                  value={selfDiscipline}
                  onChange={(e) => setSelfDiscipline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-slate-800"
                />
              </div>
            </div>

            {/* 7. Nhận xét chung của GVCN */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-extrabold text-emerald-950 mb-1">
                7. Nhận xét chung của GVCN: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Nhập nhận xét chung của GVCN..."
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* SECTION 3: THIẾT LẬP MỨC ĐỘ & XẾP LOẠI (Yêu cầu 8: Lấy động từ cấu hình) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  3. ĐÁNH GIÁ MỨC ĐỘ CỦA GVCN (TỰ ĐỘNG THIẾT LẬP XẾP LOẠI: {goodTier.name.toUpperCase()})
                </h3>
              </div>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                Thang điểm {goodTier.name}: {goodTier.min_score} – {goodTier.max_score} điểm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Mức đánh giá chung */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Mức đánh giá chung:
                </label>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-extrabold text-emerald-900 text-sm">{goodTier.name}</span>
                  <span className="text-[10px] text-emerald-700 ml-auto bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    {goodTier.min_score}–{goodTier.max_score}đ
                  </span>
                </div>
              </div>

              {/* Đề xuất xếp loại */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Xếp loại đề xuất của GVCN:
                </label>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-600" />
                  <span className="font-extrabold text-emerald-900 text-sm">{goodTier.name}</span>
                  <span className="text-[10px] text-emerald-700 ml-auto bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    Đề xuất: {goodTier.name}
                  </span>
                </div>
              </div>

              {/* Ngày ghi nhận */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ngày ghi nhận / đánh giá:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1">
              * Lưu ý nghiệp vụ: Việc xếp loại &ldquo;Tốt&rdquo; trong phiếu GVCN chỉ cập nhật Nhận xét, Mức đánh giá và Xếp loại GVCN; không tự ý cộng/trừ điểm rèn luyện, điểm thưởng hay KPI học sinh.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            HỦY
          </button>

          <button
            type="button"
            onClick={() => handlePreSubmit()}
            disabled={isSubmitting || selectedStudentIds.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            {isSubmitting
              ? 'Đang xử lý...'
              : `✅ XÁC NHẬN – XẾP LOẠI TỐT (${selectedStudentIds.length} HỌC SINH)`}
          </button>
        </div>

        {/* Override Confirmation Modal / Alert */}
        {showOverrideWarning && (
          <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-sm font-black text-slate-900">
                  XÁC NHẬN CẬP NHẬT PHIẾU ĐÃ CÓ
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Có <strong className="text-amber-700 font-black">{conflictingCount}</strong> học sinh đã có phiếu đánh giá trong kỳ này ({month} • {semester}).
                </p>
                <p className="text-xs text-slate-700 font-bold">
                  Bạn có muốn cập nhật các phiếu này thành Xếp loại Tốt không?
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                • Hệ thống sẽ <strong>UPDATE</strong> phiếu hiện tại của các học sinh này, bảo lưu lịch sử tạo phiếu và tuyệt đối không tạo phiếu trùng lặp.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideWarning(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  onClick={executeBulkSave}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Đang cập nhật...' : 'ĐỒNG Ý CẬP NHẬT'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
