# Testes de componentes — fase 2

Os testes em `tests/components/` renderizam componentes e dez telas reais com
Jest 29, o preset do Expo 57 e React Native Testing Library 14. O provider, os
controles Tamagui, o `AppButton`, as regras de negócio, o armazenamento de sessão
e o cliente HTTP do aplicativo continuam reais. Não há snapshots.

Referência atual: **229 casos em 19 suítes de componentes/telas**, além dos
132 testes Node existentes. Os 104 arquivos produtivos permanecem no inventário.

| Escopo                               | Linhas | Ramificações |
| ------------------------------------ | -----: | -----------: |
| Geral na fase 1                      | 12,10% |        9,96% |
| Geral na primeira entrega da fase 2  | 33,28% |       34,74% |
| Geral após ampliar as telas críticas | 57,29% |       57,70% |
| Arquivos de telas (`app/`)           | 43,42% |       43,94% |
| 32 componentes compartilhados        | 92,38% |       83,30% |

Os valores são uma referência da implantação da suíte, não uma meta mínima. As
duas ramificações adicionais no inventário vêm do bloqueio do envio pelo teclado
no modal de goleiro de aluguel. O relatório de cada execução é a fonte atual.

```bash
npm install
npm run test:components -- --runInBand
npm run typecheck:components
npm run test:coverage
```

O `postinstall` prepara os assets aprovados usados pelo aplicativo. Se a instalação
foi feita com `--ignore-scripts`, execute `node scripts/write-app-icon.mjs` antes
dos componentes, assim como antes do build.

| Área                     | Comportamentos verificados                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Login                    | Senha, restauração, sessão expirada, destinos de links, digital com renovação, cancelamento, indisponibilidade, rejeição e troca de conta |
| Cadastro e recuperação   | Payloads, confirmação de código, reenvio, falhas, preservação de entradas e envio pendente                                                |
| Criação de grupo         | Nome obrigatório, descrição, continuidade e nova tentativa após erro                                                                      |
| Delegação administrativa | Exclusividade do principal, administrador rebaixado, seleção de funções, persistência, erro recuperável e 401                             |
| Navegação e abertura     | Aba atual, destino, voltar acessível, movimento reduzido, app ainda não pronto e prazo de segurança                                       |
| Loading global           | Atraso antes de aparecer, mensagem de demora, operações concorrentes, suspensão e sem indicador duplicado na tela                         |
| Perfil                   | Posições, edição de notas, limites, limpar, somente leitura e seleção de temporada                                                        |
| Presença e pagamentos    | Situações exibidas nos cards, crédito, reembolso, ausência de vaga, reposição e goleiros                                                  |
| Lista de espera e mínimo | Primeiro da fila, confirmação, lotação, conflito, sessão expirada, estender/cancelar/manter abaixo do mínimo                              |
| Aviso de grupo excluído  | Confirmação no servidor, nova tentativa, descarte de resposta de outra conta e remoção do listener                                        |
| Jogo ao vivo             | Placar por time, espectador, intervalo, cartões, expulsão, gol contra, assistência, chutes, falta, pênalti e correções                    |
| Tempos e início          | Duração, acréscimos, limites, prorrogação, nomes/imagens de times e bloqueio durante envio                                                |
| Disputa por pênaltis     | Dez batedores ordenados, restauração sem apagar edição, gol/perda explícitos, morte súbita, vencedor e espectador                         |
| Data e hora              | Diálogo Android, descarte, desmontagem, confirmação/cancelamento iOS e máscara web                                                        |

## Ampliação das telas críticas

Foram adicionados 86 casos com as telas, componentes, regras e clientes HTTP
reais. Os 104 arquivos produtivos e os denominadores de 4.585 linhas e 4.968
ramificações permanecem iguais aos da primeira entrega da fase 2.

| Suíte                          | Casos | Linhas da tela | Ramificações da tela |
| ------------------------------ | ----: | -------------: | -------------------: |
| `create-match-screen.test.tsx` |    18 |         81,14% |               82,32% |
| `match-screen.test.tsx`        |    25 |         66,08% |               64,42% |
| `teams-screen.test.tsx`        |    15 |         79,61% |               77,77% |
| `live-screen.test.tsx`         |    28 |         85,21% |               75,00% |

Criação de partida verifica fuso e prazos, cobrança/PIX, goleiros, modalidade,
quantidade de times, jogos semanais, tempos e desempates. A tela de partida
verifica perfil obrigatório, presença e fila, desistência, ações financeiras por
permissão, confirmação e recusa de pagamento, lembrete, acerto individual ou em
lote, reposição, aluguel, compartilhamento e início do jogo. Os testes distinguem
explicitamente cancelar uma ocorrência semanal de encerrar a série.

Escalação verifica geração e distribuição de reservas, posição, troca de time,
limite do campo e apenas um goleiro em campo. Jogo ao vivo verifica autoria de
gols/cartões/chutes/faltas, marcação e resolução separadas do pênalti, correções,
remoções com confirmação, acréscimos, transição de tempos, cobranças da disputa,
confirmação do vencedor, finalização e reset. O ajuste otimista do placar é
testado com resposta pendente e falha. A transmissão SSE usa o parser real e
verifica eventos atrasados, outra partida, retorno ao foreground e sessão 401.

O harness em `tests/support/` controla apenas fronteiras externas: roteador,
safe area, SecureStore, `fetch`, autenticação biométrica, notificações e seletor
nativo de data/hora. As novas suítes também controlam AppState, o transporte
EventSource e os recursos nativos de captura/compartilhamento. Uma requisição
HTTP não declarada faz o teste falhar; nenhum
teste acessa a API real. As fábricas têm os tipos completos do contrato da API.
O roteador considera a tela montada como focada e respeita a limpeza do efeito;
transições reais de foco pertencem ao E2E. Timers e relógio são controlados nos
casos de loading, cronômetro e abertura.

A cobertura inclui todos os arquivos produtivos, não apenas os importados pela
suíte. Exercitar todos os componentes compartilhados não implica cobrir todas as
suas ramificações, todos os 31 arquivos de `app/` ou todas as combinações de estado.
O HTML e o inventário identificam os trechos ainda não exercitados. As principais
lacunas restantes incluem perfil esportivo, configuração/administração de grupo,
rankings/estatísticas e Home. Nas quatro telas ampliadas ainda há caminhos
secundários sem teste, incluindo envio real de fotos, seleção completa da escala
de pênaltis na tela e combinações de permissões e estados financeiros.

Estes testes não validam pixels, gesto/toque nativo, diálogo biométrico real,
entrega de push pelo sistema operacional, teclado do aparelho nem execução
Hermes. Os E2E Android em `onze-automation` continuam responsáveis por essa camada.
O CI deste repositório executa unidades e componentes juntos; não há novos
gatilhos entre repositórios nesta fase.
