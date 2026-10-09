import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { Card } from '../components/ui/Card';
import { 
  Users, CheckCircle, Award, Edit2, Trash2, Plus, X, 
  FileSpreadsheet, AlertCircle, ShieldAlert, UserCheck, 
  ChevronRight, Phone, Mail, BookOpen
} from 'lucide-react';
import { Department, Teacher } from '../types';
import BackButton from '../components/ui/BackButton';
import { 
  OFFICIAL_5_DEPARTMENTS, 
  OFFICIAL_DEPARTMENT_NAMES,
  isOfficialDepartmentId
} from '../constants/departmentConfig';

export default function Departments() {
  const { departments, teachers, tasks, disciplineRecords, updateDepartment, deleteDepartment, addDepartment, updateTeacher } = useAppContext();
  const { isAdmin } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [viewingMembersDept, setViewingMembersDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Partial<Department>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sắp xếp các tổ theo đúng thứ tự 05 tổ chính thức
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      const idxA = OFFICIAL_5_DEPARTMENTS.findIndex(d => d.id === a.id || d.name === a.name);
      const idxB = OFFICIAL_5_DEPARTMENTS.findIndex(d => d.id === b.id || d.name === b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [departments]);

  // Tìm danh sách giáo viên chưa xác định được tổ hoặc có tổ không hợp lệ
  const unassignedTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (t.role === 'BGH' || t.departmentId === 'd_bgh' || t.departmentName === 'Ban Giám hiệu') {
        return false;
      }
      return !t.departmentId || !departments.some(d => d.id === t.departmentId);
    });
  }, [teachers, departments]);

  const handleOpenAddModal = () => {
    if (!isAdmin) {
      showToast('Chỉ Quản trị viên hoặc Ban Giám hiệu mới có quyền thêm tổ chuyên môn.');
      return;
    }
    setEditingDept(null);
    setFormData({ name: '', headId: '', description: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('Chỉ Quản trị viên hoặc Ban Giám hiệu mới có quyền chỉnh sửa tổ chuyên môn.');
      return;
    }
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      headId: dept.headId || '',
      description: dept.description || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('Chỉ Quản trị viên hoặc Ban Giám hiệu mới có quyền xóa tổ chuyên môn.');
      return;
    }
    setDeletingDept(dept);
  };

  const confirmDelete = async () => {
    if (deletingDept) {
      try {
        await deleteDepartment(deletingDept.id);
        showToast(`Đã xóa tổ "${deletingDept.name}" thành công!`);
      } catch (err: any) {
        console.error('Lỗi khi xóa tổ:', err);
      } finally {
        setDeletingDept(null);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFormError('Bạn không có quyền thực hiện thao tác này.');
      return;
    }

    const deptName = formData.name?.trim();
    if (!deptName) {
      setFormError('Vui lòng nhập tên tổ chuyên môn.');
      return;
    }

    // Check duplicate name
    const isDuplicate = departments.some(
      d => d.name.trim().toLowerCase() === deptName.toLowerCase() && d.id !== editingDept?.id
    );
    if (isDuplicate) {
      setFormError(`Tổ "${deptName}" đã tồn tại trên hệ thống.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: deptName,
          headId: formData.headId || '',
          description: formData.description?.trim() || ''
        });
        showToast(`Đã cập nhật tổ "${deptName}" thành công!`);
      } else {
        const newDeptId = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDept: Department = {
          id: newDeptId,
          name: deptName,
          headId: formData.headId || '',
          description: formData.description?.trim() || `Tổ chuyên môn ${deptName}`
        };
        await addDepartment(newDept);
        showToast(`Đã thêm tổ "${deptName}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingDept(null);
      setFormData({});
    } catch (err: any) {
      console.error('Lỗi khi lưu tổ:', err);
      setFormError(err.message || 'Có lỗi xảy ra khi lưu tổ chuyên môn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nhanh chóng phân công tổ cho giáo viên chưa có tổ
  const handleAssignTeacherDept = async (teacherId: string, targetDeptId: string) => {
    const targetDept = departments.find(d => d.id === targetDeptId);
    if (!targetDept) return;
    try {
      await updateTeacher(teacherId, {
        departmentId: targetDept.id,
        departmentName: targetDept.name
      });
      showToast(`Đã phân công giáo viên vào "${targetDept.name}"!`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 pb-12 font-sans">
      <div className="flex items-center">
        <BackButton />
      </div>

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">
              Cơ cấu Tổ Chuyên Môn Trường THPT Minh Hòa
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Hệ thống quản lý 05 tổ chính thức và theo dõi thi đua chuyên môn
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/department-schedule"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-xs text-[13px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600" />
            Lịch giao việc tổ CM
          </Link>
          {isAdmin && (
            <button 
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm tổ
            </button>
          )}
        </div>
      </div>

      {/* CẢNH BÁO GIÁO VIÊN CHƯA ĐƯỢC PHÂN TỔ (NẾU CÓ) */}
      {unassignedTeachers.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                Phát hiện {unassignedTeachers.length} cán bộ, giáo viên chưa xác định tổ chuyên môn
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Theo quy định, những nhân sự này cần được quản trị viên rà soát và phân công vào đúng 05 tổ công tác chính thức.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {unassignedTeachers.map(teacher => (
                  <div key={teacher.id} className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{teacher.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{teacher.subject || teacher.position || 'Chưa rõ môn'}</p>
                    </div>
                    {isAdmin ? (
                      <select
                        onChange={(e) => handleAssignTeacherDept(teacher.id, e.target.value)}
                        defaultValue=""
                        className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="" disabled>-- Phân tổ --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Chờ phân tổ</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH 05 TỔ CHUYÊN MÔN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedDepartments.map((dept, index) => {
          const deptTeachers = teachers.filter(t => t.departmentId === dept.id);
          const head = teachers.find(t => t.id === dept.headId);
          
          // Calculate stats for this department
          const deptTeacherIds = deptTeachers.map(t => t.id);
          const deptTasks = tasks.filter(t => t.assigneeIds.some(id => deptTeacherIds.includes(id)));
          const completedTasks = deptTasks.filter(t => t.status === 'Đã hoàn thành').length;
          const completionRate = deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0;
          
          const deptDiscipline = disciplineRecords.filter(d => d.departmentId === dept.id);
          const goodDiscipline = deptDiscipline.filter(d => d.level === 'Tốt' || d.level === 'Đạt').length;
          const disciplineRate = deptDiscipline.length > 0 ? Math.round((goodDiscipline / deptDiscipline.length) * 100) : 100;

          return (
            <Card key={dept.id} className="overflow-hidden group relative border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Tổ số {index + 1}
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900">{dept.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold text-slate-500">Tổ trưởng:</span>
                    <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {head?.name || 'Chưa cập nhật'}
                    </span>
                  </div>
                  {dept.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{dept.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl shrink-0">
                  <Users size={24} />
                </div>
              </div>

              {isAdmin && (
                <div className="absolute top-4 right-16 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => handleEdit(e, dept)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors bg-white shadow-sm border border-slate-100 cursor-pointer"
                    title="Chỉnh sửa tổ"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, dept)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors bg-white shadow-sm border border-slate-100 cursor-pointer"
                    title="Xóa tổ"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <button 
                    type="button"
                    onClick={() => setViewingMembersDept(dept)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer text-left group/btn"
                  >
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Số lượng GV</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{deptTeachers.length}</span>
                      <span className="text-[11px] font-semibold text-blue-600 group-hover/btn:underline">Xem DS &rarr;</span>
                    </div>
                  </button>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-left">
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Công việc giao</p>
                    <p className="text-2xl font-black text-slate-900">{deptTasks.length}</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <CheckCircle size={15} className="text-emerald-500" />
                        <span>Tiến độ hoàn thành nhiệm vụ</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Award size={15} className="text-blue-500" />
                        <span>Đánh giá nề nếp tổ</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">{disciplineRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${disciplineRate}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setViewingMembersDept(dept)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users size={14} className="text-slate-500" />
                      Danh sách CBGVNV ({deptTeachers.length})
                    </button>
                    <Link
                      to={`/department-schedule?dept=${dept.id}`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                    >
                      <FileSpreadsheet size={14} className="text-blue-600" />
                      Lịch giao việc tổ &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL XEM DANH SÁCH GIÁO VIÊN CỦA TỔ */}
      {viewingMembersDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{viewingMembersDept.name}</h3>
                  <p className="text-xs text-slate-500">
                    Danh sách {teachers.filter(t => t.departmentId === viewingMembersDept.id).length} cán bộ, giáo viên, nhân viên
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingMembersDept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5">
              {teachers.filter(t => t.departmentId === viewingMembersDept.id).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Chưa có cán bộ, giáo viên nào được phân công vào tổ này.
                </div>
              ) : (
                teachers
                  .filter(t => t.departmentId === viewingMembersDept.id)
                  .map((teacher, idx) => {
                    const isHead = teacher.id === viewingMembersDept.headId || teacher.position?.toLowerCase().includes('tổ trưởng');
                    const isDeputy = teacher.position?.toLowerCase().includes('tổ phó');
                    return (
                      <div 
                        key={teacher.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isHead ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 text-center text-xs font-bold text-slate-400 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate">{teacher.name}</span>
                              {isHead && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                  Tổ trưởng
                                </span>
                              )}
                              {isDeputy && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                  Tổ phó
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span>Mã: <strong className="text-slate-700">{teacher.code || '---'}</strong></span>
                              <span>• Môn: <strong className="text-slate-700">{teacher.subject || teacher.position || '---'}</strong></span>
                              {teacher.phone && (
                                <span className="hidden sm:inline">• SĐT: {teacher.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            {teacher.status || 'Đang công tác'}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingMembersDept(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / CHỈNH SỬA TỔ CHUYÊN MÔN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingDept ? 'Chỉnh sửa Tổ chuyên môn' : 'Thêm Tổ chuyên môn mới'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col">
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tên tổ chuyên môn <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => {
                      setFormData({...formData, name: e.target.value});
                      if (formError) setFormError(null);
                    }} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white" 
                    placeholder="VD: Tổ Toán - Công Nghệ"
                    autoFocus
                  />
                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-1 mt-1">
                    <span className="font-semibold text-slate-700">Gợi ý 05 tổ chuẩn:</span>
                    {OFFICIAL_DEPARTMENT_NAMES.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, name }))}
                        className="text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tổ trưởng chuyên môn
                  </label>
                  <select 
                    value={formData.headId || ''} 
                    onChange={e => setFormData({...formData, headId: e.target.value})} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all cursor-pointer"
                  >
                    <option value="">-- Chưa chỉ định tổ trưởng --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code || 'GV'} - {t.departmentName || t.subject || 'CBGVNV'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Mô tả / Ghi chú (tùy chọn)
                  </label>
                  <input 
                    type="text" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white" 
                    placeholder="VD: Bao gồm các môn Toán và Công nghệ..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? 'Đang lưu...' : (editingDept ? 'Cập nhật' : 'Thêm tổ chuyên môn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TỔ */}
      {deletingDept && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa tổ</h3>
              <p className="text-sm text-slate-600">
                Bạn có chắc chắn muốn xóa tổ <span className="font-bold text-slate-900">{deletingDept.name}</span>? 
                (Lưu ý: Các giáo viên thuộc tổ này sẽ cần được rà soát và phân công lại)
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button 
                type="button" 
                onClick={() => setDeletingDept(null)} 
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button 
                type="button" 
                onClick={confirmDelete} 
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Xóa tổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
