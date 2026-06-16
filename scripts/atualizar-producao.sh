#!/bin/bash
set -e

INFRA_DIR="$HOME/infraestrutura"

echo "================================================================"
echo " Atualizando Producao"
echo " (promove a imagem validada de Homologacao para Producao)"
echo "================================================================"

# ── 1. Verificar se imagem de homolog existe ──────────────────────────────────
echo ""
echo "[1/4] Verificando imagem de Homologacao..."
if ! docker image inspect app-registro-despesas:homolog &>/dev/null; then
  echo "ERRO: Imagem app-registro-despesas:homolog nao encontrada."
  echo "Execute primeiro: ./scripts/atualizar-homologacao.sh"
  exit 1
fi

# ── 2. Promover imagem homolog → prod ─────────────────────────────────────────
echo ""
echo "[2/4] Promovendo imagem homolog para prod..."
docker tag app-registro-despesas:homolog app-registro-despesas:prod

# ── 3. Garantir que db-producao esta rodando ──────────────────────────────────
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

# ── 4. Restartar container de Producao ────────────────────────────────────────
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
echo " URL : http://$(hostname -I | awk '{print $1}'):3001"
echo "================================================================"
