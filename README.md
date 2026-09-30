# TomaContexto — Guia Técnico & Defesa Arquitetural

> **Documento de Referência Pessoal e Preparação para Entrevistas Técnicas**  
> Este documento foi estruturado para guiar a explicação detalhada de cada decisão de design, padrões arquiteturais adotados, trade-offs técnicos e visão de evolução do projeto.

---

## 1. Visão Geral do Produto e Metodologia ($i+1$)

### O Problema
Aprender vocabulário em um novo idioma memorizando palavras isoladas é ineficiente e não fixa o contexto de uso real. 

### A Solução
O **TomaContexto** é um motor lexicográfico inteligente focado em **Sentence Mining** baseado na **Hipótese do Input Compreensível ($i+1$) de Stephen Krashen**:
- O aluno aprende melhor quando é exposto a sentenças onde ele já entende praticamente tudo ($i$), com exceção de um único elemento novo ($+1$).
- A aplicação fornece a palavra consultada com fonética internacional (IPA), traduções agrupadas por classe gramatical e **frases de exemplo curtas, naturais e com tradução contextualizada para o Português do Brasil**.

---

## 2. Decisões de Arquitetura (Clean Architecture)

### Por que Clean Architecture?
Em vez de colocar lógica de negócio dentro de controllers ou misturar regras com chamadas HTTP de terceiros, a solução foi dividida em 4 camadas desacopladas:

```
[ Domain ] ◄────── [ Application ] ◄────── [ Infrastructure ]
                         ▲
                         │
                  [ Presentation / Api ]
```

### Detalhamento das Camadas

1. **`TomaContexto.Domain`**:
   - **O que contém**: Entidades puras ([`Word`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Domain/Entities/Word.cs), [`WordTranslation`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Domain/Entities/WordTranslation.cs), [`WordSentence`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Domain/Entities/WordSentence.cs)).
   - **Racional**: Não possui dependência de nenhum framework externo, banco de dados ou biblioteca. Se amanhã o .NET mudar ou o provedor de IA for trocado, o núcleo do negócio não sofre impacto.
   - **Identificadores**: Uso de `Guid` para garantir geração descentralizada e compatibilidade distribuída.

2. **`TomaContexto.Application`**:
   - **O que contém**: Contratos de interfaces ([`IWordRepository`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Application/Interfaces/IWordRepository.cs), [`IGroqService`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Application/Interfaces/IGroqService.cs), [`IWordLookupService`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Application/Interfaces/IWordLookupService.cs)), DTOs imutáveis de resposta e regras de orquestração no [`WordLookupService`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Application/Services/WordLookupService.cs).
   - **Racional**: Princípio da Inversão de Dependência (DIP do SOLID). A aplicação define **o que precisa** através de interfaces; a infraestrutura decide **como implementar**.

3. **`TomaContexto.Infrastructure`**:
   - **O que contém**: Persistência de dados com **Neon Serverless PostgreSQL** via EF Core / Npgsql ([`TomaContextoDbContext`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Infrastructure/Persistence/TomaContextoDbContext.cs), [`PostgresWordRepository`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Infrastructure/Repositories/PostgresWordRepository.cs)), repositório volátil de testes ([`InMemoryWordRepository`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Infrastructure/Repositories/InMemoryWordRepository.cs)) e cliente de IA ([`GroqService`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Infrastructure/Services/GroqService.cs)).
   - **Racional**: O repositório PostgreSQL e o cliente Groq são detalhes de infraestrutura intercambiáveis sem tocar nas outras camadas. A aplicação aplica migrations automaticamente na inicialização.

4. **`TomaContexto.Api`**:
   - **O que contém**: Controllers REST ([`WordsController`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Api/Controllers/WordsController.cs)), Middlewares, documentação OpenAPI/Scalar e composição de Injeção de Dependência no `Program.cs`.

---

## 3. Padrão Cache-Aside com Fallback para IA

### Fluxo de Execução da Consulta

