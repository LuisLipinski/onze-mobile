# Cobertura de linhas e ramificações — fases 1 e 2

```bash
npm install
npm run test:coverage:check
npm run test:coverage
```

O comando executa os mesmos testes `node:test` usados por `npm test` e a suíte
Jest/Expo de componentes e telas usada por `npm run test:components`.
TypeScript transpila somente para esta execução de medição; Istanbul instrumenta
o JavaScript e os source maps devolvem os contadores aos arquivos TS/TSX originais.
O aplicativo, o Metro e o build Android não recebem instrumentação.

As duas suítes usam exatamente o mesmo JavaScript instrumentado e os mesmos IDs
de contadores. O transformer do Jest reaproveita o manifesto da fase 1 antes de
adaptar os módulos com Babel; a cobertura nativa do Jest fica desativada para
evitar instrumentação duplicada. O cache distingue execução normal e medida.
Cada ambiente Jest salva seus contadores na desmontagem. O relatório consolidado
une as execuções sem somar percentuais nem duplicar linhas ou ramificações.
O resumo também mostra cada suíte isoladamente sobre o mesmo inventário completo.

Todo `.ts` e `.tsx` de `app/` e `src/` entra no inventário, inclusive telas,
componentes e adaptadores sem testes. Estes entram com contadores zerados sem
importar módulos nativos no Node. Somente testes, declarações `.d.ts` e arquivos
fora dessas duas pastas ficam fora do escopo. Tipos apagados pelo compilador não
contam como linhas executáveis. Configuração Expo/Metro e arquivos gerados não
participam da medição do produto.

Arquivos gerados em `coverage/`:

- `html/index.html`: detalhes por linha, função e ramificação.
- `lcov.info`: integração com ferramentas de cobertura.
- `coverage-final.json` e `coverage-summary.json`: dados Istanbul e totais.
- `source-inventory.json`: revisão, resultado e cobertura por suíte, fontes e grupos.
- `component-test-results.json`: resultado e duração dos casos e suítes Jest.
- `summary.md`: total, suítes, áreas e arquivos com mais ramificações não cobertas.

A CI publica o resumo na execução e o artifact `mobile-code-coverage` por 30 dias.
Dados temporários dos processos ficam em `.coverage-runtime/`, fora do artifact.
Falhas dos testes continuam falhando no CI, mesmo se um relatório parcial for
gerado; esse relatório identifica o resultado como `failure`. Ausência de coleta
ou de contadores de linhas/branches falha explicitamente.

Esta referência mede unidades e componentes em Node. Não inclui os E2E Android de
`onze-automation`, o motor Hermes nem execução em aparelhos. Telas e caminhos não
exercitados continuam com zero; adicionar componentes não significa cobrir todas
as jornadas do aplicativo. Branch coverage mede caminhos de `if`/`switch`,
ternários e expressões lógicas, não MC/DC nem todas as combinações booleanas.

Não há percentual mínimo arbitrário nesta medição. O teste da ferramenta
confere dois processos, os dois caminhos de uma condição, um TSX nunca importado,
o descarte de tipos e a coleta mesmo quando o processo de teste falha. Uma
regressão adicional aquece o cache sem instrumentação, executa caminhos opostos
em Node e Jest, exige 100% na condição combinada e confere que o denominador e o
TSX nunca importado permanecem corretos.

Para executar apenas uma suíte de componentes sem medir cobertura:

```bash
npm run test:components -- --runInBand tests/components/login.test.tsx
npm run typecheck:components
```

Use `npm run test:coverage` para a medição unificada; `jest --coverage` não usa o
inventário da fase 1 e é rejeitado pelo transformer. Veja o
[escopo dos componentes](component-tests.md).
