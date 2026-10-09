import React, { useState, useMemo, useEffect } from 'react';
import { WorkAssignment, TaskEvaluation, ExecutionResult } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { 
  X, CheckCircle, Save, ChevronDown, ChevronUp, User, Users, Check, 
  AlertTriangle, Clock, Search, CheckSquare, Square, CheckCheck, Filter,
  Award, Shield, Briefcase, GraduationCap, Building2, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  KpiTargetGroup, 
  KPI_TARGET_GROUPS, 
  resolveTeacherTargetGroup, 
  matchKpiToTargetGroup, 
  getKpiTargetGroupInfo, 
  DEFAULT_TASK_KPIS 
} from '../../lib/kpiTargetAudienceUtils';

interface TaskEvaluationModalProps {
  assignment: WorkAssignment;
  initialAssigneeId?: string;
  onClose: () => void;
  onSave: (assignmentId: string, updates: Partial<WorkAssignment>) => void;
}

const PRESET_DEPT_TOKENS = [
  { groupToken: 'GROUP_TOAN_CONG_NGHE', deptId: 'd_toan_cong_nghe', subjects: ['toán', 'công nghệ'] },
  { groupToken: 'GROUP_VAN_SU_DIA_GDKT', deptId: 'd_van_su_dia_gdkt', subjects: ['văn', 'sử', 'địa', 'gdkt', 'âm nhạc', 'mĩ thuật', 'mỹ thuật'] },
  { groupToken: 'GROUP_LY_HOA_SINH', deptId: 'd_ly_hoa_sinh', subjects: ['vật lý', 'vật lí', 'hóa', 'sinh'] },
  { groupToken: 'GROUP_NGOAI_NGU_TIN_HOC_GDTC_GDQPAN', deptId: 'd_ngoai_ngu_tin_hoc_gdtc_gdqpan', subjects: ['tiếng anh', 'ngoại ngữ', 'tin học', 'tin', 'thể dục', 'gdtc', 'gdqp', 'qpan'] },
  { groupToken: 'GROUP_VAN_PHONG', deptId: 'd_van_phong', subjects: ['văn thư', 'kế toán', 'thủ quỹ', 'y tế', 'thiết bị', 'thư viện', 'hành chính'] },
  // Backward compatibility tokens
  { groupToken: 'GROUP_TOAN_LY_TIN_CN', deptId: 'd_toan_cong_nghe', subjects: ['toán', 'công nghệ'] },
  { groupToken: 'GROUP_HOA_LY_SINH_GDQPAN_NN', deptId: 'd_ly_hoa_sinh', subjects: ['hóa', 'sinh'] },
  { groupToken: 'GROUP_VAN_SU_DIA_GDKT_PL_AN', deptId: 'd_van_su_dia_gdkt', subjects: ['văn', 'sử', 'địa', 'gdkt'] },
];

