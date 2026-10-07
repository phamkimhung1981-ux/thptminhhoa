import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import BackButton from '../components/ui/BackButton';
import KpiGroupManagerModal from '../components/kpi/KpiGroupManagerModal';
import KpiRecordModal from '../components/kpi/KpiRecordModal';
import { 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Users, 
  FileText, 
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Eye,
  Check,
  X,
  ExternalLink,
  Sparkles,
  UserCheck,
  Settings
} from 'lucide-react';
import { KpiItem, KpiRecord, KpiPointType, Teacher, KpiGroup, KpiCategory, KpiTargetCode } from '../types';
import { cn } from '../lib/utils';
import { 
  resolveKpiGroup, 
  resolveKpiGroupName, 
  resolveKpiGroupCode, 
  resolveKpiGroupDescription, 
  getKpiGroupBadgeStyle 
} from '../lib/kpiGroupUtils';
import { 
  KPI_TARGET_GROUPS, 
  matchKpiToTargetGroup, 
  normalizeTargetGroup,
  formatTargetAudienceBadges 
} from '../lib/kpiTargetAudienceUtils';

const DEFAULT_GROUPS = [
  'Nền nếp',
  'Chuyên môn',
  'Chủ nhiệm',
  'Thành tích',
  'Công việc',
  'Văn hóa công sở',
  'Hành chính',
  'Phục vụ học sinh',
  'Khác'
];