```
Consulta: GET /api/words/{term}
             │
             ▼
     WordLookupService
             │
             ├──► 1. Normaliza Termo (Trim + lowercase)
             │
             ├──► 2. Busca no Repositório Local (InMemoryWordRepository)
             │        │
             │        ├─► [ENCONTRADO - Cache Hit]
             │        │   Agrupa traduções por PartOfSpeech e retorna imediatamente (<= 2ms).
             │        │
             │        └─► [NÃO ENCONTRADO - Cache Miss]
             │            │
             │            ▼
             ├──► 3. Aciona o GroqService (LLM via HttpClient)
             │        │
             │        ├─► [SUCESSO]
             │        │   1. Desserializa o JSON estruturado do modelo.
             │        │   2. Converte para a entidade de Domínio (Word).
             │        │   3. Salva no Repositório (Cache Automático).
             │        │   4. Retorna o DTO ao usuário.
             │        │
             │        └─► [FALHA / SEM CHAVE]
             │            Degradação graciosa: loga aviso e retorna 404 RFC 9110.
```

### Pontos-Chave para Explicar em Entrevista:
- **Thread-Safety**: No repositório em memória utilizamos `ConcurrentDictionary<string, Word>` com operações atômicas (`AddOrUpdate`), evitando condições de corrida (*race conditions*) em requisições paralelas.
- **Normalização Preventiva**: Todas as chaves e consultas são sanitizadas via `term.Trim().ToLowerInvariant()`, garantindo que buscas como `"In Disbelief"` e `"in disbelief "` acessem a mesma chave no cache.
- **Otimização de Custos e Latência**: Graças ao salvamento em memória após a resposta da LLM, o mesmo termo **nunca é consultado duas vezes na API externa**.

---

## 4. Integração com IA (Groq LLM) e Saída Estruturada

### Por que Groq?
- O Groq utiliza processadores LPU (Language Processing Unit), entregando uma das menores latências de inferência do mercado (centenas de tokens por segundo), essencial para a experiência interativa de um usuário aprendendo idiomas.

### Por que Structured Output (`json_object`)?
Em vez de pedir respostas em texto livre ou Markdown que exigem regex frágil para extração, exigimos estritamente um schema JSON:
- No cabeçalho da requisição enviamos: `response_format: { "type": "json_object" }`.
- O System Prompt descreve com precisão a assinatura esperada com campos `term`, `phonetic`, `categories` e `sentences`.
- O payload é desserializado diretamente para o DTO tipado [`GroqWordResponse`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Application/DTOs/GroqWordResponse.cs).

### Resiliência e Degradação Graciosa:
- Se a chave da Groq não estiver configurada no ambiente ou no `appsettings`, a aplicação **não estoura exceção nem quebra**. Ela registra um log de aviso e retorna um `404 ProblemDetails` explicativo.

---

## 5. API RESTful & Boas Práticas

