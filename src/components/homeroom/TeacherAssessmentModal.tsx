import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  Users,
  User,
  FileText,
  Search,
  CheckSquare,
  Square,
  MinusSquare,
  Calendar,
  Sparkles,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Student, ClassInfo, ConductRecord, TeacherAssessment } from '../../types/homeroom';
import { useAuth } from '../../store/AuthContext';

export const ASSESSMENT_PRESETS = [
  {
    label: 'Thực hiện nghiêm túc nội quy nhà trường.',
    ruleCompliance: 'Chấp hành nghiêm túc mọi nội quy nhà trường và quy định của lớp.',
    learningAttitude: 'Đi học đầy đủ, đúng giờ, hăng hái phát biểu xây dựng bài.',
    responsibility: 'Có tinh thần trách nhiệm cao trong công việc được giao.',
    collectiveActivities: 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp.',
    relationships: 'Kính trọng thầy cô, hòa đồng, thân thiện với bạn bè.',
    selfDiscipline: 'Có ý thức tự giác cao trong học tập và rèn luyện.',
    comment: 'Thực hiện nghiêm túc nội quy nhà trường. Chăm ngoan, có ý thức rèn luyện tốt.',
    levelRating: 'Tốt' as const,
    proposedRating: 'Tốt' as const
  },
  {
    label: 'Đi học đầy đủ, đúng giờ, có ý thức kỷ luật tốt.',
    ruleCompliance: 'Chấp hành tốt nội quy, đi học chuyên cần, đúng giờ, trang phục chỉnh tề.',
    learningAttitude: 'Tập trung chú ý nghe giảng, chuẩn bị bài chu đáo trước khi đến lớp.',
    responsibility: 'Hoàn thành tốt các nhiệm vụ được phân công.',
    collectiveActivities: 'Tích cực tham gia các hoạt động ngoại khóa và phong trào của lớp.',
    relationships: 'Lễ phép với thầy cô giáo, đoàn kết giúp đỡ bạn bè.',
    selfDiscipline: 'Có nề nếp kỷ luật tốt, tự giác chấp hành nội quy.',
    comment: 'Đi học đầy đủ, đúng giờ, có ý thức kỷ luật tốt và tinh thần học hỏi cao.',
    levelRating: 'Tốt' as const,
    proposedRating: 'Tốt' as const
  },
  {
    label: 'Tích cực xây dựng bài, chăm ngoan, đoàn kết với bạn bè.',
    ruleCompliance: 'Chấp hành nghiêm túc nội quy trường lớp, không vi phạm kỷ luật.',
    learningAttitude: 'Chăm chỉ, hăng hái phát biểu xây dựng bài trong các tiết học.',
    responsibility: 'Có tinh thần trách nhiệm với tập thể, gương mẫu trong học tập.',
    collectiveActivities: 'Hòa đồng, năng nổ trong các hoạt động sinh hoạt tập thể.',
    relationships: 'Kính thầy yêu bạn, luôn giúp đỡ các bạn trong học tập.',
    selfDiscipline: 'Tự giác ôn luyện, chấp hành nghiêm quy chế thi và kiểm tra.',
    comment: 'Tích cực xây dựng bài, chăm ngoan, đoàn kết với bạn bè, tiến bộ rõ rệt.',
    levelRating: 'Tốt' as const,
    proposedRating: 'Tốt' as const
  },
  {
    label: 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp.',
    ruleCompliance: 'Thực hiện tốt nội quy, văn hóa ứng xử trong nhà trường.',
    learningAttitude: 'Có thái độ học tập nghiêm túc, hoàn thành các bài tập được giao.',
    responsibility: 'Nhiệt tình, trách nhiệm trong các công việc chung của tập thể.',
    collectiveActivities: 'Nòng cốt trong các phong trào văn hóa, thể thao, tình nguyện của Đoàn.',
    relationships: 'Thân thiện, hòa đồng, có uy tín với bạn bè.',
    selfDiscipline: 'Biết sắp xếp thời gian hợp lý giữa học tập và hoạt động phong trào.',
    comment: 'Nhiệt tình tham gia các phong trào, hoạt động của trường lớp. Năng động, tích cực.',
    levelRating: 'Tốt' as const,
    proposedRating: 'Tốt' as const
  },
  {
    label: 'Có tiến bộ trong học tập và rèn luyện đạo đức.',
    ruleCompliance: 'Đã có nhiều tiến bộ trong việc chấp hành nội quy nề nếp.',
    learningAttitude: 'Cố gắng vươn lên trong học tập, chú ý lắng nghe bài giảng.',
    responsibility: 'Hoàn thành nhiệm vụ được giao khi có sự nhắc nhở, đôn đốc.',
    collectiveActivities: 'Tham gia đầy đủ các buổi sinh hoạt tập thể của lớp.',
    relationships: 'Lễ phép với thầy cô, hòa nhã với bạn cùng lớp.',
    selfDiscipline: 'Cần tiếp tục phát huy tinh thần tự giác trong học tập.',
    comment: 'Có tiến bộ trong học tập và rèn luyện đạo đức, cần duy trì nề nếp ổn định.',
    levelRating: 'Khá' as const,
    proposedRating: 'Khá' as const
  }
];

