import React, { useState, useEffect, useMemo } from 'react';
import { X, Award, User, Calendar, FileText, Link, Upload, CheckCircle2, AlertCircle, Sparkles, Briefcase, HelpCircle } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { KpiItem, KpiRecord, Teacher } from '../../types';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import { resolveKpiGroup, resolveKpiGroupName, resolveKpiGroupDescription } from '../../lib/kpiGroupUtils';

interface KpiRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeacherId?: string;
  initialKpiId?: string;
  initialMonth?: string;
  initialAcademicYear?: string;
  editingRecord?: KpiRecord | null;
  onSuccess?: (msg: string) => void;
}

export default function KpiRecordModal({
  isOpen,
  onClose,
  initialTeacherId,
  initialKpiId,
  initialMonth,
  initialAcademicYear,
  editingRecord,
  onSuccess
}: KpiRecordModalProps) {
  const { teachers, kpis, kpiGroups, generalKpis, tasks, addKpiRecord, updateKpiRecord } = useAppContext();
  const { user } = useAuth();

  const isBghOrAdmin = !user || user.role === 'BGH' || (user as any).role === 'ADMIN' || user.id === 'admin';
  const isTtcm = user?.role === 'TTCM';

  // Teacher Search & Selection
  const [teacherSearch, setTeacherSearch] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // KPI Search & Selection & Hierarchy Filters
  const [kpiSearch, setKpiSearch] = useState('');
  const [filterGeneralKpiId, setFilterGeneralKpiId] = useState<string>('all');
  const [filterGroupId, setFilterGroupId] = useState<string>('all');
  const [isKpiDropdownOpen, setIsKpiDropdownOpen] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');
  const [selectedDeductionRuleId, setSelectedDeductionRuleId] = useState<string>('');
  const [resultStatus, setResultStatus] = useState<'good' | 'violation'>('good');
  const [customDeductionScore, setCustomDeductionScore] = useState<number>(0);

  // Form Fields
  const [date, setDate] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');
  const [quantity, setQuantity] = useState<number>(1);
  const [taskId, setTaskId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [initialStatus, setInitialStatus] = useState<'pending' | 'confirmed'>('pending');

  // Evidence
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<string>('link');
  const [evidenceNote, setEvidenceNote] = useState<string>('');
  const [filePreviewName, setFilePreviewName] = useState<string>('');

  // Reason if adjusting confirmed record
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active KPIs only for new recordings, or include current if editing
  const activeKpis = useMemo(() => {
    return kpis.filter(k => k.status === 'active' || k.id === editingRecord?.kpiId);
  }, [kpis, editingRecord]);

  // Filtered teachers list (TTCM can only record for their department if restricted, or all)
  const availableTeachers = useMemo(() => {
    if (isTtcm && user?.departmentId) {
      return teachers.filter(t => t.status === 'active' && t.departmentId === user.departmentId);
    }
    return teachers.filter(t => t.status === 'active');
  }, [teachers, isTtcm, user]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return availableTeachers;
    const q = teacherSearch.toLowerCase();
    return availableTeachers.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  }, [availableTeachers, teacherSearch]);

  // Filtered KPIs list based on search and hierarchy filters
  const filteredKpis = useMemo(() => {
    return activeKpis.filter(k => {
      if (filterGeneralKpiId !== 'all') {
        const itemGenId = k.generalKpiId || kpiGroups.find(g => g.id === k.groupId)?.generalKpiId;
        if (itemGenId && itemGenId !== filterGeneralKpiId) return false;
      }
      if (filterGroupId !== 'all') {
        const itemGroupId = k.groupId || kpiGroups.find(g => g.name === k.group)?.id;
        if (itemGroupId && itemGroupId !== filterGroupId) return false;
      }
      if (!kpiSearch.trim()) return true;
      const q = kpiSearch.toLowerCase();
      return (
        k.name.toLowerCase().includes(q) || 
        k.code.toLowerCase().includes(q) ||
        k.group.toLowerCase().includes(q)
      );
    });
  }, [activeKpis, kpiSearch, filterGeneralKpiId, filterGroupId, kpiGroups]);

  // Selected Teacher Object
  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Selected KPI Object
  const selectedKpi = useMemo(() => {
    return kpis.find(k => k.id === selectedKpiId) || null;
  }, [kpis, selectedKpiId]);

  // Associated tasks for selected teacher
  const teacherTasks = useMemo(() => {
    if (!selectedTeacherId) return [];
    return tasks.filter(t => t.assignedTo === selectedTeacherId || t.assignedToName === selectedTeacher?.name);
  }, [tasks, selectedTeacherId, selectedTeacher]);

  // Selected Deduction Rule
  const selectedDeductionRule = useMemo(() => {
    if (!selectedKpi || !selectedKpi.deductionRules || selectedKpi.deductionRules.length === 0) return null;
    return selectedKpi.deductionRules.find(r => r.id === selectedDeductionRuleId) || selectedKpi.deductionRules[0] || null;
  }, [selectedKpi, selectedDeductionRuleId]);

  const isPlusKpi = selectedKpi?.pointType === 'plus';
  const totalDeduction = resultStatus === 'violation' ? customDeductionScore * (Math.max(1, Number(quantity) || 1)) : 0;

  // Calculation of Points
  const calculatedPoints = useMemo(() => {
    if (!selectedKpi) return { unitPoint: 0, total: 0, sign: '-' };
    if (resultStatus === 'violation') {
      return {
        unitPoint: -customDeductionScore,
        total: -totalDeduction,
        sign: '-'
      };
    }
    if (isPlusKpi) {
      const pVal = selectedKpi.pointValue || 0;
      return {
        unitPoint: pVal,
        total: pVal * (Math.max(1, Number(quantity) || 1)),
        sign: '+'
      };
    }
    return {
      unitPoint: 0,
      total: 0,
      sign: ''
    };
  }, [selectedKpi, isPlusKpi, resultStatus, customDeductionScore, totalDeduction, quantity]);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);

      if (editingRecord) {
        // Edit mode
        setSelectedTeacherId(editingRecord.teacherId);
        setSelectedKpiId(editingRecord.kpiId);
        setDate(editingRecord.date || new Date().toISOString().split('T')[0]);
        setAcademicYear(editingRecord.academicYear || '2025-2026');
        setQuantity(editingRecord.quantity || 1);
        setTaskId(editingRecord.taskId || '');
        setNote(editingRecord.note || '');
        setInitialStatus(editingRecord.status === 'confirmed' ? 'confirmed' : 'pending');
        setEvidenceUrl(editingRecord.evidenceUrl || '');
        setEvidenceName(editingRecord.evidenceName || '');
        setEvidenceType(editingRecord.evidenceType || 'link');
        setEvidenceNote(editingRecord.evidenceNote || '');
        setFilePreviewName(editingRecord.evidenceName || '');
        setResultStatus(editingRecord.resultStatus || 'good');
        setSelectedDeductionRuleId(editingRecord.deductionRuleId || '');
        setAdjustmentReason('');
        setCustomDeductionScore(editingRecord.deductionScoreSnapshot || 0);
      } else {
        // Create mode
        const defaultDate = new Date();
        const y = defaultDate.getFullYear();
        const m = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const d = String(defaultDate.getDate()).padStart(2, '0');

        let targetDateStr = `${y}-${m}-${d}`;
        if (initialMonth) {
          // If initialMonth passed in format "09" or "2025-09"
          const monthNum = initialMonth.includes('-') ? initialMonth.split('-')[1] : initialMonth;
          const yearNum = initialMonth.includes('-') ? initialMonth.split('-')[0] : (initialAcademicYear ? initialAcademicYear.split('-')[0] : y);
          targetDateStr = `${yearNum}-${monthNum.padStart(2, '0')}-15`;
        }

        setSelectedTeacherId(initialTeacherId || (availableTeachers[0]?.id || ''));
        setSelectedKpiId(initialKpiId || activeKpis[0]?.id || '');
        setDate(targetDateStr);
        setAcademicYear(initialAcademicYear || '2025-2026');
        setQuantity(1);
        setTaskId('');
        setNote('');
        setInitialStatus(isBghOrAdmin ? 'confirmed' : 'pending');
        setEvidenceUrl('');
        setEvidenceName('');
        setEvidenceType('link');
        setEvidenceNote('');
        setFilePreviewName('');
        setResultStatus('good');
        setSelectedDeductionRuleId('');
        setAdjustmentReason('');
        setCustomDeductionScore(0);
      }
      setTeacherSearch('');
      setKpiSearch('');
      setIsTeacherDropdownOpen(false);
      setIsKpiDropdownOpen(false);
    }
  }, [isOpen, editingRecord, initialTeacherId, initialKpiId, initialMonth, initialAcademicYear]);

  // Auto-select first deduction rule when KPI changes
  useEffect(() => {
    if (selectedKpi && selectedKpi.deductionRules && selectedKpi.deductionRules.length > 0) {
      setSelectedDeductionRuleId(prev => {
        const hasRule = selectedKpi.deductionRules?.some(r => r.id === prev);
        if (hasRule) return prev;
        return selectedKpi.deductionRules?.[0]?.id || '';
      });
    } else {
      setSelectedDeductionRuleId('');
    }
  }, [selectedKpi]);

  // Synchronize custom deduction score when selected KPI or rule changes
  useEffect(() => {
    if (editingRecord && editingRecord.kpiId === selectedKpiId) {
      return;
    }
    if (selectedDeductionRule) {
      setCustomDeductionScore(selectedDeductionRule.deductionScore);
    } else if (selectedKpi) {
      setCustomDeductionScore(Math.abs(selectedKpi.pointValue || 1));
    } else {
      setCustomDeductionScore(0);
    }
  }, [selectedDeductionRule, selectedKpi, selectedKpiId, editingRecord]);

  // Handle local file upload (simulate or convert to base64 / data URL for evidence)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Tệp đính kèm không được vượt quá 5MB');
      return;
    }

    setFilePreviewName(file.name);
    setEvidenceName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      setEvidenceType('image');
    } else if (ext === 'pdf') {
      setEvidenceType('pdf');
    } else if (['doc', 'docx'].includes(ext)) {
      setEvidenceType('word');
    } else if (['xls', 'xlsx'].includes(ext)) {
      setEvidenceType('excel');
    } else {
      setEvidenceType('document');
    }

    // Read as Data URL
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTeacherId) {
      setErrorMsg('Vui lòng chọn CBGVNV được ghi nhận.');
      return;
    }
    if (!selectedKpiId || !selectedKpi) {
      setErrorMsg('Vui lòng chọn tiêu chí KPI từ danh mục.');
      return;
    }
    if (!date) {
      setErrorMsg('Vui lòng chọn ngày ghi nhận.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Số lượng phải lớn hơn 0.');
      return;
    }

    if (editingRecord && editingRecord.status === 'confirmed' && !adjustmentReason.trim() && isBghOrAdmin) {
      setErrorMsg('Bản ghi đã xác nhận. Vui lòng nhập lý do điều chỉnh để lưu lịch sử.');
      return;
    }

    setIsSubmitting(true);

    try {
      const monthStr = date.substring(5, 7); // e.g. "09"
      const nowIso = new Date().toISOString();
      const currentUserName = user?.name || (isBghOrAdmin ? 'Ban Giám Hiệu' : 'Tổ trưởng chuyên môn');

      // Resolve Task Title if linked
      const matchedTask = tasks.find(t => t.id === taskId);

      // Resolve Group & General KPI dynamically
      const groupObj = resolveKpiGroup(selectedKpi, kpiGroups, kpis);
      const dynamicGroupId = groupObj ? groupObj.id : (selectedKpi.groupId || '');
      const dynamicGroupName = groupObj ? groupObj.name : resolveKpiGroupName(selectedKpi, kpiGroups, kpis);
      const dynamicGeneralKpiId = selectedKpi.generalKpiId || groupObj?.generalKpiId || (generalKpis[0]?.id || '');

      if (editingRecord) {
        // Check if editing confirmed record
        const isPreviouslyConfirmed = editingRecord.status === 'confirmed';

        // Prepare History entry
        const historyEntry = {
          action: isPreviouslyConfirmed ? 'update_confirmed' : 'update',
          performedBy: currentUserName,
          timestamp: nowIso,
          details: adjustmentReason.trim() || `Cập nhật thông tin KPI: ${selectedKpi.name} (${calculatedPoints.total > 0 ? '+' : ''}${calculatedPoints.total} điểm)`,
          previousData: {
            kpiCode: editingRecord.kpiCode,
            quantity: editingRecord.quantity,
            totalPoints: editingRecord.totalPoints,
            status: editingRecord.status,
            date: editingRecord.date
          },
          newData: {
            kpiCode: selectedKpi.code,
            quantity: Number(quantity),
            totalPoints: calculatedPoints.total,
            status: editingRecord.status,
            date
          }
        };

        const isPlusKpi = selectedKpi.pointType === 'plus';
        const standardScoreSnapshot = selectedKpi.standardScore || selectedKpi.pointValue || 10;
        const isViolation = resultStatus === 'violation';
        const deductionRuleId = isViolation ? (selectedDeductionRule?.id || '') : undefined;
        const deductionScoreSnapshot = isViolation ? customDeductionScore : 0;
        const totalDd = isViolation ? customDeductionScore * (Math.max(1, Number(quantity) || 1)) : 0;
        const actualScore = isPlusKpi ? standardScoreSnapshot : Math.max(0, standardScoreSnapshot - totalDd);
        
        let unitPt = 0;
        let totalPt = 0;
        if (isViolation) {
          unitPt = -customDeductionScore;
          totalPt = -totalDd;
        } else if (isPlusKpi) {
          unitPt = selectedKpi.pointValue || 0;
          totalPt = (selectedKpi.pointValue || 0) * (Math.max(1, Number(quantity) || 1));
        }

        const deductionRuleNameSnapshot = isViolation 
          ? (selectedDeductionRule?.name || 'Có vi phạm') 
          : (isPlusKpi ? 'Cộng điểm / Thưởng' : 'Thực hiện tốt / Không vi phạm');
        const qty = Number(quantity);

        const updatedData: Partial<KpiRecord> = {
          teacherId: selectedTeacherId,
          teacherName: selectedTeacher?.name || editingRecord.teacherName,
          teacherCode: selectedTeacher?.code || editingRecord.teacherCode,
          departmentId: selectedTeacher?.departmentId || editingRecord.departmentId,
          departmentName: selectedTeacher?.departmentName || editingRecord.departmentName,
          kpiId: selectedKpi.id,
          kpiCode: selectedKpi.code,
          kpiName: selectedKpi.name,
          generalKpiId: dynamicGeneralKpiId,
          groupId: dynamicGroupId,
          group: dynamicGroupName,
          pointType: selectedKpi.pointType,
          pointValue: standardScoreSnapshot,
          standardScoreSnapshot,
          resultStatus: isPlusKpi ? 'good' : resultStatus,
          actualScore,
          deductionRuleId,
          deductionRuleNameSnapshot,
          deductionScoreSnapshot,
          totalDeduction: totalDd,
          points: unitPt,
          unit: selectedKpi.unit || 'lần',
          quantity: qty,
          totalPoints: totalPt,
          date,
          month: monthStr,
          academicYear,
          taskId: taskId || undefined,
          taskTitle: matchedTask ? matchedTask.title : undefined,
          note: note.trim(),
          evidenceUrl: evidenceUrl.trim() || undefined,
          evidenceName: evidenceName.trim() || filePreviewName || undefined,
          evidenceType: evidenceType || undefined,
          evidenceNote: evidenceNote.trim() || undefined,
          history: [...(editingRecord.history || []), historyEntry],
          updatedAt: nowIso
        };

        await updateKpiRecord(editingRecord.id, updatedData);
        if (onSuccess) onSuccess(`Đã cập nhật phát sinh KPI cho thầy/cô ${selectedTeacher?.name}.`);
      } else {
        // Create new record
        const newRecordId = `kpir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const recordStatus = initialStatus;

        const isPlusKpi = selectedKpi.pointType === 'plus';
        const standardScoreSnapshot = selectedKpi.standardScore || selectedKpi.pointValue || 10;
        const isViolation = resultStatus === 'violation';
        const deductionRuleId = isViolation ? (selectedDeductionRule?.id || '') : undefined;
        const deductionScoreSnapshot = isViolation ? customDeductionScore : 0;
        const totalDd = isViolation ? customDeductionScore * (Math.max(1, Number(quantity) || 1)) : 0;
        const actualScore = isPlusKpi ? standardScoreSnapshot : Math.max(0, standardScoreSnapshot - totalDd);
        
        let unitPt = 0;
        let totalPt = 0;
        if (isViolation) {
          unitPt = -customDeductionScore;
          totalPt = -totalDd;
        } else if (isPlusKpi) {
          unitPt = selectedKpi.pointValue || 0;
          totalPt = (selectedKpi.pointValue || 0) * (Math.max(1, Number(quantity) || 1));
        }

        const deductionRuleNameSnapshot = isViolation 
          ? (selectedDeductionRule?.name || 'Có vi phạm') 
          : (isPlusKpi ? 'Cộng điểm / Thưởng' : 'Thực hiện tốt / Không vi phạm');
        const qty = Number(quantity);

        const newRecord: KpiRecord = {
          id: newRecordId,
          teacherId: selectedTeacherId,
          teacherName: selectedTeacher?.name || 'CBGVNV',
          teacherCode: selectedTeacher?.code || '',
          departmentId: selectedTeacher?.departmentId || '',
          departmentName: selectedTeacher?.departmentName || '',
          kpiId: selectedKpi.id,
          kpiCode: selectedKpi.code,
          kpiName: selectedKpi.name,
          generalKpiId: dynamicGeneralKpiId,
          groupId: dynamicGroupId,
          group: dynamicGroupName,
          pointType: selectedKpi.pointType,
          pointValue: standardScoreSnapshot,
          standardScoreSnapshot,
          resultStatus: isPlusKpi ? 'good' : resultStatus,
          actualScore,
          deductionRuleId,
          deductionRuleNameSnapshot,
          deductionScoreSnapshot,
          totalDeduction: totalDd,
          points: unitPt,
          unit: selectedKpi.unit || 'lần',
          quantity: qty,
          totalPoints: totalPt,
          date,
          month: monthStr,
          academicYear,
          assignedBy: currentUserName,
          taskId: taskId || undefined,
          taskTitle: matchedTask ? matchedTask.title : undefined,
          note: note.trim(),
          evidenceUrl: evidenceUrl.trim() || undefined,
          evidenceName: evidenceName.trim() || filePreviewName || undefined,
          evidenceType: evidenceType || undefined,
          evidenceNote: evidenceNote.trim() || undefined,
          status: recordStatus,
          confirmedBy: recordStatus === 'confirmed' ? currentUserName : undefined,
          confirmedDate: recordStatus === 'confirmed' ? nowIso : undefined,
          history: [
            {
              action: 'create',
              performedBy: currentUserName,
              timestamp: nowIso,
              details: `Tạo mới ghi nhận KPI (${recordStatus === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}): ${selectedKpi.name}, kết quả: ${resultStatus === 'good' ? 'Thực hiện tốt' : `Vi phạm (-${totalDd}đ)`}`
            }
          ],
          createdAt: nowIso,
          updatedAt: nowIso
        };

        await addKpiRecord(newRecord);
        if (onSuccess) onSuccess(`Đã ghi nhận KPI cho thầy/cô ${selectedTeacher?.name} (${calculatedPoints.total > 0 ? '+' : ''}${calculatedPoints.total} điểm).`);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể lưu bản ghi KPI. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {editingRecord ? 'Cập nhật / Điều chỉnh ghi nhận KPI' : 'Ghi nhận KPI CBGVNV'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Hệ thống Quản lý Giáo viên THPT Minh Hòa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Teacher Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              CBGVNV được ghi nhận *
            </label>
            
            <div className="relative">
              <div 
                onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
              >
                {selectedTeacher ? (
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={selectedTeacher.avatar} 
                      alt={selectedTeacher.name} 
                      size="sm" 
                      name={selectedTeacher.name} 
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {selectedTeacher.name}
                        {selectedTeacher.code && (
                          <span className="text-[11px] font-normal px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                            Mã GV: {selectedTeacher.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedTeacher.departmentName || 'Chưa phân tổ'} • {selectedTeacher.position || 'Giáo viên'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Chọn CBGVNV...</span>
                )}
                <span className="text-xs text-slate-400 font-medium">Thay đổi ▼</span>
              </div>

              {/* Teacher Dropdown */}
              {isTeacherDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1.5 border overflow-hidden max-h-60 flex flex-col animate-in fade-in duration-150 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <input
                      type="text"
                      placeholder="🔍 Gõ tên hoặc mã GV..."
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 p-1">
                    {filteredTeachers.map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTeacherId(t.id);
                          setIsTeacherDropdownOpen(false);
                          setTeacherSearch('');
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors",
                          selectedTeacherId === t.id ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Avatar src={t.avatar} alt={t.name} size="sm" name={t.name} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{t.name} (Mã: {t.code || t.id})</div>
                          <div className="text-[11px] text-slate-400">{t.departmentName} • {t.position}</div>
                        </div>
                      </div>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Không tìm thấy giáo viên phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Date & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày ghi nhận *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Năm học *
              </label>
              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              >
                <option value="2024-2025">Năm học 2024 - 2025</option>
                <option value="2025-2026">Năm học 2025 - 2026</option>
                <option value="2026-2027">Năm học 2026 - 2027</option>
                <option value="2027-2028">Năm học 2027 - 2028</option>
              </select>
            </div>
          </div>

          {/* Section 3: KPI Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tiêu chí KPI (Lấy từ Danh mục KPI) *
            </label>

            <div className="relative">
              <div
                onClick={() => setIsKpiDropdownOpen(!isKpiDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
              >
                {selectedKpi ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                        {selectedKpi.code}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {selectedKpi.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Nhóm: <span className="font-medium text-slate-700">{resolveKpiGroupName(selectedKpi, kpiGroups, kpis)}</span> • Điểm định mức:{' '}
                      <span className={cn(
                        "font-bold",
                        selectedKpi.pointType === 'plus' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {selectedKpi.pointType === 'plus' ? '+' : '-'}{Math.abs(selectedKpi.pointValue)} điểm/{selectedKpi.unit || 'lần'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Chọn tiêu chí KPI...</span>
                )}
                <span className="text-xs text-slate-400 font-medium ml-2">Chọn ▼</span>
              </div>

              {/* KPI Dropdown */}
              {isKpiDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1.5 border overflow-hidden max-h-80 flex flex-col animate-in fade-in duration-150 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 space-y-1.5">
                    <input
                      type="text"
                      placeholder="🔍 Tìm tiêu chí KPI theo mã hoặc tên..."
                      value={kpiSearch}
                      onChange={e => setKpiSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={filterGeneralKpiId}
                        onChange={e => setFilterGeneralKpiId(e.target.value)}
                        className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700"
                      >
                        <option value="all">Tất cả KPI chung</option>
                        {generalKpis.map(gk => (
                          <option key={gk.id} value={gk.id}>Cấp 1: {gk.name}</option>
                        ))}
                      </select>
                      <select
                        value={filterGroupId}
                        onChange={e => setFilterGroupId(e.target.value)}
                        className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700"
                      >
                        <option value="all">Tất cả nhóm KPI</option>
                        {kpiGroups.map(g => (
                          <option key={g.id} value={g.id}>Cấp 2: {g.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1">
                    {filteredKpis.map(k => {
                      const groupObj = resolveKpiGroup(k, kpiGroups, kpis);
                      const genObj = generalKpis.find(gk => gk.id === (k.generalKpiId || groupObj?.generalKpiId));
                      return (
                        <div
                          key={k.id}
                          onClick={() => {
                            setSelectedKpiId(k.id);
                            setIsKpiDropdownOpen(false);
                            setKpiSearch('');
                          }}
                          className={cn(
                            "p-2.5 rounded-lg cursor-pointer text-xs transition-colors border-b border-slate-50 last:border-0",
                            selectedKpiId === k.id ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-800"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold px-1.5 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700">
                                {k.code}
                              </span>
                              <span className="font-semibold text-slate-900">{k.name}</span>
                            </div>
                            <span className={cn(
                              "font-bold px-2 py-0.5 rounded-full text-[11px]",
                              k.pointType === 'plus' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            )}>
                              {k.standardScore || k.pointValue || 10} đ/{k.unit || 'lần'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                            <span className="truncate">
                              {genObj ? `${genObj.name} › ` : ''}{groupObj ? groupObj.name : (k.group || 'Khác')}
                            </span>
                            <span className="shrink-0 ml-2">Áp dụng: {k.targetAudience}</span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredKpis.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Không tìm thấy tiêu chí KPI phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Auto-filled KPI details display card & Result Status */}
          {selectedKpi && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Thông tin tiêu chí (Tự động trích xuất từ Danh mục KPI)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Cấp 1 - KPI Chung:</span>
                    <span className="font-semibold text-slate-800 truncate block" title={generalKpis.find(gk => gk.id === (selectedKpi.generalKpiId || resolveKpiGroup(selectedKpi, kpiGroups, kpis)?.generalKpiId))?.name || 'KPI Năm học'}>
                      {generalKpis.find(gk => gk.id === (selectedKpi.generalKpiId || resolveKpiGroup(selectedKpi, kpiGroups, kpis)?.generalKpiId))?.name || 'KPI Năm học'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Cấp 2 - Nhóm KPI:</span>
                    <span className="font-semibold text-slate-800 truncate block">{resolveKpiGroupName(selectedKpi, kpiGroups, kpis)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Cấp 3 - Điểm chuẩn:</span>
                    <span className="font-bold text-blue-600">
                      {selectedKpi.standardScore || selectedKpi.pointValue || 10} đ
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Điểm trừ vi phạm:</span>
                    <span className="font-bold text-rose-600">
                      {selectedKpi.deductionRules && selectedKpi.deductionRules.length > 0 ? `${selectedKpi.deductionRules.length} mức` : 'Không'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Đơn vị tính:</span>
                    <span className="font-semibold text-slate-800">{selectedKpi.unit || 'lần'}</span>
                  </div>
                </div>
              </div>

              {/* Evaluation Result Status Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  KẾT QUẢ THỰC HIỆN *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                    resultStatus === 'good' ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="resultStatus"
                      value="good"
                      checked={resultStatus === 'good'}
                      onChange={() => setResultStatus('good')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold">🟢 Thực hiện tốt / Không vi phạm</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {isPlusKpi ? `Nhận điểm thưởng (+${selectedKpi.pointValue || 0} điểm)` : "Đạt điểm chuẩn (0 điểm trừ)"}
                      </div>
                    </div>
                  </label>

                  <label className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                    resultStatus === 'violation' ? "bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="resultStatus"
                      value="violation"
                      checked={resultStatus === 'violation'}
                      onChange={() => setResultStatus('violation')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold">🔴 Có vi phạm</div>
                      <div className="text-[11px] font-normal text-slate-500">Bị trừ điểm / áp dụng điểm trừ</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* If Good Result */}
              {resultStatus === 'good' && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span>Điểm chuẩn: {selectedKpi.standardScore || selectedKpi.pointValue || 10} điểm</span>
                    {isPlusKpi ? (
                      <span className="text-emerald-700 font-extrabold">Điểm thưởng cộng thêm: +{(selectedKpi.pointValue || 0) * quantity} điểm</span>
                    ) : (
                      <span>Điểm trừ: 0 điểm</span>
                    )}
                  </div>
                  
                  {/* Quantity selector for Good Result when it is a Plus KPI */}
                  {isPlusKpi && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-100">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                          SỐ LẦN / SỐ LƯỢNG ĐẠT ĐƯỢC *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={quantity}
                            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            required
                            className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-center"
                          />
                          <span className="text-xs text-emerald-600 font-medium px-2 py-1.5 bg-emerald-100 rounded-lg">
                            {selectedKpi?.unit || 'lần'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="text-[11px] text-emerald-700">
                          Thành điểm cộng: <span className="font-bold text-emerald-800 text-sm">+{(selectedKpi.pointValue || 0) * quantity} điểm</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-sm font-black text-emerald-800 pt-1.5 border-t border-emerald-200 flex items-center justify-between">
                    <span>ĐIỂM THỰC TẾ:</span>
                    <span>
                      {isPlusKpi 
                        ? `+${(selectedKpi.pointValue || 0) * quantity} điểm thưởng`
                        : `${selectedKpi.standardScore || selectedKpi.pointValue || 10} / ${selectedKpi.standardScore || selectedKpi.pointValue || 10} điểm (Đạt tối đa)`
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* If Violation Result */}
              {resultStatus === 'violation' && (
                <div className="space-y-3.5 p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
                  {/* Section 4b: Deduction Rule Selector */}
                  {selectedKpi.deductionRules && selectedKpi.deductionRules.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        MỨC VI PHẠM THEO QUY ĐỊNH *
                      </label>
                      <select
                        value={selectedDeductionRuleId}
                        onChange={e => {
                          setSelectedDeductionRuleId(e.target.value);
                          const rule = selectedKpi.deductionRules?.find(r => r.id === e.target.value);
                          if (rule) setCustomDeductionScore(rule.deductionScore);
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
                      >
                        <option value="">-- Chọn mức vi phạm quy định --</option>
                        {selectedKpi.deductionRules.map(rule => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name} (-{rule.deductionScore} điểm/{rule.unit || selectedKpi.unit || 'lần'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* CUSTOM DEDUCTION SCORE INPUT FEATURE (The requested feature to enter/add penalty points manually) */}
                  <div>
                    <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      SỐ ĐIỂM TRỪ / MỘT LẦN VI PHẠM *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customDeductionScore}
                        onChange={e => setCustomDeductionScore(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full max-w-[200px] px-3.5 py-2 text-sm bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-rose-700"
                        placeholder="Nhập số điểm trừ..."
                      />
                      <span className="text-xs text-rose-700 font-semibold bg-rose-100 px-3 py-2 rounded-xl">
                        điểm trừ / {selectedKpi?.unit || 'lần'}
                      </span>
                    </div>
                  </div>

                  {/* Section 5: Quantity & Dynamic Total Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-rose-200/50">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        SỐ LẦN / SỐ LƯỢNG VI PHẠM *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantity}
                          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                          className="w-full px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-center bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
                        />
                        <span className="text-xs text-slate-500 font-medium px-2.5 py-2 bg-slate-100 rounded-xl">
                          {selectedKpi?.unit || 'lần'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        ĐIỂM THỰC TẾ (TỰ ĐỘNG TÍNH)
                      </label>
                      <div className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border bg-rose-50 text-rose-800 border-rose-200 flex items-center justify-between">
                        <span>Điểm chuẩn ({selectedKpi.standardScore || selectedKpi.pointValue || 10}) - Trừ ({totalDeduction}):</span>
                        <span className="text-sm font-extrabold text-rose-700">
                          {isPlusKpi 
                            ? `-${totalDeduction} điểm`
                            : `${Math.max(0, (selectedKpi.standardScore || selectedKpi.pointValue || 10) - totalDeduction)} / ${selectedKpi.standardScore || selectedKpi.pointValue || 10} điểm`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 6: Optional Task Association */}
          {teacherTasks.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Liên kết công việc (Tùy chọn)
              </label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              >
                <option value="">-- Không liên kết công việc --</option>
                {teacherTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section 7: Evidence Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Minh chứng (Ảnh / File PDF / Word / Excel / Biên bản / Link)</span>
              <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
            </label>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* File Upload Input */}
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-blue-400 transition-colors text-xs text-slate-600 font-medium">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="truncate">{filePreviewName ? `Đã chọn: ${filePreviewName}` : 'Tải lên tệp minh chứng'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Link Input */}
                <div className="relative">
                  <input
                    type="url"
                    placeholder="Hoặc dán liên kết minh chứng..."
                    value={evidenceUrl.startsWith('data:') ? '' : evidenceUrl}
                    onChange={e => {
                      setEvidenceUrl(e.target.value);
                      if (e.target.value) setEvidenceType('link');
                    }}
                    className="w-full px-3 py-2 text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
                  />
                </div>
              </div>

              {/* Evidence Note */}
              <input
                type="text"
                placeholder="Ghi chú minh chứng (ví dụ: Số biên bản, quyết định khen thưởng...)"
                value={evidenceNote}
                onChange={e => setEvidenceNote(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              />
            </div>
          </div>

          {/* Section 8: General Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú / Diễn giải nội dung phát sinh
            </label>
            <textarea
              rows={2}
              placeholder="Nhập ghi chú chi tiết về sự việc hoặc nhiệm vụ..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
            />
          </div>

          {/* Section 9: Initial Status (for BGH) */}
          {!editingRecord && isBghOrAdmin && (
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Trạng thái ghi nhận</span>
                <span className="text-[11px] text-blue-600">Ban Giám Hiệu có thể duyệt ngay để tính điểm</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="initialStatus"
                    value="pending"
                    checked={initialStatus === 'pending'}
                    onChange={() => setInitialStatus('pending')}
                    className="text-blue-600"
                  />
                  Chờ xác nhận
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 cursor-pointer ml-2">
                  <input
                    type="radio"
                    name="initialStatus"
                    value="confirmed"
                    checked={initialStatus === 'confirmed'}
                    onChange={() => setInitialStatus('confirmed')}
                    className="text-emerald-600"
                  />
                  Xác nhận luôn
                </label>
              </div>
            </div>
          )}

          {/* Section 10: Adjustment Reason if Editing Confirmed Record */}
          {editingRecord && editingRecord.status === 'confirmed' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                Lý do điều chỉnh (Bắt buộc để lưu Audit Log) *
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đính chính số lần theo biên bản họp giao ban..."
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Footer Info: Recorded By */}
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Người ghi nhận: <strong className="text-slate-700">{user?.name || 'Ban Giám Hiệu'}</strong></span>
            <span>Quyền hạn: <strong className="text-blue-600">{user?.role || 'BGH'}</strong></span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingRecord ? 'Cập nhật ghi nhận' : 'Lưu ghi nhận KPI'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
