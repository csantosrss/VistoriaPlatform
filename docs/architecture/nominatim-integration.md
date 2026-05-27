# Integração com Nominatim (OpenStreetMap)

**Origem**: Sprint 34 QI — feature request do usuário para autocomplete
de bairros no `AddCoberturaForm` (IBGE não cobre bairros; documentado
em [`ibge-integration.md`](./ibge-integration.md)).

## API consumida

- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Documentação oficial**: <https://nominatim.org/release-docs/develop/api/Search/>
- **Autenticação**: nenhuma (mas exige `User-Agent` identificável — fair-use).
- **Rate limit**: 1 req/seg por IP. **Não fazer typeahead sem debounce.**

## Padrão de query usado

Para autocompletar bairros enquanto o usuário digita:

```
GET https://nominatim.openstreetmap.org/search
    ?q=<bairro_typed>,+<cidade>,+<uf>,+Brazil
    &format=jsonv2
    &addressdetails=1
    &limit=10
    &countrycodes=br
    &accept-language=pt-BR
```

### Filtros aplicados no FE

Da resposta `Array<NominatimPlace>`, o FE mantém apenas entradas com:

- `class === "place"` e `type` em `{ suburb, neighbourhood, quarter,
city_district, district }`; **ou**
- `address.suburb` / `address.neighbourhood` / `address.quarter`
  presentes (mesmo quando o `class/type` é outro tipo de POI).

O nome efetivo do bairro é extraído (em ordem):
`address.suburb` → `address.neighbourhood` → `address.quarter` →
`name` (fallback).

Deduplicação no FE: mesmo nome de bairro retornado várias vezes
(múltiplas geometrias) é colapsado em uma entrada única.

## UX

- **Debounce**: 350ms no input antes de disparar a query.
- **Cache**: Tanstack Query com chave
  `["nominatim", "bairros", uf, cidade, prefix]`. `staleTime` 1h.
- **Mínimo de caracteres**: 2 (`enabled` só dispara com
  `prefix.length >= 2`).
- **Fallback**: se a chamada falhar (rate-limit, network), o campo
  segue funcionando como input livre — sem bloquear submit.
- **Tipo de input**: `<input list="...">` com `<datalist>` populado
  dinamicamente, mesma UX do `cidade` (IBGE).

## Headers e identificação

`User-Agent: vistoria-platform/0.1 (admin@auxiliadorapredial.com.br)`
no header da request. Necessário para não cair em block.

## Riscos e mitigações

| Risco                                        | Mitigação                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Rate-limit (1 req/seg)                       | Debounce 350ms + cache Tanstack 1h por (uf, cidade, prefix). Sem typeahead "instantâneo". |
| Nominatim fora do ar / network bloqueado     | Fallback gracioso para input livre. UI não bloqueia.                                      |
| Resultados ruidosos (POIs em vez de bairros) | Filtro por `class=place`+`type∈{...}` ou `address.suburb/neighbourhood/quarter`.          |
| Cidade pequena sem bairros mapeados          | Datalist fica vazia; user digita livre (mesma UX de antes).                               |
| Cota global da OSM/Nominatim crescer demais  | Próximo passo (sprint futura) é hospedar Nominatim self-hosted ou usar proxy/cache no BE. |

## Alternativas descartadas

- **OSM Overpass API** — query mais poderosa (lista exaustiva de
  bairros de uma cidade), mas latência alta (3–10s por query) e
  sintaxe complexa. Reaberta se o typeahead via Nominatim mostrar
  lacunas.
- **ViaCEP** — retorna o bairro de **um CEP específico**, não
  lista. Não serve para typeahead "comece a digitar e veja sugestões".
- **Google Places API** — pago. Fora do escopo.
- **Hard-code de bairros das cidades-alvo** — manutenção contínua,
  não escala.

## Alinhamento com IBGE

`apps/web` já consome IBGE para UFs (cache localStorage) e cidades
(Tanstack staleTime 24h). Nominatim entra como **terceira fonte
externa pública**, com o mesmo padrão (cliente HTTP simples em
`apps/web/src/lib/`, hooks de query, fallback gracioso).

Decisão arquitetural registrada em ADR (Sprint 36 DOC) — paralela
à decisão IBGE.

## Bairros vs cobertura no DB

Importante: o autocomplete **não** altera o schema do BE. O campo
`VistoriadorCobertura.bairro` continua `String?` livre. O Nominatim
só ajuda o usuário a digitar; a string que vai pro BE é a que o user
selecionou (ou digitou livre se não escolheu da lista).

Implicação: **bairros normalizados pelo Nominatim** podem casar com
endereços de vistoria normalizados via outra fonte. Para routing
futuro que cruze `Vistoria.enderecoBairro` (livre digitação) com
`VistoriadorCobertura.bairro` (livre + sugestão Nominatim), aplicar
`LOWER + unaccent` em ambos os lados — mesmo plano herdado do IBGE
para `cidade`.
