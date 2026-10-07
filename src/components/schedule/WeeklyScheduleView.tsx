import React, { useState } from 'react';
import {
  FileText, Download, Printer, Edit3, Trash2, Eye, Plus, Save, X, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, AlertCircle, FileSpreadsheet, Camera
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

  // Sync editForm when schedule prop changes
  React.useEffect(() => {
    setEditForm(schedule);
  }, [schedule]);

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
            <button 
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 size={14} /> Chỉnh sửa lịch
            </button>
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
                <th className="border border-slate-900 p-2.5 w-[12%]">Trực LĐ</th>
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
                      <input 
                        type="text" 
                        value={day.duty_leader} 
                        onChange={e => {
                          const newDays = [...editForm.days];
                          newDays[dayIdx].duty_leader = e.target.value;
                          setEditForm({ ...editForm, days: newDays });
                        }}
                        className="w-full text-center border rounded p-1 text-xs font-sans font-bold"
                      />
                    ) : (
                      <span>{day.duty_leader || '-'}</span>
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
              {schedule.footer?.principal_name || 'Nguyễn Quang Sáng'}
            </p>
          </div>
        </div>

      </div>

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
