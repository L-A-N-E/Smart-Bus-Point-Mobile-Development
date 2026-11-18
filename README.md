<p align="center">
    <!-- <img src="mobile/assets/images/logo-mark.png" align="center" width="20%" alt="Logo do S.B.P."> -->
    <img width="20%" align="center" alt="logo-1-png" src="https://github.com/user-attachments/assets/3ad6ac40-308a-4cfd-aaa4-a5520c3e390e" />

</p>

<h1 align="center">S.B.P. — Smart Bus Point</h1>

<p align="center">
    <strong><i>Seu ônibus, sem adivinhação</i></strong>
</p>

<p align="center">
    Aplicativo mobile de transporte público no estilo Moovit, focado nos ônibus da cidade de São Paulo
    (dados da SPTrans), com acessibilidade como diferencial: chegadas em tempo real, rotas com
    baldeação, selo de confiança do dado, status do metrô/trem e alerta de descida por GPS.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
</p>

---

# 📚 Sumário

- [📖 Escopo do Projeto](#-escopo-do-projeto)
- [✨ Funcionalidades](#-funcionalidades)
- [🚀 Como Executar o Projeto](#-como-executar-o-projeto)
- [🗺️ Dados: SPTrans, GTFS e Metrô/Trem](#️-dados-sptrans-gtfs-e-metrôtrem)
- [🦽 Acessibilidade](#-acessibilidade)
- [🔐 Contas e Segurança](#-contas-e-segurança)
- [🔌 API do Backend](#-api-do-backend)
- [🏗️ Estrutura do Projeto](#️-estrutura-do-projeto)
- [🧰 Tecnologias](#-tecnologias)
- [📦 Bibliotecas](#-bibliotecas)
- [🌍 APIs externas](#-apis-externas)
- [🗺️ Próximas Etapas](#️-próximas-etapas)
- [👨‍💻 Desenvolvido por](#desenvolvido-por)

---

## 📖 Escopo do Projeto

### Problema

Quem depende de ônibus em São Paulo não sabe quando o próximo vai chegar, se vai vir acessível,
nem qual a melhor combinação de linhas para um trajeto — e a acessibilidade raramente é tratada
como prioridade nos apps de transporte existentes.

### Público-alvo

Passageiros de ônibus da cidade de São Paulo, com atenção especial a quem usa cadeira de rodas,
tem baixa visão ou depende de leitor de tela — mas útil para qualquer usuário do transporte público.

### Proposta de valor

Chegadas em tempo real (dados oficiais da SPTrans), planejamento de rotas com baldeações, selo de
confiança do dado ("Ao vivo" vs. "Programado"), indicação de veículo acessível em cada previsão,
status do metrô/trem e alerta de descida por GPS — com acessibilidade (contraste, leitor de tela,
fonte do sistema, voz) como requisito, não como extra.

## ✨ Funcionalidades

| Área | O que o app faz |
| :--- | :--- |
| **Autenticação** | Login/cadastro local com hash de senha (SHA-256 + salt), bloqueio após tentativas erradas, sugestão de correção de e-mail, consentimento LGPD, conta de demonstração |
| **Início** | Saudação, atalhos (escanear, paradas próximas), paradas favoritas com próxima chegada, aviso de chuva (Open-Meteo) e resumo do status do metrô/trem |
| **Escanear QR** | Leitura de QR Code da parada (câmera) nos formatos `sbp://parada/<código>`, `https://sbp.app/p/<código>` e código numérico isolado, com campo de código manual e lanterna — sempre com alternativa acessível |
| **Explorar** | Busca de linhas e paradas, lista de paradas próximas por GPS, atalho para o status do metrô/trem |
| **Parada** | Próximas chegadas por linha com selo de confiança e idade do dado, favoritar, ler em voz alta, filtro "só acessíveis", relatos recentes, atalhos para traçar rota e relatar problema |
| **Linha** | Mapa com o traçado (shape do GTFS), posição dos veículos ao vivo, alternância de sentido, tabela de horários programados |
| **Rotas** | Planejador origem→destino (minha localização ou endereço geocodificado), horário "sair agora/às/chegar até", filtros de acessibilidade e menos caminhada |
| **Resultados e detalhe** | Até 5 opções ordenadas por chegada, com partida, chegada, tempo total, baldeações, caminhada e CO2 evitado; linha do tempo por trecho, salvar rota, compartilhar viagem, iniciar viagem |
| **Rotas salvas** | Criar, renomear, excluir (com desfazer) e reabrir uma rota salva recalculando com dados ao vivo |
| **Viagem ativa** | Acompanhamento por GPS com alerta de descida (notificação do sistema quando possível + alerta sempre visível no app, vibração e voz), comparando a localização do celular com a coordenada real da parada |
| **Status do metrô/trem** | Lista de linhas com status (ícone + texto, nunca só cor), horário da última atualização, resumo no Início |
| **Relatos** | Lotação (vazio/médio/lotado) e problemas (não passou, sem acessibilidade, atraso) por parada ou linha, anônimos, com relatos recentes (30 min) |
| **Perfil** | Estatísticas (viagens concluídas, CO2 evitado), idioma (pt/en/es), tema claro/escuro/sistema, alto contraste, preferências padrão (acessibilidade, voz, alertas de descida/chuva), política de privacidade, exportar dados, excluir conta |

## 🚀 Como Executar o Projeto

### 📱 App mobile (modo mock — sem backend)

```bash
cd mobile
npm install
npx expo start
```

Abra no **Expo Go** (escaneando o QR do terminal) ou pressione `i`/`a` para simulador/emulador.
Com `EXPO_PUBLIC_USE_MOCK=true` (padrão do `.env.example`), o app roda 100% com dados fixos de
`src/data`, sem precisar de backend nem de tokens — inclusive o planejador de rotas e o status
do metrô/trem respondem com dados fictícios plausíveis.

Conta de teste: `demo@sbp.com` / `Sbp@2026` (atalho na tela de login).

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest (utils/qr.ts)
```

### 🛰️ Backend (API própria)

```bash
cd backend
cp .env.example .env    # preencha os tokens quando for usar dados reais (ver tabela abaixo)
npm install
npm run dev
```

A API sobe em `http://localhost:3333`; confira `http://localhost:3333/api/health`. Para o app mobile
consumir o backend em vez do mock, defina `EXPO_PUBLIC_USE_MOCK=false` em `mobile/.env` — a URL é
descoberta automaticamente pelo IP que o Expo está usando (ou forçada com `EXPO_PUBLIC_API_URL`).

```bash
npm run typecheck   # tsc --noEmit
npm test             # testes do planner (node --test via tsx), com GTFS sintético em memória
```

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3333` | Porta da API |
| `OLHOVIVO_TOKEN` | — | Token da API Olho Vivo (cadastro gratuito no portal da SPTrans) |
| `OLHOVIVO_BASE_URL` | `http://api.olhovivo.sptrans.com.br/v2.1` | Base da API Olho Vivo |
| `TRILHOS_API_KEY` | — | Chave gratuita da API do Trilhos Agora (status do metrô/trem) |
| `GEOCODING` | `on` | Usa o Nominatim para geocodificar endereços no planejador. `off` desativa |
| `COLLECTOR` | `off` | Grava em SQLite cada previsão/posição consultada, para medir depois a acurácia da SPTrans |
| `PLANNER` | `builtin` | Motor do planejador (`builtin` ou `otp`, ver [Próximas Etapas](#️-próximas-etapas)) |

#### Importação do GTFS (opcional, para horários programados e mapas de linha)

1. Baixe o feed GTFS no [portal de desenvolvedores da SPTrans](https://www.sptrans.com.br/desenvolvedores/) (exige login).
2. Coloque o arquivo `.zip` em `backend/data/gtfs/`.
3. Rode `npm run gtfs:import` — lê `stops`, `routes`, `trips`, `stop_times`, `shapes`, `calendar` e
   `frequencies` (se existir) em streaming e grava num SQLite indexado (`backend/data/gtfs.db`, gitignored).

Sem o GTFS importado, `/api/stops/*` e `/api/routes/plan` continuam funcionando com os dados ao
vivo da Olho Vivo (quando configurada) e devolvem listas vazias/aviso onde dependem do GTFS.

## 🗺️ Dados: SPTrans, GTFS e Metrô/Trem

### Olho Vivo (SPTrans)

Autenticação por `POST /Login/Autenticar?token=...`, reaproveitando o cookie de sessão e
reautenticando automaticamente quando expira (`backend/src/services/olhoVivo.ts`). Os nomes de
campo usados (`cl`, `lt`, `sl`, `p`, `a`, `ta`, `t`, `py`/`px`) seguem a
[documentação pública da Olho Vivo](https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/).

> **Verificação pendente:** este ambiente de desenvolvimento não tem um `OLHOVIVO_TOKEN` válido
> configurado, então as respostas reais da API não foram comparadas byte a byte com a documentação.
> A documentação indica que a categoria "Paradas" da Olho Vivo cobre hoje só paradas de corredor —
> por isso a lista completa de paradas vem sempre do GTFS. **Antes de usar em produção**, confirme
> com um token real se o `stop_id` do GTFS corresponde ao `codigoParada` devolvido pela Olho Vivo nas
> respostas de previsão/posição; se não corresponder, grave o mapeamento na tabela
> `stop_code_overrides` (`backend/src/services/gtfsDb.ts`), já preparada para isso.

### GTFS

Importado manualmente (feed exige login no portal da SPTrans) via `npm run gtfs:import`
(`backend/scripts/importGtfs.ts`), em streaming e com índices por parada/viagem. Se o feed não
trouxer `shapes.txt` ou `calendar.txt`, o importador avisa no terminal e segue sem essas tabelas
(traçado de linha e filtro por dia da semana ficam indisponíveis, sem quebrar o resto). O planner
builtin **não usa `frequencies.txt` ainda** — linhas que só têm horário por frequência (sem
`stop_times` explícito) não aparecem nos resultados hoje; fica como próxima etapa.

### Metrô e trem (Trilhos Agora)

Proxy do `GET /v1/status` da [API do Trilhos Agora](https://api.trilhosagora.com.br/v1/openapi.json)
(terceiro, não é a API oficial da ARTESP/Metrô), autenticado por `X-API-Key`
(`backend/src/services/railStatus.ts`). O endpoint e os campos (`sigla`, `rotulo`, `cor`, `status`,
`atualizado_em`) foram confirmados contra a especificação OpenAPI publicada. A API devolve texto
livre da operadora (ex.: "Operação Normal", "Velocidade Reduzida"); o backend normaliza por
palavras-chave em `normal` / `reduced` / `problem` — qualquer coisa fora do "normal" reconhecido
vira `reduced` por padrão (mais seguro avisar de mais do que de menos). Isolado detrás de
`RailStatusProvider` para trocar por uma integração oficial da ARTESP/CCM depois sem mudar o app.
É só **status**, não previsão por trem — o app deixa isso explícito na tela.

## 🦽 Acessibilidade

- **Nunca só cor:** todo status (confiança do dado, situação da linha, lotação) usa ícone + texto + cor.
- **Fonte do sistema:** nenhum texto usa `allowFontScaling={false}`; botões e campos crescem
  (`minHeight`, não `height` fixo) para a fonte em 200% não cortar conteúdo.
- **Alvos de toque ≥ 48dp** em todos os elementos interativos.
- **Contraste medido (WCAG 2.1):** o teal (`#2AB2B8`) e o verde (`#2AB85E`) usam texto escuro
  quando são fundo de botão (nunca branco); como texto/ícone, usam variantes mais escuras
  (`primaryText`/`successText`) — o par puro fica abaixo de 4,5:1 sobre fundo claro. Tema de
  **alto contraste** (≥ 7:1) disponível no Perfil. Tabela completa em `mobile/src/tokens/colors.ts`.
- **Leitor de tela:** todo componente interativo tem `accessibilityLabel`/`Role`/`Hint` em português.
- **Reduzir movimento:** animações (toasts, skeletons, transições) consultam a preferência do sistema.
- **Alerta de descida:** compara o GPS do celular com a coordenada real da parada de desembarque
  (não com a posição do ônibus), a ~150 m e na chegada; usa notificação do sistema quando possível
  e **sempre** um alerta visível dentro do app (com voz, se ativada) como reforço/alternativa.

## 🔐 Contas e Segurança

Login local (salvo no aparelho), enquanto o backend não tem autenticação própria:

- Senhas guardadas como hash **SHA-256 com salt** aleatório por usuário (`expo-crypto`), nunca em texto puro.
- Regras de senha forte (8+ caracteres, maiúscula, minúscula, número e símbolo), bloqueio de senhas comuns, com medidor de força.
- **Bloqueio de 60 s após 5 tentativas** erradas, com mensagem genérica que não revela se o e-mail existe.
- Sugestão de correção de e-mail digitado errado ("Você quis dizer gmail.com?").
- Cadastro com consentimento explícito (LGPD) sobre uso de localização e armazenamento local dos dados.
- Cada conta tem suas próprias rotas salvas e favoritos; relatos de lotação/problema são **anônimos**
  (nenhum dado pessoal é enviado). "Excluir minha conta" remove tudo do aparelho; "Exportar meus
  dados" gera um resumo em JSON.
- **Nenhum token ou segredo no app.** O app mobile nunca chama a SPTrans, o Trilhos Agora ou o
  Nominatim direto — tudo passa pelo backend, que guarda os tokens, cacheia respostas e aplica um
  limite simples de requisições por IP. A única chamada externa feita direto do app é o Open-Meteo
  (gratuito, sem chave).

## 🔌 API do Backend

| Endpoint | Descrição |
| :--- | :--- |
| `GET /api/health` | Status da API (configuração de tokens, cache, planner) |
| `GET /api/stops/nearby?lat=&lng=&radius=` | Paradas próximas (GTFS, raio em metros) |
| `GET /api/stops/search?q=` | Busca de paradas por nome/código |
| `GET /api/stops/:code` | Dados de uma parada pelo código |
| `GET /api/stops/:code/arrivals?onlyAccessible=` | Chegadas: ao vivo (Olho Vivo) com retorno "programado" (GTFS) quando falha ou vem vazio |
| `GET /api/lines/search?q=` | Busca de linhas (GTFS + Olho Vivo combinados) |
| `GET /api/lines/:code/vehicles` | Posição dos veículos de uma linha (código Olho Vivo) |
| `GET /api/lines/:routeId/stops?direction=` | Paradas de uma linha+sentido (GTFS) |
| `GET /api/lines/:routeId/shape?direction=` | Traçado (shape) de uma linha+sentido (GTFS) |
| `GET /api/lines/:routeId/schedule?direction=` | Horários programados de partida (GTFS) |
| `POST /api/routes/plan` | Planejador de rotas: `{ origin, destination, departAt?, arriveBy?, onlyAccessible?, lessWalking? }` → até 5 opções |
| `GET /api/rail/status` | Status do metrô/trem (proxy do Trilhos Agora, normalizado) |
| `GET /api/geocode?q=` | Geocodificação (Nominatim, restrita à RMSP, 1 req/s) |
| `POST /api/reports` | Relato anônimo: `{ stopCode?, line?, type: "crowding"\|"problem", value }` |
| `GET /api/reports?stop=&line=` | Relatos dos últimos 30 min para uma parada/linha |

O app **nunca** chama a SPTrans, o Trilhos Agora ou o Nominatim direto: tudo passa pelo backend.

## 🏗️ Estrutura do Projeto

```
Smart-Bus-Point/
├── mobile/                      # App (Expo + React Native + TypeScript)
│   ├── App.tsx                  # Providers: idioma, tema, toasts, preferências, conta, favoritos, rotas salvas, viagem ativa
│   └── src/
│       ├── components/          # Button, Card, TextField, Toast, Dialog, StatusBadge, ArrivalRow,
│       │                          RouteOptionCard, TimelineLeg, TimePicker, AccessibleBadge, Map...
│       ├── contexts/             # Auth, Theme, Language, Toast, Preferences, Favorites, SavedRoutes, ActiveTrip
│       ├── data/                 # Fixtures do modo mock (paradas, linhas, previsões, rotas, status do metrô)
│       ├── hooks/                 # useArrivals, useVehicles, useNearbyStops, useLocation, useReduceMotion
│       ├── i18n/                  # Traduções (pt, en, es), tipadas a partir de pt.ts
│       ├── navigation/             # AuthStack, RootStack, MainTabs, TabBar (botão central de QR), deep link sbp://
│       ├── screens/                 # Auth, Home, Explore, Routes*, StopDetail, LineDetail, ScanQr, RailStatus,
│       │                              Report, Profile (* planner, resultados, detalhe, viagem ativa)
│       ├── services/                # api.ts (cliente do backend), weather.ts (Open-Meteo), notifications.ts, speech.ts
│       ├── tokens/                   # Cores (claro/escuro/alto contraste), tipografia (Montserrat), espaçamento
│       └── utils/                     # qr.ts (+ testes), geo.ts, co2.ts, time.ts, stats.ts, validation.ts, haptics.ts
│
└── backend/                     # API Node/Express própria
    ├── data/gtfs/                # (gitignored) zip do GTFS baixado manualmente
    ├── scripts/importGtfs.ts     # Importa o GTFS pro SQLite, em streaming
    └── src/
        ├── index.ts, config.ts
        ├── routes/                # health, stops, lines, routes (planner), rail, geocode, reports
        ├── services/               # olhoVivo, gtfsDb, planner (+ testes), plannerLive, railStatus,
        │                             geocode, cache, rateLimit, collector, reports, co2, time
        └── validation.ts
```

## 🧰 Tecnologias

| Camada | Tecnologias |
| :--- | :--- |
| App | React Native 0.86, Expo SDK 57, TypeScript, React Navigation 7, AsyncStorage, Jest |
| Backend | Node.js, Express 5, TypeScript (tsx), better-sqlite3, Node test runner |
| Dados externos | API Olho Vivo (SPTrans), GTFS (SPTrans), Trilhos Agora (status metrô/trem), OpenStreetMap Nominatim, Open-Meteo |

## 📦 Bibliotecas

### App (`mobile/`)

| Biblioteca | Para que é usada |
| :--- | :--- |
| `react-native` / `react` | Base do aplicativo |
| `expo` | Plataforma de desenvolvimento e execução (Expo Go) |
| `@react-navigation/native`, `native-stack`, `bottom-tabs` | Navegação em pilhas e barra de abas |
| `react-native-screens`, `react-native-safe-area-context` | Telas nativas e áreas seguras |
| `@react-native-async-storage/async-storage` | Armazenamento local de conta, favoritos, rotas salvas e preferências |
| `expo-crypto` | Hash SHA-256 com salt das senhas |
| `expo-camera` | Leitura de QR Code das paradas |
| `expo-location` | Paradas próximas e acompanhamento de GPS na viagem ativa |
| `expo-notifications` | Notificação local do alerta de descida |
| `expo-haptics` | Vibração de feedback |
| `expo-speech` | Leitura em voz alta (parada e alerta de descida) |
| `expo-font`, `@expo-google-fonts/montserrat` | Fonte Montserrat |
| `@expo/vector-icons` | Ícones |
| `expo-constants` | Descoberta automática do IP do backend |
| `react-native-maps` | Mapa do traçado e dos veículos na tela da linha |
| `jest`, `jest-expo` | Testes unitários (`utils/qr.ts`) |
| `typescript` | Tipagem estática |

### Backend (`backend/`)

| Biblioteca | Para que é usada |
| :--- | :--- |
| `express` | Servidor HTTP e rotas da API |
| `cors` | Liberação de acesso do app à API |
| `better-sqlite3` | Índice do GTFS, relatos e snapshots do collector |
| `csv-parse` | Leitura em streaming dos arquivos do GTFS |
| `unzipper` | Leitura do zip do GTFS sem extrair em disco |
| `zod` | Validação de entrada das rotas |
| `tsx` | Execução do TypeScript direto, sem build |
| `typescript` | Tipagem estática e checagem (`npm run typecheck`) |

## 🌍 APIs externas

| API | Uso no S.B.P. | Chave? |
| :--- | :--- | :---: |
| [Olho Vivo (SPTrans)](https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/) | Posição de veículos e previsão de chegada em tempo real | Sim (gratuita, cadastro) |
| GTFS (SPTrans) | Paradas, linhas, horários programados e traçado | Não (download manual) |
| [Trilhos Agora](https://api.trilhosagora.com.br/v1/openapi.json) | Status das linhas de metrô/trem | Sim (gratuita, `X-API-Key`) |
| [OpenStreetMap Nominatim](https://nominatim.org) | Geocodificação de endereços (planejador de rotas) | Não |
| [Open-Meteo](https://open-meteo.com) | Previsão do tempo (aviso de chuva), chamada direto do app | Não |

## 🗺️ Próximas Etapas

- [ ] **Banco de dados e autenticação no backend:** hoje contas, favoritos e rotas salvas ficam só no aparelho (AsyncStorage); mover login para a API (JWT) e persistir em um banco (ex.: PostgreSQL) permitiria sincronizar entre aparelhos.
- [ ] **Build instalável (EAS Build):** gerar APK/IPA para instalar sem depender do Expo Go — hoje as notificações de alerta de descida não funcionam no Expo Go Android.
- [ ] **Integração oficial com ARTESP/Metrô/CCM:** trocar o Trilhos Agora (terceiro) por uma fonte oficial quando disponível, usando a mesma interface `RailStatusProvider`.
- [ ] **OpenTripPlanner:** trocar o planner builtin por OTP (`PLANNER=otp`) para rotas mais robustas e com `frequencies.txt` suportado nativamente.
- [ ] **Verificação do mapeamento GTFS ↔ Olho Vivo:** confirmar com um token real se `stop_id` e `codigoParada` coincidem (ver seção [Dados](#️-dados-sptrans-gtfs-e-metrôtrem)).
- [ ] **NFC/beacon nas paradas:** alternativa ao QR Code para localizar a parada.
- [ ] **Relatos moderados:** hoje qualquer relato aparece sem revisão; um limite de taxa por parada/dispositivo e moderação simples reduziriam spam.
- [ ] **Previsão própria:** usar o histórico do `collector` (quando `COLLECTOR=on`) para medir a acurácia da previsão da SPTrans e, no futuro, gerar uma previsão própria.

<a id="desenvolvido-por"></a>
## 👨‍💻 Desenvolvido Por

### L.A.N.E — FIAP | Engenharia de Software

Projeto acadêmico desenvolvido para a Global Solution - 2026 / 2 Semestre.

| [<img src="https://avatars.githubusercontent.com/u/101829188?v=4" width=115><br><sub>Alice Santos Bulhões</sub>](https://github.com/AliceSBulhoes) |  [<img src="https://avatars.githubusercontent.com/u/163866552?v=4" width=115><br><sub>Eduardo Oliveira Cardoso Madid</sub>](https://github.com/EduardoMadid) | [<img src="https://avatars.githubusercontent.com/u/153787379?v=4" width=115><br><sub>Nicolas Haubricht Hainfellner</sub>](https://github.com/NicolasHaubricht) |  [<img src="https://avatars.githubusercontent.com/u/160745486?v=4" width=115><br><sub>Guilherme Melo</sub>](https://github.com/gmelo21)
| :---: | :---: | :---: | :---: |
| RM:554499 | RM:556349  | RM:556259 | RM:555310

