import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  Sliders, 
  Save, 
  RefreshCw,
  Info,
  Check,
  Award
} from 'lucide-react';
import { 
  KpiStaffCriterion, 
  KpiStaffCriteriaGroup,
  StaffPositionKey
} from '../../types/kpiStaff';
import { 
  saveStaffCriterionToFirestore, 
  deleteStaffCriterionFromFirestore 
} from '../../services/kpiStaffService';
import { 
  DEFAULT_STAFF_CRITERIA, 
  POSITION_CONFIGS 
} from '../../lib/kpiStaffData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  criteria: KpiStaffCriterion[];
  onRefresh?: () => void;
}

export default function KpiStaffCriteriaManagerModal({
  isOpen,
  onClose,
  criteria,
  onRefresh
}: Props) {
  // Selected position / category filter
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal edit / add state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<KpiStaffCriterion | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [formCategory, setFormCategory] = useState<string>('B_VI_TRI');
  const [formCode, setFormCode] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formMaxScore, setFormMaxScore] = useState<number>(10);
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formGuideline, setFormGuideline] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeCriteria = useMemo(() => {
    const list = criteria.length > 0 ? criteria : DEFAULT_STAFF_CRITERIA;
    return list.filter(c => {
      const matchPosition = selectedPositionFilter === 'all' || c.groupId === selectedPositionFilter || c.category === selectedPositionFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.isActive !== false : c.isActive === false);
      return matchPosition && matchStatus;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [criteria, selectedPositionFilter, statusFilter]);

  if (!isOpen) return null;

  const handleOpenEdit = (criterion: KpiStaffCriterion) => {
    setEditingCriterion(criterion);
    setIsCreating(false);
    setFormCategory(criterion.category || 'B_VI_TRI');
    setFormCode(criterion.code || '');
    setFormContent(criterion.content || '');
    setFormMaxScore(criterion.maxScore || 10);
    setFormOrder(criterion.order || 1);
    setFormIsActive(criterion.isActive !== false);
    setFormGuideline(criterion.guideline || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingCriterion(null);
    setIsCreating(true);
    setFormCategory(selectedPositionFilter === 'all' ? 'B_VI_TRI' : selectedPositionFilter);
    setFormCode(`NV-${activeCriteria.length + 1}`);
    setFormContent('');
    setFormMaxScore(10);
    setFormOrder(activeCriteria.length + 1);
    setFormIsActive(true);
    setFormGuideline('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      setErrorMsg('Vui lòng nhập nội dung tiêu chí.');
      return;
    }
    if (formMaxScore <= 0) {
      setErrorMsg('Điểm tối đa phải lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const id = editingCriterion ? editingCriterion.id : `crit_staff_${Date.now()}`;
      const payload: KpiStaffCriterion = {
        id,
        code: formCode.trim() || `NV-${Date.now().toString().slice(-4)}`,
        category: formCategory,
        groupId: formCategory,
        content: formContent.trim(),
        maxScore: Number(formMaxScore),
        order: Number(formOrder),
        isActive: formIsActive,
        guideline: formGuideline.trim()
      };

      await saveStaffCriterionToFirestore(payload);
      setSuccessMsg('Đã lưu tiêu chí thành công!');
      setIsEditModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error saving criterion:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu tiêu chí.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tiêu chí KPI này?')) {
      try {
        await deleteStaffCriterionFromFirestore(id);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Error deleting criterion:', err);
        alert('Không thể xóa tiêu chí.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black">Quản lý tiêu chí KPI Nhân viên</h2>
              <p className="text-xs text-slate-300">Thêm, sửa, xóa và cấu hình bộ tiêu chí đánh giá nhân viên theo vị trí</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vị trí / Nhóm</label>
              <select
                value={selectedPositionFilter}
                onChange={(e) => setSelectedPositionFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tất cả vị trí / nhóm</option>
                <option value="A_CHUNG">KPI Chung (30đ)</option>
                {Object.entries(POSITION_CONFIGS).map(([key, pos]) => (
                  <option key={key} value={key}>{pos.positionName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang áp dụng</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Thêm tiêu chí mới
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 w-28">Mã</th>
                  <th className="p-3">Nội dung tiêu chí / nhiệm vụ</th>
                  <th className="p-3 w-36">Vị trí / Nhóm</th>
                  <th className="p-3 w-24 text-center">Điểm tối đa</th>
                  <th className="p-3 w-24 text-center">Trạng thái</th>
                  <th className="p-3 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {activeCriteria.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Không tìm thấy tiêu chí KPI nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  activeCriteria.map((c, idx) => {
                    const posName = POSITION_CONFIGS[c.groupId as StaffPositionKey]?.positionName || c.groupId || 'Chung';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-emerald-800">{c.code}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {c.content}
                          {c.guideline && (
                            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Gợi ý: {c.guideline}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200">
                            {c.category === 'A_CHUNG' ? 'KPI Chung' : posName}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700">{c.maxScore} đ</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            c.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {c.isActive !== false ? 'Áp dụng' : 'Tạm ngưng'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                              title="Sửa tiêu chí"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              title="Xóa tiêu chí"
                            >
                              <Trash2 size={14} />
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

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">Tổng số tiêu chí hiển thị: <span className="font-bold text-slate-800">{activeCriteria.length}</span></p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Edit / Create Sub-Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">
                {isCreating ? 'Thêm tiêu chí KPI mới' : 'Chỉnh sửa tiêu chí KPI'}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thuộc vị trí / nhóm</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="A_CHUNG">KPI Chung (30đ)</option>
                  {Object.entries(POSITION_CONFIGS).map(([key, pos]) => (
                    <option key={key} value={key}>Vị trí: {pos.positionName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã tiêu chí</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="VD: NVKT-1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Điểm tối đa</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formMaxScore}
                    onChange={(e) => setFormMaxScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nội dung nhiệm vụ / tiêu chí</label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập nội dung chi tiết tiêu chí..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gợi ý / Hướng dẫn chấm điểm</label>
                <input
                  type="text"
                  value={formGuideline}
                  onChange={(e) => setFormGuideline(e.target.value)}
                  placeholder="VD: Hoàn thành đúng hạn 100%, không để sai sót..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Đang áp dụng</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={16} /> {isSubmitting ? 'Đang lưu...' : 'Lưu tiêu chí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
