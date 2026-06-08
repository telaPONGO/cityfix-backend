const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  clientId: { type: String },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  direccion: { type: String, required: true },
  estado: { type: String, default: 'Pendiente' },
  fecha: { type: Date, default: Date.now },
  user: { type: String, required: true },
  userName: { type: String },
  userLastname: { type: String },
  categoria: { type: String, required: true },
  imagePath: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
