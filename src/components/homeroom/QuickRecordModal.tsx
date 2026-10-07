import React, { useState, useEffect } from 'react';
import { X, Zap, Check, AlertCircle, Users, Search, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { Student, ConductCriterion, ConductRecord, ClassInfo } from '../../types/homeroom';
import { useAuth } from '../../store/AuthContext';
import { getDefaultDateForMonthAndWeek } from '../../utils/schoolWeekUtils';

interface QuickRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  students: Student[];
  criteria: ConductCriterion[];
  onSaveQuick: (records: Omit<ConductRecord, 'id' | 'createdAt'>[]) => Promise<void>;
  selectedWeek?: number;
  selectedMonth?: string;
  selectedSchoolYear?: string;
}

export const POSITIVE_CRITERIA_LIST = [
  'Thực hiện nghiêm túc nội quy nhà trường',
  'Có ý thức học tập tốt',
  'Đi học đúng giờ',
  'Chấp hành tốt đồng phục',
  'Giữ gìn vệ sinh trường lớp',
  'Có ý thức tự giác học tập',
  'Tích cực tham gia hoạt động tập thể',
  'Có tinh thần giúp đỡ bạn bè',
  'Có ý thức giữ gìn tài sản chung',
  'Có tiến bộ rõ rệt',
  'Có tinh thần trách nhiệm',
  'Thực hiện tốt nhiệm vụ được giao',
  'Gương mẫu trong lớp',
  'Nội dung khác'
];