export default function TaskEvaluationModal({ assignment, initialAssigneeId, onClose, onSave }: TaskEvaluationModalProps) {
  const { teachers, evaluationCategories, evaluationCriteria, kpiGroups, kpis, addKpiRecord } = useAppContext();
  const { user } = useAuth();
  
  // Resolve actual assignees for this task
  const assigneeIds = assignment.assigneeIds && assignment.assigneeIds.length > 0 
    ? assignment.assigneeIds 
    : (assignment.assigneeId ? [assignment.assigneeId] : []);
    
  let actualAssignees = teachers.filter(t => {
    if (assigneeIds.includes('GROUP_ALL')) return true;
    if (assigneeIds.includes('GROUP_GVCN') && (t.isHomeroom || (t.position || '').toLowerCase().includes('gvcn') || (t.position || '').toLowerCase().includes('chủ nhiệm'))) return true;
    
    if (assignment.departmentId && assignment.departmentId !== 'global' && assignment.departmentId !== 'all') {
      if (t.departmentId === assignment.departmentId) return true;
    }

    for (const group of PRESET_DEPT_TOKENS) {
      if (assigneeIds.includes(group.groupToken) || assigneeIds.includes(group.deptId)) {
        if (t.departmentId === group.deptId) return true;
        const sub = (t.subject || '').toLowerCase();
        if (group.subjects.some(s => sub.includes(s))) return true;
      }
    }
    return assigneeIds.includes(t.id);
  });

  if (actualAssignees.length === 0) {
    if (assignment.assigneeId) {
      const single = teachers.find(t => t.id === assignment.assigneeId);
      if (single) actualAssignees = [single];
    }
    if (actualAssignees.length === 0 && assignment.departmentId && assignment.departmentId !== 'global') {
      actualAssignees = teachers.filter(t => t.departmentId === assignment.departmentId);
    }
    if (actualAssignees.length === 0) {
      actualAssignees = teachers;
    }
  }

  // Danh sách các ID giáo viên được tick chọn qua hộp kiểm (Checkbox)
  const [checkedAssigneeIds, setCheckedAssigneeIds] = useState<string[]>(() => {
    if (initialAssigneeId && actualAssignees.some(t => t.id === initialAssigneeId)) {
      return [initialAssigneeId];
    }
    // Bỏ chọn mặc định để người dùng / GV tự tích chọn qua hộp kiểm
    return [];
  });

  // Giáo viên đang được xem chi tiết (để nhập ghi chú riêng hoặc chấm điểm KPI)
  const [focusedAssigneeId, setFocusedAssigneeId] = useState<string>(() => {
    if (initialAssigneeId && actualAssignees.some(t => t.id === initialAssigneeId)) {
      return initialAssigneeId;
    }
    return actualAssignees.length > 0 ? actualAssignees[0].id : '';
  });

  // Tìm kiếm và bộ lọc danh sách giáo viên
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unrated' | 'good' | 'overdue'>('all');

  // Thông báo phản hồi thao tác nhanh
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Per-assignee results map: only contains explicit results ('Hoàn thành tốt' | 'Quá hạn (Chậm muộn)')
  const [assigneeResultsMap, setAssigneeResultsMap] = useState<Record<string, ExecutionResult>>(() => {
    const initialMap: Record<string, ExecutionResult> = {};
    if (assignment.assigneeResults) {
      Object.entries(assignment.assigneeResults).forEach(([tId, res]) => {
        if (res === 'Hoàn thành tốt' || res === 'Quá hạn (Chậm muộn)') {
          initialMap[tId] = res;
        }
      });
    }
    return initialMap;
  });

  // Local state for all evaluations
  const [evaluations, setEvaluations] = useState<Record<string, TaskEvaluation>>(assignment.evaluations || {});
  
  const [recordToKpi, setRecordToKpi] = useState<boolean>(false);
  const [kpiData, setKpiData] = useState({
    groupId: '',
    kpiId: '',
    pointType: 'plus' as 'plus'|'minus',
    points: 1,
    reason: ''
  });

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    criteria: false,
    kpi: false,
    notes: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Lọc danh sách giáo viên theo tìm kiếm và trạng thái đánh giá
  const filteredAssignees = useMemo(() => {
    return actualAssignees.filter(t => {
      // 1. Tìm kiếm theo tên, tổ bộ môn, môn dạy
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (t.name || '').toLowerCase().includes(q);
        const matchSubject = (t.subject || '').toLowerCase().includes(q);
        const matchPosition = (t.position || '').toLowerCase().includes(q);
        if (!matchName && !matchSubject && !matchPosition) return false;
      }

      // 2. Lọc theo trạng thái
      const res = assigneeResultsMap[t.id];
      if (statusFilter === 'unrated') return !res;
      if (statusFilter === 'good') return res === 'Hoàn thành tốt';
      if (statusFilter === 'overdue') return res === 'Quá hạn (Chậm muộn)';
      return true;
    });
  }, [actualAssignees, searchQuery, statusFilter, assigneeResultsMap]);

  // Thống kê nhanh
  const countTotal = actualAssignees.length;
  const countGood = useMemo(() => actualAssignees.filter(t => assigneeResultsMap[t.id] === 'Hoàn thành tốt').length, [actualAssignees, assigneeResultsMap]);
  const countOverdue = useMemo(() => actualAssignees.filter(t => assigneeResultsMap[t.id] === 'Quá hạn (Chậm muộn)').length, [actualAssignees, assigneeResultsMap]);
  const countUnrated = countTotal - (countGood + countOverdue);

  // Trạng thái chọn tất cả theo danh sách đang hiển thị
  const isAllFilteredChecked = filteredAssignees.length > 0 && filteredAssignees.every(t => checkedAssigneeIds.includes(t.id));
  const isSomeFilteredChecked = filteredAssignees.some(t => checkedAssigneeIds.includes(t.id)) && !isAllFilteredChecked;

  // Xử lý tick / bỏ tick 1 giáo viên
  const handleToggleCheck = (tId: string) => {
    setCheckedAssigneeIds(prev => 
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    );
    setFocusedAssigneeId(tId);
  };

  // Xử lý Chọn tất cả / Bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (isAllFilteredChecked) {
      // Bỏ chọn những người đang hiển thị trong bộ lọc
      const currentFilteredIds = new Set(filteredAssignees.map(t => t.id));
      setCheckedAssigneeIds(prev => prev.filter(id => !currentFilteredIds.has(id)));
    } else {
      // Chọn thêm tất cả những người đang hiển thị
      const currentFilteredIds = filteredAssignees.map(t => t.id);
      setCheckedAssigneeIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  // Chọn nhanh những người chưa đánh giá
  const handleSelectAllUnrated = () => {
    const unratedIds = actualAssignees
      .filter(t => !assigneeResultsMap[t.id])
      .map(t => t.id);
    setCheckedAssigneeIds(unratedIds);
    if (unratedIds.length > 0) {
      setFocusedAssigneeId(unratedIds[0]);
    }
    setToastMessage(`Đã chọn ${unratedIds.length} CBGVNV chưa đánh giá`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Bỏ chọn toàn bộ
  const handleDeselectAll = () => {
    setCheckedAssigneeIds([]);
  };

  // ÁP DỤNG KẾT QUẢ CHO TẤT CẢ CÁC GIÁO VIÊN ĐANG ĐƯỢC TICK CHỌN
  const handleApplyResultToChecked = (result: ExecutionResult) => {
    if (checkedAssigneeIds.length === 0) {
      alert('Vui lòng tích vào hộp kiểm ít nhất 01 CBGVNV để áp dụng kết quả đánh giá.');
      return;
    }

    const updatedResultsMap = { ...assigneeResultsMap };
    const updatedEvaluations = { ...evaluations };

    checkedAssigneeIds.forEach(tId => {
      updatedResultsMap[tId] = result;
      const prevEval = updatedEvaluations[tId] || {
        result,
        actualCompletionDate: new Date().toISOString(),
        comment: '',
        noiQuyResult: '',
        noiQuyComment: '',
        quyCheChuyenMonResult: '',
        quyCheChuyenMonComment: '',
        vanHoaCongSoResult: '',
        vanHoaCongSoComment: '',
        thongTinBaoCaoResult: '',
        thongTinBaoCaoComment: '',
        evaluatorId: user?.id || assignment.evaluatorId || 'system',
        evaluatedAt: new Date().toISOString()
      };

      updatedEvaluations[tId] = {
        ...prevEval,
        result,
        evaluatorId: user?.id || assignment.evaluatorId || 'system',
        evaluatedAt: new Date().toISOString()
      };
    });

    setAssigneeResultsMap(updatedResultsMap);
    setEvaluations(updatedEvaluations);

    setToastMessage(`Đã áp dụng kết quả "${result}" cho ${checkedAssigneeIds.length} CBGVNV được chọn!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Giáo viên đang được xem chi tiết
  const focusedTeacher = actualAssignees.find(t => t.id === focusedAssigneeId) || teachers.find(t => t.id === focusedAssigneeId);
  const focusedAssigneeResult = assigneeResultsMap[focusedAssigneeId];

  // Nhóm đối tượng KPI được chọn: 'all' | 'CNQL' | 'TTCM_TPCM_TTVP' | 'GIAO_VIEN' | 'NHAN_VIEN'
  const [kpiTargetGroupFilter, setKpiTargetGroupFilter] = useState<KpiTargetGroup | 'all'>('all');
  // Tùy chọn ghi nhận KPI cho tất cả CBGVNV đang được tick chọn
  const [applyKpiToAllChecked, setApplyKpiToAllChecked] = useState<boolean>(false);

  // Tự động nhận diện nhóm đối tượng của giáo viên đang được xem chi tiết
  const focusedTeacherTargetGroup = useMemo(() => {
    return resolveTeacherTargetGroup(focusedTeacher);
  }, [focusedTeacher]);

  // Đồng bộ tab đối tượng khi chọn giáo viên khác
  useEffect(() => {
    if (focusedTeacher) {
      const autoGroup = resolveTeacherTargetGroup(focusedTeacher);
      setKpiTargetGroupFilter(autoGroup);
    }
  }, [focusedAssigneeId, focusedTeacher]);

  // Danh sách tiêu chí KPI có thể chọn dựa trên nhóm đối tượng và nhóm KPI
  const availableTargetKpis = useMemo(() => {
    return kpis.filter(k => {
      if (k.status === 'inactive') return false;
      if (kpiTargetGroupFilter !== 'all' && !matchKpiToTargetGroup(k.targetAudiences || k.targetAudience, kpiTargetGroupFilter)) {
        return false;
      }
      if (kpiData.groupId && k.groupId !== kpiData.groupId) {
        return false;
      }
      return true;
    });
  }, [kpis, kpiTargetGroupFilter, kpiData.groupId]);

  // Tiêu chí công việc gợi ý nhanh theo nhóm đối tượng
  const suggestedTaskKpis = useMemo(() => {
    const targetGroup = kpiTargetGroupFilter === 'all' ? focusedTeacherTargetGroup : kpiTargetGroupFilter;
    return DEFAULT_TASK_KPIS.filter(tk => tk.targetGroup === targetGroup);
  }, [kpiTargetGroupFilter, focusedTeacherTargetGroup]);

  const currentEval: TaskEvaluation = evaluations[focusedAssigneeId] || {
    result: (focusedAssigneeResult || '') as any,
    actualCompletionDate: new Date().toISOString(),
    comment: '',
    noiQuyResult: '',
    noiQuyComment: '',
    quyCheChuyenMonResult: '',
    quyCheChuyenMonComment: '',
    vanHoaCongSoResult: '',
    vanHoaCongSoComment: '',
    thongTinBaoCaoResult: '',
    thongTinBaoCaoComment: '',
    evaluatorId: user?.id || assignment.evaluatorId || '',
    evaluatedAt: new Date().toISOString()
  };

  const handleUpdateFocusedEval = (updates: Partial<TaskEvaluation>) => {
    if (!focusedAssigneeId) return;
    setEvaluations(prev => ({
      ...prev,
      [focusedAssigneeId]: { ...currentEval, ...updates }
    }));
  };

  // LƯU TOÀN BỘ KẾT QUẢ ĐÁNH GIÁ
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Thu thập tất cả các kết quả hợp lệ
    let cleanResults: Record<string, ExecutionResult> = {};
    Object.entries(assigneeResultsMap).forEach(([tId, res]) => {
      if (res === 'Hoàn thành tốt' || res === 'Quá hạn (Chậm muộn)') {
        cleanResults[tId] = res;
      }
    });

    // Tự động gán kết quả "Hoàn thành tốt" cho các CBGVNV đang được chọn nếu chưa bấm áp dụng kết quả
    if (Object.keys(cleanResults).length === 0 && checkedAssigneeIds.length > 0) {
      checkedAssigneeIds.forEach(tId => {
        cleanResults[tId] = 'Hoàn thành tốt';
      });
    }

    if (Object.keys(cleanResults).length === 0 && actualAssignees.length > 0) {
      actualAssignees.forEach(t => {
        cleanResults[t.id] = 'Hoàn thành tốt';
      });
    }

    if (Object.keys(cleanResults).length === 0) {
      alert('Vui lòng chọn hoặc tick chọn ít nhất 01 CBGVNV để gán kết quả đánh giá trước khi bấm Lưu.');
      return;
    }

    // Process KPI recording if selected
    const updatedEvaluations = { ...evaluations };
    if (recordToKpi && kpiData.kpiId) {
      const selectedKpi = kpis.find(k => k.id === kpiData.kpiId);
      const selectedGroup = kpiGroups.find(g => g.id === kpiData.groupId);
      
      if (selectedKpi) {
        // Xác định danh sách CBGVNV được ghi nhận KPI:
        // Hoặc cho tất cả những người đang được tick chọn (nếu applyKpiToAllChecked), hoặc cho người đang xem chi tiết
        const targetTeachersToRecord = applyKpiToAllChecked
          ? actualAssignees.filter(t => checkedAssigneeIds.includes(t.id))
          : (focusedTeacher ? [focusedTeacher] : []);

        targetTeachersToRecord.forEach(targetT => {
          const tId = targetT.id;
          const kpiRecordId = `kr_${Date.now()}_${tId}_${Math.random().toString(36).substring(2, 6)}`;
          
          addKpiRecord({
            id: kpiRecordId,
            teacherId: targetT.id,
            kpiId: selectedKpi.id,
            kpiCode: selectedKpi.code,
            kpiName: selectedKpi.name,
            groupId: selectedGroup?.id,
            group: selectedGroup?.name || selectedKpi.group || '',
            pointType: kpiData.pointType,
            pointValue: selectedKpi.pointValue,
            points: kpiData.points,
            unit: selectedKpi.unit || 'Lần',
            quantity: 1,
            totalPoints: kpiData.points,
            date: new Date().toISOString().split('T')[0],
            assignedBy: user?.id || 'system',
            status: 'confirmed',
            confirmedBy: user?.id,
            confirmedDate: new Date().toISOString(),
            note: kpiData.reason || `Đánh giá công việc: ${assignment.content}`,
            taskId: assignment.id,
            taskTitle: assignment.content,
            standardScoreSnapshot: selectedKpi.standardScore || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          updatedEvaluations[tId] = { 
            ...(updatedEvaluations[tId] || evaluations[tId] || currentEval),
            kpiRecordId,
            result: cleanResults[tId] || 'Hoàn thành tốt',
            evaluatorId: user?.id || assignment.evaluatorId || 'system',
            evaluatedAt: new Date().toISOString()
          };
        });
      }
    }

    // Tính trạng thái tổng thể của công việc
    const allAssignedIds = actualAssignees.map(t => t.id);
    const hasAnyOverdue = allAssignedIds.some(id => cleanResults[id] === 'Quá hạn (Chậm muộn)');
    const allEvaluated = allAssignedIds.length > 0 && allAssignedIds.every(id => !!cleanResults[id]);

    let newStatus = assignment.status;
    if (hasAnyOverdue) {
      newStatus = 'Quá hạn';
    } else if (allEvaluated) {
      newStatus = 'Đã hoàn thành';
    }

    onSave(assignment.id, {
      assigneeResults: cleanResults,
      evaluations: updatedEvaluations,
      status: newStatus,
      evaluationDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    onClose();
  };

  const evalOptions = ['Thực hiện tốt', 'Thực hiện', 'Chưa thực hiện đầy đủ', 'Vi phạm', 'Không áp dụng'];

  const renderSectionCriteria = (
    num: number, 
    title: string, 
    resultField: keyof TaskEvaluation, 
    commentField: keyof TaskEvaluation, 
    catKeyword: string
  ) => {
    const cat = evaluationCategories.find(c => c.name.toLowerCase().includes(catKeyword.toLowerCase()));
    const criteria = cat ? evaluationCriteria.filter(c => c.categoryId === cat.id).sort((a,b) => a.order - b.order) : [];

    return (
      <div key={title} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">{num}</div>
            {title}
          </div>
        </div>
        
        <div className="p-3 bg-white space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {evalOptions.map(res => (
              <label key={res} className={cn("flex-1 min-w-[110px] flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-xs", currentEval[resultField] === res ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-2xs" : "bg-white border-slate-200 hover:border-indigo-200 text-slate-600")}>
                <input 
                  type="radio" 
                  name={`${resultField}_${focusedAssigneeId}`}
                  value={res} 
                  checked={currentEval[resultField] === res}
                  onChange={e => handleUpdateFocusedEval({ [resultField]: e.target.value as any })}
                  className="sr-only"
                />
                <span className="text-center truncate">{res}</span>
              </label>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú {title.toLowerCase()}:</label>
            <textarea 
              rows={1}
              value={(currentEval[commentField] as string) || ''}
              onChange={e => handleUpdateFocusedEval({ [commentField]: e.target.value })}
              placeholder={`Ghi chú về ${title.toLowerCase()}...`}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {criteria.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] font-medium text-slate-500 mb-1">Nội dung xem xét:</p>
              <ul className="text-xs text-slate-600 space-y-0.5 pl-4 list-disc marker:text-slate-400">
                {criteria.map(c => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const evaluatorTeacher = teachers.find(t => t.id === (user?.id || assignment.evaluatorId));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-700 to-indigo-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <CheckSquare size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN CBGVNV</h2>
              <p className="text-xs text-blue-100">Chọn giáo viên theo hộp kiểm để đánh giá nhanh theo nhóm hoặc từng cá nhân</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-lg"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Thông tin công việc & Người đánh giá */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Nội dung công việc:</span>
                <span className="font-bold text-slate-800 text-base">{assignment.content}</span>
              </div>
              <div className="text-xs text-slate-600 sm:text-right shrink-0">
                <span className="font-semibold text-slate-700">Người đánh giá: </span>
                <span className="font-bold text-indigo-700">{evaluatorTeacher?.name || user?.name || 'Người đánh giá'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <div>
                <span className="font-medium text-slate-500">Thứ/Tuần: </span>
                <span className="font-semibold text-slate-800">{assignment.weekLabel}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Ngày giao: </span>
                <span className="font-semibold text-slate-800">{assignment.workDate}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Thời hạn hoàn thành: </span>
                <span className="font-semibold text-slate-800">{assignment.deadline}</span>
              </div>
            </div>
          </div>

          {/* DANH SÁCH GIÁO VIÊN THEO HỘP KIỂM ĐỂ CHỌN ĐÁNH GIÁ */}
          <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Users size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                    Danh sách giáo viên được giao việc ({countTotal} người)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tick vào hộp kiểm để chọn các giáo viên cần đánh giá kết quả
                  </p>
                </div>
              </div>

              {/* Huy hiệu số lượng đã tick chọn */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all",
                  checkedAssigneeIds.length > 0 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "bg-slate-200 text-slate-600"
                )}>
                  <CheckSquare size={13} />
                  Đã chọn: {checkedAssigneeIds.length}/{countTotal} CBGVNV
                </span>
              </div>
            </div>

            {/* Thanh công cụ: Chọn tất cả, Bộ lọc & Tìm kiếm */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* Checkbox Chọn tất cả & Các nút chọn nhanh */}
              <div className="flex flex-wrap items-center gap-2">
                <label 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors select-none",
                    isAllFilteredChecked 
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs" 
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isAllFilteredChecked}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredChecked;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span>Chọn tất cả ({filteredAssignees.length})</span>
                </label>

                {countUnrated > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllUnrated}
                    className="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Clock size={12} />
                    Chọn chưa đánh giá ({countUnrated})
                  </button>
                )}

                {checkedAssigneeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>

              {/* Ô tìm kiếm nhanh */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên CBGVNV..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium border transition-colors",
                  statusFilter === 'all' ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                Tất cả ({countTotal})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unrated')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium border transition-colors flex items-center gap-1",
                  statusFilter === 'unrated' ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                Chưa đánh giá ({countUnrated})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('good')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium border transition-colors flex items-center gap-1",
                  statusFilter === 'good' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                ✓ Hoàn thành tốt ({countGood})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('overdue')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium border transition-colors flex items-center gap-1",
                  statusFilter === 'overdue' ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                ⚠ Quá hạn ({countOverdue})
              </button>
            </div>

            {/* Danh sách giáo viên với hộp kiểm */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredAssignees.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 italic">
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  filteredAssignees.map(t => {
                    const isChecked = checkedAssigneeIds.includes(t.id);
                    const isFocused = t.id === focusedAssigneeId;
                    const res = assigneeResultsMap[t.id];

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleCheck(t.id)}
                        className={cn(
                          "px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none hover:bg-indigo-50/40",
                          isChecked ? "bg-indigo-50/60" : "bg-white",
                          isFocused && "ring-1 ring-inset ring-indigo-400"
                        )}
                      >
                        {/* Hộp kiểm Checkbox + Tên & Tổ bộ môn */}
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Xử lý qua onClick của parent div
                            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-bold truncate",
                                isChecked ? "text-indigo-900" : "text-slate-800"
                              )}>
                                {t.name}
                              </span>
                              {isFocused && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-medium">
                                  Đang xem
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                              {t.position && <span>{t.position}</span>}
                              {t.position && t.subject && <span>•</span>}
                              {t.subject && <span>Môn: {t.subject}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Kết quả hiện tại */}
                        <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {res === 'Hoàn thành tốt' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                              <Check size={12} className="stroke-[3]" /> Hoàn thành tốt
                            </span>
                          ) : res === 'Quá hạn (Chậm muộn)' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                              <AlertTriangle size={12} className="stroke-[3]" /> Quá hạn (Chậm muộn)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
                              <Clock size={12} /> Chưa đánh giá
                            </span>
                          )}

                          {/* Nút xem chi tiết / ghi chú riêng */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedAssigneeId(t.id);
                              if (!checkedAssigneeIds.includes(t.id)) {
                                setCheckedAssigneeIds(prev => [...prev, t.id]);
                              }
                            }}
                            title="Xem chi tiết ghi chú & tiêu chí"
                            className={cn(
                              "p-1.5 rounded-lg border text-xs transition-colors",
                              isFocused 
                                ? "bg-indigo-600 text-white border-indigo-700" 
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <User size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* KHU VỰC ĐÁNH GIÁ: CHỌN KẾT QUẢ CHO CÁC GIÁO VIÊN ĐÃ TICK CHỌN QUA HỘP KIỂM */}
          <div className="border-2 border-indigo-300 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {checkedAssigneeIds.length > 0 ? (
                      <span>
                        CHỌN KẾT QUẢ ÁP DỤNG CHO: <span className="text-indigo-700 underline font-extrabold">{checkedAssigneeIds.length} CBGVNV</span> ĐANG ĐƯỢC CHỌN
                      </span>
                    ) : (
                      <span className="text-slate-600">CHỌN KẾT QUẢ ĐÁNH GIÁ</span>
                    )}
                  </h3>
                  {checkedAssigneeIds.length > 0 && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      Áp dụng cho: {checkedAssigneeIds.map(id => teachers.find(t => t.id === id)?.name || id).slice(0, 5).join(', ')}
                      {checkedAssigneeIds.length > 5 ? ` và +${checkedAssigneeIds.length - 5} người khác` : ''}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 shrink-0">
                * Bắt buộc chọn 01 trong 02 kết quả
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Thông báo thao tác nếu có */}
              {toastMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  <span className="font-medium">{toastMessage}</span>
                </div>
              )}

              {checkedAssigneeIds.length === 0 ? (
                <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-xl text-center space-y-2">
                  <AlertTriangle size={24} className="text-amber-600 mx-auto" />
                  <div className="font-bold text-amber-900 text-sm">Chưa có giáo viên nào được chọn trong hộp kiểm!</div>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">
                    Vui lòng tick vào hộp kiểm ở danh sách giáo viên phía trên (hoặc bấm <strong>"Chọn tất cả"</strong>) để chọn các CBGVNV cần đánh giá.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="mt-2 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
                  >
                    Chọn tất cả {filteredAssignees.length} giáo viên
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lựa chọn 1: Hoàn thành tốt */}
                  <div
                    onClick={() => handleApplyResultToChecked('Hoàn thành tốt')}
                    className="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 select-none bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-700 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-emerald-100 text-emerald-700 border border-emerald-300">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-base text-emerald-800">Hoàn thành tốt</div>
                          <div className="text-xs text-slate-500">Đúng hạn & đảm bảo chất lượng</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg shadow-2xs">
                        Bấm áp dụng
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-emerald-100 pt-2 mt-1">
                      Gán kết quả <strong>Hoàn thành tốt</strong> cho <strong>{checkedAssigneeIds.length}</strong> CBGVNV đang được chọn qua hộp kiểm.
                    </p>
                  </div>

                  {/* Lựa chọn 2: Quá hạn (Chậm muộn) */}
                  <div
                    onClick={() => handleApplyResultToChecked('Quá hạn (Chậm muộn)')}
                    className="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 select-none bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 text-slate-700 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-rose-100 text-rose-700 border border-rose-300">
                          ⚠
                        </div>
                        <div>
                          <div className="font-bold text-base text-rose-800">Quá hạn (Chậm muộn)</div>
                          <div className="text-xs text-slate-500">Hoàn thành sau thời hạn hoặc chậm muộn</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg shadow-2xs">
                        Bấm áp dụng
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-rose-100 pt-2 mt-1">
                      Gán kết quả <strong>Quá hạn (Chậm muộn)</strong> cho <strong>{checkedAssigneeIds.length}</strong> CBGVNV đang được chọn qua hộp kiểm.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NHẬN XÉT, ĐÁNH GIÁ CHI TIẾT & GHI NHẬN KPI */}
          {focusedAssigneeId && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Nhận xét / Ghi chú */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('notes')}
                  className="w-full bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between text-xs hover:bg-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</div>
                    <span>NHẬN XÉT / GHI CHÚ ĐÁNH GIÁ: <strong className="text-indigo-700">{focusedTeacher?.name}</strong></span>
                  </div>
                  {expandedSections.notes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedSections.notes && (
                  <div className="p-3.5 bg-white">
                    <textarea 
                      rows={2}
                      value={currentEval.comment || ''}
                      onChange={e => handleUpdateFocusedEval({ comment: e.target.value })}
                      placeholder={`Nhập nhận xét cụ thể cho ${focusedTeacher?.name || 'CBGVNV'}...`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Tiêu chí nền nếp & chuyên môn chi tiết (Tùy chọn) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('criteria')}
                  className="w-full bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between text-xs hover:bg-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</div>
                    <span>ĐÁNH GIÁ NỀN NẾP & CHUYÊN MÔN CHI TIẾT (TÙY CHỌN) - {focusedTeacher?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-normal text-slate-500">Nội quy, chuyên môn, văn hóa công sở</span>
                    {expandedSections.criteria ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {expandedSections.criteria && (
                  <div className="p-3.5 bg-white space-y-3">
                    {renderSectionCriteria(1, "NỘI QUY CƠ QUAN", "noiQuyResult", "noiQuyComment", "nội quy")}
                    {renderSectionCriteria(2, "QUY CHẾ CHUYÊN MÔN", "quyCheChuyenMonResult", "quyCheChuyenMonComment", "chuyên môn")}
                    {renderSectionCriteria(3, "VĂN HÓA CÔNG SỞ", "vanHoaCongSoResult", "vanHoaCongSoComment", "văn hóa")}
                    {renderSectionCriteria(4, "THÔNG TIN, BÁO CÁO", "thongTinBaoCaoResult", "thongTinBaoCaoComment", "thông tin")}
                  </div>
                )}
              </div>

              {/* Ghi nhận vào KPI tháng theo công việc riêng cho từng đối tượng (CNQL; TTCM, TPCM, TTVP; Giáo viên; Nhân viên) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">4</div>
                    <span className="flex items-center gap-1.5">
                      <Award size={14} className="text-amber-600" />
                      GHI NHẬN VÀO KPI THÁNG THEO CÔNG VIỆC (TÙY CHỌN)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs hover:bg-amber-50/50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={recordToKpi}
                      onChange={e => setRecordToKpi(e.target.checked)}
                      className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Cộng/Trừ điểm KPI</span>
                  </label>
                </div>
                
                {recordToKpi && (
                  <div className="p-4 bg-amber-50/30 space-y-3.5">
                    {/* Hộp thông tin tự động nhận diện đối tượng của người đang xem */}
                    <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Đang chọn: <strong className="text-slate-900">{focusedTeacher?.name}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Chức vụ: <strong>{focusedTeacher?.position || 'Chưa cập nhật'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Đối tượng phát hiện:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                          getKpiTargetGroupInfo(focusedTeacherTargetGroup).colorBadge
                        )}>
                          {getKpiTargetGroupInfo(focusedTeacherTargetGroup).badgeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Bộ Tab 4 nhóm đối tượng đánh giá KPI theo công việc */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Bộ tiêu chí KPI theo nhóm chức danh / đối tượng:
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Hiển thị {availableTargetKpis.length} tiêu chí
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-100/90 p-1.5 rounded-lg border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setKpiTargetGroupFilter('all')}
                          className={cn(
                            "py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer",
                            kpiTargetGroupFilter === 'all'
                              ? "bg-white text-slate-800 shadow-xs border border-slate-300 font-bold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          )}
                        >
                          Tất cả ({kpis.length})
                        </button>
                        {KPI_TARGET_GROUPS.map(g => {
                          const isAuto = focusedTeacherTargetGroup === g.key;
                          const isSelected = kpiTargetGroupFilter === g.key;
                          return (
                            <button
                              key={g.key}
                              type="button"
                              onClick={() => setKpiTargetGroupFilter(g.key)}
                              className={cn(
                                "py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1",
                                isSelected 
                                  ? cn(g.colorBadge, "font-bold shadow-xs border") 
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                              )}
                              title={g.description}
                            >
                              <span>{g.shortName}</span>
                              {isAuto && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Đúng nhóm đối tượng của CBGVNV này" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gợi ý tiêu chí đánh giá công việc nhanh theo nhóm đối tượng */}
                    {suggestedTaskKpis.length > 0 && (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                          <Sparkles size={13} className="text-amber-600" />
                          <span>Gợi ý tiêu chí đánh giá công việc nhanh cho nhóm {kpiTargetGroupFilter === 'all' ? getKpiTargetGroupInfo(focusedTeacherTargetGroup).badgeLabel : getKpiTargetGroupInfo(kpiTargetGroupFilter).badgeLabel}:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedTaskKpis.map(stk => {
                            // Tìm tiêu chí tương ứng trong hệ thống hoặc dùng trực tiếp mã
                            const isMatch = kpiData.kpiId === stk.id || (kpiData as any).code === stk.code;
                            return (
                              <button
                                key={stk.id}
                                type="button"
                                onClick={() => {
                                  // Tìm xem tiêu chí đã có trong kpis chưa
                                  const foundInKpis = kpis.find(k => k.id === stk.id || k.code === stk.code);
                                  const targetKpiId = foundInKpis ? foundInKpis.id : (availableTargetKpis[0]?.id || stk.id);
                                  const targetGroupId = foundInKpis?.groupId || stk.groupId;
                                  
                                  setKpiData({
                                    groupId: targetGroupId,
                                    kpiId: targetKpiId,
                                    pointType: stk.pointType,
                                    points: stk.deductionScore || 2,
                                    reason: `Vi phạm công việc: ${stk.deductionName} (${assignment.content})`
                                  });
                                }}
                                className={cn(
                                  "px-2 py-1 rounded text-[11px] border text-left transition-all cursor-pointer flex items-center gap-1",
                                  isMatch 
                                    ? "bg-amber-100 border-amber-400 text-amber-900 font-bold" 
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                                )}
                              >
                                <span className="font-mono font-bold text-[10px] text-indigo-700">{stk.code}:</span>
                                <span className="truncate max-w-[200px]">{stk.name}</span>
                                <span className="text-rose-600 font-semibold">(-{stk.deductionScore}đ)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Form cấu hình điểm KPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nhóm KPI</label>
                        <select 
                          value={kpiData.groupId} 
                          onChange={e => setKpiData({...kpiData, groupId: e.target.value, kpiId: ''})}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        >
                          <option value="">-- Tất cả nhóm KPI --</option>
                          {kpiGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tiêu chí KPI ({availableTargetKpis.length})
                        </label>
                        <select 
                          value={kpiData.kpiId} 
                          onChange={e => {
                            const kpi = kpis.find(k => k.id === e.target.value);
                            if (kpi) {
                              setKpiData({
                                ...kpiData, 
                                kpiId: kpi.id, 
                                groupId: kpi.groupId || kpiData.groupId,
                                pointType: kpi.pointType, 
                                points: Math.abs(kpi.pointValue || 2),
                                reason: kpiData.reason || `Ghi nhận KPI: ${kpi.name} (${assignment.content})`
                              });
                            } else {
                              setKpiData({...kpiData, kpiId: e.target.value});
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                        >
                          <option value="">-- Chọn tiêu chí KPI --</option>
                          {availableTargetKpis.map(k => (
                            <option key={k.id} value={k.id}>
                              [{k.targetAudience || 'Tất cả'}] {k.code} - {k.name} ({k.pointType === 'plus' ? '+' : '-'}{k.pointValue || 0}đ)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Loại điểm</label>
                        <select 
                          value={kpiData.pointType} 
                          onChange={e => setKpiData({...kpiData, pointType: e.target.value as any})}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-semibold"
                        >
                          <option value="plus" className="text-emerald-700 font-bold">Điểm cộng (+)</option>
                          <option value="minus" className="text-rose-700 font-bold">Điểm trừ (-)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Số điểm ghi nhận</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.5"
                          value={kpiData.points} 
                          onChange={e => setKpiData({...kpiData, points: Number(e.target.value)})}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Lý do ghi nhận điểm KPI</label>
                        <input 
                          type="text" 
                          value={kpiData.reason} 
                          onChange={e => setKpiData({...kpiData, reason: e.target.value})}
                          placeholder={`Lý do ghi nhận điểm KPI cho ${focusedTeacher?.name || ''}...`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        />
                      </div>
                    </div>

                    {/* Tùy chọn áp dụng KPI cho cả danh sách được tick chọn */}
                    {checkedAssigneeIds.length > 1 && (
                      <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-300/80 flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold">
                          <input 
                            type="checkbox"
                            checked={applyKpiToAllChecked}
                            onChange={e => setApplyKpiToAllChecked(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                          />
                          <span>Áp dụng ghi nhận KPI này cho tất cả <strong className="text-indigo-800">{checkedAssigneeIds.length}</strong> CBGVNV đang được tick chọn</span>
                        </label>
                        <span className="text-[11px] text-amber-800 italic">Tiết kiệm thời gian nhập liệu hàng loạt</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-3">
            <span>Đã đánh giá: <strong className="text-indigo-700 font-bold">{countGood + countOverdue}/{countTotal}</strong> CBGVNV</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">✓ {countGood} Tốt</span>
            <span className="text-rose-700 font-semibold">⚠ {countOverdue} Quá hạn</span>
            {countUnrated > 0 && <span className="text-amber-700 font-medium">({countUnrated} chưa đánh giá)</span>}
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={15} />
              Lưu kết quả đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
