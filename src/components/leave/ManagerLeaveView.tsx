import React, { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { Check, X, FileSpreadsheet } from 'lucide-react';
import { LeaveRecord, AttendanceStatus } from '../../types';
import { cn } from '../../lib/utils';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { safeFormat } from '../../utils/dateUtils';

export default function ManagerLeaveView({ activeTab }: { activeTab: string }) {
  const { leaveRecords, attendanceRecords, teachers, departments, updateLeaveRecord, addAttendanceRecord } = useAppContext();
  const { user: currentUser } = useAuth();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [approveConfirmLeave, setApproveConfirmLeave] = useState<LeaveRecord | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const user = currentUser || { id: 'admin', name: 'Ban Giám Hiệu', role: 'BGH', username: 'admin' };
  const isAdmin = user.role === 'BGH' || user.role === 'NHAN_SU' || user.username === 'admin';
  const isHead = user.role === 'TTCM';

  const visibleLeaves = leaveRecords.filter(r => {
    if (isAdmin) return true;
    if (isHead) return r.departmentId === user.departmentId || r.department_id === user.departmentId;
    return false;
  }).sort((a, b) => new Date(b.createdAt || b.created_at || b.startDate).getTime() - new Date(a.createdAt || a.created_at || a.startDate).getTime());

  const pendingLeaves = visibleLeaves.filter(r => r.status === 'Chờ duyệt');

  const getTeacherName = (id: string, leave?: LeaveRecord) => {
    if (leave?.employee_name) return leave.employee_name;
    const found = teachers.find(t => t.id === id);
    return found ? found.name : id;
  };
  const getDeptName = (id: string, leave?: LeaveRecord) => {
    if (leave?.department_name) return leave.department_name;
    return departments.find(d => d.id === id)?.name || id;
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
      // Approve
      await updateLeaveRecord(leave.id, {
        status: 'Đã duyệt',
        approverId: user.id,
        approvedAt: new Date().toISOString()
      });

      // Create attendance records
      const startDateStr = leave.startDate || leave.start_date || '';
      if (startDateStr) {
        const start = parseISO(startDateStr);
        const endDateStr = leave.endDate || leave.end_date || startDateStr;
        const end = parseISO(endDateStr);
        const days = eachDayOfInterval({ start, end });
        const status = mapLeaveTypeToAttendanceStatus(leave.type || leave.leave_type);

        for (const d of days) {
          const dateStr = format(d, 'yyyy-MM-dd');
          // Only create if not exists
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

      showToast(`Đã duyệt đơn nghỉ của CBGVNV "${getTeacherName(leave.teacherId, leave)}" thành công!`);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi duyệt đơn nghỉ.", "error");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "error");
      return;
    }
    try {
      const leave = leaveRecords.find(r => r.id === id);
      await updateLeaveRecord(id, {
        status: 'Từ chối',
        approverId: user.id,
        approverNote: rejectReason,
        approvedAt: new Date().toISOString()
      });
      setRejectId(null);
      setRejectReason('');
      showToast(`Đã từ chối đơn nghỉ của ${leave ? getTeacherName(leave.teacherId, leave) : 'CBGVNV'}.`);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi từ chối đơn.", "error");
    }
  };

  const exportExcel = () => {
    const data = visibleLeaves.map(l => ({
      'Họ tên': getTeacherName(l.teacherId),
      'Tổ chuyên môn': getDeptName(l.departmentId),
      'Ngày bắt đầu': l.startDate,
      'Ngày kết thúc': l.endDate,
      'Số ngày': l.totalDays,
      'Buổi': l.session,
      'Loại nghỉ': l.type,
      'Lý do': l.reason,
      'Trạng thái': l.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nghi");
    XLSX.writeFile(wb, "Bao_cao_nghi.xlsx");
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-fade-in bg-white border-slate-200">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-white font-bold",
            toast.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
          )}>
            {toast.type === 'success' ? <Check size={12} /> : <X size={12} />}
          </div>
          <p className="text-sm font-semibold text-slate-800">{toast.message}</p>
        </div>
      )}

      {approveConfirmLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Xác nhận duyệt đơn nghỉ</h3>
              <button onClick={() => setApproveConfirmLeave(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Bạn có chắc chắn muốn duyệt đơn xin nghỉ của giáo viên <strong>{getTeacherName(approveConfirmLeave.teacherId, approveConfirmLeave)}</strong>?
              </p>
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 mb-4 text-slate-600 border border-slate-100">
                <div>- Thời gian: <strong>{approveConfirmLeave.startDate} → {approveConfirmLeave.endDate}</strong></div>
                <div>- Số ngày: <strong>{approveConfirmLeave.totalDays} ngày ({approveConfirmLeave.session || 'Cả ngày'})</strong></div>
                <div>- Lý do: <strong>{approveConfirmLeave.reason || approveConfirmLeave.type}</strong></div>
              </div>
              <p className="text-xs text-amber-600 font-semibold">
                * Hệ thống sẽ tự động đồng bộ và sinh bản ghi chấm công (Nghỉ phép/Nghỉ ốm v.v.) vào lịch chấm công của giáo viên tương ứng.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setApproveConfirmLeave(null)} className="px-5 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Hủy</button>
                <button 
                  onClick={() => {
                    const l = approveConfirmLeave;
                    setApproveConfirmLeave(null);
                    handleApprove(l);
                  }} 
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-colors"
                >
                  Xác nhận duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="border overflow-hidden bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 uppercase">QUẢN LÝ ĐƠN NGHỈ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-6 py-3">Họ tên</th>
                  <th className="px-6 py-3">Tổ</th>
                  <th className="px-6 py-3">Ngày nghỉ</th>
                  <th className="px-6 py-3">Số ngày</th>
                  <th className="px-6 py-3">Lý do</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingLeaves.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">Không có đơn nào chờ duyệt.</td></tr>
                ) : (
                  pendingLeaves.map(leave => (
                    <tr key={leave.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        <div>{getTeacherName(leave.teacherId, leave)}</div>
                        {leave.code && <div className="text-xs text-slate-400 font-mono">Mã: {leave.code}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getDeptName(leave.departmentId, leave)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">
                        {leave.startDate === leave.endDate 
                          ? safeFormat(leave.startDate, 'dd/MM/yyyy', 'Chưa cập nhật') 
                          : `${safeFormat(leave.startDate, 'dd/MM', 'Chưa cập nhật')} - ${safeFormat(leave.endDate, 'dd/MM/yyyy', 'Chưa cập nhật')}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-bold">{leave.totalDays} ngày</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{leave.reason || leave.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Chờ duyệt
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingLeave(leave)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproveConfirmLeave(leave)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
                          >
                            DUYỆT
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectId(leave.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/20"
                          >
                            TỪ CHỐI
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'all-attendance' && (
        <div className="border p-6 bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
          <h3 className="font-semibold text-slate-800 mb-4">Chấm công toàn trường</h3>
          <p className="text-sm text-slate-500 mb-4">Tổng hợp ngày công và ngày nghỉ của CBGVNV.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-6 py-3">Họ tên</th>
                  <th className="px-6 py-3">Tổ chuyên môn</th>
                  <th className="px-6 py-3">Nghỉ phép</th>
                  <th className="px-6 py-3">Nghỉ ốm</th>
                  <th className="px-6 py-3">Việc riêng</th>
                  <th className="px-6 py-3">Công tác</th>
                  <th className="px-6 py-3">Tổng ngày nghỉ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teachers
                  .filter(t => t.id !== 'admin' && t.username !== 'admin' && !t.name?.toLowerCase().includes('system admin'))
                  .filter(t => isAdmin || t.departmentId === user.departmentId)
                  .map(teacher => {
                  const att = attendanceRecords?.filter(a => a.teacherId === teacher.id) || [];
                  const annual = att.filter(a => a.status === 'annual_leave').length;
                  const sick = att.filter(a => a.status === 'sick_leave').length;
                  const personal = att.filter(a => a.status === 'personal_leave').length;
                  const business = att.filter(a => a.status === 'business_trip').length;
                  const total = annual + sick + personal + business + att.filter(a => a.status === 'policy_leave' || a.status === 'other').length;
                  
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{teacher.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getDeptName(teacher.departmentId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{annual}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{sick}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{personal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{business}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Đơn chờ duyệt</h4>
            <div className="text-4xl font-bold text-amber-600">{pendingLeaves.length}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Đơn đã duyệt</h4>
            <div className="text-4xl font-bold text-emerald-600">
              {visibleLeaves.filter(r => r.status === 'Đã duyệt').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Tổng lượt xin nghỉ</h4>
            <div className="text-4xl font-bold text-blue-600">{visibleLeaves.length}</div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="border p-8 flex flex-col items-center justify-center min-h-[300px] bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Xuất báo cáo dữ liệu</h3>
          <p className="text-slate-500 text-center max-w-md mb-8">
            Xuất danh sách đăng ký nghỉ của CBGVNV ra tệp Excel để lưu trữ hoặc phục vụ công tác tính lương, báo cáo nội bộ.
          </p>
          <button onClick={exportExcel} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-500/30">
            <FileSpreadsheet size={20} />
            Tải xuống Excel
          </button>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Từ chối đơn nghỉ</h3>
              <button onClick={() => setRejectId(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do từ chối *</label>
              <textarea 
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                placeholder="Vui lòng nhập lý do từ chối đơn này..."
              ></textarea>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setRejectId(null)} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">HỦY</button>
                <button onClick={() => handleReject(rejectId)} className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm shadow-rose-500/30 transition-colors">XÁC NHẬN TỪ CHỐI</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {getTeacherName(viewingLeave.teacherId, viewingLeave).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-base">{getTeacherName(viewingLeave.teacherId, viewingLeave)}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    {viewingLeave.code && <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{viewingLeave.code}</span>}
                    <span>{getDeptName(viewingLeave.departmentId, viewingLeave)}</span>
                    {viewingLeave.position && (
                      <>
                        <span>•</span>
                        <span>{viewingLeave.position}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

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
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-1 bg-amber-100 text-amber-800 border border-amber-200">
                    {viewingLeave.status}
                  </span>
                </div>
                {viewingLeave.created_by && (
                  <div className="text-right">
                    <span className="text-slate-400 text-xs block">Người tạo đơn:</span>
                    <span className="font-medium text-slate-700 text-xs">{viewingLeave.created_by}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingLeave(null)}
                className="px-4 py-2 border text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors bg-white/90 backdrop-blur-xl rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]"
              >
                Đóng
              </button>
              {viewingLeave.status === 'Chờ duyệt' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const l = viewingLeave;
                      setViewingLeave(null);
                      setApproveConfirmLeave(l);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Duyệt đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewingLeave.id;
                      setViewingLeave(null);
                      setRejectId(id);
                    }}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors"
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
