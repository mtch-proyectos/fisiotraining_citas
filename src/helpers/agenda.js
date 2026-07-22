//función obtenerHorariosDisponibles

/**
 * Calcula los bloques de tiempo libres para una fecha determinada.
 * @param {Db} db - Instancia de la base de datos de MongoDB
 * @param {string} fechaString - Fecha en formato 'YYYY-MM-DD'
 */
async function obtenerHorariosDisponibles(db, fechaString) {
  const fechaObj = new Date(`${fechaString}T00:00:00`);
  const diaNum = fechaObj.getDay();

  // 1. Consultar la regla de atención para el día
  const reglaDia = await db.collection('horarios_atencion').findOne({ dia_num: diaNum });

  if (!reglaDia || !reglaDia.activo) {
    return [];
  }

  const duracionMinutos = reglaDia.duracion_turno_minutos || 30;
  const turnosTeoricos = [];

  // 2. Generar bloques teóricos según las jornadas
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

  // 3. Consultar citas ocupadas activas en la BD
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

  // 4. Retornar solo las disponibles
  return turnosTeoricos.filter(hora => !horasOcupadas.includes(hora));
}

module.exports = { obtenerHorariosDisponibles };