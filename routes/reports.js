const express = require('express');
const multer = require('multer');
const Report = require('../models/Report');
const authenticate = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) {
      filter.clientId = req.query.userId;
    }
    const reports = await Report.find(filter).sort({ fecha: -1 });
    return res.json(reports);
  } catch (error) {
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
    const { id, user, clientId, ...reportData } = req.body;

    const report = new Report({
      ...reportData,
      clientId: req.user.id,
      user: req.user.email,
    });

    await report.save();

    return res.status(201).json(report);
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear reporte', error });
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

module.exports = router;
