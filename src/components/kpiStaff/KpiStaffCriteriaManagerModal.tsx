import React, { useState } from 'react';
import { KpiStaffCriterion, KpiStaffCriteriaGroup } from '../../types/kpiStaff';
import { Layers, Plus, Edit2, Trash2, Save, X, Check, AlertCircle, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groups: KpiStaffCriteriaGroup[];
  criteria: KpiStaffCriterion[];
  onSaveCriterion: (criterion: KpiStaffCriterion) => void;
  onDeleteCriterion: (id: string) => void;
}

export default function KpiStaffCriteriaManagerModal({
  isOpen,
  onClose,
  groups,
  criteria,
  onSaveCriterion,
  onDeleteCriterion
}: Props) {
  const [editingCrit, setEditingCrit] = useState<Partial<KpiStaffCriterion> | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleStartCreate = (groupId?: string) => {
    const defaultGroup = groups.find(g => g.id === groupId) || groups[0];
    setEditingCrit({
      id: `crit_staff_${Date.now()}`,
      code: 'NV.' + (criteria.length + 1),
      groupId: defaultGroup?.id || 'group_III',
      groupName: defaultGroup?.name || 'Kết quả thực hiện nhiệm vụ chuyên môn Nhân viên',
      order: criteria.length + 1,
      content: '',
      maxScore: 10,
      scoreType: 'input_score',
      guideline: '',
      isActive: true
    });
    setError('');
  };

  const handleSave = () => {
    if (!editingCrit || !editingCrit.content || !editingCrit.groupId) {
      setError('Vui lòng nhập nội dung tiêu chí và chọn nhóm tiêu chí.');
      return;
    }
    const group = groups.find(g => g.id === editingCrit.groupId);
    const criterionToSave: KpiStaffCriterion = {
      ...(editingCrit as KpiStaffCriterion),
      groupName: group?.name || 'Nhóm tiêu chí'
    };
    onSaveCriterion(criterionToSave);
    setEditingCrit(null);
    setError('');
  };

  const filteredCriteria = criteria.filter(c => 
    selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Quản lý Bảng điểm & Tiêu chí KPI Nhân viên</h2>
              <p className="text-xs text-emerald-200/80">Cấu hình nhóm tiêu chí, điểm tối đa và hướng dẫn chấm điểm chuyên môn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-emerald-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Edit Form */}
          {editingCrit ? (
            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <Plus size={16} /> Cấu hình Chi tiết Tiêu chí KPI Nhân viên
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã tiêu chí *</label>
                  <input
                    type="text"
                    value={editingCrit.code || ''}
                    onChange={e => setEditingCrit({ ...editingCrit, code: e.target.value })}
                    placeholder="Vd: I.1, NV.01"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhóm tiêu chí *</label>
                  <select
                    value={editingCrit.groupId || ''}
                    onChange={e => setEditingCrit({ ...editingCrit, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        [{g.code}] {g.name} (Tối đa {g.maxScore}đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tối đa *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={editingCrit.maxScore ?? 10}
                    onChange={e => setEditingCrit({ ...editingCrit, maxScore: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung tiêu chí đánh giá *</label>
                <textarea
                  rows={2}
                  value={editingCrit.content || ''}
                  onChange={e => setEditingCrit({ ...editingCrit, content: e.target.value })}
                  placeholder="Nhập chi tiết nội dung tiêu chí..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng dẫn chấm điểm / Minh chứng cần nộp</label>
                <input
                  type="text"
                  value={editingCrit.guideline || ''}
                  onChange={e => setEditingCrit({ ...editingCrit, guideline: e.target.value })}
                  placeholder="Vd: Nộp báo cáo tài chính đúng hạn, quản lý sổ sách không sai sót..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingCrit(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Check size={16} /> Lưu tiêu chí
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {/* Group Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                <button
                  onClick={() => setSelectedGroupFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedGroupFilter === 'all'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({criteria.length})
                </button>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupFilter(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedGroupFilter === g.id
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nhóm {g.code} ({g.maxScore}đ)
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleStartCreate()}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus size={16} /> Thêm tiêu chí mới
              </button>
            </div>
          )}

          {/* Criteria List */}
          <div className="space-y-3">
            {filteredCriteria.map((c, idx) => (
              <div
                key={c.id}
                className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                    {c.code}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 leading-snug">{c.content}</p>
                    {c.guideline && (
                      <p className="text-[11px] text-slate-500 italic flex items-center gap-1">
                        <Info size={12} className="text-emerald-600" /> {c.guideline}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                        {c.groupName}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold border border-emerald-200">
                        Tối đa: {c.maxScore} điểm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setEditingCrit(c)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa tiêu chí "${c.code}"?`)) {
                        onDeleteCriterion(c.id);
                      }
                    }}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                    title="Xóa tiêu chí"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
