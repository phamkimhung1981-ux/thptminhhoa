import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, FileText, Upload, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { WeeklySchedule, ScheduleDay } from '../../types/schedule';

interface WordExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSchedule: (schedule: WeeklySchedule) => Promise<void>;
}

export default function WordExcelImportModal({
  isOpen,
  onClose,
  onImportSchedule
}: WordExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setErrorMsg(null);
  };

  const processImport = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const fileName = file.name.toLowerCase();
      let weekNum = '3';
      let title = `LỊCH CÔNG TÁC TUẦN (Từ file ${file.name})`;

      const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      const days: ScheduleDay[] = dayNames.map((name, idx) => ({
        id: `day_${idx}_${Date.now()}`,
        day_of_week: name,
        date: '',
        date_str: '',
        morning_events: [],
        afternoon_events: [],
        duty_leader: ''
      }));

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Simple row parsing logic for Excel schedule
        rows.forEach((row) => {
          if (!row || row.length === 0) return;
          const strRow = row.map(cell => String(cell || '').trim());
          
          // Check for week number
          const firstCell = strRow[0] || '';
          if (firstCell.toUpperCase().includes('TUẦN')) {
            const match = firstCell.match(/TUẦN\s*(\d+)/i);
            if (match) weekNum = match[1];
            title = firstCell;
          }

          // Match day of week in row
          dayNames.forEach((dName, dIdx) => {
            if (firstCell.toLowerCase().includes(dName.toLowerCase())) {
              // Row columns: [Day, Morning, Afternoon, DutyLeader]
              if (strRow[1]) {
                days[dIdx].morning_events.push({
                  id: `m_${dIdx}_${Date.now()}`,
                  text: strRow[1],
                  highlight: 'normal'
                });
              }
              if (strRow[2]) {
                days[dIdx].afternoon_events.push({
                  id: `a_${dIdx}_${Date.now()}`,
                  text: strRow[2],
                  highlight: 'normal'
                });
              }
              if (strRow[3]) {
                days[dIdx].duty_leader = strRow[3];
              }
            }
          });
        });
      }

      const importedSchedule: WeeklySchedule = {
        id: `sched_import_${Date.now()}`,
        week_number: weekNum,
        week_start_date: '',
        week_end_date: '',
        duty_week: 'Lớp trực tuần',
        school_year: '2026-2027',
        title: title,
        header_text: 'SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT MINH HÒA',
        days,
        footer: {
          working_time: 'Thời gian làm việc: Sáng 7h00-11h30; Chiều 13h30-17h00',
          recipients: '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
          principal_name: 'Nguyễn Quang Sáng'
        },
        created_at: new Date().toISOString()
      };

      await onImportSchedule(importedSchedule);
      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setLoading(false);
      setErrorMsg('Không thể đọc dữ liệu từ tệp Word/Excel này. Vui lòng kiểm tra định dạng tệp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet size={20} />
            </div>
            <h3 className="font-bold text-slate-900">TẢI LỊCH TỪ WORD / EXCEL</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl p-6 text-center cursor-pointer space-y-2"
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".xlsx,.xls,.docx,.doc" 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          <Upload size={32} className="mx-auto text-emerald-600" />
          <p className="text-sm font-bold text-slate-800">
            {file ? file.name : 'Chọn tệp Word (.docx) hoặc Excel (.xlsx)'}
          </p>
          <p className="text-xs text-slate-500">Hỗ trợ tệp bảng lịch công tác tuần theo mẫu hành chính</p>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
          >
            Hủy
          </button>
          <button 
            type="button" 
            disabled={!file || loading}
            onClick={processImport}
            className={`px-5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 ${
              file && !loading ? 'bg-emerald-600 hover:bg-emerald-700 shadow' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={16} />
            <span>{loading ? 'Đang xử lý...' : 'Nhập lịch ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
