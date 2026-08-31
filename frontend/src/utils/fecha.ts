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
