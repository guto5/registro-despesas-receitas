#!/bin/bash
set -e

REPO_URL="https://github.com/guto5/registro-despesas-receitas.git"
REPO_DIR="$HOME/registro-despesas-receitas"
INFRA_DIR="$HOME/infraestrutura"

echo "================================================================"
echo " Bootstrap — Registro Despesas/Receitas"
echo " Instala dependencias, clona o repo e provisiona via Ansible"
echo "================================================================"

# ── 1. Atualizar pacotes e instalar dependencias base ────────────────────────
echo ""
echo "[1/6] Instalando Docker, Git, Ansible, Nginx e SDK Python do Docker..."
apt-get update -qq
apt-get install -y -qq docker.io git ansible nginx python3-docker curl

systemctl enable docker --now

# ── 2. Instalar colecao community.docker do Ansible ──────────────────────────
echo ""
echo "[2/6] Instalando colecao Ansible community.docker..."
ansible-galaxy collection install community.docker --timeout 60

# ── 3. Clonar repositorio ────────────────────────────────────────────────────
echo ""
echo "[3/6] Clonando repositorio..."
if [ -d "$REPO_DIR/.git" ]; then
  echo "Repositorio ja existe, atualizando..."
  git -C "$REPO_DIR" pull
else
  git clone "$REPO_URL" "$REPO_DIR"
fi

# ── 4. Gerar arquivos .env ────────────────────────────────────────────────────
echo ""
echo "[4/6] Criando arquivos de ambiente em $INFRA_DIR..."
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
  echo "Criado: $INFRA_DIR/.env.homolog"
else
  echo "Ja existe: $INFRA_DIR/.env.homolog (mantido)"
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
  echo "Criado: $INFRA_DIR/.env.prod"
else
  echo "Ja existe: $INFRA_DIR/.env.prod (mantido)"
fi

# ── 5. Executar playbook Ansible ──────────────────────────────────────────────
echo ""
echo "[5/6] Executando Ansible para provisionar a infraestrutura..."
ansible-playbook "$REPO_DIR/scripts/deploy.yml" \
  -e "repo_dir=$REPO_DIR infra_dir=$INFRA_DIR"

# ── 6. Popular banco de Homologacao com dados iniciais ───────────────────────
echo ""
echo "[6/7] Populando banco de Homologacao com dados de exemplo..."
echo "Aguardando aplicacao iniciar e rodar as migrations..."
sleep 8
docker exec app-homologacao ./node_modules/.bin/prisma db execute \
  --file prisma/seed.sql \
  --schema prisma/schema.prisma
echo "Banco populado! Login: augusto / augusto123"

# ── 7. Confirmar status ───────────────────────────────────────────────────────
echo ""
echo "[7/7] Verificando containers em execucao..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "================================================================"
echo " Bootstrap concluido!"
echo " Homologacao: http://$(hostname -I | awk '{print $1}'):3000"
echo "   Login: augusto / augusto123"
echo "                                                                "
echo " Para subir Producao:"
echo "   cd $REPO_DIR && sudo ./scripts/atualizar-producao.sh"
echo " Para atualizar homolog (branch especifica):"
echo "   sudo ./scripts/atualizar-homologacao.sh [branch]"
echo "================================================================"