export default function QuickRecordModal({
  isOpen,
  onClose,
  selectedClass,
  students,
  criteria,
  onSaveQuick,
  selectedWeek,
  selectedMonth,
  selectedSchoolYear
}: QuickRecordModalProps) {
  const { user } = useAuth();

  // Mode: VI PHẠM (mặc định) hoặc THỰC HIỆN NGHIÊM TÚC, TỐT
  const [recordMode, setRecordMode] = useState<'VI_PHAM' | 'TICH_CUC'>('VI_PHAM');

  // Common state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Violation Mode State
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>('');
  const [quickLevel, setQuickLevel] = useState<'Nhẹ' | 'Vừa' | 'Nghiêm trọng' | 'Rất nghiêm trọng'>('Nhẹ');
  const [quickRating, setQuickRating] = useState<string>('Theo dõi');

  // Positive Mode State
  const [selectedPositiveItems, setSelectedPositiveItems] = useState<string[]>([]);
  const [otherPositiveText, setOtherPositiveText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setRecordMode('VI_PHAM');
      setSelectedStudentIds([]);
      setStudentSearch('');
      setSelectedCriterionId('');
      setSelectedPositiveItems([]);
      setOtherPositiveText('');
      setQuickLevel('Nhẹ');
      setQuickRating('Theo dõi');
      setNote('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter active criteria for quick violation selection
  const quickCriteria = criteria
    .filter(c => c.status === 'active')
    .sort((a, b) => (a.code === 'TC00' || a.pointType === 'plus' ? -1 : 1))
    .slice(0, 14);

  const visibleStudents = students.filter(s =>
    !studentSearch ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(visibleStudents.map(s => s.id));
    }
  };

  const togglePositiveItem = (item: string) => {
    setSelectedPositiveItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    if (selectedStudentIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 học sinh.');
      return;
    }
    if (!selectedClass) {
      setErrorMsg('Chưa chọn lớp học.');
      return;
    }

    const parsedMonth = selectedMonth ? parseInt(selectedMonth.replace(/\D/g, ''), 10) : NaN;
    const monthNumber = !isNaN(parsedMonth) && parsedMonth > 0 ? parsedMonth : (new Date().getMonth() + 1);
    const weekNumber = selectedWeek !== undefined ? selectedWeek : Math.ceil(((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
    const schoolYear = selectedSchoolYear || selectedClass.schoolYear || '2026–2027';
    const recordDate = getDefaultDateForMonthAndWeek(monthNumber, weekNumber, schoolYear);

    // MODE 1: GHI NHẬN TÍCH CỰC (THỰC HIỆN NGHIÊM TÚC, TỐT)
    if (recordMode === 'TICH_CUC') {
      if (selectedPositiveItems.length === 0) {
        setErrorMsg('Vui lòng chọn ít nhất 1 nội dung ghi nhận tích cực.');
        return;
      }
      if (selectedPositiveItems.includes('Nội dung khác') && selectedPositiveItems.length === 1 && !otherPositiveText.trim()) {
        setErrorMsg('Vui lòng nhập nội dung khác vào ô bên dưới.');
        return;
      }

      try {
        setSubmitting(true);
        setErrorMsg('');

        const finalItems = selectedPositiveItems.map(item => {
          if (item === 'Nội dung khác') {
            return otherPositiveText.trim() ? otherPositiveText.trim() : 'Nội dung khác';
          }
          return item;
        });

        const criterionName = finalItems.join('; ');

        // Requirement 5: KHÔNG CỘNG ĐIỂM TỰ ĐỘNG (point = 0)
        const recordsToCreate = selectedStudentIds.map(stId => {
          const student = students.find(s => s.id === stId);
          return {
            studentId: stId,
            studentName: student?.name || 'Học sinh',
            classId: selectedClass.id,
            className: selectedClass.name,
            schoolYear,
            weekNumber,
            monthNumber,
            recordType: 'TICH_CUC' as const,
            criterionId: 'tich_cuc_nhanh',
            criterionName,
            positiveContents: finalItems,
            categoryId: 'cat_tich_cuc',
            categoryName: 'Ghi nhận tích cực',
            pointType: 'plus' as const,
            point: 0, // Không làm thay đổi điểm của học sinh
            level: undefined,
            proposedRating: undefined,
            hasConductWarning: false,
            requiresBghApproval: false,
            note: note.trim() || undefined,
            recordedBy: user?.id || 'gvcn',
            recordedByName: user?.name || 'Giáo viên Chủ nhiệm',
            recordDate
          };
        });

        await onSaveQuick(recordsToCreate);
        setSubmitting(false);
        setSelectedStudentIds([]);
        setSelectedPositiveItems([]);
        setOtherPositiveText('');
        setNote('');
        onClose();
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Lỗi lưu ghi nhận tích cực.');
        setSubmitting(false);
      }
      return;
    }

    // MODE 2: GHI NHẬN VI PHẠM (HIỆN TẠI)
    if (!selectedCriterionId) {
      setErrorMsg('Vui lòng chọn 1 tiêu chí vi phạm.');
      return;
    }
    const criterion = criteria.find(c => c.id === selectedCriterionId);
    if (!criterion) {
      setErrorMsg('Tiêu chí vi phạm không hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const isWeak = quickRating === 'Chưa đạt (Xếp Yếu)';
      const isWarning = isWeak || quickLevel === 'Nghiêm trọng' || quickLevel === 'Rất nghiêm trọng';

      const recordsToCreate = selectedStudentIds.map(stId => {
        const student = students.find(s => s.id === stId);
        return {
          studentId: stId,
          studentName: student?.name || 'Học sinh',
          classId: selectedClass.id,
          className: selectedClass.name,
          schoolYear,
          weekNumber,
          monthNumber,
          recordType: 'VI_PHAM' as const,
          criterionId: criterion.id,
          criterionName: criterion.name,
          categoryId: criterion.categoryId,
          categoryName: criterion.categoryName,
          pointType: criterion.pointType,
          point: criterion.defaultPoint,
          level: quickLevel,
          proposedRating: quickRating !== 'Theo dõi' ? quickRating : 'Theo dõi đánh giá',
          hasConductWarning: isWarning,
          requiresBghApproval: isWarning,
          bghApprovalStatus: isWarning ? 'Chưa duyệt' : undefined,
          note: note ? `[Ghi nhận nhanh] ${note.trim()}` : '[Ghi nhận nhanh]',
          recordedBy: user?.id || 'gvcn',
          recordedByName: user?.name || 'Giáo viên',
          recordDate
        };
      });

      await onSaveQuick(recordsToCreate);
      setSubmitting(false);
      setSelectedStudentIds([]);
      setNote('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi ghi nhận nhanh.');
      setSubmitting(false);
    }
  };

  const isPositiveMode = recordMode === 'TICH_CUC';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6">
        
        {/* Header with Mode-based gradient */}
        <div className={`text-white p-5 flex items-center justify-between transition-colors ${
          isPositiveMode
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600'
        }`}>
          <div>
            <h2 className="text-lg font-black flex items-center gap-2 tracking-tight">
              {isPositiveMode ? (
                <>
                  <Sparkles size={22} className="text-emerald-200 fill-emerald-200" />
                  GHI NHẬN HỌC SINH THỰC HIỆN NGHIÊM TÚC, TỐT
                </>
              ) : (
                <>
                  <Zap size={22} className="text-amber-200 fill-amber-200" />
                  GHI NHẬN NHANH NỀN NẾP (N HỌC SINH)
                </>
              )}
            </h2>
            <p className="text-xs text-white/90 mt-0.5">
              {isPositiveMode
                ? 'Biểu dương, ghi nhận ý thức tốt cho nhiều học sinh cùng lúc (không tự động cộng điểm)'
                : 'Áp dụng cùng 1 lỗi vi phạm cho nhiều học sinh bằng hộp kiểm'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. THÊM 2 LOẠI GHI NHẬN Ở ĐẦU FORM */}
        <div className="p-5 pb-0">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-2 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setRecordMode('VI_PHAM');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isPositiveMode
                  ? 'bg-rose-600 text-white shadow-md scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span className="text-sm">🔴</span>
              <span>VI PHẠM</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordMode('TICH_CUC');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isPositiveMode
                  ? 'bg-emerald-600 text-white shadow-md scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span className="text-sm">🟢</span>
              <span>THỰC HIỆN NGHIÊM TÚC, TỐT</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CHẾ ĐỘ 1: THỰC HIỆN NGHIÊM TÚC, TỐT */}
          {isPositiveMode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-emerald-600" />
                    1. Chọn nội dung ghi nhận tích cực:
                  </label>
                  <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    Đã chọn: {selectedPositiveItems.length} nội dung
                  </span>
                </div>

                {/* Danh sách lựa chọn nhanh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 border border-emerald-100 rounded-xl bg-emerald-50/30">
                  {POSITIVE_CRITERIA_LIST.map((item) => {
                    const isChecked = selectedPositiveItems.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePositiveItem(item)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <span className="leading-snug">{item}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Ô nhập khi chọn Nội dung khác */}
                {selectedPositiveItems.includes('Nội dung khác') && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                      Nhập chi tiết nội dung tích cực khác:
                    </label>
                    <input
                      type="text"
                      value={otherPositiveText}
                      onChange={(e) => setOtherPositiveText(e.target.value)}
                      placeholder="VD: Chủ động giúp giáo viên sắp xếp lớp học, có sáng kiến hay..."
                      className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30"
                    />
                  </div>
                )}
              </div>

              {/* Step 2: Chọn học sinh thực hiện nghiêm túc, tốt */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-emerald-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users size={16} className="text-emerald-600" />
                    2. Chọn học sinh thực hiện nghiêm túc, tốt{' '}
                    <span className="text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      Đã chọn: {selectedStudentIds.length}/{students.length} em
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                  >
                    {selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả học sinh'}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Tìm kiếm học sinh theo tên hoặc mã..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Checkbox Grid */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visibleStudents.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                      Không tìm thấy học sinh phù hợp.
                    </div>
                  ) : (
                    <>
                      <label
                        onClick={selectAllStudents}
                        className={`col-span-1 sm:col-span-2 flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all mb-1 ${
                          selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <span className="font-bold text-emerald-900">
                          ☑ CHỌN TẤT CẢ HỌC SINH ({visibleStudents.length} em)
                        </span>
                      </label>

                      {visibleStudents.map(s => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            onClick={() => toggleStudent(s.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-emerald-100/90 border-emerald-400 text-emerald-900 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                            />
                            <span className="truncate">{s.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto font-mono">{s.code}</span>
                          </label>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Thông báo quy định không cộng điểm */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Ghi chú tích cực:</strong> Ghi nhận này chỉ lưu vào hồ sơ rèn luyện tích cực của học sinh để theo dõi, khen thưởng và làm căn cứ xếp loại của GVCN, <strong>không tự động cộng điểm</strong> làm thay đổi điểm số hiện tại.
                </div>
              </div>

              {/* 3. Ghi chú thêm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Ghi chú thêm (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Tích cực giúp đỡ bạn trong học tập, gương mẫu trong tuần..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ 2: VI PHẠM (HIỆN TẠI) */
            <div className="space-y-4">
              {/* Step 1: Chọn tiêu chí */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  1. Chọn 1 tiêu chí vi phạm nhanh:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {quickCriteria.map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedCriterionId(c.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between cursor-pointer ${
                        selectedCriterionId === c.id
                          ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-xs ring-2 ring-amber-400'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className={`text-[10px] font-bold mt-1 ${c.pointType === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.pointType === 'plus' ? `+${c.defaultPoint}` : `${c.defaultPoint}`} điểm
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Chọn danh sách học sinh bằng hộp kiểm */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-amber-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users size={16} className="text-amber-600" />
                    2. Hộp kiểm chọn học sinh vi phạm{' '}
                    <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      Đã chọn: {selectedStudentIds.length}/{students.length}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    {selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả trong danh sách'}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Tìm kiếm học sinh..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Checkbox Grid */}
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visibleStudents.length === 0 ? (
                    <div className="col-span-2 text-center py-3 text-xs text-slate-400">
                      Không tìm thấy học sinh phù hợp.
                    </div>
                  ) : (
                    <>
                      <label
                        onClick={selectAllStudents}
                        className={`col-span-1 sm:col-span-2 flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all mb-1 ${
                          selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                        />
                        <span className="font-bold text-amber-900">
                          ☑ CHỌN TẤT CẢ HỌC SINH ({visibleStudents.length} em)
                        </span>
                      </label>

                      {visibleStudents.map(s => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            onClick={() => toggleStudent(s.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-amber-100/80 border-amber-400 text-amber-900 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Step 3: Mức độ vi phạm & Đề xuất Xếp Yếu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ⚙ Chọn Mức độ vi phạm:
                  </label>
                  <select
                    value={quickLevel}
                    onChange={(e) => setQuickLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold border border-amber-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Nhẹ">🟢 Nhẹ</option>
                    <option value="Vừa">🟡 Vừa</option>
                    <option value="Nghiêm trọng">🔴 Nghiêm trọng</option>
                    <option value="Rất nghiêm trọng">🚨 Rất nghiêm trọng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    🎯 Chọn Đề xuất Xếp loại (Bao gồm Xếp Yếu):
                  </label>
                  <select
                    value={quickRating}
                    onChange={(e) => setQuickRating(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-bold border rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none ${
                      quickRating === 'Chưa đạt (Xếp Yếu)' ? 'border-rose-500 text-rose-700 bg-rose-50' : 'border-amber-300 text-slate-800'
                    }`}
                  >
                    <option value="Theo dõi">🔵 Theo dõi bình thường</option>
                    <option value="Khá">🔹 Khống chế loại Khá</option>
                    <option value="Đạt">🔸 Khống chế loại Đạt</option>
                    <option value="Chưa đạt (Xếp Yếu)">🚨 CHƯA ĐẠT / XẾP YẾU</option>
                  </select>
                </div>
              </div>

              {/* Ghi chú nhanh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú thêm (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Tiết 2 môn Toán, hoặc đầu giờ sáng..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                isPositiveMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
              }`}
            >
              {isPositiveMode ? (
                <CheckCircle2 size={16} className="text-white" />
              ) : (
                <Zap size={16} className="fill-white" />
              )}
              {submitting
                ? 'Đang lưu...'
                : isPositiveMode
                  ? `✅ Xác nhận ghi nhận (${selectedStudentIds.length} học sinh)`
                  : `Xác nhận ghi nhận (${selectedStudentIds.length} học sinh)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
