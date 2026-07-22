// src/controllers/appointment.controller.js
const { getDB } = require('../config/db');
const { obtenerHorariosDisponibles } = require('../helpers/agenda.helpers');

// 1. Obtener cupos libres
async function getAvailableSlots(req, res) {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ ok: false, error: 'El parámetro "fecha" (YYYY-MM-DD) es requerido.' });
    }

    const db = getDB();
    const disponibles = await obtenerHorariosDisponibles(db, fecha);

    return res.status(200).json({
      ok: true,
      fecha,
      disponibles
    });
  } catch (error) {
    console.error("Error en getAvailableSlots:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// 2. Iniciar sesión
async function initSession(req, res) {
  try {
    const { phone, nombre } = req.body;

    if (!phone) {
      return res.status(400).json({ ok: false, message: "El campo 'phone' es requerido." });
    }

    const db = getDB();
    const sesiones = db.collection('sesiones_agenda');

    let sesion = await sesiones.findOne({ phone, estado: { $ne: 'FINALIZADA' } });

    if (!sesion) {
      const nuevaSesion = {
        phone,
        nombre: nombre || 'Paciente',
        paso_actual: 'INICIO',
        datos_cita: {},
        creado_en: new Date()
      };
      const result = await sesiones.insertOne(nuevaSesion);
      sesion = { _id: result.insertedId, ...nuevaSesion };
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Sesión obtenida correctamente",
      paso: sesion.paso_actual,
      sesionId: sesion._id
    });

  } catch (error) {
    console.error("Error en initSession:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// 3. Verificar disponibilidad
async function verifySlot(req, res) {
  try {
    const { phone, fecha, hora, servicio } = req.body;
    const db = getDB();

    // Construcción limpia en formato ISO UTC
    const fechaHoraISO = new Date(`${fecha}T${hora}:00.000Z`);

    const citas = db.collection('citas');
    const ocupada = await citas.findOne({
      fecha_hora: fechaHoraISO,
      estado: { $in: ['pendiente', 'confirmada'] }
    });

    if (ocupada) {
      return res.status(409).json({
        ok: false,
        disponible: false,
        mensaje: "Ese horario ya está ocupado. Elige otra hora."
      });
    }

    const sesiones = db.collection('sesiones_agenda');
    await sesiones.updateOne(
      { phone, estado: { $ne: 'FINALIZADA' } },
      {
        $set: {
          paso_actual: 'PENDIENTE_CONFIRMACION',
          'datos_cita.fecha_hora': fechaHoraISO,
          'datos_cita.servicio': servicio
        }
      }
    );

    return res.status(200).json({
      ok: true,
      disponible: true,
      mensaje: "Horario reservado temporalmente, listo para confirmar."
    });

  } catch (error) {
    console.error("Error en verifySlot:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// 4. Confirmar cita
async function confirmAppointment(req, res) {
  try {
    const { phone, cedula } = req.body;
    const db = getDB();
    const sesiones = db.collection('sesiones_agenda');

    const sesion = await sesiones.findOne({ phone, estado: { $ne: 'FINALIZADA' } });

    if (!sesion || !sesion.datos_cita || !sesion.datos_cita.fecha_hora) {
      return res.status(400).json({ ok: false, mensaje: "No hay una cita pendiente para este número." });
    }

    const citas = db.collection('citas');

    const nuevaCita = {
      phone: sesion.phone,
      nombre: sesion.nombre,
      cedula: cedula || 'V-00000000',
      servicio: sesion.datos_cita.servicio || 'Fisioterapia',
      fecha_hora: sesion.datos_cita.fecha_hora,
      estado: 'pendiente',
      creado_el: new Date(),
      actualizado_el: new Date()
    };

    const resultado = await citas.insertOne(nuevaCita);

    await sesiones.updateOne(
      { _id: sesion._id },
      { $set: { estado: 'FINALIZADA', paso_actual: 'COMPLETADO' } }
    );

    return res.status(201).json({
      ok: true,
      mensaje: "¡Cita solicitada con éxito! En espera de aprobación.",
      citaId: resultado.insertedId,
      resumen: nuevaCita
    });

  } catch (error) {
    console.error("Error en confirmAppointment:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  getAvailableSlots,
  initSession,
  verifySlot,
  confirmAppointment
};
