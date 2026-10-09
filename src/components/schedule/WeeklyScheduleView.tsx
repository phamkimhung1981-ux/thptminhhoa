import React, { useState } from 'react';
import {
  FileText, Download, Printer, Edit3, Trash2, Eye, Plus, Save, X, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, AlertCircle, FileSpreadsheet, Camera, UserCheck, Check, Sparkles
} from 'lucide-react';
import { WeeklySchedule, ScheduleDay, ScheduleEvent } from '../../types/schedule';
import { exportScheduleToWord } from './WordExportUtil';
import { getWeekInfoByNumber } from '../../utils/schoolWeekUtils';

interface WeeklyScheduleViewProps {
  schedule: WeeklySchedule;
  onUpdateSchedule: (updated: WeeklySchedule) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onBackToList?: () => void;
  onTriggerOcr?: () => void;
}

export default function WeeklyScheduleView({
  schedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onBackToList,
  onTriggerOcr
}: WeeklyScheduleViewProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<WeeklySchedule>(schedule);
  const [showOriginalImageModal, setShowOriginalImageModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dedicated Duty Leader (Trực Lãnh đạo) Modal State
  const [showDutyLeaderModal, setShowDutyLeaderModal] = useState<boolean>(false);
  const [dutyLeadersForm, setDutyLeadersForm] = useState<Array<{ id: string; day_of_week: string; date_str?: string; date?: string; duty_leader: string }>>([]);
  const [isSavingDutyLeaders, setIsSavingDutyLeaders] = useState<boolean>(false);
  const [focusDayIdx, setFocusDayIdx] = useState<number | null>(null);

  // Sync editForm when schedule prop changes
  React.useEffect(() => {
    setEditForm(schedule);
  }, [schedule]);

  const handleOpenDutyLeaderModal = (targetDayIdx?: number) => {
    const initialList = (schedule.days || []).map(d => ({
      id: d.id,
      day_of_week: d.day_of_week,
      date_str: d.date_str,
      date: d.date,
      duty_leader: d.duty_leader || ''
    }));
    setDutyLeadersForm(initialList);
    setFocusDayIdx(targetDayIdx !== undefined ? targetDayIdx : null);
    setShowDutyLeaderModal(true);
  };

  const handleSaveDutyLeaders = async () => {
    try {
      setIsSavingDutyLeaders(true);
      setErrorMsg(null);
      const updatedDays = schedule.days.map((d, idx) => ({
        ...d,
        duty_leader: dutyLeadersForm[idx]?.duty_leader !== undefined ? dutyLeadersForm[idx].duty_leader : d.duty_leader
      }));
      const updatedSchedule: WeeklySchedule = {
        ...schedule,
        days: updatedDays
      };
      await onUpdateSchedule(updatedSchedule);
      setIsSavingDutyLeaders(false);
      setShowDutyLeaderModal(false);
    } catch (err) {
      console.error('Lỗi khi lưu trực lãnh đạo:', err);
      setIsSavingDutyLeaders(false);
      setErrorMsg('Không thể lưu phân công trực lãnh đạo. Vui lòng thử lại.');
    }
  };

  const handleApplyDefaultDutyLeaders = () => {
    const updated = dutyLeadersForm.map((d, idx) => {
      let leader = 'Thầy Phương';
      if (idx === 1 || idx === 2) leader = 'Thầy Lương';
      else if (idx === 3 || idx === 4) leader = 'Thầy Quỳnh';
      else leader = 'Thầy Phương';
      return { ...d, duty_leader: leader };
    });
    setDutyLeadersForm(updated);
  };

  const handleSetAllDutyLeaders = (leaderName: string) => {
    const updated = dutyLeadersForm.map(d => ({ ...d, duty_leader: leaderName }));
    setDutyLeadersForm(updated);
  };

  const handleExportWord = async () => {
    try {
      setErrorMsg(null);
      await exportScheduleToWord(schedule);
    } catch (err) {
      console.error('Word Export Error:', err);
      setErrorMsg('Không thể xuất file Word. Vui lòng thử lại.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = async () => {
    try {
      setErrorMsg(null);
      setIsSaving(true);
      await onUpdateSchedule(editForm);
      setIsSaving(false);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      setErrorMsg('Lỗi khi cập nhật lịch công tác.');
    }
  };

  const handleEventChange = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number, text: string) => {
    const newDays = [...editForm.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      const newEvs = [...targetDay.morning_events];
      newEvs[eventIdx] = { ...newEvs[eventIdx], text };
      targetDay.morning_events = newEvs;
    } else {
      const newEvs = [...targetDay.afternoon_events];
      newEvs[eventIdx] = { ...newEvs[eventIdx], text };
      targetDay.afternoon_events = newEvs;
    }
    newDays[dayIdx] = targetDay;
    setEditForm({ ...editForm, days: newDays });
  };

  const toggleEventHighlight = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number) => {
    const newDays = [...editForm.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      const newEvs = [...targetDay.morning_events];
      const cur = newEvs[eventIdx].highlight;
      newEvs[eventIdx] = { ...newEvs[eventIdx], highlight: cur === 'red' ? 'normal' : 'red' };
      targetDay.morning_events = newEvs;
    } else {
      const newEvs = [...targetDay.afternoon_events];
      const cur = newEvs[eventIdx].highlight;
      newEvs[eventIdx] = { ...newEvs[eventIdx], highlight: cur === 'red' ? 'normal' : 'red' };
      targetDay.afternoon_events = newEvs;
    }
    newDays[dayIdx] = targetDay;
    setEditForm({ ...editForm, days: newDays });
  };

  const addEventRow = (dayIdx: number, session: 'morning' | 'afternoon') => {
    const newDays = [...editForm.days];
    const targetDay = { ...newDays[dayIdx] };
    const newEv: ScheduleEvent = {
      id: `ev_added_${Date.now()}`,
      text: '',
      confidence: 1.0,
      highlight: 'normal'
    };
    if (session === 'morning') {
      targetDay.morning_events = [...targetDay.morning_events, newEv];
    } else {
      targetDay.afternoon_events = [...targetDay.afternoon_events, newEv];
    }
    newDays[dayIdx] = targetDay;
    setEditForm({ ...editForm, days: newDays });
  };

  const removeEventRow = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number) => {
    const newDays = [...editForm.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      targetDay.morning_events = targetDay.morning_events.filter((_, idx) => idx !== eventIdx);
    } else {
      targetDay.afternoon_events = targetDay.afternoon_events.filter((_, idx) => idx !== eventIdx);
    }
    newDays[dayIdx] = targetDay;
    setEditForm({ ...editForm, days: newDays });
  };

  // Get accurate week info
  const weekNum = Number(schedule.week_number) || schedule.weekNumber || 3;
  const academicYear = schedule.school_year || schedule.academicYear || '2026–2027';
  const weekInfo = getWeekInfoByNumber(weekNum, academicYear);

  return (
    <div className="space-y-6">
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Xác nhận xóa lịch tuần</h3>
            </div>
            
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa <strong className="text-rose-600">Tuần {schedule.week_number}</strong> ({weekInfo.startDateStr} – {weekInfo.endDateStr}) và toàn bộ lịch công tác của tuần này không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await onDeleteSchedule(schedule.id);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Top Controls Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          {onBackToList && (
            <button 
              onClick={onBackToList}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Danh sách
            </button>
          )}
          <span className="font-extrabold text-sm text-slate-800">
            {schedule.title || `LỊCH CÔNG TÁC TUẦN ${schedule.week_number}`}
          </span>
          {schedule.duty_week && (
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-full font-bold text-xs">
              Trực tuần: {schedule.duty_week}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Mode Toggle */}
          {isEditing ? (
            <>
              <button 
                onClick={() => { setEditForm(schedule); setIsEditing(false); }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save size={14} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 size={14} /> Chỉnh sửa lịch
              </button>
              <button 
                type="button"
                onClick={() => handleOpenDutyLeaderModal()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ring-2 ring-indigo-200"
                title="Chỉnh sửa phân công Lãnh đạo trực cho các ngày trong tuần"
              >
                <UserCheck size={14} /> Sửa Trực Lãnh đạo
              </button>
            </>
          )}

          {/* View Original Image */}
          {schedule.original_images && schedule.original_images.length > 0 && (
            <button 
              onClick={() => setShowOriginalImageModal(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye size={14} /> Xem ảnh gốc
            </button>
          )}

          {/* Upload image button */}
          {onTriggerOcr && (
            <button 
              type="button"
              onClick={onTriggerOcr}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-300 animate-pulse-subtle"
              title="Tải/Cập nhật lịch công tác từ hình ảnh sử dụng AI OCR"
            >
              <Camera size={14} />
              <span>Tải từ hình ảnh (AI)</span>
            </button>
          )}

          {/* Export & Print */}
          <button 
            onClick={handleExportWord}
            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileText size={14} /> Xuất Word (.docx)
          </button>
          <button 
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={14} /> In lịch
          </button>
          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Xóa lịch tuần này"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span>Xóa lịch tuần này</span>
          </button>
        </div>
      </div>

      {/* FORMAL ADMINISTRATIVE PRINTABLE DOCUMENT SHEET */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md font-serif text-slate-950 space-y-6 max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none">
        
        {/* Administrative Header Table */}
        <div className="grid grid-cols-2 text-center text-xs sm:text-sm uppercase font-bold leading-tight border-b border-slate-200 pb-4 print:border-b">
          <div>
            <p className="font-normal">SỞ GD&ĐT PHÚ THỌ</p>
            <p className="font-bold underline text-slate-900 mt-1">TRƯỜNG THPT MINH HÒA</p>
          </div>
          <div>
            <p className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="font-bold underline mt-1">Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1 py-2">
          {isEditing ? (
            <input 
              type="text" 
              value={editForm.title} 
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="text-xl sm:text-2xl font-bold uppercase text-center w-full border border-blue-300 rounded p-1 font-serif"
            />
          ) : (
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase text-slate-900 tracking-wide font-serif">
              {schedule.title || `LỊCH CÔNG TÁC TUẦN ${schedule.week_number}`}
            </h1>
          )}

          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm italic font-sans text-slate-700">
            <span>
              (Từ ngày {weekInfo.startDateStr} đến ngày {weekInfo.endDateStr})
            </span>
            {schedule.duty_week && (
              <span className="font-bold not-italic font-serif text-slate-900">
                | Trực tuần: {schedule.duty_week}
              </span>
            )}
          </div>
        </div>

        {/* MAIN SCHEDULE TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-900 text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent font-bold uppercase text-center text-slate-900">
                <th className="border border-slate-900 p-2.5 w-[15%]">Thứ/Ngày</th>
                <th className="border border-slate-900 p-2.5 w-[37%]">BUỔI SÁNG</th>
                <th className="border border-slate-900 p-2.5 w-[36%]">BUỔI CHIỀU</th>
                <th className="border border-slate-900 p-2.5 w-[14%] text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Trực LĐ</span>
                    <button
                      type="button"
                      onClick={() => handleOpenDutyLeaderModal()}
                      className="p-1 rounded bg-slate-200/80 hover:bg-indigo-600 hover:text-white text-slate-700 transition-all cursor-pointer print:hidden text-[11px] font-sans flex items-center gap-0.5"
                      title="Chỉnh sửa phân công Trực Lãnh đạo"
                    >
                      <Edit3 size={11} />
                      <span className="text-[10px] hidden sm:inline">Sửa</span>
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {(isEditing ? editForm.days : schedule.days).map((day, dayIdx) => (
                <tr key={day.id || dayIdx} className="align-top">
                  
                  {/* Day / Date Cell */}
                  <td className="border border-slate-900 p-2.5 text-center bg-slate-50/50 print:bg-transparent">
                    <div className="font-bold text-slate-900">{day.day_of_week}</div>
                    <div className="text-xs italic text-slate-600">{day.date_str || day.date}</div>
                  </td>

                  {/* Morning Cell */}
                  <td className="border border-slate-900 p-2.5">
                    {isEditing ? (
                      <div className="space-y-2 font-sans">
                        {day.morning_events.map((ev, evIdx) => (
                          <div key={ev.id || evIdx} className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={ev.text} 
                              onChange={e => handleEventChange(dayIdx, 'morning', evIdx, e.target.value)}
                              className={`flex-1 px-2 py-1 border text-xs rounded font-sans ${
                                ev.highlight === 'red' ? 'text-rose-700 font-bold border-rose-300 bg-rose-50' : 'border-slate-300'
                              }`}
                            />
                            <button 
                              type="button" 
                              onClick={() => toggleEventHighlight(dayIdx, 'morning', evIdx)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200"
                            >
                              🔴
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeEventRow(dayIdx, 'morning', evIdx)}
                              className="text-rose-600 p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => addEventRow(dayIdx, 'morning')}
                          className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={12} /> Thêm việc sáng
                        </button>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {day.morning_events.map((ev, i) => (
                          <li 
                            key={i} 
                            className={ev.highlight === 'red' ? 'text-rose-700 font-bold' : 'text-slate-900'}
                          >
                            <span>{ev.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>

                  {/* Afternoon Cell */}
                  <td className="border border-slate-900 p-2.5">
                    {isEditing ? (
                      <div className="space-y-2 font-sans">
                        {day.afternoon_events.map((ev, evIdx) => (
                          <div key={ev.id || evIdx} className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={ev.text} 
                              onChange={e => handleEventChange(dayIdx, 'afternoon', evIdx, e.target.value)}
                              className={`flex-1 px-2 py-1 border text-xs rounded font-sans ${
                                ev.highlight === 'red' ? 'text-rose-700 font-bold border-rose-300 bg-rose-50' : 'border-slate-300'
                              }`}
                            />
                            <button 
                              type="button" 
                              onClick={() => toggleEventHighlight(dayIdx, 'afternoon', evIdx)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200"
                            >
                              🔴
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeEventRow(dayIdx, 'afternoon', evIdx)}
                              className="text-rose-600 p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => addEventRow(dayIdx, 'afternoon')}
                          className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={12} /> Thêm việc chiều
                        </button>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {day.afternoon_events.map((ev, i) => (
                          <li 
                            key={i} 
                            className={ev.highlight === 'red' ? 'text-rose-700 font-bold' : 'text-slate-900'}
                          >
                            <span>{ev.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>

                  {/* Duty Leader Cell */}
                  <td className="border border-slate-900 p-2.5 text-center font-bold">
                    {isEditing ? (
                      <div className="space-y-1 font-sans">
                        <input 
                          type="text" 
                          value={day.duty_leader} 
                          onChange={e => {
                            const newDays = [...editForm.days];
                            newDays[dayIdx].duty_leader = e.target.value;
                            setEditForm({ ...editForm, days: newDays });
                          }}
                          list="leadership-options"
                          placeholder="Tên trực LĐ..."
                          className="w-full text-center border rounded p-1 text-xs font-sans font-bold bg-white focus:ring-2 focus:ring-indigo-300"
                        />
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {['Thầy Phương', 'Thầy Lương', 'Thầy Quỳnh'].map(name => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                const newDays = [...editForm.days];
                                newDays[dayIdx].duty_leader = name;
                                setEditForm({ ...editForm, days: newDays });
                              }}
                              className={`text-[9px] px-1 py-0.5 rounded border transition-colors ${
                                day.duty_leader === name
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {name.replace('Thầy ', '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleOpenDutyLeaderModal(dayIdx)}
                        className="group relative cursor-pointer hover:bg-indigo-50/80 p-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                        title="Nhấn để sửa tên Trực Lãnh đạo ngày này"
                      >
                        <span className="text-slate-900">{day.duty_leader || '-'}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-indigo-600 hover:bg-indigo-100 print:hidden">
                          <Edit3 size={12} />
                        </span>
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Administrative Section */}
        <div className="grid grid-cols-2 gap-4 pt-4 text-xs sm:text-sm">
          <div className="space-y-2">
            <p className="italic text-slate-800">
              Lưu ý: {schedule.footer?.working_time || 'Thời gian làm việc: Sáng từ 7h00 - 11h30; Chiều từ 13h30 - 17h00'}
            </p>
            <div>
              <p className="font-bold italic">Nơi nhận:</p>
              <p className="whitespace-pre-line text-slate-800 pl-2">
                {schedule.footer?.recipients || '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.'}
              </p>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="font-bold uppercase tracking-wider">HIỆU TRƯỜNG</p>
            <p className="italic text-slate-500 pt-1 pb-12">(Đã ký)</p>
            <p className="font-bold text-slate-900 text-sm sm:text-base">
              {schedule.footer?.principal_name || 'Trịnh Việt Phương'}
            </p>
          </div>
        </div>

      </div>

      {/* DATALIST FOR LEADERSHIP NAMES */}
      <datalist id="leadership-options">
        <option value="Thầy Phương" />
        <option value="Thầy Lương" />
        <option value="Thầy Quỳnh" />
        <option value="Trịnh Việt Phương" />
        <option value="Trần Văn Lương" />
        <option value="Hoàng Đức Quỳnh" />
      </datalist>

      {/* DEDICATED DUTY LEADER EDIT MODAL (SỬA TRỰC LÃNH ĐẠO) */}
      {showDutyLeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserCheck size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Chỉnh sửa phân công Trực Lãnh đạo (TRỰC LĐ)
                  </h3>
                  <p className="text-xs text-indigo-100 font-medium mt-0.5">
                    Tuần {schedule.week_number} ({weekInfo.startDateStr} – {weekInfo.endDateStr})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDutyLeaderModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* School Leadership Badges */}
            <div className="px-5 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap text-slate-700 font-medium">
                <span className="font-bold text-indigo-900">Ban Giám Hiệu:</span>
                <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md font-semibold text-slate-800">
                  HT: Trịnh Việt Phương (Thầy Phương)
                </span>
                <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md font-semibold text-slate-800">
                  PHT: Trần Văn Lương (Thầy Lương)
                </span>
                <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md font-semibold text-slate-800">
                  PHT: Hoàng Đức Quỳnh (Thầy Quỳnh)
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Gán nhanh:</span>
              <button
                type="button"
                onClick={handleApplyDefaultDutyLeaders}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="T2: Thầy Phương | T3-T4: Thầy Lương | T5-T6: Thầy Quỳnh | T7-CN: Thầy Phương"
              >
                <Sparkles size={12} /> Áp dụng mẫu trực chuẩn
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDutyLeaders('Thầy Phương')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cả tuần: Thầy Phương
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDutyLeaders('Thầy Lương')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Thầy Lương
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDutyLeaders('Thầy Quỳnh')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Thầy Quỳnh
              </button>
            </div>

            {/* Days Form List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {dutyLeadersForm.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    focusDayIdx === idx 
                      ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="sm:w-36">
                    <span className="font-extrabold text-sm text-slate-900 block">{item.day_of_week}</span>
                    <span className="text-xs text-slate-500 italic">{item.date_str || item.date || ''}</span>
                  </div>

                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <input 
                      type="text"
                      value={item.duty_leader}
                      onChange={e => {
                        const updated = [...dutyLeadersForm];
                        updated[idx].duty_leader = e.target.value;
                        setDutyLeadersForm(updated);
                      }}
                      list="leadership-options"
                      placeholder="Nhập hoặc chọn tên trực LĐ..."
                      className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    {/* Quick Choice Buttons for each day */}
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Phương', val: 'Thầy Phương' },
                        { label: 'Lương', val: 'Thầy Lương' },
                        { label: 'Quỳnh', val: 'Thầy Quỳnh' }
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => {
                            const updated = [...dutyLeadersForm];
                            updated[idx].duty_leader = preset.val;
                            setDutyLeadersForm(updated);
                          }}
                          className={`px-2 py-1 text-xs rounded-lg border font-semibold transition-colors cursor-pointer ${
                            item.duty_leader === preset.val
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {item.duty_leader && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...dutyLeadersForm];
                            updated[idx].duty_leader = '';
                            setDutyLeadersForm(updated);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDutyLeaderModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveDutyLeaders}
                disabled={isSavingDutyLeaders}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSavingDutyLeaders ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu phân công Trực Lãnh đạo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORIGINAL IMAGE VIEW MODAL */}
      {showOriginalImageModal && schedule.original_images && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Eye size={18} className="text-blue-400" />
                ẢNH LỊCH GỐC MINH CHỨNG
              </h3>
              <button onClick={() => setShowOriginalImageModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950">
              {schedule.original_images.map((imgUrl, i) => (
                <div key={i} className="mb-4">
                  <p className="text-xs text-slate-400 mb-1 text-center">Trang {i + 1}</p>
                  <img src={imgUrl} alt={`Ảnh minh chứng ${i + 1}`} className="max-w-full rounded shadow-lg border border-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
