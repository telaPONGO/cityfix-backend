const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const authenticate = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');
const upload = multer({ dest: uploadDir });

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const getApiHost = (req) => {
  const host = req.get('host');
  const protocol = host?.includes('onrender.com') || host?.includes('production') ? 'https' : 'http';
  return process.env.API_HOST?.replace(/\/$/, '') || `${protocol}://${host}`;
};

const normalizeImagePath = (imagePath, apiHost) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  const trimmed = imagePath.trim();
  
  // Already a valid remote URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Already a data URL
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  // Convert relative uploads paths to absolute URLs
  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) {
    return `${apiHost}/${normalized}`;
  }
  if (normalized.startsWith('/uploads/')) {
    return `${apiHost}${normalized}`;
  }
  
  // Anything else is invalid (local device path, etc.)
  console.warn(`[normalizeImagePath] Ignorando ruta inválida (local device): ${trimmed.substring(0, 80)}`);
  return null;
};

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) {
      filter.clientId = req.query.userId;
    }
    console.log('[GET /reports] Obteniendo reportes con filtro:', filter);
    const reports = await Report.find(filter).sort({ fecha: -1 });
    console.log(`[GET /reports] Se encontraron ${reports.length} reportes`);
    const apiHost = getApiHost(req);
    const normalizedReports = reports.map((report) => {
      const doc = report.toObject();
      const normalizedPath = normalizeImagePath(doc.imagePath, apiHost);
      doc.imagePath = normalizedPath || null;
      return doc;
    });
    return res.json(normalizedReports);
  } catch (error) {
    console.error('[GET /reports] Error:', error);
    return res.status(500).json({ message: 'Error al obtener reportes', error });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ clientId: req.user.id }).sort({ fecha: -1 });
    const apiHost = getApiHost(req);
    const normalizedReports = reports.map((report) => {
      const doc = report.toObject();
      const normalizedPath = normalizeImagePath(doc.imagePath, apiHost);
      doc.imagePath = normalizedPath || null;
      return doc;
    });
    return res.json(normalizedReports);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener mis reportes', error });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    console.log('[POST /reports] ========== INICIO ==========');
    console.log('[POST /reports] Usuario:', req.user?.email);
    console.log('[POST /reports] Tiene imagePath:', !!req.body.imagePath);
    if (req.body.imagePath) {
      const pathPreview = req.body.imagePath.substring(0, 100);
      console.log('[POST /reports] imagePath preview:', pathPreview);
    }
    console.log('[POST /reports] Campos enviados:', Object.keys(req.body));

    const { id, user, userName, userLastname, clientId, imagePath, ...reportData } = req.body;

    // Basic validation
    if (!reportData.titulo || !reportData.descripcion) {
      console.warn('[POST /reports] Datos inválidos:', reportData);
      return res.status(400).json({ message: 'Título y descripción son requeridos' });
    }

    // Process image if provided
    let processedImagePath = null;
    const host = req.get('host');
    const protocol = host?.includes('onrender.com') || host?.includes('production') ? 'https' : 'http';
    const apiHost = process.env.API_HOST?.replace(/\/$/, '') || `${protocol}://${host}`;

    if (imagePath && imagePath.startsWith('data:')) {
      try {
        // Extract base64 data from data URL
        const matches = imagePath.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const ext = mimeType.split('/')[1] || 'jpg';
          const filename = `report_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filepath = path.join(uploadDir, filename);
          
          // Save file
          fs.writeFileSync(filepath, buffer);
          
          processedImagePath = `${apiHost}/uploads/${filename}`;
          console.log('[POST /reports] Imagen guardada:', processedImagePath);
        }
      } catch (error) {
        console.error('[POST /reports] Error procesando imagen:', error);
      }
    } else if (imagePath) {
      const normalized = normalizeImagePath(imagePath, apiHost);
      if (normalized) {
        processedImagePath = normalized;
      } else {
        console.warn('[POST /reports] Ignorando imagePath no válido o local:', imagePath);
      }
    }

    const report = new Report({
      ...reportData,
      imagePath: processedImagePath,
      clientId: req.user.id,
      user: req.user.email,
      userName: userName ?? req.body.userName ?? '',
      userLastname: userLastname ?? req.body.userLastname ?? '',
    });

    await report.save();

    console.log('[POST /reports] Reporte creado con id:', report._id);
    return res.status(201).json(report);
  } catch (error) {
    console.error('[POST /reports] Error al crear reporte:', error);
    return res.status(500).json({ message: 'Error al crear reporte', error: error?.message || error });
  }
});

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ninguna imagen' });
  }
  return res.status(201).json({ path: req.file.path });
});

router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar reporte', error });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar reporte', error });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const reportId = req.params.id;
    console.log('[DELETE /reports/:id] request id:', reportId, 'userId:', req.user.id);

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      console.warn('[DELETE /reports/:id] id inválido:', reportId);
      return res.status(400).json({ message: 'ID de reporte inválido' });
    }

    const report = await Report.findOne({ _id: reportId, clientId: req.user.id });
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado o sin permiso para eliminar' });
    }
    await report.deleteOne();
    return res.json({ message: 'Reporte eliminado correctamente' });
  } catch (error) {
    console.error('[DELETE /reports/:id] Error:', error);
    return res.status(500).json({ message: 'Error al eliminar reporte', error: error?.message || error });
  }
});

module.exports = router;
