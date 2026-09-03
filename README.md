# Onze Mobile

Aplicativo mobile do **Onze — Organizador de Pelada**.

> Estado documentado em 03/09/2026: a versão mais recente está na branch `feature/paid-withdrawal-replacement-refund` e contempla grupos, administração, partidas, presença, pagamentos, créditos, prazos, notificações e reposição da vaga após saída paga. A `master` permanece como referência estável.

## Stack

- React Native 0.86.3 e React 19.2.3
- Expo SDK 57 e Expo Router
- TypeScript 6
- Tamagui
- Expo SecureStore e autenticação biométrica
- Expo Notifications com Firebase Cloud Messaging no Android

## Funcionalidades implementadas

### Conta

- Cadastro, login, recuperação de senha e encerramento da sessão.
- Token de acesso protegido pelo SecureStore.
- Opção de entrada biométrica no dispositivo.

### Grupos e administração

- Criação e entrada em grupos por convite.
- Foto, nome, local, horários habituais, valor e chave PIX padrão.
- Lista de membros e administradores.
- Administrador Principal, permissões individuais e transferência do cargo.

### Partidas e presença

- Criação de partida avulsa ou série semanal.
- Data, horário, fuso, local, limite de jogadores e observações.
- Prazo final para entrar na lista e prazo final para pagamento.
- Respostas de presença e atualização imediata da lista.
- Cancelamento de uma partida ou encerramento da série.
- Depois do prazo de inscrição, somente o administrador pode adicionar uma reposição.

### Pagamentos, créditos e reposições

- Cobrança por jogador com valor e chave PIX próprios da partida.
- Botão **Já paguei** e confirmação posterior pelo administrador.
- Tela de créditos do grupo com valores disponíveis, reservados e aplicados.
- Crédito mantido para a próxima partida e aplicado automaticamente quando elegível.
- Acertos individuais ou em lote: não recebido, reembolso, crédito ou retenção.
- Remoção automática da lista quando o pagamento continua pendente após o prazo.
- Jogador que já pagou pode sair da lista; o acerto fica bloqueado até a vaga ser preenchida.
- Administrador pode devolver o próprio jogador à vaga ou escolher outro membro como substituto.
- Quando a vaga é preenchida, o administrador pode reembolsar, manter crédito ou reter o valor.

### Notificações

- Push remoto por Expo/FCM para eventos enviados pela API.
- Avisos de jogo criado, presença liberada, pagamento, time completo, crédito, reposição e cancelamento.
- Lembretes diários às 09:00 para presença e pagamento.
- Aviso no dia anterior ao jogo.
- Fallback local quando o push remoto não puder ser registrado.
- Ao tocar na notificação, o aplicativo abre a partida correspondente.

## Fluxo de presença e pagamento

| Estado | Comportamento |
|---|---|
| Ainda não respondeu | Recebe lembrete de presença até o prazo de inscrição |
| Confirmou e não pagou | Vaga reservada; recebe cobrança até o prazo de pagamento |
| Informou o pagamento | Cobrança é pausada enquanto aguarda o administrador |
| Pagamento confirmado | Permanece na lista como pago |
| Pendente após o prazo | É removido automaticamente da lista |
| Pago e saiu da lista | Acerto fica em análise e bloqueado enquanto não houver reposição |
| Vaga preenchida ou jogo cancelado | Acerto é liberado para decisão administrativa |

## Executar localmente

Pré-requisitos: Node.js 22 e npm.

```bash
npm install
npm run typecheck
npx expo start
```

Variáveis opcionais:

- `EXPO_PUBLIC_API_URL`: URL da API. Sem ela, o app usa a API de desenvolvimento no Render.
- `EXPO_PUBLIC_EAS_PROJECT_ID`: projeto EAS usado para gerar o Expo Push Token. O `projectId` do `app.json` é usado como alternativa.

O aplicativo Android usa o identificador `com.onze.organizadordepelada` e o arquivo público `google-services.json`. Nenhuma chave privada deve ser commitada.

## Validação e APK

```bash
npm run typecheck
npx expo config --type public
npx expo export --platform android
```

- O workflow **Mobile CI** instala as dependências e executa o TypeScript.
- O workflow **Android APK** faz o prebuild, compila a versão `release` para `arm64-v8a` e mantém o artefato por 14 dias.
- O perfil EAS `preview` gera um APK de distribuição interna.
- O APK deve ser instalado e aberto ao menos uma vez para registrar o aparelho e pedir permissão de notificações.

## Ambientes e branches

- `master`: versão estável; só recebe promoção após aprovação explícita.
- `development`: integração e validação.
- `feature/*`: funcionalidades isoladas e geração automática de APK.
- `docs/*`: alterações documentais.

API padrão: <https://onze-organizador-de-pelada.onrender.com>

Projeto EAS: `onze-organizador-de-pelada/onze-organizador-de-pelada`