export const KPI_TARGET_OPTIONS: Array<{ code: KpiTargetCode; label: string; shortName: string; desc: string; badgeColor: string }> = [
  { code: 'CBQL', label: 'Cán bộ quản lý (CBQL)', shortName: 'CBQL', desc: 'Hiệu trưởng, Phó Hiệu trưởng', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  { code: 'TTCM_TPCM', label: 'Tổ trưởng / Tổ phó chuyên môn (TTCM/TPCM)', shortName: 'TTCM/TPCM', desc: 'Dùng chung toàn bộ tiêu chí cho cả TTCM và TPCM', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { code: 'GV', label: 'Giáo viên (GV)', shortName: 'Giáo viên', desc: 'Giáo viên giảng dạy bộ môn, giáo viên chủ nhiệm', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { code: 'NV', label: 'Nhân viên (NV)', shortName: 'Nhân viên', desc: 'Văn thư, kế toán, y tế, thư viện, thiết bị, thủ quỹ, bảo vệ, phục vụ', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' }
];

const TARGET_AUDIENCES = [
  'Tất cả CBGVNV',
  'CBQL',
  'TTCM/TPCM',
  'Giáo viên',
  'Nhân viên'
];

const UNITS = [
  'Lần',
  'Việc',
  'Ngày',
  'Tiết',
  'Sản phẩm',
  'Hồ sơ',
  'Bài viết',
  'Cuộc thi',
  'Thành tích',
  'Khác'
];

const resolveAudiencesFromKpi = (item: Partial<KpiItem>): KpiTargetCode[] => {
  if (item.targetAudiences && item.targetAudiences.length > 0) {
    return item.targetAudiences;
  }
  const aud = (item.targetAudience || '').toLowerCase();
  if (!aud || aud.includes('tất cả') || aud.includes('all')) {
    return ['CBQL', 'TTCM_TPCM', 'GV', 'NV'];
  }
  const list: KpiTargetCode[] = [];
  if (aud.includes('cbql') || aud.includes('cnql') || aud.includes('quản lý')) list.push('CBQL');
  if (aud.includes('ttcm') || aud.includes('tpcm') || aud.includes('tổ trưởng') || aud.includes('tổ phó')) list.push('TTCM_TPCM');
  if (aud.includes('gv') || aud.includes('giáo viên') || aud.includes('chủ nhiệm')) list.push('GV');
  if (aud.includes('nv') || aud.includes('nhân viên') || aud.includes('văn phòng') || aud.includes('kế toán') || aud.includes('hành chính')) list.push('NV');
  return list.length > 0 ? list : ['CBQL', 'TTCM_TPCM', 'GV', 'NV'];
};

const formatAudiencesString = (audiences: KpiTargetCode[]): string => {
  if (!audiences || audiences.length === 0 || audiences.length === 4) return 'Tất cả CBGVNV';
  const labelMap: Record<KpiTargetCode, string> = {
    CBQL: 'CBQL',
    TTCM_TPCM: 'TTCM/TPCM',
    GV: 'Giáo viên',
    NV: 'Nhân viên'
  };
  return audiences.map(a => labelMap[a] || a).join(', ');
};

export default function KpiCatalog() {
  const { 
    kpis, 
    kpiRecords, 
    kpiGroups, 
    kpiCategories,
    teachers, 
    departments, 
    tasks, 
    addKpiGroup, 
    updateKpiGroup, 
    deleteKpiGroup,
    addKpi, 
    updateKpi, 
    deleteKpi, 
    addKpiRecord, 
    updateKpiRecord, 
    deleteKpiRecord,
    addKpiCategory,
    checkAndRepairKpiData
  } = useAppContext();
  const { user } = useAuth();

  // Tab: 'catalog' | 'tracking' | 'records'
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracking' | 'records'>('catalog');

  // Permissions (Allow BGH, admin, or fallback for testing)
  const isBghOrAdmin = !user || user.role === 'BGH' || (user as any).role === 'ADMIN' || user.id === 'admin';
  const isTtcm = user?.role === 'TTCM';
  const canManageCatalog = isBghOrAdmin;
  const canAssignOrVerify = isBghOrAdmin || isTtcm;

  // Catalog filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedPointType, setSelectedPointType] = useState<'all' | 'plus' | 'minus'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTarget, setSelectedTarget] = useState('all');

  // Tracking filters
  const [trackingMonth, setTrackingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [trackingSearch, setTrackingSearch] = useState('');

  // Records filters
  const [recordStatusFilter, setRecordStatusFilter] = useState('all');
  const [recordTeacherFilter, setRecordTeacherFilter] = useState('all');

  // Modals state
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiItem | null>(null);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);

  // Delete KPI confirmation modal state
  const [kpiToDelete, setKpiToDelete] = useState<KpiItem | null>(null);
  const [deleteRecordsOption, setDeleteRecordsOption] = useState<boolean>(true);
  const [isDeletingKpi, setIsDeletingKpi] = useState<boolean>(false);

  // Delete Record confirmation modal state
  const [recordToDelete, setRecordToDelete] = useState<KpiRecord | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  // Data check state
  const [isCheckingData, setIsCheckingData] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    checkedGroups: number;
    checkedKpis: number;
    orphanedCount: number;
    repairedCount: number;
  } | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [kpiFormData, setKpiFormData] = useState<Partial<KpiItem>>({
    code: '',
    groupId: '',
    group: 'Nền nếp',
    categoryId: '',
    category_id: '',
    categoryName: '',
    name: '',
    targetAudience: 'Tất cả CBGVNV',
    pointType: 'plus',
    pointValue: 5,
    unit: 'Lần',
    status: 'active',
    order: 1,
    description: ''
  });

  // Assign/Record KPI Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [preselectedTeacherId, setPreselectedTeacherId] = useState<string | undefined>(undefined);
  const [preselectedKpiId, setPreselectedKpiId] = useState<string | undefined>(undefined);

  // Teacher detail drawer / modal
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);

  // Helper to resolve group name for any KPI item (via groupId or group name)
  const getKpiGroupName = (item: { groupId?: string; group?: string; kpiId?: string }) => {
    return resolveKpiGroupName(item, kpiGroups, kpis);
  };

  // Helper to resolve group code
  const getKpiGroupCode = (item: { groupId?: string; group?: string; kpiId?: string }) => {
    return resolveKpiGroupCode(item, kpiGroups, kpis);
  };

  // Sorted active groups for dropdown selection
  const activeKpiGroups = useMemo(() => {
    return [...kpiGroups]
      .filter(g => g.status === 'active')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [kpiGroups]);

  // Dropdown options for KPI Modal (includes active groups + the group of the item being edited if inactive)
  const modalGroupOptions = useMemo(() => {
    const list = [...activeKpiGroups];
    if (editingKpi?.groupId) {
      const currentGroup = kpiGroups.find(g => g.id === editingKpi.groupId);
      if (currentGroup && currentGroup.status === 'inactive' && !list.some(g => g.id === currentGroup.id)) {
        list.push(currentGroup);
      }
    }
    if (list.length === 0 && kpiGroups.length > 0) {
      return [...kpiGroups].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return list;
  }, [activeKpiGroups, editingKpi, kpiGroups]);

  // Available groups for filter dropdown (includes all independent / custom groups)
  const availableGroups = useMemo(() => {
    if (kpiGroups.length > 0) {
      return [...kpiGroups].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return DEFAULT_GROUPS.map((name, i) => ({
      id: `default_${i}`,
      code: name.substring(0, 2).toUpperCase(),
      name,
      status: 'active' as const,
      order: i + 1
    }));
  }, [kpiGroups]);

  const totalActiveStandardScore = useMemo(() => {
    return kpis.filter(k => k.status === 'active').reduce((sum, k) => sum + (k.standardScore || k.pointValue || 10), 0);
  }, [kpis]);

  // Generate code helper with smart prefixing for both default and independent groups
  const generateKpiCode = (groupCodeOrIdOrName: string) => {
    let prefix = 'KP';
    const groupObj = resolveKpiGroup(groupCodeOrIdOrName, kpiGroups, kpis) ||
      kpiGroups.find(g => g.id === groupCodeOrIdOrName || g.code.toLowerCase() === groupCodeOrIdOrName.toLowerCase() || g.name.toLowerCase() === groupCodeOrIdOrName.toLowerCase());
    
    if (groupObj && groupObj.code) {
      prefix = groupObj.code.trim().toUpperCase();
    } else if (groupCodeOrIdOrName && groupCodeOrIdOrName.length <= 4 && !groupCodeOrIdOrName.includes(' ')) {
      prefix = groupCodeOrIdOrName.trim().toUpperCase();
    } else if (groupObj && groupObj.name) {
      const words = groupObj.name.trim().split(/\s+/);
      if (words.length > 1) {
        prefix = words.map(w => w[0]?.toUpperCase() || '').join('').substring(0, 4);
      } else {
        prefix = groupObj.name.substring(0, 2).toUpperCase();
      }
    } else {
      const str = (groupCodeOrIdOrName || '').toLowerCase();
      if (str.includes('nền nếp') || str.includes('nội quy')) prefix = 'NN';
      else if (str.includes('chuyên môn')) prefix = 'CM';
      else if (str.includes('thành tích') || str.includes('khen')) prefix = 'TT';
      else if (str.includes('công việc') || str.includes('nhiệm vụ')) prefix = 'CV';
      else if (str.includes('chủ nhiệm')) prefix = 'CN';
      else if (str.includes('văn hóa')) prefix = 'VH';
      else if (str.includes('hành chính')) prefix = 'HC';
      else if (str.includes('phục vụ')) prefix = 'PV';
    }

    // Find highest index among existing KPIs
    let maxIndex = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    kpis.forEach(k => {
      const m = (k.code || '').match(regex);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      }
    });

    if (maxIndex === 0) {
      const count = kpis.filter(k => k.code.startsWith(prefix)).length;
      maxIndex = count;
    }

    return `${prefix}${String(maxIndex + 1).padStart(2, '0')}`;
  };

  // Open Create KPI modal (supports auto-selecting current filter group if active)
  const handleOpenCreateKpi = () => {
    let defaultGroup = selectedGroup !== 'all' 
      ? kpiGroups.find(g => g.id === selectedGroup || g.name.toLowerCase() === selectedGroup.toLowerCase())
      : undefined;

    if (!defaultGroup) {
      defaultGroup = activeKpiGroups[0] || kpiGroups[0];
    }

    const autoCode = defaultGroup ? generateKpiCode(defaultGroup.id) : 'KP01';
    
    // Auto-select first active category under this group
    const matchedCats = defaultGroup 
      ? kpiCategories.filter(c => c.groupId === defaultGroup.id && c.status === 'active')
      : [];
    const defaultCat = matchedCats[0];

    const initialAudiences: KpiTargetCode[] = selectedTarget !== 'all' 
      ? [normalizeTargetGroup(selectedTarget)] 
      : ['CBQL', 'TTCM_TPCM', 'GV', 'NV'];

    setEditingKpi(null);
    setKpiFormData({
      code: autoCode,
      groupId: defaultGroup ? defaultGroup.id : '',
      group: defaultGroup ? defaultGroup.name : 'Nền nếp',
      categoryId: defaultCat ? defaultCat.id : '',
      category_id: defaultCat ? defaultCat.id : '',
      categoryName: defaultCat ? defaultCat.name : '',
      name: '',
      targetAudiences: initialAudiences,
      targetAudience: formatAudiencesString(initialAudiences),
      pointType: 'plus',
      pointValue: 10,
      standardScore: 10,
      plusScore: 2,
      minusScore: 1,
      condition: '',
      evidenceRequirement: 'Hồ sơ, minh chứng hoặc báo cáo xác nhận',
      evaluatorRole: 'BGH / Tổ trưởng',
      hasDeduction: true,
      deductionRules: [
        { id: `rule_${Date.now()}_1`, name: 'Vi phạm mức 1', deductionScore: 1, unit: 'Lần', status: 'active', order: 1 },
        { id: `rule_${Date.now()}_2`, name: 'Vi phạm mức 2', deductionScore: 2, unit: 'Lần', status: 'active', order: 2 },
      ],
      unit: 'Lần',
      status: 'active',
      order: kpis.length + 1,
      description: ''
    });
    setIsKpiModalOpen(true);
  };

  // Open Edit KPI modal
  const handleOpenEditKpi = (item: KpiItem) => {
    setEditingKpi(item);
    const matchedGroup = kpiGroups.find(
      g => g.id === item.groupId || 
      g.name.toLowerCase() === item.group?.toLowerCase() || 
      g.code.toLowerCase() === item.group?.toLowerCase()
    );
    const matchedCat = kpiCategories.find(
      c => c.id === item.categoryId ||
      c.id === item.category_id ||
      c.name.toLowerCase() === item.categoryName?.toLowerCase()
    );

    const resolvedAudiences = resolveAudiencesFromKpi(item);

    setKpiFormData({
      ...item,
      targetAudiences: resolvedAudiences,
      targetAudience: formatAudiencesString(resolvedAudiences),
      standardScore: item.standardScore || item.pointValue || 10,
      plusScore: item.plusScore ?? (item.pointType === 'plus' ? (item.standardScore || item.pointValue || 2) : 2),
      minusScore: item.minusScore ?? (item.deductionRules?.[0]?.deductionScore || (item.pointType === 'minus' ? item.pointValue : 1)),
      condition: item.condition || '',
      evidenceRequirement: item.evidenceRequirement || '',
      evaluatorRole: item.evaluatorRole || 'BGH / Tổ trưởng',
      hasDeduction: item.hasDeduction ?? true,
      deductionRules: item.deductionRules || [
        { id: `rule_${Date.now()}_1`, name: 'Vi phạm mức 1', deductionScore: 1, unit: item.unit || 'Lần', status: 'active', order: 1 }
      ],
      groupId: matchedGroup ? matchedGroup.id : item.groupId || '',
      group: matchedGroup ? matchedGroup.name : item.group || 'Khác',
      categoryId: matchedCat ? matchedCat.id : item.categoryId || item.category_id || '',
      category_id: matchedCat ? matchedCat.id : item.categoryId || item.category_id || '',
      categoryName: matchedCat ? matchedCat.name : item.categoryName || ''
    });
    setIsKpiModalOpen(true);
  };

  // Save KPI Item
  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiFormData.name || !kpiFormData.code) {
      alert('Vui lòng nhập Mã và Nội dung tiêu chí KPI');
      return;
    }

    // Check duplicate code
    const duplicate = kpis.find(k => k.code.trim().toUpperCase() === kpiFormData.code?.trim().toUpperCase() && k.id !== editingKpi?.id);
    if (duplicate) {
      alert(`Mã KPI "${kpiFormData.code}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    // Resolve group info
    const selectedG = kpiGroups.find(g => g.id === kpiFormData.groupId) || kpiGroups.find(g => g.name.toLowerCase() === kpiFormData.group?.toLowerCase());
    const resolvedGroupId = selectedG ? selectedG.id : kpiFormData.groupId || '';
    const resolvedGroupName = selectedG ? selectedG.name : kpiFormData.group || 'Khác';

    // Auto create or resolve category to satisfy AppContext validation
    let resolvedCategoryId = kpiFormData.categoryId || '';
    let resolvedCategoryName = kpiFormData.categoryName || '';

    if (!resolvedCategoryId || resolvedCategoryId === 'auto_create') {
      const existingCats = kpiCategories.filter(c => c.groupId === resolvedGroupId && c.status === 'active');
      if (existingCats.length > 0) {
        resolvedCategoryId = existingCats[0].id;
        resolvedCategoryName = existingCats[0].name;
      } else {
        try {
          const newCatId = `kpicat_auto_${Date.now()}`;
          const groupCode = selectedG ? selectedG.code : 'GP';
          const newCat: KpiCategory = {
            id: newCatId,
            groupId: resolvedGroupId,
            group_id: resolvedGroupId,
            code: `${groupCode}.01`,
            name: `Tiêu chí chung của ${resolvedGroupName}`,
            description: `Nhóm tiêu chí mặc định cho ${resolvedGroupName}`,
            order: 1,
            status: 'active'
          };
          await addKpiCategory(newCat);
          resolvedCategoryId = newCatId;
          resolvedCategoryName = newCat.name;
        } catch (catErr) {
          console.error("Lỗi tự động tạo nhóm tiêu chí:", catErr);
          alert("Không thể tạo nhóm tiêu chí phụ thuộc cho KPI.");
          return;
        }
      }
    } else {
      const selectedCat = kpiCategories.find(c => c.id === resolvedCategoryId);
      if (selectedCat) {
        resolvedCategoryName = selectedCat.name;
      }
    }

    try {
      const standardScore = Number(kpiFormData.standardScore) || Number(kpiFormData.pointValue) || 10;
      const hasDeduction = kpiFormData.hasDeduction ?? true;
      const deductionRules = kpiFormData.deductionRules || [];

      const selectedAudiences: KpiTargetCode[] = kpiFormData.targetAudiences && kpiFormData.targetAudiences.length > 0
        ? kpiFormData.targetAudiences
        : resolveAudiencesFromKpi(kpiFormData);
      const targetAudienceStr = formatAudiencesString(selectedAudiences);

      const kpiPayload = {
        code: kpiFormData.code.trim().toUpperCase(),
        groupId: resolvedGroupId,
        group: resolvedGroupName,
        categoryId: resolvedCategoryId,
        category_id: resolvedCategoryId,
        categoryName: resolvedCategoryName,
        name: kpiFormData.name.trim(),
        targetAudiences: selectedAudiences,
        targetAudience: targetAudienceStr,
        pointType: kpiFormData.pointType || 'plus',
        pointValue: Number(kpiFormData.pointValue) || 0,
        standardScore,
        plusScore: kpiFormData.plusScore ? Number(kpiFormData.plusScore) : undefined,
        minusScore: kpiFormData.minusScore ? Number(kpiFormData.minusScore) : undefined,
        condition: kpiFormData.condition?.trim() || '',
        evidenceRequirement: kpiFormData.evidenceRequirement?.trim() || '',
        evaluatorRole: kpiFormData.evaluatorRole?.trim() || 'BGH / Tổ trưởng',
        hasDeduction,
        deductionRules,
        unit: kpiFormData.unit || 'Lần',
        maxPoints: kpiFormData.maxPoints ? Number(kpiFormData.maxPoints) : undefined,
        minPoints: kpiFormData.minPoints ? Number(kpiFormData.minPoints) : undefined,
        status: kpiFormData.status || 'active',
        order: Number(kpiFormData.order) || 1,
        description: kpiFormData.description?.trim() || ''
      };

      if (editingKpi) {
        await updateKpi(editingKpi.id, kpiPayload);
        setToastMessage({ text: `Đã cập nhật tiêu chí KPI "${kpiFormData.code}" thành công.`, type: 'success' });
      } else {
        const newKpi: KpiItem = {
          id: `kpi_${Date.now()}`,
          ...kpiPayload,
          order: Number(kpiFormData.order) || (kpis.length + 1),
          createdBy: user?.name || 'BGH'
        };
        await addKpi(newKpi);
        setToastMessage({ text: `Đã tạo mới tiêu chí KPI "${newKpi.code}" thành công.`, type: 'success' });
      }
      setIsKpiModalOpen(false);
      setEditingKpi(null);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu tiêu chí KPI.');
    }
  };

  // Toggle KPI status (active/inactive)
  const handleToggleKpiStatus = async (item: KpiItem) => {
    try {
      const nextStatus = item.status === 'active' ? 'inactive' : 'active';
      await updateKpi(item.id, { status: nextStatus });
    } catch (err) {
      console.error(err);
      alert('Không thể thay đổi trạng thái KPI.');
    }
  };

  // Open Delete KPI Modal
  const handleOpenDeleteKpiModal = (item: KpiItem) => {
    setKpiToDelete(item);
    setDeleteRecordsOption(true);
  };

  // Confirm Delete KPI
  const handleConfirmDeleteKpi = async () => {
    if (!kpiToDelete) return;
    setIsDeletingKpi(true);
    try {
      const associatedRecords = kpiRecords.filter(r => r.kpiId === kpiToDelete.id || r.kpiCode === kpiToDelete.code);
      const count = associatedRecords.length;

      await deleteKpi(kpiToDelete.id, deleteRecordsOption);

      setToastMessage({
        type: 'success',
        text: `Đã xóa tiêu chí KPI "${kpiToDelete.code} - ${kpiToDelete.name}"${deleteRecordsOption && count > 0 ? ` cùng ${count} bản ghi điểm liên quan` : ''} thành công.`
      });
      setKpiToDelete(null);
    } catch (err) {
      console.error('Lỗi khi xóa tiêu chí KPI:', err);
      setToastMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi xóa tiêu chí KPI. Vui lòng thử lại.'
      });
    } finally {
      setIsDeletingKpi(false);
    }
  };

  // Deactivate instead of permanent delete
  const handleDeactivateInstead = async () => {
    if (!kpiToDelete) return;
    try {
      await updateKpi(kpiToDelete.id, { status: 'inactive' });
      setToastMessage({
        type: 'success',
        text: `Đã chuyển tiêu chí KPI "${kpiToDelete.code}" sang trạng thái "Ngừng sử dụng".`
      });
      setKpiToDelete(null);
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      setToastMessage({
        type: 'error',
        text: 'Không thể cập nhật trạng thái tiêu chí KPI.'
      });
    }
  };

  // Open Record/Assign modal
  const handleOpenAssignModal = (teacherId?: string, kpiId?: string) => {
    setPreselectedTeacherId(teacherId);
    setPreselectedKpiId(kpiId);
    setIsRecordModalOpen(true);
  };

  // Quick verify/reject record
  const handleVerifyRecord = async (record: KpiRecord, status: 'confirmed' | 'rejected') => {
    try {
      await updateKpiRecord(record.id, {
        status,
        confirmedBy: user?.name || 'Ban Giám Hiệu',
        confirmedDate: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xác nhận KPI.');
    }
  };

  // Delete Record
  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeletingRecord(true);
    try {
      const teacher = teachers.find(t => t.id === recordToDelete.teacherId);
      await deleteKpiRecord(recordToDelete.id);
      setToastMessage({
        type: 'success',
        text: `Đã xóa bản ghi điểm KPI của ${teacher?.name || 'giáo viên'} thành công.`
      });
      setRecordToDelete(null);
    } catch (err) {
      console.error('Lỗi khi xóa bản ghi KPI:', err);
      setToastMessage({
        type: 'error',
        text: 'Có lỗi khi xóa bản ghi. Vui lòng thử lại.'
      });
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Filtered KPIs for Catalog (supports both default and independent custom KPI groups)
  const filteredKpis = useMemo(() => {
    return kpis.filter(kpi => {
      const matchSearch = searchTerm === '' || 
        kpi.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (kpi.description && kpi.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const groupObj = resolveKpiGroup(kpi, kpiGroups, kpis);
      const groupName = resolveKpiGroupName(kpi, kpiGroups, kpis);
      const selectedGroupObj = kpiGroups.find(g => g.id === selectedGroup || g.name.toLowerCase() === selectedGroup.toLowerCase());

      const matchGroup = selectedGroup === 'all' || 
        kpi.groupId === selectedGroup || 
        groupObj?.id === selectedGroup || 
        groupName.toLowerCase() === selectedGroup.toLowerCase() ||
        (kpi.group && kpi.group.toLowerCase() === selectedGroup.toLowerCase()) ||
        (selectedGroupObj && (kpi.groupId === selectedGroupObj.id || groupObj?.id === selectedGroupObj.id || groupName.toLowerCase() === selectedGroupObj.name.toLowerCase()));

      const matchType = selectedPointType === 'all' || kpi.pointType === selectedPointType;
      const matchStatus = selectedStatus === 'all' || kpi.status === selectedStatus;
      const matchTarget = selectedTarget === 'all' || 
        matchKpiToTargetGroup(kpi.targetAudiences && kpi.targetAudiences.length > 0 ? kpi.targetAudiences : kpi.targetAudience, selectedTarget);

      return matchSearch && matchGroup && matchType && matchStatus && matchTarget;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [kpis, kpiGroups, searchTerm, selectedGroup, selectedPointType, selectedStatus, selectedTarget]);

  // Filtered Teachers and their KPI aggregations for Tracking Tab
  const teacherKpiStats = useMemo(() => {
    return teachers.map(teacher => {
      const teacherRecords = kpiRecords.filter(r => {
        const isSelf = r.teacherId === teacher.id;
        const inMonth = !trackingMonth || r.date.startsWith(trackingMonth);
        const isConfirmed = r.status === 'confirmed';
        return isSelf && inMonth && isConfirmed;
      });

      const plusPoints = teacherRecords
        .filter(r => r.pointType === 'plus')
        .reduce((sum, r) => sum + (r.totalPoints || 0), 0);

      const minusPoints = teacherRecords
        .filter(r => r.pointType === 'minus')
        .reduce((sum, r) => sum + Math.abs(r.totalPoints || 0), 0);

      const netScore = plusPoints - minusPoints;
      const recordCount = teacherRecords.length;

      const dept = departments.find(d => d.id === teacher.departmentId);

      return {
        teacher,
        departmentName: dept?.name || 'Chưa phân tổ',
        departmentId: teacher.departmentId,
        plusPoints,
        minusPoints,
        netScore,
        recordCount,
        records: teacherRecords
      };
    }).filter(item => {
      const matchDept = selectedDeptId === 'all' || item.departmentId === selectedDeptId;
      const matchSearch = trackingSearch === '' ||
        item.teacher.name.toLowerCase().includes(trackingSearch.toLowerCase()) ||
        item.teacher.code.toLowerCase().includes(trackingSearch.toLowerCase());
      return matchDept && matchSearch;
    }).sort((a, b) => b.netScore - a.netScore);
  }, [teachers, kpiRecords, departments, trackingMonth, selectedDeptId, trackingSearch]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCatalog = kpis.length;
    const activeCatalog = kpis.filter(k => k.status === 'active').length;
    
    // Total points confirmed in selected tracking month
    const confirmedMonthRecords = kpiRecords.filter(r => 
      (!trackingMonth || r.date.startsWith(trackingMonth)) && r.status === 'confirmed'
    );
    const totalPlus = confirmedMonthRecords
      .filter(r => r.pointType === 'plus')
      .reduce((sum, r) => sum + (r.totalPoints || 0), 0);
    const totalMinus = confirmedMonthRecords
      .filter(r => r.pointType === 'minus')
      .reduce((sum, r) => sum + Math.abs(r.totalPoints || 0), 0);

    const pendingCount = kpiRecords.filter(r => r.status === 'pending').length;

    return {
      totalCatalog,
      activeCatalog,
      totalPlus,
      totalMinus,
      pendingCount
    };
  }, [kpis, kpiRecords, trackingMonth]);

  // Group badge color helper
  const getGroupBadgeColor = (group: string) => {
    const g = (group || '').toLowerCase();
    if (g.includes('nền nếp') || g.includes('nội quy') || g === 'nn' || g === 'vp') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (g.includes('chuyên môn') || g === 'cm' || g === 'tc') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (g.includes('thành tích') || g.includes('khen') || g === 'tt') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (g.includes('chủ nhiệm') || g === 'cn') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (g.includes('công việc') || g.includes('nhiệm vụ') || g === 'cv' || g === 'nv') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (g.includes('văn hóa') || g === 'vh') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (g.includes('hành chính') || g === 'hc') {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    if (g.includes('phục vụ') || g === 'pv') {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  // Export to CSV helper
  const handleExportCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "STT,Mã KPI,Nhóm KPI,Nội dung tiêu chí,Đối tượng áp dụng,Loại điểm,Điểm số,Đơn vị tính,Mức tối đa/tháng,Trạng thái,Mô tả\n";
    
    filteredKpis.forEach((k, index) => {
      const gName = getKpiGroupName(k);
      const row = [
        index + 1,
        `"${k.code}"`,
        `"${gName}"`,
        `"${k.name.replace(/"/g, '""')}"`,
        `"${k.targetAudience}"`,
        k.pointType === 'plus' ? 'Cộng (+)' : 'Trừ (-)',
        k.pointValue,
        `"${k.unit}"`,
        k.maxPoints || 'Không giới hạn',
        k.status === 'active' ? 'Đang áp dụng' : 'Ngừng áp dụng',
        `"${(k.description || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DanhMuc_KPI_THPT_MinhHoa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center">
        <BackButton />
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={cn(
            "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200",
            toastMessage.type === 'success' 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                DANH MỤC TIÊU CHÍ & THEO DÕI KPI
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                THPT Minh Hòa
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý danh mục chỉ số định lượng, ghi nhận điểm cộng/trừ và tổng hợp đánh giá xếp loại thi đua viên chức
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/monthly-kpi"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Award className="w-4 h-4 text-blue-600" />
            KPI CBGVNV theo tháng
          </Link>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 border hover:bg-slate-50 transition-colors bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Xuất Excel/CSV
          </button>

          {canManageCatalog && (
            <button
              onClick={async () => {
                setIsCheckingData(true);
                try {
                  const res = await checkAndRepairKpiData();
                  setCheckResult(res);
                  setToastMessage({
                    type: 'success',
                    text: `Đã quét và tối ưu hóa liên kết dữ liệu KPI thành công.`
                  });
                } catch (err) {
                  console.error(err);
                  setToastMessage({
                    type: 'error',
                    text: 'Có lỗi xảy ra khi kiểm tra dữ liệu KPI.'
                  });
                } finally {
                  setIsCheckingData(false);
                }
              }}
              disabled={isCheckingData}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Kiểm tra tính nhất quán dữ liệu, phát hiện tiêu chí mồ côi và gom nhóm tự động"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              {isCheckingData ? 'Đang kiểm tra...' : 'Kiểm tra dữ liệu KPI'}
            </button>
          )}

          {canManageCatalog && (
            <button
              onClick={() => setIsGroupManagerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 border hover:bg-slate-50 hover:text-blue-600 transition-colors bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              title="Quản lý danh mục các nhóm KPI (Thêm, sửa, xóa, kích hoạt)"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Quản lý nhóm KPI
            </button>
          )}

          {canAssignOrVerify && (
            <button
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              Ghi nhận / Giao KPI
            </button>
          )}

          {canManageCatalog && (
            <button
              onClick={handleOpenCreateKpi}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Thêm tiêu chí KPI
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng số tiêu chí KPI</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{stats.totalCatalog}</span>
              <span className="text-xs text-emerald-600 font-medium">({stats.activeCatalog} đang dùng)</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng điểm cộng tháng</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">+{stats.totalPlus}</span>
              <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng điểm trừ tháng</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-rose-600">-{stats.totalMinus}</span>
              <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chờ BGH/TTCM duyệt</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600">{stats.pendingCount}</span>
              <span className="text-xs text-slate-400">minh chứng/yêu cầu</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={cn(
              "flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'catalog'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            <Layers className="w-4 h-4" />
            1. Danh mục Tiêu chí KPI ({kpis.length})
          </button>
          
          <button
            onClick={() => setActiveTab('tracking')}
            className={cn(
              "flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'tracking'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            <Users className="w-4 h-4" />
            2. Bảng Điểm KPI Giáo viên ({teachers.length})
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={cn(
              "flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'records'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            <FileText className="w-4 h-4" />
            3. Nhật ký & Lịch sử Ghi nhận KPI ({kpiRecords.length})
            {stats.pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold">
                {stats.pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: DANH MỤC TIÊU CHÍ KPI (DANH SÁCH & BẢNG TIÊU CHÍ GỐC) */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar with 4 Target Tabs */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm flex flex-col gap-3.5">
            {/* 4 ĐỐI TƯỢNG ĐÁNH GIÁ TABS */}
            <div className="flex flex-col gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4 Đối tượng đánh giá KPI:
                </span>
                <span className="text-[11px] text-slate-400">
                  TTCM và TPCM dùng chung một bộ KPI (mã TTCM_TPCM)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTarget('all')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                    selectedTarget === 'all'
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tất cả ({kpis.length})</span>
                </button>

                {KPI_TARGET_OPTIONS.map(opt => {
                  const isSelected = selectedTarget === opt.code;
                  // Count KPIs matching this target
                  const count = kpis.filter(k => matchKpiToTargetGroup(k.targetAudiences || k.targetAudience, opt.code)).length;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setSelectedTarget(opt.code)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50/60 hover:border-blue-200"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        opt.code === 'CBQL' ? "bg-amber-400" :
                        opt.code === 'TTCM_TPCM' ? "bg-purple-400" :
                        opt.code === 'GV' ? "bg-emerald-400" : "bg-sky-400"
                      )} />
                      <span>{opt.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 text-[10px] rounded-full font-semibold",
                        isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedTarget === 'TTCM_TPCM' && (
                <div className="flex items-center gap-2 p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 mt-1 animate-fadeIn">
                  <span className="font-bold shrink-0">ℹ️ Lưu ý:</span>
                  <span>Tổ trưởng chuyên môn và Tổ phó chuyên môn sử dụng <strong>CHUNG</strong> toàn bộ nhóm KPI và tiêu chí KPI này (Mã: <strong>TTCM_TPCM</strong>), không tách thành hai bộ riêng.</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã, tên tiêu chí hoặc minh chứng..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50/60"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Group Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Nhóm:</span>
                  <select
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
                  >
                    <option value="all">Tất cả nhóm ({availableGroups.length})</option>
                    {availableGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Point Type Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Loại:</span>
                  <select
                    value={selectedPointType}
                    onChange={e => setSelectedPointType(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
                  >
                    <option value="all">Tất cả loại điểm</option>
                    <option value="plus">Điểm cộng (+)</option>
                    <option value="minus">Điểm trừ (-)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Trạng thái:</span>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">🟢 Đang áp dụng</option>
                    <option value="inactive">⚪ Ngừng áp dụng</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                {(searchTerm || selectedGroup !== 'all' || selectedPointType !== 'all' || selectedStatus !== 'all' || selectedTarget !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGroup('all');
                      setSelectedPointType('all');
                      setSelectedStatus('all');
                      setSelectedTarget('all');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              {/* Counter and quick action */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Hiển thị <strong className="text-slate-900 font-bold">{filteredKpis.length}</strong> / {kpis.length} tiêu chí
                </span>
                {canManageCatalog && (
                  <button
                    onClick={handleOpenCreateKpi}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm tiêu chí
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* KPI Items Table - 8 Explicit Columns */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-3 w-10 text-center">STT</th>
                    <th className="py-3.5 px-3 w-24">Mã tiêu chí</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Tên tiêu chí</th>
                    <th className="py-3.5 px-3 w-36">Nhóm</th>
                    <th className="py-3.5 px-3 w-44">Đối tượng áp dụng</th>
                    <th className="py-3.5 px-3 w-24 text-center">Điểm nền</th>
                    <th className="py-3.5 px-3 w-32 text-center">Mức trừ / cộng</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Minh chứng</th>
                    <th className="py-3.5 px-3 w-32 text-center">Người đánh giá</th>
                    <th className="py-3.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-3.5 px-3 w-24 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKpis.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        <Layers className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="text-base font-medium text-slate-600">Không tìm thấy tiêu chí KPI phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn lại đối tượng</p>
                        {(searchTerm || selectedGroup !== 'all' || selectedPointType !== 'all' || selectedStatus !== 'all' || selectedTarget !== 'all') && (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setSelectedGroup('all');
                              setSelectedPointType('all');
                              setSelectedStatus('all');
                              setSelectedTarget('all');
                            }}
                            className="mt-3 px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Xóa bộ lọc
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredKpis.map((kpi, index) => {
                      const groupName = getKpiGroupName(kpi);
                      const audiences = resolveAudiencesFromKpi(kpi);
                      const baseScore = kpi.standardScore || kpi.pointValue || 10;
                      const evidence = kpi.evidenceRequirement || kpi.description || 'Hồ sơ, minh chứng hoặc biên bản xác nhận';
                      const evaluator = kpi.evaluatorRole || (audiences.includes('CBQL') ? 'BGH / Cấp trên' : (audiences.includes('TTCM_TPCM') ? 'BGH' : 'BGH / Tổ trưởng'));

                      return (
                        <tr key={kpi.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-3 text-center text-xs font-mono text-slate-400">
                            {index + 1}
                          </td>

                          {/* 1. Mã tiêu chí */}
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 text-slate-800 rounded border border-slate-200">
                              {kpi.code}
                            </span>
                          </td>

                          {/* 2. Tên tiêu chí */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 leading-snug">{kpi.name}</div>
                            {kpi.condition && (
                              <div className="text-[11px] text-amber-700 bg-amber-50/70 px-1.5 py-0.5 rounded mt-1 inline-block border border-amber-200/60">
                                📌 {kpi.condition}
                              </div>
                            )}
                            {kpi.description && !kpi.condition && (
                              <div className="text-xs text-slate-500 line-clamp-2 mt-0.5" title={kpi.description}>
                                {kpi.description}
                              </div>
                            )}
                          </td>

                          {/* 3. Nhóm */}
                          <td className="py-3.5 px-3">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                              getGroupBadgeColor(groupName)
                            )}>
                              {groupName}
                            </span>
                          </td>

                          {/* 4. Đối tượng áp dụng */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {audiences.length === 4 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Tất cả (4 đối tượng)
                                </span>
                              ) : (
                                audiences.map(aud => {
                                  const colorClass = 
                                    aud === 'CBQL' ? "bg-amber-50 text-amber-800 border-amber-200" :
                                    aud === 'TTCM_TPCM' ? "bg-purple-50 text-purple-800 border-purple-200" :
                                    aud === 'GV' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                    "bg-sky-50 text-sky-800 border-sky-200";
                                  const label = 
                                    aud === 'CBQL' ? 'CBQL' :
                                    aud === 'TTCM_TPCM' ? 'TTCM/TPCM' :
                                    aud === 'GV' ? 'Giáo viên' : 'Nhân viên';
                                  return (
                                    <span key={aud} className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold border", colorClass)}>
                                      {label}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>

                          {/* 5. Điểm nền */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-slate-800 text-xs px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                              {baseScore} đ
                            </span>
                          </td>

                          {/* 6. Mức trừ / cộng */}
                          <td className="py-3.5 px-3 text-center">
                            {kpi.pointType === 'plus' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{kpi.plusScore || baseScore} đ
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  -{kpi.minusScore || kpi.deductionRules?.[0]?.deductionScore || kpi.pointValue || 1} đ/{kpi.unit || 'lần'}
                                </span>
                                {kpi.deductionRules && kpi.deductionRules.length > 1 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ({kpi.deductionRules.length} mức vi phạm)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 7. Minh chứng */}
                          <td className="py-3.5 px-3">
                            <div className="text-xs text-slate-600 line-clamp-2" title={evidence}>
                              {evidence}
                            </div>
                          </td>

                          {/* 8. Người đánh giá */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              {evaluator}
                            </span>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-3 text-center">
                            {canManageCatalog ? (
                              <button
                                onClick={() => handleToggleKpiStatus(kpi)}
                                title="Bấm để bật/tắt áp dụng tiêu chí"
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                                  kpi.status === 'active'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", kpi.status === 'active' ? "bg-emerald-500" : "bg-slate-400")} />
                                {kpi.status === 'active' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                              </button>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                                kpi.status === 'active'
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", kpi.status === 'active' ? "bg-emerald-500" : "bg-slate-400")} />
                                {kpi.status === 'active' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                              </span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canAssignOrVerify && kpi.status === 'active' && (
                                <button
                                  onClick={() => handleOpenAssignModal(undefined, kpi.id)}
                                  title="Ghi nhận điểm cho giáo viên theo tiêu chí này"
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {canManageCatalog && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditKpi(kpi)}
                                    title="Chỉnh sửa tiêu chí"
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteKpiModal(kpi)}
                                    title="Xóa tiêu chí này"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: BẢNG ĐIỂM KPI GIÁO VIÊN */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Tháng:</span>
                <input
                  type="month"
                  value={trackingMonth}
                  onChange={e => setTrackingMonth(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Department */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Tổ:</span>
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tất cả tổ chuyên môn</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm giáo viên..."
                  value={trackingSearch}
                  onChange={e => setTrackingSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Tổng số: <strong>{teacherKpiStats.length}</strong> CBGVNV
            </div>
          </Card>

          {/* Teacher Stats Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-50/80/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">Xếp hạng</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Cán bộ / Giáo viên</th>
                    <th className="py-3.5 px-4 w-44">Tổ chuyên môn</th>
                    <th className="py-3.5 px-4 w-28 text-center">Điểm cộng (+)</th>
                    <th className="py-3.5 px-4 w-28 text-center">Điểm trừ (-)</th>
                    <th className="py-3.5 px-4 w-32 text-center">Điểm KPI Tổng</th>
                    <th className="py-3.5 px-4 w-28 text-center">Số ghi nhận</th>
                    <th className="py-3.5 px-4 w-32 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherKpiStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="text-base font-medium text-slate-600">Không có dữ liệu giáo viên phù hợp</p>
                      </td>
                    </tr>
                  ) : (
                    teacherKpiStats.map((item, index) => (
                      <tr key={item.teacher.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          {index === 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">🥇</span>}
                          {index === 1 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">🥈</span>}
                          {index === 2 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-bold text-xs">🥉</span>}
                          {index > 2 && <span className="text-xs font-mono text-slate-400">#{index + 1}</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={item.teacher.avatar} name={item.teacher.name} size="sm" />
                            <div>
                              <div className="font-semibold text-slate-900">{item.teacher.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{item.teacher.code} - {item.teacher.subject}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                          {item.departmentName}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-emerald-600 text-sm">
                            +{item.plusPoints}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-rose-600 text-sm">
                            -{item.minusPoints}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                            item.netScore > 0 ? "bg-emerald-100 text-emerald-800" :
                            item.netScore < 0 ? "bg-rose-100 text-rose-800" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {item.netScore > 0 ? `+${item.netScore}` : item.netScore} điểm
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                          {item.recordCount} việc
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canAssignOrVerify && (
                              <button
                                onClick={() => handleOpenAssignModal(item.teacher.id)}
                                title="Ghi nhận điểm KPI cho giáo viên này"
                                className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                + Ghi nhận
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTeacherForDetail(item.teacher)}
                              title="Xem chi tiết lịch sử KPI"
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: NHẬT KÝ & LỊCH SỬ GHI NHẬN KPI */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Records Filters */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Teacher filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Giáo viên:</span>
                <select
                  value={recordTeacherFilter}
                  onChange={e => setRecordTeacherFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tất cả giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Trạng thái:</span>
                <select
                  value={recordStatusFilter}
                  onChange={e => setRecordStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">⏳ Chờ BGH/TTCM xác nhận</option>
                  <option value="confirmed">✅ Đã xác nhận</option>
                  <option value="rejected">❌ Đã từ chối</option>
                </select>
              </div>
            </div>

            {canAssignOrVerify && (
              <button
                onClick={() => handleOpenAssignModal()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Ghi nhận KPI mới
              </button>
            )}
          </Card>

          {/* Records Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-50/80/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-28">Ngày</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Cán bộ / Giáo viên</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Tiêu chí KPI</th>
                    <th className="py-3.5 px-4 w-28 text-center">Số lượng</th>
                    <th className="py-3.5 px-4 w-28 text-center">Tổng điểm</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Nhiệm vụ / Minh chứng</th>
                    <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 w-28 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpiRecords
                    .filter(r => {
                      const matchTeacher = recordTeacherFilter === 'all' || r.teacherId === recordTeacherFilter;
                      const matchStatus = recordStatusFilter === 'all' || r.status === recordStatusFilter;
                      return matchTeacher && matchStatus;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((rec) => {
                      const teacher = teachers.find(t => t.id === rec.teacherId);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                            {rec.date}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{teacher?.name || 'Chưa rõ'}</div>
                            <div className="text-xs text-slate-400 font-mono">{teacher?.code}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border">
                                {rec.kpiCode}
                              </span>
                              <span className="font-medium text-slate-900">{rec.kpiName}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Nhóm: <span className="font-medium">{resolveKpiGroupName(rec, kpiGroups, kpis)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                            {rec.quantity} {rec.unit}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {rec.pointType === 'plus' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{rec.totalPoints} đ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {rec.totalPoints} đ
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-xs">
                            {rec.taskTitle && (
                              <div className="text-blue-700 font-medium truncate max-w-[200px]" title={rec.taskTitle}>
                                📋 {rec.taskTitle}
                              </div>
                            )}
                            {rec.evidenceNote && (
                              <div className="text-slate-600 italic truncate max-w-[200px]" title={rec.evidenceNote}>
                                {rec.evidenceNote}
                              </div>
                            )}
                            {rec.evidenceUrl && (
                              <a
                                href={rec.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="w-3 h-3" /> Xem minh chứng
                              </a>
                            )}
                            {!rec.taskTitle && !rec.evidenceNote && !rec.evidenceUrl && (
                              <span className="text-slate-400">Ghi nhận trực tiếp</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {rec.status === 'confirmed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5" /> Đã xác nhận
                              </span>
                            ) : rec.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" /> Đã từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> Chờ duyệt
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canAssignOrVerify && rec.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleVerifyRecord(rec, 'confirmed')}
                                    title="Xác nhận duyệt"
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleVerifyRecord(rec, 'rejected')}
                                    title="Từ chối"
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {canAssignOrVerify && (
                                <button
                                  onClick={() => setRecordToDelete(rec)}
                                  title="Xóa bản ghi này"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 1: THÊM / CHỈNH SỬA TIÊU CHÍ KPI */}
      {isKpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingKpi ? 'Chỉnh sửa Tiêu chí KPI' : 'Thêm Tiêu chí KPI Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Cấu hình định lượng chỉ số KPI trong hệ thống</p>
                </div>
              </div>
              <button 
                onClick={() => setIsKpiModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mã KPI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: VP01, TC01..."
                    value={kpiFormData.code || ''}
                    onChange={e => setKpiFormData({ ...kpiFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Mã định danh duy nhất</p>
                </div>

                {/* Group */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Nhóm KPI *
                    </label>
                    {canManageCatalog && (
                      <button
                        type="button"
                        onClick={() => setIsGroupManagerOpen(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-0.5"
                      >
                        <Settings className="w-3 h-3" />
                        Quản lý nhóm
                      </button>
                    )}
                  </div>
                  <select
                    value={kpiFormData.groupId || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedG = kpiGroups.find(g => g.id === selectedId);
                      if (selectedG) {
                        const matchedCats = kpiCategories.filter(c => c.groupId === selectedId && c.status === 'active');
                        const defaultCat = matchedCats[0];
                        setKpiFormData(prev => ({
                          ...prev,
                          groupId: selectedG.id,
                          group: selectedG.name,
                          categoryId: defaultCat ? defaultCat.id : '',
                          category_id: defaultCat ? defaultCat.id : '',
                          categoryName: defaultCat ? defaultCat.name : '',
                          code: editingKpi ? prev.code : generateKpiCode(selectedG.code)
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    {modalGroupOptions.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code}){g.status === 'inactive' ? ' - Ngừng dùng' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={kpiFormData.order || 1}
                    onChange={e => setKpiFormData({ ...kpiFormData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Category (Level 2) Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nhóm tiêu chí phụ thuộc (Cấp 2) *
                </label>
                <select
                  required
                  value={kpiFormData.categoryId || ''}
                  onChange={e => {
                    const selectedCatId = e.target.value;
                    const selectedCat = kpiCategories.find(c => c.id === selectedCatId);
                    if (selectedCat) {
                      setKpiFormData(prev => ({
                        ...prev,
                        categoryId: selectedCat.id,
                        category_id: selectedCat.id,
                        categoryName: selectedCat.name
                      }));
                    } else if (selectedCatId === 'auto_create') {
                      setKpiFormData(prev => ({
                        ...prev,
                        categoryId: 'auto_create',
                        category_id: 'auto_create',
                        categoryName: ''
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="">-- Chọn nhóm tiêu chí --</option>
                  {kpiCategories
                    .filter(c => c.groupId === kpiFormData.groupId && c.status === 'active')
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  {kpiCategories.filter(c => c.groupId === kpiFormData.groupId && c.status === 'active').length === 0 && (
                    <option value="auto_create">-- Tự động tạo nhóm tiêu chí mới cho nhóm này --</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Phân loại chi tiết cấp 2 của tiêu chí để phục vụ thống kê đồng bộ
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung tiêu chí KPI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Viết bài Website nhà trường, Vào tiết muộn 5-7 phút..."
                  value={kpiFormData.name || ''}
                  onChange={e => setKpiFormData({ ...kpiFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mô tả chi tiết / Tiêu chuẩn áp dụng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ yêu cầu minh chứng, điều kiện xét hoặc căn cứ quy định..."
                  value={kpiFormData.description || ''}
                  onChange={e => setKpiFormData({ ...kpiFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Score */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tổng điểm tiêu chí KPI *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={kpiFormData.standardScore ?? 10}
                      onChange={e => setKpiFormData({ ...kpiFormData, standardScore: Number(e.target.value), pointValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <span className="absolute right-3 text-xs text-slate-500 font-medium">điểm</span>
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Đơn vị tính *
                  </label>
                  <select
                    value={kpiFormData.unit || 'Lần'}
                    onChange={e => setKpiFormData({ ...kpiFormData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deduction Rules Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    Điểm trừ tiêu chí KPI (Các mức vi phạm do BGH quy định)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rules = kpiFormData.deductionRules || [];
                      setKpiFormData({
                        ...kpiFormData,
                        deductionRules: [
                          ...rules,
                          {
                            id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            name: '',
                            deductionScore: 1,
                            unit: kpiFormData.unit || 'Lần',
                            status: 'active',
                            order: rules.length + 1
                          }
                        ]
                      });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm mức điểm trừ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(kpiFormData.deductionRules || []).map((rule, idx) => (
                    <div key={rule.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">MỨC {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const rules = [...(kpiFormData.deductionRules || [])];
                            rules.splice(idx, 1);
                            setKpiFormData({ ...kpiFormData, deductionRules: rules });
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xóa mức
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Nội dung vi phạm (VD: Vi phạm nhẹ, Đi muộn...)"
                            value={rule.name || ''}
                            onChange={e => {
                              const rules = [...(kpiFormData.deductionRules || [])];
                              rules[idx] = { ...rules[idx], name: e.target.value };
                              setKpiFormData({ ...kpiFormData, deductionRules: rules });
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              placeholder="1"
                              value={rule.deductionScore ?? 1}
                              onChange={e => {
                                const rules = [...(kpiFormData.deductionRules || [])];
                                rules[idx] = { ...rules[idx], deductionScore: Math.abs(Number(e.target.value)) };
                                setKpiFormData({ ...kpiFormData, deductionRules: rules });
                              }}
                              className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">điểm / {rule.unit || 'lần'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!kpiFormData.deductionRules || kpiFormData.deductionRules.length === 0) && (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      Chưa có mức điểm trừ nào. Nhấn "+ Thêm mức điểm trừ" để định nghĩa các mức vi phạm.
                    </div>
                  )}
                </div>
              </div>

              {/* 4 ĐỐI TƯỢNG ÁP DỤNG */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Đối tượng áp dụng tiêu chí KPI *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allCodes: KpiTargetCode[] = ['CBQL', 'TTCM_TPCM', 'GV', 'NV'];
                        setKpiFormData({
                          ...kpiFormData,
                          targetAudiences: allCodes,
                          targetAudience: formatAudiencesString(allCodes)
                        });
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setKpiFormData({
                          ...kpiFormData,
                          targetAudiences: [],
                          targetAudience: ''
                        });
                      }}
                      className="text-[11px] text-slate-500 hover:underline font-medium"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {KPI_TARGET_OPTIONS.map(opt => {
                    const currentAudiences = kpiFormData.targetAudiences || [];
                    const isChecked = currentAudiences.includes(opt.code);

                    return (
                      <label
                        key={opt.code}
                        className={cn(
                          "flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all",
                          isChecked
                            ? "bg-white border-blue-500 ring-2 ring-blue-100 shadow-xs"
                            : "bg-white/60 border-slate-200 hover:bg-white text-slate-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let updated: KpiTargetCode[];
                            if (isChecked) {
                              updated = currentAudiences.filter(c => c !== opt.code);
                            } else {
                              updated = [...currentAudiences, opt.code];
                            }
                            setKpiFormData({
                              ...kpiFormData,
                              targetAudiences: updated,
                              targetAudience: formatAudiencesString(updated)
                            });
                          }}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className={cn("font-bold", isChecked ? "text-slate-900" : "text-slate-700")}>
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Mã: {opt.code}
                          </span>
                          {opt.code === 'TTCM_TPCM' && (
                            <span className="text-[9.5px] text-purple-600 font-medium mt-0.5">
                              (Dùng chung TTCM & TPCM)
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {(!kpiFormData.targetAudiences || kpiFormData.targetAudiences.length === 0) && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    ⚠️ Vui lòng chọn ít nhất một đối tượng áp dụng cho tiêu chí này.
                  </p>
                )}
              </div>

              {/* Thông tin mở rộng: Minh chứng, Người đánh giá, Điều kiện áp dụng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Minh chứng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Yêu cầu minh chứng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Kế hoạch tuần, Biên bản kiểm tra..."
                    value={kpiFormData.evidenceRequirement || ''}
                    onChange={e => setKpiFormData({ ...kpiFormData, evidenceRequirement: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Người đánh giá */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Người đánh giá
                  </label>
                  <input
                    type="text"
                    placeholder="VD: BGH, Tổ trưởng, Hội đồng..."
                    value={kpiFormData.evaluatorRole || ''}
                    onChange={e => setKpiFormData({ ...kpiFormData, evaluatorRole: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái sử dụng
                  </label>
                  <select
                    value={kpiFormData.status || 'active'}
                    onChange={e => setKpiFormData({ ...kpiFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="active">🟢 Đang sử dụng</option>
                    <option value="inactive">⚪ Ngừng sử dụng</option>
                  </select>
                </div>
              </div>

              {/* Điều kiện áp dụng & Điểm tối đa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Điều kiện áp dụng (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Áp dụng khi phát hiện vi phạm quy chế..."
                    value={kpiFormData.condition || ''}
                    onChange={e => setKpiFormData({ ...kpiFormData, condition: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mức điểm tối đa trong tháng (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    placeholder="Để trống nếu không giới hạn..."
                    value={kpiFormData.maxPoints || ''}
                    onChange={e => setKpiFormData({ ...kpiFormData, maxPoints: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {editingKpi ? (
                  <button
                    type="button"
                    onClick={() => {
                      const kpiToDel = editingKpi;
                      setIsKpiModalOpen(false);
                      handleOpenDeleteKpiModal(kpiToDel);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa tiêu chí này</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsKpiModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20"
                  >
                    {editingKpi ? 'Lưu thay đổi' : 'Tạo tiêu chí'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GHI NHẬN / GIAO KPI CHO CÁ NHÂN */}
      {isRecordModalOpen && (
        <KpiRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setPreselectedTeacherId(undefined);
            setPreselectedKpiId(undefined);
          }}
          initialTeacherId={preselectedTeacherId}
          initialKpiId={preselectedKpiId}
          onSuccess={(msg) => {
            setToastMessage({
              type: 'success',
              text: msg
            });
            setIsRecordModalOpen(false);
            setPreselectedTeacherId(undefined);
            setPreselectedKpiId(undefined);
          }}
        />
      )}

      {/* MODAL 3: CHI TIẾT HỒ SƠ KPI CÁ NHÂN */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-4">
                <Avatar src={selectedTeacherForDetail.avatar} name={selectedTeacherForDetail.name} size="lg" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedTeacherForDetail.name}</h3>
                  <p className="text-xs text-slate-500">
                    Mã: <span className="font-mono font-semibold">{selectedTeacherForDetail.code}</span> | 
                    Tổ: <span className="font-medium">{departments.find(d => d.id === selectedTeacherForDetail.departmentId)?.name || 'Chưa phân tổ'}</span> | 
                    Môn: <span className="font-medium">{selectedTeacherForDetail.subject}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeacherForDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Aggregate Score summary */}
              {(() => {
                const records = kpiRecords.filter(r => r.teacherId === selectedTeacherForDetail.id && r.status === 'confirmed');
                const plus = records.filter(r => r.pointType === 'plus').reduce((s, r) => s + (r.totalPoints || 0), 0);
                const minus = records.filter(r => r.pointType === 'minus').reduce((s, r) => s + Math.abs(r.totalPoints || 0), 0);
                const total = plus - minus;

                return (
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium">Tổng điểm cộng (+)</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">+{plus}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">Tổng điểm trừ (-)</p>
                      <p className="text-2xl font-bold text-rose-600 mt-1">-{minus}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium">Điểm KPI Thực nhận</p>
                      <p className={cn(
                        "text-2xl font-bold mt-1",
                        total >= 0 ? "text-blue-600" : "text-rose-600"
                      )}>
                        {total > 0 ? `+${total}` : total} điểm
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* History list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Lịch sử Ghi nhận KPI ({kpiRecords.filter(r => r.teacherId === selectedTeacherForDetail.id).length})
                  </h4>
                  {canAssignOrVerify && (
                    <button
                      onClick={() => {
                        const tId = selectedTeacherForDetail.id;
                        setSelectedTeacherForDetail(null);
                        handleOpenAssignModal(tId);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      + Ghi nhận thêm cho giáo viên này
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {kpiRecords.filter(r => r.teacherId === selectedTeacherForDetail.id).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Chưa có bản ghi điểm KPI nào cho giáo viên này.
                    </div>
                  ) : (
                    kpiRecords
                      .filter(r => r.teacherId === selectedTeacherForDetail.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(rec => (
                        <div key={rec.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 hover:shadow-sm transition-shadow">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
                                {rec.kpiCode}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">{rec.kpiName}</span>
                              <span className="text-xs text-slate-400">({rec.date})</span>
                            </div>

                            <p className="text-xs text-slate-600">
                              Nhóm: <span className="font-medium text-slate-800">{rec.group}</span> | 
                              Số lượng: <span className="font-medium">{rec.quantity} {rec.unit}</span> | 
                              Người ghi: <span className="font-medium">{rec.assignedBy}</span>
                            </p>

                            {rec.evidenceNote && (
                              <p className="text-xs text-slate-500 italic">
                                Minh chứng: {rec.evidenceNote}
                              </p>
                            )}

                            {rec.evidenceUrl && (
                              <a href={rec.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Xem tài liệu minh chứng
                              </a>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            {rec.pointType === 'plus' ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                +{rec.totalPoints} đ
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                {rec.totalPoints} đ
                              </span>
                            )}
                            <div className="text-[11px] text-slate-400 mt-1">
                              {rec.status === 'confirmed' ? 'Đã duyệt' : rec.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: XÁC NHẬN XÓA TIÊU CHÍ KPI */}
      {kpiToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tiêu chí KPI</h3>
                  <p className="text-xs text-rose-600 font-medium">Hành động này sẽ gỡ bỏ tiêu chí khỏi danh mục</p>
                </div>
              </div>
              <button 
                onClick={() => !isDeletingKpi && setKpiToDelete(null)}
                disabled={isDeletingKpi}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Criterion Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-200 text-slate-800 rounded border border-slate-300">
                    {kpiToDelete.code}
                  </span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", getGroupBadgeColor(kpiToDelete.group))}>
                    {kpiToDelete.group}
                  </span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full ml-auto", kpiToDelete.pointType === 'plus' ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                    {kpiToDelete.pointType === 'plus' ? `+${kpiToDelete.pointValue} đ` : `-${kpiToDelete.pointValue} đ`}
                  </span>
                </div>
                <div className="font-medium text-slate-900 text-sm leading-snug">
                  {kpiToDelete.name}
                </div>
                {kpiToDelete.description && (
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {kpiToDelete.description}
                  </div>
                )}
              </div>

              {/* Associated records notice */}
              {(() => {
                const associatedCount = kpiRecords.filter(r => r.kpiId === kpiToDelete.id || r.kpiCode === kpiToDelete.code).length;
                if (associatedCount > 0) {
                  return (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-800 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          Tiêu chí này đang có <strong>{associatedCount}</strong> bản ghi điểm đã được ghi nhận cho giáo viên trong lịch sử.
                        </div>
                      </div>
                      <label className="flex items-center gap-2 pt-1 border-t border-amber-200/60 cursor-pointer text-amber-900 font-medium">
                        <input
                          type="checkbox"
                          checked={deleteRecordsOption}
                          onChange={e => setDeleteRecordsOption(e.target.checked)}
                          className="rounded border-amber-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                        />
                        <span>Đồng thời xóa toàn bộ {associatedCount} bản ghi điểm liên quan</span>
                      </label>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa tiêu chí KPI này không? Nếu chỉ muốn tạm thời không áp dụng, bạn có thể chọn <strong>Ngừng sử dụng</strong>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={handleDeactivateInstead}
                disabled={isDeletingKpi}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Giữ lại tiêu chí nhưng tắt kích hoạt"
              >
                Ngừng sử dụng
              </button>
              <button
                type="button"
                onClick={() => setKpiToDelete(null)}
                disabled={isDeletingKpi}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKpi}
                disabled={isDeletingKpi}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingKpi ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: XÁC NHẬN XÓA BẢN GHI KPI */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xóa bản ghi điểm KPI</h3>
                  <p className="text-xs text-rose-600 font-medium">Bản ghi điểm sẽ được hủy bỏ</p>
                </div>
              </div>
              <button 
                onClick={() => !isDeletingRecord && setRecordToDelete(null)}
                disabled={isDeletingRecord}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm space-y-1">
                <div className="font-bold text-slate-900">
                  {teachers.find(t => t.id === recordToDelete.teacherId)?.name || 'Giáo viên'}
                </div>
                <div className="text-xs text-slate-600">
                  Tiêu chí: <span className="font-semibold text-slate-800">[{recordToDelete.kpiCode}] {recordToDelete.kpiName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Ngày ghi nhận: {recordToDelete.date} | Điểm: <span className={cn("font-bold", recordToDelete.pointType === 'plus' ? "text-emerald-600" : "text-rose-600")}>
                    {recordToDelete.pointType === 'plus' ? `+${recordToDelete.totalPoints}` : recordToDelete.totalPoints} đ
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa bản ghi này? Tổng điểm KPI của giáo viên sẽ được cập nhật lại ngay lập tức.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeletingRecord}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                disabled={isDeletingRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingRecord ? 'Đang xóa...' : 'Xóa bản ghi'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* KPI Data Check Results Modal */}
      {checkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  KẾT QUẢ KIỂM TRA DỮ LIỆU KPI
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đã thực hiện phân tích tính nhất quán của hệ thống liên kết 3 cấp
                </p>
              </div>
            </div>

            <div className="space-y-2.5 py-2">
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600 font-medium">Tổng số Nhóm KPI (Cấp 1) đã quét:</span>
                <span className="font-bold text-slate-900">{checkResult.checkedGroups}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600 font-medium">Tổng số Tiêu chí KPI (Cấp 3) đã quét:</span>
                <span className="font-bold text-slate-900">{checkResult.checkedKpis}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-rose-50 rounded-lg border border-rose-100 text-rose-900">
                <span className="font-medium">Số tiêu chí mồ côi (mất liên kết ID nhóm):</span>
                <span className="font-bold">{checkResult.orphanedCount}</span>
              </div>
              {checkResult.repairedCount > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed">
                  <p className="font-bold">Đã tự động xử lý an toàn:</p>
                  <p className="mt-1">
                    Gom {checkResult.repairedCount} tiêu chí mồ côi vào Nhóm tạm thời <strong>"Dữ liệu cần xử lý"</strong> (Mã nhóm: <code>DL_CHO_XL</code>, ID: <code>kpig_unassigned</code>) thành công.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setCheckResult(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                Xác nhận & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: QUẢN LÝ NHÓM KPI */}
      <KpiGroupManagerModal 
        isOpen={isGroupManagerOpen} 
        onClose={() => setIsGroupManagerOpen(false)} 
      />
    </div>
  );
}
