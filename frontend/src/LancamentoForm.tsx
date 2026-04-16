import { useEffect, useState } from "react";
import type { Lancamento, LancamentoFormData } from "./types";

type LancamentoFormProps = {
  token: string;
  lancamento?: Lancamento | null;
  onSaved: () => void;
  onClose: () => void;
};

const emptyForm: LancamentoFormData = {
  descricao: "",
  valor: "",
  data_lancamento: "",
  tipo_lancamento: "Despesa",
  situacao: "Pendente",
};

function toInputDate(iso: string): string {
  // "2026-03-01T10:00:00.000Z" → "2026-03-01"
  return iso.slice(0, 10);
}

export default function LancamentoForm({ token, lancamento, onSaved, onClose }: LancamentoFormProps) {
  const [form, setForm] = useState<LancamentoFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!lancamento;

  useEffect(() => {
    if (lancamento) {
      setForm({
        descricao: lancamento.descricao,
        valor: String(lancamento.valor),
        data_lancamento: toInputDate(lancamento.data_lancamento),
        tipo_lancamento: lancamento.tipo_lancamento,
        situacao: lancamento.situacao,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [lancamento]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const valorNum = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim()) return setError("Descrição é obrigatória.");
    if (isNaN(valorNum) || valorNum <= 0) return setError("Valor deve ser um número positivo.");
    if (!form.data_lancamento) return setError("Data é obrigatória.");

    setSubmitting(true);
    try {
      const url = isEditing ? `/api/lancamentos/${lancamento!.id}` : "/api/lancamentos";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descricao: form.descricao.trim(),
          valor: valorNum,
          data_lancamento: new Date(form.data_lancamento).toISOString(),
          tipo_lancamento: form.tipo_lancamento,
          situacao: form.situacao,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {isEditing ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="descricao">
              Descrição
            </label>
            <input
              id="descricao"
              name="descricao"
              type="text"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Ex.: Salário, Aluguel…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="valor">
                Valor (R$)
              </label>
              <input
                id="valor"
                name="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={handleChange}
                placeholder="0,00"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="data_lancamento">
                Data
              </label>
              <input
                id="data_lancamento"
                name="data_lancamento"
                type="date"
                value={form.data_lancamento}
                onChange={handleChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="tipo_lancamento">
                Tipo
              </label>
              <select
                id="tipo_lancamento"
                name="tipo_lancamento"
                value={form.tipo_lancamento}
                onChange={handleChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Receita">Receita</option>
                <option value="Despesa">Despesa</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="situacao">
                Situação
              </label>
              <select
                id="situacao"
                name="situacao"
                value={form.situacao}
                onChange={handleChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago/Recebido">Pago/Recebido</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar lançamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
