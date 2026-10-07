import React, { useState, useMemo } from 'react';
import { Teacher, Department } from '../../types';
import { Search, UserCheck, Check, X, ChevronDown, Building2, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmployeeSelectorProps {
  selectedEmployee: Teacher | null;
  onSelect: (employee: Teacher | null) => void;
  teachers: Teacher[];
  departments: Department[];
  allowedDepartmentId?: string;
  disabled?: boolean;
}

export function formatRole(role?: string): string {
  switch (role) {
    case 'BGH':
      return 'Ban Giám Hiệu';
    case 'TTCM':
      return 'Tổ trưởng chuyên môn';
    case 'GIAO_VU':
      return 'Giáo vụ';
    case 'NHAN_SU':
      return 'Nhân sự';
    case 'GIAO_VIEN':
      return 'Giáo viên';
    default:
      return role || 'CBGVNV';
  }
}

export default function EmployeeSelector({
  selectedEmployee,
  onSelect,
  teachers,
  departments,
  allowedDepartmentId,
  disabled = false,
}: EmployeeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Filter out any "admin" / "System Admin" user
  const validTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const isSystemAdmin =
        t.id === 'admin' ||
        t.username === 'admin' ||
        t.name?.toLowerCase().includes('system admin');
      if (isSystemAdmin) return false;
      if (allowedDepartmentId && t.departmentId !== allowedDepartmentId) return false;
      return true;
    });
  }, [teachers, allowedDepartmentId]);

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return validTeachers.filter((t) => {
      const deptName = (deptMap.get(t.departmentId || '') || '').toLowerCase();
      const roleName = formatRole(t.role).toLowerCase();
      const matchesSearch =
        !term ||
        t.name.toLowerCase().includes(term) ||
        (t.code && t.code.toLowerCase().includes(term)) ||
        deptName.includes(term) ||
        roleName.includes(term) ||
        (t.subject && t.subject.toLowerCase().includes(term));

      const matchesDept =
        selectedDeptFilter === 'all' || t.departmentId === selectedDeptFilter;

      return matchesSearch && matchesDept;
    });
  }, [validTeachers, searchTerm, selectedDeptFilter, deptMap]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-800">
          CBGVNV nghỉ <span className="text-rose-500">*</span>
        </label>
        {selectedEmployee && !disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Đổi CBGVNV
          </button>
        )}
      </div>

      {/* Selected Card or Empty State */}
      {!selectedEmployee ? (
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={cn(
            "p-3.5 border-2 border-dashed rounded-xl flex items-center justify-between cursor-pointer transition-all",
            disabled
              ? "bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400"
              : "border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 text-blue-700"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900">
                Chưa chọn CBGVNV
              </div>
              <div className="text-xs text-slate-500">
                Nhấn vào đây để tìm và chọn CBGVNV nghỉ từ danh sách trường
              </div>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap"
          >
            🔍 Chọn CBGVNV
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectedEmployee.avatar ? (
                <img
                  src={selectedEmployee.avatar}
                  alt={selectedEmployee.name}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900 text-base">
                  {selectedEmployee.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                  <span className="font-mono font-medium px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                    Mã: {selectedEmployee.code || 'N/A'}
                  </span>
                  <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {formatRole(selectedEmployee.role)}
                  </span>
                </div>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                title="Bỏ chọn"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Tổ/Bộ phận:</span>{' '}
              <span className="font-semibold text-slate-800">
                {deptMap.get(selectedEmployee.departmentId || '') || 'Chưa phân công'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Chức vụ:</span>{' '}
              <span className="font-semibold text-slate-800">
                {formatRole(selectedEmployee.role)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialog to search and pick CBGVNV */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  CHỌN CBGVNV NGHỈ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn cán bộ, giáo viên, nhân viên thực tế đang có trong hồ sơ trường
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Controls */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo họ tên, mã CBGVNV, môn, tổ..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {departments.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDeptFilter('all')}
                    className={cn(
                      "px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors",
                      selectedDeptFilter === 'all'
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Tất cả tổ ({validTeachers.length})
                  </button>
                  {departments.map((dept) => {
                    const count = validTeachers.filter(
                      (t) => t.departmentId === dept.id
                    ).length;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDeptFilter(dept.id)}
                        className={cn(
                          "px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors",
                          selectedDeptFilter === dept.id
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {dept.name} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List of Teachers */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredTeachers.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <User size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-sm text-slate-600">
                    Không tìm thấy CBGVNV phù hợp
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Thử tìm kiếm với từ khóa khác hoặc chuyển tổ chuyên môn
                  </p>
                </div>
              ) : (
                filteredTeachers.map((t) => {
                  const isSelected = selectedEmployee?.id === t.id;
                  const deptName = deptMap.get(t.departmentId || '') || 'Chưa phân công';

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelect(t);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50/70 shadow-sm"
                          : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {t.avatar ? (
                          <img
                            src={t.avatar}
                            alt={t.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {t.name}
                            </span>
                            {t.code && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {t.code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="text-blue-700 font-medium">
                              {formatRole(t.role)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 size={12} className="text-slate-400" />
                              {deptName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="p-1.5 bg-blue-600 text-white rounded-full">
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Hiển thị {filteredTeachers.length} / {validTeachers.length} CBGVNV</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
