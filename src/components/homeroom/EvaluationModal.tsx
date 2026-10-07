import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle, ShieldCheck, AlertCircle, FileText, Send } from 'lucide-react';
import { Student, ConductEvaluation, ConductRecord, ClassificationType, ConfirmationStatus, ClassInfo } from '../../types/homeroom';
import { calculateConductScore, evaluateStudentConductRules, checkStudentHasSpecialWarning, isDatChuaDatCategory, evaluateStudent6Groups } from '../../lib/homeroomData';
import { useAuth } from '../../store/AuthContext';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  student: Student | null;
  records: ConductRecord[];
  existingEvaluation?: ConductEvaluation;
  periodLabel: string;
  onSaveEvaluation: (evaluation: Omit<ConductEvaluation, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onUpdateStatus?: (id: string, updates: Partial<ConductEvaluation>) => Promise<void>;
}

export default function EvaluationModal({
  isOpen,
  onClose,
  selectedClass,
  student,
  records,
  existingEvaluation,
  periodLabel,
  onSaveEvaluation,
  onUpdateStatus
}: EvaluationModalProps) {
  const { user } = useAuth();
  const isBgh = user?.role?.toUpperCase() === 'BGH' || user?.role?.toUpperCase() === 'ADMIN' || user?.username === 'admin';

  const [teacherComment, setTeacherComment] = useState('');
  const [principalComment, setPrincipalComment] = useState('');
  const [proposedClassification, setProposedClassification] = useState<ClassificationType>('Tốt');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate totals from records
  let totalPlus = 0;
  let totalMinus = 0;
  const studentRecords = student ? records.filter(r => r.studentId === student.id) : [];
  const hasSpecialWarning = checkStudentHasSpecialWarning(studentRecords);

  const evalResult = evaluateStudent6Groups(studentRecords);

  if (student) {
    studentRecords.forEach(r => {
      if (r.recordType === 'TICH_CUC' || r.point === 0) return;
      if (isDatChuaDatCategory(r.categoryId, r.categoryName) || Boolean(r.evaluationStatus)) return;
      if (r.pointType === 'plus') totalPlus += Math.abs(r.point);
      else totalMinus += Math.abs(r.point);
    });
  }

  const { totalScore, classification: calcClass } = calculateConductScore(100, totalPlus, totalMinus, undefined, hasSpecialWarning, undefined, evalResult);

  useEffect(() => {
    if (isOpen) {
      if (hasSpecialWarning) {
        setProposedClassification('Chưa đạt');
      } else if (existingEvaluation) {
        setTeacherComment(existingEvaluation.teacherComment || '');
        setPrincipalComment(existingEvaluation.principalComment || '');
        setProposedClassification(existingEvaluation.classification || calcClass);
      } else {
        setTeacherComment('');
        setPrincipalComment('');
        setProposedClassification(calcClass);
      }
      setErrorMsg('');
    }
  }, [isOpen, existingEvaluation, calcClass, hasSpecialWarning]);

  if (!isOpen || !student || !selectedClass) return null;

  const handleTeacherSubmit = async (status: ConfirmationStatus) => {
    try {
      setSubmitting(true);
      setErrorMsg('');

      const finalClass = hasSpecialWarning ? 'Chưa đạt' : proposedClassification;

      await onSaveEvaluation({
        id: existingEvaluation?.id,
        studentId: student.id,
        studentName: student.name,
        classId: selectedClass.id,
        className: selectedClass.name,
        schoolYear: selectedClass.schoolYear || '2026–2027',
        period: periodLabel,
        totalPlus,
        totalMinus,
        totalScore,
        classification: finalClass,
        hasSeriousViolation: hasSpecialWarning || existingEvaluation?.hasSeriousViolation,
        special_warning: hasSpecialWarning,
        special_warning_message: hasSpecialWarning ? 'Học sinh có vi phạm thuộc nhóm cảnh báo đặc biệt.' : undefined,
        conduct_rating: hasSpecialWarning ? 'YẾU / CHƯA ĐẠT' : undefined,
        teacherComment,
        teacherId: user?.id || 'gvcn',
        teacherName: user?.name || 'Giáo viên Chủ nhiệm',
        confirmationStatus: status,
        principalComment: principalComment || existingEvaluation?.principalComment
      });

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi lưu đánh giá.');
      setSubmitting(false);
    }
  };

  const handleBghConfirm = async (status: 'Đã xác nhận' | 'Yêu cầu điều chỉnh') => {
    if (!existingEvaluation?.id || !onUpdateStatus) return;
    try {
      setSubmitting(true);
      setErrorMsg('');

      await onUpdateStatus(existingEvaluation.id, {
        confirmationStatus: status,
        principalComment,
        confirmedBy: user?.id || 'bgh',
        confirmedByName: user?.name || 'BGH Trường THPT Minh Hòa',
        confirmedAt: new Date().toISOString()
      });

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi xác nhận.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] text-white p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award size={22} className="text-amber-300" />
            ĐÁNH GIÁ RÈN LUYỆN & TRÌNH BGH DUYỆT
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Header Summary */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">{student.name} ({student.code})</h3>
              <p className="text-xs text-slate-500">Lớp: {selectedClass.name} • Kỳ đánh giá: <strong>{periodLabel}</strong></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Tổng điểm rèn luyện</span>
              <span className="text-2xl font-black text-blue-700">{totalScore}</span>
            </div>
          </div>

          {/* Conduct Warning Rule Banner */}
          {(() => {
            const studentRecords = records.filter(r => r.studentId === student.id);
            const ruleEval = evaluateStudentConductRules(studentRecords);
            if (!ruleEval.hasWarning) return null;
            return (
              <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-xs space-y-1">
                <p className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-rose-600" /> 
                  <span>CẢNH BÁO RÈN LUYỆN: {ruleEval.primaryBadge}</span>
                </p>
                <p className="text-rose-800">
                  Học sinh có vi phạm đặc biệt nghiêm trọng. Đề xuất hệ thống: <strong className="underline">{ruleEval.proposedRating}</strong>. Yêu cầu BGH phê duyệt kết quả chính thức.
                </p>
              </div>
            );
          })()}

          {/* Point Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
              <span className="text-emerald-700 font-semibold block">Điểm cộng</span>
              <span className="text-base font-bold text-emerald-700">+{totalPlus}</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              <span className="text-rose-700 font-semibold block">Điểm trừ</span>
              <span className="text-base font-bold text-rose-700">-{totalMinus}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              <span className="text-amber-700 font-semibold block">Xếp loại tự động</span>
              <span className="text-base font-bold text-amber-800">{calcClass}</span>
            </div>
          </div>

          {/* GVCN Proposed Classification & Comments */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Xếp loại kết quả rèn luyện đề xuất (GVCN) <span className="text-rose-500">*</span>
              </label>
              <select
                value={proposedClassification}
                onChange={(e) => {
                  if (hasSpecialWarning && e.target.value !== 'Chưa đạt') {
                    alert('Học sinh có vi phạm thuộc nhóm Cảnh báo đặc biệt. Hệ thống tự động xếp loại YẾU / CHƯA ĐẠT!');
                    setProposedClassification('Chưa đạt');
                    return;
                  }
                  setProposedClassification(e.target.value as ClassificationType);
                }}
                disabled={hasSpecialWarning}
                className={`w-full px-3 py-2 text-xs font-bold border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${
                  hasSpecialWarning ? 'bg-rose-50 text-rose-900 border-rose-400 font-extrabold cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
              >
                <option value="Tốt">Tốt (Từ 90 đến 100+ điểm)</option>
                <option value="Khá">Khá (Từ 70 đến 89 điểm)</option>
                <option value="Đạt">Đạt (Từ 50 đến 69 điểm)</option>
                <option value="Chưa đạt">🔴 Chưa đạt / Yếu (Có vi phạm cảnh báo đặc biệt hoặc dưới 50đ)</option>
              </select>
              {hasSpecialWarning && (
                <p className="text-[11px] text-rose-700 font-bold mt-1">
                  ⚠️ Học sinh có vi phạm thuộc diện cảnh báo đặc biệt. Hệ thống tự động kích hoạt xếp loại YẾU / CHƯA ĐẠT.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nhận xét chi tiết của Giáo viên Chủ nhiệm
              </label>
              <textarea
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                rows={3}
                placeholder="Ghi nhận sự tiến bộ, ưu điểm hoặc những điểm học sinh cần khắc phục..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* BGH Review Section */}
          <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-amber-600" />
              Ý kiến & Duyệt của Ban Giám Hiệu
            </h4>
            <textarea
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              disabled={!isBgh && existingEvaluation?.confirmationStatus === 'Đã xác nhận'}
              rows={2}
              placeholder={isBgh ? "Nhập ý kiến chỉ đạo hoặc nhận xét của BGH..." : "Ý kiến từ Ban Giám Hiệu..."}
              className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none bg-white"
            />
            {existingEvaluation?.confirmedByName && (
              <p className="text-[11px] text-amber-800 italic">
                Xác nhận bởi: {existingEvaluation.confirmedByName} lúc {new Date(existingEvaluation.confirmedAt || '').toLocaleString('vi-VN')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              {/* If user is BGH and there is an evaluation */}
              {isBgh && existingEvaluation && (
                <>
                  <button
                    type="button"
                    onClick={() => handleBghConfirm('Yêu cầu điều chỉnh')}
                    disabled={submitting}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    Yêu cầu sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBghConfirm('Đã xác nhận')}
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle size={16} /> BGH Xác nhận
                  </button>
                </>
              )}

              {/* GVCN Save as draft or Submit to BGH */}
              <button
                type="button"
                onClick={() => handleTeacherSubmit('Chờ BGH xác nhận')}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Send size={16} /> Lưu & Trình BGH
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
