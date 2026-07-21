// Lógica de entrada/salida para los endpoints (/init, /verify, /confirm)
const { getDB } = require('../config/db');

// 1. Iniciar sesión / consultar estado
async function initSession(req, res) {
  try {
    const { telefono, nombre } = req.body;

    if (!telefono) {
      return res.status(400).json({ ok: false, message: "El campo 'telefono' es requerido." });
    }

    const db = getDB();
    const sesiones = db.collection('sesiones_agenda');

    // Buscar si ya existe una sesión activa para este teléfono
    let sesion = await sesiones.findOne({ telefono, estado: { $ne: 'FINALIZADA' } });

    if (!sesion) {
      const nuevaSesion = {
        telefono,
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

// 2. Verificar y reservar borrador
async function verifySlot(req, res) {
  try {
    const { telefono, fecha, hora, servicio } = req.body;
    const db = getDB();

    // Comprobar si ya existe una cita confirmada en esa fecha y hora
    const citas = db.collection('citas');
    const ocupada = await citas.findOne({ fecha, hora });

    if (ocupada) {
      return res.status(409).json({
        ok: false,
        disponible: false,
        mensaje: "Ese horario ya está ocupado. Elige otra hora."
      });
    }

    // Actualizar el estado de la sesión
    const sesiones = db.collection('sesiones_agenda');
    await sesiones.updateOne(
      { telefono, estado: { $ne: 'FINALIZADA' } },
      {
        $set: {
          paso_actual: 'PENDIENTE_CONFIRMACION',
          'datos_cita.fecha': fecha,
          'datos_cita.hora': hora,
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

// 3. Confirmar cita y registrar en BD
async function confirmAppointment(req, res) {
  try {
    const { telefono } = req.body;
    const db = getDB();
    const sesiones = db.collection('sesiones_agenda');

    const sesion = await sesiones.findOne({ telefono, estado: { $ne: 'FINALIZADA' } });

    if (!sesion || !sesion.datos_cita.fecha) {
      return res.status(400).json({ ok: false, mensaje: "No hay una cita pendiente para este número." });
    }

    // Insertar en la colección definitiva 'citas'
    const citas = db.collection('citas');
    const nuevaCita = {
      telefono: sesion.telefono,
      nombre: sesion.nombre,
      servicio: sesion.datos_cita.servicio,
      fecha: sesion.datos_cita.fecha,
      hora: sesion.datos_cita.hora,
      estatus: 'CONFIRMADA',
      fecha_creacion: new Date()
    };

    await citas.insertOne(nuevaCita);

    // Marcar sesión como finalizada
    await sesiones.updateOne(
      { _id: sesion._id },
      { $set: { estado: 'FINALIZADA', paso_actual: 'COMPLETADO' } }
    );

    return res.status(201).json({
      ok: true,
      mensaje: "¡Cita agendada con éxito!",
      resumen: nuevaCita
    });

  } catch (error) {
    console.error("Error en confirmAppointment:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  initSession,
  verifySlot,
  confirmAppointment
};