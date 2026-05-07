-- Insere o usuário padrão do sistema (senha: augusto123 — armazenada como hash bcrypt)
INSERT INTO "usuario" ("id", "nome", "login", "senha", "situacao")
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Augusto',
  'augusto',
  '$2b$10$rvDV15Y2zt4V30sVWGr7G.McGoGdUSGRAEYltoGFGl4dZNn1M74Gy',
  'Ativo'
)
ON CONFLICT ("id") DO NOTHING;
