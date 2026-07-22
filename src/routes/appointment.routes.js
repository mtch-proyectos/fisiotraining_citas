//Definición de las rutas Express
// src/routes/appointment.routes.js
const { Router } = require('express');
const router = Router();
const {
  getAvailableSlots, // <-- 1. Importar la nueva función
  initSession,
  verifySlot,
  confirmAppointment
} = require('../controllers/appointment.controller');

// Consulta de horarios disponibles (GET)
router.get('/available', getAvailableSlots); // GET /api/v1/appointments/available?fecha=YYYY-MM-DD

// Peticiones entrantes desde n8n / Web (POST)
router.post('/init', initSession);
router.post('/verify', verifySlot);
router.post('/confirm', confirmAppointment);

module.exports = router;