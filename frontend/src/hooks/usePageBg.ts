import { useEffect } from "react";

// Setea el atributo data-bg en <body> para que el CSS cambie el fondo.
// Para forzar el crossfade en cada navegación, resetea la opacity del
// ::after a 0 (sin transición), cambia la imagen, y luego la sube a 1.
export function usePageBg(bg: string) {
  useEffect(() => {
    const body = document.body;
    const after = body; // no podemos acceder al ::after desde JS directamente

    // Forzar el crossfade: agregar clase que pone opacity 0 sin transición,
    // cambiar data-bg, y en el siguiente frame sacar la clase para que
    // la transición de opacity 0→1 se ejecute.
    after.classList.add("bg-reset");
    // Forzar re-flow
    void after.offsetHeight;
    after.setAttribute("data-bg", bg);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        after.classList.remove("bg-reset");
      });
    });
  }, [bg]);
}
