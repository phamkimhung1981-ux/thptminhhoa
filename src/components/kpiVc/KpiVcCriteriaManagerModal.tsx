import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  ListOrdered, 
  Sliders, 
  Save, 
  RefreshCw,
  Info,
  Check,
  Award
} from 'lucide-react';
import { 
  KpiVcCriterion, 
  KpiVcCriteriaGroup, 
  KpiVcLevel, 
  KpiVcScoreType 
} from '../../types/kpiVc';
import { 
  createVcCriterion, 
  updateVcCriterion, 
  toggleActiveVcCriterion,
  createVcGroup,
  updateVcGroup
} from '../../services/kpiVcService';
import { useAuth } from '../../store/AuthContext';
import { DEFAULT_VC_GROUPS, DEFAULT_VC_CRITERIA, DEFAULT_VC_LEVELS_III_2 } from '../../lib/kpiVcData';

interface KpiVcCriteriaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: KpiVcCriterion[];
  groups: KpiVcCriteriaGroup[];
  onRefresh?: () => void;
}

export default function KpiVcCriteriaManagerModal({
  isOpen,
  onClose,
  criteria,
  groups,
  onRefresh
}: KpiVcCriteriaManagerModalProps) {
  const { user } = useAuth();

  // Active filter tab: 'all' | 'group_I' | 'group_II' | 'group_III'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal edit / add state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<KpiVcCriterion | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form edit fields
  const [formGroupId, setFormGroupId] = useState<string>('group_I');
  const [formCode, setFormCode] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formMaxScore, setFormMaxScore] = useState<number>(2);
  const [formScoreType, setFormScoreType] = useState<KpiVcScoreType>('input_score');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formGuideline, setFormGuideline] = useState<string>('');
  const [formLevels, setFormLevels] = useState<KpiVcLevel[]>(DEFAULT_VC_LEVELS_III_2);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active group list
  const activeGroups = useMemo(() => {
    return groups.length > 0 ? groups : DEFAULT_VC_GROUPS;
  }, [groups]);

  // Filtered criteria
  const filteredCriteria = useMemo(() => {
    const list = criteria.length > 0 ? criteria : DEFAULT_VC_CRITERIA;
    return list.filter(c => {
      const matchGroup = selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.isActive : !c.isActive);
      return matchGroup && matchStatus;
    }).sort((a, b) => {
      if (a.groupId !== b.groupId) return a.groupId.localeCompare(b.groupId);
      return a.order - b.order;
    });
  }, [criteria, selectedGroupFilter, statusFilter]);

  // Open Edit Form
  const handleOpenEdit = (criterion: KpiVcCriterion) => {
    setEditingCriterion(criterion);
    setIsCreating(false);
    setFormGroupId(criterion.groupId);
    setFormCode(criterion.code);
    setFormContent(criterion.content);
    setFormMaxScore(criterion.maxScore);
    setFormScoreType(criterion.scoreType || 'input_score');
    setFormOrder(criterion.order);
    setFormIsActive(criterion.isActive);
    setFormGuideline(criterion.guideline || '');
    setFormLevels(criterion.levels || DEFAULT_VC_LEVELS_III_2);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingCriterion(null);
    setIsCreating(true);
    setFormGroupId(selectedGroupFilter === 'all' ? 'group_I' : selectedGroupFilter);
    setFormCode(`T${criteria.length + 1}`);
    setFormContent('');
    setFormMaxScore(2);
    setFormScoreType('input_score');
    setFormOrder(criteria.length + 1);
    setFormIsActive(true);
    setFormGuideline('');
    setFormLevels(DEFAULT_VC_LEVELS_III_2);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  // Save changes with confirmation dialog
  const handleRequestSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formContent.trim()) {
      setErrorMsg('Vui lòng nhập nội dung tiêu chí.');
      return;
    }

    if (formMaxScore <= 0) {
      setErrorMsg('Điểm tối đa phải lớn hơn 0.');
      return;
    }

    const title = isCreating ? 'Xác nhận thêm tiêu chí KPI' : 'Xác nhận thay đổi tiêu chí KPI';
    const message = isCreating 
      ? 'Bạn có chắc chắn muốn thêm tiêu chí mới này vào danh mục KPI?' 
      : 'Bạn có chắc chắn muốn cập nhật tiêu chí này? Thay đổi sẽ chỉ áp dụng cho các phiếu tạo mới, phiếu cũ vẫn được bảo toàn nguyên vẹn.';

    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          const actor = {
            id: user?.id || 'admin',
            name: user?.name || 'Admin',
            role: user?.role
          };

          const grp = activeGroups.find(g => g.id === formGroupId);
          const groupName = grp?.name || 'Chính trị tư tưởng, đạo đức lối sống';

          if (isCreating) {
            await createVcCriterion({
              code: formCode.trim(),
              groupId: formGroupId,
              groupName,
              content: formContent.trim(),
              maxScore: Number(formMaxScore),
              scoreType: formScoreType,
              order: Number(formOrder),
              isActive: formIsActive,
              guideline: formGuideline.trim(),
              levels: formScoreType === 'select_level' ? formLevels : undefined
            }, actor);

            setSuccessMsg('Đã thêm tiêu chí mới thành công!');
          } else if (editingCriterion) {
            await updateVcCriterion(editingCriterion.id, {
              code: formCode.trim(),
              groupId: formGroupId,
              groupName,
              content: formContent.trim(),
              maxScore: Number(formMaxScore),
              scoreType: formScoreType,
              order: Number(formOrder),
              isActive: formIsActive,
              guideline: formGuideline.trim(),
              levels: formScoreType === 'select_level' ? formLevels : undefined
            }, actor);

            setSuccessMsg('Đã cập nhật tiêu chí thành công!');
          }

          setIsEditModalOpen(false);
          if (onRefresh) onRefresh();
        } catch (err: any) {
          setErrorMsg(err.message || 'Lỗi khi lưu tiêu chí.');
        } finally {
          setIsSubmitting(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Toggle soft delete
  const handleToggleActive = (criterion: KpiVcCriterion) => {
    const nextState = !criterion.isActive;
    const title = nextState ? 'Kích hoạt lại tiêu chí' : 'Ngừng sử dụng tiêu chí';
    const message = nextState
      ? `Bạn có chắc chắn muốn kích hoạt lại tiêu chí [${criterion.code}]?`
      : `Bạn có chắc chắn muốn ngừng sử dụng tiêu chí [${criterion.code}]? Tiêu chí sẽ không xuất hiện trong phiếu mới nhưng phiếu cũ vẫn hiển thị bình thường.`;

    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          const actor = {
            id: user?.id || 'admin',
            name: user?.name || 'Admin',
            role: user?.role
          };
          await toggleActiveVcCriterion(criterion.id, nextState, actor);
          if (onRefresh) onRefresh();
        } catch (err: any) {
          alert(err.message || 'Lỗi khi thay đổi trạng thái');
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                QUẢN LÝ TIÊU CHÍ KPI GIÁO VIÊN
              </h2>
              <p className="text-xs text-blue-200">
                Thêm, chỉnh sửa, cấu hình thang điểm và quản lý danh mục tiêu chí chuẩn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nhóm lọc */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả nhóm tiêu chí ({criteria.length})</option>
              {activeGroups.map(g => (
                <option key={g.id} value={g.id}>
                  Nhóm {g.code}: {g.name} ({g.maxScore} điểm)
                </option>
              ))}
            </select>

            {/* Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang sử dụng</option>
              <option value="inactive">Đã ngừng sử dụng</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus size={16} /> Thêm tiêu chí mới
            </button>
          </div>
        </div>

        {/* BẢNG DANH MỤC TIÊU CHÍ */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 w-24">Mã</th>
                  <th className="p-3 w-40">Nhóm KPI</th>
                  <th className="p-3">Nội dung tiêu chí</th>
                  <th className="p-3 w-20 text-center">Điểm</th>
                  <th className="p-3 w-28 text-center">Kiểu chấm</th>
                  <th className="p-3 w-28 text-center">Trạng thái</th>
                  <th className="p-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredCriteria.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      Không tìm thấy tiêu chí nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredCriteria.map((c, idx) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${!c.isActive ? 'bg-slate-50 opacity-60' : ''}`}
                    >
                      <td className="p-3 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>

                      <td className="p-3 font-bold text-blue-900">
                        {c.code}
                      </td>

                      <td className="p-3 font-semibold text-slate-700">
                        {c.groupName || (c.groupId === 'group_I' ? 'Nhóm I' : c.groupId === 'group_II' ? 'Nhóm II' : 'Nhóm III')}
                      </td>

                      <td className="p-3 text-slate-800 leading-relaxed whitespace-pre-line">
                        {c.content}
                        {c.scoreType === 'select_level' && c.levels && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {c.levels.map(l => (
                              <span key={l.id} className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                                {l.name}: {l.score}đ
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center font-extrabold text-blue-900 text-sm">
                        {c.maxScore}
                      </td>

                      <td className="p-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {c.scoreType === 'select_level' ? 'Chọn 5 mức' : c.scoreType === 'fixed_score' ? 'Điểm cố định' : 'Nhập điểm'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          c.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {c.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Chỉnh sửa tiêu chí"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            title={c.isActive ? "Ngừng sử dụng" : "Kích hoạt lại"}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              c.isActive 
                                ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50' 
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {c.isActive ? <Trash2 size={15} /> : <RefreshCw size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>* Các thay đổi tiêu chí chỉ áp dụng cho phiếu tạo mới. Phiếu đã tạo được bảo toàn nguyên vẹn.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* MODAL THÊM / SỬA TIÊU CHÍ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                <Edit3 size={16} className="text-blue-600" />
                {isCreating ? 'Thêm tiêu chí KPI mới' : `Chỉnh sửa tiêu chí [${formCode}]`}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestSave} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nhóm KPI: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    {activeGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        Nhóm {g.code}: {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mã tiêu chí: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="VD: I.1, II.3, III.1..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung tiêu chí: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập đầy đủ nội dung mô tả tiêu chí đánh giá..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Điểm tối đa: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={formMaxScore}
                    onChange={(e) => setFormMaxScore(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kiểu chấm điểm:
                  </label>
                  <select
                    value={formScoreType}
                    onChange={(e) => setFormScoreType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="input_score">Nhập điểm (0 → Max)</option>
                    <option value="select_level">Chọn theo 5 Mức (III.2)</option>
                    <option value="fixed_score">Điểm cố định</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Thứ tự hiển thị:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quản lý 5 Mức đánh giá nếu kiểu là select_level */}
              {formScoreType === 'select_level' && (
                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-3">
                  <div className="font-bold text-blue-950 flex items-center justify-between">
                    <span>Cấu hình 5 mức đánh giá (III.2):</span>
                    <span className="text-[11px] text-slate-500 font-normal">Tự động cộng điểm khi chọn</span>
                  </div>

                  <div className="space-y-2">
                    {formLevels.map((lvl, lIdx) => (
                      <div key={lvl.id} className="bg-white p-2.5 rounded-lg border border-slate-200 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={lvl.name}
                            onChange={(e) => {
                              const newLvls = [...formLevels];
                              newLvls[lIdx].name = e.target.value;
                              setFormLevels(newLvls);
                            }}
                            className="w-full px-2 py-1 font-bold text-blue-900 border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={lvl.score}
                            onChange={(e) => {
                              const newLvls = [...formLevels];
                              newLvls[lIdx].score = parseFloat(e.target.value) || 0;
                              setFormLevels(newLvls);
                            }}
                            className="w-full px-2 py-1 font-bold text-center border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={lvl.description}
                            onChange={(e) => {
                              const newLvls = [...formLevels];
                              newLvls[lIdx].description = e.target.value;
                              setFormLevels(newLvls);
                            }}
                            placeholder="Mô tả tiêu chuẩn của mức này..."
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trạng thái hoạt động */}
              <div className="flex items-center gap-4 pt-2">
                <span className="font-bold text-slate-700">Trạng thái:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActiveRadio"
                    checked={formIsActive}
                    onChange={() => setFormIsActive(true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-semibold">● Đang sử dụng</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActiveRadio"
                    checked={!formIsActive}
                    onChange={() => setFormIsActive(false)}
                    className="text-slate-400 focus:ring-blue-500"
                  />
                  <span className="text-slate-600">○ Ngừng sử dụng</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Save size={15} /> Lưu tiêu chí
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-extrabold text-slate-900">
              {confirmDialog.title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
