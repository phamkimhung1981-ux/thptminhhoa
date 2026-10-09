import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isSameMonth
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  Camera,
  FileSpreadsheet,
  Download,
  FileText,
  List,
  Eye,
  CheckCircle,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { WeeklySchedule } from '../types/schedule';
import { scheduleService } from '../services/scheduleService';
import { cn } from '../lib/utils';
import { safeFormat } from '../utils/dateUtils';
import {
  getWeekInfoByNumber,
  getCurrentSchoolWeekInfo,
  ACADEMIC_YEARS,
  generateWeekId
} from '../utils/schoolWeekUtils';
import BackButton from '../components/ui/BackButton';
import ImageOcrModal from '../components/schedule/ImageOcrModal';
import WordExcelImportModal from '../components/schedule/WordExcelImportModal';
import WeeklyScheduleView from '../components/schedule/WeeklyScheduleView';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { exportScheduleToWord } from '../components/schedule/WordExportUtil';

const STORAGE_SELECTED_WEEK_KEY = 'thpt_minh_hoa_selected_week_id';

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useAppContext();

  // Primary Tab state: 'weekly_schedules' or 'calendar_events'
  const [activeTab, setActiveTab] = useState<'weekly_schedules' | 'calendar_events'>('weekly_schedules');

  // Academic Year State
  const initialYear = searchParams.get('year') || '2026–2027';
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  // Weekly Schedules State
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);
  const [creatingWeek, setCreatingWeek] = useState<boolean>(false);

  // Delete Week Modal Confirmation State
  const [scheduleToDelete, setScheduleToDelete] = useState<WeeklySchedule | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Modals state
  const [isOcrModalOpen, setIsOcrModalOpen] = useState<boolean>(false);
  const [isWordExcelModalOpen, setIsWordExcelModalOpen] = useState<boolean>(false);

  // Calendar Events State (Tab 2)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    type: 'Sự kiện',
    date: new Date().toISOString().slice(0, 16)
  });

  // Week ribbon scroll ref
  const weekRibbonRef = useRef<HTMLDivElement>(null);

  // Load schedules on mount and when year changes
  useEffect(() => {
    loadWeeklySchedules();
  }, [selectedYear]);

  const loadWeeklySchedules = async () => {
    try {
      setLoadingSchedules(true);
      let list = await scheduleService.getWeeklySchedules(selectedYear);

      // Determine current system school week (e.g. Week 4 for 2026-10-03)
      const currentSysWeekInfo = getCurrentSchoolWeekInfo(new Date(), selectedYear);
      const currentSysWeekNum = currentSysWeekInfo.weekNumber;

      // Requirement 7: Ensure current system week exists
      const hasCurrentSysWeek = list.some(
        s => Number(s.week_number) === currentSysWeekNum || s.weekNumber === currentSysWeekNum
      );
      if (!hasCurrentSysWeek) {
        const ensured = await scheduleService.ensureWeekExists(currentSysWeekNum, selectedYear);
        list = await scheduleService.getWeeklySchedules(selectedYear);
      }

      setWeeklySchedules(list);

      // Requirement 8: Restore selected week from query params or localStorage, fallback to current week
      const savedWeekId = searchParams.get('weekId') || searchParams.get('week') || localStorage.getItem(STORAGE_SELECTED_WEEK_KEY);
      
      let initialTarget = list.find(
        s => s.id === savedWeekId || s.weekId === savedWeekId || s.week_number === savedWeekId
      );

      // If saved not found, find current system week
      if (!initialTarget) {
        initialTarget = list.find(
          s => Number(s.week_number) === currentSysWeekNum || s.weekNumber === currentSysWeekNum
        );
      }

      // Fallback to first schedule in list
      if (!initialTarget && list.length > 0) {
        initialTarget = list[0];
      }

      if (initialTarget) {
        setSelectedScheduleId(initialTarget.id);
        localStorage.setItem(STORAGE_SELECTED_WEEK_KEY, initialTarget.id);
      }

      setLoadingSchedules(false);
    } catch (err) {
      console.error('Error loading weekly schedules:', err);
      setLoadingSchedules(false);
      showToast('Có lỗi xảy ra khi tải danh sách tuần', 'error');
    }
  };

  // Active Weekly Schedule
  const activeWeeklySchedule = useMemo(() => {
    return weeklySchedules.find(s => s.id === selectedScheduleId || s.weekId === selectedScheduleId) || weeklySchedules[0] || null;
  }, [weeklySchedules, selectedScheduleId]);

  // Handle select week
  const handleSelectSchedule = (sched: WeeklySchedule) => {
    setSelectedScheduleId(sched.id);
    localStorage.setItem(STORAGE_SELECTED_WEEK_KEY, sched.id);
    setSearchParams(prev => {
      prev.set('week', String(sched.week_number));
      return prev;
    }, { replace: true });
  };

  // Requirement 2: Create next week schedule
  const handleCreateNextWeek = async () => {
    try {
      setCreatingWeek(true);
      const newSched = await scheduleService.createNextWeekSchedule(selectedYear);
      
      // Refresh list
      const updatedList = await scheduleService.getWeeklySchedules(selectedYear);
      setWeeklySchedules(updatedList);

      // Auto-select the newly created week
      setSelectedScheduleId(newSched.id);
      localStorage.setItem(STORAGE_SELECTED_WEEK_KEY, newSched.id);
      setSearchParams(prev => {
        prev.set('week', String(newSched.week_number));
        return prev;
      }, { replace: true });

      showToast(`Đã tạo thành công Tuần ${newSched.week_number} (${newSched.startDate || newSched.week_start_date} – ${newSched.endDate || newSched.week_end_date})!`, 'success');

      // Scroll ribbon to end
      setTimeout(() => {
        if (weekRibbonRef.current) {
          weekRibbonRef.current.scrollTo({
            left: weekRibbonRef.current.scrollWidth,
            behavior: 'smooth'
          });
        }
      }, 150);
    } catch (err) {
      console.error('Error creating next week:', err);
      showToast('Không thể tạo tuần mới. Vui lòng thử lại.', 'error');
    } finally {
      setCreatingWeek(false);
    }
  };

  // Save / Update schedule
  const handleSaveWeeklySchedule = async (newSchedule: WeeklySchedule) => {
    await scheduleService.saveWeeklySchedule(newSchedule);
    const updatedList = await scheduleService.getWeeklySchedules(selectedYear);
    setWeeklySchedules(updatedList);
    setSelectedScheduleId(newSchedule.id);
    showToast(`Đã lưu lịch công tác Tuần ${newSchedule.week_number} thành công.`, 'success');
  };

  // Safe delete handler with confirmation modal
  const handleDeleteWeeklyScheduleById = async (idToDelete: string) => {
    const target = weeklySchedules.find(s => s.id === idToDelete || s.weekId === idToDelete) || scheduleToDelete;
    if (!target) return;

    const actualId = target.id;
    const weekNumber = target.week_number;

    // Close modal
    setScheduleToDelete(null);

    // Optimistically update
    const nextList = weeklySchedules.filter(s => s.id !== actualId && s.weekId !== actualId);
    setWeeklySchedules(nextList);

    if (selectedScheduleId === actualId) {
      const remaining = nextList.length > 0 ? nextList[nextList.length - 1] : null;
      setSelectedScheduleId(remaining ? remaining.id : null);
      if (remaining) {
        localStorage.setItem(STORAGE_SELECTED_WEEK_KEY, remaining.id);
      } else {
        localStorage.removeItem(STORAGE_SELECTED_WEEK_KEY);
      }
    }

    try {
      await scheduleService.deleteWeeklySchedule(actualId);
      showToast(`Đã xóa Tuần ${weekNumber} và toàn bộ lịch công tác thành công.`, 'success');
    } catch (err) {
      console.error('Error deleting weekly schedule:', err);
      showToast('Có lỗi khi xóa trên máy chủ, vui lòng kiểm tra kết nối mạng.', 'error');
      // Reload on failure
      loadWeeklySchedules();
    }
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    await handleDeleteWeeklyScheduleById(scheduleToDelete.id);
  };

  // Helper to check if a schedule has events
  const isScheduleEmpty = (sched: WeeklySchedule) => {
    if (!sched.days || sched.days.length === 0) return true;
    const totalEvents = sched.days.reduce(
      (sum, d) => sum + (d.morning_events?.length || 0) + (d.afternoon_events?.length || 0),
      0
    );
    return totalEvents === 0;
  };

  // Calendar Week / Month Calculations for Tab 2
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    monthDays.push(day);
    day = addDays(day, 1);
  }

  const navigatePrev = () => {
    if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localIsoTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);

    setFormData({
      type: 'Họp',
      date: localIsoTime,
      title: '',
      description: ''
    });
    setIsEventModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEvent(event);

    const eventDate = new Date(event.date);
    const tzOffset = eventDate.getTimezoneOffset() * 60000;
    const localIsoTime = new Date(eventDate.getTime() - tzOffset).toISOString().slice(0, 16);

    setFormData({
      title: event.title,
      description: event.description,
      type: event.type,
      date: localIsoTime
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    deleteCalendarEvent(id);
    showToast('Đã xóa sự kiện thành công.', 'success');
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    const localDate = new Date(formData.date);
    const isoDateString = localDate.toISOString();

    if (editingEvent) {
      updateCalendarEvent(editingEvent.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        date: isoDateString
      });
    } else {
      addCalendarEvent({
        id: `evt${Date.now()}`,
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        date: isoDateString
      });
    }
    setIsEventModalOpen(false);
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Họp':
        return Users;
      case 'Dự giờ':
        return BookOpen;
      case 'Hạn chót':
        return AlertCircle;
      default:
        return CalendarIcon;
    }
  };

  const getEventColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Họp':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Dự giờ':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Hạn chót':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Sinh hoạt tổ':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans pb-20">
      <div className="flex items-center no-print">
        <BackButton />
      </div>

      {/* HEADER ACTION BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>LỊCH CÔNG TÁC TRƯỜNG THPT MINH HÒA</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý lịch tuần hành chính, nhận diện AI từ hình ảnh và phân công trực lãnh đạo
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Năm học selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="font-bold text-slate-600">Năm học:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
            >
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* [Lịch giao việc tổ CM] */}
          <Link
            to="/department-schedule"
            className="inline-flex items-center px-3 py-2 border border-blue-200 rounded-xl shadow-xs text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-blue-600" />
            Lịch giao việc tổ CM
          </Link>

          {/* [+ Tạo tuần mới] */}
          <button
            type="button"
            onClick={handleCreateNextWeek}
            disabled={creatingWeek}
            className="inline-flex items-center px-3.5 py-2 border border-blue-600 rounded-xl shadow-xs text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Tạo tuần tiếp theo cho năm học 2026–2027"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span>{creatingWeek ? 'Đang tạo...' : '+ Tạo tuần mới'}</span>
          </button>

          {/* [📷 Tải từ hình ảnh] PRIMARY FEATURE BUTTON */}
          <button
            type="button"
            onClick={() => setIsOcrModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-xl shadow-md text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer ring-2 ring-blue-300"
          >
            <Camera className="mr-1.5 h-4 w-4" />
            📷 Tải từ hình ảnh
          </button>

          {/* [📄 Tải từ Word/Excel] */}
          <button
            type="button"
            onClick={() => setIsWordExcelModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-emerald-300 rounded-xl shadow-xs text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
            📄 Tải từ Word/Excel
          </button>

          {/* [📥 Xuất lịch] */}
          {activeWeeklySchedule && (
            <button
              type="button"
              onClick={() => exportScheduleToWord(activeWeeklySchedule)}
              className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-xl shadow-xs text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Download className="mr-1.5 h-4 w-4 text-slate-600" />
              📥 Xuất lịch
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 bg-slate-100/80 p-1 rounded-2xl no-print">
        <button
          onClick={() => setActiveTab('weekly_schedules')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2',
            activeTab === 'weekly_schedules'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <FileText size={16} />
          <span>Lịch công tác tuần THPT Minh Hòa ({weeklySchedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar_events')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2',
            activeTab === 'calendar_events'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <CalendarIcon size={16} />
          <span>Lịch sự kiện & Họp ({calendarEvents.length})</span>
        </button>
      </div>

      {/* TAB 1: WEEKLY SCHEDULES */}
      {activeTab === 'weekly_schedules' && (
        <div className="space-y-6">
          {/* DANH SÁCH TUẦN CONTROLLER RIBBON (YÊU CẦU 1, 2, 6, 8) */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                    <span>DANH SÁCH TUẦN:</span>
                    <span className="text-xs font-bold text-blue-700 normal-case bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {weeklySchedules.length} tuần học
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chọn tuần để xem, nhập dữ liệu hoặc tải ảnh AI cho đúng tuần đó
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons & Dropdown selector */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Dropdown Jump Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-slate-600 whitespace-nowrap">Chọn nhanh:</span>
                  <select
                    value={activeWeeklySchedule?.id || ''}
                    onChange={e => {
                      const found = weeklySchedules.find(s => s.id === e.target.value);
                      if (found) handleSelectSchedule(found);
                    }}
                    className="bg-transparent font-black text-blue-900 outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    {weeklySchedules.map(sched => {
                      const wInfo = getWeekInfoByNumber(
                        Number(sched.week_number) || sched.weekNumber || 3,
                        selectedYear
                      );
                      return (
                        <option key={sched.id} value={sched.id}>
                          Tuần {sched.week_number} ({wInfo.startDateStr.slice(0, 5)} - {wInfo.endDateStr.slice(0, 5)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* [+ Tạo tuần mới] Button inside DANH SÁCH TUẦN */}
                <button
                  type="button"
                  onClick={handleCreateNextWeek}
                  disabled={creatingWeek}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Tạo tiếp tuần học mới cho năm học 2026–2027"
                >
                  <Plus size={14} />
                  <span>{creatingWeek ? 'Đang tạo...' : '+ Tạo tuần mới'}</span>
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Weeks List */}
            <div
              ref={weekRibbonRef}
              className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth custom-scrollbar"
            >
              {loadingSchedules ? (
                <div className="py-2 text-xs font-semibold text-slate-400 italic">
                  Đang tải danh sách tuần...
                </div>
              ) : weeklySchedules.length === 0 ? (
                <div className="py-2 text-xs font-semibold text-slate-500">
                  Chưa có tuần nào. Nhấn "+ Tạo tuần mới" để bắt đầu.
                </div>
              ) : (
                weeklySchedules.map(sched => {
                  const isSelected = activeWeeklySchedule?.id === sched.id;
                  const weekNum = Number(sched.week_number) || sched.weekNumber || 3;
                  const weekInfo = getWeekInfoByNumber(weekNum, selectedYear);
                  const empty = isScheduleEmpty(sched);

                  return (
                    <div
                      key={sched.id}
                      onClick={() => handleSelectSchedule(sched)}
                      className={cn(
                        'group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border select-none',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md border-blue-600 ring-2 ring-blue-300 font-black'
                          : empty
                          ? 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      )}
                      title={`Lịch công tác Tuần ${sched.week_number}: ${weekInfo.startDateStr} đến ${weekInfo.endDateStr}`}
                    >
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-xs', isSelected ? 'font-black' : 'font-bold')}>
                            Tuần {sched.week_number}
                          </span>
                          {empty && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Chưa có nội dung" />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] tracking-tight leading-none mt-0.5',
                            isSelected ? 'text-blue-100 font-semibold' : 'text-slate-500'
                          )}
                        >
                          {weekInfo.startDateStr.slice(0, 5)} – {weekInfo.endDateStr.slice(0, 5)}
                        </span>
                      </div>

                      {/* Trash icon with safe confirmation trigger */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setScheduleToDelete(sched);
                        }}
                        className={cn(
                          'p-1 rounded-lg transition-colors cursor-pointer ml-1',
                          isSelected
                            ? 'text-white/80 hover:text-white hover:bg-white/20'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        )}
                        title={`Xóa Tuần ${sched.week_number}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Schedule View for Selected Week */}
          {activeWeeklySchedule ? (
            <ErrorBoundary fallbackMessage="Có lỗi xảy ra khi hiển thị chi tiết lịch công tác tuần này.">
              <WeeklyScheduleView
                schedule={activeWeeklySchedule}
                onUpdateSchedule={handleSaveWeeklySchedule}
                onDeleteSchedule={handleDeleteWeeklyScheduleById}
                onTriggerOcr={() => setIsOcrModalOpen(true)}
              />
            </ErrorBoundary>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <CalendarDays size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Chưa có lịch công tác tuần nào</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhấn nút bên dưới để tạo tuần mới hoặc nạp dữ liệu từ hình ảnh
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreateNextWeek}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    + Tạo tuần mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOcrModalOpen(true)}
                    className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    📷 Tải lịch từ hình ảnh
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: CALENDAR EVENTS GRID */}
      {activeTab === 'calendar_events' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={navigatePrev}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={navigateNext}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <CardTitle className="text-lg">
                  {viewMode === 'week'
                    ? `Tuần ${format(startDate, 'dd/MM')} - ${format(addDays(startDate, 6), 'dd/MM/yyyy')}`
                    : `Tháng ${format(currentDate, 'MM/yyyy')}`}
                </CardTitle>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openCreateModal}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  + Thêm sự kiện họp
                </button>
                <button
                  onClick={navigateToday}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Hôm nay
                </button>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('week')}
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer',
                      viewMode === 'week' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Tuần
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer',
                      viewMode === 'month' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Tháng
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {viewMode === 'week' ? (
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                    {weekDays.map((day, i) => (
                      <div key={i} className="p-3 text-center border-r border-slate-200 last:border-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          {format(day, 'EEEE', { locale: vi })}
                        </p>
                        <p
                          className={cn(
                            'text-lg font-semibold',
                            isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-900'
                          )}
                        >
                          {format(day, 'd')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 min-h-[400px]">
                    {weekDays.map((day, i) => {
                      const dayEvents = calendarEvents
                        .filter(e => isSameDay(new Date(e.date), day))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      return (
                        <div
                          key={i}
                          className={cn(
                            'p-2 border-r border-slate-100 last:border-0',
                            isSameDay(day, new Date()) && 'bg-blue-50/20'
                          )}
                        >
                          <div className="space-y-2">
                            {dayEvents.map(event => {
                              const Icon = getEventIcon(event.type);
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'p-2 text-xs rounded-lg border group relative',
                                    getEventColor(event.type)
                                  )}
                                >
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white/80 backdrop-blur rounded shadow-sm border border-slate-200/50">
                                    <button
                                      onClick={e => openEditModal(e, event)}
                                      className="p-1 hover:text-blue-600"
                                      title="Sửa"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleDeleteEvent(event.id);
                                      }}
                                      className="p-1 hover:text-rose-600"
                                      title="Xóa"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <div className="font-semibold mb-1 pr-6 leading-tight">{event.title}</div>
                                  {event.description && (
                                    <div className="text-[10px] mb-1 opacity-80 line-clamp-2">
                                      {event.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-1 font-medium opacity-90">
                                    <Clock size={10} />
                                    <span>{safeFormat(event.date, 'HH:mm', '--:--')}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, i) => (
                      <div key={i} className="p-2 text-center border-r border-slate-200 last:border-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{day}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((day, i) => {
                      const dayEvents = calendarEvents
                        .filter(e => isSameDay(new Date(e.date), day))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      const isCurrentMonth = isSameMonth(day, currentDate);

                      return (
                        <div
                          key={i}
                          className={cn(
                            'min-h-[100px] p-1.5 border-b border-r border-slate-100 relative',
                            !isCurrentMonth && 'bg-slate-50/50 text-slate-400',
                            isSameDay(day, new Date()) && 'bg-blue-50/20'
                          )}
                        >
                          <div
                            className={cn(
                              'text-xs font-medium text-right p-1 mb-1',
                              isSameDay(day, new Date()) && 'text-blue-600 font-bold'
                            )}
                          >
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className={cn(
                                  'px-1.5 py-1 text-[10px] rounded border truncate group relative cursor-pointer',
                                  getEventColor(event.type)
                                )}
                                title={`${safeFormat(event.date, 'HH:mm', '--:--')} - ${event.title}`}
                                onClick={e => openEditModal(e, event)}
                              >
                                <span className="font-semibold mr-1">
                                  {safeFormat(event.date, 'HH:mm', '--:--')}
                                </span>
                                {event.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TUẦN (YÊU CẦU 9) */}
      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Xác nhận xóa tuần</h3>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa <strong className="text-rose-600">Tuần {scheduleToDelete.week_number}</strong> và toàn bộ lịch công tác của tuần này không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSchedule}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR IMAGE MODAL */}
      <ErrorBoundary fallbackMessage="Không thể khởi chạy module camera hoặc nhận diện ảnh OCR.">
        <ImageOcrModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          onSaveSchedule={handleSaveWeeklySchedule}
          existingSchedules={weeklySchedules}
          currentWeekNumber={
            activeWeeklySchedule ? Number(activeWeeklySchedule.week_number) || activeWeeklySchedule.weekNumber : 3
          }
          currentYear={selectedYear}
        />
      </ErrorBoundary>

      {/* WORD/EXCEL IMPORT MODAL */}
      <WordExcelImportModal
        isOpen={isWordExcelModalOpen}
        onClose={() => setIsWordExcelModalOpen(false)}
        onImportSchedule={async sched => {
          await handleSaveWeeklySchedule(sched);
        }}
      />

      {/* SINGLE CALENDAR EVENT CREATE/EDIT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-md flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent ? 'Cập nhật sự kiện' : 'Thêm sự kiện mới'}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <form id="event-form" onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tên sự kiện</label>
                  <input
                    required
                    type="text"
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên sự kiện..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Loại sự kiện</label>
                  <select
                    required
                    value={formData.type || 'Sự kiện'}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Họp">Họp</option>
                    <option value="Dự giờ">Dự giờ</option>
                    <option value="Thao giảng">Thao giảng</option>
                    <option value="Sinh hoạt tổ">Sinh hoạt tổ</option>
                    <option value="Hạn chót">Hạn chót</option>
                    <option value="Sự kiện">Sự kiện chung</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Thời gian</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.date || ''}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Mô tả chi tiết</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Nhập ghi chú hoặc nội dung chi tiết..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="event-form"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEvent ? 'Cập nhật' : 'Thêm sự kiện'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex items-center gap-3 animate-slide-up-fade">
          <div
            className={cn(
              'p-2 rounded-xl shrink-0',
              toastMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-600'
                : toastMsg.type === 'error'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-blue-50 text-blue-600'
            )}
          >
            {toastMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-800">{toastMsg.text}</p>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
