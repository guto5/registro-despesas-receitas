export type Lancamento = {
  id: string;
  descricao: string;
  data_lancamento: string;
  valor: number;
  tipo_lancamento: string;
  situacao: string;
};

export type Usuario = {
  id: string;
  nome: string;
  login: string;
};

export type LancamentoFormData = {
  descricao: string;
  valor: string;
  data_lancamento: string;
  tipo_lancamento: string;
  situacao: string;
};

export type Filters = {
  dataInicio: string;
  dataFim: string;
  situacao: string;
};
