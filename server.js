const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'CityFix API is running' });
});

const initialPort = parseInt(process.env.PORT, 10) || 3001;

console.log('Environment variables loaded:');
console.log('  PORT:', process.env.PORT || '3001 (default)');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? 'Configured ✓' : 'NOT CONFIGURED ✗');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'Configured ✓' : 'NOT CONFIGURED ✗');

const startServer = (port, attempts = 0) => {
  const server = app.listen(port, () => {
    console.log(`✓ Server running on port ${port}`);
  });

  server.on('error', (err) => {
    console.error('Error en el servidor:', err);
    if (err.code === 'EADDRINUSE') {
      if (attempts < 5) {
        const nextPort = port + 1;
        console.warn(`El puerto ${port} ya está en uso. Probando puerto ${nextPort}...`);
        startServer(nextPort, attempts + 1);
      } else {
        console.error(`No se pudo encontrar un puerto libre después de ${attempts + 1} intentos. Por favor libera un puerto o cambia PORT en .env.`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  });
};

connectDB()
  .then(() => {
    console.log('✓ Conectado a MongoDB. Iniciando servidor...');
    startServer(initialPort);
  })
  .catch((error) => {
    console.error('✗ Error connecting to database:', error);
  });
