# Salesforce — Vistoria Platform

Projeto Salesforce DX. Owner: agente IN.

## Estrutura

```
salesforce/
├── sfdx-project.json
└── force-app/main/default/
    ├── lwc/
    │   └── vistoriaStatus/        Componente LWC que renderiza o status atual
    ├── classes/
    │   └── VistoriaApiService.cls Cliente Apex para a API NestJS (OAuth2 + named credential)
    └── namedCredentials/          (a ser provisionado pelo QI no sandbox)
```

## Sprint 03 (skeleton)

- LWC `vistoriaStatus` com props `recordId` e `vistoriaId`, busca status via Apex
- `VistoriaApiService.cls` com `getVistoria(externalId)` chamando `GET /api/v1/vistorias/:id`
- Autenticação via Named Credential `Vistoria_API` (a configurar no Setup)

## Pendências (próximos sprints)

- LWC para abrir solicitação de vistoria (formulário com endereço/contato)
- Apex Trigger em `Imovel__c` para criar vistoria automaticamente
- Tests Apex (cobertura mínima 75%)
- Pacote 2GP empacotado para deploy

## Deploy local

```bash
sf org login web --alias auxiliadora-sandbox
sf project deploy start --source-dir force-app --target-org auxiliadora-sandbox
```
