import React, { useState } from 'react';
import { DisciplineCriterion } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { X, Plus, Edit2, Trash2, CheckCircle2, XCircle, ArrowUp, ArrowDown, Save, AlertCircle } from 'lucide-react';

interface CriteriaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CriteriaManagerModal({ isOpen, onClose }: CriteriaManagerModalProps) {
  const { disciplineCriteria, addDisciplineCriterion, updateDisciplineCriterion, deleteDisciplineCriterion } = useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(1);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [criterionToDelete, setCriterionToDelete] = useState<DisciplineCriterion | null>(null);

  if (!isOpen) return null;

  // Sắp xếp theo thứ tự order
  const sortedCriteria = [...disciplineCriteria].sort((a, b) => (a.order || 0) - (b.order || 0));

  const resetForm = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setFormName('');
    setFormDescription('');
    setFormOrder(sortedCriteria.length + 1);
    setFormStatus('active');
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setIsAddingNew(true);
    setFormName('');
    setFormDescription('');
    setFormOrder(sortedCriteria.length > 0 ? Math.max(...sortedCriteria.map(c => c.order || 0)) + 1 : 1);
    setFormStatus('active');
  };

  const handleStartEdit = (criterion: DisciplineCriterion) => {
    setIsAddingNew(false);
    setEditingId(criterion.id);
    setFormName(criterion.name);
    setFormDescription(criterion.description || '');
    setFormOrder(criterion.order || 1);
    setFormStatus(criterion.status || 'active');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên tiêu chí.');
      return;
    }

    if (isAddingNew) {
      const newCrit: DisciplineCriterion = {
        id: `crit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: formName.trim(),
        description: formDescription.trim(),
        order: Number(formOrder) || (sortedCriteria.length + 1),
        status: formStatus
      };
      await addDisciplineCriterion(newCrit);
    } else if (editingId) {
      await updateDisciplineCriterion(editingId, {
        name: formName.trim(),
        description: formDescription.trim(),
        order: Number(formOrder) || 1,
        status: formStatus
      });
    }

    resetForm();
  };

  const handleToggleStatus = async (criterion: DisciplineCriterion) => {
    const nextStatus = criterion.status === 'active' ? 'inactive' : 'active';
    await updateDisciplineCriterion(criterion.id, { status: nextStatus });
  };

  const handleDelete = (criterion: DisciplineCriterion) => {
    setCriterionToDelete(criterion);
  };

  const handleConfirmDelete = async () => {
    if (!criterionToDelete) return;
    try {
      await deleteDisciplineCriterion(criterionToDelete.id);
      if (editingId === criterionToDelete.id) {
        resetForm();
      }
      setCriterionToDelete(null);
    } catch (e) {
      console.error(e);
      alert('Không thể xóa tiêu chí.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCriteria.length) return;

    const current = sortedCriteria[index];
    const target = sortedCriteria[targetIndex];

    const currentOrder = current.order || index + 1;
    const targetOrder = target.order || targetIndex + 1;

    await updateDisciplineCriterion(current.id, { order: targetOrder });
    await updateDisciplineCriterion(target.id, { order: currentOrder });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quản lý tiêu chí đánh giá</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình danh mục tiêu chí đánh giá nền nếp & nội quy dành cho Ban Giám Hiệu
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Action Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Danh sách tiêu chí ({sortedCriteria.length})
            </span>
            {!isAddingNew && !editingId && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm tiêu chí mới
              </button>
            )}
          </div>

          {/* Form Thêm / Sửa */}
          {(isAddingNew || editingId) && (
            <form onSubmit={handleSave} className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-blue-900">
                  {isAddingNew ? 'Thêm tiêu chí đánh giá mới' : 'Chỉnh sửa tiêu chí'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tên tiêu chí <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Thực hiện Nội quy nhà trường"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="1"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Mô tả / Hướng dẫn đánh giá</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ghi rõ yêu cầu, căn cứ đánh giá cho CBGVNV và TTCM..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700">Trạng thái:</label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="formStatus"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-emerald-700">Đang sử dụng</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="formStatus"
                      value="inactive"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-500">Ngừng sử dụng</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu tiêu chí
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Danh sách các tiêu chí hiện có */}
          <div className="space-y-2.5">
            {sortedCriteria.length > 0 ? (
              sortedCriteria.map((c, index) => {
                const isActive = c.status === 'active';
                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      isActive 
                        ? 'bg-white border-slate-200 shadow-sm' 
                        : 'bg-slate-50/70 border-slate-200/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {c.order || index + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                            {c.name}
                          </h4>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đang sử dụng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Ngừng sử dụng
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Sắp xếp thứ tự */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                        title="Chuyển lên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === sortedCriteria.length - 1}
                        onClick={() => handleMoveOrder(index, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                        title="Chuyển xuống"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Bật / tắt nhanh */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
                          isActive
                            ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                        }`}
                        title={isActive ? 'Nhấp để tạm ngưng tiêu chí này' : 'Nhấp để kích hoạt sử dụng'}
                      >
                        {isActive ? 'Tắt' : 'Bật'}
                      </button>

                      {/* Sửa */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(c)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Chỉnh sửa tiêu chí"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Xóa */}
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                        title="Xóa tiêu chí"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Chưa có tiêu chí nào</p>
                <p className="text-xs text-slate-400 mt-1">Bấm "Thêm tiêu chí mới" để tạo tiêu chí đánh giá</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>

        {/* Modal xác nhận xóa */}
        {criterionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Xóa tiêu chí đánh giá</h4>
                  <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa tiêu chí <strong>"{criterionToDelete.name}"</strong> không?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCriterionToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
