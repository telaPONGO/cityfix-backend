const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  lastname: user.lastname,
  email: user.email,
  birthdate: user.birthdate,
  profileImage: user.profileImage,
});

router.post('/register', async (req, res) => {
  try {
    console.log('[POST /auth/register] Registrando usuario:', req.body.email);
    const { name, lastname, email, password, birthdate, profileImage } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('[POST /auth/register] El correo ya existe:', email);
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[POST /auth/register] JWT_SECRET no configurado');
      return res.status(500).json({ message: 'JWT_SECRET no configurado en el servidor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      lastname,
      email,
      password: hashedPassword,
      birthdate,
      profileImage,
    });

    await user.save();
    console.log('[POST /auth/register] Usuario registrado exitosamente:', email);

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Usuario registrado',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[POST /auth/register] Error:', error);
    return res.status(500).json({ message: 'Error interno', error });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('[POST /auth/login] Intentando login:', req.body.email);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[POST /auth/login] Usuario no encontrado:', email);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    let validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword && user.password === password) {
      // Permitir usuarios antiguos guardados en texto plano y migrarlos a bcrypt.
      validPassword = true;
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    if (!validPassword) {
      console.log('[POST /auth/login] Contraseña inválida para:', email);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[POST /auth/login] JWT_SECRET no configurado');
      return res.status(500).json({ message: 'JWT_SECRET no configurado en el servidor' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[POST /auth/login] Login exitoso para:', email);
    return res.status(200).json({
      message: 'Inicio de sesión correcto',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[POST /auth/login] Error:', error);
    return res.status(500).json({ message: 'Error interno', error });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { name, lastname, birthdate, profileImage, password } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (name) user.name = name;
    if (lastname) user.lastname = lastname;
    if (birthdate) user.birthdate = birthdate;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (password && password.trim() !== '') {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    console.log('[PUT /auth/profile] Perfil actualizado para:', user.email);
    return res.status(200).json({
      message: 'Perfil actualizado',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[PUT /auth/profile] Error:', error);
    return res.status(500).json({ message: 'Error interno', error });
  }
});

module.exports = router;
