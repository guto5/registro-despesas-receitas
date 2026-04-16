import { useCallback, useEffect, useState } from "react";
import LancamentoForm from "./LancamentoForm";
import type { Filters, Lancamento } from "./types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

function tipoClass(tipo: string) {
  if (tipo === "Receita") return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
  if (tipo === "Despesa") return "text-red-700 bg-red-50 ring-red-600/20";
  return "text-slate-700 bg-slate-100 ring-slate-600/10";
}

type LancamentosTableProps = {
  token: string;
  onUnauthorized: () => void;
};

const emptyFilters: Filters = { dataInicio: "", dataFim: "", situacao: "" };

export default function LancamentosTable({ token, onUnauthorized }: LancamentosTableProps) {
  const [items, setItems] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Lancamento | null>(null);

  const buildQueryString = useCallback((f: Filters) => {
    const params = new URLSearchParams();
    if (f.dataInicio) params.set("dataInicio", f.dataInicio);
    if (f.dataFim) params.set("dataFim", f.dataFim);
    if (f.situacao) params.set("situacao", f.situacao);
    return params.toString();
  }, []);

  const load = useCallback(
    async (f: Filters) => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQueryString(f);
        const res = await fetch(`/api/lancamentos${qs ? `?${qs}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Lancamento[] = await res.json();
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    },
    [token, onUnauthorized, buildQueryString]
  );

  useEffect(() => {
    load(appliedFilters);
  }, [load, appliedFilters]);

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function handleDelete(l: Lancamento) {
    setDeletingId(l.id);
    try {
      const res = await fetch(`/api/lancamentos/${l.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { onUnauthorized(); return; }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setDeleteConfirm(null);
      setItems((prev) => prev.filter((item) => item.id !== l.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    load(appliedFilters);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(l: Lancamento) {
    setEditing(l);
    setFormOpen(true);
  }

  function exportPDF() {
    const qs = buildQueryString(appliedFilters);
    const url = `/api/lancamentos/pdf${qs ? `?${qs}` : ""}`;
    // Fetch as blob so we can pass the Authorization header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) { onUnauthorized(); throw new Error("Não autorizado"); }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "lancamentos.pdf";
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao exportar PDF"));
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalReceitas = items.filter((i) => i.tipo_lancamento === "Receita").reduce((s, i) => s + i.valor, 0);
  const totalDespesas = items.filter((i) => i.tipo_lancamento === "Despesa").reduce((s, i) => s + i.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <>
      {/* Modals */}
      {formOpen && (
        <LancamentoForm
          token={token}
          lancamento={editing}
          onSaved={handleSaved}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Excluir lançamento</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-slate-800">"{deleteConfirm.descricao}"</span>? Essa ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === deleteConfirm.id ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Lançamentos</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm4-1a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-2-6a1 1 0 00-1 1v1h2V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Novo lançamento
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <form
        onSubmit={applyFilters}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500" htmlFor="dataInicio">
            Data início
          </label>
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            value={filters.dataInicio}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500" htmlFor="dataFim">
            Data fim
          </label>
          <input
            id="dataFim"
            name="dataFim"
            type="date"
            value={filters.dataFim}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500" htmlFor="situacaoFilter">
            Situação
          </label>
          <select
            id="situacaoFilter"
            name="situacao"
            value={filters.situacao}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Pago/Recebido">Pago/Recebido</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpar
          </button>
        </div>
      </form>

      {/* Summary cards */}
      {!loading && !error && items.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium text-emerald-600">Total Receitas</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-700">{money.format(totalReceitas)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium text-red-600">Total Despesas</p>
            <p className="mt-0.5 text-lg font-semibold text-red-700">{money.format(totalDespesas)}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${saldo >= 0 ? "border-blue-100 bg-blue-50" : "border-red-100 bg-red-50"}`}>
            <p className={`text-xs font-medium ${saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>Saldo</p>
            <p className={`mt-0.5 text-lg font-semibold ${saldo >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {money.format(saldo)}
            </p>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          Carregando lançamentos…
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-medium">Não foi possível executar a operação.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">Nenhum lançamento encontrado.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Criar primeiro lançamento
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-center">Ações</th>
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
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tipoClass(row.tipo_lancamento)}`}>
                          {row.tipo_lancamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.situacao}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => openEdit(row)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            onClick={() => setDeleteConfirm(row)}
                            disabled={deletingId === row.id}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
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
