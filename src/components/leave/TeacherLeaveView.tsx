import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { LeaveRecord, Teacher, AttendanceRecord, AttendanceStatus } from '../../types';
import { Plus, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Eye, Filter, User, Check } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay, eachDayOfInterval, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import EmployeeSelector, { formatRole } from './EmployeeSelector';
import { safeFormat } from '../../utils/dateUtils';

export default function TeacherLeaveView({ activeTab }: { activeTab: 'requests' | 'attendance' }) {
  const { 
    leaveRecords, 
    attendanceRecords, 
    teachers, 
    departments, 
    addLeaveRecord, 
    updateLeaveRecord,
    addAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord
  } = useAppContext();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'BGH' || currentUser?.role === 'NHAN_SU' || currentUser?.username === 'admin' || !currentUser;
  const isHead = currentUser?.role === 'TTCM';
  const canManage = isAdmin || isHead;

  // Find profile if user has one in teachers
  const myTeacherProfile = useMemo(() => {
    if (!currentUser) return null;
    return teachers.find(
      t => t.id === currentUser.id || (t.username && t.username === currentUser.username)
    ) || null;
  }, [teachers, currentUser]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Teacher | null>(null);
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);

  // Management interactive States
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveConfirmLeave, setApproveConfirmLeave] = useState<LeaveRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Attendance interactive States
  const [editingAttendanceDate, setEditingAttendanceDate] = useState<Date | null>(null);
  const [editingAttendanceStatus, setEditingAttendanceStatus] = useState<string>('present');
  const [editingAttendanceNote, setEditingAttendanceNote] = useState<string>('');

  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const getTeacherName = (id: string, record?: LeaveRecord) => {
    if (record?.employee_name) return record.employee_name;
    const found = teachers.find(t => t.id === id);
    return found ? found.name : id;
  };

  const getTeacherInfo = (id: string, record?: LeaveRecord) => {
    const found = teachers.find(t => t.id === id);
    return {
      name: record?.employee_name || found?.name || 'Không xác định',
      code: record?.code || found?.code || '',
      dept: record?.department_name || (found?.departmentId ? deptMap.get(found.departmentId) : '') || 'Chưa phân công',
      role: record?.position || (found?.role ? formatRole(found.role) : '') || 'CBGVNV',
      avatar: found?.avatar
    };
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const mapLeaveTypeToAttendanceStatus = (type?: string): AttendanceStatus => {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (t.includes('phép')) return 'annual_leave';
    if (t.includes('ốm') || t.includes('thai')) return 'sick_leave';
    if (t.includes('việc riêng') || t.includes('không lương')) return 'personal_leave';
    if (t.includes('công tác')) return 'business_trip';
    if (t.includes('chế độ')) return 'policy_leave';
    return 'other';
  };

  const handleApprove = async (leave: LeaveRecord) => {
    try {
      await updateLeaveRecord(leave.id, {
        status: 'Đã duyệt',
        approverId: currentUser?.id || 'admin',
        approvedAt: new Date().toISOString()
      });

      const startDateStr = leave.startDate || leave.start_date || '';
      if (startDateStr) {
        const start = parseISO(startDateStr);
        const endDateStr = leave.endDate || leave.end_date || startDateStr;
        const end = parseISO(endDateStr);
        const days = eachDayOfInterval({ start, end });
        const status = mapLeaveTypeToAttendanceStatus(leave.type || leave.leave_type);

        for (const d of days) {
          const dateStr = format(d, 'yyyy-MM-dd');
          const existing = attendanceRecords?.find(a => a.teacherId === leave.teacherId && a.date === dateStr);
          if (!existing) {
            await addAttendanceRecord({
              teacherId: leave.teacherId,
              departmentId: leave.departmentId || '',
              date: dateStr,
              status,
              leaveRecordId: leave.id,
              note: leave.reason || leave.type || 'Nghỉ phép'
            });
          }
        }
      }
      showToast(`Đã duyệt đơn nghỉ của "${getTeacherInfo(leave.teacherId, leave).name}" thành công!`);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi duyệt.", "error");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "error");
      return;
    }
    try {
      await updateLeaveRecord(id, {
        status: 'Từ chối',
        approverId: currentUser?.id || 'admin',
        approverNote: rejectReason,
        approvedAt: new Date().toISOString()
      });
      setRejectId(null);
      setRejectReason('');
      showToast("Đã từ chối đơn nghỉ.");
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi từ chối.", "error");
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<LeaveRecord>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    session: 'Cả ngày',
    type: 'Nghỉ phép',
    reason: '',
    note: ''
  });

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarTeacherId, setSelectedCalendarTeacherId] = useState<string>('');

  // Table filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Determine which leaves are visible
  const visibleLeaves = useMemo(() => {
    let list = [...leaveRecords];

    if (!canManage) {
      // Regular teacher sees only their records
      const teacherId = myTeacherProfile ? myTeacherProfile.id : currentUser?.id;
      list = list.filter(r => r.teacherId === teacherId || r.employee_id === teacherId);
    } else if (isHead && !isAdmin) {
      // Head of department sees leaves in their department
      list = list.filter(r => r.departmentId === currentUser?.departmentId || r.department_id === currentUser?.departmentId);
    }
    // Admin sees all leaves

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt || b.created_at || b.startDate).getTime() - new Date(a.createdAt || a.created_at || a.startDate).getTime());
  }, [leaveRecords, canManage, isAdmin, isHead, myTeacherProfile, currentUser]);

  // Filtered leaves for table
  const filteredLeaves = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return visibleLeaves.filter(leave => {
      const info = getTeacherInfo(leave.teacherId, leave);
      const matchesSearch =
        !term ||
        info.name.toLowerCase().includes(term) ||
        info.code.toLowerCase().includes(term) ||
        info.dept.toLowerCase().includes(term) ||
        (leave.reason && leave.reason.toLowerCase().includes(term)) ||
        (leave.type && leave.type.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const matchesDept = deptFilter === 'all' || leave.departmentId === deptFilter || leave.department_id === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [visibleLeaves, searchTerm, statusFilter, deptFilter, teachers, departments]);

  const pendingLeaves = visibleLeaves.filter(r => r.status === 'Chờ duyệt');
  const approvedLeaves = visibleLeaves.filter(r => r.status === 'Đã duyệt');

  // Open modal handler
  const handleOpenModal = () => {
    if (canManage) {
      // For Admin/BGH/Manager: Start with NO employee selected so they must choose real CBGVNV
      setSelectedEmployee(null);
    } else {
      // For regular teacher: Auto-select their own teacher profile
      setSelectedEmployee(myTeacherProfile);
    }

    setFormData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      session: 'Cả ngày',
      type: 'Nghỉ phép',
      reason: '',
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 5: Mandatory CBGVNV check - CANNOT SAVE without selected CBGVNV
    if (!selectedEmployee) {
      showToast("Vui lòng chọn CBGVNV nghỉ.", "error");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showToast("Vui lòng chọn ngày bắt đầu và kết thúc.", "error");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) {
      showToast("Ngày bắt đầu không thể lớn hơn ngày kết thúc.", "error");
      return;
    }

    // Check overlap for the SELECTED employee (NOT currentUser)
    const employeeLeaves = leaveRecords.filter(
      l => l.teacherId === selectedEmployee.id || l.employee_id === selectedEmployee.id
    );

    const newStart = start.getTime();
    const newEnd = end.getTime();
    const hasOverlap = employeeLeaves.some(l => {
      if (l.status === 'Từ chối' || l.status === 'Đã hủy') return false;
      const lStart = new Date(l.startDate || l.start_date || '').getTime();
      const lEnd = new Date(l.endDate || l.end_date || '').getTime();
      return newStart <= lEnd && newEnd >= lStart;
    });

    if (hasOverlap) {
      showToast(`Khoảng thời gian nghỉ đã trùng với một đơn nghỉ khác của CBGVNV ${selectedEmployee.name}.`, "error");
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const deptName = deptMap.get(selectedEmployee.departmentId || '') || 'Chưa phân công';

    const creatorName = currentUser?.name || currentUser?.username || 'System Admin';

    await addLeaveRecord({
      // Essential IDs and names
      teacherId: selectedEmployee.id,
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.name,
      departmentId: selectedEmployee.departmentId || '',
      department_id: selectedEmployee.departmentId || '',
      department_name: deptName,
      position: formatRole(selectedEmployee.role),
      code: selectedEmployee.code || '',

      // Dates & Sessions
      startDate: formData.startDate,
      start_date: formData.startDate,
      endDate: formData.endDate,
      end_date: formData.endDate,
      session: formData.session,
      totalDays,

      // Reason & Type
      type: formData.type as any,
      leave_type: formData.type,
      reason: (formData.type === 'Khác' ? formData.reason : (formData.reason || formData.type)) || '',
      note: formData.note || '',

      // Status & Audit
      status: 'Chờ duyệt',
      created_by: creatorName,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    showToast(`Đăng ký nghỉ cho CBGVNV "${selectedEmployee.name}" đã được gửi thành công.`);
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleCancel = (id: string) => {
    if (window.confirm("Bạn có chắc muốn hủy đơn nghỉ này?")) {
      updateLeaveRecord(id, {
        status: 'Đã hủy',
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast("Đã hủy đơn nghỉ thành công.");
    }
  };

  // Calendar logic
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentMonth);
  const startDay = getDay(startOfMonth(currentMonth));
  const emptyDays = startDay === 0 ? 6 : startDay - 1;

  // Calendar active teacher ID
  const activeCalendarTeacherId = useMemo(() => {
    if (!canManage) {
      return myTeacherProfile?.id || currentUser?.id || '';
    }
    if (selectedCalendarTeacherId) return selectedCalendarTeacherId;
    return teachers[0]?.id || '';
  }, [canManage, myTeacherProfile, currentUser, selectedCalendarTeacherId, teachers]);

  const activeCalendarTeacher = teachers.find(t => t.id === activeCalendarTeacherId);

  const activeTeacherAttendance = useMemo(() => {
    if (!activeCalendarTeacherId) return [];
    return attendanceRecords.filter(r => r.teacherId === activeCalendarTeacherId);
  }, [attendanceRecords, activeCalendarTeacherId]);

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      {activeTab === 'requests' && (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-sm font-medium text-slate-500 mb-1">Ngày hôm nay</div>
              <div className="text-lg font-bold text-slate-900">{format(new Date(), 'dd/MM/yyyy')}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-sm font-medium text-slate-500 mb-1">Số đơn chờ duyệt</div>
              <div className="text-lg font-bold text-amber-600">{pendingLeaves.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-sm font-medium text-slate-500 mb-1">Số ngày đã nghỉ (đã duyệt)</div>
              <div className="text-lg font-bold text-blue-600">
                {approvedLeaves.reduce((acc, curr) => acc + (curr.totalDays || 0), 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
              <button
                type="button"
                onClick={handleOpenModal}
                className="w-full h-full min-h-[60px] flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Plus size={20} />
                Đăng ký ngày nghỉ
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border overflow-hidden bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 uppercase text-sm">
                  {canManage ? 'DANH SÁCH ĐĂNG KÝ NGHỈ' : 'ĐƠN NGHỈ CỦA TÔI'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hiển thị {filteredLeaves.length} đơn đăng ký
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên, mã, lý do..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Từ chối">Từ chối</option>
                  <option value="Đã hủy">Đã hủy</option>
                </select>

                {canManage && departments.length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Tất cả tổ</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">CBGVNV</th>
                    <th className="px-4 py-3">Tổ / Bộ phận</th>
                    <th className="px-4 py-3">Từ ngày</th>
                    <th className="px-4 py-3">Đến ngày</th>
                    <th className="px-4 py-3">Số ngày</th>
                    <th className="px-4 py-3">Buổi</th>
                    <th className="px-4 py-3">Lý do nghỉ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Người tạo / duyệt</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                        <User size={32} className="mx-auto mb-2 opacity-40" />
                        <div className="font-medium text-sm text-slate-600">Chưa có đơn đăng ký nghỉ nào.</div>
                        <div className="text-xs text-slate-400 mt-1">Bấm nút "Đăng ký ngày nghỉ" để tạo đơn mới.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((leave, index) => {
                      const info = getTeacherInfo(leave.teacherId, leave);
                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              {info.avatar ? (
                                <img src={info.avatar} alt={info.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                  {info.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-sm text-slate-900">{info.name}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  {info.code && <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">{info.code}</span>}
                                  <span>•</span>
                                  <span>{info.role}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                            {info.dept}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-900 font-semibold">
                            {safeFormat(leave.startDate, 'dd/MM/yyyy', 'Chưa cập nhật')}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-900 font-semibold">
                            {safeFormat(leave.endDate, 'dd/MM/yyyy', 'Chưa cập nhật')}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-800 font-bold">
                            {leave.totalDays} ngày
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            {leave.session || 'Cả ngày'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-700 max-w-[180px]">
                            <div className="font-medium truncate">{leave.reason || leave.type}</div>
                            {leave.type && leave.reason && (
                              <div className="text-[10px] text-slate-400">{leave.type}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
                                leave.status === 'Đã duyệt'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : leave.status === 'Từ chối'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : leave.status === 'Đã hủy'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              )}
                            >
                              {leave.status === 'Chờ duyệt' && '🟠 Chờ duyệt'}
                              {leave.status === 'Đã duyệt' && '🟢 Đã duyệt'}
                              {leave.status === 'Từ chối' && '🔴 Từ chối'}
                              {leave.status === 'Đã hủy' && '⚪ Đã hủy'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            <div>{leave.created_by ? `Tạo: ${leave.created_by}` : '-'}</div>
                            {leave.approverId && <div className="text-[11px] text-emerald-700 font-medium">Đã duyệt bởi BGH</div>}
                          </td>
                           <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-semibold">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingLeave(leave)}
                                className="px-2.5 py-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Eye size={13} />
                                Xem
                              </button>
                              {canManage && leave.status === 'Chờ duyệt' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(leave)}
                                    className="px-2.5 py-1 text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-lg transition-all flex items-center gap-1 font-bold border border-emerald-200"
                                  >
                                    <Check size={12} />
                                    Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectId(leave.id)}
                                    className="px-2.5 py-1 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-all flex items-center gap-1 font-bold border border-rose-200"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              ) : leave.status === 'Chờ duyệt' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(leave.id)}
                                  className="px-2.5 py-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                  Hủy
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Attendance Calendar Tab */}
      {activeTab === 'attendance' && (
        <div className="border overflow-hidden p-6 space-y-6 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase">
                LỊCH CHẤM CÔNG THÁNG {format(currentMonth, 'MM/yyyy')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi ngày làm việc, nghỉ phép và chuyên cần của CBGVNV
              </p>
            </div>

            {/* Teacher Selector for Admin/Managers */}
            {canManage && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Xem lịch của CBGVNV:
                </span>
                <select
                  value={activeCalendarTeacherId}
                  onChange={e => setSelectedCalendarTeacherId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {teachers
                    .filter(t => t.id !== 'admin' && t.username !== 'admin')
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code || 'N/A'}) - {deptMap.get(t.departmentId || '') || 'Tổ chuyên môn'}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-sm text-slate-800">Tháng {format(currentMonth, 'MM/yyyy')}</span>
              <button onClick={nextMonth} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {activeCalendarTeacher && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {activeCalendarTeacher.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{activeCalendarTeacher.name}</div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span>Mã: {activeCalendarTeacher.code}</span>
                  <span>•</span>
                  <span>{formatRole(activeCalendarTeacher.role)}</span>
                  <span>•</span>
                  <span>Tổ: {deptMap.get(activeCalendarTeacher.departmentId || '') || 'Chưa phân công'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
              <div key={day} className="bg-slate-100 py-3 text-center text-xs font-bold text-slate-700 uppercase">{day}</div>
            ))}

            {Array.from({ length: emptyDays }).map((_, i) => (
              <div key={'empty-' + i} className="bg-slate-50/50 min-h-[95px] border border-slate-100"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
              const dateStr = format(date, 'yyyy-MM-dd');
              const att = activeTeacherAttendance.find(a => a.date === dateStr);

              return (
                <div 
                  key={i} 
                  onClick={() => {
                    if (canManage && activeCalendarTeacher) {
                      setEditingAttendanceDate(date);
                      setEditingAttendanceStatus(att ? att.status : 'present');
                      setEditingAttendanceNote(att ? att.note || '' : '');
                    }
                  }}
                  className={cn(
                    "bg-white min-h-[95px] p-2 flex flex-col items-center border border-slate-100 relative group transition-all select-none",
                    canManage && activeCalendarTeacher ? "cursor-pointer hover:bg-blue-50/40 hover:shadow-inner" : ""
                  )}
                >
                  <span className={cn("text-xs font-bold mb-2 flex items-center justify-center w-7 h-7 rounded-full",
                    date.toDateString() === new Date().toDateString() ? "bg-blue-600 text-white" : "text-slate-700"
                  )}>
                    {i + 1}
                  </span>

                  {att ? (
                    <span className={cn("text-[11px] px-2 py-1 rounded-md font-bold w-full text-center mt-1",
                      att.status === 'present' ? "bg-emerald-100 text-emerald-700" :
                      att.status === 'absent' ? "bg-slate-100 text-slate-600" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {att.status === 'present' ? '✓ Có mặt' :
                       att.status === 'annual_leave' ? 'P Nghỉ phép' :
                       att.status === 'sick_leave' ? 'O Nghỉ ốm' :
                       att.status === 'personal_leave' ? 'R Việc riêng' :
                       att.status === 'business_trip' ? 'CT Công tác' :
                       att.status === 'absent' ? '- Nghỉ' : att.status}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs mt-1">-</span>
                  )}

                  {canManage && activeCalendarTeacher && (
                    <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-[9px] text-blue-600 bg-blue-50 px-1 rounded transition-opacity font-bold">
                      Sửa
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ĐĂNG KÝ NGÀY NGHỈ (WITH EMPLOYEE SELECTOR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">ĐĂNG KÝ NGÀY NGHỈ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điền thông tin và chọn CBGVNV nghỉ thực tế
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* STEP 3 & 4: DEDICATED CBGVNV SELECTOR - SEPARATED FROM currentUser */}
              <EmployeeSelector
                selectedEmployee={selectedEmployee}
                onSelect={setSelectedEmployee}
                teachers={teachers}
                departments={departments}
                allowedDepartmentId={isHead && !isAdmin ? currentUser?.departmentId : undefined}
                disabled={!canManage && !!myTeacherProfile}
              />

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Từ ngày <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate || ''}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Đến ngày <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate || ''}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Session */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Buổi nghỉ <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="session"
                      value="Cả ngày"
                      checked={formData.session === 'Cả ngày'}
                      onChange={e => setFormData({...formData, session: e.target.value as any})}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Cả ngày</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="session"
                      value="Buổi sáng"
                      checked={formData.session === 'Buổi sáng'}
                      onChange={e => setFormData({...formData, session: e.target.value as any})}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Buổi sáng</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="session"
                      value="Buổi chiều"
                      checked={formData.session === 'Buổi chiều'}
                      onChange={e => setFormData({...formData, session: e.target.value as any})}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Buổi chiều</span>
                  </label>
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Lý do nghỉ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.type || 'Nghỉ phép'}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                >
                  <option value="Nghỉ phép">Nghỉ phép</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Nghỉ việc riêng">Nghỉ việc riêng</option>
                  <option value="Nghỉ công tác">Nghỉ công tác</option>
                  <option value="Nghỉ theo chế độ">Nghỉ theo chế độ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {formData.type === 'Khác' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Lý do cụ thể <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reason || ''}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    placeholder="Vui lòng nhập lý do cụ thể..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                  placeholder="Thông tin bổ sung (nếu có)..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30"
                >
                  GỬI ĐĂNG KÝ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: XEM CHI TIẾT ĐƠN NGHỈ */}
      {viewingLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">CHI TIẾT ĐƠN ĐĂNG KÝ NGHỈ</h3>
              <button
                type="button"
                onClick={() => setViewingLeave(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Teacher Info */}
              {(() => {
                const info = getTeacherInfo(viewingLeave.teacherId, viewingLeave);
                return (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {info.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-base">{info.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        {info.code && <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{info.code}</span>}
                        <span>{info.dept}</span>
                        <span>•</span>
                        <span>{info.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 text-xs block">Thời gian nghỉ:</span>
                  <span className="font-bold text-slate-800">
                    {safeFormat(viewingLeave.startDate, 'dd/MM/yyyy', 'Chưa cập nhật')} → {safeFormat(viewingLeave.endDate, 'dd/MM/yyyy', 'Chưa cập nhật')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Tổng số ngày:</span>
                  <span className="font-bold text-blue-600">{viewingLeave.totalDays} ngày ({viewingLeave.session || 'Cả ngày'})</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">Loại nghỉ & Lý do:</span>
                <span className="font-semibold text-slate-800">{viewingLeave.reason || viewingLeave.type}</span>
              </div>

              {viewingLeave.note && (
                <div>
                  <span className="text-slate-400 text-xs block">Ghi chú:</span>
                  <span className="text-slate-700">{viewingLeave.note}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs block">Trạng thái:</span>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-1",
                    viewingLeave.status === 'Đã duyệt' ? 'bg-emerald-100 text-emerald-800' :
                    viewingLeave.status === 'Từ chối' ? 'bg-rose-100 text-rose-800' :
                    viewingLeave.status === 'Đã hủy' ? 'bg-slate-100 text-slate-600' :
                    'bg-amber-100 text-amber-800'
                  )}>
                    {viewingLeave.status}
                  </span>
                </div>
                {viewingLeave.created_by && (
                  <div className="text-right">
                    <span className="text-slate-400 text-xs block">Người tạo:</span>
                    <span className="font-medium text-slate-700 text-xs">{viewingLeave.created_by}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              {canManage && viewingLeave.status === 'Chờ duyệt' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(viewingLeave);
                      setViewingLeave(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-1 shadow-md shadow-emerald-500/10"
                  >
                    <Check size={16} />
                    Duyệt đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectId(viewingLeave.id);
                      setViewingLeave(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-1 shadow-md shadow-rose-500/10"
                  >
                    Từ chối
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewingLeave(null)}
                className="px-4 py-2 border text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase">LÝ DO TỪ CHỐI ĐƠN NGHỈ</h3>
              <button 
                type="button" 
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Vui lòng nhập lý do cụ thể:</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Cần sắp xếp người dạy thay trước, trùng ngày thi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[90px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectReason(''); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(rejectId)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-rose-500/10"
                >
                  Từ chối đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CALENDAR ATTENDANCE EDIT MODAL */}
      {editingAttendanceDate && activeCalendarTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">CẬP NHẬT CHẤM CÔNG</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày {format(editingAttendanceDate, 'dd/MM/yyyy')} — {activeCalendarTeacher.name}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingAttendanceDate(null)} 
                className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Chọn trạng thái ngày này</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'present', label: '✓ Có mặt', color: 'border-emerald-100 text-emerald-800 bg-emerald-50/20' },
                    { value: 'annual_leave', label: 'P Nghỉ phép', color: 'border-amber-100 text-amber-800 bg-amber-50/20' },
                    { value: 'sick_leave', label: 'O Nghỉ ốm', color: 'border-rose-100 text-rose-800 bg-rose-50/20' },
                    { value: 'personal_leave', label: 'R Việc riêng', color: 'border-indigo-100 text-indigo-800 bg-indigo-50/20' },
                    { value: 'business_trip', label: 'CT Công tác', color: 'border-blue-100 text-blue-800 bg-blue-50/20' },
                    { value: 'absent', label: '- Nghỉ / Vắng', color: 'border-slate-100 text-slate-700 bg-slate-50/20' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditingAttendanceStatus(opt.value)}
                      className={cn(
                        "px-3 py-2 border rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between",
                        opt.color,
                        editingAttendanceStatus === opt.value ? "ring-2 ring-blue-600 border-blue-600" : "border-slate-200"
                      )}
                    >
                      <span>{opt.label}</span>
                      {editingAttendanceStatus === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú lý do (Nếu có)</label>
                <input
                  type="text"
                  value={editingAttendanceNote}
                  onChange={e => setEditingAttendanceNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ghi chú thêm..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                {activeTeacherAttendance.find(a => a.date === format(editingAttendanceDate, 'yyyy-MM-dd')) ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const existing = activeTeacherAttendance.find(a => a.date === format(editingAttendanceDate, 'yyyy-MM-dd'));
                      if (existing) {
                        await deleteAttendanceRecord(existing.id);
                        showToast("Đã xóa dữ liệu chấm công ngày này.");
                      }
                      setEditingAttendanceDate(null);
                    }}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    Xóa chấm công
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAttendanceDate(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const dStr = format(editingAttendanceDate, 'yyyy-MM-dd');
                      const existing = activeTeacherAttendance.find(a => a.date === dStr);
                      if (existing) {
                        await updateAttendanceRecord(existing.id, {
                          status: editingAttendanceStatus as any,
                          note: editingAttendanceNote
                        });
                        showToast("Cập nhật chấm công thành công.");
                      } else {
                        await addAttendanceRecord({
                          teacherId: activeCalendarTeacherId,
                          departmentId: activeCalendarTeacher.departmentId || '',
                          date: dStr,
                          status: editingAttendanceStatus as any,
                          note: editingAttendanceNote
                        });
                        showToast("Ghi nhận chấm công thành công.");
                      }
                      setEditingAttendanceDate(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-500/10"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[80] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <div className={cn(
            "w-2 h-2 rounded-full",
            toast.type === 'error' ? "bg-rose-500" : "bg-emerald-500"
          )} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
