import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Eye, 
  Check, 
  Edit3, 
  MessageSquare, 
  ExternalLink,
  Search,
  Filter,
  UserCheck,
  Award,
  Users,
  Megaphone,
  Printer,
  Sparkles,
  RotateCcw,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  X,
  CheckSquare
} from 'lucide-react';
import { 
  ConductRecord, 
  ConductEvaluation, 
  Student, 
  ClassInfo, 
  ClassificationType, 
  TeacherAssessment, 
  TeacherAssessmentCompletion,
  RatingTierItem
} from '../../types/homeroom';
import { homeroomService } from '../../services/homeroomService';
import { calculateConductScore, isDatChuaDatCategory, evaluateStudent6Groups, DEFAULT_RATING_TIERS } from '../../lib/homeroomData';
import { ALL_MONTH_OPTIONS } from '../../utils/schoolWeekUtils';

interface BghApprovalTabProps {
  records: ConductRecord[];
  evaluations: ConductEvaluation[];
  students: Student[];
  classes: ClassInfo[];
  teacherAssessments?: TeacherAssessment[];
  assessmentCompletions?: TeacherAssessmentCompletion[];
  selectedMonth?: string;
  selectedSchoolYear?: string;
  userRole?: string;
  onViewStudentProfile?: (student: Student) => void;
  onApproveRecord?: (recordId: string, status: any, note?: string, newRating?: string) => Promise<void>;
  onApproveEvaluation?: (evaluationId: string, status: any, comment?: string) => Promise<void>;
  onApproveCompletion?: (docId: string, status: 'Đã duyệt' | 'Yêu cầu điều chỉnh', comment?: string) => Promise<void>;
  onApproveStudentAssessment?: (assessmentId: string, status: any, adjustedRating?: any, comment?: string) => Promise<void>;
}

