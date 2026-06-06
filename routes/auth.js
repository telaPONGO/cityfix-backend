const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    const { name, lastname, email, password, birthdate, profileImage } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    if (!process.env.JWT_SECRET) {
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
    return res.status(500).json({ message: 'Error interno', error });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
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
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET no configurado en el servidor' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión correcto',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno', error });
  }
});

module.exports = router;
