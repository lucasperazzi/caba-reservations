// Devuelve true si `d` cae en el mismo día calendario (zona horaria local)
// que "hoy".
export function esHoy(d: Date): boolean {
  const hoy = new Date();
  return (
    d.getFullYear() === hoy.getFullYear() &&
    d.getMonth() === hoy.getMonth() &&
    d.getDate() === hoy.getDate()
  );
}

// Formatea una fecha en estilo "lunes 31 de agosto", prefijando "hoy, " si
// la fecha es el día actual. Pensado para mostrar fechas de turnos.
export function fechaLarga(d: Date): string {
  const base = d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return esHoy(d) ? `hoy, ${base}` : base;
}

// Devuelve la cantidad de días enteros que faltan hasta `fechaFin` (puede ser
// negativo si ya pasó). Compara por día calendario en zona horaria local.
// `fechaFin` puede ser "YYYY-MM-DD" o un ISO completo.
export function diasHastaVencimiento(fechaFin: string): number {
  const fin = new Date(fechaFin + (fechaFin.length === 10 ? "T23:59:59-03:00" : "Z"));
  const hoy = new Date();
  const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finMedianoche = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((finMedianoche.getTime() - hoyMedianoche.getTime()) / msPorDia);
}
