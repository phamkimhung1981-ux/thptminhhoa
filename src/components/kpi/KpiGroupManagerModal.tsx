import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../store/AppContext';
import { KpiGroup, KpiCategory } from '../../types';
import { 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  Layers, 
  Info,
  ShieldAlert,
  FolderTree,
  ListFilter
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface KpiGroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGroup?: (groupId: string) => void;
}

export default function KpiGroupManagerModal({ isOpen, onClose, onSelectGroup }: KpiGroupManagerModalProps) {
  const { 
    kpiGroups, 
    kpis, 
    addKpiGroup, 
    updateKpiGroup, 
    deleteKpiGroup,
    kpiCategories,
    addKpiCategory,
    updateKpiCategory,
    deleteKpiCategory
  } = useAppContext();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'groups' | 'categories'>('groups');

  // Group search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Category search and filter
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state for Groups
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<KpiGroup | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    order: 1,
    status: 'active' as 'active' | 'inactive'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for Categories
  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<KpiCategory | null>(null);
  const [catFormData, setCatFormData] = useState({
    groupId: '',
    code: '',
    name: '',
    description: '',
    order: 1,
    status: 'active' as 'active' | 'inactive'
  });
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [isCatSaving, setIsCatSaving] = useState(false);

  // Group deletion/warning modal
  const [groupToDelete, setGroupToDelete] = useState<KpiGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category deletion/warning modal
  const [catToDelete, setCatToDelete] = useState<KpiCategory | null>(null);
  const [isCatDeleting, setIsCatDeleting] = useState(false);

  // Toast feedback state inside modal
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Helper count for KPIs in a group
  const getKpiCountForGroup = (group: KpiGroup) => {
    return kpis.filter(k => 
      k.groupId === group.id || 
      (k.group && k.group.toLowerCase().trim() === group.name.toLowerCase().trim()) ||
      (k.group && k.group.toLowerCase().trim() === group.code.toLowerCase().trim())
    ).length;
  };

  // Helper count for KPIs in a category
  const getKpiCountForCategory = (category: KpiCategory) => {
    return kpis.filter(k => 
      k.categoryId === category.id || 
      k.category_id === category.id ||
      (k.categoryName && k.categoryName.toLowerCase().trim() === category.name.toLowerCase().trim())
    ).length;
  };

  // Filtered & sorted groups
  const filteredGroups = useMemo(() => {
    return [...kpiGroups]
      .filter(g => {
        const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q || 
          g.name.toLowerCase().includes(q) || 
          g.code.toLowerCase().includes(q) || 
          (g.description && g.description.toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [kpiGroups, searchQuery, statusFilter]);

  // Filtered & sorted categories
  const filteredCategories = useMemo(() => {
    return [...kpiCategories]
      .filter(c => {
        const matchesGroup = selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter || c.group_id === selectedGroupFilter;
        const matchesStatus = catStatusFilter === 'all' || c.status === catStatusFilter;
        const q = catSearchQuery.toLowerCase().trim();
        const matchesQuery = !q || 
          c.name.toLowerCase().includes(q) || 
          c.code.toLowerCase().includes(q) || 
          (c.description && c.description.toLowerCase().includes(q));
        return matchesGroup && matchesStatus && matchesQuery;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [kpiCategories, selectedGroupFilter, catSearchQuery, catStatusFilter]);

  // Group Form handlers
  const handleOpenCreate = () => {
    const nextOrder = kpiGroups.length > 0 
      ? Math.max(...kpiGroups.map(g => g.order || 0)) + 1 
      : 1;
    setEditingGroup(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      order: nextOrder,
      status: 'active'
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (group: KpiGroup) => {
    setEditingGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || '',
      order: group.order || 1,
      status: group.status || 'active'
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formData.code.trim().toUpperCase();
    const cleanName = formData.name.trim();

    if (!cleanCode) {
      setFormError('Vui lòng nhập Mã nhóm KPI (VD: NN, CM, CN...).');
      return;
    }

    if (!cleanName) {
      setFormError('Vui lòng nhập Tên nhóm KPI.');
      return;
    }

    const duplicateCode = kpiGroups.find(
      g => g.id !== editingGroup?.id && g.code.trim().toUpperCase() === cleanCode
    );
    if (duplicateCode) {
      setFormError(`Mã nhóm "${cleanCode}" đã tồn tại cho nhóm "${duplicateCode.name}". Vui lòng chọn mã khác.`);
      return;
    }

    const duplicateName = kpiGroups.find(
      g => g.id !== editingGroup?.id && g.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      setFormError(`Tên nhóm "${cleanName}" đã tồn tại. Vui lòng nhập tên khác.`);
      return;
    }

    setIsSaving(true);
    try {
      if (editingGroup) {
        await updateKpiGroup(editingGroup.id, {
          code: cleanCode,
          name: cleanName,
          description: formData.description.trim(),
          order: Number(formData.order) || 1,
          status: formData.status
        });
        showToast(`Đã cập nhật nhóm KPI "${cleanName}" thành công.`);
      } else {
        const newGroup: KpiGroup = {
          id: `kpig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: cleanCode,
          name: cleanName,
          description: formData.description.trim(),
          order: Number(formData.order) || 1,
          status: formData.status,
          createdAt: new Date().toISOString()
        };
        await addKpiGroup(newGroup);
        if (onSelectGroup) {
          onSelectGroup(newGroup.id);
        }
        showToast(`Đã thêm mới nhóm KPI "${cleanName}" thành công.`);
      }
      setIsFormOpen(false);
      setEditingGroup(null);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Không thể lưu nhóm KPI.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (group: KpiGroup) => {
    const nextStatus = group.status === 'active' ? 'inactive' : 'active';
    try {
      await updateKpiGroup(group.id, { status: nextStatus });
      showToast(
        nextStatus === 'active' 
          ? `Đã kích hoạt lại nhóm KPI "${group.name}".` 
          : `Đã chuyển nhóm KPI "${group.name}" sang trạng thái Ngừng sử dụng.`
      );
    } catch (err) {
      console.error(err);
      showToast('Không thể cập nhật trạng thái nhóm KPI.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    const count = getKpiCountForGroup(groupToDelete);

    try {
      if (count > 0) {
        await updateKpiGroup(groupToDelete.id, { status: 'inactive' });
        showToast(`Nhóm "${groupToDelete.name}" đang có ${count} tiêu chí nên đã chuyển trạng thái sang "Ngừng sử dụng".`);
      } else {
        await deleteKpiGroup(groupToDelete.id);
        showToast(`Đã xóa hoàn toàn nhóm KPI "${groupToDelete.name}".`);
      }
      setGroupToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xử lý nhóm KPI.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Category Form handlers
  const handleOpenCatCreate = () => {
    const defaultGroup = kpiGroups.find(g => g.status === 'active') || kpiGroups[0];
    const nextOrder = kpiCategories.filter(c => c.groupId === (defaultGroup?.id || '')).length + 1;
    setEditingCat(null);
    setCatFormData({
      groupId: defaultGroup ? defaultGroup.id : '',
      code: '',
      name: '',
      description: '',
      order: nextOrder,
      status: 'active'
    });
    setCatFormError(null);
    setIsCatFormOpen(true);
  };

  const handleOpenCatEdit = (cat: KpiCategory) => {
    setEditingCat(cat);
    setCatFormData({
      groupId: cat.groupId || cat.group_id || '',
      code: cat.code,
      name: cat.name,
      description: cat.description || '',
      order: cat.order || 1,
      status: cat.status || 'active'
    });
    setCatFormError(null);
    setIsCatFormOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);

    const cleanCode = catFormData.code.trim().toUpperCase();
    const cleanName = catFormData.name.trim();

    if (!catFormData.groupId) {
      setCatFormError('Vui lòng chọn Nhóm KPI cha.');
      return;
    }

    if (!cleanCode) {
      setCatFormError('Vui lòng nhập Mã nhóm tiêu chí (VD: NN.01, CM.01...).');
      return;
    }

    if (!cleanName) {
      setCatFormError('Vui lòng nhập Tên nhóm tiêu chí.');
      return;
    }

    const duplicateCode = kpiCategories.find(
      c => c.id !== editingCat?.id && c.code.trim().toUpperCase() === cleanCode
    );
    if (duplicateCode) {
      setCatFormError(`Mã nhóm tiêu chí "${cleanCode}" đã tồn tại cho "${duplicateCode.name}". Vui lòng chọn mã khác.`);
      return;
    }

    const duplicateName = kpiCategories.find(
      c => c.id !== editingCat?.id && 
           c.groupId === catFormData.groupId && 
           c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      setCatFormError(`Tên nhóm tiêu chí "${cleanName}" đã tồn tại trong nhóm này.`);
      return;
    }

    const selectedGroupObj = kpiGroups.find(g => g.id === catFormData.groupId);

    setIsCatSaving(true);
    try {
      if (editingCat) {
        await updateKpiCategory(editingCat.id, {
          groupId: catFormData.groupId,
          group_id: catFormData.groupId,
          groupCode: selectedGroupObj?.code || '',
          groupName: selectedGroupObj?.name || '',
          code: cleanCode,
          name: cleanName,
          description: catFormData.description.trim(),
          order: Number(catFormData.order) || 1,
          status: catFormData.status
        });
        showToast(`Đã cập nhật nhóm tiêu chí "${cleanName}" thành công.`);
      } else {
        const newCat: KpiCategory = {
          id: `kpicat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          groupId: catFormData.groupId,
          group_id: catFormData.groupId,
          groupCode: selectedGroupObj?.code || '',
          groupName: selectedGroupObj?.name || '',
          code: cleanCode,
          name: cleanName,
          description: catFormData.description.trim(),
          order: Number(catFormData.order) || 1,
          status: catFormData.status,
          createdAt: new Date().toISOString()
        };
        await addKpiCategory(newCat);
        showToast(`Đã thêm mới nhóm tiêu chí "${cleanName}" thành công.`);
      }
      setIsCatFormOpen(false);
      setEditingCat(null);
    } catch (err: any) {
      console.error(err);
      setCatFormError(err.message || 'Không thể lưu nhóm tiêu chí.');
    } finally {
      setIsCatSaving(false);
    }
  };

  const handleToggleCatStatus = async (cat: KpiCategory) => {
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await updateKpiCategory(cat.id, { status: nextStatus });
      showToast(
        nextStatus === 'active' 
          ? `Đã kích hoạt lại nhóm tiêu chí "${cat.name}".` 
          : `Đã chuyển nhóm tiêu chí "${cat.name}" sang trạng thái Ngừng sử dụng.`
      );
    } catch (err) {
      console.error(err);
      showToast('Không thể cập nhật trạng thái nhóm tiêu chí.', 'error');
    }
  };

  const handleConfirmCatDelete = async () => {
    if (!catToDelete) return;
    setIsCatDeleting(true);
    const count = getKpiCountForCategory(catToDelete);

    try {
      if (count > 0) {
        await updateKpiCategory(catToDelete.id, { status: 'inactive' });
        showToast(`Nhóm tiêu chí "${catToDelete.name}" đang có ${count} tiêu chí nên đã chuyển trạng thái sang "Ngừng sử dụng".`);
      } else {
        await deleteKpiCategory(catToDelete.id);
        showToast(`Đã xóa hoàn toàn nhóm tiêu chí "${catToDelete.name}".`);
      }
      setCatToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xử lý nhóm tiêu chí.', 'error');
    } finally {
      setIsCatDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">QUẢN LÝ THƯ MỤC CẤU TRÚC KPI</h2>
              <p className="text-xs text-blue-200/80">
                Thêm, sửa, phân cấp và liên kết các nhóm KPI (Cấp 1) và nhóm tiêu chí (Cấp 2)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 border-b border-slate-200 flex px-6">
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              activeTab === 'groups'
                ? "border-blue-600 text-blue-700 bg-white -mb-px rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FolderTree className="w-4 h-4" />
            <span>Cấp 1: Nhóm KPI ({kpiGroups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              activeTab === 'categories'
                ? "border-blue-600 text-blue-700 bg-white -mb-px rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Cấp 2: Nhóm tiêu chí ({kpiCategories.length})</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={cn(
            "px-6 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all",
            feedback.type === 'success' 
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-100" 
              : "bg-rose-50 text-rose-800 border-b border-rose-100"
          )}>
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {activeTab === 'groups' ? (
            <>
              {/* Tab 1: Groups Active Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Tìm kiếm mã nhóm, tên nhóm..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        statusFilter === 'all' ? "bg-white text-blue-700 font-bold shadow-sm" : "hover:text-slate-900"
                      )}
                    >
                      Tất cả ({kpiGroups.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('active')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        statusFilter === 'active' ? "bg-white text-emerald-700 font-bold shadow-sm" : "hover:text-slate-900"
                      )}
                    >
                      Đang dùng ({kpiGroups.filter(g => g.status === 'active').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('inactive')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        statusFilter === 'inactive' ? "bg-white text-slate-800 font-bold shadow-sm" : "hover:text-slate-900"
                      )}
                    >
                      Ngừng dùng ({kpiGroups.filter(g => g.status === 'inactive').length})
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm nhóm KPI (C1)</span>
                </button>
              </div>

              {/* Table of Groups */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3.5 w-12 text-center">STT</th>
                        <th className="py-3 px-3.5 w-24">MÃ NHÓM</th>
                        <th className="py-3 px-3.5 w-44">TÊN NHÓM KPI (CẤP 1)</th>
                        <th className="py-3 px-3.5 min-w-[200px]">MÔ TẢ PHÂN LOẠI</th>
                        <th className="py-3 px-3.5 w-28 text-center">SỐ TIÊU CHÍ</th>
                        <th className="py-3 px-3.5 w-32 text-center">TRẠNG THÁI</th>
                        <th className="py-3 px-3.5 w-32 text-right">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400">
                            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-1.5 stroke-1" />
                            <p className="text-xs font-semibold text-slate-600">Không tìm thấy nhóm KPI nào</p>
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((group, idx) => {
                          const count = getKpiCountForGroup(group);
                          const isInactive = group.status === 'inactive';

                          return (
                            <tr 
                              key={group.id} 
                              className={cn(
                                "hover:bg-slate-50/80 transition-colors",
                                isInactive && "bg-slate-50/50 opacity-70"
                              )}
                            >
                              <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                                {group.order || idx + 1}
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">
                                  {group.code}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-900">
                                {group.name}
                              </td>
                              <td className="py-3 px-3.5 text-slate-500 leading-relaxed">
                                {group.description || <span className="text-slate-300 italic">Chưa có mô tả</span>}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                  count > 0 ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-500"
                                )}>
                                  {count} tiêu chí
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                {group.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Đang dùng
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Ngừng dùng
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(group)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa thông tin nhóm KPI"
                                >
                                  <Edit3 className="w-4 h-4 inline-block" />
                                </button>
                                {group.status === 'active' ? (
                                  <button
                                    type="button"
                                    onClick={() => setGroupToDelete(group)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Xóa hoặc ngừng sử dụng nhóm này"
                                  >
                                    <Trash2 className="w-4 h-4 inline-block" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(group)}
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Kích hoạt lại nhóm này"
                                  >
                                    <RotateCcw className="w-4 h-4 inline-block" />
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
            </>
          ) : (
            <>
              {/* Tab 2: Categories Active Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Parent Group Selector */}
                  <div className="relative">
                    <select
                      value={selectedGroupFilter}
                      onChange={e => setSelectedGroupFilter(e.target.value)}
                      className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium text-slate-700"
                    >
                      <option value="all">📁 Tất cả Nhóm KPI</option>
                      {kpiGroups.map(g => (
                        <option key={g.id} value={g.id}>📁 {g.name} ({g.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Tìm kiếm mã, tên nhóm tiêu chí..."
                      value={catSearchQuery}
                      onChange={e => setCatSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                    {catSearchQuery && (
                      <button 
                        onClick={() => setCatSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCatStatusFilter('all')}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all cursor-pointer text-[11px]",
                        catStatusFilter === 'all' ? "bg-white text-blue-700 font-bold shadow-xs" : "hover:text-slate-900"
                      )}
                    >
                      Tất cả ({kpiCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatStatusFilter('active')}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all cursor-pointer text-[11px]",
                        catStatusFilter === 'active' ? "bg-white text-emerald-700 font-bold shadow-xs" : "hover:text-slate-900"
                      )}
                    >
                      Đang dùng ({kpiCategories.filter(c => c.status === 'active').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatStatusFilter('inactive')}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all cursor-pointer text-[11px]",
                        catStatusFilter === 'inactive' ? "bg-white text-slate-800 font-bold shadow-xs" : "hover:text-slate-900"
                      )}
                    >
                      Ngừng dùng ({kpiCategories.filter(c => c.status === 'inactive').length})
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCatCreate}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-500/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm nhóm TC (C2)</span>
                </button>
              </div>

              {/* Table of Categories */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3.5 w-12 text-center">STT</th>
                        <th className="py-3 px-3.5 w-24">MÃ TIÊU CHÍ (C2)</th>
                        <th className="py-3 px-3.5 w-44">TÊN NHÓM TIÊU CHÍ</th>
                        <th className="py-3 px-3.5 w-44">THUỘC NHÓM KPI (C1)</th>
                        <th className="py-3 px-3.5 min-w-[150px]">MÔ TẢ CHI TIẾT</th>
                        <th className="py-3 px-3.5 w-28 text-center">SỐ TC CON</th>
                        <th className="py-3 px-3.5 w-32 text-center">TRẠNG THÁI</th>
                        <th className="py-3 px-3.5 w-32 text-right">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400">
                            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-1.5 stroke-1" />
                            <p className="text-xs font-semibold text-slate-600">Không tìm thấy nhóm tiêu chí nào</p>
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((cat, idx) => {
                          const count = getKpiCountForCategory(cat);
                          const isInactive = cat.status === 'inactive';
                          const parentGroup = kpiGroups.find(g => g.id === cat.groupId || g.id === cat.group_id);

                          return (
                            <tr 
                              key={cat.id} 
                              className={cn(
                                "hover:bg-slate-50/80 transition-colors",
                                isInactive && "bg-slate-50/50 opacity-70"
                              )}
                            >
                              <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                                {cat.order || idx + 1}
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs">
                                  {cat.code}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-900">
                                {cat.name}
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                                  📁 {parentGroup ? `${parentGroup.name} (${parentGroup.code})` : 'Chưa phân nhóm'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-slate-500 leading-relaxed">
                                {cat.description || <span className="text-slate-300 italic">Chưa có mô tả</span>}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                  count > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500"
                                )}>
                                  {count} tiêu chí con
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                {cat.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Đang dùng
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Ngừng dùng
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCatEdit(cat)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa thông tin nhóm tiêu chí"
                                >
                                  <Edit3 className="w-4 h-4 inline-block" />
                                </button>
                                {cat.status === 'active' ? (
                                  <button
                                    type="button"
                                    onClick={() => setCatToDelete(cat)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Xóa hoặc ngừng sử dụng nhóm tiêu chí này"
                                  >
                                    <Trash2 className="w-4 h-4 inline-block" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCatStatus(cat)}
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Kích hoạt lại nhóm tiêu chí này"
                                  >
                                    <RotateCcw className="w-4 h-4 inline-block" />
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
            </>
          )}

          {/* Helper info notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Hướng dẫn xây dựng Thư mục 3 Cấp:</span> Để đảm bảo KPI hoạt động đúng, bạn cần tạo <strong>Nhóm KPI cha (Cấp 1)</strong> trước, sau đó tạo các <strong>Nhóm tiêu chí (Cấp 2)</strong> con thuộc về nhóm cha đó. Khi thêm các Tiêu chí cụ thể (Cấp 3) ngoài bảng danh mục, bạn sẽ lựa chọn trực tiếp theo cây phân cấp đã cấu hình tại đây.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {activeTab === 'groups' ? (
              <span>Tổng cộng: <span className="font-bold text-slate-800">{kpiGroups.length}</span> nhóm KPI</span>
            ) : (
              <span>Tổng cộng: <span className="font-bold text-slate-800">{kpiCategories.length}</span> nhóm tiêu chí</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      {/* Sub-modal: Form Add/Edit KPI Group (Cấp 1) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-blue-400" />
                {editingGroup ? 'CHỈNH SỬA NHÓM KPI (CẤP 1)' : 'THÊM NHÓM KPI MỚI (CẤP 1)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mã nhóm *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NN, CM..."
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thứ tự *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.order}
                    onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="active">🟢 Đang dùng</option>
                    <option value="inactive">⚪ Ngừng dùng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên nhóm KPI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nền nếp, Chuyên môn..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mô tả phân loại
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ phạm vi, mục đích của nhóm tiêu chí này..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {isSaving ? 'Đang lưu...' : (editingGroup ? 'Lưu thay đổi' : 'Thêm nhóm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: Form Add/Edit KPI Category (Cấp 2) */}
      {isCatFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-indigo-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                {editingCat ? 'CHỈNH SỬA NHÓM TIÊU CHÍ (CẤP 2)' : 'THÊM NHÓM TIÊU CHÍ MỚI (CẤP 2)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCatFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              {catFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{catFormError}</span>
                </div>
              )}

              {/* Parent Group Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thuộc nhóm KPI cha (Cấp 1) *
                </label>
                <select
                  required
                  value={catFormData.groupId}
                  onChange={e => setCatFormData({ ...catFormData, groupId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="">-- Chọn nhóm KPI cha --</option>
                  {kpiGroups.filter(g => g.status === 'active').map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mã nhóm TC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NN.01"
                    value={catFormData.code}
                    onChange={e => setCatFormData({ ...catFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thứ tự *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={catFormData.order}
                    onChange={e => setCatFormData({ ...catFormData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={catFormData.status}
                    onChange={e => setCatFormData({ ...catFormData, status: e.target.value as any })}
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="active">🟢 Đang dùng</option>
                    <option value="inactive">⚪ Ngừng dùng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên nhóm tiêu chí *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đi muộn, vắng họp, vi phạm giờ giấc..."
                  value={catFormData.name}
                  onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể các hành vi hoặc hành động thuộc nhóm tiêu chí này..."
                  value={catFormData.description}
                  onChange={e => setCatFormData({ ...catFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCatFormOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCatSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  {isCatSaving ? 'Đang lưu...' : (editingCat ? 'Lưu thay đổi' : 'Thêm nhóm tiêu chí')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: Delete or Deactivate Confirmation for Group (Cấp 1) */}
      {groupToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {getKpiCountForGroup(groupToDelete) > 0 ? 'Ngừng sử dụng nhóm KPI?' : 'Xác nhận xóa nhóm KPI?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nhóm: <span className="font-bold text-slate-800">{groupToDelete.name} ({groupToDelete.code})</span>
                </p>
              </div>
            </div>

            {getKpiCountForGroup(groupToDelete) > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Đang có {getKpiCountForGroup(groupToDelete)} tiêu chí KPI thuộc nhóm này!
                </p>
                <p className="leading-relaxed">
                  Để đảm bảo an toàn dữ liệu và các phiếu đánh giá đã ghi nhận, hệ thống sẽ chuyển nhóm này sang trạng thái <strong>"Ngừng sử dụng"</strong> thay vì xóa vĩnh viễn. Các tiêu chí đã có vẫn được bảo lưu đầy đủ.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhóm này hiện chưa có tiêu chí KPI nào. Bạn có chắc chắn muốn xóa hoàn toàn khỏi hệ thống không?
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Đang xử lý...' : (getKpiCountForGroup(groupToDelete) > 0 ? 'Chuyển sang Ngừng dùng' : 'Xóa vĩnh viễn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Delete or Deactivate Confirmation for Category (Cấp 2) */}
      {catToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {getKpiCountForCategory(catToDelete) > 0 ? 'Ngừng sử dụng nhóm tiêu chí?' : 'Xác nhận xóa nhóm tiêu chí?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nhóm tiêu chí: <span className="font-bold text-slate-800">{catToDelete.name} ({catToDelete.code})</span>
                </p>
              </div>
            </div>

            {getKpiCountForCategory(catToDelete) > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Đang có {getKpiCountForCategory(catToDelete)} tiêu chí KPI con thuộc nhóm này!
                </p>
                <p className="leading-relaxed">
                  Để đảm bảo an toàn dữ liệu, hệ thống sẽ chuyển nhóm tiêu chí này sang trạng thái <strong>"Ngừng sử dụng"</strong> thay vì xóa vĩnh viễn. Các tiêu chí cụ thể đã có vẫn được giữ nguyên.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhóm tiêu chí này hiện chưa có tiêu chí KPI nào. Bạn có chắc chắn muốn xóa hoàn toàn không?
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isCatDeleting}
                onClick={handleConfirmCatDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isCatDeleting ? 'Đang xử lý...' : (getKpiCountForCategory(catToDelete) > 0 ? 'Chuyển sang Ngừng dùng' : 'Xóa vĩnh viễn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
