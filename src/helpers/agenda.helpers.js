// src/helpers/agenda.helper.js

/**
 * Calcula los bloques de tiempo libres para una fecha en formato YYYY-MM-DD.
 * @param {Db} db - Instancia de la BD de MongoDB
 * @param {string} fechaString - Fecha enviada (ej: '2026-07-27')
 */
async function obtenerHorariosDisponibles(db, fechaString) {
  const fechaObj = new Date(`${fechaString}T00:00:00`);
  const diaNum = fechaObj.getDay(); // 0 = Domingo, 1 = Lunes...

  // 1. Consultar la regla de atención del día
  const reglaDia = await db.collection('horarios_atencion').findOne({ dia_num: diaNum });

  if (!reglaDia || !reglaDia.activo) {
    return [];
  }

  const duracionMinutos = reglaDia.duracion_turno_minutos || 30;
  const turnosTeoricos = [];

  // 2. Generar turnos teóricos según las jornadas del día
  for (const jornada of reglaDia.jornadas) {
    let [horaInicio, minInicio] = jornada.inicio.split(':').map(Number);
    let [horaFin, minFin] = jornada.fin.split(':').map(Number);

    let tiempoActual = horaInicio * 60 + minInicio;
    const tiempoLimite = horaFin * 60 + minFin;

    while (tiempoActual + duracionMinutos <= tiempoLimite) {
      const hh = String(Math.floor(tiempoActual / 60)).padStart(2, '0');
      const mm = String(tiempoActual % 60).padStart(2, '0');
      turnosTeoricos.push(`${hh}:${mm}`);
      tiempoActual += duracionMinutos;
    }
  }

  // 3. Buscar citas activas ocupadas en ese día
  const inicioDia = new Date(`${fechaString}T00:00:00.000Z`);
  const finDia = new Date(`${fechaString}T23:59:59.999Z`);

  const citasOcupadas = await db.collection('citas').find({
    fecha_hora: { $gte: inicioDia, $lte: finDia },
    estado: { $in: ['pendiente', 'confirmada'] }
  }).toArray();

  const horasOcupadas = citasOcupadas.map(cita => {
    const d = new Date(cita.fecha_hora);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  // 4. Retornar solo bloques libres
  return turnosTeoricos.filter(hora => !horasOcupadas.includes(hora));
}

module.exports = { obtenerHorariosDisponibles };