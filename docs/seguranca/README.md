# Testes de invasão (pen test)

| Data | Versão | Método | Resultado | Relatório |
|---|---|---|---|---|
| 03/10/2026 | 6.2.2 | OSSTMM 3 (canal Redes de Dados) | 33/42 vetores resistiram · 11 limitações | [PDF](pentest-2026-10-03-v6.2.2.pdf) |
| 03/10/2026 | 6.3.0 | Reteste, mesmo roteiro + 1 vetor | **43/43** · 7 limitações corrigidas, 4 aceitas | [PDF](pentest-2026-10-03-v6.3.0-reteste.pdf) |

- O roteiro está em [`tests/pentest.test.js`](../../tests/pentest.test.js) e roda no GitHub a cada envio. Se um vetor voltar a falhar, a publicação é barrada.
- Decisões em [ADR-050](../03-decisoes-adr.md). Checklist da conta em [07-seguranca](../07-seguranca.md).
- Para relatar uma falha em privado, veja [SECURITY.md](../../SECURITY.md).
