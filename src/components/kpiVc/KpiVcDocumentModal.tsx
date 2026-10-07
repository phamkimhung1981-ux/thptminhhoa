import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  CheckCircle2, 
  Printer, 
  Lock, 
  Unlock, 
  AlertCircle, 
  FileText, 
  Info,
  Calendar,
  User,
  ShieldCheck,
  Building,
  Award,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Settings,
  FileCheck,
  CheckSquare,
  Square,
  Clock
} from 'lucide-react';
import { 
  KpiVcForm, 
  KpiVcPeriod, 
  KpiVcCriterion, 
  KpiVcCriteriaGroup, 
  KpiVcScoreItem,
  KpiVcFormStatus
} from '../../types/kpiVc';
import { Teacher, Department } from '../../types';
import { 
  getEligibleVcTeachers,
  resolveVcTeacherPosition,
  resolveVcTeacherDepartment,
  calculateVcTotals,
  calculateVcSelfTotals,
  calculateVcTtcmTotals,
  calculateVcTctmTotals,
  calculateVcManagerTotals,
  resolveVcClassification,
  createCriteriaSnapshot,
  initializeVcScoreItems,
  DEFAULT_VC_GROUPS,
  DEFAULT_VC_CRITERIA,
  DEFAULT_VC_PERIODS
} from '../../lib/kpiVcData';
import { 
  getEligibleEvaluators, 
  isExcludedCbqlEvaluator,
  getTtcmEvaluatorList,
  getBghEvaluatorList,
  findTtcmForDepartment,
  getDepartmentTtcmDropdownOptions,
  isTeacherBgh,
  TtcmEvaluatorOption,
  BghEvaluatorOption
} from '../../lib/kpiTargetAudienceUtils';
import { 
  createVcForm, 
  updateVcForm, 
  toggleLockVcForm, 
  cleanFirestoreData 
} from '../../services/kpiVcService';
import { useAuth } from '../../store/AuthContext';
import { exportVcFormToWord } from '../../utils/kpiWordExport';

interface KpiVcDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: KpiVcForm | null;
  mode: 'create' | 'edit' | 'self_eval' | 'ttcm_eval' | 'leader_eval' | 'view';
  teachers: Teacher[];
  departments: Department[];
  periods: KpiVcPeriod[];
  criteria: KpiVcCriterion[];
  groups: KpiVcCriteriaGroup[];
  onSaved?: (formId: string) => void;
  onPrintRequest?: (form: KpiVcForm) => void;
}

