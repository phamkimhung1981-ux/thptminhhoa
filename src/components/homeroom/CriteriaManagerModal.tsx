import React, { useState } from 'react';
import { X, Settings, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, ShieldAlert, Sliders } from 'lucide-react';
import { ConductCriterion, ConductCategory, SeriousViolationConfig, ViolationCategoryType, ViolationSeverity, WarningLevel } from '../../types/homeroom';
import { DEFAULT_SERIOUS_VIOLATION_CONFIGS } from '../../lib/homeroomData';
import { homeroomService } from '../../services/homeroomService';

interface CriteriaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ConductCategory[];
  criteria: ConductCriterion[];
  violationConfigs?: SeriousViolationConfig[];
  onAddCriterion: (criterion: Omit<ConductCriterion, 'id'>) => Promise<void>;
  onUpdateCriterion: (id: string, updates: Partial<ConductCriterion>) => Promise<void>;
  onDeleteCriterion: (id: string) => Promise<void>;
  onSaveViolationConfig?: (cfg: Omit<SeriousViolationConfig, 'id'> & { id?: string }) => Promise<void>;
  onDeleteViolationConfig?: (id: string) => Promise<void>;
}

export default function CriteriaManagerModal({
  isOpen,
  onClose,
  categories,
  criteria,
  violationConfigs = DEFAULT_SERIOUS_VIOLATION_CONFIGS,
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onSaveViolationConfig,
  onDeleteViolationConfig
}: CriteriaManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'criteria' | 'violation_configs'>('criteria');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for criteria
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pointType, setPointType] = useState<'minus' | 'plus'>('minus');
  const [defaultPoint, setDefaultPoint] = useState(-5);
  const [severity, setSeverity] = useState<ViolationSeverity>('Vừa');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for violation config
  const [isVioFormOpen, setIsVioFormOpen] = useState(false);
  const [editingVioId, setEditingVioId] = useState<string | null>(null);
  const [vioCategoryType, setVioCategoryType] = useState<ViolationCategoryType>('ATGT');
  const [vioTitle, setVioTitle] = useState('');
  const [vioSeverity, setVioSeverity] = useState<ViolationSeverity>('Nghiêm trọng');
  const [vioMinusPoint, setVioMinusPoint] = useState(-10);
  const [vioHasWarning, setVioHasWarning] = useState(true);
  const [vioWarningLevel, setVioWarningLevel] = useState<WarningLevel>('serious');
  const [vioProposedRating, setVioProposedRating] = useState('Xem xét mức rèn luyện thấp');
  const [vioRequiresBgh, setVioRequiresBgh] = useState(false);
  const [vioNote, setVioNote] = useState('');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`TC${String(criteria.length + 1).padStart(2, '0')}`);
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setPointType('minus');
    setDefaultPoint(-5);
    setSeverity('Vừa');
    setIsFormOpen(true);
    setErrorMsg('');
  };

  const handleOpenEdit = (crit: ConductCriterion) => {
    setEditingId(crit.id);
    setCode(crit.code);
    setName(crit.name);
    setDescription(crit.description || '');
    setCategoryId(crit.categoryId);
    setPointType(crit.pointType);
    setDefaultPoint(crit.defaultPoint);
    setSeverity(crit.severity || 'Vừa');
    setIsFormOpen(true);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !categoryId) {
      setErrorMsg('Vui lòng điền đầy đủ Mã, Tên tiêu chí và Nhóm.');
      return;
    }

    const category = categories.find(c => c.id === categoryId);

    try {
      setSubmitting(true);
      setErrorMsg('');

      if (editingId) {
        await onUpdateCriterion(editingId, {
          code,
          name,
          description,
          categoryId,
          categoryName: category?.name || 'VI PHẠM KHÁC',
          pointType,
          defaultPoint: Number(defaultPoint),
          deductionPerOccurrence: Number(defaultPoint),
          severity
        });
      } else {
        await onAddCriterion({
          code,
          name,
          description,
          categoryId,
          categoryName: category?.name || 'VI PHẠM KHÁC',
          pointType,
          defaultPoint: Number(defaultPoint),
          deductionPerOccurrence: Number(defaultPoint),
          severity,
          status: 'active',
          sortOrder: criteria.length + 1
        });
      }

      setSubmitting(false);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi lưu tiêu chí.');
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (crit: ConductCriterion) => {
    const newStatus = crit.status === 'active' ? 'inactive' : 'active';
    await onUpdateCriterion(crit.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tiêu chí này?')) {
      await onDeleteCriterion(id);
    }
  };

  const handleOpenAddVio = () => {
    setEditingVioId(null);
    setVioCategoryType('ATGT');
    setVioTitle('');
    setVioSeverity('Nghiêm trọng');
    setVioMinusPoint(-10);
    setVioHasWarning(true);
    setVioWarningLevel('serious');
    setVioProposedRating('Chưa đạt (Xếp Yếu)');
    setVioRequiresBgh(true);
    setVioNote('');
    setIsVioFormOpen(true);
  };

  const handleOpenEditVio = (cfg: SeriousViolationConfig) => {
    setEditingVioId(cfg.id);
    setVioCategoryType(cfg.categoryType);
    setVioTitle(cfg.title);
    setVioSeverity(cfg.severity);
    setVioMinusPoint(cfg.minusPoint);
    setVioHasWarning(cfg.hasConductWarning);
    setVioWarningLevel(cfg.warningLevel);
    setVioProposedRating(cfg.proposedRating);
    setVioRequiresBgh(cfg.requiresBghApproval);
    setVioNote(cfg.note || '');
    setIsVioFormOpen(true);
  };

  const handleSubmitVio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vioTitle) return;

    try {
      setSubmitting(true);
      const newConfig: SeriousViolationConfig = {
        id: editingVioId || `vio_cfg_${Date.now()}`,
        categoryType: vioCategoryType,
        title: vioTitle,
        severity: vioSeverity,
        minusPoint: Number(vioMinusPoint),
        hasConductWarning: vioHasWarning,
        warningLevel: vioWarningLevel,
        proposedRating: vioProposedRating,
        requiresBghApproval: vioRequiresBgh,
        isActive: true,
        note: vioNote
      };

      if (onSaveViolationConfig) {
        await onSaveViolationConfig(newConfig);
      }
      setSubmitting(false);
      setIsVioFormOpen(false);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const handleDeleteVio = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quy tắc vi phạm này?')) {
      if (onDeleteViolationConfig) {
        await onDeleteViolationConfig(id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 pb-0 flex flex-col justify-between shrink-0">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings size={20} className="text-blue-400" />
              CẤU HÌNH & QUẢN LÝ TIÊU CHÍ NỀN NẾP & VI PHẠM (BGH)
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('criteria')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'criteria'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders size={14} />
              <span>Quản lý Tiêu chí Nền nếp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('violation_configs')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'violation_configs'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-rose-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldAlert size={14} className="text-rose-400" />
              <span>⚙ Cấu hình mức độ vi phạm</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'criteria' ? (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-slate-700">
                  Hệ thống đã tích hợp sẵn <strong>16 tiêu chí nền nếp chuẩn</strong>. Bạn có thể chỉnh sửa số điểm, ẩn/hiện hoặc thêm mới tiêu chí bổ sung cho toàn trường.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={16} /> Thêm tiêu chí mới
                </button>
              </div>

              {/* Form for Add/Edit */}
              {isFormOpen && (
                <form onSubmit={handleSubmit} className="bg-slate-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    {editingId ? 'Hiệu chỉnh tiêu chí' : 'Thêm mới tiêu chí'}
                  </h3>

                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã tiêu chí</label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nhóm tiêu chí</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Loại điểm</label>
                      <select
                        value={pointType}
                        onChange={(e) => {
                          const type = e.target.value as 'minus' | 'plus';
                          setPointType(type);
                          if (type === 'plus' && defaultPoint < 0) setDefaultPoint(Math.abs(defaultPoint));
                          if (type === 'minus' && defaultPoint > 0) setDefaultPoint(-Math.abs(defaultPoint));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="minus">Điểm trừ (-)</option>
                        <option value="plus">Điểm cộng (+)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên tiêu chí vi phạm / khen thưởng</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Số điểm quy định</label>
                      <input
                        type="number"
                        value={defaultPoint}
                        onChange={(e) => setDefaultPoint(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mức độ nghiêm trọng</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="Nhẹ">Nhẹ</option>
                        <option value="Vừa">Vừa</option>
                        <option value="Nghiêm trọng">Nghiêm trọng</option>
                        <option value="Rất nghiêm trọng">Rất nghiêm trọng</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả / Hướng dẫn</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu tiêu chí'}
                    </button>
                  </div>
                </form>
              )}

              {/* Table of Criteria */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3 w-16">Mã</th>
                      <th className="p-3">Tên tiêu chí</th>
                      <th className="p-3">Nhóm</th>
                      <th className="p-3 text-center">Loại & Điểm</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criteria.map(crit => (
                      <tr key={crit.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-600">{crit.code}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {crit.name}
                          {crit.description && (
                            <p className="text-[10px] text-slate-500 font-normal mt-0.5">{crit.description}</p>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{crit.categoryName}</td>
                        <td className="p-3 text-center font-bold">
                          <span className={crit.pointType === 'plus' ? 'text-emerald-600' : 'text-rose-600'}>
                            {crit.pointType === 'plus' ? `+${crit.defaultPoint}` : `${crit.defaultPoint}`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(crit)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors inline-flex items-center gap-1 ${
                              crit.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {crit.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {crit.status === 'active' ? 'Đang dùng' : 'Đã ẩn'}
                          </button>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(crit)}
                            className="text-blue-600 hover:text-blue-800 font-bold p-1"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(crit.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold p-1"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Sub-tab: Violation Configs */
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-950">
                <div>
                  <p className="font-bold text-sm text-rose-900">⚙ Cấu hình quy tắc cảnh báo vi phạm nghiêm trọng (Tùy chỉnh Mức độ & Đề xuất Xếp Yếu)</p>
                  <p className="text-rose-700">
                    Cấu hình quy tắc tự động kích hoạt Cảnh báo rèn luyện, chọn mức độ vi phạm, gán đề xuất xếp loại rèn luyện (Khá, Đạt, Yếu) và yêu cầu phê duyệt BGH.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddVio}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={16} /> Thêm quy tắc mới
                </button>
              </div>

              {/* Form for Add/Edit Violation Config */}
              {isVioFormOpen && (
                <form onSubmit={handleSubmitVio} className="bg-rose-50/70 border border-rose-300 rounded-xl p-4 space-y-3 text-xs">
                  <h3 className="font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={16} />
                    {editingVioId ? 'Chỉnh sửa quy tắc vi phạm' : 'Thêm mới quy tắc vi phạm'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Loại danh mục</label>
                      <select
                        value={vioCategoryType}
                        onChange={(e) => setVioCategoryType(e.target.value as ViolationCategoryType)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none font-bold"
                      >
                        <option value="ATGT">🚨 Vi phạm ATGT</option>
                        <option value="BẠO LỰC HỌC ĐƯỜNG">🚨 Bạo lực học đường</option>
                        <option value="GIAN LẬN THI CỬ">🚨 Gian lận thi cử</option>
                        <option value="NỘI QUY">Nội quy học đường</option>
                        <option value="KHÁC">Khác (Vi phạm nghiêm trọng)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Tên / Tiêu đề vi phạm</label>
                      <input
                        type="text"
                        value={vioTitle}
                        onChange={(e) => setVioTitle(e.target.value)}
                        placeholder="VD: Điều khiển xe máy không đủ tuổi, Xô xát đe dọa bạn..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">⚙ Mức độ vi phạm</label>
                      <select
                        value={vioSeverity}
                        onChange={(e) => setVioSeverity(e.target.value as ViolationSeverity)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none font-bold"
                      >
                        <option value="Nhẹ">🟢 Nhẹ</option>
                        <option value="Vừa">🟡 Vừa</option>
                        <option value="Nghiêm trọng">🔴 Nghiêm trọng</option>
                        <option value="Rất nghiêm trọng">🚨 Rất nghiêm trọng</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">🎯 Đề xuất mức rèn luyện (Bao gồm Xếp Yếu)</label>
                      <select
                        value={vioProposedRating}
                        onChange={(e) => setVioProposedRating(e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none font-bold ${
                          vioProposedRating.includes('Yếu') || vioProposedRating.includes('Chưa đạt') ? 'border-rose-400 text-rose-800 bg-rose-50' : 'border-slate-300'
                        }`}
                      >
                        <option value="Tốt">🟢 Đạt loại Tốt</option>
                        <option value="Khống chế Khá">🔹 Khống chế loại Khá</option>
                        <option value="Khống chế Đạt">🔸 Khống chế loại Đạt</option>
                        <option value="Chưa đạt (Xếp Yếu)">🚨 CHƯA ĐẠT / XẾP YẾU</option>
                        <option value="Xem xét mức rèn luyện thấp">⚠️ Xem xét mức rèn luyện thấp</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Số điểm trừ</label>
                      <input
                        type="number"
                        value={vioMinusPoint}
                        onChange={(e) => setVioMinusPoint(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-bold text-rose-700"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 bg-white p-2.5 rounded-lg border border-rose-200">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                      <input
                        type="checkbox"
                        checked={vioHasWarning}
                        onChange={(e) => setVioHasWarning(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded accent-rose-600"
                      />
                      <span>Tự động kích hoạt Cảnh báo rèn luyện</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                      <input
                        type="checkbox"
                        checked={vioRequiresBgh}
                        onChange={(e) => setVioRequiresBgh(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded accent-rose-600"
                      />
                      <span>Yêu cầu Ban Giám hiệu phê duyệt</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsVioFormOpen(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg cursor-pointer"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu quy tắc'}
                    </button>
                  </div>
                </form>
              )}

              {/* Table of Violation Configs */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/80 border-b border-rose-200 text-rose-950 font-bold">
                    <tr>
                      <th className="p-3">Danh mục / Tên vi phạm</th>
                      <th className="p-3 text-center">Mức độ</th>
                      <th className="p-3 text-center">Điểm trừ</th>
                      <th className="p-3 text-center">Cảnh báo rèn luyện</th>
                      <th className="p-3">Đề xuất mức rèn luyện</th>
                      <th className="p-3 text-center">Cần BGH duyệt</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {violationConfigs.map((cfg) => (
                      <tr key={cfg.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-bold text-rose-700">{cfg.categoryType}:</span> {cfg.title}
                          {cfg.note && <p className="text-[10px] text-slate-500 mt-0.5">{cfg.note}</p>}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{cfg.severity}</td>
                        <td className="p-3 text-center font-bold text-rose-700">{cfg.minusPoint} điểm</td>
                        <td className="p-3 text-center">
                          {cfg.hasConductWarning ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ⚠ Có cảnh báo ({cfg.warningLevel})
                            </span>
                          ) : (
                            <span className="text-slate-400">Không</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          <span className={cfg.proposedRating.includes('Yếu') || cfg.proposedRating.includes('Chưa đạt') ? 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-extrabold' : ''}>
                            {cfg.proposedRating}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold">
                          {cfg.requiresBghApproval ? (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              ☑ BGH Duyệt
                            </span>
                          ) : (
                            <span className="text-slate-400">Không</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVio(cfg)}
                            className="text-blue-600 hover:text-blue-800 font-bold p-1 cursor-pointer"
                            title="Chỉnh sửa quy tắc"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVio(cfg.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer"
                            title="Xóa quy tắc"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
