import { useEffect, useState } from "react";

/**
 * Direct access links for demo accounts:
 *  - /demo-access?id=<padronId>&token=<hmac>  (padrón/CUIT account, full demo)
 *  - /demo-estaciones?t=<token>               (stations-only link)
 * Logs in as the demo user and redirects straight to the weather stations.
 */
export default function DemoAccessPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationToken = params.get("t");
    const id = params.get("id");
    const token = params.get("token");

    if (!stationToken && (!id || !token)) {
      setError("Link de acceso demo inválido");
      return;
    }

    (async () => {
      try {
        // `t` = stations-only link, `id` + `token` = link of a padrón (CUIT) account
        const response = await fetch(stationToken ? "/backend/login-demo-station" : "/backend/login-demo-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stationToken ? { token: stationToken } : { id, token }),
        });
        const data = await response.json();

        if (data.success) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("userProfile", JSON.stringify(data.user));
          // Full navigation so the app boots with the new session
          window.location.replace("/stations");
        } else {
          setError(data.error || "No se pudo acceder a la demo");
        }
      } catch {
        setError("Error de conexión con el servidor");
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-base font-bold text-slate-800">No se pudo ingresar</p>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-bold text-white"
            >
              Ir al inicio
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-slate-600">Ingresando a la demo...</p>
          </>
        )}
      </div>
    </div>
  );
}
