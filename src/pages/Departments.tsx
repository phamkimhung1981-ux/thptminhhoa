import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import { Users, CheckCircle, Clock, Award, Edit2, Trash2, Plus, X, FileSpreadsheet } from 'lucide-react';
import { Department } from '../types';
import BackButton from '../components/ui/BackButton';

export default function Departments() {
  const { departments, teachers, tasks, disciplineRecords, updateDepartment, deleteDepartment, addDepartment } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Partial<Department>>({});

  const handleEdit = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setEditingDept(dept);
    setFormData(dept);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setDeletingDept(dept);
  };

  const confirmDelete = () => {
    if (deletingDept) {
      deleteDepartment(deletingDept.id);
      setDeletingDept(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      updateDepartment(editingDept.id, { name: formData.name, headId: formData.headId });
    } else {
      const newDept: Department = {
        id: `d${Date.now()}`,
        name: formData.name || 'Tổ mới',
        headId: formData.headId || ''
      };
      addDepartment(newDept);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 pb-12 font-sans">
      <div className="flex items-center">
        <BackButton />
      </div>
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Tổ chuyên môn</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Thông tin và kết quả thi đua các tổ chuyên môn</p>
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
          <button 
            onClick={() => {
              setEditingDept(null);
              setFormData({ name: '', headId: '' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm tổ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => {
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

          // Find task path for department based on keyword matching
          let taskPath = '';
          const lowerName = dept.name.toLowerCase();
          if (lowerName.includes('văn phòng') || lowerName.includes('van phong') || lowerName.includes('hành chính') || lowerName.includes('hanh chinh')) {
            taskPath = '/tasks/van-phong';
          } else if (lowerName.includes('toán') || lowerName.includes('toan') || lowerName.includes('lý') || lowerName.includes('ly') || lowerName.includes('tin') || lowerName.includes('cn')) {
            taskPath = '/tasks/toan-ly-tin-cn';
          } else if (lowerName.includes('hóa') || lowerName.includes('hoa') || lowerName.includes('sinh') || lowerName.includes('qpan') || lowerName.includes('gdqpan') || lowerName.includes('nn')) {
            taskPath = '/tasks/hoa-ly-sinh-gdqpan-nn';
          } else if (lowerName.includes('văn') || lowerName.includes('van') || lowerName.includes('sử') || lowerName.includes('su') || lowerName.includes('địa') || lowerName.includes('dia') || lowerName.includes('gdkt')) {
            taskPath = '/tasks/van-su-dia-gdkt-pl-an';
          }

          return (
            <Card key={dept.id} className="overflow-hidden group relative">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{dept.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-slate-500">Tổ trưởng:</span>
                    <span className="text-sm font-medium text-slate-900">{head?.name || 'Chưa cập nhật'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl">
                  <Users size={24} />
                </div>
              </div>

              <div className="absolute top-4 right-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleEdit(e, dept)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors bg-white shadow-sm border border-slate-100"
                  title="Chỉnh sửa tổ"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteClick(e, dept)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors bg-white shadow-sm border border-slate-100"
                  title="Xóa tổ"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs text-slate-500 mb-1">Số lượng GV</p>
                    <p className="text-2xl font-bold text-slate-900">{deptTeachers.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs text-slate-500 mb-1">Công việc</p>
                    <p className="text-2xl font-bold text-slate-900">{deptTasks.length}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span>Tỷ lệ hoàn thành công việc</span>
                      </div>
                      <span className="font-medium text-sm">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Award size={16} className="text-blue-500" />
                        <span>Chất lượng nền nếp</span>
                      </div>
                      <span className="font-medium text-sm">{disciplineRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${disciplineRate}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      to={`/department-schedule?dept=${dept.id}`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                    >
                      <FileSpreadsheet size={14} className="text-blue-600" />
                      Lịch giao việc tổ CM &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDept ? 'Chỉnh sửa Tổ chuyên môn' : 'Thêm Tổ chuyên môn mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form id="dept-form" onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tên tổ chuyên môn</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    placeholder="VD: Tổ Toán - Tin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tổ trưởng chuyên môn</label>
                  <select 
                    value={formData.headId || ''} 
                    onChange={e => setFormData({...formData, headId: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Chưa cập nhật --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button type="submit" form="dept-form" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingDept && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa tổ</h3>
              <p className="text-sm text-slate-600">
                Bạn có chắc chắn muốn xóa tổ <span className="font-semibold text-slate-900">{deletingDept.name}</span>? 
                (Lưu ý: Các giáo viên thuộc tổ này sẽ cần được cập nhật lại thông tin)
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button onClick={() => setDeletingDept(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors">
                Xóa tổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
