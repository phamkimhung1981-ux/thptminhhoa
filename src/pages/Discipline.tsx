import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import BackButton from '../components/ui/BackButton';
import { 
  Search, Plus, Filter, X, Check, AlertCircle, Edit2, Trash2, 
  Settings, Eye, ShieldCheck, UserCheck, MessageSquare, AlertTriangle,
  User, CheckCircle2, Calendar, FileText, Loader2, CheckSquare, Square,
  Building, Users, Download, FileSpreadsheet
} from 'lucide-react';
import { DisciplineRecord, Teacher, DisciplineCriterion } from '../types';
import CriteriaManagerModal from '../components/discipline/CriteriaManagerModal';
import EvaluationDetailModal, { EvaluationSessionData } from '../components/discipline/EvaluationDetailModal';
import DisciplineExportModal from '../components/discipline/DisciplineExportModal';
import { safeFormatLocale } from '../utils/dateUtils';

export default function Discipline() {
  const { 
    disciplineRecords, 
    disciplineCriteria,
    teachers, 
    departments, 
    addDisciplineRecord, 
    addDisciplineRecords,
    deleteDisciplineRecord,
    deleteDisciplineRecords 
  } = useAppContext();
  
  const { user: authUser } = useAuth();

  // Role switching / testing support
  // Cho phép kiểm thử linh hoạt giữa BGH và TTCM các tổ theo yêu cầu
  const [activeRoleOverride, setActiveRoleOverride] = useState<'BGH' | 'TTCM' | null>(null);
  const [activeDeptOverride, setActiveDeptOverride] = useState<string | null>(null);

  // Xác định vai trò hiệu lực
  const effectiveRole: 'BGH' | 'TTCM' = useMemo(() => {
    if (activeRoleOverride) return activeRoleOverride;
    if (authUser?.role === 'TTCM') return 'TTCM';
    return 'BGH'; // Default là BGH / Admin
  }, [activeRoleOverride, authUser]);

  const isBgh = effectiveRole === 'BGH';
  const isTtcm = effectiveRole === 'TTCM';

  // Danh sách đầy đủ các tổ chuyên môn & văn phòng (luôn đảm bảo có Tổ Văn phòng)
  const displayDepartments = useMemo(() => {
    const list = [...departments];
    const hasVanPhong = list.some(d => 
      d.id === 'd_van_phong' || 
      d.id === 'van_phong' || 
      d.id === 'vp' || 
      d.name.toLowerCase().includes('văn phòng')
    );
    if (!hasVanPhong) {
      list.push({
        id: 'd_van_phong',
        name: 'Tổ Văn phòng',
        headId: ''
      });
    }
    return list;
  }, [departments]);

  // Kiểm tra giáo viên thuộc tổ chuyên môn/văn phòng
  const isTeacherInDept = (teacher: Teacher | undefined, dept: { id: string; name: string }) => {
    if (!teacher) return false;
    const tDeptId = teacher.departmentId;
    const tDeptName = (teacher.departmentName || '').toLowerCase();
    const tSubj = (teacher.subject || '').toLowerCase();
    const tPos = (teacher.position || '').toLowerCase();

    const isVanPhongDept = dept.id === 'd_van_phong' || 
                           dept.id === 'van_phong' || 
                           dept.id === 'vp' || 
                           dept.id === 'd4' ||
                           dept.name.toLowerCase().includes('văn phòng');

    if (isVanPhongDept) {
      if (
        tDeptId === 'd_van_phong' || 
        tDeptId === 'van_phong' || 
        tDeptId === 'vp' || 
        tDeptId === 'd4' ||
        tDeptName.includes('văn phòng') ||
        tDeptName.includes('hành chính') ||
        tSubj.includes('văn phòng') ||
        tPos.match(/(kế toán|văn thư|thủ quỹ|y tế|thư viện|thiết bị|bảo vệ|phục vụ|hành chính|nhân viên|tổ văn phòng)/i)
      ) {
        return true;
      }
      if (!tDeptId) {
        const isAcademic = displayDepartments.some(d => 
          d.id !== dept.id && 
          (d.name.toLowerCase().includes(tSubj) || (tDeptName && d.name.toLowerCase().includes(tDeptName)))
        );
        if (!isAcademic) return true;
      }
    }

    if (tDeptId === dept.id) return true;
    if (tDeptName && dept.name.toLowerCase().includes(tDeptName)) return true;
    if (tDeptName && tDeptName.includes(dept.name.toLowerCase())) return true;

    return false;
  };

  const getTeacherDeptId = (teacher: Teacher | undefined): string => {
    if (!teacher) return 'd_van_phong';
    const found = displayDepartments.find(d => isTeacherInDept(teacher, d));
    return found?.id || teacher.departmentId || 'd_van_phong';
  };

  // Xác định tổ chuyên môn của TTCM (nếu vai trò là TTCM)
  const ttcmDeptId = useMemo(() => {
    if (activeDeptOverride) return activeDeptOverride;
    if (authUser?.departmentId) return authUser.departmentId;
    return displayDepartments[0]?.id || '';
  }, [activeDeptOverride, authUser, displayDepartments]);

  const currentTtcmDepartment = displayDepartments.find(d => d.id === ttcmDeptId);

  // State bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [selectedDeptFilterIds, setSelectedDeptFilterIds] = useState<string[]>([]); // Hộp kiểm lọc theo Tổ chuyên môn & Văn phòng
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'HasBgh' | 'OnlyTtcm' | 'Legacy'>('All');

  // Modals state
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<EvaluationSessionData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<EvaluationSessionData | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<EvaluationSessionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto clear toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Bảng danh sách - chọn hàng loạt bằng hộp kiểm
  const [selectedSessionKeys, setSelectedSessionKeys] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Warning modal khi lưu thiếu nhận xét
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [uncommentedCount, setUncommentedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form state & Hộp kiểm danh sách CBGVNV được đánh giá
  const [selectionMode, setSelectionMode] = useState<'batch' | 'single'>('batch');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearchText, setTeacherSearchText] = useState('');
  const [formData, setFormData] = useState<{
    teacherId: string;
    date: string;
    ttcmComments: Record<string, string>; // criterionId -> comment
    bghComments: Record<string, string>;  // criterionId -> comment
    ttcmGeneralNote: string;
    bghGeneralNote: string;
  }>({
    teacherId: '',
    date: new Date().toISOString().split('T')[0],
    ttcmComments: {},
    bghComments: {},
    ttcmGeneralNote: '',
    bghGeneralNote: ''
  });

  // Tra cứu thông tin giáo viên theo teacherId
  const getTeacher = (teacherId: string): Teacher | undefined => {
    if (!teacherId) return undefined;
    return teachers.find(
      t => t.id === teacherId || (t as any).docId === teacherId || t.code === teacherId
    );
  };

  // Tra cứu tên tổ chuyên môn
  const getDepartmentName = (teacherId: string, fallbackDeptId?: string) => {
    const teacher = getTeacher(teacherId);
    if (teacher) {
      const foundDept = displayDepartments.find(d => isTeacherInDept(teacher, d));
      if (foundDept) return foundDept.name;
    }
    if (fallbackDeptId) {
      const found = displayDepartments.find(d => d.id === fallbackDeptId);
      if (found) return found.name;
      if (fallbackDeptId === 'd_van_phong' || fallbackDeptId === 'van_phong' || fallbackDeptId === 'vp') return 'Tổ Văn phòng';
    }
    return 'Tổ Văn phòng';
  };

  // Phân quyền sửa/xóa phiếu đánh giá
  const canUserManageSession = (session: EvaluationSessionData | null | undefined): boolean => {
    if (!session) return false;
    if (isBgh) return true;
    if (isTtcm) {
      if (session.departmentId === ttcmDeptId) return true;
      const teacher = getTeacher(session.teacherId);
      if (teacher && currentTtcmDepartment && isTeacherInDept(teacher, currentTtcmDepartment)) {
        return true;
      }
    }
    return true; // Cho phép quản lý nếu là người dùng có quyền trong hệ thống
  };

  // Gom các tiêu chí trong cùng 1 lần đánh giá (1 teacher, 1 ngày, 1 session)
  const allSessions: EvaluationSessionData[] = useMemo(() => {
    const sessionsMap = new Map<string, EvaluationSessionData>();

    disciplineRecords.forEach(record => {
      // Phân tách session theo giáo viên, ngày và ghi chú tổng thể nếu có
      const groupKey = `${record.teacherId}_${record.date}`;
      if (!sessionsMap.has(groupKey)) {
        sessionsMap.set(groupKey, {
          key: groupKey,
          recordIds: [],
          teacherId: record.teacherId,
          departmentId: record.departmentId,
          date: record.date,
          note: record.note || '',
          evaluations: [],
          ttcmGeneralNote: record.ttcmGeneralNote || (record.evaluatorRole === 'TTCM' ? record.note : ''),
          bghGeneralNote: record.bghGeneralNote || (record.evaluatorRole === 'BGH' ? record.note : ''),
          evaluatorRole: record.evaluatorRole || (record.inspectorId === 'u1' || record.inspectorId === 'admin' ? 'BGH' : 'TTCM')
        });
      }
      const session = sessionsMap.get(groupKey)!;
      session.recordIds.push(record.id);
      session.evaluations.push(record);
      
      // Tổng hợp ghi chú chung nếu có trong bản ghi
      if (record.ttcmGeneralNote && !session.ttcmGeneralNote) {
        session.ttcmGeneralNote = record.ttcmGeneralNote;
      }
      if (record.bghGeneralNote && !session.bghGeneralNote) {
        session.bghGeneralNote = record.bghGeneralNote;
      }
    });

    return Array.from(sessionsMap.values()).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [disciplineRecords]);

  // Bộ lọc dữ liệu chuẩn xác
  const filteredSessions = useMemo(() => {
    return allSessions.filter(session => {
      const teacher = getTeacher(session.teacherId);
      const teacherName = teacher?.name || '';
      const deptName = getDepartmentName(session.teacherId, session.departmentId);
      const deptId = getTeacherDeptId(teacher) || session.departmentId;

      // Phân quyền hiển thị: Nếu là TTCM, chỉ xem các bản ghi thuộc tổ mình
      if (isTtcm && ttcmDeptId && deptId !== ttcmDeptId) {
        return false;
      }

      // 1. Lọc theo Tổ chuyên môn (Dropdown hoặc Hộp kiểm)
      if (selectedDeptFilterIds.length > 0) {
        const matchedDepts = displayDepartments.filter(d => selectedDeptFilterIds.includes(d.id));
        const isInSelected = teacher ? matchedDepts.some(d => isTeacherInDept(teacher, d)) : selectedDeptFilterIds.includes(deptId);
        if (!isInSelected) {
          return false;
        }
      } else if (filterDepartment !== 'All') {
        const targetDept = displayDepartments.find(d => d.id === filterDepartment);
        const isInDept = teacher && targetDept ? isTeacherInDept(teacher, targetDept) : deptId === filterDepartment;
        if (!isInDept) {
          return false;
        }
      }

      // 2. Lọc theo Tháng
      if (filterMonth !== 'All') {
        const sessionMonth = session.date ? (new Date(session.date).getMonth() + 1).toString() : '';
        if (sessionMonth !== filterMonth) {
          return false;
        }
      }

      // 3. Lọc theo trạng thái
      if (filterStatus === 'HasBgh') {
        const hasBgh = Boolean(session.bghGeneralNote?.trim()) || session.evaluations.some(e => Boolean(e.bghComment?.trim()));
        if (!hasBgh) return false;
      } else if (filterStatus === 'OnlyTtcm') {
        const hasBgh = Boolean(session.bghGeneralNote?.trim()) || session.evaluations.some(e => Boolean(e.bghComment?.trim()));
        if (hasBgh) return false;
      } else if (filterStatus === 'Legacy') {
        const isLegacy = session.evaluations.some(e => Boolean(e.level));
        if (!isLegacy) return false;
      }

      // 4. Tìm kiếm theo tên giáo viên hoặc nội dung
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesTeacher = teacherName.toLowerCase().includes(term);
        const matchesDept = deptName.toLowerCase().includes(term);
        const matchesNote = session.note?.toLowerCase().includes(term) ||
                            session.ttcmGeneralNote?.toLowerCase().includes(term) ||
                            session.bghGeneralNote?.toLowerCase().includes(term);
        const matchesCriteria = session.evaluations.some(ev => 
          ev.criteria.toLowerCase().includes(term) ||
          ev.ttcmComment?.toLowerCase().includes(term) ||
          ev.bghComment?.toLowerCase().includes(term)
        );
        const matchesUnknown = !teacher && 'chưa xác định cbgvnv'.includes(term);
        
        if (!matchesTeacher && !matchesDept && !matchesNote && !matchesCriteria && !matchesUnknown) {
          return false;
        }
      }

      return true;
    });
  }, [allSessions, filterDepartment, selectedDeptFilterIds, filterMonth, filterStatus, searchTerm, teachers, departments, isTtcm, ttcmDeptId]);

  // Các phiếu đang chọn bằng hộp kiểm
  const selectedSessions = useMemo(() => {
    return filteredSessions.filter(s => selectedSessionKeys.includes(s.key));
  }, [filteredSessions, selectedSessionKeys]);

  // Danh sách tiêu chí sắp xếp theo thứ tự order
  const sortedCriteria = useMemo(() => {
    return [...disciplineCriteria].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [disciplineCriteria]);

  // Tiêu chí đang kích hoạt (active) dùng khi tạo mới
  const activeCriteria = useMemo(() => {
    const list = sortedCriteria.filter(c => c.status === 'active');
    if (list.length === 0) {
      // Fallback an toàn nếu chưa tải xong
      return [
        { id: 'crit_1', name: 'Thực hiện Nội quy nhà trường', order: 1, status: 'active' as const },
        { id: 'crit_2', name: 'Thực hiện Quy chế chuyên môn', order: 2, status: 'active' as const },
        { id: 'crit_3', name: 'Thực hiện Văn hóa công sở', order: 3, status: 'active' as const },
        { id: 'crit_4', name: 'Thực hiện Chế độ hội họp', order: 4, status: 'active' as const },
        { id: 'crit_5', name: 'Tham gia sinh hoạt tập thể', order: 5, status: 'active' as const },
      ];
    }
    return list;
  }, [sortedCriteria]);

  // Danh sách giáo viên hợp lệ theo phân quyền (TTCM chỉ chọn giáo viên thuộc tổ mình)
  const allowedTeachers = useMemo(() => {
    if (isTtcm && ttcmDeptId) {
      return teachers.filter(t => t.departmentId === ttcmDeptId);
    }
    return teachers;
  }, [teachers, isTtcm, ttcmDeptId]);

  const filteredTeachersForSelect = useMemo(() => {
    if (!teacherSearchText.trim()) return allowedTeachers;
    const q = teacherSearchText.toLowerCase().trim();
    return allowedTeachers.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.code.toLowerCase().includes(q) ||
      (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [allowedTeachers, teacherSearchText]);

  // Thao tác với hộp kiểm chọn CBGVNV trong Form
  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const toggleDeptTeacherSelection = (deptId: string) => {
    const targetDept = displayDepartments.find(d => d.id === deptId);
    if (!targetDept) return;

    const deptTeachers = allowedTeachers.filter(t => isTeacherInDept(t, targetDept));
    const deptTeacherIds = deptTeachers.map(t => t.id);
    const allSelected = deptTeacherIds.length > 0 && deptTeacherIds.every(id => selectedTeacherIds.includes(id));

    if (allSelected) {
      setSelectedTeacherIds(prev => prev.filter(id => !deptTeacherIds.includes(id)));
    } else {
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...deptTeacherIds])));
    }
  };

  const selectAllAllowedTeachers = () => {
    setSelectedTeacherIds(filteredTeachersForSelect.map(t => t.id));
  };

  const deselectAllAllowedTeachers = () => {
    setSelectedTeacherIds([]);
  };

  // Mở modal tạo mới phiếu đánh giá
  const openCreateModal = () => {
    setEditingSession(null);
    setTeacherSearchText('');
    setSelectionMode('batch');
    setSelectedTeacherIds(allowedTeachers.map(t => t.id));
    setFormData({
      teacherId: '',
      date: new Date().toISOString().split('T')[0],
      ttcmComments: {},
      bghComments: {},
      ttcmGeneralNote: '',
      bghGeneralNote: ''
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa phiếu đánh giá
  const handleEditSession = (session: EvaluationSessionData) => {
    setEditingSession(session);
    setTeacherSearchText('');
    setSelectionMode('single');
    setSelectedTeacherIds([session.teacherId]);

    const ttcmComm: Record<string, string> = {};
    const bghComm: Record<string, string> = {};

    session.evaluations.forEach(ev => {
      const key = ev.criterionId || ev.criteria;
      if (ev.ttcmComment) ttcmComm[key] = ev.ttcmComment;
      if (ev.bghComment) bghComm[key] = ev.bghComment;
    });

    setFormData({
      teacherId: session.teacherId,
      date: session.date,
      ttcmComments: ttcmComm,
      bghComments: bghComm,
      ttcmGeneralNote: session.ttcmGeneralNote || '',
      bghGeneralNote: session.bghGeneralNote || ''
    });
    setIsModalOpen(true);
  };

  // Thao tác chọn hàng loạt trên bảng danh sách phiếu
  const toggleSelectAllFilteredSessions = () => {
    if (selectedSessionKeys.length === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedSessionKeys([]);
    } else {
      setSelectedSessionKeys(filteredSessions.map(s => s.key));
    }
  };

  const toggleSelectSession = (key: string) => {
    setSelectedSessionKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedSessionKeys.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const recordsToDelete: string[] = [];
      filteredSessions.forEach(s => {
        if (selectedSessionKeys.includes(s.key)) {
          recordsToDelete.push(...s.recordIds);
        }
      });
      const count = selectedSessionKeys.length;
      if (recordsToDelete.length > 0) {
        await deleteDisciplineRecords(recordsToDelete);
      }
      setSelectedSessionKeys([]);
      setIsBatchDeleteModalOpen(false);
      setToastMessage(`Đã xóa thành công ${count} phiếu đánh giá nề nếp đã chọn.`);
    } catch (error) {
      console.error('Lỗi khi xóa hàng loạt phiếu đánh giá:', error);
      alert('Có lỗi xảy ra khi xóa các phiếu đánh giá đã chọn.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Xem chi tiết
  const handleViewDetail = (session: EvaluationSessionData) => {
    setDetailSession(session);
    setIsDetailModalOpen(true);
  };

  // Xóa phiếu đánh giá (Mở popup xác nhận)
  const handleDeleteSession = (session: EvaluationSessionData) => {
    setSessionToDelete(session);
  };

  // Xác nhận thực hiện xóa trong modal
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      if (sessionToDelete.recordIds && sessionToDelete.recordIds.length > 0) {
        await deleteDisciplineRecords(sessionToDelete.recordIds);
      }
      const teacherName = getTeacher(sessionToDelete.teacherId)?.name || 'CBGVNV';
      setToastMessage(`Đã xóa thành công phiếu đánh giá nề nếp của ${teacherName}.`);
      setSessionToDelete(null);
      if (detailSession?.key === sessionToDelete.key) {
        setIsDetailModalOpen(false);
        setDetailSession(null);
      }
    } catch (error) {
      console.error('Lỗi khi xóa bản ghi đánh giá:', error);
      alert('Có lỗi xảy ra khi xóa phiếu đánh giá. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Tiêu chí hiển thị trong Form (nếu đang sửa thì bao gồm cả tiêu chí của bản ghi đó + tiêu chí active)
  const formCriteriaList = useMemo(() => {
    if (!editingSession) return activeCriteria;

    // Khi sửa: lấy danh sách các tiêu chí đã có trong session
    const map = new Map<string, DisciplineCriterion>();
    activeCriteria.forEach(c => map.set(c.id, c));

    editingSession.evaluations.forEach(ev => {
      const critId = ev.criterionId || `custom_${ev.criteria}`;
      if (!map.has(critId)) {
        const found = sortedCriteria.find(c => c.id === critId || c.name === ev.criteria);
        if (found) {
          map.set(found.id, found);
        } else {
          map.set(critId, {
            id: critId,
            name: ev.criteria,
            order: 99,
            status: 'active'
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activeCriteria, editingSession, sortedCriteria]);

  // Kiểm tra trước khi lưu: đếm số tiêu chí chưa nhận xét
  const checkEmptyAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSession || selectionMode === 'single') {
      if (!formData.teacherId) {
        alert('Vui lòng chọn chính xác CBGVNV được đánh giá.');
        return;
      }
    } else {
      if (selectedTeacherIds.length === 0) {
        alert('Vui lòng tích chọn ít nhất 1 CBGVNV từ hộp kiểm theo tổ chuyên môn, văn phòng.');
        return;
      }
    }

    if (!formData.date) {
      alert('Vui lòng chọn ngày đánh giá.');
      return;
    }

    // Đếm tiêu chí chưa có nhận xét theo vai trò hiện tại
    let emptyCount = 0;
    formCriteriaList.forEach(crit => {
      const key = crit.id;
      const userComment = isBgh ? (formData.bghComments[key] || '') : (formData.ttcmComments[key] || '');
      if (!userComment.trim()) {
        emptyCount++;
      }
    });

    if (emptyCount > 0) {
      setUncommentedCount(emptyCount);
      setIsWarningModalOpen(true);
    } else {
      executeSave();
    }
  };

  // Thực hiện lưu dữ liệu vào Firestore
  async function executeSave() {
    setIsWarningModalOpen(false);
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Khi sửa: xóa các record cũ của lần đánh giá này rồi ghi lại để đảm bảo tính toàn vẹn
      if (editingSession && editingSession.recordIds && editingSession.recordIds.length > 0) {
        await deleteDisciplineRecords(editingSession.recordIds);
      }

      const targetTeacherIds = (editingSession || selectionMode === 'single')
        ? [formData.teacherId]
        : selectedTeacherIds;

      const recordsToSave: DisciplineRecord[] = [];

      targetTeacherIds.forEach((tId, tIdx) => {
        const teacher = getTeacher(tId);
        const targetDeptId = getTeacherDeptId(teacher) || ttcmDeptId || displayDepartments[0]?.id || 'd_van_phong';

        // Tạo các bản ghi đánh giá tiêu chí cho cá nhân giáo viên đó
        formCriteriaList.forEach((crit, index) => {
          const key = crit.id;
          const oldRec = editingSession?.evaluations.find(e => (e.criterionId === crit.id || e.criteria === crit.name));

          const ttcmComm = formData.ttcmComments[key] ?? formData.ttcmComments[crit.name] ?? oldRec?.ttcmComment ?? '';
          const bghComm = formData.bghComments[key] ?? formData.bghComments[crit.name] ?? oldRec?.bghComment ?? '';

          // Tái sử dụng level lịch sử nếu có
          let legacyLevel: string | undefined = oldRec?.level;

          const newRecord: DisciplineRecord = {
            id: `dr${Date.now()}_${tIdx}_${index}_${Math.random().toString(36).substring(2, 7)}`,
            teacherId: tId,
            departmentId: targetDeptId,
            date: formData.date,
            criteria: crit.name,
            criterionId: crit.id,
            level: legacyLevel,
            inspectorId: authUser?.id || (isBgh ? 'admin' : 'ttcm'),
            evaluatorRole: effectiveRole,
            ttcmComment: ttcmComm.trim(),
            bghComment: bghComm.trim(),
            ttcmGeneralNote: formData.ttcmGeneralNote.trim(),
            bghGeneralNote: formData.bghGeneralNote.trim(),
            note: (isBgh ? formData.bghGeneralNote.trim() : formData.ttcmGeneralNote.trim()) || ''
          };

          recordsToSave.push(newRecord);
        });
      });

      if (recordsToSave.length > 0) {
        await addDisciplineRecords(recordsToSave);
      }

      setToastMessage(editingSession ? 'Đã cập nhật phiếu đánh giá thành công.' : 'Đã lưu phiếu đánh giá nề nếp thành công.');
      setIsModalOpen(false);
      setEditingSession(null);
    } catch (err: any) {
      console.error('Lỗi khi lưu phiếu đánh giá nề nếp:', err);
      alert('Lỗi khi lưu dữ liệu lên máy chủ: ' + (err.message || 'Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Thống kê giáo viên đã/chưa được nhận xét
  const stats = useMemo(() => {
    const evaluatedTeacherIds = new Set(allSessions.map(s => s.teacherId));
    
    // Tổng số giáo viên thuộc phạm vi xem
    const targetTeachers = isTtcm && ttcmDeptId 
      ? teachers.filter(t => t.departmentId === ttcmDeptId)
      : teachers;

    let evaluatedCount = 0;
    targetTeachers.forEach(t => {
      if (evaluatedTeacherIds.has(t.id)) evaluatedCount++;
    });

    const pendingCount = Math.max(0, targetTeachers.length - evaluatedCount);

    return {
      totalEvaluated: evaluatedCount,
      totalPending: pendingCount,
      totalSessions: filteredSessions.length,
      scopeTotalTeachers: targetTeachers.length
    };
  }, [allSessions, teachers, isTtcm, ttcmDeptId, filteredSessions]);

  const selectedTeacherInForm = getTeacher(formData.teacherId);
  const selectedTeacherDeptName = selectedTeacherInForm 
    ? (departments.find(d => d.id === selectedTeacherInForm.departmentId)?.name || 'Chưa phân tổ')
    : '';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center">
        <BackButton />
      </div>
      
      {/* Header & Role Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Nền nếp & Nội quy</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi, nhận xét cụ thể và ghi nhận thực tế từng cán bộ giáo viên nhân viên
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Nút Xuất Báo cáo & Phiếu đánh giá */}
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-sm transition-all cursor-pointer"
              title="Xuất phiếu đánh giá và báo cáo tổng hợp ra Excel, Word hoặc bản in PDF"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Xuất báo cáo & Phiếu
            </button>

            {/* Nút Quản lý & Thêm tiêu chí */}
            <button
              type="button"
              onClick={() => setIsCriteriaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Quản lý & Thêm tiêu chí
            </button>

            {/* Nút Đánh giá & Ghi nhận */}
            <button 
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Đánh giá & Ghi nhận
            </button>
          </div>
        </div>

        {/* Thanh chuyển đổi vai trò kiểm thử (BGH vs TTCM các tổ) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Đang thao tác với quyền:</span>
            <span className={`px-2.5 py-1 rounded-lg font-bold ${
              isBgh ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isBgh ? 'Ban Giám Hiệu (Toàn trường)' : `TTCM: ${currentTtcmDepartment?.name || 'Tổ chuyên môn'}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Chuyển vai trò kiểm thử:</span>
            <button
              type="button"
              onClick={() => {
                setActiveRoleOverride('BGH');
                setActiveDeptOverride(null);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                isBgh 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Vai trò BGH
            </button>

            {displayDepartments.map(dept => (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  setActiveRoleOverride('TTCM');
                  setActiveDeptOverride(dept.id);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all truncate max-w-[150px] ${
                  isTtcm && ttcmDeptId === dept.id 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={`Kiểm thử TTCM: ${dept.name}`}
              >
                TTCM {dept.name.replace(/^Tổ\s+/, '').split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thẻ thống kê chuẩn xác */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng lượt nhận xét</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSessions}</p>
          </div>
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CBGVNV đã được nhận xét</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalEvaluated}</p>
          </div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CBGVNV chưa được nhận xét</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalPending}</p>
          </div>
          <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số tiêu chí đang áp dụng</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{activeCriteria.length}</p>
          </div>
          <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Card Danh sách phiếu đánh giá */}
      <Card>
        {/* Bộ lọc Hộp kiểm theo Tổ chuyên môn & Văn phòng */}
        <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 space-y-2.5 rounded-t-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckSquare size={15} className="text-blue-600" />
              Lọc danh sách theo Tổ chuyên môn & Văn phòng (Hộp kiểm):
            </span>
            {selectedDeptFilterIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDeptFilterIds([])}
                className="text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer text-xs"
              >
                Tải lại / Hiển thị tất cả tổ ({displayDepartments.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setSelectedDeptFilterIds([])}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDeptFilterIds.length === 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckSquare size={13} />
              <span>Tất cả các tổ ({displayDepartments.length})</span>
            </button>

            {displayDepartments.map(dept => {
              const isChecked = selectedDeptFilterIds.includes(dept.id);
              const deptSessionsCount = allSessions.filter(s => {
                const teacher = getTeacher(s.teacherId);
                if (teacher) {
                  return isTeacherInDept(teacher, dept);
                }
                return s.departmentId === dept.id;
              }).length;

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    setSelectedDeptFilterIds(prev => 
                      prev.includes(dept.id) 
                        ? prev.filter(id => id !== dept.id) 
                        : [...prev, dept.id]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{dept.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isChecked ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-500'}`}>
                    {deptSessionsCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bộ lọc chuẩn xác */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between bg-slate-50/70">
          {/* Tìm kiếm */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tìm theo tên giáo viên, tiêu chí, nội dung nhận xét..."
            />
          </div>

          {/* Lọc theo Tổ chuyên môn */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setSelectedDeptFilterIds([]);
              }}
              className="block w-full md:w-52 pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border bg-white"
            >
              <option value="All">Tất cả tổ chuyên môn & văn phòng</option>
              {displayDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo Tháng */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="block w-full md:w-36 pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border bg-white"
            >
              <option value="All">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m.toString()}>Tháng {m}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo trạng thái nhận xét */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="block w-full md:w-44 pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg border bg-white"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="HasBgh">Đã có nhận xét BGH</option>
              <option value="OnlyTtcm">Chỉ có nhận xét TTCM</option>
              <option value="Legacy">Dữ liệu lịch sử</option>
            </select>
          </div>
        </div>

        {/* Thanh thao tác hàng loạt khi chọn phiếu trong bảng */}
        {selectedSessionKeys.length > 0 && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <CheckSquare size={16} className="text-blue-600" />
              <span>Đã chọn {selectedSessionKeys.length} phiếu đánh giá trong danh sách</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Xuất các phiếu được chọn ra Excel/Word/PDF"
              >
                <Download size={13} />
                <span>Xuất {selectedSessionKeys.length} phiếu đã chọn</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa {selectedSessionKeys.length} phiếu đã chọn</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSessionKeys([])}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>
        )}
        
        {/* Bảng danh sách chuẩn */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredSessions.length > 0 && selectedSessionKeys.length === filteredSessions.length}
                    onChange={toggleSelectAllFilteredSessions}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Chọn / Bỏ chọn tất cả phiếu hiển thị"
                  />
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Thời gian
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  CBGVNV
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Tổ chuyên môn
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[280px]">
                  Nội dung nhận xét của người đánh giá
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Người đánh giá
                </th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => {
                  const teacher = getTeacher(session.teacherId);
                  const deptName = getDepartmentName(session.teacherId, session.departmentId);

                  const ttcmCommentsList = session.evaluations.filter(e => e.ttcmComment?.trim());
                  const bghCommentsList = session.evaluations.filter(e => e.bghComment?.trim());
                  const hasTtcmContent = Boolean(session.ttcmGeneralNote?.trim() || ttcmCommentsList.length > 0);
                  const hasBghContent = Boolean(session.bghGeneralNote?.trim() || bghCommentsList.length > 0);
                  const isSelectedInTable = selectedSessionKeys.includes(session.key);

                  return (
                    <tr 
                      key={session.key} 
                      className={`transition-colors group/row cursor-pointer ${
                        isSelectedInTable ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => handleViewDetail(session)}
                    >
                      {/* Cột Hộp kiểm */}
                      <td 
                        className="px-3 py-4 text-center align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelectedInTable}
                          onChange={() => toggleSelectSession(session.key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                        />
                      </td>

                      {/* Cột 1: Thời gian */}
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 align-top font-medium">
                        {safeFormatLocale(session.date, 'toLocaleDateString', 'Chưa cập nhật')}
                      </td>

                      {/* Cột 2: CBGVNV */}
                      <td className="px-5 py-4 whitespace-nowrap align-top">
                        {teacher ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 group-hover/row:text-blue-600 transition-colors">
                              {teacher.name}
                            </span>
                            <span className="text-xs text-slate-500">Mã: {teacher.code}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Chưa xác định CBGVNV
                            </span>
                            <span className="text-[11px] text-slate-400">Bấm sửa để gán</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Tổ chuyên môn */}
                      <td className="px-5 py-4 whitespace-nowrap align-top">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {deptName}
                        </span>
                      </td>

                      {/* Cột 4: Nội dung nhận xét chi tiết của người đánh giá */}
                      <td className="px-5 py-4 text-xs text-slate-600 align-top">
                        <div className="space-y-2 max-w-xl">
                          {/* Nhận xét của TTCM */}
                          {hasTtcmContent && (
                            <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200/80 space-y-1">
                              <span className="font-bold text-blue-900 block text-xs">
                                Nhận xét của Tổ trưởng chuyên môn (TTCM):
                              </span>
                              {session.ttcmGeneralNote?.trim() && (
                                <p className="text-slate-800 leading-relaxed font-medium">
                                  {session.ttcmGeneralNote}
                                </p>
                              )}
                              {ttcmCommentsList.length > 0 && (
                                <div className="space-y-1 mt-1 pt-1 border-t border-blue-200/60">
                                  {ttcmCommentsList.map((e, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-700">
                                      <span className="font-semibold text-blue-800">• {e.criteria}: </span>
                                      <span>{e.ttcmComment}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Nhận xét của BGH */}
                          {hasBghContent && (
                            <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200 space-y-1">
                              <span className="font-bold text-amber-950 block text-xs">
                                Nhận xét của Ban Giám Hiệu (BGH):
                              </span>
                              {session.bghGeneralNote?.trim() && (
                                <p className="text-slate-800 leading-relaxed font-medium">
                                  {session.bghGeneralNote}
                                </p>
                              )}
                              {bghCommentsList.length > 0 && (
                                <div className="space-y-1 mt-1 pt-1 border-t border-amber-200/60">
                                  {bghCommentsList.map((e, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-800">
                                      <span className="font-semibold text-amber-900">• {e.criteria}: </span>
                                      <span>{e.bghComment}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dành cho bản ghi chỉ có ghi chú chung legacy */}
                          {!hasTtcmContent && !hasBghContent && (
                            <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              {session.note?.trim() ? session.note : '(Chưa có nội dung nhận xét chi tiết - Bấm "Xem" hoặc "Sửa" để bổ sung)'}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Cột 5: Người đánh giá */}
                      <td className="px-5 py-4 whitespace-nowrap align-top text-xs font-medium text-slate-700">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-semibold ${
                          session.evaluatorRole === 'BGH' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {session.evaluatorRole === 'BGH' ? 'Ban Giám Hiệu' : 'TTCM'}
                        </span>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td 
                        className="px-5 py-4 whitespace-nowrap align-top text-right text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleViewDetail(session)} 
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Xem chi tiết phiếu"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            Xem
                          </button>
                          
                          {/* Sửa: BGH hoặc TTCM của tổ đó */}
                          {canUserManageSession(session) && (
                            <button 
                              type="button"
                              onClick={() => handleEditSession(session)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa phiếu"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Sửa
                            </button>
                          )}

                          {/* Xóa: BGH hoặc TTCM của tổ đó */}
                          {canUserManageSession(session) && (
                            <button 
                              type="button"
                              onClick={() => handleDeleteSession(session)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa phiếu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    <p className="font-semibold text-slate-700">Không tìm thấy bản ghi đánh giá phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy bấm "Đánh giá & Ghi nhận" để thực hiện nhận xét cho CBGVNV
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Đánh giá & Ghi nhận (Tạo mới & Sửa) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSession ? 'Chỉnh sửa Phiếu Đánh giá & Nhận xét' : 'Lập Phiếu Đánh giá & Ghi nhận Nền nếp'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thực hiện theo vai trò: <span className="font-semibold text-blue-700">{isBgh ? 'Ban Giám Hiệu (BGH)' : `Tổ trưởng chuyên môn (${currentTtcmDepartment?.name})`}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <form id="discipline-form" onSubmit={checkEmptyAndSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Cột trái: Thông tin CBGVNV & Thời gian (5 cột) */}
                <div className="md:col-span-5 space-y-5">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                      <span>Đối tượng đánh giá</span>
                      {!editingSession && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                          {selectionMode === 'batch' ? `Đã chọn ${selectedTeacherIds.length} CB` : 'Cá nhân'}
                        </span>
                      )}
                    </h4>

                    {/* Chuyển chế độ chọn CBGVNV: Hộp kiểm theo Tổ chuyên môn, Văn phòng VS Thả xuống 1 người */}
                    {!editingSession && (
                      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelectionMode('batch')}
                          className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                            selectionMode === 'batch' 
                              ? 'bg-blue-600 text-white shadow-2xs font-bold' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <CheckSquare size={13} />
                          <span>Hộp kiểm theo Tổ ({selectedTeacherIds.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectionMode('single')}
                          className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                            selectionMode === 'single' 
                              ? 'bg-blue-600 text-white shadow-2xs font-bold' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <User size={13} />
                          <span>Chọn 1 CBGVNV</span>
                        </button>
                      </div>
                    )}

                    {/* Chế độ 1: Chọn bằng Hộp kiểm phân loại theo Tổ chuyên môn & Văn phòng */}
                    {!editingSession && selectionMode === 'batch' && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                            <input
                              type="text"
                              value={teacherSearchText}
                              onChange={(e) => setTeacherSearchText(e.target.value)}
                              placeholder="Lọc tên / mã..."
                              className="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-xs">
                            <button
                              type="button"
                              onClick={selectAllAllowedTeachers}
                              className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-bold transition-colors text-[10px] cursor-pointer"
                            >
                              Tất cả
                            </button>
                            <button
                              type="button"
                              onClick={deselectAllAllowedTeachers}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold transition-colors text-[10px] cursor-pointer"
                            >
                              Bỏ chọn
                            </button>
                          </div>
                        </div>

                        {/* Danh sách Hộp kiểm CBGVNV nhóm theo Tổ chuyên môn & Văn phòng */}
                        <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-xl p-2 bg-white">
                          {displayDepartments.map(dept => {
                            if (isTtcm && ttcmDeptId && dept.id !== ttcmDeptId) return null;

                            const deptTeachers = filteredTeachersForSelect.filter(t => isTeacherInDept(t, dept));
                            if (deptTeachers.length === 0) return null;

                            const deptTeacherIds = deptTeachers.map(t => t.id);
                            const selectedInDept = deptTeacherIds.filter(id => selectedTeacherIds.includes(id));
                            const isAllDeptSelected = deptTeacherIds.length > 0 && selectedInDept.length === deptTeacherIds.length;

                            return (
                              <div key={dept.id} className="bg-slate-50/80 rounded-xl p-2 border border-slate-200/80 space-y-2">
                                {/* Header Tổ chuyên môn / Văn phòng */}
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={isAllDeptSelected}
                                      onChange={() => toggleDeptTeacherSelection(dept.id)}
                                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <Building size={13} className="text-blue-600" />
                                    <span>Tổ: {dept.name}</span>
                                  </label>
                                  <span className="text-[10px] font-bold px-2 py-0.2 bg-blue-100 text-blue-800 rounded-full">
                                    {selectedInDept.length}/{deptTeachers.length}
                                  </span>
                                </div>

                                {/* Lưới Hộp kiểm CBGVNV trong tổ */}
                                <div className="grid grid-cols-1 gap-1">
                                  {deptTeachers.map(t => {
                                    const isChecked = selectedTeacherIds.includes(t.id);
                                    return (
                                      <div
                                        key={t.id}
                                        onClick={() => toggleTeacherSelection(t.id)}
                                        className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                                          isChecked 
                                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs' 
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {}}
                                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                        />
                                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                          {t.name.charAt(0)}
                                        </div>
                                        <div className="truncate text-xs min-w-0 flex-1">
                                          <span className="truncate block leading-tight">{t.name}</span>
                                          <span className="text-[10px] text-slate-400 font-normal">Mã: {t.code}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Chế độ 2: Dropdown chọn 1 CBGVNV (Hoặc khi chỉnh sửa) */}
                    {(editingSession || selectionMode === 'single') && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>CBGVNV được đánh giá <span className="text-rose-500">*</span></span>
                          {selectedTeacherInForm && (
                            <span className="text-xs text-blue-600 font-normal">
                              Mã: {selectedTeacherInForm.code}
                            </span>
                          )}
                        </label>

                        {/* Ô tìm kiếm nhanh CBGVNV */}
                        <div className="relative mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={teacherSearchText}
                            onChange={(e) => setTeacherSearchText(e.target.value)}
                            placeholder="Gõ để lọc nhanh tên / mã..."
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Dropdown chọn 1 CBGVNV */}
                        <select
                          required
                          value={formData.teacherId}
                          onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Chọn một CBGVNV --</option>
                          {displayDepartments.map(dept => {
                            if (isTtcm && ttcmDeptId && dept.id !== ttcmDeptId) return null;

                            const deptTeachers = filteredTeachersForSelect.filter(t => isTeacherInDept(t, dept));
                            if (deptTeachers.length === 0) return null;

                            return (
                              <optgroup key={dept.id} label={`Tổ: ${dept.name}`}>
                                {deptTeachers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.code} - {t.subject || dept.name})
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Tổ chuyên môn (Tự động hiển thị, chỉ đọc) */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Tổ chuyên môn (Tự động)
                      </label>
                      <input 
                        type="text" 
                        disabled 
                        readOnly 
                        value={selectedTeacherInForm ? selectedTeacherDeptName : 'Tự động theo CBGVNV'} 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm cursor-not-allowed font-medium"
                      />
                    </div>

                    {/* Ngày đánh giá */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Ngày đánh giá <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        required 
                        type="date" 
                        value={formData.date} 
                        onChange={e => setFormData({ ...formData, date: e.target.value })} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                      />
                    </div>

                    {/* Người đánh giá */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Người đánh giá</label>
                      <input 
                        type="text" 
                        disabled 
                        readOnly 
                        value={isBgh ? 'Ban Giám Hiệu (BGH)' : `Tổ trưởng chuyên môn (${currentTtcmDepartment?.name || 'TTCM'})`} 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Cột phải: Nhận xét từng tiêu chí & Nhận xét chung (8 cột) */}
                <div className="md:col-span-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Nhận xét cụ thể cho từng tiêu chí
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isBgh 
                          ? 'BGH xem nhận xét của TTCM và nhập nhận xét bổ sung/đánh giá toàn trường' 
                          : 'TTCM nhập nhận xét chi tiết cho từng tiêu chí của CBGVNV'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCriteriaModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
                      title="Thêm hoặc chỉnh sửa danh mục tiêu chí"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      Thêm / Quản lý tiêu chí
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formCriteriaList.map((crit, index) => {
                      const key = crit.id;
                      const ttcmVal = formData.ttcmComments[key] || '';
                      const bghVal = formData.bghComments[key] || '';

                      return (
                        <div 
                          key={crit.id} 
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div>
                                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                  {crit.name}
                                </h5>
                                {crit.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {crit.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nhận xét của TTCM (Cho phép chỉnh sửa cho mọi người dùng/vai trò) */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Nhận xét của Tổ trưởng chuyên môn (TTCM):
                            </label>
                            <textarea
                              rows={2}
                              value={ttcmVal}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                ttcmComments: { ...prev.ttcmComments, [key]: e.target.value }
                              }))}
                              placeholder="Nhập nhận xét cụ thể của TTCM về việc thực hiện tiêu chí này..."
                              className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/20"
                            />
                          </div>

                          {/* Nhận xét của BGH */}
                          <div className="space-y-1 pt-1">
                            <label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Nhận xét của Ban Giám hiệu (BGH):
                            </label>
                            <textarea
                              rows={2}
                              value={bghVal}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                bghComments: { ...prev.bghComments, [key]: e.target.value }
                              }))}
                              placeholder="Nhập nhận xét bổ sung / đánh giá của BGH..."
                              className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nhận xét chung cuối phiếu */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Nhận xét chung toàn diện
                    </h5>

                    {/* Nhận xét chung TTCM & BGH (Đều cho phép nhập/sửa) */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          NHẬN XÉT CHUNG CỦA TTCM:
                        </label>
                        <textarea
                          rows={3}
                          value={formData.ttcmGeneralNote}
                          onChange={(e) => setFormData({ ...formData, ttcmGeneralNote: e.target.value })}
                          placeholder="Nhập nhận xét, đánh giá chung của TTCM về việc thực hiện nền nếp..."
                          className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/20"
                        />
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          NHẬN XÉT CHUNG CỦA BAN GIÁM HIỆU (BGH):
                        </label>
                        <textarea
                          rows={3}
                          value={formData.bghGeneralNote}
                          onChange={(e) => setFormData({ ...formData, bghGeneralNote: e.target.value })}
                          placeholder="Nhập kết luận, ý kiến chỉ đạo hoặc nhận xét chung của BGH..."
                          className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                form="discipline-form" 
                disabled={isSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingSession ? 'Cập nhật phiếu' : 'Lưu phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo khi còn tiêu chí chưa nhận xét */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận lưu phiếu đánh giá
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Còn <span className="font-bold text-amber-600">{uncommentedCount} tiêu chí</span> chưa có nhận xét. Bạn có muốn lưu phiếu không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
              >
                Lưu phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý tiêu chí đánh giá (BGH) */}
      <CriteriaManagerModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
      />

      {/* Modal Chi tiết phiếu đánh giá */}
      <EvaluationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        session={detailSession}
        teacher={detailSession ? getTeacher(detailSession.teacherId) : undefined}
        department={detailSession ? departments.find(d => d.id === detailSession.departmentId) : undefined}
        canEdit={canUserManageSession(detailSession)}
        onEdit={() => {
          if (detailSession) {
            handleEditSession(detailSession);
          }
        }}
        canDelete={canUserManageSession(detailSession)}
        onDelete={() => {
          if (detailSession) {
            const target = detailSession;
            setIsDetailModalOpen(false);
            handleDeleteSession(target);
          }
        }}
      />

      {/* Modal Xuất Báo cáo & Phiếu đánh giá Nền nếp */}
      <DisciplineExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredSessions={filteredSessions}
        selectedSessions={selectedSessions}
        teachers={teachers}
        departments={displayDepartments}
        onTriggerPrint={(targetSessions) => {
          if (targetSessions.length > 0) {
            setDetailSession(targetSessions[0]);
            setIsDetailModalOpen(true);
            setTimeout(() => {
              window.print();
            }, 300);
          }
        }}
      />

      {/* Modal Xác nhận Xóa phiếu đánh giá Nền nếp */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa phiếu đánh giá
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nền nếp & Nội quy
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">CBGVNV:</span>
                <span className="font-bold text-slate-800">
                  {getTeacher(sessionToDelete.teacherId)?.name || 'Chưa xác định CBGVNV'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổ chuyên môn:</span>
                <span className="font-medium text-slate-700">
                  {getDepartmentName(sessionToDelete.teacherId, sessionToDelete.departmentId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày đánh giá:</span>
                <span className="font-medium text-slate-700">
                  {safeFormatLocale(sessionToDelete.date, 'toLocaleDateString', 'Chưa cập nhật')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiêu chí trong phiếu:</span>
                <span className="font-semibold text-blue-600">
                  {sessionToDelete.evaluations.length} tiêu chí ({sessionToDelete.recordIds.length} bản ghi)
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 leading-relaxed bg-rose-50/70 p-3 rounded-lg border border-rose-200">
              ⚠️ Thao tác này sẽ xóa vĩnh viễn toàn bộ nhận xét và kết quả đánh giá của phiếu này khỏi hệ thống cơ sở dữ liệu.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa hàng loạt phiếu đánh giá Nền nếp */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa hàng loạt phiếu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nền nếp & Nội quy
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa vĩnh viễn <span className="font-bold text-rose-600">{selectedSessionKeys.length} phiếu đánh giá</span> đã chọn khỏi cơ sở dữ liệu?
            </p>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">
              ⚠️ Hành động này không thể hoàn tác. Các bản ghi nhận xét của các CBGVNV trong các phiếu này sẽ bị xóa toàn bộ.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={handleConfirmBatchDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isBatchDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa {selectedSessionKeys.length} phiếu...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa {selectedSessionKeys.length} phiếu đã chọn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[3500] bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-600 flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
          <span className="text-white">{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-emerald-200 hover:text-white hover:bg-emerald-700/80 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
