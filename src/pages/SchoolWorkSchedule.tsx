import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Download,
  Printer,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit2,
  Building2,
  Users,
  Check,
  Upload,
  UserCheck,
  CalendarDays,
  Sun,
  Moon,
  AlertCircle,
  HelpCircle,
  History,
  CheckSquare,
  Square,
  AlertOctagon
} from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { Card } from '../components/ui/Card';
import { useAuth } from '../store/AuthContext';
import { useAppContext } from '../store/AppContext';
import {
  SchoolWorkSchedule,
  SchoolWorkDay,
  SchoolWorkItem
} from '../types/schoolWorkSchedule';
import {
  schoolWorkScheduleService,
  DEFAULT_DEPARTMENTS_CONFIG,
  generateSampleSchoolWorkSchedule
} from '../services/schoolWorkScheduleService';
import { exportSchoolWorkScheduleToWord } from '../utils/schoolWorkScheduleExportWord';
import { getWeekInfoByNumber, getAllWeeksInYear, ACADEMIC_YEARS } from '../utils/schoolWeekUtils';
import SchoolScheduleWordImportModal from '../components/schoolSchedule/SchoolScheduleWordImportModal';
import AutoResizeTextarea from '../components/ui/AutoResizeTextarea';
import DeleteScheduleConfirmModal from '../components/schedules/DeleteScheduleConfirmModal';
import BatchDeleteConfirmModal from '../components/schedules/BatchDeleteConfirmModal';
import DeleteWeekConfirmModal from '../components/schedules/DeleteWeekConfirmModal';
import ScheduleAuditLogModal from '../components/schedules/ScheduleAuditLogModal';
import { checkCanDeleteScheduleTask, checkCanDeleteEntireWeek } from '../utils/schedulePermissions';
import { SCHOOL_NAME_UPPER } from '../constants/schoolConfig';
import * as XLSX from 'xlsx';

