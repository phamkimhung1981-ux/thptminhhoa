import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware for JSON body parser with increased limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS middleware for all incoming requests (prevent "Failed to fetch" on preflights or cross-origin)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const OCR_MODEL_PRIMARY = "gemini-3.6-flash";
  const OCR_MODEL_FALLBACK = "gemini-3.8-flash";

  // Validate function (Requirement 4)
  function validateOCRConfig() {
    const apiKey = process.env.GEMINI_API_KEY;
    const isConfigured = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0;
    const prefix = isConfigured ? apiKey!.substring(0, 6) : 'None';
    
    console.log('[OCR CONFIG] API key:', isConfigured ? 'PRESENT' : 'MISSING');
    console.log('[OCR CONFIG] Primary Model:', OCR_MODEL_PRIMARY);
    console.log('[OCR CONFIG] Fallback Model:', OCR_MODEL_FALLBACK);
    console.log('[OCR CONFIG] Endpoint: /api/ocr-schedule');
    console.log('[OCR CONFIG] Ready:', isConfigured ? 'TRUE' : 'FALSE');
    
    return {
      isConfigured,
      prefix,
      model: OCR_MODEL_PRIMARY,
      fallback: OCR_MODEL_FALLBACK,
      endpoint: '/api/ocr-schedule'
    };
  }

  // API Endpoint to check OCR config and lightweight text check (Requirement 10 & 17)
  app.get('/api/ocr-status', async (req, res) => {
    const config = validateOCRConfig();
    if (!config.isConfigured) {
      return res.json({
        success: true,
        apiKeyConfigured: false,
        apiKeyPrefix: 'None',
        modelUsed: config.model,
        apiConnection: false,
        errorMessage: 'Chưa cấu hình API key. Vui lòng thiết lập biến GEMINI_API_KEY trong Secrets.'
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Simple test request to verify connection (Requirement 10)
      const response = await ai.models.generateContent({
        model: config.model,
        contents: "Trả lời OK nếu model đang hoạt động.",
      });

      const responseText = response.text || '';
      const connectionSuccessful = responseText.includes('OK') || responseText.length > 0;

      return res.json({
        success: true,
        apiKeyConfigured: true,
        apiKeyPrefix: config.prefix + '...',
        modelUsed: config.model,
        apiConnection: connectionSuccessful,
        responseSample: responseText.trim(),
        errorMessage: null
      });
    } catch (err: any) {
      console.error('OCR Connection Check Failed:', err);
      return res.json({
        success: true,
        apiKeyConfigured: true,
        apiKeyPrefix: config.prefix + '...',
        modelUsed: config.model,
        apiConnection: false,
        errorMessage: err.message || String(err)
      });
    }
  });

  // Ensure public/uploads directory exists
  const uploadDir = path.join(__dirname, 'public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Multer configuration using memory storage (safer in serverless and containers)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB limit (Requirement 1)
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      
      if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ cho phép tải lên hình ảnh định dạng JPG, JPEG, PNG, hoặc WEBP.'));
      }
    }
  });

  // Serve the uploads directory statically (Requirement 4)
  app.use('/uploads', express.static(uploadDir));

  // Endpoint to handle Image Upload with fallback (Requirement 3, 4, 5, 6)
  app.post('/api/upload-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp một file hình ảnh lịch công tác.' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const filename = 'schedule-' + uniqueSuffix + ext;
      const filePath = path.join(uploadDir, filename);

      // Save file buffer to public/uploads
      fs.writeFileSync(filePath, req.file.buffer);

      // Double check that file is saved on disk (Requirement 5)
      if (!fs.existsSync(filePath)) {
        throw new Error('Lỗi đồng bộ lưu trữ: Tệp tin chưa được lưu trên máy chủ.');
      }

      const imageUrl = `/uploads/${filename}`;
      const base64Data = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      return res.json({
        success: true,
        url: imageUrl,
        filename: filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: mimeType,
        base64: `data:${mimeType};base64,${base64Data}`
      });

    } catch (innerErr: any) {
      console.error('Error writing file or handling upload payload:', innerErr);
      
      // Robust Fallback: If disk write is completely blocked, return inline base64 URL so it works seamlessly!
      if (req.file) {
        const mimeType = req.file.mimetype || 'image/jpeg';
        const base64Data = req.file.buffer.toString('base64');
        const base64Url = `data:${mimeType};base64,${base64Data}`;
        
        return res.json({
          success: true,
          url: base64Url,
          filename: 'schedule-fallback-' + Date.now() + '.jpg',
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: mimeType,
          base64: base64Url
        });
      }
      
      return res.status(500).json({ success: false, error: innerErr.message || 'Lỗi xử lý tệp tin trên máy chủ.' });
    }
  }, (err: any, req: any, res: any, next: any) => {
    console.error('Multer upload middleware error handler caught:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Lỗi tải tệp tin lên. Đảm bảo kích thước tệp < 10MB và định dạng là JPG/PNG/WEBP.'
    });
  });

  // API Endpoint for OCR / AI Parsing of Schedule Images
  app.post('/api/ocr-schedule', async (req, res) => {
    try {
      const { images, model } = req.body; // Array of { data: string (base64), mimeType: string }

      let requestedModel = model || OCR_MODEL_PRIMARY;
      
      // Map legacy/unavailable models to primary
      if (requestedModel === 'gemini-2.5-flash') {
        requestedModel = OCR_MODEL_PRIMARY;
      }

      // Realtime log debug (Requirement 1)
      console.log('--------------------------');
      console.log('OCR MODEL:');
      console.log(requestedModel);
      console.log('OCR ENDPOINT:');
      console.log('/api/ocr-schedule');
      console.log('--------------------------');

      // Check API Key existence and validation (Requirement 3)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length === 0) {
        return res.status(401).json({ 
          error: {
            code: 401,
            status: "UNAUTHORIZED",
            message: "Model OCR chưa được cấu hình. Vui lòng thiết lập API key trong Secrets."
          }
        });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một hình ảnh lịch công tác.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const parts: any[] = [];

      // Add each image part
      for (const img of images) {
        let base64Data = typeof img === 'string' ? img : (img.data || img);
        let mimeType = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/jpeg';
        
        if (typeof base64Data === 'string' && base64Data.includes(';base64,')) {
          const split = base64Data.split(';base64,');
          const matchMime = split[0].match(/data:(.*?);/);
          if (matchMime) mimeType = matchMime[1];
          base64Data = split[1];
        }

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      // Specialized Requirement 9 Prompt for School Weekly Schedule
      parts.push({
        text: `Hãy đọc chính xác nội dung lịch công tác trong ảnh.

Đây là bảng lịch công tác của Trường THPT Minh Hòa.

Hãy nhận diện:
- tiêu đề
- tuần
- khoảng thời gian
- thứ
- ngày
- thời gian
- nội dung công việc
- địa điểm
- người thực hiện/phụ trách
- ghi chú

Giữ nguyên thứ tự các dòng trong bảng.

Không tự suy đoán nội dung bị mờ hoặc không nhìn thấy.

Nếu một ô không đọc được, để chuỗi rỗng.

Kết quả trả về JSON hợp lệ theo cấu trúc:

{
  "title": "",
  "week": "",
  "date_range": "",
  "items": [
    {
      "day": "",
      "date": "",
      "time": "",
      "content": "",
      "location": "",
      "person_in_charge": "",
      "note": ""
    }
  ]
}

Chỉ trả về JSON, không thêm markdown.`
      });

      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: { parts },
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Tiêu đề lịch công tác" },
              week: { type: Type.STRING, description: "Số tuần (ví dụ: '3')" },
              date_range: { type: Type.STRING, description: "Khoảng thời gian (ví dụ: '21/9 - 27/9')" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: "Thứ trong tuần (Thứ Hai, Thứ Ba...)" },
                    date: { type: Type.STRING, description: "Ngày (ví dụ: '21/09')" },
                    time: { type: Type.STRING, description: "Thời gian / buổi (ví dụ: 'Sáng', 'Chiều', '7h30')" },
                    content: { type: Type.STRING, description: "Nội dung công việc cụ thể" },
                    location: { type: Type.STRING, description: "Địa điểm" },
                    person_in_charge: { type: Type.STRING, description: "Người thực hiện/phụ trách/trực" },
                    note: { type: Type.STRING, description: "Ghi chú" }
                  },
                  required: ["day", "content"]
                }
              }
            },
            required: ["title", "items"]
          }
        }
      });

      const rawText = response.text || '{}';
      
      // Clean up markdown block wrapper for JSON parsing (Requirement 10)
      let cleanText = rawText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsedData = JSON.parse(cleanText);

      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('OCR API Error:', err);
      
      let status = 'INTERNAL';
      let code = 500;
      let message = err.message || 'Không thể nhận diện hình ảnh. Vui lòng thử lại.';

      // Classify error type (Requirement 11)
      const errStr = String(err.message || '').toLowerCase();
      const errStatus = Number(err.status || 0);

      if (errStatus === 401 || errStatus === 403 || errStr.includes('api_key') || errStr.includes('unauthorized') || errStr.includes('key not valid')) {
        code = 401;
        status = 'UNAUTHORIZED';
        message = 'API key không có quyền sử dụng model OCR hoặc không hợp lệ.';
      } else if (errStatus === 404 || errStr.includes('not found') || errStr.includes('no longer available')) {
        code = 404;
        status = 'NOT_FOUND';
        message = 'Model OCR không khả dụng hoặc không tồn tại.';
      } else if (errStatus === 429 || errStr.includes('quota') || errStr.includes('rate limit')) {
        code = 429;
        status = 'RESOURCE_EXHAUSTED';
        message = 'API OCR đã đạt giới hạn sử dụng (Quota Exceeded).';
      } else if (errStatus === 503 || errStr.includes('unavailable') || errStr.includes('busy') || errStr.includes('overloaded') || errStr.includes('high demand')) {
        code = 503;
        status = 'UNAVAILABLE';
        message = 'Dịch vụ OCR đang tạm thời quá tải hoặc đang bận.';
      } else if (errStatus === 400 || errStr.includes('invalid') || errStr.includes('bad request')) {
        code = 400;
        status = 'INVALID_ARGUMENT';
        message = 'Ảnh không đúng định dạng hoặc yêu cầu không hợp lệ.';
      }

      return res.status(code).json({
        error: {
          code,
          status,
          message
        }
      });
    }
  });

  // Vite integration in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
      ? path.join(__dirname, 'dist')
      : fs.existsSync(path.join(__dirname, 'build', 'index.html'))
      ? path.join(__dirname, 'build')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