1. **Padronização de Erros (RFC 9110 - ProblemDetails)**:
   - Em vez de retornar strings avulsas como `"Erro"`, todos os erros seguem a especificação oficial de `ProblemDetails`:
     - `400 Bad Request`: Parâmetro vazio ou composto apenas de espaços.
     - `404 Not Found`: Palavra não encontrada ou sem resposta da IA.
     - `500 Internal Server Error`: Capturado pelo [`GlobalExceptionHandlerMiddleware`](file:///c:/Users/M138517/Documents/weslley/estudos/TomaContexto/src/TomaContexto.Api/Middlewares/GlobalExceptionHandlerMiddleware.cs) com rastreamento via `traceId`.

2. **Substituição do Swagger pelo Scalar**:
   - Adotado o **Scalar API Reference** (`Scalar.AspNetCore`) alimentado pelo gerador nativo de OpenAPI 3.1 do ASP.NET Core (`Microsoft.AspNetCore.OpenApi`).
   - **Vantagens**: Interface moderna, suporte nativo à especificação OpenAPI 3.1 mais recente, geração automática de exemplos em múltiplas linguagens e carregamento mais ágil.
   - Redirecionamento amigável configurado em `Program.cs` (`/` e `/swagger` redirecionam direto para `/scalar/v1`).

---

## 6. Estratégia de Testes Automatizados

Foram criados **21 testes unitários** com **xUnit** e **Shouldly**, executando em menos de 1 segundo:

| Área de Teste | O que valida |
|---|---|
| **Normalização** | Variações de caixa alta, baixa e espaços extras retornam o mesmo resultado. |
| **Agrupamento Gramatical** | Múltiplas traduções da mesma classe gramatical (ex: Substantivo) são agrupadas no mesmo grupo. |
| **Contrato de Repositório** | Validação de que `AddAsync` permite leitura imediata via `GetByTermAsync`. |
| **Cache & Fallback (Fakes)** | Validação de que no *Cache Hit* o Groq não é chamado (`CallCount == 0`) e que no *Cache Miss* o Groq é acionado e o dado é persistido para a próxima busca. |
| **Respostas do Controller** | Verificação dos códigos HTTP 200, 400 e 404 nos formatos esperados. |
| **Parsing HTTP do Groq** | Validação do desserializador e tratamento de erros quando a chave de API está ausente usando `HttpMessageHandler` mock. |

> **Por que Shouldly?**  
> Proporciona asserções legíveis (`result.ShouldNotBeNull()`, `callCount.ShouldBe(1)`) com mensagens de falha claras em caso de regressão.

---

## 7. Perguntas Comuns em Entrevistas & Respostas Prontas

### P: "Por que você usou Clean Architecture em vez de fazer Minimal APIs diretas?"
> *"Para este projeto, a separação em camadas foi fundamental para permitir a evolução progressiva sem quebrar contratos. Na Fase 1, trabalhamos exclusivamente com um repositório mock em memória. Na Fase 2, adicionamos a integração com IA. O fato de termos interfaces bem definidas (`IWordRepository`, `IGroqService`) permitiu plugar o Groq e o cache sem alterar as entidades de domínio ou o contrato exposto aos clientes da API. Isso garante testabilidade e manutenção facilitada."*

### P: "Como você levaria essa arquitetura para um ambiente de produção real?"
> *"A arquitetura atual já está pronta para isso:  
> 1. **Persistência Relacional**: Criaríamos um projeto `TomaContexto.Infrastructure.PostgreSql` implementando `IWordRepository` com EF Core / Npgsql. A camada Application e a Api continuariam intactas.  
> 2. **Cache Distribuído**: Para ambientes com múltiplas instâncias da API, substituiríamos o cache local por Redis (usando `IDistributedCache`).  
> 3. **Observabilidade**: Adicionaríamos OpenTelemetry para métricas de latência das chamadas ao Groq e logs estruturados no Serilog.  
> 4. **Resiliência de Rede**: Usaríamos Polly com políticas de Retry com Exponential Backoff e Circuit Breaker nas chamadas ao Groq."*

### P: "Como você garantiu a segurança da API Key da LLM?"
> *"A chave nunca fica hardcoded no código-fonte. Configuramos o suporte a variáveis de ambiente (`GROQ_API_KEY`) e .NET User Secrets para desenvolvimento local, além do `.gitignore` para bloquear arquivos de credenciais e caches de compilação."*

---

## 8. Como Executar o Projeto Localmente

```bash
# 1. Restaurar dependências e compilar
dotnet build

# 2. Rodar a suíte completa de testes unitários
dotnet test

# 3. Configurar a chave de API do Groq (opcional, para IA ativa)
dotnet user-secrets set --project src/TomaContexto.Api "Groq:ApiKey" "gsk_sua_chave"

# 4. Configurar a conexão do Neon PostgreSQL (opcional, usa In-Memory se omitido)
dotnet user-secrets set --project src/TomaContexto.Api "ConnectionStrings:DefaultConnection" "Host=ep-xxxx.neon.tech;Database=neondb;Username=neondb_owner;Password=xxxx;SSL Mode=Require;Trust Server Certificate=true;"

# 5. Iniciar a API (as migrations do PostgreSQL rodam automaticamente ao iniciar)
dotnet run --project src/TomaContexto.Api
```

Acesse a documentação interativa em: `http://localhost:5127/scalar/v1`
