/**
 * Archivo: fechas.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Utilidades de fechas "de negocio": los días se calculan en la zona horaria
// del negocio (por defecto Colombia, UTC-5, sin horario de verano) y no en la
// del servidor, para que "hoy" y "este mes" signifiquen lo mismo para todos.
const OFFSET_HORAS = Number(process.env.ZONA_OFFSET_HORAS ?? -5);
const MS_HORA = 3600000;
const MS_DIA = 24 * MS_HORA;

const REGEX_CLAVE = /^\d{4}-\d{2}-\d{2}$/;

// 'YYYY-MM-DD' del día del negocio al que pertenece un instante.
const claveDia = (fecha) =>
  new Date(fecha.getTime() + OFFSET_HORAS * MS_HORA).toISOString().slice(0, 10);

// Instante en que empieza (00:00 hora del negocio) el día 'YYYY-MM-DD'.
const inicioDeDia = (clave) => {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - OFFSET_HORAS * MS_HORA);
};

const sumarDias = (clave, n) => {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// Primer instante del mes (hora del negocio) al que pertenece 'fecha'.
const inicioDeMes = (fecha = new Date()) =>
  inicioDeDia(claveDia(fecha).slice(0, 8) + '01');

// Lista de claves 'YYYY-MM-DD' entre dos claves, ambas incluidas.
const listarDias = (claveDesde, claveHasta) => {
  const dias = [];
  for (let c = claveDesde; c <= claveHasta; c = sumarDias(c, 1)) dias.push(c);
  return dias;
};

const errorValidacion = (mensaje) => ({ status: 400, mensaje });

// Interpreta ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (ambos días incluidos).
// Sin parámetros usa los últimos 30 días. Lanza { status, mensaje } si es inválido.
const rangoDesdeQuery = (query, maxDias = 366) => {
  const hoy = claveDia(new Date());
  const claveHasta = query.hasta || hoy;
  const claveDesde = query.desde || sumarDias(claveHasta, -29);

  if (!REGEX_CLAVE.test(claveDesde) || !REGEX_CLAVE.test(claveHasta)) {
    throw errorValidacion('Las fechas deben tener el formato AAAA-MM-DD');
  }
  if (claveDesde > claveHasta) {
    throw errorValidacion('La fecha inicial no puede ser posterior a la final');
  }
  const dias = listarDias(claveDesde, claveHasta);
  if (dias.length > maxDias) {
    throw errorValidacion(`El rango máximo permitido es de ${maxDias} días`);
  }

  return {
    claveDesde,
    claveHasta,
    dias,
    desde: inicioDeDia(claveDesde),
    // Límite superior exclusivo: el inicio del día siguiente al último día.
    hasta: inicioDeDia(sumarDias(claveHasta, 1))
  };
};

module.exports = {
  MS_DIA,
  claveDia,
  inicioDeDia,
  inicioDeMes,
  sumarDias,
  listarDias,
  rangoDesdeQuery
};