interface TeacherAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  students?: Student[];
  initialSelectedStudentIds?: string[];
  selectedClass: ClassInfo | null;
  semester?: string;
  schoolYear?: string;
  month?: string;
  monthNumber?: number;
  existingAssessment?: TeacherAssessment | null;
  existingAssessments?: TeacherAssessment[];
  studentRecords?: ConductRecord[];
  isReadOnly?: boolean;
  onSaveAssessment: (assessment: Partial<TeacherAssessment>) => Promise<any>;
  onBulkSaveAssessments?: (
    selectedIds: string[],
    data: any,
    skipDuplicates?: boolean
  ) => Promise<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    failedStudents: { id: string; name: string; reason: string }[];
    skippedDuplicatesCount: number;
    updatedCount: number;
    newCount: number;
  }>;
}

export default function TeacherAssessmentModal({
  isOpen,
  onClose,
  student,
  students = [],
  initialSelectedStudentIds,
  selectedClass,
  semester = 'Học kỳ I',
  schoolYear = '2026–2027',
  month = 'Tháng 09',
  monthNumber,
  existingAssessment,
  existingAssessments = [],
  studentRecords = [],
  isReadOnly = false,
  onSaveAssessment,
  onBulkSaveAssessments
}: TeacherAssessmentModalProps) {
  const { user } = useAuth();

  // All students belonging strictly to the currently selected class
  const classStudents = useMemo(() => {
    if (students && students.length > 0) return students;
    if (student) return [student];
    return [];
  }, [students, student]);

  // View mode: 'bulk' (to record for whole class or multiple students) or 'single' (for 1 student)
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk');
  const [activeSingleStudent, setActiveSingleStudent] = useState<Student | null>(student || null);

  // Selected student IDs for bulk recording
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Search input inside modal
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected preset label
  const [selectedPreset, setSelectedPreset] = useState<string>(ASSESSMENT_PRESETS[0].label);

  // Form states for assessment
  const [ruleCompliance, setRuleCompliance] = useState<string>(ASSESSMENT_PRESETS[0].ruleCompliance);
  const [learningAttitude, setLearningAttitude] = useState<string>(ASSESSMENT_PRESETS[0].learningAttitude);
  const [responsibility, setResponsibility] = useState<string>(ASSESSMENT_PRESETS[0].responsibility);
  const [collectiveActivities, setCollectiveActivities] = useState<string>(ASSESSMENT_PRESETS[0].collectiveActivities);
  const [relationships, setRelationships] = useState<string>(ASSESSMENT_PRESETS[0].relationships);
  const [selfDiscipline, setSelfDiscipline] = useState<string>(ASSESSMENT_PRESETS[0].selfDiscipline);
  const [generalComment, setGeneralComment] = useState<string>(ASSESSMENT_PRESETS[0].comment);

  // Ratings & Status
  const [levelRating, setLevelRating] = useState<'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'>('Tốt');
  const [needsMonitoring, setNeedsMonitoring] = useState<boolean>(false);
  const [proposedRating, setProposedRating] = useState<'Tốt' | 'Khá' | 'Đạt' | 'Yếu / Chưa đạt'>('Tốt');
  const [recordDate, setRecordDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Detailed criteria accordion toggle
  const [showDetailedAspects, setShowDetailedAspects] = useState<boolean>(false);

  // Confirmation Modal State (Section 10)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Loading & notification states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resultNotice, setResultNotice] = useState<{
    success: boolean;
    total: number;
    successCount: number;
    failedCount: number;
    failedStudents: { id: string; name: string; reason: string }[];
    skippedDuplicatesCount: number;
  } | null>(null);

  // Ref for the "Chọn tất cả học sinh" checkbox to support indeterminate state (Section 5)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Filtered students by search query (Section 7)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.trim().toLowerCase();
    return classStudents.filter(s => {
      const name = (s.full_name || s.fullName || s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [classStudents, searchQuery]);

  // Existing assessments map for current period
  const existingMap = useMemo(() => {
    const map = new Map<string, TeacherAssessment>();
    existingAssessments.forEach(a => {
      if (a.studentId) map.set(a.studentId, a);
    });
    if (existingAssessment && existingAssessment.studentId) {
      map.set(existingAssessment.studentId, existingAssessment);
    }
    return map;
  }, [existingAssessments, existingAssessment]);

  // Number of selected students who already have a record for this period/date (Section 12)
  const duplicateCandidatesCount = useMemo(() => {
    return selectedStudentIds.filter(id => existingMap.has(id)).length;
  }, [selectedStudentIds, existingMap]);

  // Update indeterminate state on the "Chọn tất cả" checkbox whenever selection changes (Section 5)
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const total = classStudents.length;
      const count = selectedStudentIds.length;
      if (count > 0 && count < total) {
        selectAllCheckboxRef.current.indeterminate = true;
      } else {
        selectAllCheckboxRef.current.indeterminate = false;
      }
    }
  }, [selectedStudentIds.length, classStudents.length]);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setResultNotice(null);
      setShowConfirmModal(false);
      setSearchQuery('');
      setRecordDate(new Date().toISOString().split('T')[0]);

      if (student && !initialSelectedStudentIds) {
        // Opened for a specific single student
        setActiveSingleStudent(student);
        setMode('single');
        setSelectedStudentIds([student.id]);

        if (existingAssessment) {
          const a = existingAssessment.assessment || {};
          setRuleCompliance(a.ruleCompliance || '');
          setLearningAttitude(a.learningAttitude || '');
          setResponsibility(a.responsibility || '');
          setCollectiveActivities(a.collectiveActivities || '');
          setRelationships(a.relationships || '');
          setSelfDiscipline(a.selfDiscipline || '');
          setGeneralComment(existingAssessment.comment || '');
          setLevelRating(existingAssessment.levelRating || 'Tốt');
          setNeedsMonitoring(!!existingAssessment.needsMonitoring);
          setProposedRating(existingAssessment.teacherProposedRating || 'Tốt');
          setRecordDate(existingAssessment.recordDate || existingAssessment.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
        } else {
          applyPreset(ASSESSMENT_PRESETS[0]);
        }
      } else {
        // Bulk / Whole Class mode
        setMode('bulk');
        setActiveSingleStudent(null);
        if (initialSelectedStudentIds && initialSelectedStudentIds.length > 0) {
          // Pre-selected from main table
          setSelectedStudentIds(initialSelectedStudentIds);
        } else {
          // Default select all students of current class
          setSelectedStudentIds(classStudents.map(s => s.id));
        }
        applyPreset(ASSESSMENT_PRESETS[0]);
      }
    }
  }, [isOpen, student, classStudents, initialSelectedStudentIds, existingAssessment]);

  // Apply a preset to all fields
  const applyPreset = (preset: typeof ASSESSMENT_PRESETS[0]) => {
    setSelectedPreset(preset.label);
    setRuleCompliance(preset.ruleCompliance);
    setLearningAttitude(preset.learningAttitude);
    setResponsibility(preset.responsibility);
    setCollectiveActivities(preset.collectiveActivities);
    setRelationships(preset.relationships);
    setSelfDiscipline(preset.selfDiscipline);
    setGeneralComment(preset.comment);
    setLevelRating(preset.levelRating);
    setProposedRating(preset.proposedRating);
  };

  // Preset dropdown change handler
  const handlePresetChange = (label: string) => {
    setSelectedPreset(label);
    const found = ASSESSMENT_PRESETS.find(p => p.label === label);
    if (found) {
      applyPreset(found);
    }
  };

  // Section 3: Select All Students in current class
  const handleSelectAllClass = () => {
    setSelectedStudentIds(classStudents.map(s => s.id));
  };

  // Section 7: Select only currently displayed students from search
  const handleSelectDisplayedOnly = () => {
    const displayedIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...displayedIds])));
  };

  // Section 14: Deselect all students
  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Section 4 & 17: Toggle individual student selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Main checkbox click handler (Master Checkbox)
  const handleMasterCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      handleSelectAllClass();
    } else {
      handleDeselectAll();
    }
  };

  // Validate and open confirmation dialog (Section 10)
  const handleOpenConfirmation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (mode === 'bulk' && selectedStudentIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 học sinh để thực hiện ghi nhận.');
      return;
    }

    if (!generalComment.trim() && !ruleCompliance.trim()) {
      setErrorMsg('Vui lòng nhập nội dung ghi nhận đánh giá.');
      return;
    }

    setShowConfirmModal(true);
  };

  // Final submit after user confirms (Section 10, 11, 12, 13)
  const handleConfirmAndSave = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');

      const contentToSave = generalComment.trim() || ruleCompliance.trim();
      const currentMonthNumber = monthNumber !== undefined ? monthNumber : (month ? parseInt(month.replace(/\D/g, ''), 10) : 9);

      if (mode === 'single' && activeSingleStudent) {
        // Single student save
        const payload: Partial<TeacherAssessment> = {
          id: existingAssessment?.id,
          studentId: activeSingleStudent.id,
          studentName: activeSingleStudent.full_name || activeSingleStudent.name,
          studentCode: activeSingleStudent.code,
          classId: selectedClass?.id || activeSingleStudent.classId,
          className: selectedClass?.name || activeSingleStudent.className,
          teacherId: user?.id || 'gvcn',
          teacherName: user?.name || 'Giáo viên chủ nhiệm',
          semester,
          schoolYear: selectedClass?.schoolYear || schoolYear,
          month,
          monthNumber: currentMonthNumber,
          recordDate,
          assessment: {
            ruleCompliance,
            learningAttitude,
            responsibility,
            collectiveActivities,
            relationships,
            selfDiscipline
          },
          comment: contentToSave,
          levelRating,
          needsMonitoring,
          teacherProposedRating: proposedRating,
          recordedBy: user?.name || 'Giáo viên chủ nhiệm',
          updatedBy: user?.name || 'GVCN'
        };

        await onSaveAssessment(payload);

        setResultNotice({
          success: true,
          total: 1,
          successCount: 1,
          failedCount: 0,
          failedStudents: [],
          skippedDuplicatesCount: 0
        });

        setSubmitting(false);
        setShowConfirmModal(false);
        setTimeout(() => onClose(), 1000);
      } else {
        // Bulk save for all selected students
        const targetStudents = classStudents.filter(s => selectedStudentIds.includes(s.id));

        if (onBulkSaveAssessments) {
          const res = await onBulkSaveAssessments(
            selectedStudentIds,
            {
              ruleCompliance,
              learningAttitude,
              responsibility,
              collectiveActivities,
              relationships,
              selfDiscipline,
              content: contentToSave,
              comment: contentToSave,
              levelRating,
              teacherProposedRating: proposedRating,
              needsMonitoring,
              recordDate,
              teacherId: user?.id || 'gvcn',
              teacherName: user?.name || 'Giáo viên chủ nhiệm',
              recordedBy: user?.name || 'GVCN',
              updatedBy: user?.name || 'GVCN'
            },
            skipDuplicates
          );

          setResultNotice({
            success: res.failedCount === 0,
            total: targetStudents.length,
            successCount: res.successCount || res.totalProcessed,
            failedCount: res.failedCount || 0,
            failedStudents: res.failedStudents || [],
            skippedDuplicatesCount: res.skippedDuplicatesCount || 0
          });
        } else {
          // Fallback sequential save
          let success = 0;
          let failed = 0;
          const failedList: any[] = [];

          for (const st of targetStudents) {
            try {
              await onSaveAssessment({
                studentId: st.id,
                studentName: st.full_name || st.name,
                studentCode: st.code,
                classId: selectedClass?.id || st.classId,
                className: selectedClass?.name || st.className,
                teacherId: user?.id || 'gvcn',
                teacherName: user?.name || 'Giáo viên chủ nhiệm',
                semester,
                schoolYear,
                month,
                monthNumber: currentMonthNumber,
                recordDate,
                assessment: {
                  ruleCompliance,
                  learningAttitude,
                  responsibility,
                  collectiveActivities,
                  relationships,
                  selfDiscipline
                },
                comment: contentToSave,
                levelRating,
                needsMonitoring,
                teacherProposedRating: proposedRating,
                recordedBy: user?.name || 'GVCN',
                updatedBy: user?.name || 'GVCN'
              });
              success++;
            } catch (err: any) {
              failed++;
              failedList.push({ id: st.id, name: st.name, reason: err.message || 'Lỗi khi lưu' });
            }
          }

          setResultNotice({
            success: failed === 0,
            total: targetStudents.length,
            successCount: success,
            failedCount: failed,
            failedStudents: failedList,
            skippedDuplicatesCount: 0
          });
        }

        setSubmitting(false);
        setShowConfirmModal(false);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Lỗi khi ghi nhận đánh giá: ' + (err.message || ''));
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (!isOpen) return null;

  const isAllSelected = classStudents.length > 0 && selectedStudentIds.length === classStudents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-2 max-h-[95vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#123B78] via-[#1457D9] to-[#123B78] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <FileText size={22} className="text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                  XẾP LOẠI CỦA GVCN
                </h2>
                <span className="text-[11px] bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full border border-white/30">
                  Lớp {selectedClass?.name || '---'}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 flex flex-wrap items-center gap-2 font-medium">
                <span>Trường THPT Minh Hòa</span>
                <span>•</span>
                <span>{month} ({schoolYear})</span>
                <span>•</span>
                <span>GVCN: <strong>{user?.name || 'Giáo viên chủ nhiệm'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center bg-black/20 p-1 rounded-xl border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'bulk'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>Chọn cả lớp / Nhiều HS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('single');
                  if (!activeSingleStudent && classStudents.length > 0) {
                    setActiveSingleStudent(classStudents[0]);
                  }
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'single'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <User size={14} />
                <span>Ghi nhận cá nhân</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 bg-slate-50/60">

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2.5 shadow-xs">
              <AlertCircle size={17} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 13: Results Notification Banner */}
          {resultNotice && (
            <div className={`p-4 rounded-2xl border space-y-1.5 shadow-xs animate-in fade-in ${
              resultNotice.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2 font-black text-sm">
                {resultNotice.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                )}
                <span>
                  {resultNotice.success
                    ? `✓ Đã ghi nhận cho ${resultNotice.successCount}/${resultNotice.total} học sinh thành công.`
                    : `✓ Thành công: ${resultNotice.successCount} học sinh | ⚠️ Không ghi nhận được: ${resultNotice.failedCount} học sinh`}
                </span>
              </div>
              {resultNotice.skippedDuplicatesCount > 0 && (
                <p className="text-xs text-slate-600 pl-6 font-medium">
                  • Đã bỏ qua {resultNotice.skippedDuplicatesCount} bản ghi trùng lặp nội dung.
                </p>
              )}
              {resultNotice.failedStudents.length > 0 && (
                <div className="pl-6 text-xs text-rose-700 space-y-0.5">
                  <p className="font-bold">Danh sách học sinh gặp lỗi:</p>
                  {resultNotice.failedStudents.map(f => (
                    <div key={f.id}>- {f.name}: {f.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2 & 16: GIAO DIỆN DANH SÁCH HỌC SINH (BULK SELECTION) */}
          {mode === 'bulk' ? (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
              
              {/* Header with "Chọn tất cả học sinh" and "Đã chọn: X/Y học sinh" (Section 2, 3, 5, 14) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2.5 text-xs font-black text-slate-900 cursor-pointer select-none bg-blue-50/80 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleMasterCheckboxChange}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>
                      {selectedStudentIds.length === 0
                        ? '☐ Chọn tất cả học sinh'
                        : selectedStudentIds.length === classStudents.length
                        ? '☑ Chọn tất cả học sinh'
                        : '☒ Chọn tất cả học sinh'}
                    </span>
                  </label>

                  <div className="text-xs font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                    <span>Đã chọn:</span>
                    <strong className={selectedStudentIds.length > 0 ? 'text-blue-700 font-black' : 'text-slate-500 font-bold'}>
                      {selectedStudentIds.length}/{classStudents.length}
                    </strong>
                    <span>học sinh</span>
                  </div>
                </div>

                {/* Section 14: Nút "Bỏ chọn tất cả" */}
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                    title="Bỏ chọn tất cả học sinh đang chọn"
                  >
                    <Square size={13} className="text-slate-500" />
                    <span>☐ Bỏ chọn tất cả</span>
                  </button>
                )}
              </div>

              {/* Section 7: Tìm kiếm học sinh & Phân biệt rõ "Chọn tất cả của lớp" vs "Chọn tất cả đang hiển thị" */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Tìm học sinh theo họ tên hoặc mã số học sinh..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Section 7 options when search is active */}
                {searchQuery.trim() && (
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                    <span className="text-[11px] font-bold text-blue-900">Tìm thấy {filteredStudents.length} học sinh:</span>
                    <button
                      type="button"
                      onClick={handleSelectDisplayedOnly}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-2xs"
                    >
                      ☑ Chọn tất cả học sinh đang hiển thị ({filteredStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllClass}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold rounded-lg text-[11px] transition-colors"
                    >
                      ☑ Chọn tất cả học sinh của lớp ({classStudents.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Checklist học sinh (Section 4 & 16) */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic">
                    Không tìm thấy học sinh nào phù hợp với &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const isChecked = selectedStudentIds.includes(st.id);
                    const existing = existingMap.get(st.id);

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStudent(st.id)}
                        className={`px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-blue-50/60 hover:bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by row onClick
                            className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <span className="text-[11px] font-bold text-slate-400 w-6 text-center shrink-0">
                            {st.stt !== undefined ? String(st.stt).padStart(2, '0') : String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-900 block truncate">
                              {st.full_name || st.fullName || st.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Mã: {st.code || '---'}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {existing ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Đã ghi: {existing.levelRating || 'Tốt'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                              Chưa ghi nhận
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* SINGLE STUDENT VIEW MODE */
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase">Học sinh được chọn:</span>
                <select
                  value={activeSingleStudent?.id || ''}
                  onChange={(e) => {
                    const found = classStudents.find(s => s.id === e.target.value);
                    if (found) {
                      setActiveSingleStudent(found);
                      setSelectedStudentIds([found.id]);
                    }
                  }}
                  className="text-xs font-bold text-blue-900 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SECTION 8 & 16: NỘI DUNG GHI NHẬN CỦA GVCN */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  NỘI DUNG XẾP LOẠI CỦA GVCN
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Ngày ghi nhận:</span>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Section 16 Mockup: Dropdown Mẫu nội dung ghi nhận [ Thực hiện nghiêm túc nội quy ▼ ] */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn mẫu ghi nhận nhanh:
              </label>
              <div className="relative">
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full text-xs font-bold text-blue-950 bg-blue-50/70 border border-blue-300 rounded-xl p-2.5 pr-8 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  {ASSESSMENT_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label} (Mức: {p.levelRating})
                    </option>
                  ))}
                  <option value="custom">-- Nhập nội dung tùy chỉnh khác --</option>
                </select>
              </div>
            </div>

            {/* Textarea for Nội dung ghi nhận (comment) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung ghi nhận chi tiết: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Nhập nội dung ghi nhận nề nếp, ý thức rèn luyện của học sinh..."
                className="w-full text-xs text-slate-800 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed"
                required
              />
            </div>

            {/* Mức ghi nhận & Xếp loại đề xuất */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mức ghi nhận đánh giá:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Tốt', 'Khá', 'Đạt', 'Chưa đạt'] as const).map((r) => (
                    <label
                      key={r}
                      onClick={() => setLevelRating(r)}
                      className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                        levelRating === r
                          ? r === 'Tốt'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                            : r === 'Khá'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                            : r === 'Đạt'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                            : 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rating_radio_level"
                        checked={levelRating === r}
                        onChange={() => setLevelRating(r)}
                        className="w-3.5 h-3.5 accent-white cursor-pointer"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Đề xuất xếp loại rèn luyện:
                </label>
                <select
                  value={proposedRating}
                  onChange={(e) => setProposedRating(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Tốt">Tốt</option>
                  <option value="Khá">Khá</option>
                  <option value="Đạt">Đạt</option>
                  <option value="Yếu / Chưa đạt">Yếu / Chưa đạt</option>
                </select>
              </div>
            </div>

            {/* Optional accordion for detailed 6 aspects */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDetailedAspects(!showDetailedAspects)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <span>{showDetailedAspects ? '▼ Ẩn chi tiết 6 mặt rèn luyện' : '▶ Xem / Chỉnh sửa chi tiết 6 mặt rèn luyện (Ý thức, Trách nhiệm, Quan hệ...)'}</span>
              </button>

              {showDetailedAspects && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Ý thức chấp hành nội quy:</label>
                    <input
                      type="text"
                      value={ruleCompliance}
                      onChange={(e) => setRuleCompliance(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Ý thức học tập:</label>
                    <input
                      type="text"
                      value={learningAttitude}
                      onChange={(e) => setLearningAttitude(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">3. Tinh thần trách nhiệm:</label>
                    <input
                      type="text"
                      value={responsibility}
                      onChange={(e) => setResponsibility(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">4. Hoạt động tập thể:</label>
                    <input
                      type="text"
                      value={collectiveActivities}
                      onChange={(e) => setCollectiveActivities(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">5. Quan hệ thầy trò & bạn bè:</label>
                    <input
                      type="text"
                      value={relationships}
                      onChange={(e) => setRelationships(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">6. Ý thức tự giác:</label>
                    <input
                      type="text"
                      value={selfDiscipline}
                      onChange={(e) => setSelfDiscipline(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100/90 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            {mode === 'bulk' ? (
              <span>
                Áp dụng cho: <strong className="text-blue-700 font-black">{selectedStudentIds.length}</strong> học sinh đã chọn
              </span>
            ) : (
              <span>
                Áp dụng cho: <strong className="text-blue-700 font-black">{activeSingleStudent?.name}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy
            </button>

            {/* Section 8 & 16: Nút [💾 GHI NHẬN CHO HỌC SINH ĐÃ CHỌN] */}
            <button
              type="button"
              disabled={submitting || (mode === 'bulk' && selectedStudentIds.length === 0)}
              onClick={() => handleOpenConfirmation()}
              className="px-5 py-2.5 bg-[#1457D9] hover:bg-[#123B78] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ring-2 ring-blue-300"
            >
              <Save size={15} />
              <span>
                {mode === 'bulk'
                  ? `💾 LƯU XẾP LOẠI CHO HỌC SINH ĐÃ CHỌN (${selectedStudentIds.length})`
                  : '💾 LƯU PHIẾU XẾP LOẠI CỦA GVCN'}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 10: XÁC NHẬN TRƯỚC KHI GHI NHẬN HÀNG LOẠT (CONFIRMATION MODAL) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto">
                <Save size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                XÁC NHẬN GHI NHẬN
              </h3>
              <p className="text-xs text-slate-500">
                Vui lòng kiểm tra lại thông tin trước khi thực hiện ghi nhận.
              </p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span>Bạn đang ghi nhận cho:</span>
                <strong className="text-blue-700 font-black">
                  {mode === 'bulk' ? `${selectedStudentIds.length} học sinh` : activeSingleStudent?.name}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Lớp:</span>
                <strong className="text-slate-900 font-bold">{selectedClass?.name || '---'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Mức ghi nhận:</span>
                <strong className="text-emerald-700 font-black">{levelRating}</strong>
              </div>
              <div className="flex justify-between">
                <span>Ngày ghi nhận:</span>
                <strong className="text-slate-900 font-bold">{recordDate}</strong>
              </div>
              <div className="pt-2 border-t border-blue-200/80">
                <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Nội dung:</span>
                <p className="font-extrabold text-blue-950 italic line-clamp-2">
                  &ldquo;{generalComment || ruleCompliance}&rdquo;
                </p>
              </div>
            </div>

            {/* Section 12: Duplicate detection notification & Skip Duplicates option */}
            {duplicateCandidatesCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>⚠️ Có {duplicateCandidatesCount} học sinh đã có ghi nhận trước đó.</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold select-none pt-1">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Bỏ qua bản ghi trùng lặp (không ghi đè nếu cùng nội dung)</span>
                </label>
              </div>
            )}

            <div className="text-center text-xs font-bold text-slate-700 pt-1">
              Bạn có chắc chắn muốn thực hiện?
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={submitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>✓ XÁC NHẬN GHI NHẬN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