export default function BghApprovalTab({
  records,
  evaluations,
  students,
  classes,
  teacherAssessments = [],
  assessmentCompletions = [],
  selectedMonth = 'Tháng 09',
  selectedSchoolYear = '2026–2027',
  userRole,
  onViewStudentProfile,
  onApproveRecord,
  onApproveEvaluation,
  onApproveCompletion,
  onApproveStudentAssessment
}: BghApprovalTabProps) {
  // Main Sub-Tab: 'ratings' (Duyệt xếp loại GVCN) | 'violations' (Duyệt vi phạm nghiêm trọng)
  const [subTab, setSubTab] = useState<'ratings' | 'violations'>('ratings');

  // Filters for Ratings Approval
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classSearch, setClassSearch] = useState<string>('');

  // Filters for Violations Approval
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Class Detail Review
  const [reviewClass, setReviewClass] = useState<ClassInfo | null>(null);
  const [bghApprovalComment, setBghApprovalComment] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Modal State for Adjusting Individual Student Assessment
  const [adjustStudentModal, setAdjustStudentModal] = useState<{
    student: Student;
    assessment?: TeacherAssessment | null;
    currentRating: string;
    score: number;
  } | null>(null);
  const [studentAdjustRating, setStudentAdjustRating] = useState<'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'>('Tốt');
  const [studentAdjustComment, setStudentAdjustComment] = useState<string>('');

  // Quick Action Modal for Class (Duyệt nhanh hoặc Yêu cầu sửa)
  const [quickClassAction, setQuickClassAction] = useState<{
    completion: TeacherAssessmentCompletion;
    action: 'approve' | 'request_change';
  } | null>(null);
  const [quickActionNote, setQuickActionNote] = useState<string>('');

  // Violation Evidence Modal & Adjustment Modal
  const [activeEvidenceUrl, setActiveEvidenceUrl] = useState<string | null>(null);
  const [adjustModalRecord, setAdjustModalRecord] = useState<ConductRecord | null>(null);
  const [adjustRating, setAdjustRating] = useState<ClassificationType>('Khá');
  const [adjustComment, setAdjustComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string>('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // --- 1. DATA COMPUTATION FOR RATINGS APPROVAL ---
  const classRatingSummaries = useMemo(() => {
    const yearSlug = (selectedSchoolYear || '2026–2027').replace(/[^a-zA-Z0-9]/g, '_');
    const monthSlug = (monthFilter || 'Thang_09').replace(/[^a-zA-Z0-9]/g, '_');
    const selMonthNum = parseInt(monthFilter.replace(/\D/g, ''), 10) || 9;

    return classes.map(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const docId = `completion_${cls.id}_${yearSlug}_${monthSlug}`;
      const completion = assessmentCompletions.find(c => c.id === docId && c.isCompleted) || null;

      // Filter assessments for this class in this month
      const clsAssessments = teacherAssessments.filter(a => 
        a.classId === cls.id &&
        (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
        (Number(a.monthNumber) === selMonthNum || a.month === monthFilter)
      );

      // Class records in this month
      const clsRecords = records.filter(r => 
        r.classId === cls.id &&
        (!r.schoolYear || r.schoolYear === selectedSchoolYear) &&
        (Number(r.monthNumber) === selMonthNum || (r.recordDate && new Date(r.recordDate).getMonth() + 1 === selMonthNum))
      );

      // Calculate rating breakdown
      let goodCount = 0;
      let fairCount = 0;
      let passCount = 0;
      let failCount = 0;

      clsStudents.forEach(st => {
        const stAssessment = clsAssessments.find(a => a.studentId === st.id);
        const stRecords = clsRecords.filter(r => r.studentId === st.id);
        let plus = 0, minus = 0;
        stRecords.forEach(r => {
          if (r.recordType === 'TICH_CUC' || r.point === 0) return;
          if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
          if (r.pointType === 'plus') plus += Math.abs(r.point);
          else minus += Math.abs(r.point);
        });
        const evalResult = evaluateStudent6Groups(stRecords);
        const { classification } = calculateConductScore(100, plus, minus, undefined, false, undefined, evalResult);

        const effectiveRating = stAssessment?.bghAdjustedRating || stAssessment?.levelRating || stAssessment?.teacherProposedRating || classification;
        if (effectiveRating === 'Tốt' || effectiveRating.includes('TỐT')) goodCount++;
        else if (effectiveRating === 'Khá' || effectiveRating.includes('KHÁ')) fairCount++;
        else if (effectiveRating === 'Đạt' || effectiveRating.includes('ĐẠT')) passCount++;
        else failCount++;
      });

      // Status determination
      let approvalStatus: 'Đã duyệt' | 'Chờ BGH duyệt' | 'Yêu cầu điều chỉnh' | 'Đang xếp loại' = 'Đang xếp loại';
      if (completion) {
        if (completion.approvalStatus === 'Đã duyệt') approvalStatus = 'Đã duyệt';
        else if (completion.approvalStatus === 'Yêu cầu điều chỉnh') approvalStatus = 'Yêu cầu điều chỉnh';
        else approvalStatus = 'Chờ BGH duyệt';
      }

      return {
        classInfo: cls,
        students: clsStudents,
        totalStudents: clsStudents.length,
        evaluatedCount: clsAssessments.length,
        completion,
        approvalStatus,
        breakdown: {
          good: goodCount,
          fair: fairCount,
          pass: passCount,
          fail: failCount
        }
      };
    });
  }, [classes, students, assessmentCompletions, teacherAssessments, records, monthFilter, selectedSchoolYear]);

  // Filtered Class Summaries
  const filteredClassSummaries = useMemo(() => {
    return classRatingSummaries.filter(item => {
      // Grade filter
      if (gradeFilter !== 'all') {
        const gradeMatch = item.classInfo.name.startsWith(gradeFilter) || item.classInfo.grade === gradeFilter;
        if (!gradeMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.approvalStatus !== statusFilter) return false;
      }

      // Search query
      if (classSearch.trim()) {
        const q = classSearch.toLowerCase();
        const matchName = item.classInfo.name.toLowerCase().includes(q);
        const matchTeacher = (item.classInfo.homeroomTeacherName || '').toLowerCase().includes(q);
        if (!matchName && !matchTeacher) return false;
      }

      return true;
    });
  }, [classRatingSummaries, gradeFilter, statusFilter, classSearch]);

  // Summary counts for KPI
  const stats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let revisionCount = 0;
    let inProgressCount = 0;

    classRatingSummaries.forEach(c => {
      if (c.approvalStatus === 'Chờ BGH duyệt') pendingCount++;
      else if (c.approvalStatus === 'Đã duyệt') approvedCount++;
      else if (c.approvalStatus === 'Yêu cầu điều chỉnh') revisionCount++;
      else inProgressCount++;
    });

    return {
      total: classRatingSummaries.length,
      pendingCount,
      approvedCount,
      revisionCount,
      inProgressCount
    };
  }, [classRatingSummaries]);

  // --- 2. DATA FOR VIOLATIONS APPROVAL ---
  const bghTargetRecords = records.filter(r => {
    const isSerious = r.requiresBghApproval || 
      r.hasConductWarning || 
      r.categoryType === 'BẠO LỰC HỌC ĐƯỜNG' || 
      r.categoryType === 'GIAN LẬN THI CỬ' || 
      (r.categoryType === 'ATGT' && (r.level === 'Nghiêm trọng' || r.level === 'Rất nghiêm trọng')) ||
      r.level === 'Rất nghiêm trọng' ||
      r.level === 'Nghiêm trọng';

    if (!isSerious) return false;
    if (selectedClassFilter !== 'all' && r.classId !== selectedClassFilter) return false;
    
    if (selectedStatusFilter !== 'all') {
      const status = r.bghApprovalStatus || 'Chưa duyệt';
      if (status !== selectedStatusFilter) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.studentName.toLowerCase().includes(q) || r.className.toLowerCase().includes(q) || (r.note && r.note.toLowerCase().includes(q));
    }

    return true;
  });

  // --- 3. APPROVAL HANDLERS ---
  const handleApproveClassCompletion = async (completionDocId: string, note?: string) => {
    try {
      setIsSubmittingApproval(true);
      if (onApproveCompletion) {
        await onApproveCompletion(completionDocId, 'Đã duyệt', note);
      } else {
        await homeroomService.updateTeacherAssessmentCompletionApproval(completionDocId, 'Đã duyệt', note);
      }
      showToast('🎉 Đã phê duyệt kết quả xếp loại rèn luyện của lớp thành công!');
      setQuickClassAction(null);
      setReviewClass(null);
    } catch (err: any) {
      alert('Lỗi khi duyệt: ' + (err.message || err));
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRequestRevisionClass = async (completionDocId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Vui lòng nhập ý kiến / lý do yêu cầu GVCN điều chỉnh.');
      return;
    }
    try {
      setIsSubmittingApproval(true);
      if (onApproveCompletion) {
        await onApproveCompletion(completionDocId, 'Yêu cầu điều chỉnh', reason);
      } else {
        await homeroomService.updateTeacherAssessmentCompletionApproval(completionDocId, 'Yêu cầu điều chỉnh', reason);
      }
      showToast('⚠️ Đã gửi yêu cầu điều chỉnh xếp loại tới Giáo viên Chủ nhiệm.');
      setQuickClassAction(null);
      setReviewClass(null);
    } catch (err: any) {
      alert('Lỗi khi gửi yêu cầu điều chỉnh: ' + (err.message || err));
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSaveStudentAdjustment = async () => {
    if (!adjustStudentModal) return;
    try {
      setIsSubmitting(true);
      const student = adjustStudentModal.student;
      const existing = adjustStudentModal.assessment;

      if (existing) {
        if (onApproveStudentAssessment) {
          await onApproveStudentAssessment(existing.id, 'Điều chỉnh', studentAdjustRating, studentAdjustComment);
        } else {
          await homeroomService.updateStudentTeacherAssessmentBghApproval(
            existing.id,
            'Điều chỉnh',
            studentAdjustRating,
            studentAdjustComment
          );
        }
      } else {
        // Create an assessment with BGH adjusted rating
        const selMonthNum = parseInt(monthFilter.replace(/\D/g, ''), 10) || 9;
        await homeroomService.saveTeacherAssessment({
          studentId: student.id,
          studentName: student.name,
          studentCode: student.code,
          classId: student.classId,
          className: student.className,
          teacherId: 'bgh',
          teacherName: 'Ban Giám hiệu',
          semester: 'Học kỳ I',
          schoolYear: selectedSchoolYear,
          month: monthFilter,
          monthNumber: selMonthNum,
          recordDate: new Date().toISOString().split('T')[0],
          assessment: {},
          comment: studentAdjustComment || 'BGH trực tiếp xếp loại',
          levelRating: studentAdjustRating,
          needsMonitoring: studentAdjustRating === 'Chưa đạt',
          teacherProposedRating: studentAdjustRating as any,
          bghApprovalStatus: 'Điều chỉnh',
          bghAdjustedRating: studentAdjustRating,
          bghComment: studentAdjustComment,
          recordedBy: 'bgh'
        });
      }

      showToast(`✓ Đã cập nhật điều chỉnh xếp loại cho học sinh ${student.name} thành [${studentAdjustRating}]`);
      setAdjustStudentModal(null);
    } catch (err: any) {
      alert('Lỗi khi điều chỉnh xếp loại học sinh: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle BGH quick approve violation record
  const handleApproveRecord = async (record: ConductRecord) => {
    try {
      setIsSubmitting(true);
      if (onApproveRecord) {
        await onApproveRecord(record.id, 'Đã duyệt', 'BGH đã đồng ý với đề xuất');
      } else {
        await homeroomService.updateRecordBghApproval(record.id, 'Đã duyệt', 'BGH đã đồng ý với đề xuất', 'Ban Giám hiệu');
      }
      showToast(`Đã duyệt đề xuất vi phạm cho học sinh ${record.studentName}`);
    } catch (err) {
      alert('Lỗi khi phê duyệt vi phạm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle BGH Request Additional info for violation
  const handleRequestMoreInfo = async (record: ConductRecord) => {
    const comment = prompt('Nhập yêu cầu bổ sung thông tin cho GVCN:', 'Yêu cầu GVCN làm rõ thời gian, diễn biến sự việc và biên bản làm việc với gia đình');
    if (!comment) return;

    try {
      setIsSubmitting(true);
      if (onApproveRecord) {
        await onApproveRecord(record.id, 'Yêu cầu bổ sung', comment);
      } else {
        await homeroomService.updateRecordBghApproval(record.id, 'Yêu cầu bổ sung', comment, 'Ban Giám hiệu');
      }
      showToast(`Đã gửi yêu cầu bổ sung thông tin tới GVCN.`);
    } catch (err) {
      alert('Lỗi khi lưu yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle BGH Adjust Rating for violation
  const handleConfirmAdjustViolation = async () => {
    if (!adjustModalRecord) return;
    try {
      setIsSubmitting(true);
      if (onApproveRecord) {
        await onApproveRecord(
          adjustModalRecord.id,
          'Điều chỉnh',
          `BGH điều chỉnh kết quả: ${adjustRating}. Ghi chú: ${adjustComment}`,
          adjustRating
        );
      } else {
        await homeroomService.updateRecordBghApproval(
          adjustModalRecord.id, 
          'Điều chỉnh', 
          `BGH điều chỉnh kết quả: ${adjustRating}. Ghi chú: ${adjustComment}`, 
          'Ban Giám hiệu'
        );
      }

      setAdjustModalRecord(null);
      showToast('Đã cập nhật điều chỉnh đánh giá vi phạm thành công.');
    } catch (err) {
      alert('Lỗi khi cập nhật điều chỉnh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 shadow-inner">
              <UserCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight uppercase">
                  TRUNG TÂM PHÊ DUYỆT BAN GIÁM HIỆU
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  BGH
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Xem xét, phê duyệt kết quả xếp loại rèn luyện của GVCN và xử lý các hồ sơ vi phạm nề nếp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-xs font-semibold">
            <Calendar size={16} className="text-amber-300" />
            <span>Kỳ xét duyệt:</span>
            <strong className="text-white font-bold">{monthFilter} • {selectedSchoolYear}</strong>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('ratings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'ratings'
                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <CheckSquare size={16} />
            <span>DUYỆT XẾP LOẠI CỦA GVCN ({stats.pendingCount > 0 ? `🔥 ${stats.pendingCount} lớp chờ duyệt` : `${stats.total} lớp`})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('violations')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'violations'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <ShieldAlert size={16} />
            <span>DUYỆT VI PHẠM NGHIÊM TRỌNG ({bghTargetRecords.filter(r => (r.bghApprovalStatus || 'Chưa duyệt') === 'Chưa duyệt').length} chờ duyệt)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DUYỆT XẾP LOẠI HỌC SINH CỦA GVCN (KHI GVCN XẾP LOẠI XONG)       */}
      {/* ========================================================================= */}
      {subTab === 'ratings' && (
        <div className="space-y-5">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">Tổng số lớp</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Toàn trường</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-amber-700 block mb-1">Chờ BGH duyệt</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {stats.pendingCount}
              </span>
              <span className="text-[10px] text-amber-600/80 block mt-0.5">Đã nộp báo cáo</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-emerald-700 block mb-1">BGH đã duyệt</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                {stats.approvedCount}
              </span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">Hoàn tất phê duyệt</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-rose-700 block mb-1">Yêu cầu sửa</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-600">
                {stats.revisionCount}
              </span>
              <span className="text-[10px] text-rose-600/80 block mt-0.5">Chờ GVCN sửa lại</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-xs col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-slate-600 block mb-1">Đang xếp loại</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-700">
                {stats.inProgressCount}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Chưa báo hoàn thành</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Khối */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Khối:</span>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả các khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
              </div>

              {/* Tháng */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Tháng:</span>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {ALL_MONTH_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Trạng thái BGH */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Trạng thái BGH:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Chờ BGH duyệt">🟡 Chờ BGH duyệt</option>
                  <option value="Đã duyệt">🟢 BGH đã duyệt</option>
                  <option value="Yêu cầu điều chỉnh">🔴 Yêu cầu điều chỉnh</option>
                  <option value="Đang xếp loại">⚪ Đang xếp loại</option>
                </select>
              </div>
            </div>

            {/* Tìm kiếm */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Tìm tên lớp, GVCN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Classes Table / Cards List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3.5 w-12 text-center">STT</th>
                    <th className="p-3.5 min-w-[180px]">Lớp & Giáo viên Chủ nhiệm</th>
                    <th className="p-3.5 min-w-[170px]">Tiến độ xếp loại</th>
                    <th className="p-3.5 min-w-[200px]">Cơ cấu xếp loại</th>
                    <th className="p-3.5 min-w-[160px] text-center">Trạng thái BGH</th>
                    <th className="p-3.5 min-w-[240px] text-right">Thao tác của BGH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 size={40} className="text-slate-300" />
                          <p className="font-bold text-slate-700">Không tìm thấy lớp học nào phù hợp bộ lọc.</p>
                          <p className="text-xs text-slate-400">Hãy thay đổi bộ lọc khối hoặc trạng thái để xem thêm.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClassSummaries.map((item, idx) => {
                      const cls = item.classInfo;
                      const completion = item.completion;
                      const status = item.approvalStatus;
                      const pct = item.totalStudents > 0 ? Math.round((item.evaluatedCount / item.totalStudents) * 100) : 0;

                      return (
                        <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Lớp & GVCN */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-blue-900">{cls.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {cls.grade ? `Khối ${cls.grade}` : 'Lớp'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              GVCN: <strong className="text-slate-800">{cls.homeroomTeacherName || 'Chưa phân công'}</strong>
                            </div>
                            {completion && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Nộp: {completion.completedAt} ({completion.completedByName})
                              </div>
                            )}
                          </td>

                          {/* Tiến độ xếp loại */}
                          <td className="p-3.5">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-700">
                                {item.evaluatedCount}/{item.totalStudents} học sinh
                              </span>
                              <span className={`font-black ${pct === 100 ? 'text-emerald-700' : 'text-blue-700'}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                }`} 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {item.totalStudents - item.evaluatedCount > 0 ? (
                              <span className="text-[10px] text-amber-700 font-semibold mt-1 inline-block">
                                Còn {item.totalStudents - item.evaluatedCount} em chưa đánh giá
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold mt-1 inline-block">
                                ✓ Đã đánh giá 100%
                              </span>
                            )}
                          </td>

                          {/* Cơ cấu xếp loại */}
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Tốt: {item.breakdown.good}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Khá: {item.breakdown.fair}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Đạt: {item.breakdown.pass}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                Chưa đạt: {item.breakdown.fail}
                              </span>
                            </div>
                            {completion?.note && (
                              <p className="text-[10.5px] text-slate-500 italic mt-1.5 truncate max-w-[220px]" title={completion.note}>
                                💬 "{completion.note}"
                              </p>
                            )}
                          </td>

                          {/* Trạng thái BGH */}
                          <td className="p-3.5 text-center">
                            {status === 'Đã duyệt' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 size={13} /> 🟢 ĐÃ DUYỆT
                                </span>
                                {completion?.approvedByName && (
                                  <p className="text-[10.5px] text-slate-500 mt-1">
                                    Duyệt bởi: <strong>{completion.approvedByName}</strong>
                                  </p>
                                )}
                              </div>
                            ) : status === 'Yêu cầu điều chỉnh' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  <AlertTriangle size={13} /> 🔴 YÊU CẦU SỬA
                                </span>
                                {completion?.bghComment && (
                                  <p className="text-[10.5px] text-rose-800 mt-1 italic max-w-[160px] mx-auto truncate" title={completion.bghComment}>
                                    "{completion.bghComment}"
                                  </p>
                                )}
                              </div>
                            ) : status === 'Chờ BGH duyệt' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <Megaphone size={13} /> 🟡 CHỜ BGH DUYỆT
                                </span>
                                <p className="text-[10.5px] text-amber-800 font-semibold mt-1">
                                  GVCN đã báo hoàn thành
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                ⚪ Đang xếp loại
                              </span>
                            )}
                          </td>

                          {/* Thao tác của BGH */}
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {/* Nút Xem chi tiết & Duyệt */}
                            <button
                              type="button"
                              onClick={() => {
                                setReviewClass(cls);
                                setBghApprovalComment(completion?.bghComment || '');
                              }}
                              className="px-3 py-1.5 bg-[#1457D9] hover:bg-[#123B78] text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                              title="Xem danh sách chi tiết học sinh và duyệt"
                            >
                              <Eye size={13} /> Xem & Duyệt
                            </button>

                            {/* Nút Duyệt nhanh nếu lớp đang chờ duyệt */}
                            {completion && status === 'Chờ BGH duyệt' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickClassAction({ completion, action: 'approve' });
                                  setQuickActionNote('');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                                title="Phê duyệt nhanh kết quả của lớp"
                              >
                                <Check size={13} /> Duyệt
                              </button>
                            )}

                            {/* Nút Yêu cầu sửa nếu lớp đã nộp */}
                            {completion && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickClassAction({ completion, action: 'request_change' });
                                  setQuickActionNote(completion.bghComment || '');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-all border border-rose-200 cursor-pointer inline-flex items-center gap-1"
                                title="Yêu cầu GVCN điều chỉnh lại"
                              >
                                <MessageSquare size={13} /> Yêu cầu sửa
                              </button>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DUYỆT VI PHẠM NGHIÊM TRỌNG & CẢNH BÁO ĐẶC BIỆT                  */}
      {/* ========================================================================= */}
      {subTab === 'violations' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Lớp Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Lớp:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="all">Tất cả các lớp</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Trạng thái BGH:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Chưa duyệt">🔴 Chưa duyệt</option>
                  <option value="Đã duyệt">🟢 Đã duyệt</option>
                  <option value="Điều chỉnh">🔵 Điều chỉnh</option>
                  <option value="Yêu cầu bổ sung">🟡 Yêu cầu bổ sung</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, lớp..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3.5 min-w-[180px]">Học sinh / Lớp</th>
                    <th className="p-3.5 min-w-[160px]">Loại vi phạm & Mức độ</th>
                    <th className="p-3.5 min-w-[220px]">Nội dung & Minh chứng</th>
                    <th className="p-3.5 min-w-[180px]">Đề xuất của GVCN</th>
                    <th className="p-3.5 min-w-[140px] text-center">Trạng thái BGH</th>
                    <th className="p-3.5 min-w-[220px] text-center">Thao tác BGH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bghTargetRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 size={36} className="text-emerald-500" />
                          <p className="font-bold text-slate-700">Không có trường hợp vi phạm nghiêm trọng nào cần duyệt.</p>
                          <p className="text-xs text-slate-400">Toàn bộ vi phạm đã được xử lý hoặc chưa phát sinh vi phạm nghiêm trọng.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bghTargetRecords.map((rec) => {
                      const student = students.find(s => s.id === rec.studentId);
                      const status = rec.bghApprovalStatus || 'Chưa duyệt';

                      let statusBadge = 'bg-rose-100 text-rose-800 border-rose-300';
                      if (status === 'Đã duyệt') statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      if (status === 'Điều chỉnh') statusBadge = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
                      if (status === 'Yêu cầu bổ sung') statusBadge = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Học sinh / Lớp */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{rec.studentName}</div>
                            <div className="text-xs text-slate-500">Lớp: <span className="font-semibold text-slate-800">{rec.className}</span></div>
                            <div className="text-[11px] text-slate-400">Ngày: {rec.recordDate}</div>
                          </td>

                          {/* Vi phạm */}
                          <td className="p-3.5 space-y-1">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {rec.categoryType || rec.criterionName}
                            </span>
                            <div>
                              <span className="text-[11px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                                {rec.level || 'Nghiêm trọng'} ({rec.point} điểm)
                              </span>
                            </div>
                          </td>

                          {/* Nội dung & Minh chứng */}
                          <td className="p-3.5 space-y-1">
                            <p className="text-slate-800 font-medium leading-tight">{rec.note || rec.criterionName}</p>
                            {rec.location && (
                              <p className="text-[11px] text-slate-500">📍 {rec.location}</p>
                            )}
                            {rec.evidenceUrl ? (
                              <button
                                type="button"
                                onClick={() => setActiveEvidenceUrl(rec.evidenceUrl || null)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer pt-1"
                              >
                                <ExternalLink size={13} />
                                <span>Xem minh chứng đính kèm</span>
                              </button>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">Chưa có file minh chứng</p>
                            )}
                          </td>

                          {/* Đề xuất GVCN */}
                          <td className="p-3.5 space-y-1">
                            <p className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-xs">
                              {rec.proposedRating || 'Chưa đạt – cần xem xét'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              GVCN: <span className="font-medium text-slate-800">{rec.recordedByName}</span>
                            </p>
                          </td>

                          {/* Trạng thái BGH */}
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs border ${statusBadge}`}>
                              {status}
                            </span>
                            {rec.bghComment && (
                              <p className="text-[10.5px] text-slate-500 mt-1 italic max-w-[150px] mx-auto truncate" title={rec.bghComment}>
                                💬 {rec.bghComment}
                              </p>
                            )}
                          </td>

                          {/* Thao tác BGH */}
                          <td className="p-3.5 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {student && onViewStudentProfile && (
                                <button
                                  type="button"
                                  onClick={() => onViewStudentProfile(student)}
                                  className="px-2.5 py-1.2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  title="Xem toàn bộ hồ sơ rèn luyện"
                                >
                                  <Eye size={13} /> Hồ sơ
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleApproveRecord(rec)}
                                className="px-2.5 py-1.2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                title="Đồng ý với đề xuất của GVCN"
                              >
                                <Check size={13} /> Đồng ý
                              </button>

                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setAdjustModalRecord(rec);
                                  setAdjustRating('Khá');
                                  setAdjustComment('');
                                }}
                                className="px-2.5 py-1.2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Điều chỉnh mức rèn luyện"
                              >
                                <Edit3 size={13} /> Điều chỉnh
                              </button>

                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleRequestMoreInfo(rec)}
                                className="px-2.5 py-1.2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Yêu cầu GVCN bổ sung minh chứng"
                              >
                                <MessageSquare size={13} /> Bổ sung
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BGH REVIEW CHI TIẾT DANH SÁCH HỌC SINH CỦA LỚP & DUYỆT BẢNG       */}
      {/* ========================================================================= */}
      {reviewClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    BẢNG XẾP LOẠI RÈN LUYỆN LỚP {reviewClass.name} — {monthFilter.toUpperCase()}
                  </h3>
                  <p className="text-xs text-blue-200">
                    GVCN: <strong>{reviewClass.homeroomTeacherName || 'Chưa rõ'}</strong> • Năm học: <strong>{selectedSchoolYear}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewClass(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Summary Stats of this class */}
              {(() => {
                const targetSummary = classRatingSummaries.find(s => s.classInfo.id === reviewClass.id);
                const completion = targetSummary?.completion;

                return (
                  <div className="space-y-3">
                    {/* Completion Status Alert */}
                    {completion ? (
                      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                        completion.approvalStatus === 'Đã duyệt'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : completion.approvalStatus === 'Yêu cầu điều chỉnh'
                          ? 'bg-rose-50 border-rose-300 text-rose-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm uppercase">
                              {completion.approvalStatus === 'Đã duyệt'
                                ? '🟢 KẾT QUẢ ĐÃ ĐƯỢC BGH PHÊ DUYỆT'
                                : completion.approvalStatus === 'Yêu cầu điều chỉnh'
                                ? '🔴 BGH ĐÃ YÊU CẦU ĐIỀU CHỈNH'
                                : '🟡 BÁO CÁO ĐANG CHỜ BGH DUYỆT'}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Nộp bởi <strong>{completion.completedByName}</strong> lúc {completion.completedAt}
                            {completion.approvedByName && (
                              <span> • Phê duyệt bởi <strong>{completion.approvedByName}</strong> ({completion.approvedAt})</span>
                            )}
                          </p>
                          {completion.note && (
                            <p className="text-[11px] mt-1 italic">
                              GVCN nhắn: "{completion.note}"
                            </p>
                          )}
                          {completion.bghComment && (
                            <p className="text-[11px] mt-1 font-bold text-blue-900">
                              Ý kiến BGH: "{completion.bghComment}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-3 py-1.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-300 text-xs flex items-center gap-1 shadow-2xs cursor-pointer hover:bg-slate-50"
                          >
                            <Printer size={14} /> In biên bản
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl flex items-center gap-2">
                        <AlertCircle size={16} className="text-slate-400 shrink-0" />
                        <span>Lớp chưa nộp báo cáo hoàn thành xếp loại. BGH có thể xem trước danh sách và đánh giá.</span>
                      </div>
                    )}

                    {/* Student List Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 w-12 text-center">STT</th>
                            <th className="p-2.5 min-w-[80px]">Mã HS</th>
                            <th className="p-2.5 min-w-[160px]">Họ và tên</th>
                            <th className="p-2.5 w-16 text-center">Giới tính</th>
                            <th className="p-2.5 w-24 text-center">Điểm RL</th>
                            <th className="p-2.5 min-w-[130px] text-center">Xếp loại GVCN</th>
                            <th className="p-2.5 min-w-[140px] text-center">6 Tiêu chí nền nếp</th>
                            <th className="p-2.5 min-w-[180px]">Nhận xét của GVCN</th>
                            <th className="p-2.5 min-w-[100px] text-center">BGH điều chỉnh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const clsStudents = students.filter(s => s.classId === reviewClass.id);
                            const selMonthNum = parseInt(monthFilter.replace(/\D/g, ''), 10) || 9;
                            const clsRecords = records.filter(r => 
                              r.classId === reviewClass.id &&
                              (!r.schoolYear || r.schoolYear === selectedSchoolYear) &&
                              (Number(r.monthNumber) === selMonthNum || (r.recordDate && new Date(r.recordDate).getMonth() + 1 === selMonthNum))
                            );
                            const clsAssessments = teacherAssessments.filter(a => 
                              a.classId === reviewClass.id &&
                              (!a.schoolYear || a.schoolYear === selectedSchoolYear) &&
                              (Number(a.monthNumber) === selMonthNum || a.month === monthFilter)
                            );

                            return clsStudents.map((st, idx) => {
                              const stAssessment = clsAssessments.find(a => a.studentId === st.id);
                              const stRecords = clsRecords.filter(r => r.studentId === st.id);
                              let plus = 0, minus = 0;
                              stRecords.forEach(r => {
                                if (r.recordType === 'TICH_CUC' || r.point === 0) return;
                                if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
                                if (r.pointType === 'plus') plus += Math.abs(r.point);
                                else minus += Math.abs(r.point);
                              });
                              const evalResult = evaluateStudent6Groups(stRecords);
                              const { totalScore, classification } = calculateConductScore(100, plus, minus, undefined, false, undefined, evalResult);

                              const effectiveRating = stAssessment?.bghAdjustedRating || stAssessment?.levelRating || stAssessment?.teacherProposedRating || classification;
                              const isAdjustedByBgh = Boolean(stAssessment?.bghAdjustedRating);

                              return (
                                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-2.5 text-center font-bold text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2.5 font-mono text-slate-600 font-semibold">
                                    {st.code}
                                  </td>
                                  <td className="p-2.5 font-bold text-slate-900">
                                    {st.name}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-600">
                                    {st.gender}
                                  </td>
                                  <td className="p-2.5 text-center font-black text-blue-900">
                                    {totalScore}
                                  </td>

                                  {/* Xếp loại GVCN */}
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block ${
                                      effectiveRating === 'Tốt' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                      effectiveRating === 'Khá' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                      effectiveRating === 'Đạt' || effectiveRating.includes('ĐẠT') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                      'bg-rose-100 text-rose-800 border-rose-300'
                                    }`}>
                                      {effectiveRating}
                                    </span>
                                    {isAdjustedByBgh && (
                                      <span className="block text-[9.5px] text-blue-700 font-bold mt-0.5">
                                        (BGH đã điều chỉnh)
                                      </span>
                                    )}
                                  </td>

                                  {/* 6 Tiêu chí nền nếp */}
                                  <td className="p-2.5 text-center">
                                    {evalResult.hasEvaluation ? (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${evalResult.badgeStyle}`}>
                                        {evalResult.displayClassification}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Chấp hành tốt</span>
                                    )}
                                  </td>

                                  {/* Nhận xét GVCN */}
                                  <td className="p-2.5 text-slate-700 leading-snug">
                                    <div className="max-w-xs truncate" title={stAssessment?.comment || 'Chấp hành tốt nội quy'}>
                                      {stAssessment?.comment || '—'}
                                    </div>
                                    {stAssessment?.needsMonitoring && (
                                      <span className="inline-block mt-0.5 text-[9.5px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                                        Cần theo dõi
                                      </span>
                                    )}
                                  </td>

                                  {/* BGH Thao tác từng em */}
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAdjustStudentModal({
                                          student: st,
                                          assessment: stAssessment || null,
                                          currentRating: effectiveRating,
                                          score: totalScore
                                        });
                                        setStudentAdjustRating(
                                          (effectiveRating === 'Tốt' || effectiveRating === 'Khá' || effectiveRating === 'Đạt' || effectiveRating === 'Chưa đạt')
                                            ? effectiveRating
                                            : 'Tốt'
                                        );
                                        setStudentAdjustComment(stAssessment?.bghComment || '');
                                      }}
                                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-lg text-[11px] border border-slate-200 transition-colors cursor-pointer"
                                      title="Điều chỉnh mức xếp loại của học sinh này"
                                    >
                                      <Edit3 size={11} className="inline mr-1" /> Sửa
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Ý kiến phê duyệt của BGH cho cả lớp */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Ý kiến chỉ đạo & Ghi chú phê duyệt của Ban Giám hiệu:
                      </label>
                      <textarea
                        rows={2}
                        value={bghApprovalComment}
                        onChange={(e) => setBghApprovalComment(e.target.value)}
                        placeholder="Nhập nhận xét chung, đánh giá hoặc chỉ đạo cho lớp..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReviewClass(null)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {(() => {
                const targetSummary = classRatingSummaries.find(s => s.classInfo.id === reviewClass.id);
                const completion = targetSummary?.completion;

                return (
                  <div className="flex items-center gap-2">
                    {completion && (
                      <button
                        type="button"
                        disabled={isSubmittingApproval}
                        onClick={() => handleRequestRevisionClass(completion.id, bghApprovalComment)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <AlertTriangle size={15} />
                        <span>Yêu cầu GVCN điều chỉnh lại</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSubmittingApproval}
                      onClick={() => {
                        const docId = completion?.id || `completion_${reviewClass.id}_${(selectedSchoolYear || '2026–2027').replace(/[^a-zA-Z0-9]/g, '_')}_${(monthFilter || 'Thang_09').replace(/[^a-zA-Z0-9]/g, '_')}`;
                        handleApproveClassCompletion(docId, bghApprovalComment);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isSubmittingApproval ? 'Đang lưu...' : '✓ PHÊ DUYỆT BẢNG XẾP LOẠI CỦA LỚP'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BGH ĐIỀU CHỈNH XẾP LOẠI RIÊNG CHO HỌC SINH                      */}
      {/* ========================================================================= */}
      {adjustStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" />
                <span>BGH Điều chỉnh Xếp loại Học sinh</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustStudentModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>Học sinh: <strong className="text-slate-900 font-bold">{adjustStudentModal.student.name} ({adjustStudentModal.student.code})</strong></div>
                <div>Lớp: <strong className="text-blue-900 font-bold">{adjustStudentModal.student.className}</strong></div>
                <div>Điểm rèn luyện: <strong className="text-slate-900">{adjustStudentModal.score} điểm</strong></div>
                <div>Xếp loại GVCN đề xuất: <span className="font-bold text-amber-800">{adjustStudentModal.currentRating}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mức xếp loại Ban Giám hiệu quyết định:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Tốt', 'Khá', 'Đạt', 'Chưa đạt'] as const).map(tier => (
                    <label
                      key={tier}
                      className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        studentAdjustRating === tier
                          ? 'bg-blue-100 border-blue-500 text-blue-950 font-black shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bgh_student_tier"
                        value={tier}
                        checked={studentAdjustRating === tier}
                        onChange={() => setStudentAdjustRating(tier)}
                        className="accent-blue-600 shrink-0"
                      />
                      <span>{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Căn cứ điều chỉnh của BGH:
                </label>
                <textarea
                  rows={2}
                  value={studentAdjustComment}
                  onChange={(e) => setStudentAdjustComment(e.target.value)}
                  placeholder="Ví dụ: Học sinh có nhiều thành tích nổi bật / Đã xem xét giảm nhẹ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustStudentModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveStudentAdjustment}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BGH QUICK APPROVE HOẶC YÊU CẦU SỬA CHO LỚP                       */}
      {/* ========================================================================= */}
      {quickClassAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {quickClassAction.action === 'approve' ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Phê duyệt Xếp loại Lớp {quickClassAction.completion.className}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="text-rose-600" />
                    <span>Yêu cầu Điều chỉnh Lớp {quickClassAction.completion.className}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setQuickClassAction(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                {quickClassAction.action === 'approve'
                  ? `Xác nhận phê duyệt kết quả xếp loại rèn luyện cho lớp ${quickClassAction.completion.className} (${quickClassAction.completion.month} • ${quickClassAction.completion.schoolYear}).`
                  : `Gửi phản hồi yêu cầu Giáo viên Chủ nhiệm lớp ${quickClassAction.completion.className} mở lại bảng xếp loại để điều chỉnh bổ sung.`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {quickClassAction.action === 'approve' ? 'Ghi chú / Nhận xét của BGH (tùy chọn):' : 'Lý do & Nội dung yêu cầu điều chỉnh:'}
                </label>
                <textarea
                  rows={3}
                  value={quickActionNote}
                  onChange={(e) => setQuickActionNote(e.target.value)}
                  placeholder={
                    quickClassAction.action === 'approve'
                      ? 'Ví dụ: Đã duyệt kết quả xếp loại rèn luyện...'
                      : 'Ví dụ: Cần rà soát lại các trường hợp học sinh có điểm rèn luyện thấp...'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required={quickClassAction.action === 'request_change'}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickClassAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              {quickClassAction.action === 'approve' ? (
                <button
                  type="button"
                  disabled={isSubmittingApproval}
                  onClick={() => handleApproveClassCompletion(quickClassAction.completion.id, quickActionNote)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingApproval ? 'Đang lưu...' : 'Xác nhận Phê duyệt'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmittingApproval}
                  onClick={() => handleRequestRevisionClass(quickClassAction.completion.id, quickActionNote)}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingApproval ? 'Đang gửi...' : 'Gửi yêu cầu điều chỉnh'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MINH CHỨNG VI PHẠM                                               */}
      {/* ========================================================================= */}
      {activeEvidenceUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ExternalLink size={18} className="text-blue-600" />
                <span>Minh chứng vi phạm đính kèm</span>
              </h3>
              <button
                onClick={() => setActiveEvidenceUrl(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px]">
              {activeEvidenceUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                <img 
                  src={activeEvidenceUrl} 
                  alt="Minh chứng vi phạm" 
                  className="max-h-[350px] object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center space-y-3">
                  <FileText size={48} className="text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Tệp đính kèm: {activeEvidenceUrl}</p>
                  <a
                    href={activeEvidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Mở liên kết file minh chứng ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveEvidenceUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ĐIỀU CHỈNH VI PHẠM                                               */}
      {/* ========================================================================= */}
      {adjustModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" />
                <span>Ban Giám hiệu Điều chỉnh Vi phạm</span>
              </h3>
              <button
                onClick={() => setAdjustModalRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700">
                Học sinh: <strong className="text-slate-900 font-bold">{adjustModalRecord.studentName} ({adjustModalRecord.className})</strong>
              </p>
              <p className="text-slate-700">
                Vi phạm: <span className="font-semibold text-rose-700">{adjustModalRecord.categoryType || adjustModalRecord.criterionName}</span>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mức xếp loại BGH điều chỉnh:
                </label>
                <select
                  value={adjustRating}
                  onChange={(e) => setAdjustRating(e.target.value as ClassificationType)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Tốt">Tốt</option>
                  <option value="Khá">Khá</option>
                  <option value="Đạt">Đạt</option>
                  <option value="Chưa đạt">Chưa đạt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Ý kiến điều chỉnh của BGH:
                </label>
                <textarea
                  rows={3}
                  value={adjustComment}
                  onChange={(e) => setAdjustComment(e.target.value)}
                  placeholder="Nhập căn cứ hoặc lý do điều chỉnh..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustModalRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAdjustViolation}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
              >
                Lưu điều chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
