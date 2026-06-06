const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH] Authorization header missing or malformed:', authHeader);
    return res.status(401).json({ message: 'Autenticación requerida' });
  }

  const token = authHeader.split(' ')[1];
  // Log a masked token for debugging (do not expose full token in public logs)
  try {
    const masked = token ? `${token.substring(0, 6)}...${token.substring(token.length - 6)}` : 'no-token';
    console.log('[AUTH] Token recibida (masked):', masked);
  } catch (_) {
    // ignore masking errors
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[AUTH] Token inválido o expirado:', error && error.message ? error.message : error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = authenticate;
