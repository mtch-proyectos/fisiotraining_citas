//Definición de las rutas Express
const { Router } = require('express');
const router = Router();
const {
  initSession,
  verifySlot,
  confirmAppointment
} = require('../controllers/appointment.controller');

// Peticiones entrantes desde los nodos HTTP Request de n8n
router.post('/init', initSession);
router.post('/verify', verifySlot);
router.post('/confirm', confirmAppointment);

module.exports = router;