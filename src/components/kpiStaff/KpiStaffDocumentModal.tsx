import React, { useState } from 'react';
import { KpiStaffPeriod, KpiStaffForm, StaffPositionKey } from '../../types/kpiStaff';
import { Teacher } from '../../types';
import { getEligibleStaffMembers, createInitialStaffForm, POSITION_CONFIGS, detectPositionKey } from '../../lib/kpiStaffData';
import { FileText, Users, CheckCircle2, User, Search, AlertCircle, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  periods: KpiStaffPeriod[];
  selectedPeriodId: string;
  teachers: Teacher[];
  existingForms: KpiStaffForm[];
  onCreateForms: (newForms: KpiStaffForm[]) => void;
  currentUserId: string;
  currentUserName: string;
}

export default function KpiStaffDocumentModal({
  isOpen,
  onClose,
  periods,
  selectedPeriodId,
  teachers,
  existingForms,
  onCreateForms,
  currentUserId
}: Props) {
  const [targetPeriodId, setTargetPeriodId] = useState<string>(selectedPeriodId);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [overridePositionKey, setOverridePositionKey] = useState<StaffPositionKey | 'AUTO'>('AUTO');
  const [mode, setMode] = useState<'all' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const eligibleStaff = getEligibleStaffMembers(teachers);
  const selectedPeriod = periods.find(p => p.id === targetPeriodId) || periods[0];

  const filteredStaff = eligibleStaff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.position || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedStaffIds.length === eligibleStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(eligibleStaff.map(s => s.id));
    }
  };

  const handleToggleStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(selectedStaffIds.filter(i => i !== id));
    } else {
      setSelectedStaffIds([...selectedStaffIds, id]);
    }
  };

  const handleGenerateForms = () => {
    setSuccessMessage('');
    setErrorMessage('');

    const targetStaffList = mode === 'all' ? eligibleStaff : eligibleStaff.filter(s => selectedStaffIds.includes(s.id));

    if (targetStaffList.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 nhân viên để tạo phiếu đánh giá.');
      return;
    }

    if (!selectedPeriod) {
      setErrorMessage('Vui lòng chọn kỳ đánh giá hợp lệ.');
      return;
    }

    const createdForms: KpiStaffForm[] = [];

    targetStaffList.forEach(staff => {
      // Check if form already exists
      const exists = existingForms.some(f => f.employeeId === staff.id && f.periodId === selectedPeriod.id);
      if (exists) return;

      const activeKey = overridePositionKey === 'AUTO' ? detectPositionKey(staff.position || '') : overridePositionKey;
      const newForm = createInitialStaffForm(staff, selectedPeriod, activeKey);

      createdForms.push(newForm);
    });

    if (createdForms.length === 0) {
      setErrorMessage('Tất cả nhân viên được chọn đều đã có phiếu trong kỳ này.');
      return;
    }

    onCreateForms(createdForms);
    setSuccessMessage(`Đã khởi tạo thành công ${createdForms.length} phiếu đánh giá KPI Nhân viên (30đ Chung + 70đ Vị trí)!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Khởi tạo Phiếu Đánh giá KPI Nhân viên</h2>
              <p className="text-xs text-emerald-200/80">Khung 30đ KPI chung + 70đ KPI vị trí việc làm theo dự thảo THPT Minh Hòa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-emerald-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Select Period & Position config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">1. Chọn kỳ đánh giá</label>
              <select
                value={targetPeriodId}
                onChange={e => setTargetPeriodId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <optgroup label="📋 Tổng kết (Học kỳ & Cả năm)">
                  {periods
                    .filter(p => p.periodType === 'term' || p.periodType === 'year')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Năm học {p.academicYear}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="📅 Đánh giá theo tháng (Năm học 2026-2027)">
                  {periods
                    .filter(p => p.periodType === 'month' || (!p.periodType && !p.name.includes('năm') && !p.name.includes('kỳ')))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Năm học {p.academicYear}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">2. Bộ KPI Vị trí việc làm (70đ)</label>
              <select
                value={overridePositionKey}
                onChange={e => setOverridePositionKey(e.target.value as StaffPositionKey | 'AUTO')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="AUTO">✨ Tự động nhận diện theo chức danh nhân viên</option>
                {Object.values(POSITION_CONFIGS).map(cfg => (
                  <option key={cfg.key} value={cfg.key}>
                    {cfg.positionName} (70 điểm)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Scope selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">3. Chọn danh sách nhân viên</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  mode === 'all'
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Users className={mode === 'all' ? 'text-emerald-700' : 'text-slate-400'} size={20} />
                <div>
                  <p className="font-bold">Tất cả Nhân viên ({eligibleStaff.length})</p>
                  <p className="text-[11px] text-slate-500 font-normal">Tự động tạo phiếu cho khối Tổ văn phòng</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  mode === 'custom'
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <User className={mode === 'custom' ? 'text-emerald-700' : 'text-slate-400'} size={20} />
                <div>
                  <p className="font-bold">Lựa chọn nhân viên</p>
                  <p className="text-[11px] text-slate-500 font-normal">Chọn từng nhân viên kế toán, văn thư, thủ quỹ...</p>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Staff Selection List */}
          {mode === 'custom' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên, mã NV, vị trí..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  {selectedStaffIds.length === eligibleStaff.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredStaff.map(staff => {
                  const isChecked = selectedStaffIds.includes(staff.id);
                  const hasForm = existingForms.some(f => f.employeeId === staff.id && f.periodId === selectedPeriod?.id);
                  const posKey = detectPositionKey(staff.position || '');
                  const posConfig = POSITION_CONFIGS[posKey];

                  return (
                    <div
                      key={staff.id}
                      onClick={() => !hasForm && handleToggleStaff(staff.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        hasForm
                          ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                          : isChecked
                          ? 'bg-emerald-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={hasForm}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{staff.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {staff.position || posConfig.positionName} • {staff.code || '---'}
                          </p>
                        </div>
                      </div>

                      {hasForm && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
                          Đã có phiếu
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleGenerateForms}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles size={16} /> Tạo phiếu đánh giá KPI
          </button>
        </div>

      </div>
    </div>
  );
}
