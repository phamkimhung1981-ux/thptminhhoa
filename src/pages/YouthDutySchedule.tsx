import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useAppContext } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import {
  Calendar,
  CalendarDays,
  Plus,
  FileText,
  Download,
  Printer,
  Copy,
  Edit2,
  Trash2,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Users,
  Shield,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  YouthDutySchedule,
  YouthDutyTaskConfig,
  YouthDutyMetadata,
  DayOfWeekName
} from '../types/youthDuty';
import { youthDutyService } from '../services/youthDutyService';
import {
  downloadSampleDutyDocx,
  exportDutyScheduleToWord
} from '../utils/youthDutyDocxExport';
import { ACADEMIC_YEARS, getAllWeeksInYear } from '../utils/schoolWeekUtils';

const DAYS_OF_WEEK: { label: DayOfWeekName; num: number }[] = [
  { label: 'Thứ 2', num: 2 },
  { label: 'Thứ 3', num: 3 },
  { label: 'Thứ 4', num: 4 },
  { label: 'Thứ 5', num: 5 },
  { label: 'Thứ 6', num: 6 },
  { label: 'Thứ 7', num: 7 },
  { label: 'Chủ nhật', num: 8 }
];

export default function YouthDutySchedulePage() {
  const { user } = useAuth();
  const { teachers } = useAppContext();
  const printRef = useRef<HTMLDivElement>(null);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('2026–2027');
  const [weekFilterMode, setWeekFilterMode] = useState<'range' | 'single' | 'all'>('range');
  const [selectedFromWeek, setSelectedFromWeek] = useState<number>(2);
  const [selectedToWeek, setSelectedToWeek] = useState<number>(4);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Core Data States
  const [schedules, setSchedules] = useState<YouthDutySchedule[]>([]);
  const [taskConfigs, setTaskConfigs] = useState<YouthDutyTaskConfig[]>([]);
  const [metadata, setMetadata] = useState<YouthDutyMetadata>({
    academicYear: '2026–2027',
    organizationName: 'ĐOÀN TRƯỜNG THPT SƠN LƯƠNG',
    parentOrganizationName: 'ĐOÀN XÃ SƠN LƯƠNG',
    unionTitle: 'ĐOÀN TNCS HỒ CHÍ MINH',
    locationDate: 'Sơn Lương, ngày 17 tháng 09 năm 2026',
    secretaryName: 'Phan Thị Lan Phương',
    secretaryTitle: 'Bí Thư',
    partyCommitteeTitle: 'Xác nhận của Ban Chi Ủy'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<YouthDutySchedule | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<YouthDutySchedule | null>(null);

  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState<boolean>(false);
  const [copySourceWeek, setCopySourceWeek] = useState<number>(2);
  const [copyTargetWeek, setCopyTargetWeek] = useState<number>(3);
  const [copyOverwrite, setCopyOverwrite] = useState<boolean>(false);

  const [isTaskConfigModalOpen, setIsTaskConfigModalOpen] = useState<boolean>(false);
  const [newTaskName, setNewTaskName] = useState<string>('');

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);

  // Schedule Form State
  const [formAcademicYear, setFormAcademicYear] = useState<string>('2026–2027');
  const [formWeekNumber, setFormWeekNumber] = useState<number>(2);
  const [formToWeekNumber, setFormToWeekNumber] = useState<number>(4);
  const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeekName>('Thứ 2');
  const [formMorningTasks, setFormMorningTasks] = useState<string[]>([]);
  const [formAfternoonTasks, setFormAfternoonTasks] = useState<string[]>([]);
  const [formAssignedPeople, setFormAssignedPeople] = useState<string>('Đ/c Phương + Đội cờ đỏ, TNXK');
  const [formNotes, setFormNotes] = useState<string>('Lưu ý các lớp có học sinh ăn quà vặt trong lớp');
  const [customMorningTaskInput, setCustomMorningTaskInput] = useState<string>('');
  const [customAfternoonTaskInput, setCustomAfternoonTaskInput] = useState<string>('');

  // Weeks list
  const allWeeks = useMemo(() => getAllWeeksInYear(selectedYear), [selectedYear]);

  // Effective user role & permissions
  const userRole = (user?.role || '').toUpperCase();
  const userPos = (user?.position || '').toUpperCase();
  const canEdit =
    user?.id === 'admin' ||
    userRole === 'ADMIN' ||
    userRole === 'QUAN_TRI' ||
    userRole.includes('HIỆU TRƯỞNG') ||
    userRole.includes('BGH') ||
    userRole.includes('ĐOÀN') ||
    userRole.includes('BI_THU') ||
    userPos.includes('BÍ THƯ') ||
    userRole.includes('CÁN BỘ') ||
    userRole.includes('GIAO_VIEN');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load
  const loadData = async () => {
    try {
      setLoading(true);
      await youthDutyService.seedIfEmpty();

      const [schedList, tasks, meta] = await Promise.all([
        youthDutyService.getSchedules(
          selectedYear,
          weekFilterMode === 'all' ? 0 : selectedFromWeek,
          weekFilterMode === 'range' ? selectedToWeek : selectedFromWeek
        ),
        youthDutyService.getTaskConfigs(),
        youthDutyService.getMetadata(selectedYear)
      ]);

      setSchedules(schedList);
      setTaskConfigs(tasks);
      setMetadata(meta);
    } catch (e) {
      console.error(e);
      showToast('Đã tải dữ liệu lịch trực Đoàn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, weekFilterMode, selectedFromWeek, selectedToWeek]);

  // Derived Title for current view
  const currentWeekRangeLabel = useMemo(() => {
    if (weekFilterMode === 'all') return 'TẤT CẢ CÁC TUẦN';
    if (weekFilterMode === 'range' && selectedFromWeek !== selectedToWeek) {
      return `TỪ TUẦN ${String(selectedFromWeek).padStart(2, '0')} ĐẾN TUẦN ${selectedToWeek}`;
    }
    return `TUẦN ${String(selectedFromWeek).padStart(2, '0')}`;
  }, [weekFilterMode, selectedFromWeek, selectedToWeek]);

  // 2. Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setFormAcademicYear(selectedYear);
    setFormWeekNumber(selectedFromWeek);
    setFormToWeekNumber(weekFilterMode === 'range' ? selectedToWeek : selectedFromWeek);
    setFormDayOfWeek('Thứ 2');

    // Default tasks pre-selected
    const defaultTasks = taskConfigs.map(t => t.name);
    setFormMorningTasks(defaultTasks);
    setFormAfternoonTasks(defaultTasks);

    setFormAssignedPeople('Đ/c Phương + Đội cờ đỏ, TNXK');
    setFormNotes('Lưu ý các lớp có học sinh ăn quà vặt trong lớp');
    setCustomMorningTaskInput('');
    setCustomAfternoonTaskInput('');
    setIsScheduleModalOpen(true);
  };

  // 3. Open Edit Modal (loads exact scheduleId)
  const handleOpenEditModal = (sched: YouthDutySchedule) => {
    setEditingSchedule(sched);
    setFormAcademicYear(sched.academicYear || selectedYear);
    setFormWeekNumber(sched.weekNumber);
    setFormToWeekNumber(sched.toWeekNumber || sched.weekNumber);
    setFormDayOfWeek(sched.dayOfWeek);
    setFormMorningTasks([...sched.morningTasks]);
    setFormAfternoonTasks([...sched.afternoonTasks]);
    setFormAssignedPeople(sched.assignedPeople || '');
    setFormNotes(sched.notes || '');
    setCustomMorningTaskInput('');
    setCustomAfternoonTaskInput('');
    setIsScheduleModalOpen(true);
  };

  // 4. Save Schedule (Create or Update)
  const handleSaveSchedule = async () => {
    if (!formDayOfWeek) {
      showToast('Vui lòng chọn Thứ trong tuần');
      return;
    }

    const dayObj = DAYS_OF_WEEK.find(d => d.label === formDayOfWeek);
    const dayNum = dayObj ? dayObj.num : 2;

    // Check duplicate if creating new record
    if (!editingSchedule) {
      const isDuplicate = schedules.some(
        s =>
          s.academicYear === formAcademicYear &&
          s.weekNumber === formWeekNumber &&
          s.dayOfWeek === formDayOfWeek
      );
      if (isDuplicate) {
        if (!window.confirm(`Lịch trực cho ${formDayOfWeek} (Tuần ${formWeekNumber}) đã tồn tại trong danh sách. Bạn có muốn tiếp tục ghi đè/tạo mới không?`)) {
          return;
        }
      }
    }

    const scheduleData: YouthDutySchedule = {
      id: editingSchedule ? editingSchedule.id : '',
      academicYear: formAcademicYear,
      weekNumber: Number(formWeekNumber),
      toWeekNumber: formToWeekNumber && formToWeekNumber > formWeekNumber ? Number(formToWeekNumber) : undefined,
      dayOfWeek: formDayOfWeek,
      dayOfWeekNumber: dayNum,
      morningTasks: formMorningTasks.length > 0 ? formMorningTasks : ['Kiểm tra nền nếp học sinh'],
      afternoonTasks: formAfternoonTasks.length > 0 ? formAfternoonTasks : ['Kiểm tra nền nếp học sinh'],
      assignedPeople: formAssignedPeople.trim() || 'Cán bộ Đoàn + Đội Cờ đỏ',
      notes: formNotes.trim(),
      updatedByName: user?.name || 'Bí thư Đoàn',
      createdAt: editingSchedule?.createdAt || new Date().toISOString()
    };

    try {
      await youthDutyService.saveSchedule(scheduleData, userRole);
      showToast(editingSchedule ? 'Đã cập nhật lịch trực thành công!' : 'Đã tạo lịch trực mới thành công!');
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu lịch trực');
    }
  };

  // 5. Open Delete Modal
  const handleOpenDeleteModal = (sched: YouthDutySchedule) => {
    setScheduleToDelete(sched);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete (instant refresh without reload)
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      await youthDutyService.deleteSchedule(scheduleToDelete.id, userRole);
      showToast(`Đã xóa lịch trực ${scheduleToDelete.dayOfWeek} (Tuần ${scheduleToDelete.weekNumber})!`);
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa lịch trực');
    }
  };

  // 6. Copy Week Schedules
  const handleConfirmCopyWeek = async () => {
    if (copySourceWeek === copyTargetWeek) {
      showToast('Tuần nguồn và tuần đích phải khác nhau');
      return;
    }
    try {
      const count = await youthDutyService.copyWeekSchedules(
        copySourceWeek,
        copyTargetWeek,
        selectedYear,
        copyOverwrite
      );
      showToast(`Đã sao chép thành công ${count} lịch trực từ Tuần ${copySourceWeek} sang Tuần ${copyTargetWeek}!`);
      setIsCopyWeekModalOpen(false);
      setSelectedFromWeek(copyTargetWeek);
      setSelectedToWeek(copyTargetWeek);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi sao chép lịch');
    }
  };

  // 7. Export / Download Handlers
  const handleDownloadSampleDocx = async () => {
    try {
      await downloadSampleDutyDocx();
      showToast('Đang tải xuống file mẫu "PHÂN CÔNG TRỰC Đoàn.docx" chuẩn...');
    } catch (e) {
      alert('Lỗi khi tải file mẫu Word');
    }
  };

  const handleExportWord = async () => {
    try {
      await exportDutyScheduleToWord(
        schedules,
        metadata,
        weekFilterMode === 'all' ? undefined : selectedFromWeek,
        weekFilterMode === 'range' ? selectedToWeek : undefined,
        currentWeekRangeLabel
      );
      showToast('Đã xuất file Word (.docx) lịch trực Đoàn chuẩn mẫu thành công!');
    } catch (e) {
      alert('Lỗi khi xuất file Word');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 8. Task Config Add/Delete
  const handleAddTaskConfig = async () => {
    if (!newTaskName.trim()) return;
    const newTask: YouthDutyTaskConfig = {
      id: `task_${Date.now()}`,
      name: newTaskName.trim(),
      category: 'both',
      order: taskConfigs.length + 1,
      isDefault: false
    };
    await youthDutyService.saveTaskConfig(newTask);
    setNewTaskName('');
    const updated = await youthDutyService.getTaskConfigs();
    setTaskConfigs(updated);
    showToast('Đã thêm nội dung công việc trực mới!');
  };

  const handleDeleteTaskConfig = async (id: string) => {
    await youthDutyService.deleteTaskConfig(id);
    const updated = await youthDutyService.getTaskConfigs();
    setTaskConfigs(updated);
    showToast('Đã xóa nội dung công việc!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                📋 LỊCH TRỰC ĐOÀN THANH NIÊN
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Quản lý, phân công và xuất lịch trực Đoàn trường THPT Sơn Lương theo tuần
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 no-print">
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Tạo lịch trực</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadSampleDocx}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-2xl border border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
            title="Tải file Word mẫu gốc: PHÂN CÔNG TRỰC Đoàn.docx"
          >
            <FileText size={16} className="text-blue-600" />
            <span>Tải file mẫu</span>
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            title="Xuất bảng phân công hiện tại ra file Word (.docx)"
          >
            <Download size={16} />
            <span>Xuất Word</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-2xl border border-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
            title="In hoặc xuất PDF lịch trực"
          >
            <Printer size={16} />
            <span>In / PDF</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsCopyWeekModalOpen(true)}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold rounded-2xl border border-amber-200 transition-all flex items-center gap-2 cursor-pointer"
              title="Sao chép toàn bộ lịch tuần này sang tuần khác"
            >
              <Copy size={16} />
              <span>Sao chép tuần</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsTaskConfigModalOpen(true)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all cursor-pointer"
              title="Cấu hình danh mục công việc trực"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTERS CONTROL BAR */}
      <Card className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl shadow-md border-0 no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold">
            {/* Năm học */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold whitespace-nowrap">Năm học:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="bg-slate-800 text-amber-300 font-black px-3.5 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
              >
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y} className="text-slate-900 bg-white font-bold">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Chế độ lọc tuần */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setWeekFilterMode('range')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  weekFilterMode === 'range' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Khoảng tuần
              </button>
              <button
                type="button"
                onClick={() => setWeekFilterMode('single')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  weekFilterMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Một tuần
              </button>
              <button
                type="button"
                onClick={() => setWeekFilterMode('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  weekFilterMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Tất cả tuần
              </button>
            </div>

            {/* Từ tuần */}
            {weekFilterMode !== 'all' && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-300 font-bold whitespace-nowrap">
                  {weekFilterMode === 'range' ? 'Từ tuần:' : 'Tuần:'}
                </span>
                <select
                  value={selectedFromWeek}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSelectedFromWeek(val);
                    if (weekFilterMode === 'range' && val > selectedToWeek) {
                      setSelectedToWeek(val);
                    }
                  }}
                  className="bg-white text-slate-950 font-black px-3 py-1.5 rounded-xl border-2 border-amber-400 outline-none cursor-pointer shadow-xs"
                >
                  {allWeeks.map(w => (
                    <option key={w.weekNumber} value={w.weekNumber} className="text-slate-900 font-bold">
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Đến tuần */}
            {weekFilterMode === 'range' && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-300 font-bold whitespace-nowrap">Đến tuần:</span>
                <select
                  value={selectedToWeek}
                  onChange={e => setSelectedToWeek(Number(e.target.value))}
                  className="bg-white text-slate-950 font-black px-3 py-1.5 rounded-xl border-2 border-amber-400 outline-none cursor-pointer shadow-xs"
                >
                  {allWeeks.map(w => (
                    <option key={w.weekNumber} value={w.weekNumber} className="text-slate-900 font-bold">
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{viewMode === 'table' ? '📅 Dạng thẻ tuần' : '📋 Dạng bảng chuẩn Word'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </Card>

      {/* 3. MAIN SCHEDULE VIEW (PRINTABLE & WORD COMPLIANT LAYOUT) */}
      <div ref={printRef} className="space-y-6">
        {/* DOCUMENT CONTAINER */}
        <Card className="p-6 sm:p-10 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          {/* HEADER CƠ QUAN / ĐOÀN TN THEO FILE MẪU */}
          <div className="grid grid-cols-2 gap-4 items-start border-b border-slate-100 pb-4">
            <div className="text-center space-y-0.5">
              <p className="text-xs sm:text-sm text-slate-800 uppercase font-medium">
                {metadata.parentOrganizationName || 'ĐOÀN XÃ SƠN LƯƠNG'}
              </p>
              <p className="text-xs sm:text-sm text-slate-950 uppercase font-black tracking-tight">
                {metadata.organizationName || 'ĐOÀN TRƯỜNG THPT SƠN LƯƠNG'}
              </p>
              <div className="w-20 h-0.5 bg-slate-400 mx-auto mt-1"></div>
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-xs sm:text-sm text-slate-950 uppercase font-black tracking-tight">
                {metadata.unionTitle || 'ĐOÀN TNCS HỒ CHÍ MINH'}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 italic font-serif">
                {metadata.locationDate || 'Sơn Lương, ngày 17 tháng 09 năm 2026'}
              </p>
              <div className="w-20 h-0.5 bg-slate-400 mx-auto mt-1"></div>
            </div>
          </div>

          {/* TIÊU ĐỀ CHÍNH VĂN BẢN */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-serif">
              LỊCH PHÂN CÔNG TRỰC ĐOÀN TRƯỜNG THPT SƠN LƯƠNG
            </h2>
          </div>

          {/* TABLE VIEW (EXACT WORD TEMPLATE LAYOUT) */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-900 shadow-xs">
              <table className="w-full border-collapse text-left text-xs sm:text-sm font-serif">
                <thead>
                  {/* Row Header 1 */}
                  <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-center">
                    <th rowSpan={2} className="py-3 px-3 w-[80px] align-middle">
                      Thứ
                    </th>
                    <th colSpan={2} className="py-2.5 px-4 text-center">
                      Nội dung công việc
                    </th>
                    <th rowSpan={2} className="py-3 px-4 w-[200px] align-middle">
                      Người thực hiện
                    </th>
                    <th rowSpan={2} className="py-3 px-4 w-[200px] align-middle">
                      Ghi chú
                    </th>
                    <th rowSpan={2} className="py-3 px-3 w-[90px] align-middle no-print text-center">
                      Thao tác
                    </th>
                  </tr>
                  {/* Row Header 2 */}
                  <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-center">
                    <th className="py-2 px-3 w-[300px]">Sáng</th>
                    <th className="py-2 px-3 w-[300px]">Chiều</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900 bg-white">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                        <p className="font-bold text-sm">Chưa có lịch trực nào trong phạm vi tuần này.</p>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Tạo lịch trực ngay</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    schedules.map(sched => {
                      const dayDisplay = sched.dayOfWeek.replace(/^Thứ\s*/i, '');
                      return (
                        <tr
                          key={sched.id}
                          className="hover:bg-blue-50/30 transition-colors divide-x-2 divide-slate-900"
                        >
                          {/* Thứ */}
                          <td className="py-4 px-3 font-black text-slate-950 text-center align-middle text-base sm:text-lg">
                            {dayDisplay}
                          </td>

                          {/* Sáng */}
                          <td className="py-3.5 px-4 text-slate-800 align-top leading-relaxed text-xs sm:text-[13px]">
                            <ul className="space-y-1">
                              {sched.morningTasks && sched.morningTasks.length > 0 ? (
                                sched.morningTasks.map((t, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="font-bold text-slate-700">-</span>
                                    <span>{t.replace(/^[-•*]\s*/, '')}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400 italic">—</li>
                              )}
                            </ul>
                          </td>

                          {/* Chiều */}
                          <td className="py-3.5 px-4 text-slate-800 align-top leading-relaxed text-xs sm:text-[13px]">
                            <ul className="space-y-1">
                              {sched.afternoonTasks && sched.afternoonTasks.length > 0 ? (
                                sched.afternoonTasks.map((t, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="font-bold text-slate-700">-</span>
                                    <span>{t.replace(/^[-•*]\s*/, '')}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400 italic">—</li>
                              )}
                            </ul>
                          </td>

                          {/* Người thực hiện */}
                          <td className="py-4 px-4 font-bold text-slate-900 align-middle text-center">
                            {sched.assignedPeople || 'Đ/c Phương + Đội cờ đỏ, TNXK'}
                          </td>

                          {/* Ghi chú */}
                          <td className="py-4 px-4 font-bold text-slate-900 align-middle text-center">
                            {sched.notes || 'Lưu ý các lớp có học sinh ăn quà vặt trong lớp'}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-2 text-center align-middle no-print">
                            <div className="flex items-center justify-center gap-1">
                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(sched)}
                                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                    title="Chỉnh sửa lịch trực"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteModal(sched)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                                    title="Xóa lịch trực này"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
              {schedules.map(sched => (
                <Card
                  key={sched.id}
                  className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="px-3 py-1 bg-blue-600 text-white font-black rounded-xl text-sm">
                        {sched.dayOfWeek} (Tuần {sched.weekNumber})
                      </span>
                      <div className="flex items-center gap-1 no-print">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(sched)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(sched)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sáng */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                        ☀️ Buổi Sáng
                      </span>
                      <ul className="text-xs text-slate-700 space-y-0.5 pl-2">
                        {sched.morningTasks.map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Chiều */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                        🌤️ Buổi Chiều
                      </span>
                      <ul className="text-xs text-slate-700 space-y-0.5 pl-2">
                        {sched.afternoonTasks.map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <p>
                      <strong className="text-slate-900">Người thực hiện:</strong>{' '}
                      <span className="text-blue-900 font-semibold">{sched.assignedPeople}</span>
                    </p>
                    {sched.notes && (
                      <p className="text-slate-500 italic">
                        <strong>Ghi chú:</strong> {sched.notes}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* SIGNATURES SECTION AT BOTTOM */}
          <div className="grid grid-cols-2 gap-8 pt-8 items-start font-serif">
            {/* Left: TM. BCH Đoàn trường / Bí Thư */}
            <div className="text-center space-y-1">
              <p className="text-sm sm:text-base font-bold text-slate-950 uppercase">
                TM. BCH Đoàn trường
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {metadata.secretaryTitle || 'Bí Thư'}
              </p>
              <div className="h-20 sm:h-24 flex items-center justify-center">
                {/* Space for physical signature / seal */}
              </div>
              <p className="text-sm sm:text-base font-black text-slate-950">
                {metadata.secretaryName || 'Phan Thị Lan Phương'}
              </p>
            </div>

            {/* Right: Xác nhận Ban Chi Ủy */}
            <div className="text-center space-y-1">
              <p className="text-sm sm:text-base font-bold text-slate-950">
                {metadata.partyCommitteeTitle || 'Xác nhận của Ban Chi Ủy'}
              </p>
              <div className="h-20 sm:h-24 flex items-center justify-center">
                {/* Space for physical signature / seal */}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS */}
      {/* ========================================================================= */}

      {/* 4.1 CREATE / EDIT DUTY SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingSchedule ? '✏️ Chỉnh sửa lịch phân công trực Đoàn' : '➕ Tạo lịch phân công trực Đoàn mới'}
                  </h3>
                  <p className="text-xs text-blue-100">Đoàn TNCS Hồ Chí Minh – Trường THPT Sơn Lương</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
              {/* Row 1: Năm học & Tuần & Thứ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Năm học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formAcademicYear}
                    onChange={e => setFormAcademicYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                  >
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tuần áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formWeekNumber}
                    onChange={e => setFormWeekNumber(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                  >
                    {allWeeks.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        {w.weekLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Thứ trong tuần <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDayOfWeek}
                    onChange={e => setFormDayOfWeek(e.target.value as DayOfWeekName)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900 outline-none"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.num} value={d.label}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Nội dung Buổi Sáng */}
              <div className="space-y-2 p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <span>☀️</span> Nội dung công việc buổi Sáng:
                  </label>
                  <span className="text-[11px] text-amber-700 font-bold">{formMorningTasks.length} mục đã chọn</span>
                </div>

                {/* Quick Task Checkboxes */}
                <div className="space-y-1.5 max-h-32 overflow-y-auto bg-white p-2.5 rounded-xl border border-amber-200">
                  {taskConfigs.map(t => {
                    const isChecked = formMorningTasks.includes(t.name);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer hover:bg-slate-50 p-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormMorningTasks(prev =>
                              prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name]
                            );
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Task input for Morning */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMorningTaskInput}
                    onChange={e => setCustomMorningTaskInput(e.target.value)}
                    placeholder="Thêm nhiệm vụ buổi sáng khác..."
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customMorningTaskInput.trim()) {
                        setFormMorningTasks(prev => [...prev, customMorningTaskInput.trim()]);
                        setCustomMorningTaskInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Row 3: Nội dung Buổi Chiều */}
              <div className="space-y-2 p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
                    <span>🌤️</span> Nội dung công việc buổi Chiều:
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormAfternoonTasks([...formMorningTasks])}
                    className="text-[11px] font-bold text-indigo-700 hover:underline bg-white px-2 py-0.5 rounded-md border border-indigo-200"
                  >
                    ⮑ Sao chép từ buổi Sáng
                  </button>
                </div>

                {/* Quick Task Checkboxes */}
                <div className="space-y-1.5 max-h-32 overflow-y-auto bg-white p-2.5 rounded-xl border border-indigo-200">
                  {taskConfigs.map(t => {
                    const isChecked = formAfternoonTasks.includes(t.name);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer hover:bg-slate-50 p-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormAfternoonTasks(prev =>
                              prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name]
                            );
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Task input for Afternoon */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAfternoonTaskInput}
                    onChange={e => setCustomAfternoonTaskInput(e.target.value)}
                    placeholder="Thêm nhiệm vụ buổi chiều khác..."
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAfternoonTaskInput.trim()) {
                        setFormAfternoonTasks(prev => [...prev, customAfternoonTaskInput.trim()]);
                        setCustomAfternoonTaskInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Row 4: Người thực hiện */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Người thực hiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formAssignedPeople}
                  onChange={e => setFormAssignedPeople(e.target.value)}
                  placeholder="VD: Đ/c Phương + Đội cờ đỏ, TNXK"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 font-bold self-center">Chọn nhanh:</span>
                  {[
                    'Đ/c Phương + Đội cờ đỏ, TNXK',
                    'Đ/c Thùy + Đội cờ đỏ, TNXK',
                    'Đ/c Quỳnh + Đội cờ đỏ, TNXK',
                    'BCH Đoàn trường + Đội cờ đỏ',
                    'Đội Thanh niên Xung kích'
                  ].map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormAssignedPeople(name)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[11px] font-semibold rounded-md border border-slate-200"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="VD: Lưu ý các lớp có học sinh ăn quà vặt trong lớp..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{editingSchedule ? 'Lưu cập nhật' : 'Tạo lịch phân công'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.2 DELETE SCHEDULE MODAL */}
      {isDeleteModalOpen && scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xác nhận xóa lịch trực</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa lịch trực <strong>{scheduleToDelete.dayOfWeek}</strong> (Tuần {scheduleToDelete.weekNumber} - {scheduleToDelete.assignedPeople}) không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setScheduleToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.3 COPY WEEK MODAL */}
      {isCopyWeekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Copy size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Sao chép lịch trực tuần</h3>
                <p className="text-xs text-slate-500">Tạo bản sao lịch trực sang tuần mới</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tuần nguồn (Tuần cần copy):</label>
                <select
                  value={copySourceWeek}
                  onChange={e => setCopySourceWeek(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {allWeeks.map(w => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tuần đích (Tuần áp dụng mới):</label>
                <select
                  value={copyTargetWeek}
                  onChange={e => setCopyTargetWeek(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900"
                >
                  {allWeeks.map(w => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyOverwrite}
                  onChange={e => setCopyOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-bold text-slate-800">Ghi đè nếu tuần đích đã có lịch trực</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCopyWeekModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCopyWeek}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Copy size={15} />
                <span>Thực hiện sao chép</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.4 TASK CONFIGURATION MODAL */}
      {isTaskConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Cấu hình nội dung công việc trực Đoàn
              </h3>
              <button
                type="button"
                onClick={() => setIsTaskConfigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Add task input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="Nhập nội dung công việc trực mới..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTaskConfig}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  + Thêm
                </button>
              </div>

              {/* Task list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {taskConfigs.map((t, idx) => (
                  <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <span className="font-bold text-slate-800">
                      {idx + 1}. {t.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTaskConfig(t.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Xóa nội dung này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTaskConfigModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
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
