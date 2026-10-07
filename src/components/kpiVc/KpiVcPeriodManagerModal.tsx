import React, { useState } from 'react';
import { X, Plus, Calendar, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { KpiVcPeriod } from '../../types/kpiVc';
import { createVcPeriod, updateVcPeriod, VC_COLLECTIONS } from '../../services/kpiVcService';
import { useAuth } from '../../store/AuthContext';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface KpiVcPeriodManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: KpiVcPeriod[];
}

export default function KpiVcPeriodManagerModal({
  isOpen,
  onClose,
  periods
}: KpiVcPeriodManagerModalProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state for creating/editing
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'locked' | 'draft'>('active');
  const [periodType, setPeriodType] = useState<'month' | 'term' | 'year'>('month');
  const [periodValue, setPeriodValue] = useState<string>('10');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAcademicYear('2026-2027');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setStatus('active');
    setPeriodType('month');
    setPeriodValue('10');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handlePeriodTypeOrValueChange = (type: 'month' | 'term' | 'year', val: string, year: string) => {
    setPeriodType(type);
    setPeriodValue(val);
    
    const [startYearStr, endYearStr] = year.split('-');
    const startYear = parseInt(startYearStr) || 2026;
    const endYear = parseInt(endYearStr) || 2027;

    if (type === 'month') {
      const monthNum = parseInt(val) || 10;
      // Months 9-12 belong to startYear. Months 1-8 belong to endYear.
      const calendarYear = monthNum >= 9 ? startYear : endYear;
      
      const paddedMonth = monthNum.toString().padStart(2, '0');
      const start = `${calendarYear}-${paddedMonth}-01`;
      
      // Get last day of that month
      const lastDay = new Date(calendarYear, monthNum, 0).getDate();
      const end = `${calendarYear}-${paddedMonth}-${lastDay}`;
      
      setStartDate(start);
      setEndDate(end);
      setName(`Tháng ${monthNum}/${calendarYear}`);
      setDescription(`Đánh giá KPI viên chức giáo viên, nhân viên Tháng ${monthNum} năm ${calendarYear}`);
    } else if (type === 'term') {
      if (val === 'HK1') {
        setStartDate(`${startYear}-09-01`);
        setEndDate(`${endYear}-01-15`);
        setName(`Học kỳ I năm học ${year}`);
        setDescription(`Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ I năm học ${year}`);
      } else {
        setStartDate(`${endYear}-01-16`);
        setEndDate(`${endYear}-05-31`);
        setName(`Học kỳ II năm học ${year}`);
        setDescription(`Đánh giá KPI viên chức giáo viên, nhân viên Học kỳ II năm học ${year}`);
      }
    } else if (type === 'year') {
      setStartDate(`${startYear}-09-01`);
      setEndDate(`${endYear}-05-31`);
      setName(`Cả năm học ${year}`);
      setDescription(`Tổng kết đánh giá KPI viên chức giáo viên, nhân viên cả năm học ${year}`);
    }
  };

  const handleStartEdit = (p: KpiVcPeriod) => {
    setEditingId(p.id);
    setName(p.name);
    setAcademicYear(p.academicYear || '2026-2027');
    setStartDate(p.startDate || '');
    setEndDate(p.endDate || '');
    setDescription(p.description || '');
    setStatus(p.status || 'active');
    setPeriodType(p.periodType || 'month');
    setPeriodValue(p.periodValue || '10');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên kỳ đánh giá.');
      return;
    }

    try {
      const actor = {
        id: user?.id || 'admin',
        name: user?.name || 'Admin',
        role: user?.role
      };

      if (editingId) {
        await updateVcPeriod(editingId, {
          name,
          academicYear,
          startDate,
          endDate,
          description,
          status,
          periodType,
          periodValue
        }, actor);
        setSuccessMsg('Đã cập nhật kỳ đánh giá thành công!');
      } else {
        await createVcPeriod({
          name,
          academicYear,
          startDate: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate || new Date().toISOString().split('T')[0],
          description,
          status,
          periodType,
          periodValue
        }, actor);
        setSuccessMsg('Đã tạo kỳ đánh giá mới thành công!');
        resetForm();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu kỳ đánh giá');
    }
  };

  const handleDelete = async (periodId: string, periodName: string) => {
    try {
      await deleteDoc(doc(db, VC_COLLECTIONS.PERIODS, periodId));
      setSuccessMsg(`Đã xóa kỳ đánh giá ${periodName}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa kỳ đánh giá');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar size={22} className="text-blue-300" />
            <h2 className="text-lg font-black tracking-wide">QUẢN LÝ KỲ ĐÁNH GIÁ (Tháng, Học kỳ, Năm học)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Form create/edit */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              {editingId ? <Edit2 size={16} className="text-blue-600" /> : <Plus size={16} className="text-blue-600" />}
              {editingId ? 'Chỉnh sửa kỳ đánh giá' : 'Thêm kỳ đánh giá mới'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Năm học
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => {
                    const nextYear = e.target.value;
                    setAcademicYear(nextYear);
                    handlePeriodTypeOrValueChange(periodType, periodValue, nextYear);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="2026-2027">Năm học 2026-2027</option>
                  <option value="2025-2026">Năm học 2025-2026</option>
                  <option value="2027-2028">Năm học 2027-2028</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Loại kỳ
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => {
                      const nextType = e.target.value as any;
                      const defaultVal = nextType === 'month' ? '10' : nextType === 'term' ? 'HK1' : '';
                      handlePeriodTypeOrValueChange(nextType, defaultVal, academicYear);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="month">Theo tháng</option>
                    <option value="term">Theo học kỳ</option>
                    <option value="year">Cả năm học</option>
                  </select>
                </div>

                {periodType === 'month' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Chọn tháng
                    </label>
                    <select
                      value={periodValue}
                      onChange={(e) => handlePeriodTypeOrValueChange('month', e.target.value, academicYear)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m.toString()}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {periodType === 'term' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Chọn học kỳ
                    </label>
                    <select
                      value={periodValue}
                      onChange={(e) => handlePeriodTypeOrValueChange('term', e.target.value, academicYear)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                    >
                      <option value="HK1">Học kỳ I</option>
                      <option value="HK2">Học kỳ II</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Tên kỳ đánh giá <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Tháng 10/2026, HK2 2026-2027..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả chi tiết kỳ đánh giá..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingId ? 'Cập nhật kỳ' : 'Thêm kỳ đánh giá'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: List of periods */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
              <span>Danh sách kỳ đánh giá hiện có ({periods.length})</span>
            </h3>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-200">
                {periods.map(p => (
                  <div key={p.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-extrabold rounded-md border border-blue-200">
                          {p.academicYear}
                        </span>
                        {p.periodType && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200">
                            {p.periodType === 'month' ? 'Theo tháng' : p.periodType === 'term' ? 'Theo học kỳ' : 'Cả năm'}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-600">{p.description}</p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Thời gian: {p.startDate || '---'} đến {p.endDate || '---'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {periods.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Chưa có kỳ đánh giá nào.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
