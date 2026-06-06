const mongoose = require('mongoose');
const dns = require('dns');

function extractHostFromUri(uri) {
  // mongodb+srv://user:pass@host/... -> capture host
  const m = uri.match(/@([^\/\?]+)(?:[\/\?]|$)/);
  if (m && m[1]) {
    // remove possible port
    return m[1].split(':')[0];
  }
  return null;
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI no está configurado. Define la cadena de conexión de MongoDB Atlas en un archivo .env (MONGODB_URI)'
    );
  }

  // If the URI is an SRV connection, attempt to resolve SRV records first.
  if (uri.startsWith('mongodb+srv://')) {
    const host = extractHostFromUri(uri);
    if (!host) {
      throw new Error('No se pudo extraer el host de MONGODB_URI. Revisa el formato de la URI.');
    }

    const srvName = `_mongodb._tcp.${host}`;
    try {
      // Try resolving SRV using system resolver
      await dns.promises.resolveSrv(srvName);
    } catch (err) {
      console.warn(`Fallo al resolver SRV con el DNS del sistema: ${err.message}. Reintentando con DNS público 8.8.8.8`);
      try {
        // Temporarily set Google's DNS and retry
        dns.setServers(['8.8.8.8']);
        await dns.promises.resolveSrv(srvName);
      } catch (err2) {
        throw new Error(`No se pudo resolver el registro SRV ${srvName}: ${err2.message}. Verifica conexión a Internet y configuración DNS.`);
      }
    }
  }

  // Connect with mongoose (v7+ default options are OK)
  await mongoose.connect(uri);
  console.log('MongoDB conectado.');
};

module.exports = connectDB;
