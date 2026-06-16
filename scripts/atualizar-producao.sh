#!/bin/bash
set -e

REPO_DIR="$HOME/registro-despesas-receitas"
INFRA_DIR="$HOME/infraestrutura"

# Branch opcional como primeiro argumento
# Sem argumento: promove a imagem atual de homolog (comportamento padrao)
# Com argumento: faz build da branch informada e sobe direto em prod
BRANCH="${1:-}"

echo "================================================================"
echo " Atualizando Producao"
if [ -n "$BRANCH" ]; then
  echo " Modo: build direto da branch '$BRANCH'"
else
  echo " Modo: promover imagem validada de Homologacao"
fi
echo "================================================================"

if [ -n "$BRANCH" ]; then
  # ── Modo branch: build direto sem passar por homolog ──────────────────────
  echo ""
  echo "[1/4] Sincronizando codigo da branch '$BRANCH'..."
  cd "$REPO_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"

  echo ""
  echo "[2/4] Construindo imagem Docker para Producao..."
  docker build -t app-registro-despesas:prod .

else
  # ── Modo padrao: promove imagem de homolog ─────────────────────────────────
  echo ""
  echo "[1/4] Verificando imagem de Homologacao..."
  if ! docker image inspect app-registro-despesas:homolog &>/dev/null; then
    echo "ERRO: Imagem app-registro-despesas:homolog nao encontrada."
    echo "Execute primeiro: ./scripts/atualizar-homologacao.sh"
    echo "Ou informe uma branch: ./scripts/atualizar-producao.sh main"
    exit 1
  fi

  echo ""
  echo "[2/4] Promovendo imagem homolog para prod..."
  docker tag app-registro-despesas:homolog app-registro-despesas:prod
fi

# ── Garantir que db-producao esta rodando ─────────────────────────────────────
echo ""
echo "[3/4] Verificando banco de dados de Producao..."
if ! docker ps -q --filter "name=db-producao" | grep -q .; then
  echo "Container db-producao nao esta rodando. Iniciando..."
  docker run -d --name db-producao \
    --restart always \
    --network rede_app \
    -v volume-prod:/var/lib/postgresql/data \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=adminpassword \
    -e POSTGRES_DB=app_db \
    postgres:15-alpine
  echo "Aguardando banco de Producao ficar pronto..."
  sleep 5
fi

# ── Restartar container de Producao ───────────────────────────────────────────
echo ""
echo "[4/4] Reiniciando container app-producao..."
docker stop app-producao 2>/dev/null || true
docker rm   app-producao 2>/dev/null || true

docker run -d --name app-producao \
  --restart always \
  -p 3001:3001 \
  --network rede_app \
  --env-file "$INFRA_DIR/.env.prod" \
  app-registro-despesas:prod

sleep 3
docker ps --filter "name=app-producao" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "================================================================"
echo " Producao atualizada!"
if [ -n "$BRANCH" ]; then
  echo " Branch deployada : $BRANCH"
fi
echo " URL              : http://$(hostname -I | awk '{print $1}'):3001"
echo "================================================================"
