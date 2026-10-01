# 🎯 TomaContexto (API)

> **Motor lexicográfico e minerador de sentenças (*sentence mining*) no método i+1 para aprendizado de inglês focado em falantes de português.**

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/C%23-13-239120?style=for-the-badge&logo=c-sharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Entity%20Framework%20Core-10.0-6C2D82?style=for-the-badge" alt="EF Core 10" />
  <img src="https://img.shields.io/badge/Groq%20Cloud-Gpt Oss%20120b-F55036?style=for-the-badge" alt="Groq API" />
  <img src="https://img.shields.io/badge/Scalar-OpenAPI-1E293B?style=for-the-badge" alt="Scalar Docs" />
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow?style=for-the-badge" alt="Status" />
</p>

---

## 🚧 Status do Projeto

> ⚠️ **Projeto em desenvolvimento ativo!**  
> A camada de API, domínio, persistência e integração com LLM já estão funcionais e cobertas por testes automatizados. Novas funcionalidades e a interface de usuário (Frontend) estão em construção.

---

## 💡 Sobre o Projeto

O **TomaContexto** foi concebido para resolver um dos maiores gargalos de quem aprende inglês: decorar listas de vocabulário isoladas sem contexto real.

Baseado na hipótese do **Input Compreensível (*i+1*) de Stephen Krashen**, o TomaContexto ajuda o estudante a minerar sentenças onde **"i"** é o conhecimento que ele já possui e **"+1"** é a nova palavra ou expressão idiomática inserida em uma estrutura natural e compreensível.

### Principais Funcionalidades:
- 🔍 **Consulta Lexicográfica Inteligente:** Retorna fonética (IPA), classificação gramatical (*Part of Speech*) e traduções diretas e concisas.
- 📖 **Sentence Mining (i+1):** Exemplos reais em inglês com traduções contextualizadas para português do Brasil.
- ⚡ **Cache em Dois Níveis:** Ao pesquisar uma palavra, o sistema verifica primeiro o banco de dados. Caso não exista, consulta o modelo LLM via Groq, sanitiza o conteúdo e salva automaticamente para futuras consultas instantâneas.
- 🧩 **Sentence Matching Cruzado:** Reutiliza sentenças de palavras já aprendidas para enriquecer o contexto de novos termos.
- 💾 **Modo In-Memory & Cloud:** Execução local sem dependência de banco de dados externo (fallback in-memory) ou com PostgreSQL gerenciado (Neon).

---

## 🛠️ Tecnologias Utilizadas

- **Plataforma & Linguagem:** [.NET 10](https://dotnet.microsoft.com/) e **C# 13**
- **Arquitetura:** Clean Architecture (Domain-Driven / Separação de responsabilidades em camadas)
- **Acesso a Dados & ORM:** [Entity Framework Core 10](https://learn.microsoft.com/ef/core/) com `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Banco de Dados:** [PostgreSQL Serverless (Neon)](https://neon.tech/) com fallback em memória (`InMemoryWordRepository`)
- **Inteligência Artificial & LLM:** [Groq Cloud API](https://groq.com/) utilizando modelos ultrarrápidos (como `openai/gpt-oss-120b`)
- **Documentação de API:** OpenAPI nativo do .NET 10 + [Scalar API Reference](https://scalar.com/)
- **Testes Automatizados:** [xUnit](https://xunit.net/) e [Shouldly](https://docs.shouldly.org/)

---

## 🏗️ Arquitetura da Solução

O projeto segue os princípios de separação de responsabilidades:

```text
TomaContexto/
├── src/
│   ├── TomaContexto.Domain/           # Entidades (Word, Sentence, WordTranslation) e regras centrais
│   ├── TomaContexto.Application/      # DTOs, Interfaces de serviço/repositório e casos de uso
│   ├── TomaContexto.Infrastructure/   # EF Core DbContext, Repositórios (Postgres e In-Memory), GroqService
│   └── TomaContexto.Api/              # Controllers, Middlewares, Program.cs e configurações
└── tests/
    └── TomaContexto.UnitTests/        # Testes unitários para Application, Controllers e Infrastructure
```

---

## 🚀 Como Executar

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/download) instalado.
- Chave de API da [Groq Cloud](https://console.groq.com/) *(gratuita)*.

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/TomaContexto.git
cd TomaContexto
```

### 2. Configurar Variáveis de Ambiente ou `appsettings`
No arquivo `src/TomaContexto.Api/appsettings.Development.json` (ou via variáveis de ambiente):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Groq": {
    "ApiKey": "SUA_CHAVE_GROQ_AQUI"
  }
}
```

> **Dica:** Se deixar `DefaultConnection` vazio (`""`), o sistema usará automaticamente o banco **in-memory**, ideal para testes locais rápidos sem precisar configurar um banco PostgreSQL!

### 3. Rodar a aplicação
```bash
dotnet run --project src/TomaContexto.Api --environment Development
```

### 4. Acessar a Documentação Interativa
Com a aplicação rodando, acesse no navegador:
- 📖 **Scalar API:** [http://localhost:5127/scalar/v1](http://localhost:5127/scalar/v1)

---

## 🧪 Executando os Testes

Para rodar a suíte de testes unitários:

```bash
dotnet test
```

---

## 🗺️ Roadmap de Desenvolvimento

- [x] Modelagem de Domínio e Entidades (Word, Sentence, Translations)
- [x] Camada de persistência PostgreSQL via EF Core com migrations
- [x] Modo de fallback In-Memory com seed data de exemplos
- [x] Integração com LLM via Groq API com saída JSON estrita
- [x] Sanitização automática de espaços insecáveis Unicode (\u202F, \u00A0)
- [x] Documentação interativa via Scalar OpenAPI
- [x] Cobertura de testes unitários com xUnit e Shouldly
- [ ] Interface Frontend (Web SPA / Mobile)
- [ ] Exportação de sentenças para Anki (`.apkg` / CSV)
- [ ] Sistema de autenticação e deck individual por usuário

---

## 📄 Licença

Este projeto é desenvolvido para fins de estudos e portfólio.
