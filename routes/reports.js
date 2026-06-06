const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const authenticate = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) {
      filter.clientId = req.query.userId;
    }
    console.log('[GET /reports] Obteniendo reportes con filtro:', filter);
    const reports = await Report.find(filter).sort({ fecha: -1 });
    console.log(`[GET /reports] Se encontraron ${reports.length} reportes`);
    return res.json(reports);
  } catch (error) {
    console.error('[GET /reports] Error:', error);
    return res.status(500).json({ message: 'Error al obtener reportes', error });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ clientId: req.user.id }).sort({ fecha: -1 });
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener mis reportes', error });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    console.log('[POST /reports] Usuario:', req.user?.email);
    console.log('[POST /reports] Body tiene imagePath:', !!req.body.imagePath);

    const { id, user, userName, userLastname, clientId, imagePath, ...reportData } = req.body;

    // Basic validation
    if (!reportData.titulo || !reportData.descripcion) {
      console.warn('[POST /reports] Datos inválidos:', reportData);
      return res.status(400).json({ message: 'Título y descripción son requeridos' });
    }

    // Process image if provided
    let processedImagePath = null;
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
          const filepath = path.join('uploads', filename);
          
          // Save file
          fs.writeFileSync(filepath, buffer);
          
          // Get API host from environment or build URL
          const host = req.get('host');
          const protocol = host?.includes('onrender.com') || host?.includes('production') ? 'https' : 'http';
          const apiHost = process.env.API_HOST || 
            `${protocol}://${host}`;
          processedImagePath = `${apiHost}/uploads/${filename}`;
          console.log('[POST /reports] Imagen guardada:', processedImagePath);
        }
      } catch (error) {
        console.error('[POST /reports] Error procesando imagen:', error);
      }
    } else if (imagePath) {
      processedImagePath = imagePath;
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
