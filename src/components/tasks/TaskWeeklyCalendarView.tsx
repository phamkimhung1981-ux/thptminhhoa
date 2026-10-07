import React from 'react';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  CheckCircle, 
  AlertCircle, 
  Flame, 
  Flag,
  Edit,
  Plus,
  Play
} from 'lucide-react';
import { WorkAssignment, Teacher } from '../../types';
import { SchoolWeekInfo } from '../../utils/schoolWeekUtils';
import { cn } from '../../lib/utils';

interface TaskWeeklyCalendarViewProps {
  currentWeek: SchoolWeekInfo;
  tasks: WorkAssignment[];
  teachers: Teacher[];
  getTeacherNames: (assignment: WorkAssignment) => string;
  getEffectiveStatus: (assignment: WorkAssignment) => string;
  onEditTask: (task: WorkAssignment) => void;
  onProgressTask: (task: WorkAssignment) => void;
  onCreateTaskForDay?: (dateIso: string) => void;
  isAdminOrHead: boolean;
}

const DAY_COLS = [
  { label: 'Thứ 2', offset: 0 },
  { label: 'Thứ 3', offset: 1 },
  { label: 'Thứ 4', offset: 2 },
  { label: 'Thứ 5', offset: 3 },
  { label: 'Thứ 6', offset: 4 },
  { label: 'Thứ 7', offset: 5 },
  { label: 'Chủ nhật', offset: 6 },
];

export default function TaskWeeklyCalendarView({
  currentWeek,
  tasks,
  teachers,
  getTeacherNames,
  getEffectiveStatus,
  onEditTask,
  onProgressTask,
  onCreateTaskForDay,
  isAdminOrHead
}: TaskWeeklyCalendarViewProps) {
  // Compute date string for each day offset
  const getDayDate = (offset: number) => {
    try {
      const start = new Date(currentWeek.startDateIso);
      const target = new Date(start);
      target.setDate(start.getDate() + offset);
      const dayStr = `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}`;
      const isoStr = target.toISOString().split('T')[0];
      return { dayStr, isoStr };
    } catch (e) {
      return { dayStr: '', isoStr: '' };
    }
  };

  // Group tasks by day of week
  const getTasksForDay = (offset: number, isoStr: string) => {
    return tasks.filter(t => {
      if (t.workDate && t.workDate.startsWith(isoStr)) return true;
      if (t.deadline && t.deadline.startsWith(isoStr)) return true;
      // Fallback matching if date contains day string
      return false;
    });
  };

  const remainingGeneralTasks = tasks.filter(t => {
    if (!t.workDate && !t.deadline) return true;
    const isMatched = DAY_COLS.some(col => {
      const { isoStr } = getDayDate(col.offset);
      return (t.workDate && t.workDate.startsWith(isoStr)) || (t.deadline && t.deadline.startsWith(isoStr));
    });
    return !isMatched;
  });

  return (
    <div className="space-y-4">
      {/* HEADER BANNER FOR SCHEDULE VIEW */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base uppercase tracking-wide">
              Lịch Giao Việc Toàn Trường Theo Thứ
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {currentWeek.label} • Trường THPT Minh Hòa
            </p>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
          Tổng cộng: <span className="text-blue-700 font-extrabold">{tasks.length}</span> công việc trong tuần
        </div>
      </div>

      {/* 7-DAY SCHEDULE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        {DAY_COLS.map((col) => {
          const { dayStr, isoStr } = getDayDate(col.offset);
          const dayTasks = getTasksForDay(col.offset, isoStr);
          const isToday = new Date().toISOString().startsWith(isoStr);

          return (
            <div 
              key={col.label} 
              className={cn(
                "bg-white rounded-2xl border flex flex-col shadow-2xs overflow-hidden transition-all",
                isToday ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10" : "border-slate-200/90"
              )}
            >
              {/* DAY HEADER */}
              <div className={cn(
                "p-3 text-center border-b flex items-center justify-between",
                isToday ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white" : "bg-slate-50 text-slate-800 border-slate-200/80"
              )}>
                <div>
                  <span className="font-extrabold text-xs block uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className={cn("text-[11px] font-bold block", isToday ? "text-blue-100" : "text-slate-500")}>
                    {dayStr}
                  </span>
                </div>

                <span className={cn(
                  "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                  isToday ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {dayTasks.length}
                </span>
              </div>

              {/* DAY CONTENT / TASKS LIST */}
              <div className="p-2.5 space-y-2.5 flex-1 min-h-[180px] flex flex-col justify-between">
                <div className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      Không có công việc cố định
                    </div>
                  ) : (
                    dayTasks.map((t) => {
                      const effStatus = getEffectiveStatus(t);
                      return (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all text-xs space-y-1.5 group relative"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className={cn(
                              "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0",
                              t.priority === 'Khẩn cấp' ? "bg-rose-100 text-rose-800" :
                              t.priority === 'Cao' ? "bg-orange-100 text-orange-800" :
                              "bg-blue-50 text-blue-700"
                            )}>
                              {t.priority || 'TB'}
                            </span>

                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => onProgressTask(t)}
                                className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                title="Cập nhật tiến độ"
                              >
                                <Play size={11} />
                              </button>
                              {isAdminOrHead && (
                                <button
                                  type="button"
                                  onClick={() => onEditTask(t)}
                                  className="p-1 hover:bg-amber-100 rounded text-amber-700 transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="font-bold text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                            {t.content}
                          </p>

                          <div className="text-[11px] text-slate-500 font-medium flex flex-col gap-0.5 pt-0.5 border-t border-slate-100">
                            <span className="text-blue-900 font-semibold truncate">
                              👤 {getTeacherNames(t)}
                            </span>
                            <div className="flex items-center justify-between text-[10px] mt-0.5">
                              <span className={cn(
                                "font-bold",
                                effStatus === 'Hoàn thành tốt' || effStatus === 'Hoàn thành' ? "text-emerald-700" :
                                effStatus === 'Quá hạn' ? "text-rose-700" : "text-slate-600"
                              )}>
                                {effStatus}
                              </span>
                              {t.progress !== undefined && t.progress > 0 && (
                                <span className="text-blue-600 font-bold">{t.progress}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ADD TASK TO DAY BUTTON */}
                {isAdminOrHead && onCreateTaskForDay && (
                  <button
                    type="button"
                    onClick={() => onCreateTaskForDay(isoStr)}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Thêm việc</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* REMAINING / ALL-WEEK TASKS */}
      {remainingGeneralTasks.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs sm:text-sm uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span>Các công việc thực hiện suốt tuần / Chưa gán thứ cụ thể ({remainingGeneralTasks.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {remainingGeneralTasks.map(t => (
              <div 
                key={t.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-700 text-[11px]">
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Hạn: {t.deadline || 'Hết tuần'}
                  </span>
                </div>
                <p className="font-bold text-slate-800">{t.content}</p>
                <p className="text-[11px] text-slate-500 font-medium">👤 {getTeacherNames(t)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
