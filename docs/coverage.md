# Cobertura de linhas e ramificações — fase 1

```bash
npm install
npm run test:coverage:check
npm run test:coverage
```

O comando executa os mesmos testes `node:test` usados por `npm test`.
TypeScript transpila somente para esta execução de medição; Istanbul instrumenta
o JavaScript e os source maps devolvem os contadores aos arquivos TS/TSX originais.
O aplicativo, o Metro e o build Android não recebem instrumentação.

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
- `source-inventory.json`: revisão, resultado dos testes, todas as fontes e grupos.
- `summary.md`: total, áreas e arquivos com mais ramificações não cobertas.

A CI publica o resumo na execução e o artifact `mobile-code-coverage` por 30 dias.
Dados temporários dos processos ficam em `.coverage-runtime/`, fora do artifact.
Falhas dos testes continuam falhando no CI, mesmo se um relatório parcial for
gerado; esse relatório identifica o resultado como `failure`. Ausência de coleta
ou de contadores de linhas/branches falha explicitamente.

Esta referência mede a suíte Node existente. Não inclui os E2E Android de
`onze-automation`, o motor Hermes nem execução em aparelhos. Por isso, percentual
baixo em telas evidencia a lacuna de componentes a tratar na fase 2; não contradiz
a aprovação das jornadas E2E. Branch coverage mede caminhos de `if`/`switch`,
ternários e expressões lógicas, não MC/DC nem todas as combinações booleanas.

Não há percentual mínimo arbitrário nesta primeira medição. O teste da ferramenta
confere dois processos, os dois caminhos de uma condição, um TSX nunca importado,
o descarte de tipos e a coleta mesmo quando o processo de teste falha.
