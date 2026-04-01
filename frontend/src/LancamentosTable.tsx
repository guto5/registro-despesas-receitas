import { useEffect, useState } from "react";
import type { Lancamento } from "./types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function tipoClass(tipo: string) {
  if (tipo === "Receita") {
    return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
  }
  if (tipo === "Despesa") {
    return "text-red-700 bg-red-50 ring-red-600/20";
  }
  return "text-slate-700 bg-slate-100 ring-slate-600/10";
}

type LancamentosTableProps = {
  token: string;
  onUnauthorized: () => void;
};

export default function LancamentosTable({ token, onUnauthorized }: LancamentosTableProps) {
  const [items, setItems] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lancamentos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: Lancamento[] = await res.json();
        if (!cancelled) {
          setItems(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, onUnauthorized]);

  return (
    <>
      {loading && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          Carregando lançamentos…
        </p>
      )}

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <p className="font-medium">Não foi possível carregar os dados.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          Nenhum lançamento encontrado.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => {
                  const isReceita = row.tipo_lancamento === "Receita";
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.descricao}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {dateFmt.format(new Date(row.data_lancamento))}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                          isReceita ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {money.format(row.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tipoClass(
                            row.tipo_lancamento
                          )}`}
                        >
                          {row.tipo_lancamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.situacao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
