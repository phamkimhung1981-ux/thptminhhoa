import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  School, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Check, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Search, 
  ChevronDown,
  Users,
  Eye,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { ClassInfo } from '../../types/homeroom';
import { Teacher } from '../../types';
import BackButton from '../ui/BackButton';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassInfo[];
  selectedSchoolYear: string;
  teachers: Teacher[];
  isBgh: boolean;
  onAddClass: (classInfo: Omit<ClassInfo, 'id'>) => Promise<any>;
  onAddClassesBulk?: (classesList: Omit<ClassInfo, 'id'>[]) => Promise<any>;
  onUpdateClass: (id: string, updates: Partial<ClassInfo>) => Promise<any>;
  onDeleteClass: (id: string) => Promise<any>;
}

export default function ClassManagerModal({
  isOpen,
  onClose,
  classes,
  selectedSchoolYear,
  teachers,
  isBgh,
  onAddClass,
  onAddClassesBulk,
  onUpdateClass,
  onDeleteClass
}: ClassManagerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state for the class table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

  // Add Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(10);
  const [schoolYear, setSchoolYear] = useState(selectedSchoolYear || '2026–2027');
  const [room, setRoom] = useState('');
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  
  // Custom teacher selection dropdown for ADD form
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  const [homeroomTeacherName, setHomeroomTeacherName] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');

  // Edit Form state
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState<number>(10);
  const [editSchoolYear, setEditSchoolYear] = useState('2026–2027');
  const [editRoom, setEditRoom] = useState('');
  const [editTotalStudents, setEditTotalStudents] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  
  // Custom teacher selection dropdown for EDIT form
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [isEditTeacherDropdownOpen, setIsEditTeacherDropdownOpen] = useState(false);
  const [searchEditTeacherQuery, setSearchEditTeacherQuery] = useState('');

  // Delete State
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);

  if (!isOpen) return null;

  // Real-time calculated stats from current classes
  const totalClassesCount = classes.length;
  const activeClassesCount = classes.filter(c => c.status !== 'inactive').length;
  const grade10Count = classes.filter(c => c.grade === 10 && c.status !== 'inactive').length;
  const grade11Count = classes.filter(c => c.grade === 11 && c.status !== 'inactive').length;
  const grade12Count = classes.filter(c => c.grade === 12 && c.status !== 'inactive').length;

  // Filtered classes for display
  const displayedClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.homeroomTeacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.room || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGrade = selectedGradeFilter === 'all' || String(c.grade) === selectedGradeFilter;

    return matchesSearch && matchesGrade;
  });

  // Handle naming auto-detection for Add Form
  const handleNameChange = (val: string) => {
    setName(val);
    const match = val.trim().match(/^(1[012])/);
    if (match) {
      setGrade(Number(match[1]));
    }
  };

  // Handle naming auto-detection for Edit Form
  const handleEditNameChange = (val: string) => {
    setEditName(val);
    const match = val.trim().match(/^(1[012])/);
    if (match) {
      setEditGrade(Number(match[1]));
    }
  };

  // Handle Add Class Submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim().toUpperCase();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên lớp học! (Ví dụ: 10A1, 11A2)');
      return;
    }

    // Check duplicate in the same school year
    const exists = classes.some(
      c => c.name.toUpperCase() === trimmedName && c.schoolYear === schoolYear
    );
    if (exists) {
      setErrorMsg(`Lớp ${trimmedName} đã tồn tại trong năm học ${schoolYear}!`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddClass({
        name: trimmedName,
        grade: Number(grade),
        schoolYear,
        homeroomTeacherId: homeroomTeacherId || undefined,
        homeroomTeacherName: homeroomTeacherName.trim() || undefined,
        room: room.trim() || undefined,
        totalStudents: Number(totalStudents) || 0,
        status: status
      });

      setSuccessMsg(`Đã thêm thành công lớp học ${trimmedName}!`);
      
      // Reset State
      setName('');
      setHomeroomTeacherId('');
      setHomeroomTeacherName('');
      setRoom('');
      setTotalStudents(0);
      setStatus('active');
      setIsAddModalOpen(false);

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Error adding class:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo lớp học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Preset creation
  const handleAddPreset = async (gradeNum: number) => {
    if (!isBgh) return;
    setErrorMsg('');
    setSuccessMsg('');
    const presetNames = [
      `${gradeNum}A1`, `${gradeNum}A2`, `${gradeNum}A3`,
      `${gradeNum}A4`, `${gradeNum}A5`
    ];

    const newPreset = presetNames.filter(
      pName => !classes.some(c => c.name.toUpperCase() === pName && c.schoolYear === schoolYear)
    );

    if (newPreset.length === 0) {
      setErrorMsg(`Các lớp mẫu Khối ${gradeNum} (${presetNames.join(', ')}) đều đã tồn tại.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const classesToCreate = newPreset.map(pName => ({
        name: pName,
        grade: gradeNum,
        schoolYear,
        totalStudents: 0,
        status: 'active' as const
      }));

      if (onAddClassesBulk) {
        await onAddClassesBulk(classesToCreate);
      } else {
        for (const c of classesToCreate) {
          await onAddClass(c);
        }
      }

      setSuccessMsg(`Đã tự động tạo ${newPreset.length} lớp mẫu cho Khối ${gradeNum}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Lỗi khi tạo lớp học mẫu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Edit Mode
  const startEdit = (c: ClassInfo) => {
    setEditingClass(c);
    setEditName(c.name);
    setEditGrade(c.grade);
    setEditSchoolYear(c.schoolYear);
    setEditRoom(c.room || '');
    setEditTotalStudents(c.totalStudents || 0);
    setEditStatus(c.status || 'active');
    setEditTeacherId(c.homeroomTeacherId || '');
    setEditTeacherName(c.homeroomTeacherName || '');
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setErrorMsg('');
    setSuccessMsg('');
    const trimmedName = editName.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên lớp học!');
      return;
    }

    // Check duplicate (exclude current class)
    const exists = classes.some(
      c => c.id !== editingClass.id && c.name.toUpperCase() === trimmedName && c.schoolYear === editSchoolYear
    );
    if (exists) {
      setErrorMsg(`Lớp ${trimmedName} đã tồn tại trong năm học ${editSchoolYear}!`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Auto grade detect
      let finalGrade = Number(editGrade);
      const match = trimmedName.match(/^(1[012])/);
      if (match) {
        finalGrade = Number(match[1]);
      }

      await onUpdateClass(editingClass.id, {
        name: trimmedName,
        grade: finalGrade,
        schoolYear: editSchoolYear,
        homeroomTeacherId: editTeacherId || '',
        homeroomTeacherName: editTeacherName.trim() || '',
        room: editRoom.trim() || '',
        totalStudents: Number(editTotalStudents) || 0,
        status: editStatus
      });

      setSuccessMsg(`Cập nhật thành công thông tin lớp ${trimmedName}!`);
      setEditingClass(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Có lỗi xảy ra: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Delete Handler
  const confirmSoftDelete = async () => {
    if (!classToDelete) return;
    try {
      setIsSubmitting(true);
      await onUpdateClass(classToDelete.id, { status: 'inactive' });
      setSuccessMsg(`Đã tạm ngưng hoạt động thành công lớp ${classToDelete.name}!`);
      setClassToDelete(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Lỗi khi cập nhật trạng thái lớp: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent Delete Handler
  const confirmPermanentDelete = async () => {
    if (!classToDelete) return;
    try {
      setIsSubmitting(true);
      await onDeleteClass(classToDelete.id);
      setSuccessMsg(`Đã xóa vĩnh viễn thành công lớp ${classToDelete.name}!`);
      setClassToDelete(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Lỗi khi xóa lớp: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Teachers Filter list inside selectable inputs
  const filteredTeachersForAdd = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTeacherQuery.toLowerCase())
  );

  const filteredTeachersForEdit = teachers.filter(t => 
    t.name.toLowerCase().includes(searchEditTeacherQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchEditTeacherQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAFBFD] rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 relative flex flex-col max-h-[90vh]">
        
        {/* ================================================= */}
        {/* CUSTOM CONFIRMATION OVERLAY (SOFT & PERM DELETE)  */}
        {/* ================================================= */}
        {classToDelete && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-sm">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Xác nhận xóa lớp {classToDelete.name}?</h3>
                  {classToDelete.totalStudents > 0 ? (
                    <div className="mt-2 text-left bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-amber-900">⚠️ Phát hiện dữ liệu học sinh:</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Lớp học này đang có <strong className="text-amber-900">{classToDelete.totalStudents} học sinh</strong>. Việc xóa vĩnh viễn có thể làm mất lịch sử đánh giá rèn luyện. Nhà trường khuyến khích chuyển trạng thái sang <strong>Ngừng hoạt động</strong>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">
                      Lớp học này hiện không có học sinh. Bạn có chắc chắn muốn gỡ bỏ hoàn toàn lớp <strong className="text-rose-600">{classToDelete.name}</strong> khỏi hệ thống?
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {classToDelete.totalStudents > 0 && (
                  <button
                    type="button"
                    onClick={confirmSoftDelete}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Settings size={14} /> Chuyển sang Ngừng hoạt động (Khuyên dùng)
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClassToDelete(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={confirmPermanentDelete}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xóa vĩnh viễn'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* ADD CLASS MODAL OVERLAY (“THÊM LỚP HỌC”)          */}
        {/* ================================================= */}
        {isAddModalOpen && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-visible relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-700">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <School size={20} className="text-blue-600" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">THÊM LỚP HỌC MỚI</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs">
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl flex items-center gap-2 font-semibold animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên lớp */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      Tên lớp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="VD: 10A1, 11A2, 12A3"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-800 uppercase"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Tự động nhận dạng khối từ ký tự đầu.</span>
                  </div>

                  {/* Chọn khối */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Chọn khối</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white cursor-pointer"
                    >
                      <option value={10}>Khối 10</option>
                      <option value={11}>Khối 11</option>
                      <option value={12}>Khối 12</option>
                    </select>
                  </div>

                  {/* Sĩ số */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Sĩ số dự kiến</label>
                    <input
                      type="number"
                      min={0}
                      value={totalStudents}
                      onChange={(e) => setTotalStudents(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                    />
                  </div>

                  {/* Năm học */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Năm học *</label>
                    <select
                      value={schoolYear}
                      onChange={(e) => setSchoolYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value="2026–2027">2026–2027</option>
                      <option value="2025–2026">2025–2026</option>
                    </select>
                  </div>

                  {/* Searchable GVCN */}
                  <div className="sm:col-span-2 relative">
                    <label className="block font-black text-slate-700 mb-1">Chọn Giáo viên chủ nhiệm (tùy chọn)</label>
                    <button
                      type="button"
                      onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-left font-semibold text-slate-800 flex items-center justify-between hover:border-slate-400 transition-all outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck size={14} className="text-slate-400" />
                        {homeroomTeacherName ? `${homeroomTeacherName} (${homeroomTeacherId})` : '-- Chọn giáo viên --'}
                      </span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </button>

                    {isTeacherDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[80] p-2 space-y-2 max-h-[220px] overflow-y-auto">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 sticky top-0 z-10">
                          <Search size={12} className="text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm nhanh giáo viên..."
                            value={searchTeacherQuery}
                            onChange={(e) => setSearchTeacherQuery(e.target.value)}
                            className="bg-transparent text-xs outline-none w-full font-medium"
                          />
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setHomeroomTeacherId('');
                              setHomeroomTeacherName('');
                              setIsTeacherDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold text-rose-600 text-[11px] rounded"
                          >
                            Không phân công
                          </button>
                          {filteredTeachersForAdd.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-[10px]">Không tìm thấy giáo viên</div>
                          ) : (
                            filteredTeachersForAdd.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setHomeroomTeacherId(t.id);
                                  setHomeroomTeacherName(t.name);
                                  setIsTeacherDropdownOpen(false);
                                  setSearchTeacherQuery('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 font-semibold text-slate-700 text-[11px] rounded flex justify-between items-center"
                              >
                                <span>{t.name} ({t.code})</span>
                                <span className="text-[10px] text-slate-400 italic">{t.subject || 'Giáo viên'}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phòng học */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Phòng học (Tùy chọn)</label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="VD: Phòng 101"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Trạng thái hoạt động</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} /> {isSubmitting ? 'Đang lưu...' : 'LƯU LỚP HỌC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* EDIT CLASS MODAL OVERLAY (“CẬP NHẬT LỚP HỌC”)       */}
        {/* ================================================= */}
        {editingClass && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-visible relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-[#123B78]">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <Edit3 size={18} className="text-blue-700" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">CẬP NHẬT THÔNG TIN LỚP HỌC</h3>
                </div>
                <button
                  onClick={() => setEditingClass(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 pt-4 text-xs">
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl flex items-center gap-2 font-semibold animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên lớp */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      Tên lớp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => handleEditNameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-800 uppercase"
                    />
                  </div>

                  {/* Chọn khối */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Chọn khối</label>
                    <select
                      value={editGrade}
                      onChange={(e) => setEditGrade(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value={10}>Khối 10</option>
                      <option value={11}>Khối 11</option>
                      <option value={12}>Khối 12</option>
                    </select>
                  </div>

                  {/* Sĩ số */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Sĩ số hiện tại</label>
                    <input
                      type="number"
                      min={0}
                      value={editTotalStudents}
                      onChange={(e) => setEditTotalStudents(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                    />
                  </div>

                  {/* Năm học */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Năm học *</label>
                    <select
                      value={editSchoolYear}
                      onChange={(e) => setEditSchoolYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value="2026–2027">2026–2027</option>
                      <option value="2025–2026">2025–2026</option>
                    </select>
                  </div>

                  {/* Searchable GVCN */}
                  <div className="sm:col-span-2 relative">
                    <label className="block font-black text-slate-700 mb-1">Chọn Giáo viên chủ nhiệm</label>
                    <button
                      type="button"
                      onClick={() => setIsEditTeacherDropdownOpen(!isEditTeacherDropdownOpen)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-left font-semibold text-slate-800 flex items-center justify-between hover:border-slate-400 transition-all outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck size={14} className="text-slate-400" />
                        {editTeacherName ? `${editTeacherName} (${editTeacherId})` : '-- Chưa phân công --'}
                      </span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </button>

                    {isEditTeacherDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[80] p-2 space-y-2 max-h-[220px] overflow-y-auto">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 sticky top-0 z-10">
                          <Search size={12} className="text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm nhanh giáo viên..."
                            value={searchEditTeacherQuery}
                            onChange={(e) => setSearchEditTeacherQuery(e.target.value)}
                            className="bg-transparent text-xs outline-none w-full font-medium"
                          />
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTeacherId('');
                              setEditTeacherName('');
                              setIsEditTeacherDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold text-rose-600 text-[11px] rounded"
                          >
                            Gỡ phân công
                          </button>
                          {filteredTeachersForEdit.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-[10px]">Không tìm thấy giáo viên</div>
                          ) : (
                            filteredTeachersForEdit.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setEditTeacherId(t.id);
                                  setEditTeacherName(t.name);
                                  setIsEditTeacherDropdownOpen(false);
                                  setSearchEditTeacherQuery('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 font-semibold text-slate-700 text-[11px] rounded flex justify-between items-center"
                              >
                                <span>{t.name} ({t.code})</span>
                                <span className="text-[10px] text-slate-400 italic">{t.subject || 'Giáo viên'}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phòng học */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Phòng học</label>
                    <input
                      type="text"
                      value={editRoom}
                      onChange={(e) => setEditRoom(e.target.value)}
                      placeholder="VD: Phòng 101"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="block font-black text-slate-700 mb-1">Trạng thái lớp</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingClass(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} /> {isSubmitting ? 'Đang cập nhật...' : 'LƯU THAY ĐỔI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* MAIN PANEL CONTENT (QUẢN LÝ LỚP WORKSPACE)       */}
        {/* ================================================= */}

        {/* 1. Modal Header (Navy Blue) */}
        <div className="bg-gradient-to-r from-[#123B78] to-[#1457D9] px-6 py-4.5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
              <School size={22} className="text-blue-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">CÔNG TÁC CHỦ NHIỆM • QUẢN LÝ LỚP</h2>
              <p className="text-[11px] text-blue-100">Đại diện ban giám hiệu thiết lập các đơn vị lớp học và quản lý nhân sự GVCN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex items-center">
            <BackButton onClick={onClose} />
          </div>

          {/* 2. Success / Error Feedback Alert Banners */}
          <div>
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* 3. Statistics Cards Above Table (Clean Light Modern Minimalist design) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Tổng số lớp</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-800">{totalClassesCount}</span>
                <span className="text-[10px] font-bold text-emerald-600">({activeClassesCount} hoạt động)</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Khối 10</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#1457D9]">{grade10Count}</span>
                <span className="text-[10px] text-slate-400">lớp đang mở</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Khối 11</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#1457D9]">{grade11Count}</span>
                <span className="text-[10px] text-slate-400">lớp đang mở</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Khối 12</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#1457D9]">{grade12Count}</span>
                <span className="text-[10px] text-slate-400">lớp đang mở</span>
              </div>
            </div>
          </div>

          {/* 4. Action Presets for Quick Setup (Rendered only for BGH) */}
          {isBgh && onAddClassesBulk && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-black text-blue-900 text-xs">
                  <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                  <span>CÔNG CỤ TẠO NHANH LỚP HỌC MẪU (Lớp A1 → A5)</span>
                </div>
                <p className="text-[10px] text-slate-600 max-w-xl">
                  Khởi tạo nhanh danh mục 5 lớp chuẩn trong hệ thống để phục vụ công tác rèn luyện mà không cần nhập từng lớp thủ công.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddPreset(10)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-1 text-[10px] shadow"
                >
                  <Layers size={12} /> Khối 10
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddPreset(11)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-1 text-[10px] shadow"
                >
                  <Layers size={12} /> Khối 11
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddPreset(12)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all flex items-center gap-1 text-[10px] shadow"
                >
                  <Layers size={12} /> Khối 12
                </button>
              </div>
            </div>
          )}

          {/* 5. Workspace Content: Header and Search controls */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">QUẢN LÝ LỚP</h3>
                <p className="text-[10px] text-slate-500 font-medium">Danh sách các lớp học trong năm học {selectedSchoolYear}</p>
              </div>

              {isBgh && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} /> THÊM LỚP HỌC
                </button>
              )}
            </div>

            {/* Filters Bar */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo lớp, giáo viên, phòng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 whitespace-nowrap">Lọc Khối:</span>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
              </div>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-100 sticky top-0 z-10 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Lớp học</th>
                    <th className="p-4 text-center">Khối</th>
                    <th className="p-4">GVCN Phụ Trách</th>
                    <th className="p-4 text-center">Sĩ số học sinh</th>
                    <th className="p-4">Phòng</th>
                    <th className="p-4 text-center">Trạng thái</th>
                    {isBgh && <th className="p-4 text-right pr-6">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedClasses.length === 0 ? (
                    <tr>
                      <td colSpan={isBgh ? 7 : 6} className="p-10 text-center text-slate-400 italic">
                        Không tìm thấy thông tin lớp học nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayedClasses.map((c) => {
                      const isActive = c.status !== 'inactive';
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 pl-6 font-black text-blue-900 text-sm">{c.name}</td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px]">
                              Khối {c.grade}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800">
                            {c.homeroomTeacherName ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                {c.homeroomTeacherName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-medium">Chưa phân công</span>
                            )}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 text-sm">{c.totalStudents || 0}</td>
                          <td className="p-4 font-semibold text-slate-600">{c.room || <span className="text-slate-400 italic font-normal">--</span>}</td>
                          <td className="p-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                Ngừng hoạt động
                              </span>
                            )}
                          </td>
                          {isBgh && (
                            <td className="p-4 text-right pr-6 space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 hover:text-blue-700 text-slate-600 rounded-xl transition-all"
                                title="Cập nhật lớp"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setClassToDelete(c)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                                title="Xóa lớp"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer (Slate grey background with close button) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );
}
