import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Calendar, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit2, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { KpiCbqlPeriod } from '../../types/kpiCbql';
import { saveCbqlPeriod, deleteCbqlPeriod } from '../../services/kpiCbqlService';
import { useAuth } from '../../store/AuthContext';

interface KpiCbqlPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: KpiCbqlPeriod[];
  onRefresh?: () => void;
}

export default function KpiCbqlPeriodModal({
  isOpen,
  onClose,
  periods,
  onRefresh
}: KpiCbqlPeriodModalProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Partial<KpiCbqlPeriod> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePeriodChange = (fieldUpdates: Partial<KpiCbqlPeriod>) => {
    setEditingPeriod(prev => {
      const merged = { ...prev, ...fieldUpdates } as KpiCbqlPeriod;
      
      const type = merged.periodType || 'month';
      const val = merged.periodValue || '10';
      const year = merged.academicYear || '2026-2027';
      
      const [startYearStr, endYearStr] = year.split('-');
      const startYear = parseInt(startYearStr) || 2026;
      const endYear = parseInt(endYearStr) || 2027;

      let nextStartDate = merged.startDate || '';
      let nextEndDate = merged.endDate || '';
      let nextName = merged.name || '';
      let nextDescription = merged.description || '';

      // Only auto-generate if we are changing type, value, or academic year
      if (
        fieldUpdates.periodType !== undefined ||
        fieldUpdates.periodValue !== undefined ||
        fieldUpdates.academicYear !== undefined
      ) {
        if (type === 'month') {
          const monthNum = parseInt(val) || 10;
          const calendarYear = monthNum >= 9 ? startYear : endYear;
          const paddedMonth = monthNum.toString().padStart(2, '0');
          nextStartDate = `${calendarYear}-${paddedMonth}-01`;
          
          const lastDay = new Date(calendarYear, monthNum, 0).getDate();
          nextEndDate = `${calendarYear}-${paddedMonth}-${lastDay}`;
          nextName = `Tháng ${monthNum}/${calendarYear}`;
          nextDescription = `Đánh giá KPI cán bộ quản lý Tháng ${monthNum} năm ${calendarYear}`;
        } else if (type === 'term') {
          if (val === 'HK1') {
            nextStartDate = `${startYear}-09-01`;
            nextEndDate = `${endYear}-01-15`;
            nextName = `Học kỳ I năm học ${year}`;
            nextDescription = `Đánh giá KPI cán bộ quản lý Học kỳ I năm học ${year}`;
          } else {
            nextStartDate = `${endYear}-01-16`;
            nextEndDate = `${endYear}-05-31`;
            nextName = `Học kỳ II năm học ${year}`;
            nextDescription = `Đánh giá KPI cán bộ quản lý Học kỳ II năm học ${year}`;
          }
        } else if (type === 'year') {
          nextStartDate = `${startYear}-09-01`;
          nextEndDate = `${endYear}-05-31`;
          nextName = `Cả năm học ${year}`;
          nextDescription = `Tổng kết đánh giá KPI cán bộ quản lý cả năm học ${year}`;
        }
      }

      return {
        ...merged,
        startDate: nextStartDate,
        endDate: nextEndDate,
        name: nextName,
        description: nextDescription
      };
    });
  };

  const handleAddNew = () => {
    setEditingPeriod({
      id: `cbql_period_${Date.now()}`,
      name: 'Tháng 10/2026',
      academicYear: '2026-2027',
      periodType: 'month',
      periodValue: '10',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'active',
      description: 'Đánh giá KPI cán bộ quản lý Tháng 10 năm 2026'
    });
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleEdit = (p: KpiCbqlPeriod) => {
    setEditingPeriod({ ...p });
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod?.name || !editingPeriod?.academicYear) {
      setErrorMsg('Vui lòng điền đầy đủ tên kỳ và năm học.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await saveCbqlPeriod(editingPeriod as KpiCbqlPeriod, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      setIsEditing(false);
      setEditingPeriod(null);
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu kỳ đánh giá');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (periodId: string) => {
    try {
      await deleteCbqlPeriod(periodId, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa kỳ đánh giá');
    }
  };

  const handleToggleLock = async (p: KpiCbqlPeriod) => {
    try {
      const nextStatus = p.status === 'locked' ? 'active' : 'locked';
      await saveCbqlPeriod({ ...p, status: nextStatus }, {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      });
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Quản Lý Kỳ Đánh Giá KPI CBQL</h3>
              <p className="text-xs text-slate-300">Trường THPT Minh Hòa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase">Danh sách các kỳ đánh giá ({periods.length})</span>
                <button
                  onClick={handleAddNew}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm Kỳ Đánh Giá</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {periods.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{p.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'locked' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status === 'active' ? 'Đang mở' : p.status === 'locked' ? 'Đã khóa' : 'Dự thảo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Năm học: <strong>{p.academicYear}</strong></span>
                        <span>•</span>
                        <span>Loại kỳ: {p.periodType === 'month' ? 'Theo tháng' : p.periodType === 'term' ? 'Theo học kỳ' : 'Cả năm'}</span>
                        <span>•</span>
                        <span>Thời gian: {p.startDate} ~ {p.endDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleLock(p)}
                        className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          p.status === 'locked' 
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={p.status === 'locked' ? 'Mở khóa kỳ' : 'Khóa kỳ đánh giá'}
                      >
                        {p.status === 'locked' ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>

                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Edit2 size={16} className="text-indigo-600" />
                {editingPeriod?.id ? 'Chỉnh Sửa Kỳ Đánh Giá' : 'Thêm Kỳ Đánh Giá Mới'}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Năm học:</label>
                  <select
                    value={editingPeriod?.academicYear || '2026-2027'}
                    onChange={(e) => handlePeriodChange({ academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="2026-2027">Năm học 2026-2027</option>
                    <option value="2025-2026">Năm học 2025-2026</option>
                    <option value="2027-2028">Năm học 2027-2028</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Loại kỳ:</label>
                  <select
                    value={editingPeriod?.periodType || 'month'}
                    onChange={(e) => {
                      const nextType = e.target.value as any;
                      const defaultVal = nextType === 'month' ? '10' : nextType === 'term' ? 'HK1' : '';
                      handlePeriodChange({ periodType: nextType, periodValue: defaultVal });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="month">Theo tháng</option>
                    <option value="term">Theo học kỳ</option>
                    <option value="year">Cả năm học</option>
                  </select>
                </div>
              </div>

              {editingPeriod?.periodType === 'month' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Chọn tháng từ 1 đến 12:</label>
                  <select
                    value={editingPeriod?.periodValue || '10'}
                    onChange={(e) => handlePeriodChange({ periodValue: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingPeriod?.periodType === 'term' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Chọn học kỳ:</label>
                  <select
                    value={editingPeriod?.periodValue || 'HK1'}
                    onChange={(e) => handlePeriodChange({ periodValue: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="HK1">Học kỳ I</option>
                    <option value="HK2">Học kỳ II</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tên kỳ đánh giá:</label>
                <input
                  type="text"
                  value={editingPeriod?.name || ''}
                  onChange={(e) => handlePeriodChange({ name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ngày bắt đầu:</label>
                  <input
                    type="date"
                    value={editingPeriod?.startDate || ''}
                    onChange={(e) => handlePeriodChange({ startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ngày kết thúc:</label>
                  <input
                    type="date"
                    value={editingPeriod?.endDate || ''}
                    onChange={(e) => handlePeriodChange({ endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Trạng thái:</label>
                <select
                  value={editingPeriod?.status || 'active'}
                  onChange={(e) => setEditingPeriod(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                >
                  <option value="active">Đang mở (Cho phép đánh giá)</option>
                  <option value="locked">Đã khóa (Chỉ xem dữ liệu)</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