export default function SchoolWorkSchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { teachers, departments } = useAppContext();

  // URL / State
  const initialDept = searchParams.get('dept') || 'all';
  const initialWeek = parseInt(searchParams.get('week') || '3', 10);
  const initialYear = searchParams.get('year') || '2026–2027';

  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDept);
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  const [schedule, setSchedule] = useState<SchoolWorkSchedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWordImportOpen, setIsWordImportOpen] = useState<boolean>(false);

  // Modal item state for Add / Edit task
  const [editingItem, setEditingItem] = useState<{
    dayId: string;
    dayIndex: number;
    timeSlot: 'morning' | 'afternoon';
    item?: SchoolWorkItem;
  } | null>(null);

  // Form fields for editing task
  const [formDayIndex, setFormDayIndex] = useState<number>(0);
  const [formWeekNumber, setFormWeekNumber] = useState<number>(initialWeek);
  const [formTimeSlot, setFormTimeSlot] = useState<'morning' | 'afternoon'>('morning');
  const [formContent, setFormContent] = useState<string>('');
  const [formAssignee, setFormAssignee] = useState<string>('');
  const [formCompletionDate, setFormCompletionDate] = useState<string>('');
  const [formLeaderInCharge, setFormLeaderInCharge] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('Chưa thực hiện');
  const [formNote, setFormNote] = useState<string>('');

  // Delete single task modal state
  const [deletingTaskInfo, setDeletingTaskInfo] = useState<{
    dayId: string;
    dayName: string;
    dateStr: string;
    timeSlot: 'morning' | 'afternoon';
    taskItem: SchoolWorkItem;
    dutyEvaluator?: string;
  } | null>(null);

  // Batch delete state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Delete entire week modal
  const [isDeleteWeekModalOpen, setIsDeleteWeekModalOpen] = useState(false);

  // Audit log modal
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions (Hiệu trưởng, Phó Hiệu trưởng, BGH, ADMIN, TTCM / Tổ trưởng, Cán bộ quản lý)
  const userRole = (user?.role || '').toUpperCase();
  const userPosition = (user?.position || '').toUpperCase();
  const userTitle = ((user as any)?.title || '').toUpperCase();

  const isPrincipalOrVice = 
    userRole.includes('HIỆU TRƯỞNG') || 
    userRole.includes('PHÓ HIỆU TRƯỞNG') || 
    userRole.includes('BGH') || 
    userRole.includes('HT') || 
    userRole.includes('PHT') ||
    userPosition.includes('HIỆU TRƯỞNG') || 
    userPosition.includes('PHÓ HIỆU TRƯỞNG') || 
    userPosition.includes('BAN GIÁM HIỆU') ||
    userTitle.includes('HIỆU TRƯỞNG');

  const isAdmin = 
    user?.id === 'admin' || 
    user?.username === 'admin' || 
    userRole === 'ADMIN' || 
    userRole === 'QUAN_TRI' || 
    userPosition.includes('QUẢN TRỊ') ||
    isPrincipalOrVice;

  const isHead = 
    userRole.includes('TTCM') || 
    userRole.includes('TỔ TRƯỞNG') || 
    userPosition.includes('TỔ TRƯỞNG');

  const canEdit = isAdmin || isPrincipalOrVice || isHead || userRole.includes('GIAO_VU') || userRole.includes('NHAN_SU');

  // Permission checks for delete operations in the current view
  const currentScope: 'all' | 'department' = selectedDeptId === 'all' ? 'all' : 'department';
  const currentDeletePerm = useMemo(() => {
    return checkCanDeleteScheduleTask(user, currentScope, selectedDeptId);
  }, [user, currentScope, selectedDeptId]);

  const canDeleteInView = currentDeletePerm.canDelete || canEdit;

  const currentWeekDeletePerm = useMemo(() => {
    return checkCanDeleteEntireWeek(user);
  }, [user]);

  const canDeleteWeekInView = currentWeekDeletePerm.canDelete || isAdmin || isPrincipalOrVice;

  // All weeks info
  const allWeeks = useMemo(() => getAllWeeksInYear(selectedYear), [selectedYear]);
  const currentWeekInfo = useMemo(() => getWeekInfoByNumber(selectedWeek, selectedYear), [selectedWeek, selectedYear]);

  // Combined departments list
  const allDepartments = useMemo(() => {
    const list = [...DEFAULT_DEPARTMENTS_CONFIG];
    departments.forEach(dept => {
      const exists = list.some(d => d.id === dept.id || d.name.toLowerCase() === dept.name.toLowerCase());
      if (!exists) {
        list.push({
          id: dept.id,
          name: dept.name,
          label: dept.name
        });
      }
    });
    return list;
  }, [departments]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load schedule when week, year or dept changes
  useEffect(() => {
    loadSchedule();
  }, [selectedWeek, selectedYear, selectedDeptId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await schoolWorkScheduleService.getSchedule(selectedWeek, selectedYear, selectedDeptId);
      setSchedule(data);
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi tải lịch công việc');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule) return;
    try {
      setSaving(true);
      await schoolWorkScheduleService.saveSchedule(schedule);
      showToast('Đã lưu lịch công việc thành công!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi lưu lịch công việc');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToSample = async () => {
    try {
      setSaving(true);
      const sample = generateSampleSchoolWorkSchedule(selectedWeek, selectedYear, selectedDeptId);
      setSchedule(sample);
      await schoolWorkScheduleService.saveSchedule(sample);
      showToast(`Đã nạp lịch công việc chuẩn THPT Minh Hòa cho ${currentWeekInfo.label}!`);
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi nạp dữ liệu mẫu');
    } finally {
      setSaving(false);
    }
  };

  // Open modal for Adding a new task
  const openAddTaskModal = (dayId: string, dayIndex: number, timeSlot: 'morning' | 'afternoon') => {
    const currentDay = schedule?.days[dayIndex];
    setEditingItem({ dayId, dayIndex, timeSlot });
    setFormDayIndex(dayIndex);
    setFormWeekNumber(selectedWeek);
    setFormTimeSlot(timeSlot);
    setFormContent('');
    setFormAssignee('');
    setFormCompletionDate(currentDay?.completion_date || currentDay?.date_str || '');
    setFormLeaderInCharge(currentDay?.duty_evaluator || '');
    setFormStatus('Chưa thực hiện');
    setFormNote('');
  };

  // Open modal for Editing an existing task
  const openEditTaskModal = (dayId: string, dayIndex: number, timeSlot: 'morning' | 'afternoon', item: SchoolWorkItem) => {
    const currentDay = schedule?.days[dayIndex];
    setEditingItem({ dayId, dayIndex, timeSlot, item });
    setFormDayIndex(dayIndex);
    setFormWeekNumber(selectedWeek);
    setFormTimeSlot(timeSlot);
    setFormContent(item.content || '');
    setFormAssignee(item.assignee || '');
    setFormCompletionDate(item.completionDate || item.deadlineDate || currentDay?.completion_date || currentDay?.date_str || '');
    setFormLeaderInCharge(item.leaderInCharge || currentDay?.duty_evaluator || '');
    setFormStatus(item.status || 'Chưa thực hiện');
    setFormNote(item.note || '');
  };

  // Handle Save (Create or Update) task
  const handleSaveItem = async () => {
    if (!editingItem || !schedule || !formContent.trim()) {
      showToast('Vui lòng nhập nội dung công việc');
      return;
    }

    try {
      setSaving(true);

      const isEdit = !!editingItem.item;
      const taskId = isEdit ? editingItem.item!.id : `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const updatedTask: SchoolWorkItem = {
        id: taskId,
        timeSlot: formTimeSlot,
        content: formContent.trim(),
        assignee: formAssignee.trim() || undefined,
        deadlineDate: formCompletionDate.trim() || undefined,
        completionDate: formCompletionDate.trim() || undefined,
        leaderInCharge: formLeaderInCharge.trim() || undefined,
        status: formStatus as any,
        note: formNote.trim() || undefined
      };

      // Case 1: Same week
      if (formWeekNumber === selectedWeek) {
        const originalDayIndex = editingItem.dayIndex;
        const originalTimeSlot = editingItem.timeSlot;
        const targetDayIndex = formDayIndex;
        const targetTimeSlot = formTimeSlot;

        const newDays = schedule.days.map((day, dIdx) => {
          let morningTasks = [...day.morning_tasks];
          let afternoonTasks = [...day.afternoon_tasks];

          // If this is the original day and it's an edit or we are moving away
          if (dIdx === originalDayIndex && isEdit) {
            if (originalTimeSlot === 'morning') {
              morningTasks = morningTasks.filter(t => t.id !== taskId);
            } else {
              afternoonTasks = afternoonTasks.filter(t => t.id !== taskId);
            }
          }

          // If this is the target day, insert the task
          if (dIdx === targetDayIndex) {
            if (targetTimeSlot === 'morning') {
              // Add or replace
              const existIdx = morningTasks.findIndex(t => t.id === taskId);
              if (existIdx >= 0) {
                morningTasks[existIdx] = updatedTask;
              } else {
                morningTasks.push(updatedTask);
              }
            } else {
              const existIdx = afternoonTasks.findIndex(t => t.id === taskId);
              if (existIdx >= 0) {
                afternoonTasks[existIdx] = updatedTask;
              } else {
                afternoonTasks.push(updatedTask);
              }
            }

            // Sync day-level completion date & duty evaluator if provided
            return {
              ...day,
              morning_tasks: morningTasks,
              afternoon_tasks: afternoonTasks,
              completion_date: formCompletionDate.trim() || day.completion_date,
              duty_evaluator: formLeaderInCharge.trim() || day.duty_evaluator
            };
          }

          return {
            ...day,
            morning_tasks: morningTasks,
            afternoon_tasks: afternoonTasks
          };
        });

        const updatedSchedule: SchoolWorkSchedule = {
          ...schedule,
          days: newDays,
          updated_at: new Date().toISOString()
        };

        setSchedule(updatedSchedule);
        await schoolWorkScheduleService.saveSchedule(updatedSchedule);
        showToast(isEdit ? 'Đã cập nhật công việc thành công!' : 'Đã thêm công việc mới thành công!');
      } else {
        // Case 2: Moved to a different week
        // Remove from current schedule
        const currentDays = schedule.days.map((day, dIdx) => {
          if (dIdx === editingItem.dayIndex && isEdit) {
            return {
              ...day,
              morning_tasks: editingItem.timeSlot === 'morning' ? day.morning_tasks.filter(t => t.id !== taskId) : day.morning_tasks,
              afternoon_tasks: editingItem.timeSlot === 'afternoon' ? day.afternoon_tasks.filter(t => t.id !== taskId) : day.afternoon_tasks
            };
          }
          return day;
        });

        const updatedCurrentSchedule: SchoolWorkSchedule = {
          ...schedule,
          days: currentDays,
          updated_at: new Date().toISOString()
        };
        setSchedule(updatedCurrentSchedule);
        await schoolWorkScheduleService.saveSchedule(updatedCurrentSchedule);

        // Fetch target week and insert
        const targetSchedule = await schoolWorkScheduleService.getSchedule(formWeekNumber, selectedYear, selectedDeptId);
        const targetDays = targetSchedule.days.map((day, dIdx) => {
          if (dIdx === formDayIndex) {
            const mTasks = [...day.morning_tasks];
            const aTasks = [...day.afternoon_tasks];
            if (formTimeSlot === 'morning') {
              mTasks.push(updatedTask);
            } else {
              aTasks.push(updatedTask);
            }
            return {
              ...day,
              morning_tasks: mTasks,
              afternoon_tasks: aTasks,
              completion_date: formCompletionDate.trim() || day.completion_date,
              duty_evaluator: formLeaderInCharge.trim() || day.duty_evaluator
            };
          }
          return day;
        });

        const updatedTargetSchedule: SchoolWorkSchedule = {
          ...targetSchedule,
          days: targetDays,
          updated_at: new Date().toISOString()
        };
        await schoolWorkScheduleService.saveSchedule(updatedTargetSchedule);
        showToast(`Đã chuyển công việc sang Tuần ${formWeekNumber} thành công!`);
      }

      setEditingItem(null);
    } catch (e) {
      console.error('Error saving item:', e);
      showToast('Lỗi khi lưu công việc vào cơ sở dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  // Mở modal xác nhận xóa 1 công việc
  const handleOpenDeleteSingle = (
    dayId: string,
    dayName: string,
    dateStr: string,
    timeSlot: 'morning' | 'afternoon',
    task: SchoolWorkItem,
    dutyEvaluator?: string
  ) => {
    const hasEvaluation = Boolean(
      (task.status && task.status !== 'Chưa thực hiện') ||
      task.leaderInCharge ||
      dutyEvaluator
    );
    const perm = checkCanDeleteScheduleTask(user, currentScope, selectedDeptId, hasEvaluation);
    if (!perm.canDelete) {
      showToast(perm.reason || 'Bạn không có quyền xóa công việc này.');
      return;
    }

    setDeletingTaskInfo({
      dayId,
      dayName,
      dateStr,
      timeSlot,
      taskItem: task,
      dutyEvaluator
    });
  };

  // Xác nhận xóa 1 công việc
  const handleConfirmDeleteSingleTask = async () => {
    if (!schedule || !deletingTaskInfo) return;
    setIsDeleting(true);
    try {
      // 1. Gọi backend API để xác thực quyền phía server (403 nếu vi phạm)
      try {
        const resp = await fetch('/api/schedules/delete-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user,
            scope: currentScope,
            departmentId: selectedDeptId,
            taskId: deletingTaskInfo.taskItem.id,
            taskContent: deletingTaskInfo.taskItem.content,
            dayName: deletingTaskInfo.dayName
          })
        });
        if (resp.status === 403) {
          const errData = await resp.json().catch(() => ({}));
          showToast(errData.error || '403 Forbidden: Không có quyền xóa lịch giao việc.');
          setDeletingTaskInfo(null);
          return;
        }
      } catch (apiErr) {
        console.warn('Backend API notification warning:', apiErr);
      }

      // 2. Xóa khỏi database qua service và ghi Audit Log
      const { updatedSchedule } = await schoolWorkScheduleService.deleteTaskItem(
        schedule,
        deletingTaskInfo.dayId,
        deletingTaskInfo.timeSlot,
        deletingTaskInfo.taskItem.id,
        user
      );

      setSchedule(updatedSchedule);
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(deletingTaskInfo.taskItem.id);
        return next;
      });
      setDeletingTaskInfo(null);
      showToast('Đã xóa lịch giao việc thành công.');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Không thể xóa lịch giao việc. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Chọn / bỏ chọn công việc để xóa hàng loạt
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Chọn tất cả công việc trong tuần
  const handleSelectAllTasks = () => {
    if (!schedule) return;
    const allIds = new Set<string>();
    schedule.days.forEach(d => {
      d.morning_tasks.forEach(t => allIds.add(t.id));
      d.afternoon_tasks.forEach(t => allIds.add(t.id));
    });
    setSelectedTaskIds(allIds);
  };

  // Bỏ chọn tất cả
  const handleDeselectAllTasks = () => {
    setSelectedTaskIds(new Set());
  };

  // Lấy chi tiết các công việc đã chọn để hiển thị trong modal xóa hàng loạt
  const selectedTasksDetails = useMemo(() => {
    if (!schedule || selectedTaskIds.size === 0) return [];
    const list: {
      dayId: string;
      dayName: string;
      dateStr: string;
      timeSlot: 'morning' | 'afternoon';
      itemId: string;
      content: string;
      hasEvaluation?: boolean;
    }[] = [];

    schedule.days.forEach(day => {
      day.morning_tasks.forEach(t => {
        if (selectedTaskIds.has(t.id)) {
          list.push({
            dayId: day.id,
            dayName: day.day_of_week,
            dateStr: day.date_str || day.date,
            timeSlot: 'morning',
            itemId: t.id,
            content: t.content,
            hasEvaluation: Boolean((t.status && t.status !== 'Chưa thực hiện') || t.leaderInCharge)
          });
        }
      });

      day.afternoon_tasks.forEach(t => {
        if (selectedTaskIds.has(t.id)) {
          list.push({
            dayId: day.id,
            dayName: day.day_of_week,
            dateStr: day.date_str || day.date,
            timeSlot: 'afternoon',
            itemId: t.id,
            content: t.content,
            hasEvaluation: Boolean((t.status && t.status !== 'Chưa thực hiện') || t.leaderInCharge)
          });
        }
      });
    });

    return list;
  }, [schedule, selectedTaskIds]);

  // Xác nhận xóa hàng loạt
  const handleConfirmBatchDelete = async () => {
    if (!schedule || selectedTasksDetails.length === 0) return;
    setIsDeleting(true);
    try {
      try {
        const resp = await fetch('/api/schedules/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user,
            scope: currentScope,
            departmentId: selectedDeptId,
            count: selectedTasksDetails.length
          })
        });
        if (resp.status === 403) {
          const errData = await resp.json().catch(() => ({}));
          showToast(errData.error || '403 Forbidden: Không có quyền xóa lịch giao việc.');
          setIsBatchDeleteModalOpen(false);
          return;
        }
      } catch (e) {}

      const itemsToDelete = selectedTasksDetails.map(t => ({
        dayId: t.dayId,
        timeSlot: t.timeSlot,
        itemId: t.itemId
      }));

      const { updatedSchedule, deletedCount } = await schoolWorkScheduleService.deleteBatchTaskItems(
        schedule,
        itemsToDelete,
        user
      );

      setSchedule(updatedSchedule);
      setSelectedTaskIds(new Set());
      setIsBatchDeleteModalOpen(false);
      showToast(`Đã xóa thành công ${deletedCount} công việc.`);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Không thể xóa các công việc đã chọn. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xác nhận xóa toàn bộ lịch tuần
  const handleConfirmDeleteEntireWeek = async () => {
    if (!schedule) return;
    setIsDeleting(true);
    try {
      try {
        const resp = await fetch('/api/schedules/delete-week', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user,
            weekNumber: schedule.week_number,
            confirmationPhrase: 'XÓA LỊCH TUẦN'
          })
        });
        if (resp.status === 403) {
          const errData = await resp.json().catch(() => ({}));
          showToast(errData.error || '403 Forbidden: Không có quyền xóa toàn bộ lịch tuần.');
          setIsDeleteWeekModalOpen(false);
          return;
        }
      } catch (e) {}

      const updated = await schoolWorkScheduleService.deleteEntireWeek(schedule, user);
      setSchedule(updated);
      setSelectedTaskIds(new Set());
      setIsDeleteWeekModalOpen(false);
      showToast(`Đã xóa toàn bộ lịch Tuần ${schedule.week_number} thành công.`);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Không thể xóa lịch tuần. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Update field of day (completion_date, duty_evaluator)
  const handleUpdateDayField = (dayId: string, field: 'completion_date' | 'duty_evaluator', val: string) => {
    if (!schedule) return;
    const newDays = schedule.days.map(d => {
      if (d.id === dayId) {
        return { ...d, [field]: val };
      }
      return d;
    });
    const updated = { ...schedule, days: newDays, updated_at: new Date().toISOString() };
    setSchedule(updated);
    schoolWorkScheduleService.saveSchedule(updated);
  };

  // Export Word
  const handleExportWord = async () => {
    if (!schedule) return;
    try {
      await exportSchoolWorkScheduleToWord(schedule);
      showToast('Đã xuất file Word (.docx) thành công!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi xuất file Word');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!schedule) return;
    try {
      const dataRows: any[] = [
        ['TRƯỜNG THPT MINH HÒA'],
        [`TỔ: ${schedule.department_name}`],
        [`TUẦN: ${schedule.week_number}`],
        [`(Từ ngày ${currentWeekInfo.startDateStr} đến ngày ${currentWeekInfo.endDateStr} năm 2026)`],
        [],
        ['Thứ, ngày', 'Sáng - Nội dung công việc', 'Chiều - Nội dung công việc', 'Ngày hoàn thành', 'Lãnh đạo trực/đánh giá']
      ];

      schedule.days.forEach(day => {
        const morningText = day.morning_tasks.map(t => `- ${t.content}${t.assignee ? ` (${t.assignee})` : ''}`).join('\n');
        const afternoonText = day.afternoon_tasks.map(t => `- ${t.content}${t.assignee ? ` (${t.assignee})` : ''}`).join('\n');
        dataRows.push([
          `${day.day_of_week} (${day.date_str})`,
          morningText || '—',
          afternoonText || '—',
          day.completion_date || day.date_str || '',
          day.duty_evaluator || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'LichCongViec');
      XLSX.writeFile(wb, `Lich_Cong_Viec_Tuan_${schedule.week_number}_THPT_Minh_Hoa.xlsx`);
      showToast('Đã xuất file Excel thành công!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi xuất file Excel');
    }
  };

  // Format date range text
  const dateRangeSubtitle = `(Từ ngày ${currentWeekInfo.startDateStr} đến ngày ${currentWeekInfo.endDateStr} năm 2026)`;

  const dayNamesList = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Hoàn thành tốt':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">⭐ Hoàn thành tốt</span>;
      case 'Hoàn thành':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300">✓ Hoàn thành</span>;
      case 'Đang thực hiện':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">⏳ Đang thực hiện</span>;
      case 'Quá hạn':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">⚠ Quá hạn</span>;
      case 'Không thực hiện':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300">✕ Không thực hiện</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">⏸ Chưa thực hiện</span>;
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1550px] mx-auto space-y-6 pb-20 font-sans">
      <div className="flex items-center justify-between no-print">
        <BackButton />
        {canEdit && (
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
            <span>🛡️ Quyền quản lý:</span>
            <span className="font-extrabold text-blue-700">
              {isPrincipalOrVice ? 'Ban Giám hiệu / Hiệu trưởng' : isHead ? 'Tổ trưởng chuyên môn' : 'Quản trị viên'}
            </span>
          </div>
        )}
      </div>

      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP CONTROL TOOLBAR */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-[24px] shadow-xl border border-blue-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
          {/* Dropdown Năm học */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Năm học:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-xs"
            >
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y} className="text-slate-900 bg-white font-semibold">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Tuần */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap flex items-center gap-1">
              <span>📅</span> Tuần:
            </span>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              className="bg-white text-slate-900 font-black rounded-xl px-3.5 py-2 text-xs sm:text-sm shadow-md border-2 border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              {allWeeks.map(w => (
                <option key={w.weekNumber} value={w.weekNumber} className="text-slate-900 font-bold">
                  {w.weekLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Chọn Tổ / Toàn trường */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap flex items-center gap-1">
              <Building2 size={15} /> Tổ/Đơn vị:
            </span>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-xs max-w-[220px]"
            >
              {allDepartments.map(d => (
                <option key={d.id} value={d.id} className="text-slate-900 bg-white font-semibold">
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsWordImportOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
                title="Tải lên và nhập dữ liệu lịch công việc từ file Word (.docx)"
              >
                <Upload size={16} />
                <span>Tải file từ Word</span>
              </button>

              <button
                type="button"
                onClick={handleResetToSample}
                disabled={saving}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Nạp lại nội dung công việc mẫu chuẩn THPT Minh Hòa"
              >
                <Sparkles size={16} />
                <span>Nạp Mẫu Chuẩn Trường</span>
              </button>
            </>
          )}

          {/* Nút Xem Nhật Ký Xóa (Audit Log) */}
          <button
            type="button"
            onClick={() => setIsAuditLogModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-slate-600"
            title="Xem lịch sử xóa lịch giao việc (Audit Log)"
          >
            <History size={16} />
            <span>Nhật ký xóa</span>
          </button>

          {/* Nút Xóa Cả Tuần (Dành riêng cho Admin / Hiệu trưởng) */}
          {canDeleteWeekInView && (
            <button
              type="button"
              onClick={() => setIsDeleteWeekModalOpen(true)}
              className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-rose-800/80"
              title="Xóa toàn bộ các công việc trong tuần này (Yêu cầu xác nhận 2 bước)"
            >
              <AlertOctagon size={16} className="text-rose-400" />
              <span>Xóa lịch cả tuần</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportWord}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-blue-400/40"
            title="Xuất lịch công việc ra file Word (.docx) đúng theo mẫu"
          >
            <FileText size={16} />
            <span>Xuất Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-400/40"
            title="Xuất lịch công việc ra file Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-600 transition-colors cursor-pointer"
            title="In lịch công việc"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-lg p-6 sm:p-10 space-y-6 text-slate-900 print:p-0 print:border-none print:shadow-none">
        {/* 1. DOCUMENT HEADER */}
        <div className="border-b border-slate-200 pb-5 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                {SCHOOL_NAME_UPPER}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                  TỔ:
                </span>
                <span className="text-xs sm:text-sm font-black text-blue-900 uppercase tracking-wide bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {schedule?.department_name || 'TOÀN TRƯỜNG'}
                </span>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto">
              <span className="text-base sm:text-lg font-black text-slate-900 uppercase block tracking-wide">
                TUẦN: {selectedWeek}
              </span>
              <span className="text-xs sm:text-sm font-semibold italic text-slate-600 block mt-0.5">
                {dateRangeSubtitle}
              </span>
            </div>
          </div>
        </div>

        {/* 2. OFFICIAL WORK SCHEDULE TABLE (ĐÚNG 5 CỘT THEO FILE GỬI KÈM - KẺ Ô RÕ NÉT) */}
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-800 shadow-md">
          <table className="w-full border-collapse text-left text-xs sm:text-sm border border-slate-800">
            <thead>
              {/* Header Row 1 */}
              <tr className="bg-slate-200 border-b-2 border-slate-800 text-slate-950 text-center font-black">
                <th rowSpan={2} className="py-3 px-3 border border-slate-800 w-28 sm:w-32 bg-slate-200 align-middle uppercase tracking-wider text-xs sm:text-[13px]">
                  Thứ, ngày
                </th>
                <th className="py-2.5 px-4 border border-slate-800 min-w-[280px] bg-slate-200 text-center uppercase tracking-wider text-xs sm:text-[13px]">
                  Sáng
                </th>
                <th className="py-2.5 px-4 border border-slate-800 min-w-[260px] bg-slate-200 text-center uppercase tracking-wider text-xs sm:text-[13px]">
                  Chiều
                </th>
                <th rowSpan={2} className="py-3 px-3 border border-slate-800 w-32 sm:w-36 text-center bg-slate-200 align-middle uppercase tracking-wider text-xs sm:text-[13px]">
                  Ngày hoàn thành
                </th>
                <th rowSpan={2} className="py-3 px-3.5 border border-slate-800 min-w-[220px] text-center bg-slate-200 align-middle uppercase tracking-wider text-xs sm:text-[13px] leading-snug">
                  Lãnh đạo<br />trực/đánh giá
                </th>
              </tr>
              {/* Header Row 2 (Subheader: Nội dung công việc) */}
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-800 text-xs italic">
                <th className="py-1.5 px-4 border border-slate-800 text-center font-bold">
                  Nội dung công việc
                </th>
                <th className="py-1.5 px-4 border border-slate-800 text-center font-bold">
                  Nội dung công việc
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic border border-slate-700">
                    Đang tải lịch công việc...
                  </td>
                </tr>
              ) : !schedule || schedule.days.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic border border-slate-700">
                    Chưa có dữ liệu lịch công việc cho tuần này.
                  </td>
                </tr>
              ) : (
                schedule.days.map((day, dIdx) => {
                  return (
                    <tr key={day.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* CỘT 1: THỨ, NGÀY */}
                      <td className="py-3.5 px-3 border border-slate-700 text-center font-bold align-middle bg-slate-50/80">
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-black text-slate-900 block">
                            {day.day_of_week}
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-slate-600 block">
                            ({day.date_str})
                          </span>
                        </div>
                      </td>

                      {/* CỘT 2: SÁNG - NỘI DUNG CÔNG VIỆC */}
                      <td className="py-3 px-4 border border-slate-700 align-top">
                        <div className="space-y-2.5">
                          {day.morning_tasks.length === 0 ? (
                            <div className="text-slate-400 text-xs italic py-1">
                              —
                            </div>
                          ) : (
                            day.morning_tasks.map((task) => (
                              <div
                                key={task.id}
                                className="group relative p-3 rounded-xl bg-slate-50 hover:bg-blue-50/90 border border-slate-300 hover:border-blue-300 transition-all text-xs space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-wrap break-words flex-1">
                                    • {task.content}
                                  </p>

                                  {/* ACTION BUTTONS (CHO PHÉP SỬA VÀ XÓA CÔNG VIỆC) */}
                                  <div className="flex items-center gap-1.5 no-print shrink-0">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => openEditTaskModal(day.id, dIdx, 'morning', task)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Nhấn để sửa thông tin công việc này"
                                      >
                                        <Edit2 size={12} />
                                        <span>Sửa</span>
                                      </button>
                                    )}
                                    {canDeleteInView && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDeleteSingle(day.id, day.day_of_week, day.date_str || day.date, 'morning', task, day.duty_evaluator)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Xóa công việc này khỏi lịch giao việc"
                                      >
                                        <Trash2 size={12} />
                                        <span>Xóa</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {getStatusBadge(task.status)}

                                  {task.assignee && (
                                    <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                      👤 {task.assignee}
                                    </span>
                                  )}

                                  {task.leaderInCharge && (
                                    <span className="text-[10.5px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      👑 LĐ: {task.leaderInCharge}
                                    </span>
                                  )}

                                  {task.note && (
                                    <span className="text-[10.5px] italic text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      📝 {task.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openAddTaskModal(day.id, dIdx, 'morning')}
                              className="text-[11.5px] font-black text-blue-700 hover:text-blue-900 flex items-center gap-1.5 hover:underline pt-1 no-print cursor-pointer bg-blue-50/50 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 w-full justify-center transition-colors"
                            >
                              <Plus size={14} /> Thêm việc buổi sáng
                            </button>
                          )}
                        </div>
                      </td>

                      {/* CỘT 3: CHIỀU - NỘI DUNG CÔNG VIỆC */}
                      <td className="py-3 px-4 border border-slate-700 align-top">
                        <div className="space-y-2.5">
                          {day.afternoon_tasks.length === 0 ? (
                            <div className="text-slate-400 text-xs italic py-1">
                              —
                            </div>
                          ) : (
                            day.afternoon_tasks.map((task) => (
                              <div
                                key={task.id}
                                className="group relative p-3 rounded-xl bg-slate-50 hover:bg-blue-50/90 border border-slate-300 hover:border-blue-300 transition-all text-xs space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-wrap break-words flex-1">
                                    • {task.content}
                                  </p>

                                  {/* ACTION BUTTONS (CHO PHÉP SỬA VÀ XÓA CÔNG VIỆC) */}
                                  <div className="flex items-center gap-1.5 no-print shrink-0">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => openEditTaskModal(day.id, dIdx, 'afternoon', task)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Nhấn để sửa thông tin công việc này"
                                      >
                                        <Edit2 size={12} />
                                        <span>Sửa</span>
                                      </button>
                                    )}
                                    {canDeleteInView && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDeleteSingle(day.id, day.day_of_week, day.date_str || day.date, 'afternoon', task, day.duty_evaluator)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Xóa công việc này khỏi lịch giao việc"
                                      >
                                        <Trash2 size={12} />
                                        <span>Xóa</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {getStatusBadge(task.status)}

                                  {task.assignee && (
                                    <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                      👤 {task.assignee}
                                    </span>
                                  )}

                                  {task.leaderInCharge && (
                                    <span className="text-[10.5px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      👑 LĐ: {task.leaderInCharge}
                                    </span>
                                  )}

                                  {task.note && (
                                    <span className="text-[10.5px] italic text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      📝 {task.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openAddTaskModal(day.id, dIdx, 'afternoon')}
                              className="text-[11.5px] font-black text-blue-700 hover:text-blue-900 flex items-center gap-1.5 hover:underline pt-1 no-print cursor-pointer bg-blue-50/50 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 w-full justify-center transition-colors"
                            >
                              <Plus size={14} /> Thêm việc buổi chiều
                            </button>
                          )}
                        </div>
                      </td>

                      {/* CỘT 4: NGÀY HOÀN THÀNH */}
                      <td className="py-3 px-3 border border-slate-700 text-center align-middle bg-slate-50/30">
                        {canEdit ? (
                          <input
                            type="text"
                            value={day.completion_date || ''}
                            onChange={e => handleUpdateDayField(day.id, 'completion_date', e.target.value)}
                            placeholder={day.date_str}
                            className="w-full text-center text-xs sm:text-sm font-bold text-slate-900 border border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:bg-white rounded-lg px-2 py-1.5 transition-all outline-none"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {day.completion_date || day.date_str || '—'}
                          </span>
                        )}
                      </td>

                      {/* CỘT 5: LÃNH ĐẠO TRỰC/ĐÁNH GIÁ (NHẬN XÉT, ĐÁNH GIÁ CỦA LÃNH ĐẠO) */}
                      <td className="py-3 px-3.5 border border-slate-700 align-top bg-amber-50/20">
                        {canEdit ? (
                          <div className="space-y-2">
                            <AutoResizeTextarea
                              minHeight={64}
                              value={day.duty_evaluator || ''}
                              onChange={e => handleUpdateDayField(day.id, 'duty_evaluator', e.target.value)}
                              placeholder="Nhập nhận xét đánh giá của lãnh đạo..."
                              className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:border-amber-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 rounded-xl p-2.5 transition-all outline-none leading-relaxed"
                            />

                            {/* Gợi ý đánh giá nhanh */}
                            <div className="flex flex-wrap gap-1 no-print pt-0.5">
                              {[
                                'Hoàn thành tốt ⭐',
                                'Đạt yêu cầu ✓',
                                'Đang thực hiện ⏳',
                                'Cần đôn đốc ⚠'
                              ].map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    const current = (day.duty_evaluator || '').trim();
                                    const next = current ? `${current}. ${tag}` : tag;
                                    handleUpdateDayField(day.id, 'duty_evaluator', next);
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                                  title={`Thêm nhận xét: ${tag}`}
                                >
                                  + {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-800 italic leading-relaxed whitespace-pre-wrap break-words">
                            {day.duty_evaluator ? (
                              <span className="text-amber-950 font-bold">"{day.duty_evaluator}"</span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa có nhận xét đánh giá</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHỈNH SỬA / THÊM CÔNG VIỆC ĐẦY ĐỦ CÁC TRƯỜNG */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Edit2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingItem.item ? '✏️ Chỉnh sửa công việc trong lịch' : '➕ Thêm công việc mới'}
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Cập nhật chi tiết ngày, buổi, nội dung, người thực hiện và tiến độ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Ngày/Thứ + Tuần + Buổi Sáng/Chiều */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ngày / Thứ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CalendarDays size={14} className="text-blue-600" />
                    <span>Ngày / Thứ <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={formDayIndex}
                    onChange={e => setFormDayIndex(Number(e.target.value))}
                    className="w-full p-2.5 text-xs sm:text-sm font-bold text-slate-900 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    {dayNamesList.map((dName, idx) => {
                      const dayObj = schedule?.days[idx];
                      return (
                        <option key={dName} value={idx}>
                          {dName} {dayObj?.date_str ? `(${dayObj.date_str})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tuần */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>📅</span>
                    <span>Tuần <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={formWeekNumber}
                    onChange={e => setFormWeekNumber(Number(e.target.value))}
                    className="w-full p-2.5 text-xs sm:text-sm font-bold text-slate-900 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    {allWeeks.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        {w.weekLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buổi Sáng / Chiều */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    {formTimeSlot === 'morning' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-500" />}
                    <span>Buổi thực hiện <span className="text-rose-500">*</span></span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFormTimeSlot('morning')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formTimeSlot === 'morning'
                          ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sun size={13} /> Sáng
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTimeSlot('afternoon')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formTimeSlot === 'afternoon'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Moon size={13} /> Chiều
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Nội dung công việc (Bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Nội dung công việc <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] font-normal text-slate-400">Có thể xuống dòng nhiều ý</span>
                </label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Nhập chi tiết nội dung công việc phân công..."
                  className="w-full p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Row 3: Người/bộ phận thực hiện */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Người / Bộ phận thực hiện
                </label>
                <input
                  type="text"
                  value={formAssignee}
                  onChange={e => setFormAssignee(e.target.value)}
                  placeholder="VD: Toàn thể CBGVNV / BGH, Đoàn trường / Tổ Toán - Lý / Lớp 12C..."
                  className="w-full p-2.5 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                />
                {/* Gợi ý người thực hiện */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    'Toàn thể CBGVNV',
                    'BGH, Đoàn trường',
                    'Tổ Toán - Công Nghệ',
                    'Tổ Văn - Sử - Địa- GDKT',
                    'Tổ Lý - Hóa- Sinh',
                    'Tổ Ngoại ngữ - Tin học– GDTC- GDQP&AN',
                    'Tổ Văn phòng',
                    'GVCN 12C'
                  ].map(assigneeTag => (
                    <button
                      key={assigneeTag}
                      type="button"
                      onClick={() => setFormAssignee(assigneeTag)}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded-md border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {assigneeTag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Ngày hoàn thành & Lãnh đạo phụ trách/trực */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ngày hoàn thành */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày hoàn thành
                  </label>
                  <input
                    type="text"
                    value={formCompletionDate}
                    onChange={e => setFormCompletionDate(e.target.value)}
                    placeholder="VD: 21/09/2026 hoặc 21/09"
                    className="w-full p-2.5 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Lãnh đạo phụ trách / trực */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lãnh đạo phụ trách / Trực
                  </label>
                  <input
                    type="text"
                    value={formLeaderInCharge}
                    onChange={e => setFormLeaderInCharge(e.target.value)}
                    placeholder="VD: Hiệu trưởng / Phó Hiệu trưởng / Đ/c Nam..."
                    className="w-full p-2.5 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Trạng thái & Ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái công việc
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="Chưa thực hiện">Chưa thực hiện</option>
                    <option value="Đang thực hiện">Đang thực hiện ⏳</option>
                    <option value="Hoàn thành">Hoàn thành ✓</option>
                    <option value="Hoàn thành tốt">Hoàn thành tốt ⭐</option>
                    <option value="Quá hạn">Quá hạn ⚠</option>
                    <option value="Không thực hiện">Không thực hiện ✕</option>
                  </select>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ghi chú / Yêu cầu thêm
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={e => setFormNote(e.target.value)}
                    placeholder="Ghi chú thêm về yêu cầu hoặc lưu ý..."
                    className="w-full p-2.5 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveItem}
                disabled={saving || !formContent.trim()}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer font-sans"
              >
                <Save size={16} />
                <span>{editingItem.item ? 'Lưu thay đổi' : 'Tạo công việc'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẢI TỪ FILE WORD */}
      <SchoolScheduleWordImportModal
        isOpen={isWordImportOpen}
        onClose={() => setIsWordImportOpen(false)}
        currentWeek={selectedWeek}
        currentYear={selectedYear}
        currentDeptId={selectedDeptId}
        onImportSuccess={async (imported) => {
          setSchedule(imported);
          setSelectedWeek(imported.week_number);
          await schoolWorkScheduleService.saveSchedule(imported);
          showToast(`Đã tải và áp dụng lịch công việc từ file Word thành công (Tuần ${imported.week_number})!`);
        }}
      />

      {/* MODAL XÁC NHẬN XÓA 1 CÔNG VIỆC */}
      {deletingTaskInfo && (
        <DeleteScheduleConfirmModal
          isOpen={Boolean(deletingTaskInfo)}
          onClose={() => setDeletingTaskInfo(null)}
          onConfirm={handleConfirmDeleteSingleTask}
          taskItem={deletingTaskInfo.taskItem}
          dayName={deletingTaskInfo.dayName}
          dateStr={deletingTaskInfo.dateStr}
          timeSlot={deletingTaskInfo.timeSlot}
          dutyEvaluator={deletingTaskInfo.dutyEvaluator}
          isSubmitting={isDeleting}
        />
      )}

      {/* MODAL XÓA HÀNG LOẠT CÔNG VIỆC */}
      {isBatchDeleteModalOpen && selectedTasksDetails.length > 0 && (
        <BatchDeleteConfirmModal
          isOpen={isBatchDeleteModalOpen}
          onClose={() => setIsBatchDeleteModalOpen(false)}
          onConfirm={handleConfirmBatchDelete}
          items={selectedTasksDetails}
          isSubmitting={isDeleting}
        />
      )}

      {/* MODAL XÓA TOÀN BỘ LỊCH CẢ TUẦN */}
      {isDeleteWeekModalOpen && schedule && (
        <DeleteWeekConfirmModal
          isOpen={isDeleteWeekModalOpen}
          onClose={() => setIsDeleteWeekModalOpen(false)}
          onConfirm={handleConfirmDeleteEntireWeek}
          weekNumber={selectedWeek}
          departmentName={schedule.department_name || 'Toàn trường'}
          isSubmitting={isDeleting}
        />
      )}

      {/* MODAL NHẬT KÝ XÓA (AUDIT LOG) */}
      <ScheduleAuditLogModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
      />
    </div>
  );
}
