#!/bin/bash
set -e

REPO_DIR="$HOME/registro-despesas-receitas"
INFRA_DIR="$HOME/infraestrutura"

# Branch opcional como primeiro argumento (padrao: main)
BRANCH="${1:-main}"

echo "================================================================"
echo " Atualizando Homologacao — branch: $BRANCH"
echo "================================================================"

# ── 1. Atualizar codigo-fonte ─────────────────────────────────────────────────
echo ""
echo "[1/4] Sincronizando codigo da branch '$BRANCH'..."
cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# ── 2. Build da nova imagem ───────────────────────────────────────────────────
echo ""
echo "[2/4] Construindo imagem Docker para Homologacao..."
docker build -t app-registro-despesas:homolog .

# ── 3. Restartar container de Homologacao ─────────────────────────────────────
echo ""
echo "[3/4] Reiniciando container app-homologacao..."
docker stop app-homologacao 2>/dev/null || true
docker rm   app-homologacao 2>/dev/null || true

docker run -d --name app-homologacao \
  --restart always \
  -p 3000:3001 \
  --network rede_app \
  --env-file "$INFRA_DIR/.env.homolog" \
  app-registro-despesas:homolog

# ── 4. Status ─────────────────────────────────────────────────────────────────
echo ""
echo "[4/4] Aguardando container iniciar..."
sleep 3
docker ps --filter "name=app-homologacao" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "================================================================"
echo " Homologacao atualizada!"
echo " Branch deployada : $BRANCH"
echo " URL              : http://$(hostname -I | awk '{print $1}'):3000"
echo "================================================================"
