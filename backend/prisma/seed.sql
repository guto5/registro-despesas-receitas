-- Usuário administrador (senha em texto apenas para desenvolvimento local)
INSERT INTO "usuario" ("id", "nome", "login", "senha", "situacao")
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Administrador',
  'admin',
  'admin123',
  'Ativo'
);

-- 10 lançamentos variados (receitas e despesas, valores e situações diferentes)
INSERT INTO "lancamento" ("id", "descricao", "data_lancamento", "valor", "tipo_lancamento", "situacao")
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Salário mensal', '2026-03-01 10:00:00', 5500.00, 'Receita', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Aluguel apartamento', '2026-03-05 08:00:00', 1800.00, 'Despesa', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Freelance design', '2026-03-08 14:30:00', 1200.50, 'Receita', 'Pendente'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Supermercado', '2026-03-10 19:15:00', 342.87, 'Despesa', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Venda de equipamento usado', '2026-03-12 11:00:00', 450.00, 'Receita', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Conta de energia', '2026-03-15 09:00:00', 215.40, 'Despesa', 'Pendente'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Reembolso transporte', '2026-03-18 16:45:00', 89.90, 'Receita', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Assinatura streaming', '2026-03-20 00:01:00', 39.99, 'Despesa', 'Pago/Recebido'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Bônus trimestral', '2026-03-25 12:00:00', 800.00, 'Receita', 'Pendente'),
  ('550e8400-e29b-41d4-a716-44665544000a', 'Farmácia', '2026-03-28 20:30:00', 127.35, 'Despesa', 'Pendente');
