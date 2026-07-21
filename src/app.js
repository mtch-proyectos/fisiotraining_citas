//Configuración principal de Express (middlewares globales)
const express = require('express');
const appointmentRoutes = require('./routes/appointment.routes');

const app = express();

// Middleware para entender el body JSON que envía n8n
app.use(express.json());

// Ruta de prueba/salud (Healthcheck)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Fisiotraining API funcionando' });
});

// Registrar rutas modularizadas
app.use('/api/v1/appointments', appointmentRoutes);

module.exports = app;