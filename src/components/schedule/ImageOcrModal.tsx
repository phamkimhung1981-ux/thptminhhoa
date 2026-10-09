import React, { useState, useRef } from 'react';
import {
  X, Upload, Image as ImageIcon, CheckCircle, AlertTriangle, ArrowLeft, Save, Plus, Trash2,
  ZoomIn, ZoomOut, AlertCircle, RefreshCw, Eye, Edit3
} from 'lucide-react';
import { WeeklySchedule, ScheduleDay, ScheduleEvent } from '../../types/schedule';
import { getWeekInfoByNumber, generateWeekId } from '../../utils/schoolWeekUtils';

interface ImageOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSchedule: (schedule: WeeklySchedule, isUpdate?: boolean) => Promise<void>;
  existingSchedules: WeeklySchedule[];
  currentWeekNumber?: number;
  currentYear?: string;
}

export default function ImageOcrModal({
  isOpen,
  onClose,
  onSaveSchedule,
  existingSchedules,
  currentWeekNumber,
  currentYear = '2026–2027'
}: ImageOcrModalProps) {
  // Image files & base64 state
  const [images, setImages] = useState<{ id: string; url: string; file: File; base64: string }[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Requirement 1 & 2 states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [serverImageUrl, setServerImageUrl] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  // Workflow steps: 'upload' -> 'processing' -> 'review'
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');

  // OCR Processing Progress & Checklist state
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [completedChecklist, setCompletedChecklist] = useState<number[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Parsed Data state for Review & Edit
  const [parsedData, setParsedData] = useState<WeeklySchedule | null>(null);
  const [saveOriginalImage, setSaveOriginalImage] = useState<boolean>(true);

  // Duplicate Check Modal State
  const [duplicateConflict, setDuplicateConflict] = useState<WeeklySchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  // Connection Diagnostic state (Requirement 4, 17)
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    apiKeyConfigured: boolean;
    apiKeyPrefix: string;
    modelUsed: string;
    apiConnection: boolean;
    responseSample?: string;
    errorMessage: string | null;
  } | null>(null);

  const testOcrConnection = async () => {
    try {
      setTestingConnection(true);
      const res = await fetch('/api/ocr-status');
      const data = await res.json();
      setConnectionStatus({
        apiKeyConfigured: data.apiKeyConfigured,
        apiKeyPrefix: data.apiKeyPrefix,
        modelUsed: data.modelUsed,
        apiConnection: data.apiConnection,
        responseSample: data.responseSample,
        errorMessage: data.errorMessage
      });
    } catch (err: any) {
      setConnectionStatus({
        apiKeyConfigured: false,
        apiKeyPrefix: 'None',
        modelUsed: 'gemini-3.6-flash',
        apiConnection: false,
        errorMessage: err.message || 'Không thể gửi yêu cầu kết nối đến server.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // File selection & upload handlers (Requirement 1 & 2)
  const validateAndSetFile = (file: File) => {
    setValidationError(null);
    setFileError(null);
    setUploadSuccess(false);
    setServerImageUrl(null);
    setUploadedBase64(null);
    setImages([]);

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB (Requirement 1)
    if (file.size > MAX_SIZE) {
      setFileError('⚠️ Dung lượng tệp vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setFileError('⚠️ Định dạng tệp không hợp lệ. Vui lòng chọn định dạng hình ảnh hợp lệ (JPG, JPEG, PNG, WEBP).');
      return;
    }

    setSelectedFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setFileError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      console.log('Sending upload request to /api/upload-image for file:', selectedFile.name, selectedFile.size, 'bytes');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      }).catch(networkErr => {
        console.error('Low-level network error during fetch:', networkErr);
        throw new Error(`NETWORK_ERROR: ${networkErr.message || 'Failed to fetch (CORS or server is down)'}`);
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const responseText = await response.text();
        throw new Error(
          `API không trả về JSON.\nHTTP Status: ${response.status}\nContent-Type: ${contentType}\nResponse: ${responseText.substring(0, 300)}`
        );
      }

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        const status = response.status;
        const errMessage = resData.error || 'Unknown error';
        const details = resData.details || `Server responded with status ${response.status}`;
        throw new Error(`Upload failed\nHTTP Status: ${status}\nError: ${errMessage}\nDetails: ${details}`);
      }

      if (!resData.url) {
        throw new Error('Upload failed\nHTTP Status: 200\nError: Missing image URL\nDetails: Server succeeded but returned empty image URL.');
      }

      setServerImageUrl(resData.url);
      setUploadedBase64(resData.base64);
      setUploadSuccess(true);
      
      setImages([
        {
          id: resData.filename,
          url: resData.url,
          file: selectedFile,
          base64: resData.base64
        }
      ]);

    } catch (err: any) {
      console.error('Detailed Upload Error:', err);
      const errMsg = err.message || String(err);
      if (errMsg.includes('Upload failed') || errMsg.includes('NETWORK_ERROR') || errMsg.includes('PARSE_ERROR')) {
        setFileError(errMsg);
      } else {
        setFileError(`Upload failed\nHTTP Status: Unknown\nError: ${errMsg}\nDetails: See browser console for full stack trace.`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImage = () => {
    setSelectedFile(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    setFileError(null);
    setUploadSuccess(false);
    setServerImageUrl(null);
    setUploadedBase64(null);
    setImages([]);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to sleep/wait (used in backoff retries)
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Client-side recognize function with retry & backoff & fallback logic (Requirements 4, 5, 6)
  const recognizeScheduleImage = async (
    imagesPayload: { data: string; mimeType: string }[],
    model: string
  ): Promise<any> => {
    const retries = [2000, 4000, 8000]; // Delay times for each retry (Requirement 5)
    
    for (let attempt = 0; attempt <= retries.length; attempt++) {
      try {
        if (attempt > 0) {
          setRetryMessage(`Dịch vụ OCR đang bận. Đang thử lại lần ${attempt}/3...`);
          await delay(retries[attempt - 1]);
        }
        
        const response = await fetch('/api/ocr-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imagesPayload, model })
        });
        
        if (response.status === 503 || response.status === 429) {
          if (attempt < retries.length) {
            console.warn(`Got status ${response.status}. Retrying (Attempt ${attempt + 1})...`);
            continue;
          }
        }
        
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errMsg = resData.error?.message || resData.error || 'Lỗi bất ngờ từ API OCR.';
          throw {
            status: response.status,
            message: errMsg
          };
        }
        
        if (!resData.success || !resData.data) {
          throw { status: 500, message: 'Dữ liệu phân tích trả về từ AI không hợp lệ.' };
        }
        
        return resData.data;
      } catch (err: any) {
        const is503 = err.status === 503 || (err.message && err.message.includes('503'));
        if (is503 && attempt < retries.length) {
          console.warn(`Attempt ${attempt + 1} failed with 503. Retrying...`);
          continue;
        }
        throw err;
      }
    }
  };

  // Pre-populate empty schedule template if manual entry is selected (Requirement 7)
  const handleManualInput = () => {
    const nextWeekNum = String(existingSchedules.length > 0 ? (Math.max(...existingSchedules.map(s => Number(s.week_number) || 0)) + 1) : 3);
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const manualSched: WeeklySchedule = {
      id: `sched_added_${Date.now()}`,
      week_number: nextWeekNum,
      week_start_date: '',
      week_end_date: '',
      duty_week: '',
      school_year: '2026-2027',
      title: `LỊCH CÔNG TÁC TUẦN ${nextWeekNum}`,
      header_text: 'SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT MINH HÒA',
      days: dayNames.map((name, i) => ({
        id: `day_new_${i}_${Date.now()}`,
        day_of_week: name,
        date: '',
        date_str: '',
        morning_events: [
          { id: `ev_m_${i}_${Date.now()}`, text: '', confidence: 1.0, highlight: 'normal' }
        ],
        afternoon_events: [
          { id: `ev_a_${i}_${Date.now()}`, text: '', confidence: 1.0, highlight: 'normal' }
        ],
        duty_leader: 'Thầy Phương'
      })),
      footer: {
        working_time: 'Thời gian làm việc: Sáng từ 7h00 - 11h30; Chiều từ 13h30 - 17h00',
        recipients: '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
        principal_name: 'Trịnh Việt Phương'
      },
      original_images: images.map(img => img.base64),
      created_at: new Date().toISOString()
    };
    setParsedData(manualSched);
    setStep('review');
  };

  // Start OCR Processing Workflow
  const startOcrAnalysis = async () => {
    if (images.length === 0) return;

    setStep('processing');
    setProgressPercent(10);
    setCompletedChecklist([]);
    setProcessingError(null);
    setRetryMessage(null);

    // Simulate animated checklist progression while server works
    const checklistTimerItems = [0, 1, 2, 3, 4, 5, 6];
    let currentCheckIdx = 0;

    const interval = setInterval(() => {
      if (currentCheckIdx < checklistTimerItems.length) {
        setCompletedChecklist(prev => [...prev, currentCheckIdx]);
        setProgressPercent(Math.min(90, Math.round(((currentCheckIdx + 1) / checklistTimerItems.length) * 85)));
        currentCheckIdx++;
      }
    }, 700);

    // Step 0: Check OCR Configuration before calling API (Requirement 7)
    try {
      const statusRes = await fetch('/api/ocr-status');
      const statusData = await statusRes.json();
      if (!statusData.apiKeyConfigured) {
        clearInterval(interval);
        setStep('upload');
        setValidationError('⚠️ OCR chưa được cấu hình. Không thể kết nối dịch vụ nhận diện ảnh. Vui lòng kiểm tra API key và model OCR.');
        return;
      }
    } catch (errConfig) {
      console.warn("Failed config precheck, attempting to continue anyway...", errConfig);
    }

    try {
      const payloadImages = images.map(img => ({
        data: img.base64,
        mimeType: img.file.type || 'image/jpeg'
      }));

      let ocrResult: any = null;
      
      try {
        // Step 1: Try Primary Model (gemini-3.6-flash) with its retries (Requirement 6)
        console.log("Starting OCR with PRIMARY model (gemini-3.6-flash)...");
        ocrResult = await recognizeScheduleImage(payloadImages, 'gemini-3.6-flash');
      } catch (primaryErr: any) {
        const isPrimary503 = primaryErr.status === 503 || (primaryErr.message && primaryErr.message.includes('503'));
        
        if (isPrimary503) {
          console.warn("Primary model failed with 503 after retries. Trying FALLBACK model (gemini-3.8-flash)...");
          setRetryMessage("Đang chuyển sang model dự phòng (gemini-3.8-flash)...");
          await delay(1500);
          
          // Step 2: Try Fallback Model (gemini-3.8-flash) with its retries (Requirement 6)
          ocrResult = await recognizeScheduleImage(payloadImages, 'gemini-3.8-flash');
        } else {
          // If it was a non-503 error (like 401 Unauthorized API key), throw immediately
          throw primaryErr;
        }
      }

      clearInterval(interval);
      setCompletedChecklist([0, 1, 2, 3, 4, 5, 6]);
      setProgressPercent(100);
      setRetryMessage(null);

      // Requirement 9 Mapping: Map response JSON items array to internal WeeklySchedule format
      const title = ocrResult.title || 'LỊCH CÔNG TÁC TUẦN';
      const weekNumber = ocrResult.week || '3';
      const dateRange = ocrResult.date_range || '';

      const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
      const dayShortNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

      const daysMapped: ScheduleDay[] = dayNames.map((name, idx) => {
        const shortName = dayShortNames[idx];
        
        // Filter items for this day
        const dayItems = (ocrResult.items || []).filter((item: any) => {
          const itemDay = String(item.day || '').toLowerCase();
          return itemDay.includes(name.toLowerCase()) || 
                 itemDay.includes(shortName.toLowerCase()) ||
                 (name === 'Chủ Nhật' && (itemDay.includes('chủ nhật') || itemDay.includes('cn')));
        });

        // Extrapolate date from the first item
        const dateVal = dayItems.length > 0 ? (dayItems[0].date || '') : '';

        // Group morning & afternoon events
        const morning_events: ScheduleEvent[] = [];
        const afternoon_events: ScheduleEvent[] = [];
        let duty_leader = 'Thầy Phương';

        dayItems.forEach((item: any, itemIdx: number) => {
          const timeStr = String(item.time || '').toLowerCase();
          const contentStr = item.content || '';
          if (!contentStr) return;

          // Check for Leader Duty
          if (contentStr.toLowerCase().includes('trực lđ') || contentStr.toLowerCase().includes('trực lãnh đạo')) {
            duty_leader = item.person_in_charge || 'Thầy Phương';
          }

          // Build elegant readable text preserving all columns details
          let detailsText = '';
          if (item.time) detailsText += `[${item.time}] `;
          detailsText += contentStr;
          if (item.location) detailsText += ` (${item.location})`;
          if (item.person_in_charge) detailsText += ` - Phụ trách: ${item.person_in_charge}`;
          if (item.note) detailsText += ` [Ghi chú: ${item.note}]`;

          const eventObj: ScheduleEvent = {
            id: `ev_${idx}_${itemIdx}_${Date.now()}`,
            text: detailsText,
            confidence: 0.95,
            highlight: 'normal'
          };

          const isAfternoon = timeStr.includes('chiều') || 
                              timeStr.includes('13h') || 
                              timeStr.includes('14h') || 
                              timeStr.includes('15h') || 
                              timeStr.includes('16h') || 
                              timeStr.includes('17h') ||
                              timeStr.includes('pm');

          if (isAfternoon) {
            afternoon_events.push(eventObj);
          } else {
            morning_events.push(eventObj);
          }
        });

        // Ensure at least one blank row so day isn't empty
        if (morning_events.length === 0) {
          morning_events.push({ id: `ev_m_${idx}_blank_${Date.now()}`, text: '', confidence: 1.0, highlight: 'normal' });
        }
        if (afternoon_events.length === 0) {
          afternoon_events.push({ id: `ev_a_${idx}_blank_${Date.now()}`, text: '', confidence: 1.0, highlight: 'normal' });
        }

        return {
          id: `day_${idx}_${Date.now()}`,
          day_of_week: name,
          date: dateVal,
          date_str: dateVal,
          morning_events,
          afternoon_events,
          duty_leader
        };
      });

      const parsedWeekNum = parseInt(String(weekNumber), 10) || currentWeekNumber || 3;
      const weekInfo = getWeekInfoByNumber(parsedWeekNum, currentYear);
      const weekId = generateWeekId(parsedWeekNum, currentYear);

      const formattedSchedule: WeeklySchedule = {
        id: weekId,
        weekId: weekId,
        weekNumber: parsedWeekNum,
        startDate: weekInfo.startDateIso,
        endDate: weekInfo.endDateIso,
        academicYear: currentYear,
        week_number: String(parsedWeekNum),
        week_start_date: weekInfo.startDateIso,
        week_end_date: weekInfo.endDateIso,
        duty_week: `Lớp ${parsedWeekNum === 3 ? '12C' : parsedWeekNum === 4 ? '12B' : '12A'}`,
        school_year: currentYear,
        title: title || `LỊCH CÔNG TÁC TUẦN ${parsedWeekNum}`,
        header_text: 'SỞ GD&ĐT PHÚ THỌ - TRƯỜNG THPT MINH HÒA',
        days: daysMapped,
        footer: {
          working_time: 'Thời gian làm việc: Sáng từ 7h00 - 11h30; Chiều từ 13h30 - 17h00',
          recipients: '- BGH;\n- Niêm yết bảng tin;\n- Lưu VT.',
          principal_name: 'Trịnh Việt Phương'
        },
        original_images: images.map(img => img.url),
        created_at: new Date().toISOString()
      };

      setTimeout(() => {
        setParsedData(formattedSchedule);
        setStep('review');
      }, 500);

    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      
      const errMsg = err.message || 'Không thể nhận diện hình ảnh. Vui lòng tải ảnh rõ hơn hoặc chụp lại toàn bộ trang.';
      setProcessingError(errMsg);
      setRetryMessage(null);
    }
  };

  // Field Edit Helpers
  const updateMetadata = (field: keyof WeeklySchedule, value: string) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, [field]: value });
  };

  const updateFooter = (field: 'working_time' | 'recipients' | 'principal_name', value: string) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      footer: {
        ...(parsedData.footer || {}),
        [field]: value
      }
    });
  };

  const updateEventText = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number, newText: string) => {
    if (!parsedData) return;
    const newDays = [...parsedData.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      const newEvents = [...targetDay.morning_events];
      newEvents[eventIdx] = { ...newEvents[eventIdx], text: newText };
      targetDay.morning_events = newEvents;
    } else {
      const newEvents = [...targetDay.afternoon_events];
      newEvents[eventIdx] = { ...newEvents[eventIdx], text: newText };
      targetDay.afternoon_events = newEvents;
    }
    newDays[dayIdx] = targetDay;
    setParsedData({ ...parsedData, days: newDays });
  };

  const toggleEventHighlight = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number) => {
    if (!parsedData) return;
    const newDays = [...parsedData.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      const newEvents = [...targetDay.morning_events];
      const cur = newEvents[eventIdx].highlight;
      newEvents[eventIdx] = { ...newEvents[eventIdx], highlight: cur === 'red' ? 'normal' : 'red' };
      targetDay.morning_events = newEvents;
    } else {
      const newEvents = [...targetDay.afternoon_events];
      const cur = newEvents[eventIdx].highlight;
      newEvents[eventIdx] = { ...newEvents[eventIdx], highlight: cur === 'red' ? 'normal' : 'red' };
      targetDay.afternoon_events = newEvents;
    }
    newDays[dayIdx] = targetDay;
    setParsedData({ ...parsedData, days: newDays });
  };

  const addEvent = (dayIdx: number, session: 'morning' | 'afternoon') => {
    if (!parsedData) return;
    const newDays = [...parsedData.days];
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
    setParsedData({ ...parsedData, days: newDays });
  };

  const removeEvent = (dayIdx: number, session: 'morning' | 'afternoon', eventIdx: number) => {
    if (!parsedData) return;
    const newDays = [...parsedData.days];
    const targetDay = { ...newDays[dayIdx] };
    if (session === 'morning') {
      targetDay.morning_events = targetDay.morning_events.filter((_, idx) => idx !== eventIdx);
    } else {
      targetDay.afternoon_events = targetDay.afternoon_events.filter((_, idx) => idx !== eventIdx);
    }
    newDays[dayIdx] = targetDay;
    setParsedData({ ...parsedData, days: newDays });
  };

  const updateDutyLeader = (dayIdx: number, name: string) => {
    if (!parsedData) return;
    const newDays = [...parsedData.days];
    newDays[dayIdx] = { ...newDays[dayIdx], duty_leader: name };
    setParsedData({ ...parsedData, days: newDays });
  };

  // Final Confirmation & Duplicate Protection
  const handleConfirmSave = async (forceNew: boolean = false, isUpdate: boolean = false) => {
    if (!parsedData) return;

    // Check for duplicate week schedule
    if (!forceNew && !isUpdate) {
      const existing = existingSchedules.find(s => 
        s.week_number === parsedData.week_number && 
        (s.school_year === parsedData.school_year || !s.school_year)
      );

      if (existing) {
        setDuplicateConflict(existing);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const scheduleToSave = { ...parsedData };
      if (!saveOriginalImage) {
        delete scheduleToSave.original_images;
      }

      await onSaveSchedule(scheduleToSave, isUpdate);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setValidationError('Không thể lưu lịch công tác. Vui lòng kiểm tra lại.');
    }
  };

  const checklistItems = [
    'Nhận diện văn bản',
    'Nhận diện bảng',
    'Nhận diện ngày',
    'Nhận diện buổi sáng/chiều',
    'Nhận diện nội dung công việc',
    'Nhận diện người trực lãnh đạo',
    'Hoàn tất'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/40 text-blue-300">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">TẢI LỊCH CÔNG TÁC TỪ HÌNH ẢNH</h2>
              <p className="text-xs text-slate-300">Nhận diện AI OCR tự động – Trường THPT Minh Hòa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: UPLOAD IMAGES */}
        {step === 'upload' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {!selectedFile ? (
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 transition-all rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center gap-3 group"
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/jpeg,image/png,image/jpg,image/webp" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                <div className="p-4 rounded-full bg-white shadow-md text-blue-600 group-hover:scale-110 transition-transform">
                  <Upload size={36} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800">📷 Kéo thả hình ảnh lịch công tác vào đây</p>
                  <p className="text-xs text-slate-500 mt-1">hoặc click để chọn tệp từ máy tính</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-xs">
                  <span>Hỗ trợ tối đa 10MB: JPG, PNG, JPEG, WEBP</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 animate-in fade-in duration-150">
                {/* Left Side: Preview Image */}
                <div className="md:w-1/2 flex flex-col items-center justify-center bg-slate-900 rounded-xl p-3 relative overflow-hidden min-h-[250px] shadow-inner">
                  {/* Load the actual uploaded server url if success, else local preview */}
                  <img 
                    src={serverImageUrl || localPreviewUrl || ''} 
                    alt="Xem trước lịch công tác" 
                    className="max-h-[300px] object-contain rounded-lg shadow-md border border-slate-700" 
                  />
                  {uploadSuccess && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1">
                      <CheckCircle size={12} /> Đã lưu vào máy chủ
                    </div>
                  )}
                </div>

                {/* Right Side: Metadata and Actions */}
                <div className="md:w-1/2 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                      <ImageIcon size={18} className="text-blue-600" />
                      Thông tin tệp ảnh đã chọn
                    </h3>
                    <div className="text-xs space-y-2 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-500">Tên file:</span>{' '}
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 break-all">{selectedFile.name}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Dung lượng:</span>{' '}
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Trạng thái tệp:</span>{' '}
                        {uploadSuccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs">
                            🟢 Tải lên thành công
                          </span>
                        ) : isUploading ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs animate-pulse">
                            🔄 Đang tải ảnh lên...
                          </span>
                        ) : fileError ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs">
                            🔴 Tải ảnh lên thất bại
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold text-xs">
                            🟠 Chờ tải lên
                          </span>
                        )}
                      </div>
                      {uploadSuccess && (
                        <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50/50 p-2 border border-emerald-100 rounded-lg">
                          “Ảnh đã được lưu vào hệ thống.”
                        </p>
                      )}
                      {isUploading && (
                        <div className="mt-3 space-y-1.5 animate-in fade-in">
                          <div className="flex justify-between text-[11px] font-bold text-blue-700">
                            <span>Đang đồng bộ dữ liệu...</span>
                            <span>95%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                          </div>
                        </div>
                      )}
                      {serverImageUrl && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="font-semibold text-slate-500">Đường dẫn lưu trữ:</span>{' '}
                          <a 
                            href={serverImageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-mono text-blue-600 hover:text-blue-800 underline break-all text-[11px]"
                          >
                            {serverImageUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Actions Error */}
                  {fileError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                        <span>Chi tiết lỗi tải tệp:</span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-mono pl-6 whitespace-pre-wrap break-all leading-relaxed bg-white/50 p-2 border border-rose-100 rounded-lg">{fileError}</p>
                    </div>
                  )}

                  {/* Buttons for Selection Action */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                    <button 
                      type="button" 
                      onClick={handleResetImage}
                      disabled={isUploading}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      🗑 Xóa ảnh / Chọn lại
                    </button>
                    {!uploadSuccess && !fileError && (
                      <button 
                        type="button" 
                        onClick={handleUploadImage}
                        disabled={isUploading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        {isUploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
                      </button>
                    )}
                    {fileError && (
                      <button 
                        type="button" 
                        onClick={handleUploadImage}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 animate-bounce-subtle"
                      >
                        🔄 Thử lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-rose-800 animate-fade-in">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Connection Test Panel */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Chẩn đoán kết nối OCR AI</h4>
                </div>
                <button
                  type="button"
                  onClick={testOcrConnection}
                  disabled={testingConnection}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  {testingConnection ? 'Đang kiểm tra...' : '⚡ Kiểm tra kết nối'}
                </button>
              </div>

              {connectionStatus ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">API Key:</span>
                      {connectionStatus.apiKeyConfigured ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                          ✓ Đã cấu hình ({connectionStatus.apiKeyPrefix})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px]">
                          ✗ Chưa cấu hình
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Model thực tế:</span>
                      <span className="font-mono text-[11px] text-slate-700">{connectionStatus.modelUsed}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Model tồn tại:</span>
                      <span className="text-emerald-700 font-bold">✓ Có</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Image input + Text output:</span>
                      <span className="text-emerald-700 font-bold">✓ Có hỗ trợ</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Kết nối API:</span>
                    {connectionStatus.apiConnection ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        ● Kết nối thành công (Model đang hoạt động hoàn hảo)
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        ● Thất bại
                      </span>
                    )}
                  </div>

                  {connectionStatus.errorMessage && (
                    <div className="sm:col-span-2 p-2 bg-rose-50 border border-rose-100 rounded text-rose-800 text-[11px] leading-relaxed font-mono whitespace-pre-wrap">
                      Lỗi: {connectionStatus.errorMessage}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Nhấp vào nút để chạy chẩn đoán toàn bộ cấu hình API Key, Model và khả năng xử lý của Gemini.</p>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                disabled={!uploadSuccess}
                onClick={startOcrAnalysis}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  uploadSuccess ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
                }`}
                title={!uploadSuccess ? 'Vui lòng tải ảnh lên máy chủ thành công trước khi OCR' : 'Bắt đầu nhận diện OCR bằng AI'}
              >
                <span>🔍 Xử lý OCR</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING AI OCR */}
        {step === 'processing' && (
          <div className="p-6 flex-1 flex flex-col sm:flex-row gap-6 overflow-hidden">
            {/* Left Image Preview */}
            <div className="sm:w-1/2 bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center relative min-h-[300px]">
              {images.length > 0 && (
                <img 
                  src={images[selectedImageIdx]?.url} 
                  alt="Lịch công tác" 
                  className="max-h-[360px] object-contain rounded-lg border border-slate-700" 
                />
              )}
              {images.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {images.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedImageIdx(i)}
                      className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                        selectedImageIdx === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Ảnh {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Progress Checklist */}
            <div className="sm:w-1/2 flex flex-col justify-center space-y-6 p-4">
              {processingError ? (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertCircle size={20} className="text-rose-600 shrink-0" />
                    <span>Không thể nhận diện hình ảnh</span>
                  </div>
                  <p className="text-xs leading-relaxed font-mono whitespace-pre-wrap">{processingError}</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={startOcrAnalysis}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <RefreshCw size={14} /> 🔄 Thử lại OCR
                    </button>
                    <button 
                      type="button" 
                      onClick={handleManualInput}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Edit3 size={14} /> ✏️ Nhập lịch thủ công
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setStep('upload')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      ← Chọn ảnh khác
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {retryMessage && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold text-amber-900 animate-pulse">
                      <RefreshCw size={16} className="text-amber-600 animate-spin shrink-0" />
                      <span>{retryMessage}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                      <span>Đang phân tích lịch công tác THPT Minh Hòa...</span>
                      <span className="text-blue-600">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {checklistItems.map((item, idx) => {
                      const isDone = completedChecklist.includes(idx);
                      const isCurrent = completedChecklist.length === idx;

                      return (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          {isDone ? (
                            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                          ) : isCurrent ? (
                            <RefreshCw size={18} className="text-blue-600 animate-spin shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span className={isDone ? 'font-bold text-slate-900' : isCurrent ? 'font-bold text-blue-700' : 'text-slate-400'}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & EDIT OCR RESULTS SIDE-BY-SIDE */}
        {step === 'review' && parsedData && (
          <div className="p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            
            {/* Left Column: Original Image Reference Viewer */}
            <div className="lg:w-2/5 flex flex-col bg-slate-900 rounded-2xl p-3 overflow-hidden border border-slate-800">
              <div className="flex items-center justify-between text-xs text-white pb-2 mb-2 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5 text-blue-400">
                  <Eye size={16} /> ẢNH LỊCH GỐC MINH CHỨNG
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300" 
                    title="Phóng to"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300" 
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button 
                    onClick={() => setZoomLevel(1)}
                    className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Scrollable Image Area */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-950/50 rounded-xl relative">
                {images.length > 0 && (
                  <img 
                    src={images[selectedImageIdx]?.url} 
                    alt="Ảnh lịch công tác gốc"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                    className="max-w-full transition-transform duration-200 rounded shadow-lg"
                  />
                )}
              </div>

              {/* Gallery switch if multiple images */}
              {images.length > 1 && (
                <div className="flex gap-2 pt-2 border-t border-slate-800 justify-center">
                  {images.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedImageIdx(i)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg ${
                        selectedImageIdx === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Trang {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Interactive Data Verification & Form Editor */}
            <div className="lg:w-3/5 flex flex-col flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Alert header banner */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <span>Vui lòng kiểm tra lại dữ liệu vừa nhận diện. Bạn có thể trực tiếp chỉnh sửa bất kỳ ô thông tin nào trước khi lưu.</span>
                </div>
              </div>

              {/* Administrative Header Info */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800">
                  📌 THÔNG TIN HÀNH CHÍNH LỊCH CÔNG TÁC
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tuần số:</label>
                    <input 
                      type="text" 
                      value={parsedData.week_number} 
                      onChange={e => updateMetadata('week_number', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Từ ngày:</label>
                    <input 
                      type="date" 
                      value={parsedData.week_start_date} 
                      onChange={e => updateMetadata('week_start_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Đến ngày:</label>
                    <input 
                      type="date" 
                      value={parsedData.week_end_date} 
                      onChange={e => updateMetadata('week_end_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trực tuần:</label>
                    <input 
                      type="text" 
                      value={parsedData.duty_week} 
                      onChange={e => updateMetadata('duty_week', e.target.value)}
                      placeholder="VD: Lớp 12C"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-blue-700 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Day-by-Day Table Editor */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>📅 BẢNG LỊCH CÔNG TÁC CÁC NGÀY TRONG TUẦN</span>
                  <span className="text-[10px] text-slate-500 font-normal">Sáng / Chiều / Trực Lãnh Đạo</span>
                </h3>

                <div className="space-y-3">
                  {parsedData.days.map((day, dayIdx) => (
                    <div key={day.id || dayIdx} className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-extrabold rounded-lg text-xs">
                            {day.day_of_week}
                          </span>
                          <input 
                            type="text" 
                            value={day.date_str || day.date || ''} 
                            onChange={e => {
                              const newDays = [...parsedData.days];
                              newDays[dayIdx].date_str = e.target.value;
                              setParsedData({ ...parsedData, days: newDays });
                            }}
                            placeholder="Ngày (VD: 21/9)"
                            className="px-2 py-0.5 text-xs font-semibold border border-slate-200 rounded w-28 bg-slate-50"
                          />
                        </div>

                        {/* Duty Leader Input with confidence indicator */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-700">Trực LĐ:</span>
                          <input 
                            type="text" 
                            value={day.duty_leader} 
                            onChange={e => updateDutyLeader(dayIdx, e.target.value)}
                            className={`px-2 py-1 text-xs font-bold rounded-lg border outline-none w-28 ${
                              (day.duty_leader_confidence ?? 1) < 0.85 
                                ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-300' 
                                : 'bg-slate-50 border-slate-300 text-slate-800'
                            }`}
                          />
                          {(day.duty_leader_confidence ?? 1) < 0.85 && (
                            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] font-bold rounded flex items-center gap-0.5" title="Chữ mờ / Cần kiểm tra">
                              ⚠ {Math.round((day.duty_leader_confidence ?? 0.72) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Morning Events Section */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="text-blue-700">☀️ BUỔI SÁNG:</span>
                          <button 
                            type="button" 
                            onClick={() => addEvent(dayIdx, 'morning')}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus size={12} /> Thêm dòng
                          </button>
                        </div>
                        {day.morning_events.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Chưa có thông tin công việc sáng</p>
                        ) : (
                          day.morning_events.map((ev, evIdx) => (
                            <div key={ev.id || evIdx} className="flex items-center gap-1.5">
                              <input 
                                type="text" 
                                value={ev.text} 
                                onChange={e => updateEventText(dayIdx, 'morning', evIdx, e.target.value)}
                                className={`flex-1 px-2.5 py-1 text-xs border rounded-lg outline-none ${
                                  ev.highlight === 'red' ? 'border-rose-300 text-rose-700 font-bold bg-rose-50/50' : 'border-slate-200 text-slate-800 bg-white'
                                } ${(ev.confidence ?? 1) < 0.85 ? 'bg-amber-50 border-amber-300' : ''}`}
                              />
                              <button 
                                type="button" 
                                onClick={() => toggleEventHighlight(dayIdx, 'morning', evIdx)}
                                className={`p-1 rounded text-[10px] font-bold border cursor-pointer ${
                                  ev.highlight === 'red' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Đổi màu chữ đỏ"
                              >
                                🔴
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeEvent(dayIdx, 'morning', evIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Afternoon Events Section */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="text-amber-800">🌙 BUỔI CHIỀU:</span>
                          <button 
                            type="button" 
                            onClick={() => addEvent(dayIdx, 'afternoon')}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus size={12} /> Thêm dòng
                          </button>
                        </div>
                        {day.afternoon_events.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Chưa có thông tin công việc chiều</p>
                        ) : (
                          day.afternoon_events.map((ev, evIdx) => (
                            <div key={ev.id || evIdx} className="flex items-center gap-1.5">
                              <input 
                                type="text" 
                                value={ev.text} 
                                onChange={e => updateEventText(dayIdx, 'afternoon', evIdx, e.target.value)}
                                className={`flex-1 px-2.5 py-1 text-xs border rounded-lg outline-none ${
                                  ev.highlight === 'red' ? 'border-rose-300 text-rose-700 font-bold bg-rose-50/50' : 'border-slate-200 text-slate-800 bg-white'
                                } ${(ev.confidence ?? 1) < 0.85 ? 'bg-amber-50 border-amber-300' : ''}`}
                              />
                              <button 
                                type="button" 
                                onClick={() => toggleEventHighlight(dayIdx, 'afternoon', evIdx)}
                                className={`p-1 rounded text-[10px] font-bold border cursor-pointer ${
                                  ev.highlight === 'red' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Đổi màu chữ đỏ"
                              >
                                🔴
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeEvent(dayIdx, 'afternoon', evIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Administrative Info */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800">
                  📝 CHÂN TRANG & NƠI NHẬN
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Thời gian làm việc / Lưu ý:</label>
                    <input 
                      type="text" 
                      value={parsedData.footer?.working_time || ''} 
                      onChange={e => updateFooter('working_time', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Họ tên Hiệu trưởng:</label>
                    <input 
                      type="text" 
                      value={parsedData.footer?.principal_name || ''} 
                      onChange={e => updateFooter('principal_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Save Original Image Checkbox Option */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-950">
                <input 
                  type="checkbox" 
                  id="save_orig_img" 
                  checked={saveOriginalImage} 
                  onChange={e => setSaveOriginalImage(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer" 
                />
                <label htmlFor="save_orig_img" className="font-bold cursor-pointer">
                  ☑ Lưu ảnh gốc làm bản tham chiếu (Cho phép người xem mở lại ảnh chụp bất kỳ lúc nào)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Quay lại tải ảnh
                </button>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => handleConfirmSave(false, false)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Save size={16} />
                    <span>{isSubmitting ? 'Đang lưu...' : '✓ Xác nhận & lưu lịch'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* DUPLICATE SCHEDULE PROTECTION WARNING MODAL */}
      {duplicateConflict && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-300 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-rose-100 text-rose-800 rounded-xl flex items-center gap-3">
              <AlertCircle size={24} className="text-rose-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">⚠ Cảnh báo trùng lặp lịch công tác</h3>
                <p className="text-xs text-rose-900 mt-0.5">
                  Lịch công tác <strong>Tuần {duplicateConflict.week_number} ({duplicateConflict.school_year})</strong> đã tồn tại trên hệ thống!
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có muốn cập nhật nội dung từ ảnh mới vào lịch tuần này không, hay tạo một bản lịch riêng biệt?
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                type="button"
                onClick={() => handleConfirmSave(false, true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                🔄 Cập nhật lịch hiện tại (Ghi đè nội dung mới)
              </button>
              <button 
                type="button"
                onClick={() => handleConfirmSave(true, false)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                ➕ Tạo bản mới (Giữ nguyên cả 2 bản)
              </button>
              <button 
                type="button"
                onClick={() => setDuplicateConflict(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
