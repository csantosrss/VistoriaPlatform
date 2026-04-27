# Architecture

Diagramas e specs vivos do projeto. Mantidos pelo agente DOC. Use Mermaid sempre que possível para que o GitHub renderize inline.

## Diagramas Pendentes
- [ ] C4 Context (sistema + atores externos: clientes, parceiros, Salesforce)
- [ ] C4 Container (apps/api, apps/web, RabbitMQ, Postgres, Redis, parceiros)
- [ ] SAGA state machine (9 estados de Vistoria)
- [ ] Fluxo de webhook (parceiro → API → Salesforce)
- [ ] Sequência de autenticação JWT RS256
- [ ] ERD do banco

## Convenções
- Todo diagrama referenciado por um ADR deve estar versionado aqui
- Preferir Mermaid; PNG/SVG apenas quando o Mermaid não der conta
- Nomear arquivos com kebab-case e prefixo do tipo: `c4-context.md`, `saga-vistoria.md`, `erd.md`

## Como adicionar um diagrama
1. Crie o arquivo `.md` aqui
2. Cite-o no ADR ou changelog que o motivou
3. Se substituir um diagrama anterior, marque o antigo como "Superseded by ..."
