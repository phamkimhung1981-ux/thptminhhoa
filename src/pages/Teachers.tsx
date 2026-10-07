import React, { useRef, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Badge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { Search, Mail, Filter, Upload, Download, Trash2, UserPlus, Edit2, X, Users, Eye } from 'lucide-react';
import { Teacher } from '../types';
import * as XLSX from 'xlsx';
import BackButton from '../components/ui/BackButton';

export default function Teachers() {
  const { teachers, departments, deleteTeacher, deleteAllTeachers, updateTeacher, addTeacher, importTeachers } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<string>('All');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Teacher>>({});

  const filteredTeachers = teachers.filter(t => {
    const nameStr = t.name || '';
    const codeStr = t.code || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          codeStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'All' || t.departmentId === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleExportExcel = () => {
    const data = filteredTeachers.map((t, idx) => ({
      'STT': idx + 1,
      'Mã GV': t.code,
      'Họ và tên': t.name,
      'Chức vụ': t.role,
      'Tổ chuyên môn': departments.find(d => d.id === t.departmentId)?.name || '',
      'Trạng thái': t.status,
      'Email': t.email || '',
      'Số điện thoại': t.phone || '',
      'Môn giảng dạy': t.subject || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachGV");
    XLSX.writeFile(wb, "DanhSachGV.xlsx");
  };

  const getExcelValue = (row: any, possibleKeys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const pKey of possibleKeys) {
      const foundKey = rowKeys.find(k => k.trim().toLowerCase() === pKey.toLowerCase());
      if (foundKey) return row[foundKey];
    }
    return undefined;
  };

  const formatRole = (role: string) => {
    if (!role) return 'Giáo viên';
    const r = role.toUpperCase().trim();
    if (r === 'BGH' || r === 'HIỆU TRƯỞNG' || r === 'HIÊU TRƯỞNG') return 'Hiệu trưởng';
    if (r === 'PHÓ HIỆU TRƯỞNG' || r === 'PHO HIEU TRUONG') return 'Phó Hiệu trưởng';
    if (r === 'TTCM' || r === 'TỔ TRƯỞNG' || r === 'TO TRUONG') return 'Tổ trưởng';
    if (r === 'TỔ PHÓ' || r === 'TO PHO') return 'Tổ phó';
    if (r === 'GIAO_VIEN' || r === 'GIÁO VIÊN' || r === 'GV') return 'Giáo viên';
    if (r === 'NHAN_VIEN' || r === 'NHÂN VIÊN' || r === 'NV') return 'Nhân viên';
    return role;
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const newTeachers = data.map((row: any) => {
        const rawDept = getExcelValue(row, ['Tổ chuyên môn', 'To chuyen mon', 'Tổ', 'To', 'Department', 'Tổ bộ môn']) || '';
        const normDept = String(rawDept).trim().toLowerCase();
        
        let deptId = departments[0]?.id || '';
        const foundDept = departments.find(d => {
          const dName = d.name.toLowerCase();
          return dName.includes(normDept) || normDept.includes(dName) ||
                 (normDept.includes('toán') && d.id === 'd_toan_ly_tin_cn') ||
                 (normDept.includes('lý') && d.id === 'd_toan_ly_tin_cn') ||
                 (normDept.includes('văn') && d.id === 'd_van_su_dia_gdkt_pt_an') ||
                 (normDept.includes('hóa') && d.id === 'd_hoa_sinh_qpan_tc_nn') ||
                 (normDept.includes('phòng') && d.id === 'd_van_phong');
        });
        if (foundDept) {
          deptId = foundDept.id;
        }

        const rawCode = getExcelValue(row, ['Mã GV', 'Ma GV', 'Mã giáo viên', 'Ma giao vien', 'Code', 'Mã viên chức', 'Mã CBGVNV']);
        const codeVal = (rawCode ? String(rawCode).trim() : '') || `GV${Math.floor(1000 + Math.random() * 9000)}`;

        const rawName = getExcelValue(row, ['Họ và tên', 'Họ tên', 'Ho va ten', 'Ho ten', 'Tên', 'Ten', 'Name']);
        const nameVal = rawName ? String(rawName).trim() : 'Chưa cập nhật';

        const rawRole = getExcelValue(row, ['Chức vụ', 'Chuc vu', 'Role', 'Position']) || 'Giáo viên';
        let roleEnum = 'GIAO_VIEN';
        const normRole = String(rawRole).trim().toLowerCase();
        if (normRole.includes('hiệu trưởng') || normRole.includes('hieu truong')) roleEnum = 'BGH';
        else if (normRole.includes('phó hiệu trưởng') || normRole.includes('pho hieu truong')) roleEnum = 'BGH';
        else if (normRole.includes('tổ trưởng') || normRole.includes('to truong')) roleEnum = 'TTCM';
        else if (normRole.includes('tổ phó') || normRole.includes('to pho')) roleEnum = 'GIAO_VIEN'; // System maps it as regular user, but we'll store position below
        else if (normRole.includes('nhân viên') || normRole.includes('nhan vien')) roleEnum = 'NHAN_VIEN';

        const rawStatus = getExcelValue(row, ['Trạng thái', 'Trang thai', 'Status']) || 'Đang công tác';
        const statusVal = String(rawStatus).trim();

        return {
          id: Math.random().toString(36).substr(2, 9),
          code: codeVal,
          name: nameVal,
          role: roleEnum as any,
          position: (normRole.includes('tổ phó') || normRole.includes('to pho')) ? 'Tổ phó' : undefined,
          departmentId: deptId,
          status: (statusVal === 'Nghỉ phép' || statusVal === 'Đã nghỉ việc' ? statusVal : 'Đang công tác') as any,
          email: getExcelValue(row, ['Email', 'Mail']) || '',
          phone: getExcelValue(row, ['Số điện thoại', 'So dien thoai', 'SĐT', 'SDT', 'Phone']) || '',
          subject: getExcelValue(row, ['Môn giảng dạy', 'Mon giang day', 'Môn', 'Mon', 'Subject']) || ''
        } as Teacher;
      });
      importTeachers(newTeachers);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
    } else {
      addTeacher(formData as Omit<Teacher, 'id'>);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (e: React.MouseEvent, teacher: Teacher) => {
    e.stopPropagation();
    setEditingTeacher(teacher);
    setFormData(teacher);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, teacher: Teacher) => {
    e.stopPropagation();
    setDeletingTeacher(teacher);
  };

  const confirmDelete = () => {
    if (deletingTeacher) {
      deleteTeacher(deletingTeacher.id);
      setDeletingTeacher(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllTeachers();
      setIsDeleteAllModalOpen(false);
    } catch (err) {
      console.error("Error deleting all teachers:", err);
    }
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
            <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Quản lý CBGVNV</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Quản lý hồ sơ, thông tin nhân sự toàn trường</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Xuất dữ liệu
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <Upload className="mr-2 h-4 w-4" />
            Nhập từ Excel
          </button>
          <button 
            onClick={() => {
              setEditingTeacher(null);
              setFormData({
                name: '', code: '', role: 'GIAO_VIEN', subject: '', phone: '', email: '', status: 'Đang công tác', departmentId: departments[0]?.id
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20 transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm mới
          </button>
          {teachers.length > 0 && (
            <button 
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-rose-200 rounded-xl shadow-sm text-[13px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa toàn bộ
            </button>
          )}
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-colors"
              placeholder="Tìm kiếm theo tên, mã GV..."
            />
          </div>
          <div className="flex items-center gap-3 sm:w-72">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="All">Tất cả tổ chuyên môn</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-blue-50 text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="px-5 py-4 font-extrabold w-[250px]">Họ và tên</th>
                <th className="px-5 py-4 font-extrabold">Mã GV</th>
                <th className="px-5 py-4 font-extrabold">Chức vụ</th>
                <th className="px-5 py-4 font-extrabold">Tổ chuyên môn</th>
                <th className="px-5 py-4 font-extrabold">Trạng thái</th>
                <th className="px-5 py-4 font-extrabold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => {
                const nameStr = String(teacher.name || '').trim();
                const isNameCorrupt = !nameStr || nameStr.includes('${') || nameStr.includes('random') || nameStr.includes('undefined') || nameStr.includes('GVS');
                const cleanName = isNameCorrupt ? 'Chưa cập nhật' : nameStr;

                const codeStr = String(teacher.code || '').trim();
                const isCodeCorrupt = !codeStr || codeStr.includes('${') || codeStr.includes('random') || codeStr.includes('undefined') || codeStr.includes('GVS');
                const cleanCode = isCodeCorrupt ? 'GV—' : codeStr;

                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={teacher.avatar}
                          name={cleanName}
                          size="md"
                          className="rounded-full flex-shrink-0 shadow-sm border border-slate-200"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-800">{cleanName}</div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> {teacher.email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="default" className="font-mono text-[11px] font-bold bg-slate-50 border-slate-200 text-slate-700">{cleanCode}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-700">
                      {formatRole(teacher.position || teacher.role)}
                    </td>
                   <td className="px-5 py-3.5 text-[13px] font-medium text-slate-600">
                    <select
                      value={teacher.departmentId || ''}
                      onChange={(e) => updateTeacher(teacher.id, { departmentId: e.target.value })}
                      className="text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <option value="">— Chưa phân tổ —</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      teacher.status === 'Đang công tác' ? 'bg-emerald-100 text-emerald-700' :
                      teacher.status === 'Nghỉ phép' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEdit(e, teacher)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, teacher)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-[13px] font-medium">
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">
                {editingTeacher ? 'Chỉnh sửa Giáo viên' : 'Thêm mới Giáo viên'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="teacherForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Mã GV</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      value={formData.code || ''} 
                      onChange={e => setFormData({...formData, code: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Chức vụ</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" 
                      value={formData.role || 'GIAO_VIEN'} 
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="HIỆU TRƯỞNG">Hiệu trưởng</option>
                      <option value="PHÓ HIỆU TRƯỞNG">Phó Hiệu trưởng</option>
                      <option value="TỔ TRƯỞNG">Tổ trưởng</option>
                      <option value="TỔ PHÓ">Tổ phó</option>
                      <option value="GIAO_VIEN">Giáo viên</option>
                      <option value="NHÂN VIÊN">Nhân viên</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tổ chuyên môn</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" 
                      value={formData.departmentId || ''} 
                      onChange={e => setFormData({...formData, departmentId: e.target.value})}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      value={formData.email || ''} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                    <input 
                      type="tel" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Môn giảng dạy</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    value={formData.subject || ''} 
                    onChange={e => setFormData({...formData, subject: e.target.value})} 
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 text-[13px] font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                form="teacherForm" 
                className="px-4 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-blue-500/20 transition-all"
              >
                {editingTeacher ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-extrabold text-slate-800 mb-2 uppercase tracking-wide">Xác nhận xóa</h3>
              <p className="text-[13px] font-medium text-slate-600">
                Bạn có chắc chắn muốn xóa hồ sơ giáo viên <span className="font-bold text-slate-900">{deletingTeacher.name}</span>?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setDeletingTeacher(null)} className="px-4 py-2 text-[13px] font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 text-[13px] font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 hover:shadow-rose-500/20 transition-all">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-2 uppercase tracking-wide">Xác nhận xóa toàn bộ giáo viên</h3>
              <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                Hành động này sẽ xóa <span className="font-bold text-rose-600">tất cả {teachers.length} giáo viên</span> hiện có trong hệ thống và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setIsDeleteAllModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                Hủy bỏ
              </button>
              <button onClick={handleDeleteAll} className="px-4 py-2 text-[13px] font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 hover:shadow-rose-500/20 transition-all">
                Đồng ý xóa hết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
