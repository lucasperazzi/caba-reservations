import { useQuery } from '@tanstack/react-query'

type TurnosResponse = {
  message: string
  data: unknown[]
}

function App() {
  // Prueba de conexión con el backend (BFF). La lógica real de turnos viene después.
  const { data, isLoading, isError } = useQuery<TurnosResponse>({
    queryKey: ['turnos'],
    queryFn: async () => {
      const res = await fetch('/api/turnos')
      if (!res.ok) throw new Error('Error al consultar el backend')
      return res.json()
    },
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <h1 className="text-2xl font-bold">CABA · Reservas de turnos</h1>
          <p className="text-sm text-slate-500">
            Ver y reservar turnos de Bucarelli y Centro, más rápido.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Estado del backend</h2>
          {isLoading && <p className="text-slate-500">Conectando…</p>}
          {isError && <p className="text-red-600">No se pudo conectar al backend.</p>}
          {data && (
            <p className="text-emerald-700">
              Backend conectado: <span className="font-mono">{data.message}</span>
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
