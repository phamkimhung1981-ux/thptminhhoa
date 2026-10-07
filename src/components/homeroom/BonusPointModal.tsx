import React, { useState, useEffect } from 'react';
import { X, Star, Award, Check, AlertCircle, Search, Users } from 'lucide-react';
import { Student, ConductCriterion, ConductRecord, ClassInfo } from '../../types/homeroom';
import { useAuth } from '../../store/AuthContext';
import { getDefaultDateForMonthAndWeek } from '../../utils/schoolWeekUtils';

interface BonusPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassInfo | null;
  students: Student[];
  criteria: ConductCriterion[];
  onSaveBonus: (record: Omit<ConductRecord, 'id' | 'createdAt'>) => Promise<void>;
  selectedWeek?: number;
  selectedMonth?: string;
  selectedSchoolYear?: string;
}

export default function BonusPointModal({
  isOpen,
  onClose,
  selectedClass,
  students,
  criteria,
  onSaveBonus,
  selectedWeek,
  selectedMonth,
  selectedSchoolYear
}: BonusPointModalProps) {
  const { user } = useAuth();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [point, setPoint] = useState<number>(5);
  const [title, setTitle] = useState<string>('Học sinh thực hiện nghiêm túc nội quy nếp rèn luyện');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedStudentIds([]);
      setStudentSearch('');
      setPoint(5);
      setTitle('Học sinh thực hiện nghiêm túc nội quy nếp rèn luyện');
      setNote('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bonusCriterion = criteria.find(c => c.pointType === 'plus') || {
    id: 'crit_6',
    categoryId: 'cat_1',
    categoryName: 'NỀN NẾP HỌC TẬP',
    name: 'Điểm tốt'
  };

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
    if (selectedStudentIds.length === visibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(visibleStudents.map(s => s.id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 học sinh được tuyên dương.');
      return;
    }
    if (!selectedClass) {
      setErrorMsg('Thông tin lớp học không hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const parsedMonth = selectedMonth ? parseInt(selectedMonth.replace(/\D/g, ''), 10) : NaN;
      const monthNumber = !isNaN(parsedMonth) && parsedMonth > 0 ? parsedMonth : (new Date().getMonth() + 1);
      const weekNumber = selectedWeek !== undefined ? selectedWeek : Math.ceil(((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
      const schoolYear = selectedSchoolYear || selectedClass.schoolYear || '2026–2027';
      const recordDate = getDefaultDateForMonthAndWeek(monthNumber, weekNumber, schoolYear);

      for (const stId of selectedStudentIds) {
        const student = students.find(s => s.id === stId);
        if (!student) continue;

        await onSaveBonus({
          studentId: student.id,
          studentName: student.name,
          classId: selectedClass.id,
          className: selectedClass.name,
          schoolYear,
          weekNumber,
          monthNumber,
          criterionId: bonusCriterion.id,
          criterionName: title || 'Thành tích tốt / Điểm cộng',
          categoryId: bonusCriterion.categoryId,
          categoryName: bonusCriterion.categoryName || 'NỀN NẾP HỌC TẬP',
          pointType: 'plus',
          point: Number(point),
          level: 'Nhẹ',
          note: note ? `[Tuyên dương] ${note}` : `[Tuyên dương] ${title}`,
          recordedBy: user?.id || 'gvcn',
          recordedByName: user?.name || 'Giáo viên',
          recordDate
        });
      }

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi cộng điểm tốt.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Star size={22} className="text-amber-300 fill-amber-300" />
              GHI NHẬN ĐIỂM TỐT / KHEN THƯỞNG
            </h2>
            <p className="text-xs text-emerald-100">Cộng điểm nếp cho 1 hoặc nhiều học sinh xuất sắc</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CHỌN HỌC SINH VỚI HỘP KIỂM (CHECKBOXES) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-emerald-50/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users size={16} className="text-emerald-600" />
                HỘP KIỂM Tuyên Dương Học Sinh{' '}
                <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Đã chọn: {selectedStudentIds.length}/{students.length}
                </span>
              </label>

              <button
                type="button"
                onClick={selectAllStudents}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
              >
                {selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả trong danh sách'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Tìm học sinh theo tên..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Checkboxes List */}
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === visibleStudents.length && visibleStudents.length > 0}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                    />
                    <span className="font-bold text-emerald-900">
                      ⬜ CHỌN TẤT CẢ HỌC SINH ({visibleStudents.length} em)
                    </span>
                  </label>

                  {visibleStudents.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent label onClick
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Tên thành tích / lý do */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nội dung biểu dương
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white mb-2"
            >
              <option value="Học sinh thực hiện nghiêm túc nội quy nếp rèn luyện">Học sinh thực hiện nghiêm túc nội quy nếp rèn luyện (+5đ)</option>
              <option value="Đạt điểm 10 kiểm tra / Hăng hái phát biểu">Đạt điểm 10 kiểm tra / Hăng hái phát biểu (+5đ)</option>
              <option value="Đạt điểm 9 kiểm tra">Đạt điểm 9 kiểm tra (+3đ)</option>
              <option value="Nhặt được của rơi trả lại người mất">Nhặt được của rơi trả lại người mất (+10đ)</option>
              <option value="Đạt giải trong kỳ thi học sinh giỏi / Thể thao">Đạt giải trong kỳ thi HSG/Năng khiếu/Thể thao (+10đ)</option>
              <option value="Hỗ trợ bạn bè / Việc tốt phong trào">Hỗ trợ bạn bè / Việc tốt phong trào (+5đ)</option>
            </select>
          </div>

          {/* Số điểm cộng */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Số điểm thưởng (+Pt)
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={point}
              onChange={(e) => setPoint(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-xl outline-none"
              required
            />
          </div>

          {/* Chi tiết */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Mô tả chi tiết / Lời nhắn
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Nhập lý do hoặc chi tiết về hành động tốt..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <Star size={16} className="fill-white" />
              {submitting ? 'Đang lưu...' : `Lưu điểm tốt (${selectedStudentIds.length} học sinh)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
