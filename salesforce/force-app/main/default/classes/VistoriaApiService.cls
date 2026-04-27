/**
 * Cliente Apex para a API NestJS Vistoria Platform.
 *
 * Autenticação via Named Credential "Vistoria_API" (configurar em Setup → Named Credentials).
 * Sprint 03 IN entrega o skeleton; endpoints reais virão com BE Sprint 03+.
 */
public with sharing class VistoriaApiService {

    /**
     * Consulta o status de uma vistoria pelo ID externo (UUID).
     * Cacheable para uso em @wire de LWC.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getVistoria(String externalId) {
        if (String.isBlank(externalId)) {
            throw new AuraHandledException('externalId é obrigatório');
        }
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Vistoria_API/api/v1/vistorias/' + EncodingUtil.urlEncode(externalId, 'UTF-8'));
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        req.setTimeout(10000);
        try {
            HttpResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                return (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            }
            throw new AuraHandledException('Vistoria API returned ' + res.getStatusCode() + ': ' + res.getBody());
        } catch (Exception e) {
            throw new AuraHandledException('Erro ao consultar Vistoria API: ' + e.getMessage());
        }
    }
}
