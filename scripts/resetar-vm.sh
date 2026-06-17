#!/bin/bash

log()  { echo "  --> $*"; }
step() { echo ""; echo "[ $* ]"; }

echo ""
echo "  Reset de Ambiente — Remove containers, imagens e repositorio"
echo ""

# ── 1. Parar e remover todos os containers ────────────────────────────────────
step "1/5  Removendo containers"
CONTAINERS=$(docker ps -aq 2>/dev/null)
if [ -n "$CONTAINERS" ]; then
  docker stop $CONTAINERS 2>/dev/null || true
  docker rm   $CONTAINERS 2>/dev/null || true
  log "Containers removidos"
else
  log "Nenhum container encontrado"
fi

# ── 2. Remover todas as imagens ───────────────────────────────────────────────
step "2/5  Removendo imagens Docker"
IMAGES=$(docker images -aq 2>/dev/null)
if [ -n "$IMAGES" ]; then
  docker rmi -f $IMAGES 2>/dev/null || true
  log "Imagens removidas"
else
  log "Nenhuma imagem encontrada"
fi

# ── 3. Remover volumes ────────────────────────────────────────────────────────
step "3/5  Removendo volumes Docker"
docker volume prune -f 2>/dev/null || true
log "Volumes removidos"

# ── 4. Remover redes customizadas ─────────────────────────────────────────────
step "4/5  Removendo redes Docker customizadas"
docker network prune -f 2>/dev/null || true
log "Redes removidas"

# ── 5. Remover repositorio e arquivos de ambiente ─────────────────────────────
step "5/5  Removendo repositorio e arquivos de ambiente"

REPO_DIR="/root/registro-despesas-receitas"
INFRA_DIR="/root/infraestrutura"

if [ -d "$REPO_DIR" ]; then
  rm -rf "$REPO_DIR"
  log "Removido: $REPO_DIR"
else
  log "Nao encontrado: $REPO_DIR"
fi

if [ -d "$INFRA_DIR" ]; then
  rm -rf "$INFRA_DIR"
  log "Removido: $INFRA_DIR"
else
  log "Nao encontrado: $INFRA_DIR"
fi

# ── Status final ──────────────────────────────────────────────────────────────
echo ""
echo "  Verificando estado final..."
echo ""
echo "  Containers:"
docker ps -a 2>/dev/null || echo "  (nenhum)"
echo ""
echo "  Imagens:"
docker images 2>/dev/null || echo "  (nenhuma)"
echo ""
echo "  Ambiente zerado!"
echo "  Para reinstalar, execute:"
echo "  curl -fsSL https://raw.githubusercontent.com/guto5/registro-despesas-receitas/main/scripts/bootstrap.sh | sudo bash"
echo ""
