import { useCallback, useEffect, useState } from "react";
import LancamentosTable from "./LancamentosTable";
import LoginPage from "./LoginPage";
import type { Usuario } from "./types";

type AuthState = "checking" | "guest" | "user";

export default function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("token"));
  const [auth, setAuth] = useState<AuthState>(() =>
    sessionStorage.getItem("token") ? "checking" : "guest"
  );
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const logout = useCallback(() => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    setToken(null);
    setUsuario(null);
    setAuth("guest");
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    if (!t) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("unauthorized");
        }
        const data = (await res.json()) as { usuario: Usuario };
        setUsuario(data.usuario);
        setAuth("user");
      })
      .catch(() => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        setToken(null);
        setAuth("guest");
      });
  }, []);

  function handleLoggedIn(t: string, u: Usuario) {
    setToken(t);
    setUsuario(u);
    setAuth("user");
  }

  if (auth === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Verificando sessão…
      </div>
    );
  }

  if (auth === "guest" || !token || !usuario) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-500">Protótipo</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Registro de despesas e receitas TOPA
            </h1>
            <p className="text-sm text-slate-600">
              Olá, <span className="font-medium text-slate-800">{usuario.nome}</span> ({usuario.login})
            </p>
            <p className="max-w-2xl text-sm text-slate-600">
              Lista via{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /api/lancamentos</code>{" "}
              (autenticado)
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <LancamentosTable token={token} onUnauthorized={logout} />
      </main>
    </div>
  );
}