export default function KpiVcDocumentModal({
  isOpen,
  onClose,
  form,
  mode,
  teachers,
  departments,
  periods,
  criteria,
  groups,
  onSaved,
  onPrintRequest
}: KpiVcDocumentModalProps) {
  const { user } = useAuth();

  // Admin permission
  const isAdmin = user?.id === 'admin' || user?.role === 'BGH' || (user?.position || '').toLowerCase().includes('hiệu trưởng');

  // Eligible teacher list (Teachers and Staff, NOT BGH)
  const eligibleTeachers = useMemo(() => {
    return getEligibleVcTeachers(teachers);
  }, [teachers]);

  // TTCM & BGH Evaluators List
  const ttcmEvaluators = useMemo(() => {
    return getTtcmEvaluatorList(teachers, departments);
  }, [teachers, departments]);

  const bghEvaluators = useMemo(() => {
    return getBghEvaluatorList(teachers);
  }, [teachers]);

  // --- SINGLE FORM STATE (FOR EDIT / VIEW / EVAL MODES) ---
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('');
  const [selectedEvaluatorRole, setSelectedEvaluatorRole] = useState<string>('Tổ trưởng chuyên môn');
  
  // Evaluation Date & Sign
  const [selfDate, setSelfDate] = useState<string>('');
  const [selfClassification, setSelfClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');
  const [selfComment, setSelfComment] = useState<string>('');

  // TTCM Assessment
  const [ttcmClassification, setTtcmClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');
  const [ttcmComment, setTtcmComment] = useState<string>('');
  const [ttcmDate, setTtcmDate] = useState<string>('');
  const [ttcmEvaluatorName, setTtcmEvaluatorName] = useState<string>('');

  // Leader (CBQL) Assessment
  const [leaderClassification, setLeaderClassification] = useState<string>('Hoàn thành tốt nhiệm vụ');
  const [leaderComment, setLeaderComment] = useState<string>('');
  const [leaderDate, setLeaderDate] = useState<string>('');
  const [leaderSignName, setLeaderSignName] = useState<string>('Hiệu trưởng / Ban Giám hiệu');
  const [managerGeneralComment, setManagerGeneralComment] = useState<string>('');

  // Items State (list of scored criteria)
  const [scoreItems, setScoreItems] = useState<KpiVcScoreItem[]>([]);

  // --- MULTI-SELECTION & WORKSPACE STATE FOR CREATE MODE ---
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [audienceTab, setAudienceTab] = useState<'by_dept' | 'by_teacher'>('by_dept');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  // Evaluator Selection State for Create Mode
  // Cho phép chọn ĐỒNG THỜI 02 CẤP ĐÁNH GIÁ (Mặc định cả 2 đều được chọn):
  // 1. Tổ trưởng chuyên môn đánh giá (hasTtcmEval)
  // 2. Ban Giám hiệu đánh giá (hasBghEval)
  const [hasTtcmEval, setHasTtcmEval] = useState<boolean>(true);
  const [hasBghEval, setHasBghEval] = useState<boolean>(true);
  const [evaluatorType, setEvaluatorType] = useState<'TTCM' | 'BGH'>('TTCM');
  const [selectedTtcmId, setSelectedTtcmId] = useState<string>('');
  const [selectedBghId, setSelectedBghId] = useState<string>('');

  // Evaluation Settings State (Create Mode)
  const [allowSelfEval, setAllowSelfEval] = useState<boolean>(true);
  const [allowLeaderEval, setAllowLeaderEval] = useState<boolean>(true);
  const [allowEditCriteria, setAllowEditCriteria] = useState<boolean>(true);
  const [allowComment, setAllowComment] = useState<boolean>(true);
  const [allowEvidence, setAllowEvidence] = useState<boolean>(true);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [evaluationNote, setEvaluationNote] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const lastInitializedKey = useRef<string | null>(null);

  // --- MEMOIZED HELPERS ---
  const selectedTeacher = useMemo(() => {
    return eligibleTeachers.find(t => t.id === selectedTeacherId) || 
      teachers.find(t => t.id === selectedTeacherId) || null;
  }, [eligibleTeachers, teachers, selectedTeacherId]);

  const eligibleEvaluatorsResult = useMemo(() => {
    return getEligibleEvaluators(selectedTeacher, teachers, departments);
  }, [selectedTeacher, teachers, departments]);

  const recommendedEvaluators = useMemo(() => {
    return (eligibleEvaluatorsResult.evaluators || []).filter(t => !isExcludedCbqlEvaluator(t));
  }, [eligibleEvaluatorsResult]);

  const allCbqlEvaluators = useMemo(() => {
    const list = teachers.filter(t => {
      if (!t) return false;
      if (isExcludedCbqlEvaluator(t)) return false;
      const roleStr = String(t.role || '').toUpperCase();
      const posStr = String(t.position || '').toLowerCase();
      const isHead = departments.some(d => d.headId === t.id);

      const isManagerRole = ['BGH', 'TTCM', 'NHAN_SU', 'ADMIN', 'MANAGER', 'CBQL', 'QL'].includes(roleStr);
      const isManagerPos = 
        posStr.includes('hiệu trưởng') ||
        posStr.includes('phó hiệu trưởng') ||
        posStr.includes('tổ trưởng') ||
        posStr.includes('phó tổ trưởng') ||
        posStr.includes('bgh') ||
        posStr.includes('quản lý') ||
        posStr.includes('trưởng') ||
        posStr.includes('lãnh đạo') ||
        posStr.includes('bí thư') ||
        posStr.includes('chủ nhiệm') ||
        posStr.includes('ttcm') ||
        posStr.includes('tpcm');

      return isManagerRole || isManagerPos || isHead || Boolean((t as any).isManager);
    });
    return list.length > 0 ? list : teachers.filter(t => !isExcludedCbqlEvaluator(t));
  }, [teachers, departments]);

  const otherCbqlList = useMemo(() => {
    return allCbqlEvaluators.filter(t => !isExcludedCbqlEvaluator(t) && !recommendedEvaluators.some(r => r.id === t.id));
  }, [allCbqlEvaluators, recommendedEvaluators]);

  const selectedEvaluator = useMemo(() => {
    return teachers.find(t => t.id === selectedEvaluatorId) || null;
  }, [teachers, selectedEvaluatorId]);

  const selectedPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  const resolvedPosition = useMemo(() => {
    return form ? form.position : resolveVcTeacherPosition(selectedTeacher, departments);
  }, [form, selectedTeacher, departments]);

  const resolvedDepartment = useMemo(() => {
    return form ? form.department : resolveVcTeacherDepartment(selectedTeacher, departments);
  }, [form, selectedTeacher, departments]);

  // Active Groups & Criteria
  const activeGroups = useMemo(() => {
    if (form?.criteriaSnapshot?.groups && form.criteriaSnapshot.groups.length > 0) {
      return form.criteriaSnapshot.groups;
    }
    return groups.length > 0 ? groups : DEFAULT_VC_GROUPS;
  }, [form, groups]);

  const activeCriteria = useMemo(() => {
    const baseCriteria = criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA;
    const baseMap = new Map(baseCriteria.map(c => [c.id, c]));

    if (form?.criteriaSnapshot?.criteria && form.criteriaSnapshot.criteria.length > 0) {
      return form.criteriaSnapshot.criteria.map(c => {
        const standard = baseMap.get(c.id);
        if (standard && standard.maxScore !== c.maxScore) {
          return { ...c, maxScore: standard.maxScore };
        }
        return c;
      });
    }
    return baseCriteria;
  }, [form, criteria]);

  // Score Calculations
  const totals = useMemo(() => {
    return calculateVcTotals(scoreItems);
  }, [scoreItems]);

  const ttcmTotals = useMemo(() => {
    return calculateVcTtcmTotals(scoreItems);
  }, [scoreItems]);

  const managerTotals = useMemo(() => {
    return calculateVcManagerTotals(scoreItems);
  }, [scoreItems]);

  const groupScores = totals.groupScores;
  const totalScore = totals.totalScore;

  const ttcmGroupScores = ttcmTotals.ttcmGroupScores;
  const ttcmTotalScore = ttcmTotals.ttcmTotalScore;

  const managerGroupScores = managerTotals.managerGroupScores;
  const managerTotalScore = managerTotals.managerTotalScore;

  const hasAnyTtcmScore = useMemo(() => {
    return scoreItems.some(it => typeof it.ttcmScore === 'number' && it.ttcmScore !== null);
  }, [scoreItems]);

  const hasAnyManagerScore = useMemo(() => {
    return scoreItems.some(it => typeof it.managerScore === 'number' && it.managerScore !== null);
  }, [scoreItems]);

  // --- INITIALIZATION ON OPEN ---
  useEffect(() => {
    if (!isOpen) {
      lastInitializedKey.current = null;
      return;
    }

    const currentKey = `${form?.id || 'new'}_${mode}_${isOpen}`;
    if (lastInitializedKey.current === currentKey) {
      return;
    }
    lastInitializedKey.current = currentKey;

    setErrorMsg(null);
    setSuccessMsg(null);

    const todayStr = new Date().toLocaleDateString('vi-VN');

    if (form) {
      // EDIT / VIEW / LEADER_EVAL MODE
      setSelectedTeacherId(form.employeeId);
      setSelectedPeriodId(form.periodId);
      
      let matchedEvalId = form.evaluatorId || '';
      if (!matchedEvalId && form.evaluatorName) {
        const foundObj = teachers.find(t => t.name.trim().toLowerCase() === form.evaluatorName?.trim().toLowerCase());
        if (foundObj) matchedEvalId = foundObj.id;
      }

      setSelectedEvaluatorId(matchedEvalId);
      
      const evalObj = matchedEvalId ? teachers.find(t => t.id === matchedEvalId) : null;
      const initialRole = form.evaluatorRole || (evalObj ? resolveVcTeacherPosition(evalObj, departments) : 'Tổ trưởng chuyên môn');
      setSelectedEvaluatorRole(initialRole);

      if (initialRole.includes('Tổ trưởng') || initialRole.includes('TTCM')) {
        setEvaluatorType('TTCM');
        setSelectedTtcmId(matchedEvalId || 'auto');
      } else {
        setEvaluatorType('BGH');
        setSelectedBghId(matchedEvalId || (bghEvaluators[0]?.id || ''));
      }
      
      const rawItems = form.items || [];
      const currentCriteria = criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA;
      const defaultItems = initializeVcScoreItems(currentCriteria);
      
      let itemsToUse = rawItems;
      if (!rawItems || rawItems.length === 0 || rawItems.length < defaultItems.length) {
        const existingMap = new Map<string, KpiVcScoreItem>();
        rawItems.forEach(it => {
          if (it.criterionId) existingMap.set(it.criterionId, it);
          if (it.criterionCode) existingMap.set(it.criterionCode, it);
        });
        itemsToUse = defaultItems.map(defItem => {
          const found = existingMap.get(defItem.criterionId) || existingMap.get(defItem.criterionCode);
          if (found) {
            return {
              ...defItem,
              selfScore: typeof found.selfScore === 'number' ? found.selfScore : defItem.maxScore,
              note: found.note || '',
              ttcmScore: found.ttcmScore !== undefined ? found.ttcmScore : null,
              ttcmComment: found.ttcmComment || '',
              managerScore: found.managerScore !== undefined ? found.managerScore : null,
              managerComment: found.managerComment || ''
            };
          }
          return defItem;
        });
      }

      // Đồng bộ chuẩn điểm tối đa theo cấu hình chuẩn 60 điểm cho mục II
      const criteriaMap = new Map(currentCriteria.map(c => [c.id, c]));
      itemsToUse = itemsToUse.map(it => {
        const crit = criteriaMap.get(it.criterionId) || currentCriteria.find(c => c.code === it.criterionCode);
        if (crit) {
          const hadMaxSelf = typeof it.selfScore === 'number' && it.selfScore >= it.maxScore;
          const hadMaxTtcm = typeof it.ttcmScore === 'number' && it.ttcmScore >= it.maxScore;
          const hadMaxMgr = typeof it.managerScore === 'number' && it.managerScore >= it.maxScore;
          const newMax = crit.maxScore;
          return {
            ...it,
            maxScore: newMax,
            selfScore: hadMaxSelf ? newMax : Math.min(newMax, it.selfScore ?? newMax),
            ttcmScore: typeof it.ttcmScore === 'number' ? (hadMaxTtcm ? newMax : Math.min(newMax, it.ttcmScore)) : it.ttcmScore,
            managerScore: typeof it.managerScore === 'number' ? (hadMaxMgr ? newMax : Math.min(newMax, it.managerScore)) : it.managerScore,
          };
        }
        return it;
      });
      
      setScoreItems(itemsToUse);
      setSelfClassification(form.selfClassification || resolveVcClassification(form.totalScore));
      setSelfDate(form.selfDate || todayStr);
      setSelfComment(form.selfComment || '');
      setLeaderClassification(form.leaderClassification || form.selfClassification || 'Hoàn thành tốt nhiệm vụ');
      setLeaderComment(form.leaderComment || '');
      setLeaderDate(form.leaderDate || todayStr);
      setLeaderSignName(form.leaderSignName || form.evaluatorName || (matchedEvalId ? (teachers.find(t => t.id === matchedEvalId)?.name || '') : ''));
      setManagerGeneralComment(form.managerGeneralComment || '');
    } else {
      // CREATE MODE
      const defaultPeriod = periods.find(p => p.status === 'active') || periods[0];
      setSelectedPeriodId(defaultPeriod?.id || '');

      // Select ALL eligible teachers by default for Create Mode
      const allEligibleIds = eligibleTeachers.map(t => t.id);
      setSelectedTeacherIds(allEligibleIds);

      // Expand all departments by default
      const initialExpanded: Record<string, boolean> = {};
      departments.forEach(d => { initialExpanded[d.id] = true; });
      setExpandedDepts(initialExpanded);

      let targetTeacherId = '';
      if (user && eligibleTeachers.some(t => t.id === user.id)) {
        targetTeacherId = user.id;
      } else if (eligibleTeachers.length > 0) {
        targetTeacherId = eligibleTeachers[0].id;
      }
      setSelectedTeacherId(targetTeacherId);

      // Default evaluator configuration for Create Mode: Mặc định chọn ĐỒNG THỜI cả 2 cấp
      setHasTtcmEval(true);
      setHasBghEval(true);
      setEvaluatorType('TTCM');
      setSelectedTtcmId('');
      setSelectedBghId(bghEvaluators[0]?.id || '');

      setSelectedEvaluatorId('');
      setLeaderSignName('');

      const initialCriteria = criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA;
      const initialItems = initializeVcScoreItems(initialCriteria);
      setScoreItems(initialItems);

      const initTotals = calculateVcTotals(initialItems);
      setSelfClassification(resolveVcClassification(initTotals.totalScore));
      setSelfDate(todayStr);
      setSelfComment('');
      setLeaderClassification('Hoàn thành tốt nhiệm vụ');
      setLeaderComment('');
      setLeaderDate(todayStr);
      setManagerGeneralComment('');
    }
  }, [isOpen, form, mode, periods, eligibleTeachers, teachers, departments, criteria, user, bghEvaluators, ttcmEvaluators]);

  // Ensure selectedPeriodId is auto-populated if periods arrive after initial render
  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      const activePeriod = periods.find(p => p.status === 'active') || periods[0];
      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
      }
    }
  }, [periods, selectedPeriodId]);

  // Tự động cập nhật BGH ID nếu chưa có
  useEffect(() => {
    if (!selectedBghId && bghEvaluators.length > 0) {
      setSelectedBghId(bghEvaluators[0].id);
    }
  }, [selectedBghId, bghEvaluators]);

  // Tự động chọn Cán bộ quản lý phù hợp nếu chưa chọn hoặc id không còn hợp lệ
  useEffect(() => {
    if (!isOpen) return;
    const currentEval = teachers.find(t => t.id === selectedEvaluatorId);
    const isInvalid = !selectedEvaluatorId || !currentEval || isExcludedCbqlEvaluator(currentEval);

    if (isInvalid) {
      const bestId = (eligibleEvaluatorsResult.defaultEvaluatorId && !isExcludedCbqlEvaluator(teachers.find(t => t.id === eligibleEvaluatorsResult.defaultEvaluatorId)) ? eligibleEvaluatorsResult.defaultEvaluatorId : '') || 
                     recommendedEvaluators.find(t => !isExcludedCbqlEvaluator(t))?.id || 
                     allCbqlEvaluators.find(t => !isExcludedCbqlEvaluator(t))?.id || '';
      if (bestId) {
        setSelectedEvaluatorId(bestId);
        const ev = teachers.find(t => t.id === bestId);
        if (ev) setLeaderSignName(ev.name);
      }
    }
  }, [isOpen, selectedTeacherId, selectedEvaluatorId, eligibleEvaluatorsResult, recommendedEvaluators, allCbqlEvaluators, teachers]);

  // --- HANDLERS FOR MULTI-SELECT (CREATE MODE) ---
  const getTeachersInDept = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return eligibleTeachers.filter(t => {
      if (t.departmentId === deptId) return true;
      if (dept && t.department === dept.name) return true;
      return false;
    });
  };

  const isDeptFullySelected = (deptId: string) => {
    const teachersInDept = getTeachersInDept(deptId);
    if (teachersInDept.length === 0) return false;
    return teachersInDept.every(t => selectedTeacherIds.includes(t.id));
  };

  const isDeptPartiallySelected = (deptId: string) => {
    const teachersInDept = getTeachersInDept(deptId);
    const count = teachersInDept.filter(t => selectedTeacherIds.includes(t.id)).length;
    return count > 0 && count < teachersInDept.length;
  };

  const toggleSelectDept = (deptId: string) => {
    const teachersInDept = getTeachersInDept(deptId);
    const idsInDept = teachersInDept.map(t => t.id);
    const fullySelected = isDeptFullySelected(deptId);

    if (fullySelected) {
      setSelectedTeacherIds(prev => prev.filter(id => !idsInDept.includes(id)));
    } else {
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...idsInDept])));
    }
  };

  const toggleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev => {
      if (prev.includes(teacherId)) {
        return prev.filter(id => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const filteredTeachers = useMemo(() => {
    return eligibleTeachers.filter(t => {
      if (teacherSearch.trim()) {
        const q = teacherSearch.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchUsername = (t.username || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchUsername) return false;
      }
      const isSel = selectedTeacherIds.includes(t.id);
      if (teacherFilter === 'selected' && !isSel) return false;
      if (teacherFilter === 'unselected' && isSel) return false;
      return true;
    });
  }, [eligibleTeachers, teacherSearch, teacherFilter, selectedTeacherIds]);

  // --- HANDLERS FOR SINGLE FORM ---
  const handleEvaluatorChange = (evaluatorId: string) => {
    setSelectedEvaluatorId(evaluatorId);
    const ev = teachers.find(t => t.id === evaluatorId);
    if (ev) {
      setLeaderSignName(ev.name);
    } else {
      setLeaderSignName('');
    }
  };

  const handleTeacherChange = (newTeacherId: string) => {
    setSelectedTeacherId(newTeacherId);
    setSelectedEvaluatorId('');
    setLeaderSignName('');
  };

  const handleSelfScoreChange = (criterionId: string, value: number, selectedLevelCode?: string) => {
    setScoreItems(prev => {
      const existingIdx = prev.findIndex(i => i.criterionId === criterionId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          selfScore: value,
          selectedLevelCode: selectedLevelCode !== undefined ? selectedLevelCode : updated[existingIdx].selectedLevelCode
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            criterionId,
            selfScore: value,
            selectedLevelCode
          }
        ];
      }
    });
  };

  const handleTtcmScoreChange = (criterionId: string, value: number) => {
    setScoreItems(prev => {
      const existingIdx = prev.findIndex(i => i.criterionId === criterionId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          ttcmScore: value
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            criterionId,
            selfScore: 0,
            ttcmScore: value
          }
        ];
      }
    });
  };

  const handleNoteChange = (criterionId: string, note: string) => {
    setScoreItems(prev => {
      const existingIdx = prev.findIndex(i => i.criterionId === criterionId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          note
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            criterionId,
            selfScore: 0,
            note
          }
        ];
      }
    });
  };

  const handleManagerScoreChange = (criterionId: string, value: number) => {
    setScoreItems(prev => {
      const existingIdx = prev.findIndex(i => i.criterionId === criterionId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          managerScore: value
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            criterionId,
            selfScore: 0,
            managerScore: value
          }
        ];
      }
    });
  };

  // --- BATCH FORM CREATION (FOR CREATE MODE) ---
  const handleBatchCreateForms = async (isDraft: boolean = false) => {
    if (selectedTeacherIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 cán bộ, giáo viên, nhân viên.');
      return;
    }
    
    let targetPeriodId = selectedPeriodId;
    if (!targetPeriodId && periods && periods.length > 0) {
      const activePeriod = periods.find(p => p.status === 'active') || periods[0];
      targetPeriodId = activePeriod?.id || '';
    }
    if (!targetPeriodId && DEFAULT_VC_PERIODS.length > 0) {
      targetPeriodId = DEFAULT_VC_PERIODS[0].id;
    }

    if (!targetPeriodId) {
      setErrorMsg('Vui lòng chọn kỳ đánh giá.');
      return;
    }

    if (hasTtcmEval && !selectedTtcmId) {
      setErrorMsg('Vui lòng chọn Tổ trưởng chuyên môn đánh giá.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const actor = {
        id: user?.id || 'admin',
        name: user?.name || 'Quản trị viên',
        role: user?.role
      };

      const snapshot = createCriteriaSnapshot(
        groups.length > 0 ? groups : DEFAULT_VC_GROUPS,
        criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA
      );

      const activeCrit = criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA;
      const initialItems = initializeVcScoreItems(activeCrit);
      const currentPeriod = periods.find(p => p.id === targetPeriodId) || DEFAULT_VC_PERIODS.find(p => p.id === targetPeriodId);
      let createdCount = 0;

      for (const tId of selectedTeacherIds) {
        const teacherObj = eligibleTeachers.find(t => t.id === tId) || teachers.find(t => t.id === tId);
        if (!teacherObj) continue;

        const teacherPos = resolveVcTeacherPosition(teacherObj, departments);
        const teacherDept = resolveVcTeacherDepartment(teacherObj, departments);
        const teacherDeptId = teacherObj.departmentId || '';

        // 1. CẤP 1: TỔ TRƯỞNG CHUYÊN MÔN
        let ttcmId = '';
        let ttcmName = '';
        let ttcmRole = 'Tổ trưởng chuyên môn';
        let ttcmDept = teacherDept;

        if (hasTtcmEval) {
          if (!selectedTtcmId) {
            setErrorMsg('Vui lòng chọn Tổ trưởng chuyên môn đánh giá.');
            setIsSubmitting(false);
            return;
          }
          ttcmId = selectedTtcmId;
          const ttcmObj = teachers.find(t => t.id === ttcmId);
          ttcmName = ttcmObj?.name || '';
          ttcmRole = 'Tổ trưởng chuyên môn';
          const tDeptObj = departments.find(d => d.id === teacherDeptId);
          ttcmDept = tDeptObj?.name || teacherDept || 'Tổ chuyên môn';
        }

        // 2. CẤP 2: BAN GIÁM HIỆU
        let bghId = '';
        let bghName = '';
        let bghRole = 'Hiệu trưởng';

        if (hasBghEval) {
          bghId = selectedBghId || bghEvaluators[0]?.id || '';
          const bghObj = bghId ? teachers.find(t => t.id === bghId) : null;
          bghName = bghObj?.name || (bghEvaluators[0]?.name || 'Nguyễn Quang Sáng');
          bghRole = bghObj?.position || 'Hiệu trưởng';
        }

        // Người đánh giá sơ bộ / tương thích ngược
        const primaryEvalId = bghId || ttcmId || '';
        const primaryEvalName = bghName || ttcmName || '';
        const primaryEvalRole = bghRole || ttcmRole || '';

        const newFormData: Omit<KpiVcForm, 'id' | 'createdAt' | 'updatedAt'> = {
          employeeId: teacherObj.id,
          employeeName: teacherObj.name || 'Cán bộ giáo viên',
          employeeCode: teacherObj.code || `GV_${teacherObj.id}`,
          employeeUsername: teacherObj.username || '',
          employeeAvatar: teacherObj.avatar || null,
          position: teacherPos || 'Giáo viên',
          department: teacherDept || 'Trường THPT Minh Hòa',
          departmentId: teacherObj.departmentId || null,

          periodId: targetPeriodId,
          periodName: currentPeriod?.name || 'Kỳ đánh giá KPI',
          academicYear: currentPeriod?.academicYear || '2025-2026',

          criteriaSnapshot: snapshot,
          items: initialItems,

          groupScores: { group_I: 15, group_II: 15, group_III: 70 },
          ttcmGroupScores: {},
          managerGroupScores: {},
          totalScore: 100,
          ttcmTotalScore: null,
          managerTotalScore: null,
          maxTotalScore: 100,

          // Tự đánh giá
          selfClassification: 'Hoàn thành tốt nhiệm vụ',
          selfDate: selfDate || new Date().toLocaleDateString('vi-VN'),
          selfSignName: teacherObj.name || '',
          selfComment: evaluationNote || '',

          // Cấp 1: Tổ trưởng chuyên môn
          hasTtcmEval,
          ttcmEvaluatorId: ttcmId || undefined,
          ttcmEvaluatorName: ttcmName || undefined,
          ttcmEvaluatorRole: ttcmRole,
          ttcmEvaluatorDepartment: ttcmDept,
          ttcmStatus: 'pending',
          ttcmClassification: '',
          ttcmComment: '',
          ttcmDate: '',
          ttcmEvaluatedAt: null,

          // Cấp 2: Ban Giám hiệu
          hasBghEval,
          bghEvaluatorId: bghId || undefined,
          bghEvaluatorName: bghName || undefined,
          bghEvaluatorRole: bghRole,
          bghStatus: 'pending',
          bghTotalScore: null,
          bghClassification: '',
          bghComment: '',
          bghDate: '',
          bghEvaluatedAt: null,

          // CBQL / Phê duyệt (Dành cho hiển thị chung & tương thích ngược)
          evaluatorId: primaryEvalId,
          evaluatorName: primaryEvalName,
          evaluatorRole: primaryEvalRole,
          leaderClassification: '',
          leaderComment: '',
          leaderDate: '',
          leaderSignName: bghName || primaryEvalName || '',
          managerGeneralComment: '',
          managerEvaluatedAt: null,

          status: isDraft ? 'draft' : 'self_evaluated',
          createdBy: actor.name
        };

        await createVcForm(newFormData, actor);
        createdCount++;
      }

      if (createdCount === 0) {
        setErrorMsg('Không thể tạo phiếu: Không tìm thấy danh sách giáo viên/nhân viên hợp lệ.');
        return;
      }

      setSuccessMsg(`Đã tạo và lưu thành công ${createdCount} phiếu đánh giá KPI cho Giáo viên!`);
      if (onSaved) onSaved(selectedPeriodId);
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error('Error batch creating VC forms:', err);
      setErrorMsg(err.message || 'Lỗi khi tạo phiếu đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SINGLE FORM SAVE (FOR EDIT / EVAL MODES) ---
  const handleSingleSave = async (finalStatus: KpiVcFormStatus) => {
    if (!form) return;
    if (canEditSelf && !selectedEvaluatorId) {
      setErrorMsg("Vui lòng chọn cán bộ quản lý đánh giá.");
      const el = document.getElementById('kpi-vc-document-modal');
      if (el) el.scrollTop = 0;
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const actor = {
        id: user?.id || 'admin',
        name: user?.name || 'Quản trị viên',
        role: user?.role
      };

      const formId = form.id;
      const evaluatorObj = selectedEvaluatorId ? (teachers.find(t => t.id === selectedEvaluatorId) || null) : null;
      const evaluatorNameResolved = evaluatorObj?.name || '';
      const evaluatorRoleResolved = evaluatorObj ? resolveVcTeacherPosition(evaluatorObj, departments) : '';
      const evaluatorIdResolved = selectedEvaluatorId || '';

      const updatePayload: Partial<KpiVcForm> = {
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        periodId: form.periodId,
        periodName: form.periodName,
        academicYear: form.academicYear,
        position: form.position || resolvedPosition,
        department: form.department || resolvedDepartment,
        items: scoreItems,
        groupScores,
        ttcmGroupScores,
        managerGroupScores,
        totalScore,
        ttcmTotalScore: hasAnyTtcmScore ? ttcmTotalScore : null,
        managerTotalScore: hasAnyManagerScore ? managerTotalScore : null,
        selfClassification: selfClassification || 'Hoàn thành tốt nhiệm vụ',
        selfDate: selfDate || new Date().toLocaleDateString('vi-VN'),
        selfComment: selfComment || '',
        ttcmClassification: ttcmClassification || form.ttcmClassification || 'Hoàn thành tốt nhiệm vụ',
        ttcmComment: ttcmComment || form.ttcmComment || '',
        ttcmDate: ttcmDate || form.ttcmDate || new Date().toLocaleDateString('vi-VN'),
        ttcmEvaluatorName: form.ttcmEvaluatorName || ttcmEvaluatorName || user?.name || '',
        ttcmStatus: hasAnyTtcmScore ? 'evaluated' : (form.ttcmStatus || 'pending'),
        ttcmEvaluatedAt: hasAnyTtcmScore ? (form.ttcmEvaluatedAt || new Date().toISOString()) : form.ttcmEvaluatedAt,
        leaderClassification: leaderClassification || form.leaderClassification || 'Hoàn thành tốt nhiệm vụ',
        leaderComment: leaderComment || form.leaderComment || '',
        leaderDate: leaderDate || form.leaderDate || new Date().toLocaleDateString('vi-VN'),
        leaderSignName: leaderSignName || form.bghEvaluatorName || form.evaluatorName || evaluatorNameResolved,
        bghClassification: leaderClassification || form.bghClassification || 'Hoàn thành tốt nhiệm vụ',
        bghComment: leaderComment || form.bghComment || '',
        bghDate: leaderDate || form.bghDate || new Date().toLocaleDateString('vi-VN'),
        bghStatus: hasAnyManagerScore ? 'evaluated' : (form.bghStatus || 'pending'),
        bghTotalScore: hasAnyManagerScore ? managerTotalScore : (form.bghTotalScore ?? null),
        managerGeneralComment: managerGeneralComment || form.managerGeneralComment || '',
        evaluatorId: evaluatorIdResolved,
        evaluatorName: evaluatorNameResolved,
        evaluatorRole: evaluatorRoleResolved,
        managerEvaluatedAt: hasAnyManagerScore ? (form.managerEvaluatedAt || new Date().toISOString()) : form.managerEvaluatedAt,
        status: finalStatus
      };

      await updateVcForm(formId, updatePayload, actor);
      setSuccessMsg(finalStatus === 'completed' ? 'Đã hoàn thành và chốt lưu phiếu đánh giá thành công!' : 'Đã cập nhật phiếu đánh giá thành công!');
      
      if (onSaved) onSaved(formId);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving VC form:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu phiếu đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // READ ONLY & PERMISSIONS CHECK FOR SINGLE FORM
  const isTtcmForThisForm = useMemo(() => {
    if (isAdmin) return true;
    if (!user) return false;
    if (form?.ttcmEvaluatorId && form.ttcmEvaluatorId === user.id) return true;
    const teacherDeptId = form?.departmentId || selectedTeacher?.departmentId;
    if (teacherDeptId) {
      const deptHead = findTtcmForDepartment(teacherDeptId, teachers, departments);
      if (deptHead && deptHead.id === user.id) return true;
    }
    if (user?.role === 'ttcm' || user?.role === 'to_truong') return true;
    if (user?.position?.toLowerCase().includes('tổ trưởng') || user?.position?.toLowerCase().includes('ttcm')) return true;
    return false;
  }, [user, form, selectedTeacher, teachers, departments, isAdmin]);

  const isBghForThisForm = useMemo(() => {
    if (isAdmin) return true;
    if (!user) return false;
    if (form?.bghEvaluatorId && form.bghEvaluatorId === user.id) return true;
    if (form?.evaluatorId && form.evaluatorId === user.id) return true;
    if (isTeacherBgh(user)) return true;
    if (user?.role === 'cbql' || user?.role === 'hieu_truong' || user?.role === 'pht' || user?.role === 'BGH') return true;
    if (user?.position?.toLowerCase().includes('hiệu trưởng') || user?.position?.toLowerCase().includes('phó hiệu trưởng')) return true;
    return false;
  }, [user, form, isAdmin]);

  const isLocked = form?.status === 'locked';
  const isReadOnly = mode === 'view' || isLocked;
  const canEditSelf = (mode === 'create' || mode === 'edit' || mode === 'self_eval') && !isLocked;
  const canEditTtcm = (mode === 'create' || mode === 'edit' || mode === 'ttcm_eval' || isTtcmForThisForm) && !isLocked;
  const canEditManager = (mode === 'create' || mode === 'edit' || mode === 'leader_eval' || isBghForThisForm) && !isLocked;

  const canChangeEvaluator = useMemo(() => {
    if (isLocked) return false;
    if (isAdmin) return true;
    if (!form || form.status === 'draft') return true;
    return false;
  }, [form, isAdmin, isLocked]);

  if (!isOpen) return null;

  // =========================================================================
  // RENDER 1: FULL-SCREEN CREATE EVALUATION WORKSPACE (WHEN MODE === 'CREATE')
  // =========================================================================
  if (mode === 'create' || !form) {
    return (
      <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-40 bg-slate-50 flex flex-col font-sans overflow-y-auto">
        <div className="bg-slate-50 w-full min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 sm:px-8 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <FileCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/30 border border-blue-400/40 text-[11px] font-extrabold text-blue-200">
                    TẠO PHIẾU ĐÁNH GIÁ
                  </span>
                  <span className="text-xs text-blue-300 hidden sm:inline">Trường THPT Minh Hòa</span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  Tạo phiếu đánh giá KPI Giáo viên
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white">
                <span className="hidden sm:inline">Thu phóng:</span>
                <button 
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                  className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs cursor-pointer font-mono"
                  title="Thu nhỏ"
                >-</button>
                <span className="px-1 font-mono text-xs">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.1).toFixed(1))))}
                  className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs cursor-pointer font-mono"
                  title="Phóng to"
                >+</button>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-blue-100 font-semibold">
                <Users size={16} className="text-blue-300" />
                <span>Số người đã chọn:</span>
                <span className="text-sm font-extrabold text-white bg-blue-500/40 px-2 py-0.5 rounded-lg border border-blue-400/40 font-mono">
                  {selectedTeacherIds.length} Giáo viên
                </span>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBatchCreateForms(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save size={15} /> Lưu nháp
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng / Quay lại"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* NOTIFICATIONS */}
          {errorMsg && (
            <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 shrink-0">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shrink-0">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* MAIN WORKSPACE AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* LEFT COLUMN: KHU VỰC CHỌN ĐỐI TƯỢNG (40% width / lg:col-span-5) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <Users size={16} className="text-blue-600" /> ĐỐI TƯỢNG ĐÁNH GIÁ
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Chọn danh sách giáo viên được tạo phiếu</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-lg border border-blue-200">
                    Đã chọn {selectedTeacherIds.length} Giáo viên
                  </span>
                </div>

                {/* TABS */}
                <div className="p-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceTab('by_dept')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      audienceTab === 'by_dept'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Building size={15} /> Chọn theo Tổ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceTab('by_teacher')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      audienceTab === 'by_teacher'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <User size={15} /> Chọn từng Giáo viên
                  </button>
                </div>

                {/* TAB 1: CHỌN THEO TỔ */}
                {audienceTab === 'by_dept' && (
                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-bold text-slate-700">Danh sách Tổ chuyên môn & Phòng ban:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherIds(eligibleTeachers.map(t => t.id))}
                          className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherIds([])}
                          className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {departments.map((dept) => {
                      const teachersInDept = getTeachersInDept(dept.id);
                      if (teachersInDept.length === 0) return null;

                      const selectedInDept = teachersInDept.filter(t => selectedTeacherIds.includes(t.id));
                      const isFullySelected = selectedInDept.length === teachersInDept.length;
                      const isPartiallySelected = selectedInDept.length > 0 && selectedInDept.length < teachersInDept.length;
                      const isExpanded = !!expandedDepts[dept.id];

                      return (
                        <div
                          key={dept.id}
                          className={`rounded-xl border transition-all overflow-hidden ${
                            isFullySelected
                              ? 'bg-blue-50/40 border-blue-300'
                              : isPartiallySelected
                              ? 'bg-amber-50/30 border-amber-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* DEPT HEADER ROW */}
                          <div className="p-3.5 flex items-center justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isFullySelected}
                                ref={el => { if (el) el.indeterminate = isPartiallySelected; }}
                                onChange={() => toggleSelectDept(dept.id)}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                              />
                              <div className="truncate">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {dept.name}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Đã chọn: <span className="font-bold text-blue-700">{selectedInDept.length}</span>/{teachersInDept.length} người
                                </p>
                              </div>
                            </label>

                            <button
                              type="button"
                              onClick={() => setExpandedDepts(prev => ({ ...prev, [dept.id]: !prev[dept.id] }))}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                              title={isExpanded ? "Thu gọn" : "Xem danh sách giáo viên"}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          {/* EXPANDED LIST OF TEACHERS */}
                          {isExpanded && (
                            <div className="bg-slate-50/80 border-t border-slate-200/80 p-2.5 space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                              {teachersInDept.map(t => {
                                const isChecked = selectedTeacherIds.includes(t.id);
                                return (
                                  <label
                                    key={t.id}
                                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                      isChecked
                                        ? 'bg-blue-100/70 border-blue-300 text-blue-950 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelectTeacher(t.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                      />
                                      <span className="text-xs truncate font-medium">{t.name}</span>
                                    </div>
                                    <span className="text-[10.5px] font-mono text-slate-500 shrink-0">
                                      {t.code || `GV${t.id}`}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: CHỌN TỪNG CBGVNV */}
                {audienceTab === 'by_teacher' && (
                  <div className="p-4 space-y-3">
                    {/* SEARCH & FILTERS */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={e => setTeacherSearch(e.target.value)}
                        placeholder="🔍 Tìm theo tên hoặc mã Giáo viên..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setTeacherFilter('all')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            teacherFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Tất cả ({eligibleTeachers.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherFilter('selected')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            teacherFilter === 'selected' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Đã chọn ({selectedTeacherIds.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherFilter('unselected')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            teacherFilter === 'unselected' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Chưa chọn ({eligibleTeachers.length - selectedTeacherIds.length})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherIds(eligibleTeachers.map(t => t.id))}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherIds([])}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* HIGH-CAPACITY TEACHER LIST */}
                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredTeachers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          Không tìm thấy cán bộ giáo viên phù hợp.
                        </div>
                      ) : (
                        filteredTeachers.map(t => {
                          const isChecked = selectedTeacherIds.includes(t.id);
                          const pos = resolveVcTeacherPosition(t, departments);
                          const dept = resolveVcTeacherDepartment(t, departments);

                          return (
                            <label
                              key={t.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400/30 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectTeacher(t.id)}
                                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {t.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    Mã: <span className="font-mono font-semibold">{t.code || `GV${t.id}`}</span> • {pos} ({dept})
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isChecked ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isChecked ? 'Đã chọn' : 'Chưa chọn'}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: THÔNG TIN PHIẾU & THIẾT LẬP (60% width / lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-6">

                {/* SUMMARY BANNER */}
                <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-blue-800/50 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300">THÔNG TIN TÓM TẮT PHIẾU</span>
                    <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                      Phiếu đánh giá KPI Giáo viên ({selectedPeriod?.academicYear || '2026-2027'})
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                      <Users size={15} className="text-blue-300" />
                      <span>Đối tượng: <strong className="text-white">{selectedTeacherIds.length} người</strong></span>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                      <FileText size={15} className="text-indigo-300" />
                      <span>Số tiêu chí: <strong className="text-white">23 tiêu chí</strong></span>
                    </div>
                    <div className="bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-400/30 text-emerald-200 font-bold">
                      Trạng thái: Chưa lưu
                    </div>
                  </div>
                </div>

                {/* CARD 1: THÔNG TIN PHIẾU ĐÁNH GIÁ */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" /> THÔNG TIN PHIẾU ĐÁNH GIÁ
                    </h2>
                    <span className="text-xs font-semibold text-slate-500">Mẫu chuẩn THPT Minh Hòa</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Tên đợt đánh giá */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Tên đợt / Kỳ đánh giá <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedPeriodId}
                        onChange={e => setSelectedPeriodId(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {periods.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.academicYear}) {p.status === 'locked' ? '🔒 Đã khóa' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Năm học */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Năm học
                      </label>
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs sm:text-sm">
                        {selectedPeriod?.academicYear || '2025-2026'}
                      </div>
                    </div>

                    {/* Ngày tạo phiếu */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ngày tạo phiếu
                      </label>
                      <input
                        type="date"
                        value={selfDate.split('/').reverse().join('-')}
                        onChange={e => {
                          const parts = e.target.value.split('-');
                          if (parts.length === 3) setSelfDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                        }}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Hạn hoàn thành */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Hạn hoàn thành
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Loại đối tượng */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Loại đối tượng áp dụng
                      </label>
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs sm:text-sm">
                        Giáo viên (Viên chức)
                      </div>
                    </div>

                    {/* Nhóm KPI */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bộ tiêu chí KPI
                      </label>
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs sm:text-sm">
                        Bộ tiêu chí Giáo viên (23 tiêu chí - 100 điểm)
                      </div>
                    </div>

                    {/* Ghi chú đợt đánh giá */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Ghi chú / Hướng dẫn đợt đánh giá
                      </label>
                      <textarea
                        rows={2}
                        value={evaluationNote}
                        onChange={e => setEvaluationNote(e.target.value)}
                        placeholder="Nhập ghi chú hoặc hướng dẫn cán bộ giáo viên tự chấm điểm..."
                        className="w-full px-3 py-2 text-xs font-normal bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 2: THIẾT LẬP ĐÁNH GIÁ */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <Settings size={16} className="text-blue-600" /> THIẾT LẬP ĐÁNH GIÁ
                    </h2>
                    <span className="text-[11px] text-slate-500 font-semibold">Cấu hình người đánh giá & phân quyền</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSelfEval}
                        onChange={e => setAllowSelfEval(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">☑ Người được đánh giá tự đánh giá</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowLeaderEval}
                        onChange={e => setAllowLeaderEval(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">☑ Lãnh đạo đánh giá</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowEditCriteria}
                        onChange={e => setAllowEditCriteria(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">☑ Cho phép chỉnh sửa tiêu chí</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowComment}
                        onChange={e => setAllowComment(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">☑ Cho phép thêm nhận xét</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors cursor-pointer col-span-1 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={allowEvidence}
                        onChange={e => setAllowEvidence(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">☑ Cho phép đính kèm minh chứng</span>
                    </label>
                  </div>

                  {/* CÁN BỘ QUẢN LÝ ĐÁNH GIÁ (02 CẤP ĐÁNH GIÁ ĐỒNG THỜI TRÊN PHIẾU) */}
                  {allowLeaderEval && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div>
                        <label className="block font-black text-slate-800 mb-1 text-xs sm:text-sm flex items-center gap-2">
                          <span>👤 CÁN BỘ QUẢN LÝ ĐÁNH GIÁ</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-slate-500 mb-3">
                          Mỗi giáo viên khi tạo phiếu có đồng thời 02 người/02 cấp đánh giá (Tổ trưởng chuyên môn và Ban Giám hiệu) được lưu trên cùng một phiếu đánh giá.
                        </p>
                        
                        {/* 2 CHECKBOXES: TỔ TRƯỞNG CHUYÊN MÔN VÀ BAN GIÁM HIỆU (MẶC ĐỊNH CHỌN CẢ HAI) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* CHECKBOX 1: TỔ TRƯỞNG CHUYÊN MÔN ĐÁNH GIÁ */}
                          <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            hasTtcmEval 
                              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasTtcmEval}
                              onChange={(e) => {
                                if (!e.target.checked && !hasBghEval) return; // Luôn giữ ít nhất 1 người đánh giá
                                setHasTtcmEval(e.target.checked);
                              }}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>Tổ trưởng chuyên môn đánh giá</span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md">
                                  Cấp 1 - Tổ
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tổ trưởng của tổ chuyên môn chịu trách nhiệm trực tiếp đánh giá chuyên môn
                              </p>
                            </div>
                          </label>

                          {/* CHECKBOX 2: BAN GIÁM HIỆU ĐÁNH GIÁ */}
                          <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            hasBghEval 
                              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasBghEval}
                              onChange={(e) => {
                                if (!e.target.checked && !hasTtcmEval) return; // Luôn giữ ít nhất 1 người đánh giá
                                setHasBghEval(e.target.checked);
                              }}
                              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>Ban Giám hiệu đánh giá</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                                  Cấp 2 - BGH
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Hiệu trưởng hoặc Phó Hiệu trưởng đánh giá và phê duyệt kết quả cuối cùng
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* 1. MỤC BAN GIÁM HIỆU ĐÁNH GIÁ (NẾU ĐƯỢC CHỌN) */}
                      {hasBghEval && (
                        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 text-xs">
                          <label className="block font-bold text-blue-950 text-xs sm:text-sm">
                            Ban Giám hiệu đánh giá: <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={selectedBghId}
                            onChange={e => setSelectedBghId(e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white text-blue-950 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                          >
                            {bghEvaluators.length > 0 ? (
                              bghEvaluators.map(bgh => (
                                <option key={bgh.id} value={bgh.id}>
                                  {bgh.displayLabel}
                                </option>
                              ))
                            ) : (
                              <option value="">Nguyễn Quang Sáng — Hiệu trưởng</option>
                            )}
                          </select>
                          <p className="text-[11px] text-blue-700 italic">
                            Toàn bộ các phiếu được tạo sẽ có người đánh giá cấp Ban Giám hiệu là cán bộ BGH được chọn ở trên.
                          </p>
                        </div>
                      )}

                      {/* 2. MỤC TỔ TRƯỞNG CHUYÊN MÔN ĐÁNH GIÁ (NẾU ĐƯỢC CHỌN) */}
                      {hasTtcmEval && (
                        <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3.5 text-xs">
                          <div>
                            <label className="block font-bold text-indigo-950 mb-1 text-xs sm:text-sm">
                              Tổ trưởng chuyên môn đánh giá: <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedTtcmId}
                              onChange={e => setSelectedTtcmId(e.target.value)}
                              className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white text-indigo-950 border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Chọn Tổ trưởng chuyên môn đánh giá --</option>
                              {ttcmEvaluators.map(ttcm => (
                                <option key={ttcm.id} value={ttcm.id}>
                                  {ttcm.displayLabel}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-indigo-700 italic mt-1">
                              Vui lòng chọn trực tiếp Tổ trưởng chuyên môn chịu trách nhiệm đánh giá.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* FIXED FOOTER */}
          <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              ← Quay lại
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBatchCreateForms(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Save size={16} /> Lưu nháp
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBatchCreateForms(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-2 scale-105"
              >
                <CheckCircle2 size={18} /> {isSubmitting ? 'Đang tạo phiếu...' : '✓ Lưu phiếu'}
              </button>
            </div>
          </footer>

        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: SINGLE FORM DOCUMENT MODAL (FOR EDIT / SELF_EVAL / LEADER_EVAL / VIEW)
  // =========================================================================
  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-[2000] flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      
      {/* Container phiếu */}
      <div 
        id="kpi-vc-document-modal" 
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden border border-slate-200 font-sans"
        style={{ zoom: zoomLevel }}
      >
        
        {/* MODAL ACTION BAR TRÊN CÙNG */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {mode === 'edit' && `CHỈNH SỬA PHIẾU KPI: ${form?.employeeName}`}
                {mode === 'self_eval' && `TỰ CHẤM ĐIỂM KPI: ${form?.employeeName}`}
                {mode === 'leader_eval' && `Ý KIẾN ĐÁNH GIÁ CỦA LÃNH ĐẠO: ${form?.employeeName}`}
                {mode === 'view' && `XEM CHI TIẾT PHIẾU ĐÁNH GIÁ: ${form?.employeeName}`}
                
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                    <Lock size={12} /> Đã khóa
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-blue-200">
                Trường THPT Minh Hòa • Mẫu chuẩn viên chức không giữ chức vụ quản lý
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white">
              <span className="hidden sm:inline">Thu phóng:</span>
              <button 
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs cursor-pointer font-mono"
                title="Thu nhỏ"
              >-</button>
              <span className="px-1 font-mono text-xs">{Math.round(zoomLevel * 100)}%</span>
              <button 
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.1).toFixed(1))))}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs cursor-pointer font-mono"
                title="Phóng to"
              >+</button>
            </div>

            {form && onPrintRequest && (
              <button
                type="button"
                onClick={() => onPrintRequest(form)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Printer size={15} /> In phiếu
              </button>
            )}

            {isAdmin && form && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Bạn có chắc chắn muốn ${isLocked ? 'mở khóa' : 'khóa'} phiếu đánh giá này?`)) {
                    await toggleLockVcForm(form.id, !isLocked, {
                      id: user?.id || 'admin',
                      name: user?.name || 'Admin',
                      role: user?.role
                    });
                    if (onSaved) onSaved(form.id);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isLocked 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                {isLocked ? 'Mở khóa' : 'Khóa phiếu'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* REALTIME SCORE BAR (STICKY COUNTER) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Nhóm I (Tư tưởng, đạo đức):</span>
              <span className="font-extrabold text-blue-700">{groupScores.group_I || 0} / 15</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Nhóm II (Tác phong, kỷ luật):</span>
              <span className="font-extrabold text-indigo-700">{groupScores.group_II || 0} / 15</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Nhóm III (Kết quả thực hiện):</span>
              <span className="font-extrabold text-emerald-700">{groupScores.group_III || 0} / 70</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border-2 border-blue-600/30 rounded-xl px-3 py-1 shadow-xs flex items-center gap-2">
              <span className="text-slate-500 uppercase text-[10px] font-extrabold">TỔNG ĐIỂM:</span>
              <span className="text-base font-black text-blue-900 font-mono">
                {totalScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1 text-blue-900 font-bold text-[11px]">
              {selfClassification}
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NỘI DUNG VĂN BẢN TRANG A4 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 custom-scrollbar">
          
          <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto text-slate-900 font-sans text-xs sm:text-sm">
            
            {/* 1. HEADER CƠ QUAN VÀ QUỐC HIỆU */}
            <div className="flex justify-between items-start text-center mb-6">
              <div className="w-5/12 text-center">
                <p className="text-xs sm:text-[13px] uppercase font-bold">SỞ GD&ĐT PHÚ THỌ</p>
                <p className="text-xs sm:text-sm uppercase font-bold text-slate-900">TRƯỜNG THPT MINH HÒA</p>
                <div className="w-24 h-[1px] bg-slate-800 mx-auto mt-1" />
              </div>

              <div className="w-6/12 text-center">
                <p className="text-xs sm:text-[13px] uppercase font-bold tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-xs sm:text-[13px] font-bold underline">Độc lập – Tự do – Hạnh phúc</p>
              </div>
            </div>

            {/* 2. TIÊU ĐỀ PHIẾU */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-base sm:text-lg font-extrabold uppercase text-slate-900 leading-tight tracking-wide">
                PHIẾU ĐÁNH GIÁ, CHẤM ĐIỂM KPI GIÁO VIÊN NĂM HỌC {form ? form.academicYear : (selectedPeriod?.academicYear || '2026–2027')}
              </h1>
              <p className="text-xs sm:text-sm font-semibold italic text-slate-700">
                (Dự thảo vận hành – đề nghị nhà trường xác nhận trước khi ban hành)
              </p>
            </div>

            {/* 3. THÔNG TIN VIÊN CHỨC */}
            <div className="border border-slate-300 bg-slate-50/50 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên:</label>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm flex items-center justify-between">
                    <div>
                      <span>{form?.employeeName}</span>
                      {form?.employeeCode && (
                        <span className="text-xs text-slate-500 font-normal ml-2">
                          ({form.employeeCode})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức vụ / môn:</label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                    {resolvedPosition} {form?.subject ? `• Môn ${form.subject}` : ''}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tổ chuyên môn:</label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                    {resolvedDepartment}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỳ đánh giá:</label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs sm:text-sm">
                    {form?.periodName} ({form?.academicYear})
                  </div>
                </div>

                {/* THÔNG TIN 02 CẤP ĐÁNH GIÁ (CẤP 1: TỔ TRƯỞNG CHUYÊN MÔN - CẤP 2: BAN GIÁM HIỆU) */}
                <div className="col-span-1 md:col-span-2 border-t border-slate-200 pt-3 mt-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-900 block text-xs sm:text-sm flex items-center gap-2">
                      <Users size={16} className="text-indigo-600" />
                      CÁN BỘ QUẢN LÝ ĐÁNH GIÁ (02 CẤP ĐÁNH GIÁ ĐỒNG THỜI TRÊN PHIẾU)
                    </label>
                    <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Tổ chuyên môn & Ban Giám hiệu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* CẤP 1: TỔ TRƯỞNG CHUYÊN MÔN */}
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                          Cấp 1: Tổ trưởng chuyên môn
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          form?.ttcmStatus === 'evaluated' || hasAnyTtcmScore
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {form?.ttcmStatus === 'evaluated' || hasAnyTtcmScore ? '✓ Đã đánh giá' : '⏳ Chưa đánh giá'}
                        </span>
                      </div>
                      <div className="pt-1 flex items-baseline justify-between">
                        <div>
                          <p className="text-[11px] text-slate-500">Người đánh giá:</p>
                          <p className="font-extrabold text-purple-950 text-xs sm:text-sm">
                            {form?.ttcmEvaluatorName || 'Tổ trưởng chuyên môn'}
                          </p>
                          <p className="text-[10.5px] text-purple-700 font-medium">
                            {form?.ttcmEvaluatorDepartment || form?.department || resolvedDepartment}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-500">Điểm cấp Tổ:</p>
                          <p className="font-black text-purple-900 font-mono text-sm sm:text-base">
                            {hasAnyTtcmScore ? `${ttcmTotalScore} / 100` : '--- / 100'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CẤP 2: BAN GIÁM HIỆU */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                          Cấp 2: Ban Giám hiệu
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          form?.bghStatus === 'evaluated' || hasAnyManagerScore
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {form?.bghStatus === 'evaluated' || hasAnyManagerScore ? '✓ Đã đánh giá' : '⏳ Chưa đánh giá'}
                        </span>
                      </div>
                      <div className="pt-1 flex items-baseline justify-between">
                        <div>
                          <p className="text-[11px] text-slate-500">Người đánh giá:</p>
                          <p className="font-extrabold text-blue-950 text-xs sm:text-sm">
                            {form?.bghEvaluatorName || form?.evaluatorName || leaderSignName || 'Nguyễn Quang Sáng'}
                          </p>
                          <p className="text-[10.5px] text-blue-700 font-medium">
                            {form?.bghEvaluatorRole || form?.evaluatorRole || 'Hiệu trưởng'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-500">Điểm cấp BGH:</p>
                          <p className="font-black text-blue-900 font-mono text-sm sm:text-base">
                            {hasAnyManagerScore ? `${managerTotalScore} / 100` : '--- / 100'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CĂN CỨ VĂN BẢN HƯỚNG DẪN */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 mb-6 text-xs text-slate-700 text-justify leading-relaxed">
              <p>
                <strong>Căn cứ:</strong> Căn cứ mẫu Phiếu đánh giá, chấm điểm năm học 2025–2026 của Trường THPT Minh Hòa, phiếu này giữ cấu trúc 100 điểm gồm: (I) Chính trị tư tưởng, đạo đức lối sống 15 điểm; (II) Tác phong, lề lối làm việc, ý thức tổ chức kỷ luật 15 điểm; (III) Kết quả thực hiện nhiệm vụ 70 điểm. Các nhiệm vụ ở phần III được chi tiết hóa để thuận lợi cho tự đánh giá, đánh giá của tổ chuyên môn và BGH. Các mức điểm KPI chi tiết dưới đây là đề xuất quản trị nội bộ, cần được nhà trường xác nhận trước khi áp dụng chính thức.
              </p>
            </div>

            {/* 4. TIÊU ĐỀ PHẦN A. NỘI DUNG CHẤM ĐIỂM */}
            <div className="my-5">
              <h2 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 tracking-wide">
                A. NỘI DUNG CHẤM ĐIỂM
              </h2>
            </div>

            {/* 5. BẢNG CHẤM ĐIỂM CHUẨN */}
            <div className="border border-slate-400 rounded-lg overflow-x-auto mb-8">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-200/90 text-slate-900 border-b border-slate-400 font-bold text-center text-xs">
                    <th className="p-2 border-r border-slate-400 w-10">Stt</th>
                    <th className="p-2 border-r border-slate-400 text-left min-w-[200px]">Nội dung đánh giá</th>
                    <th className="p-2 border-r border-slate-400 w-16">Tối đa</th>
                    <th className="p-2 border-r border-slate-400 bg-blue-50/70 text-blue-950 font-extrabold w-24">
                      Tự chấm
                    </th>
                    <th className="p-2 border-r border-slate-400 bg-purple-50/70 text-purple-950 font-extrabold w-24">
                      TTCM đánh giá
                    </th>
                    <th className="p-2 border-r border-slate-400 bg-amber-50/70 text-amber-950 font-extrabold w-24">
                      CBQL đánh giá
                    </th>
                    <th className="p-2 text-slate-800 text-left min-w-[120px]">Ghi chú / Minh chứng</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-300 text-xs">
                  {activeGroups.map((group) => {
                    const groupCriteria = activeCriteria.filter(c => c.groupId === group.id);
                    const groupScore = groupScores[group.id] || 0;
                    const groupTtcmScore = ttcmGroupScores[group.id] || 0;
                    const groupMgrScore = managerGroupScores[group.id] || 0;

                    return (
                      <React.Fragment key={group.id}>
                        <tr className="bg-slate-100/95 font-extrabold text-slate-900 border-y border-slate-400">
                          <td className="p-2 text-center font-bold border-r border-slate-400 uppercase">
                            {group.code}
                          </td>
                          <td className="p-2 border-r border-slate-400 uppercase font-bold text-blue-950">
                            {group.name}
                          </td>
                          <td className="p-2 text-center border-r border-slate-400 font-bold text-slate-900 font-mono">
                            {group.maxScore}
                          </td>
                          <td className="p-2 text-center border-r border-slate-400 bg-blue-50/50 font-extrabold text-blue-900 font-mono">
                            {groupScore} / {group.maxScore}
                          </td>
                          <td className="p-2 text-center border-r border-slate-400 bg-purple-50/50 font-extrabold text-purple-900 font-mono">
                            {hasAnyTtcmScore || canEditTtcm ? `${groupTtcmScore} / ${group.maxScore}` : '---'}
                          </td>
                          <td className="p-2 text-center border-r border-slate-400 bg-amber-50/50 font-extrabold text-amber-900 font-mono">
                            {hasAnyManagerScore || canEditManager ? `${groupMgrScore} / ${group.maxScore}` : '---'}
                          </td>
                          <td className="p-2 bg-slate-50"></td>
                        </tr>

                        {groupCriteria.map((criterion, cIdx) => {
                          const itemScore = scoreItems.find(it => it.criterionId === criterion.id);
                          const currentSelfScore = itemScore?.selfScore ?? criterion.maxScore;
                          const currentTtcmScore = itemScore?.ttcmScore;
                          const currentManagerScore = itemScore?.managerScore;

                          const isSubGroupA = group.id === 'group_III' && (criterion.subGroup === 'A' || criterion.code.startsWith('III.1'));
                          const isSubGroupB = group.id === 'group_III' && (criterion.subGroup === 'B' || !criterion.code.startsWith('III.1'));

                          const isFirstIII1 = isSubGroupA && cIdx === 0;
                          const firstIII2Idx = groupCriteria.findIndex(i => i.subGroup === 'B' || !i.code.startsWith('III.1'));
                          const isFirstIII2 = isSubGroupB && cIdx === firstIII2Idx;

                          const isLastIII1 = isSubGroupA && (firstIII2Idx !== -1 ? cIdx === firstIII2Idx - 1 : cIdx === groupCriteria.length - 1);
                          const isLastIII2 = isSubGroupB && cIdx === groupCriteria.length - 1;

                          // Tính điểm mục I (Năng lực & kỹ năng: 10đ)
                          const aItems = groupCriteria.filter(i => i.subGroup === 'A' || i.code.startsWith('III.1'));
                          const aMaxTotal = aItems.reduce((acc, c) => acc + (c.maxScore || 0), 0);
                          const aSelfTotal = Math.round(aItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it ? (it.selfScore ?? c.maxScore) : c.maxScore);
                          }, 0) * 10) / 10;
                          const aTtcmTotal = Math.round(aItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it && typeof it.ttcmScore === 'number' ? it.ttcmScore : 0);
                          }, 0) * 10) / 10;
                          const aMgrTotal = Math.round(aItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it && typeof it.managerScore === 'number' ? it.managerScore : 0);
                          }, 0) * 10) / 10;

                          // Tính điểm mục II (Kết quả thực hiện nhiệm vụ được giao: 60đ)
                          const bItems = groupCriteria.filter(i => i.subGroup === 'B' || !i.code.startsWith('III.1'));
                          const bMaxTotal = bItems.reduce((acc, c) => acc + (c.maxScore || 0), 0);
                          const bSelfTotal = Math.round(bItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it ? (it.selfScore ?? c.maxScore) : c.maxScore);
                          }, 0) * 10) / 10;
                          const bTtcmTotal = Math.round(bItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it && typeof it.ttcmScore === 'number' ? it.ttcmScore : 0);
                          }, 0) * 10) / 10;
                          const bMgrTotal = Math.round(bItems.reduce((acc, c) => {
                            const it = scoreItems.find(s => s.criterionId === c.id);
                            return acc + (it && typeof it.managerScore === 'number' ? it.managerScore : 0);
                          }, 0) * 10) / 10;

                          return (
                            <React.Fragment key={criterion.id}>
                              {isFirstIII1 && (
                                <tr className="bg-slate-200/90 font-extrabold text-blue-950 border-y border-slate-300">
                                  <td className="p-2 text-center font-bold">1</td>
                                  <td colSpan={6} className="p-2 uppercase font-bold text-blue-950">
                                    I. NĂNG LỰC VÀ KỸ NĂNG LÀM VIỆC (10 ĐIỂM)
                                  </td>
                                </tr>
                              )}

                              {isFirstIII2 && (
                                <tr className="bg-slate-200/90 font-extrabold text-blue-950 border-y border-slate-300">
                                  <td className="p-2 text-center font-bold">2</td>
                                  <td colSpan={6} className="p-2 uppercase font-bold text-blue-950">
                                    II. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (60 ĐIỂM)
                                  </td>
                                </tr>
                              )}

                              <tr className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2 text-center font-semibold border-r border-slate-300">
                                {isSubGroupB && firstIII2Idx !== -1
                                  ? `${cIdx - firstIII2Idx + 1}`
                                  : (criterion.code.includes('.') ? criterion.code.split('.').slice(-1)[0] : `${cIdx + 1}`)}
                              </td>
                              <td className="p-2 border-r border-slate-300 font-medium text-slate-800">
                                {criterion.content}
                              </td>
                              <td className="p-2 text-center border-r border-slate-300 font-bold text-slate-900 font-mono">
                                {criterion.maxScore}
                              </td>

                              {/* TỰ CHẤM */}
                              <td className="p-2 text-center border-r border-slate-300 bg-blue-50/30">
                                {canEditSelf ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={criterion.maxScore}
                                    step={0.5}
                                    value={itemScore?.selfScore ?? criterion.maxScore}
                                    onChange={(e) => handleSelfScoreChange(criterion.id, Math.min(criterion.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-14 p-1 text-center font-bold bg-white border border-blue-300 rounded text-blue-900 focus:ring-2 focus:ring-blue-500 font-mono"
                                  />
                                ) : (
                                  <span className="font-bold text-blue-900 font-mono">{currentSelfScore}</span>
                                )}
                              </td>

                              {/* TTCM ĐÁNH GIÁ */}
                              <td className="p-2 text-center border-r border-slate-300 bg-purple-50/30">
                                {canEditTtcm ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={criterion.maxScore}
                                    step={0.5}
                                    value={currentTtcmScore ?? ''}
                                    onChange={(e) => handleTtcmScoreChange(criterion.id, Math.min(criterion.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-14 p-1 text-center font-bold bg-white border border-purple-300 rounded text-purple-950 focus:ring-2 focus:ring-purple-500 font-mono"
                                    placeholder="Điểm"
                                  />
                                ) : (
                                  <span className="font-bold text-purple-950 font-mono">
                                    {typeof currentTtcmScore === 'number' ? currentTtcmScore : '---'}
                                  </span>
                                )}
                              </td>

                              {/* CBQL ĐÁNH GIÁ */}
                              <td className="p-2 text-center border-r border-slate-300 bg-amber-50/30">
                                {canEditManager ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={criterion.maxScore}
                                    step={0.5}
                                    value={currentManagerScore ?? ''}
                                    onChange={(e) => handleManagerScoreChange(criterion.id, Math.min(criterion.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-14 p-1 text-center font-bold bg-white border border-amber-300 rounded text-amber-950 focus:ring-2 focus:ring-amber-500 font-mono"
                                    placeholder="Điểm"
                                  />
                                ) : (
                                  <span className="font-bold text-amber-950 font-mono">
                                    {typeof currentManagerScore === 'number' ? currentManagerScore : '---'}
                                  </span>
                                )}
                              </td>

                              {/* GHI CHÚ */}
                              <td className="p-2 text-left">
                                {canEditSelf || canEditTtcm || canEditManager ? (
                                  <input
                                    type="text"
                                    value={itemScore?.note || ''}
                                    onChange={(e) => handleNoteChange(criterion.id, e.target.value)}
                                    placeholder="Minh chứng / Ghi chú..."
                                    className="w-full p-1 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-slate-600 italic text-[11px]">{itemScore?.note || '---'}</span>
                                )}
                              </td>
                            </tr>

                            {/* DÒNG TỔNG MỤC I */}
                            {isLastIII1 && (
                              <tr className="bg-slate-100 font-bold text-slate-800 border-y border-slate-300">
                                <td className="p-2 text-center font-bold"></td>
                                <td className="p-2 font-bold uppercase text-slate-700">
                                  Tổng mục I: {aSelfTotal}/{aMaxTotal} điểm
                                </td>
                                <td className="p-2 text-center font-bold font-mono">
                                  {aMaxTotal}
                                </td>
                                <td className="p-2 text-center font-bold text-blue-900 font-mono bg-blue-50/60">
                                  {aSelfTotal} / {aMaxTotal}
                                </td>
                                <td className="p-2 text-center font-bold text-purple-900 font-mono bg-purple-50/60">
                                  {hasAnyTtcmScore || canEditTtcm ? `${aTtcmTotal} / ${aMaxTotal}` : '---'}
                                </td>
                                <td className="p-2 text-center font-bold text-amber-900 font-mono bg-amber-50/60">
                                  {hasAnyManagerScore || canEditManager ? `${aMgrTotal} / ${aMaxTotal}` : '---'}
                                </td>
                                <td className="p-2 bg-slate-50"></td>
                              </tr>
                            )}

                            {/* DÒNG TỔNG MỤC II (60 ĐIỂM) */}
                            {isLastIII2 && (
                              <tr className="bg-blue-50/90 font-extrabold text-blue-950 border-y-2 border-blue-300">
                                <td className="p-2 text-center font-bold"></td>
                                <td className="p-2 font-black uppercase text-blue-900 tracking-wide">
                                  Tổng mục II: {bSelfTotal}/{bMaxTotal} điểm
                                </td>
                                <td className="p-2 text-center font-black text-slate-900 font-mono">
                                  {bMaxTotal}
                                </td>
                                <td className="p-2 text-center font-black text-blue-900 font-mono bg-blue-100/70">
                                  {bSelfTotal} / {bMaxTotal}
                                </td>
                                <td className="p-2 text-center font-black text-purple-900 font-mono bg-purple-100/70">
                                  {hasAnyTtcmScore || canEditTtcm ? `${bTtcmTotal} / ${bMaxTotal}` : '---'}
                                </td>
                                <td className="p-2 text-center font-black text-amber-900 font-mono bg-amber-100/70">
                                  {hasAnyManagerScore || canEditManager ? `${bMgrTotal} / ${bMaxTotal}` : '---'}
                                </td>
                                <td className="p-2 bg-blue-50/50"></td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot className="divide-y divide-slate-300 text-xs font-bold bg-slate-100">
                  <tr className="bg-slate-200 font-extrabold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={2} className="p-2 text-right uppercase font-black">
                      TỔNG ĐIỂM TỐI ĐA:
                    </td>
                    <td className="p-2 text-center font-black font-mono">100</td>
                    <td className="p-2 text-center bg-blue-100/70 font-black text-blue-950 font-mono">100</td>
                    <td className="p-2 text-center bg-purple-100/70 font-black text-purple-950 font-mono">100</td>
                    <td className="p-2 text-center bg-amber-100/70 font-black text-amber-950 font-mono">100</td>
                    <td className="p-2"></td>
                  </tr>

                  <tr className="bg-blue-50/80 text-blue-950 border-t border-slate-300">
                    <td colSpan={3} className="p-2 text-right font-bold uppercase">
                      TỔNG GIÁO VIÊN TỰ CHẤM:
                    </td>
                    <td colSpan={3} className="p-2 text-left font-black text-blue-900 font-mono text-sm">
                      {totalScore} / 100
                    </td>
                    <td className="p-2"></td>
                  </tr>

                  <tr className="bg-purple-50/80 text-purple-950 border-t border-slate-300">
                    <td colSpan={3} className="p-2 text-right font-bold uppercase">
                      TỔNG TTCM ĐÁNH GIÁ:
                    </td>
                    <td colSpan={3} className="p-2 text-left font-black text-purple-900 font-mono text-sm">
                      {hasAnyTtcmScore ? `${ttcmTotalScore} / 100` : '___ / 100'}
                    </td>
                    <td className="p-2"></td>
                  </tr>

                  <tr className="bg-amber-50/80 text-amber-950 border-t border-slate-300">
                    <td colSpan={3} className="p-2 text-right font-bold uppercase">
                      TỔNG CBQL ĐÁNH GIÁ:
                    </td>
                    <td colSpan={3} className="p-2 text-left font-black text-amber-900 font-mono text-sm">
                      {hasAnyManagerScore ? `${managerTotalScore} / 100` : '___ / 100'}
                    </td>
                    <td className="p-2"></td>
                  </tr>

                  <tr className="bg-emerald-100/90 text-emerald-950 border-t-2 border-emerald-600 text-sm font-extrabold">
                    <td colSpan={3} className="p-2.5 text-right font-black uppercase text-emerald-950">
                      ĐIỂM ĐÁNH GIÁ CUỐI CÙNG:
                    </td>
                    <td colSpan={3} className="p-2.5 text-left font-black text-emerald-900 font-mono text-base">
                      {hasAnyManagerScore ? managerTotalScore : (hasAnyTtcmScore ? ttcmTotalScore : totalScore)} / 100
                    </td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT */}
            <div className="border border-slate-300 rounded-xl p-4 sm:p-5 mb-6 bg-slate-50/70 space-y-2">
              <h3 className="font-extrabold text-slate-900 uppercase text-xs sm:text-sm tracking-wide border-b border-slate-200 pb-2">
                QUY TẮC CHẤM ĐIỂM ĐỀ XUẤT
              </h3>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed font-medium">
                <li>Giáo viên tự chấm dựa trên kết quả thực hiện thực tế và minh chứng; không tự chấm chỉ dựa vào cảm nhận.</li>
                <li>Mỗi nhiệm vụ được chấm trong phạm vi điểm tối đa của dòng đó; không cộng vượt 100 điểm.</li>
                <li>Nhiệm vụ không được giao hoặc không phát sinh theo vị trí việc làm được đánh dấu “N/A – Không áp dụng”, không quy về 0 điểm; tổng điểm được chuẩn hóa theo các nhiệm vụ áp dụng.</li>
                <li>Kết quả học tập của học sinh chỉ là một nguồn minh chứng cho chất lượng và sự tiến bộ, không sử dụng điểm thi/điểm trung bình của học sinh làm tiêu chí duy nhất để quy trách nhiệm cho giáo viên.</li>
                <li>Nhiệm vụ chủ nhiệm/kiêm nhiệm chỉ áp dụng đối với giáo viên được phân công.</li>
                <li>Khi có vi phạm nghiêm trọng, việc xử lý điểm phải căn cứ quy định của nhà trường và quy định hiện hành; không tự động suy diễn từ một chỉ số đơn lẻ.</li>
              </ol>
            </div>

            {/* GỢI Ý XẾP LOẠI KPI NỘI BỘ */}
            <div className="border border-slate-300 rounded-xl p-4 sm:p-5 mb-8 bg-white space-y-3">
              <h3 className="font-extrabold text-slate-900 uppercase text-xs sm:text-sm tracking-wide">
                Gợi ý xếp loại KPI nội bộ (CẦN NHÀ TRƯỜNG XÁC NHẬN)
              </h3>
              <div className="border border-slate-300 rounded-lg overflow-hidden max-w-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 w-1/2">Tổng điểm KPI</th>
                      <th className="p-2">Mức xếp loại đề xuất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr>
                      <td className="p-2 border-r border-slate-200">Dưới 70</td>
                      <td className="p-2 text-rose-700 font-bold">Chưa hoàn thành</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200">70 đến dưới 85</td>
                      <td className="p-2 text-blue-700 font-bold">Hoàn thành</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200">85 đến dưới 95</td>
                      <td className="p-2 text-indigo-700 font-bold">Hoàn thành tốt</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="p-2 border-r border-slate-200">95 đến 100</td>
                      <td className="p-2 text-emerald-800 font-extrabold">Hoàn thành xuất sắc</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* B. TỰ ĐÁNH GIÁ VÀ XẾP LOẠI */}
            <div className="border border-slate-300 rounded-xl p-4 sm:p-5 mb-8 bg-blue-50/20 space-y-4">
              <h3 className="font-extrabold text-blue-950 uppercase text-xs sm:text-sm tracking-wide">
                B. KẾT QUẢ TỰ ĐÁNH GIÁ VÀ XẾP LOẠI CÁ NHÂN
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cá nhân tự xếp loại chất lượng:</label>
                  {canEditSelf ? (
                    <select
                      value={selfClassification}
                      onChange={(e) => setSelfClassification(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg font-bold text-blue-900">
                      {selfClassification}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ý kiến / Ý kiến tự nhận xét của viên chức:</label>
                  {canEditSelf ? (
                    <textarea
                      rows={2}
                      value={selfComment}
                      onChange={(e) => setSelfComment(e.target.value)}
                      placeholder="Nhập ý kiến tự đánh giá..."
                      className="w-full p-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  ) : (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg italic text-slate-700 text-xs">
                      {selfComment || 'Không có ý kiến thêm.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* C. ĐÁNH GIÁ, XẾP LOẠI CỦA TỔ TRƯỞNG CHUYÊN MÔN (CẤP TỔ) */}
            <div className="border border-purple-300 rounded-xl p-4 sm:p-5 mb-6 bg-purple-50/30 space-y-4">
              <h3 className="font-extrabold text-purple-950 uppercase text-xs sm:text-sm tracking-wide flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">C</span>
                  <span>ĐÁNH GIÁ, XẾP LOẠI CỦA TỔ TRƯỞNG CHUYÊN MÔN (CẤP TỔ)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-purple-900 bg-purple-200/80 px-2.5 py-0.5 rounded-full border border-purple-300 font-mono">
                    Điểm cấp Tổ chấm: {hasAnyTtcmScore ? `${ttcmTotalScore} / 100` : 'Chưa chấm'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    form?.ttcmStatus === 'evaluated' || hasAnyTtcmScore 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {form?.ttcmStatus === 'evaluated' || hasAnyTtcmScore ? '✓ Đã đánh giá' : '⏳ Chưa đánh giá'}
                  </span>
                </div>
              </h3>

              <div className="p-2.5 bg-white border border-purple-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">Người đánh giá cấp Tổ:</span>{' '}
                  <strong className="text-purple-950 font-bold">{form?.ttcmEvaluatorName || 'Tổ trưởng chuyên môn'}</strong>
                  <span className="text-slate-500 ml-2">({form?.ttcmEvaluatorDepartment || form?.department || resolvedDepartment})</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Thời điểm đánh giá: <strong className="text-slate-700">{form?.ttcmEvaluatedAt ? new Date(form.ttcmEvaluatedAt).toLocaleDateString('vi-VN') : (ttcmDate || 'Chưa đánh giá')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">Tổ trưởng xếp loại chất lượng viên chức:</label>
                  {canEditTtcm ? (
                    <select
                      value={ttcmClassification}
                      onChange={(e) => setTtcmClassification(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-white border border-purple-200 rounded-lg font-bold text-purple-950">
                      {ttcmClassification || 'Chưa đánh giá'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-purple-950 mb-1">Ý kiến đánh giá, nhận xét của Tổ trưởng:</label>
                  {canEditTtcm ? (
                    <textarea
                      rows={2}
                      value={ttcmComment}
                      onChange={(e) => setTtcmComment(e.target.value)}
                      placeholder="Nhập nhận xét của Tổ trưởng về chuyên môn, tinh thần trách nhiệm..."
                      className="w-full p-2 text-xs bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  ) : (
                    <div className="p-2.5 bg-white border border-purple-200 rounded-lg italic text-purple-950 text-xs">
                      {ttcmComment || 'Chưa có nhận xét của Tổ trưởng.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* D. ĐÁNH GIÁ, XẾP LOẠI CỦA BAN GIÁM HIỆU (CẤP TRƯỜNG) */}
            <div className="border border-blue-300 rounded-xl p-4 sm:p-5 mb-8 bg-blue-50/30 space-y-4">
              <h3 className="font-extrabold text-blue-950 uppercase text-xs sm:text-sm tracking-wide flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">D</span>
                  <span>ĐÁNH GIÁ, XẾP LOẠI CỦA BAN GIÁM HIỆU (CẤP TRƯỜNG)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-900 bg-blue-200/80 px-2.5 py-0.5 rounded-full border border-blue-300 font-mono">
                    Điểm cấp BGH chấm: {hasAnyManagerScore ? `${managerTotalScore} / 100` : 'Chưa chấm'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    form?.bghStatus === 'evaluated' || hasAnyManagerScore 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {form?.bghStatus === 'evaluated' || hasAnyManagerScore ? '✓ Đã đánh giá' : '⏳ Chưa đánh giá'}
                  </span>
                </div>
              </h3>

              <div className="p-2.5 bg-white border border-blue-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">Người đánh giá cấp BGH:</span>{' '}
                  <strong className="text-blue-950 font-bold">{form?.bghEvaluatorName || form?.evaluatorName || leaderSignName || 'Nguyễn Quang Sáng'}</strong>
                  <span className="text-slate-500 ml-2">({form?.bghEvaluatorRole || form?.evaluatorRole || 'Hiệu trưởng'})</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Thời điểm đánh giá: <strong className="text-slate-700">{form?.managerEvaluatedAt ? new Date(form.managerEvaluatedAt).toLocaleDateString('vi-VN') : (leaderDate || 'Chưa đánh giá')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-blue-950 mb-1">Ban Giám hiệu xếp loại chất lượng viên chức:</label>
                  {canEditManager ? (
                    <select
                      value={leaderClassification}
                      onChange={(e) => setLeaderClassification(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg font-bold text-blue-950">
                      {leaderClassification || 'Chưa đánh giá'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-blue-950 mb-1">Ý kiến đánh giá, nhận xét của Ban Giám hiệu:</label>
                  {canEditManager ? (
                    <textarea
                      rows={2}
                      value={leaderComment}
                      onChange={(e) => setLeaderComment(e.target.value)}
                      placeholder="Nhập nhận xét ưu, khuyết điểm của Ban Giám hiệu..."
                      className="w-full p-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  ) : (
                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg italic text-blue-950 text-xs">
                      {leaderComment || 'Chưa có nhận xét của Ban Giám hiệu.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CHỮ KÝ XÁC NHẬN - 3 KHỐI CHỮ KÝ CHUẨN THEO PDF */}
            <div className="pt-6 border-t border-slate-300 mt-6 space-y-4">
              <p className="text-right italic text-slate-600 text-xs">
                Minh Hòa, ngày {selfDate ? selfDate.split('/')[0] || '...' : '...'} tháng {selfDate ? selfDate.split('/')[1] || '...' : '...'} năm 2026
              </p>
              <div className="grid grid-cols-3 text-center gap-2">
                <div>
                  <p className="font-bold text-slate-900 uppercase text-xs sm:text-sm">NGƯỜI TỰ ĐÁNH GIÁ</p>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <div className="h-20 flex items-center justify-center font-bold text-blue-900 text-xs sm:text-sm">
                    {form?.employeeName || selectedTeacher?.name}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-purple-950 uppercase text-xs sm:text-sm">TỔ TRƯỞNG CHUYÊN MÔN</p>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <div className="h-20 flex items-center justify-center font-bold text-purple-950 text-xs sm:text-sm">
                    {form?.ttcmEvaluatorName || '....................'}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-blue-950 uppercase text-xs sm:text-sm">BAN GIÁM HIỆU PHÊ DUYỆT</p>
                  <p className="font-extrabold text-blue-900 uppercase text-xs">DUYỆT</p>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16 flex items-center justify-center font-bold text-blue-900 text-xs sm:text-sm">
                    {form?.bghEvaluatorName || form?.evaluatorName || leaderSignName || selectedEvaluator?.name || 'Hiệu trưởng / Phó HT'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION FOOTER FOR SINGLE FORM */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-inner">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-3">
            {canEditSelf && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSingleSave('self_evaluated')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Save size={16} /> Lưu phiếu
              </button>
            )}

            {canEditManager && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSingleSave('completed')}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Chốt lưu phiếu đánh giá
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
