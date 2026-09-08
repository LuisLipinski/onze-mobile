# Onze Mobile

Aplicativo Android do **Onze — Organizador de Pelada**.

> Estado revisado em 04/09/2026 contra a implementação da branch mais completa. Esta página diferencia funcionalidade implementada, integração em `development` e itens planejados.

## Estado por branch

| Branch | Estado |
|---|---|
| `feature/paid-withdrawal-replacement-refund` | Versão funcional mais completa: partidas, presença, financeiro, prazos, notificações e reposições. |
| `docs/documentation-alignment-2026-09-04` | Correções documentais baseadas na versão funcional mais completa. |
| `development` | Integração até grupos e permissões administrativas; está nove commits atrás da versão funcional auditada. |
| `master` | Baseline inicial com somente README. **Ainda não é um backup funcional do aplicativo.** |

A base funcional mais recente foi introduzida pelo commit `23c176e`; commits posteriores na mesma linha podem conter somente documentação. Nenhuma destas alterações foi promovida para `master`.

## Stack implementada

- React Native 0.86.3 e React 19.2.3
- Expo SDK 57 e Expo Router
- TypeScript 6
- Tamagui
- Expo SecureStore e autenticação biométrica
- Expo Notifications com Firebase Cloud Messaging no Android
- Identificador Android `com.onze.organizadordepelada`

## Conta e acesso

- Cadastro, login, recuperação de senha e encerramento local da sessão.
- Access token e dados da conta armazenados no SecureStore.
- O access token da API dura duas horas por padrão e não existe refresh token.
- A biometria fica vinculada a uma única conta e apresenta nome/e-mail salvos.
- Encerrar a sessão não desativa a preferência biométrica.
- A biometria reutiliza o token protegido no aparelho; quando ele expira, o usuário precisa entrar novamente com senha.
- Opções **Entrar com senha** e **Entrar com outra conta** não reutilizam silenciosamente a conta biométrica.
- Links de convite e notificações preservam o destino após autenticação.

## Navegação e telas implementadas

- Barra inferior: **Home | Grupos | Configurações**.
- Home com próximos jogos e estado vazio.
- Cadastro, login, solicitação e confirmação de recuperação de senha.
- Lista, criação, edição e entrada em grupos.
- Fluxo de foto e dados complementares do grupo.
- Convite por link HTTPS/código, compartilhamento e regeneração.
- Membros, promoção, rebaixamento, transferência do Principal e permissões individuais.
- Criação de partida, detalhe da partida, presença, pagamentos e cancelamentos.
- Créditos do grupo, acertos em lote e seleção de reposição.
- Tela de carregamento específica para o despertar da API no Render.

## Administração de grupos

- O criador entra como `PRIMARY_ADMIN`.
- Um `ADMIN` novo começa sem permissões.
- Promoção de membros depende de `PROMOTE_MEMBERS`.
- Somente o Principal edita permissões, rebaixa administradores e transfere o cargo.
- Após a transferência, o antigo Principal permanece como `ADMIN` sem permissões automáticas.
- Edição, convites, remoção de membros e partidas respeitam as permissões devolvidas pelo backend.

## Partidas e presença

- Partida avulsa ou série semanal.
- Data, horário, fuso, local, limite de jogadores, observações e cobrança opcional.
- Prazo final de inscrição e, quando há cobrança, prazo final de pagamento.
- O jogador escolhe **Vou jogar** ou **Não vou**; **Talvez** não está implementado.
- Cartões e detalhe exibem abertura da presença, prazos e contagem de vagas.
- Depois do prazo de inscrição, o jogador não entra sozinho.
- Cancelamento de uma ocorrência ou encerramento da série.
- Lista de espera e promoção automática ainda não estão implementadas.

## Pagamentos, créditos e reposições

- Valor e PIX próprios da partida, com padrões opcionais do grupo.
- Botão **Já paguei** e confirmação por administrador autorizado.
- Jogador comum vê apenas o próprio pagamento; Principal ou `ADMIN` com `SCHEDULE_GAMES` acessa o painel completo.
- Crédito disponível, reservado e aplicado exibido na tela do grupo e da partida.
- Acertos individuais ou em lote: não recebido, reembolso, crédito ou retenção.
- Jogador com pagamento informado ou confirmado pode sair.
- O acerto fica bloqueado até a vaga ser preenchida, exceto a decisão **não recebido** aplicável a pagamento apenas informado.
- O jogador que saiu não retorna sozinho; um administrador autorizado pode recolocá-lo ou escolher outro membro.
- O cancelamento da partida libera os acertos sem exigir reposição.

## Notificações

- Push remoto por Expo/FCM para eventos da API.
- Jogo criado, presença liberada, lembretes, pagamento, crédito, reposição, time completo e cancelamento.
- Aviso no dia anterior ao jogo.
- Ao tocar, o aplicativo abre diretamente a partida.
- Quando o push remoto não está disponível, o aplicativo agenda lembretes locais.
- O fallback local agenda no máximo 30 dias futuros e é refeito após sincronização dos jogos.
- Recibos do Expo/FCM e limpeza automática de tokens rejeitados ainda estão pendentes.

## Validação atual

- `Mobile CI`: instala dependências e executa `npm run typecheck`.
- `Android APK`: executa o prebuild limpo, compila `assembleRelease` para `arm64-v8a` e publica o APK por 14 dias.
- O perfil EAS `preview` gera APK de distribuição interna.
- O repositório ainda não possui testes unitários, testes de componentes ou suíte E2E Android automatizada.
- Configuração Expo, bundle Android e integridade do APK são verificações de entrega; ainda não fazem parte integral do workflow `Mobile CI`.

```bash
npm install
npm run typecheck
npx expo config --type public
npx expo export --platform android
npx expo start
```

Variáveis opcionais:

- `EXPO_PUBLIC_API_URL`: URL da API; sem ela, usa o Render de desenvolvimento.
- `EXPO_PUBLIC_EAS_PROJECT_ID`: projeto usado para gerar o Expo Push Token; o `projectId` do `app.json` é o fallback.

## Planejado, ainda não disponível

- Perfil esportivo completo.
- Lista de espera.
- Formação e balanceamento dos times.
- Jogo ao vivo, placar e eventos.
- Estatísticas e histórico esportivo.
- Free/Premium e publicação em loja.

API padrão: <https://onze-organizador-de-pelada.onrender.com>