#!/bin/bash
set -e

REPO_URL="https://github.com/guto5/registro-despesas-receitas.git"
REPO_DIR="$HOME/registro-despesas-receitas"
INFRA_DIR="$HOME/infraestrutura"

log()  { echo "  --> $*"; }
step() { echo ""; echo "[ $* ]"; }

echo ""
echo "  Bootstrap — Registro Despesas/Receitas"
echo ""

# ── 1. Dependencias ───────────────────────────────────────────────────────────
step "1/7  Instalando dependencias do sistema"
apt-get update -qq
apt-get install -y -qq docker.io git ansible nginx python3-docker curl
systemctl enable docker --now
log "Docker, Git, Ansible, Nginx instalados"

# ── 2. Colecao Ansible ────────────────────────────────────────────────────────
step "2/7  Instalando colecao Ansible community.docker"
ansible-galaxy collection install community.docker --timeout 60
log "Colecao instalada"

# ── 3. Repositorio ────────────────────────────────────────────────────────────
step "3/7  Clonando repositorio"
if [ -d "$REPO_DIR/.git" ]; then
  log "Repositorio ja existe — atualizando"
  git -C "$REPO_DIR" pull
else
  git clone "$REPO_URL" "$REPO_DIR"
  log "Clonado em $REPO_DIR"
fi

# ── 4. Arquivos de ambiente ───────────────────────────────────────────────────
step "4/7  Criando arquivos de ambiente"
mkdir -p "$INFRA_DIR"

if [ ! -f "$INFRA_DIR/.env.homolog" ]; then
  cat > "$INFRA_DIR/.env.homolog" <<EOF
DATABASE_URL=postgresql://admin:adminpassword@db-homologacao:5432/app_db?schema=public
JWT_SECRET=homolog-jwt-secret-$(openssl rand -hex 12)
PORT=3001
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=financas@example.com
EMAIL_TO=admin@example.com
EOF
  log "Criado: $INFRA_DIR/.env.homolog"
else
  log "Ja existe: .env.homolog (mantido)"
fi

if [ ! -f "$INFRA_DIR/.env.prod" ]; then
  cat > "$INFRA_DIR/.env.prod" <<EOF
DATABASE_URL=postgresql://admin:adminpassword@db-producao:5432/app_db?schema=public
JWT_SECRET=prod-jwt-secret-$(openssl rand -hex 12)
PORT=3001
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=financas@example.com
EMAIL_TO=admin@example.com
EOF
  log "Criado: $INFRA_DIR/.env.prod"
else
  log "Ja existe: .env.prod (mantido)"
fi

# ── 5. Ansible — provisionamento ─────────────────────────────────────────────
step "5/7  Provisionando infraestrutura via Ansible"
ansible-playbook "$REPO_DIR/scripts/deploy.yml" \
  -e "repo_dir=$REPO_DIR infra_dir=$INFRA_DIR"

# ── 6. Seed homologacao ───────────────────────────────────────────────────────
step "6/7  Populando banco de Homologacao"
log "Aguardando aplicacao iniciar..."
sleep 8
docker exec app-homologacao ./node_modules/.bin/prisma db execute \
  --file prisma/seed.sql \
  --schema prisma/schema.prisma
log "Banco populado — login: augusto / augusto123"

# ── 7. Status final ───────────────────────────────────────────────────────────
step "7/7  Containers em execucao"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "  Pronto! Homologacao disponivel em:"
echo "  http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "  Proximo passo — subir Producao:"
echo "  cd $REPO_DIR && sudo ./scripts/atualizar-producao.sh"
echo ""
