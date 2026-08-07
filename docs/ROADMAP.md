# Roadmap de Refatoração — WMS Advanced Pro (Eurotec Nutrition)

## Contexto real do que existe hoje

O `index.html` atual é um app single-file (~1860 linhas): HTML + Tailwind via CDN +
JS vanilla no `<script>`, persistência em Firestore com fallback `localStorage`,
Chart.js, XLSX, jsPDF e leitor de QR Code (html5-qrcode). Tudo roda 100% no
navegador, sem backend, sem banco relacional, sem autenticação real.

O prompt que você trouxe pede a migração completa para React+TS/NestJS/Postgres/
Prisma/Redis/BullMQ com Clean Architecture, 10 módulos de domínio, engine de
FIFO/FEFO, multi-provider de NF-e, RBAC, auditoria completa etc.

**Isso não é uma refatoração — é reescrever o sistema do zero em outra stack,
com backend novo que hoje não existe.** É um projeto de várias semanas, não
uma tarefa de uma resposta. Para não te entregar um "monte de código" que
parece completo mas não roda, dividi em fases entregáveis e testáveis.
Claude Code (app de desenvolvimento) é o ambiente certo para tocar isso —
aqui no chat consigo te dar a arquitetura, o schema e os primeiros módulos
reais para você (ou uma sessão de Claude Code) continuar sem perder o fio.

## Fases

1. **Fundação (este pacote)** — monorepo, `docker-compose` (Postgres + Redis),
   schema Prisma completo com os 11 domínios e índices pedidos, módulo `nfe`
   com Strategy Pattern (XML local, Focus NFe, Nuvem Fiscal, Tecnospeed) já
   com as interfaces certas para os outros providers serem plugados sem tocar
   no core.
2. **Domínio de estoque** — `PalletEngine` (FIFO/FEFO, múltiplos lotes,
   validação GMP+), módulos `produto`, `lote`, `cliente`, `transportadora`.
3. **Etiquetas e rastreabilidade** — `LabelService` (100x150, 100x100, A4,
   QR Code), módulo `rastreabilidade`.
4. **Segurança e auditoria** — JWT + refresh token, RBAC (Administrador,
   Expedição, Qualidade, Consulta), `AuditService` (usuário/IP/data/ação/
   antes/depois).
5. **Frontend novo** — Vite + React + TS + Tailwind + Zustand + React Query,
   consumindo a API nova, com lazy loading e virtualização de tabelas —
   migrando tela por tela do `index.html` atual sem tirar nada do ar
   (o HTML atual continua funcionando até cada tela ser substituída).
6. **Performance e integrações externas** — Redis (cache de clientes/
   produtos/transportadoras/NF-e), BullMQ (filas), paginação server-side,
   e então os conectores SAP/TOTVS/Senior/Sankhya.

Cada fase é um projeto fechado que roda sozinho. Nada aqui apaga ou altera o
`index.html` atual — ele continua sendo seu sistema em produção até a Fase 5
substituir tela a tela.
