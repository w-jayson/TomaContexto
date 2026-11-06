# 🎯 TomaSeuContexto

> **Motor lexicográfico e plataforma full-stack de mineração de sentenças (*sentence mining*) no método i+1 para aprendizado de inglês focado em falantes de português.**

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/C%23-13-239120?style=for-the-badge&logo=c-sharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/Expo-58-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo 58" />
  <img src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Groq%20Cloud-LLM-F55036?style=for-the-badge" alt="Groq API" />
  <img src="https://img.shields.io/badge/Docker-Caddy-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker & Caddy" />
</p>

<p align="center">
  <a href="https://tomaseucontexto.com" target="_blank">
    <img src="https://img.shields.io/badge/🌐%20Acesse%20o%20Sistema-tomaseucontexto.com-10B981?style=for-the-badge" alt="Acesse tomaseucontexto.com" />
  </a>
</p>

> 🔗 **Aplicação em Produção:** [**tomaseucontexto.com**](https://tomaseucontexto.com)

---

## 💡 Sobre o Projeto

O **TomaSeuContexto** foi concebido para resolver um dos maiores gargalos de quem aprende inglês: decorar listas de vocabulário isoladas sem contexto real.

Baseado na hipótese do **Input Compreensível (*i+1*) de Stephen Krashen**, o TomaSeuContexto ajuda o estudante a minerar sentenças onde **"i"** é o conhecimento que ele já possui e **"+1"** é a nova palavra ou expressão idiomática inserida em uma estrutura natural e compreensível.

### ✨ Principais Funcionalidades

- 🔍 **Consulta Lexicográfica Inteligente:** Retorna fonética (IPA), classificação gramatical (*Part of Speech*) e traduções diretas agrupadas por classe gramatical.
- 📖 **Sentence Mining (i+1):** Exemplos reais em inglês com traduções contextualizadas para o português do Brasil e destaque visual do termo buscado.
- 🔊 **Pronúncia em Áudio (TTS):** Reprodução de áudio para palavras e frases utilizando a síntese de voz nativa do navegador/dispositivo (`expo-speech` / Web Speech API), já contando com arquitetura híbrida e integração pronta (com cache em disco) para ativação futura do **Google Cloud Text-to-Speech (Neural2)**.
- ✨ **Autocomplete e Correção Ortográfica (*"Você quis dizer..."*):** Sugestões em tempo real durante a digitação e recomendação automática de grafia correta via distância de Levenshtein caso o termo buscado não seja encontrado.
- ⚡ **Cache em Dois Níveis & Sentence Matching Cruzado:** Ao pesquisar uma palavra, o sistema verifica primeiro o banco de dados; caso não exista, reaproveita sentenças já existentes no banco que contenham o termo, consulta o LLM via Groq, sanitiza o conteúdo e persiste tudo para consultas futuras instantâneas.
- 📱 **Interface Multiplataforma Responsiva (Web & Mobile):** Construída com Expo / React Native Web, adaptando-se automaticamente entre layouts mobile/tablet (empilhado) e desktop (duas colunas), com suporte a **Modo Claro/Escuro** e histórico local de buscas recentes.
- 🛡️ **Segurança e Resiliência:** Rate limiting por IP (`FixedWindowLimiter`), validação de tamanho de entrada, rejeição de substituições silenciosas da LLM e tratamento padronizado de erros (`ProblemDetails`).

---

## 🛠️ Tecnologias Utilizadas

### Backend (`src/`)
- **Plataforma & Linguagem:** [.NET 10](https://dotnet.microsoft.com/) e **C# 13**
- **Arquitetura:** Clean Architecture (Domain, Application, Infrastructure e API)
- **Acesso a Dados & ORM:** [Entity Framework Core 10](https://learn.microsoft.com/ef/core/) com `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Banco de Dados:** [PostgreSQL 16](https://www.postgresql.org/) (Container/VPS ou Serverless via Neon) com fallback em memória (`InMemoryWordRepository`)
- **Inteligência Artificial & LLM:** [Groq Cloud API](https://groq.com/) (`openai/gpt-oss-120b`) com saída JSON estruturada
- **Síntese de Voz (TTS):** Atualmente operando via síntese nativa do navegador/dispositivo no cliente, com suporte de backend já preparado para [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech) (Neural2 + cache em disco)
- **Documentação da API:** OpenAPI nativo do .NET 10 + [Scalar API Reference](https://scalar.com/)
- **Testes Automatizados:** [xUnit](https://xunit.net/) e [Shouldly](https://docs.shouldly.org/)

### Frontend (`mobile/`)
- **Framework:** [Expo SDK 58](https://expo.dev/), [React Native 0.88](https://reactnative.dev/), [React 19](https://react.dev/) e [React Native Web](https://necolas.github.io/react-native-web/)
- **Linguagem:** TypeScript 6
- **Áudio & Persistência Local:** `expo-av`, `expo-speech` e `@react-native-async-storage/async-storage`

### Infraestrutura & Deploy
- **Containerização:** Docker & Docker Compose
- **Servidor Web & Proxy Reverso:** [Caddy 2](https://caddyserver.com/) (servindo o bundle estático do Expo Web, realizando proxy reverso para a API e provendo HTTPS automático via Let's Encrypt)

---

## 🏗️ Arquitetura da Solução

```text
TomaSeuContexto/
├── src/
│   ├── TomaSeuContexto.Domain/           # Entidades (Word, Sentence, WordTranslation)
│   ├── TomaSeuContexto.Application/      # DTOs, Interfaces, WordLookupService e configurações
│   ├── TomaSeuContexto.Infrastructure/   # EF Core DbContext, Migrations, Repositórios, GroqService e GoogleTtsService
│   └── TomaSeuContexto.Api/              # Controllers (Words, Audio), Middlewares, Rate Limiting e Program.cs
├── mobile/                               # Aplicação Universal (Web, Android e iOS) em Expo / React Native
│   ├── src/
│   │   ├── api/                          # Cliente HTTP e descoberta de endpoint
│   │   ├── components/                   # Header, SearchBar, WordCard, SentenceCard, EmptyState
│   │   ├── theme/                        # Paleta de cores e ThemeContext (Light/Dark Mode)
│   │   ├── types/                        # Contratos TypeScript (DTOs)
│   │   └── utils/                        # Reprodutor de áudio híbrido, AsyncStorage e hooks responsivos
│   └── App.tsx                           # Componente raiz e orquestração de layout responsivo
├── tests/
│   └── TomaSeuContexto.UnitTests/        # Testes unitários (Application, Controllers e Infrastructure)
├── Dockerfile                            # Build multi-stage da API .NET 10
├── Caddyfile                             # Configuração do proxy reverso e servidor estático
└── docker-compose.yml                    # Orquestração completa (Postgres + API + Web/Caddy)
```

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/words/{term}` | Busca fonética, traduções por classe gramatical e sentenças `i+1` (protegido por Rate Limit). |
| `GET` | `/api/words/suggestions?q={query}` | Retorna até 6 sugestões de autocompletar ou correção ortográfica do vocabulário local. |
| `GET` | `/api/audio/synthesize?text={text}&type={word\|sentence}` | Endpoint preparado para síntese e cache local de áudio MP3 via Google Neural2 TTS (quando a chave estiver configurada). |
| `GET` | `/health` | Healthcheck da aplicação. |
| `GET` | `/scalar/v1` | Documentação interativa OpenAPI via Scalar. |

---

## 🚀 Como Executar Localmente (Desenvolvimento)

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- Chave de API da [Groq Cloud](https://console.groq.com/) *(gratuita)*
- *(Opcional)* Chave de API do **Google Cloud Text-to-Speech**

### 1. Clonar o repositório
```bash
git clone https://github.com/w-jayson/TomaSeuContexto.git
cd TomaSeuContexto
```

### 2. Configurar e rodar a API (.NET 10)
Configure sua chave da Groq em `src/TomaSeuContexto.Api/appsettings.Development.json` (ou crie um arquivo `src/TomaSeuContexto.Api/appsettings.local.json`, que é ignorado pelo Git):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Groq": {
    "ApiKey": "gsk_sua_chave_groq_aqui"
  },
  "GoogleTts": {
    "ApiKey": ""
  }
}
```

> 💡 **Dica:** Se `DefaultConnection` estiver vazio (`""`), a API utilizará automaticamente o repositório **in-memory** com dados iniciais (*seed data*), sem necessidade de instalar o PostgreSQL localmente. Se `GoogleTts:ApiKey` estiver vazio, o frontend utilizará automaticamente a síntese de voz nativa do navegador/dispositivo.

Inicie a API:
```bash
dotnet run --project src/TomaSeuContexto.Api --environment Development
```
- A API estará disponível em `http://localhost:5127`
- Documentação interativa Scalar: `http://localhost:5127/scalar/v1`

### 3. Configurar e rodar o Frontend (Expo Web / Mobile)
Em outro terminal, acesse a pasta `mobile`:

```bash
cd mobile
npm install
npm run web
```
- Para abrir no Android/iOS com Expo Go: `npm start`

---

## 🐳 Deploy com Docker Compose (Produção / VPS)

O projeto conta com orquestração pronta para produção contendo **PostgreSQL 16**, **API .NET 10** e **Expo Web + Caddy** (com suporte a HTTPS automático).

1. Copie o arquivo de variáveis de ambiente de exemplo:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` preenchendo `POSTGRES_PASSWORD`, `GROQ_API_KEY`, `GOOGLE_TTS_API_KEY` (opcional) e `SITE_ADDRESS` (`:80` para IP direto ou `seudominio.com.br` para HTTPS automático).

3. Suba os containers:
```bash
docker compose up -d --build
```

---

## 🧪 Executando os Testes

Para rodar a suíte de testes unitários do backend:

```bash
dotnet test
```

---

## 🗺️ Roadmap de Desenvolvimento

- [x] Modelagem de Domínio e Entidades (`Word`, `Sentence`, `WordTranslation`)
- [x] Persistência PostgreSQL via EF Core 10 com migrations automáticas
- [x] Modo de fallback In-Memory com *seed data* de exemplos
- [x] Integração com LLM via Groq API com saída JSON estrita e sanitização Unicode
- [x] Documentação interativa via Scalar OpenAPI
- [x] Cobertura de testes unitários com xUnit e Shouldly
- [x] Interface Frontend Responsiva (Web & Mobile) com Expo / React Native e tema Claro/Escuro
- [x] Busca com Autocomplete e correção ortográfica (*"Você quis dizer..."*)
- [x] Pronúncia em áudio via voz nativa do navegador/dispositivo e estrutura pronta para Google Cloud Neural2 TTS com cache em disco
- [x] Rate Limiting por IP e limites de segurança na API
- [x] Configuração de Deploy em VPS com Docker Compose e Caddy Reverse Proxy
- [ ] Ativação da síntese neural em nuvem (Google Cloud TTS Neural2) em produção

---

## 📄 Licença

Este projeto é desenvolvido para fins de estudos e portfólio.
