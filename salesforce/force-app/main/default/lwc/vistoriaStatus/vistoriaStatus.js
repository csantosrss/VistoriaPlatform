import { LightningElement, api, wire } from "lwc";
import getVistoria from "@salesforce/apex/VistoriaApiService.getVistoria";

/**
 * Renderiza o status atual de uma Vistoria consultando a API NestJS.
 * @param {string} vistoriaId  ID externo (UUID) na plataforma Vistoria.
 */
export default class VistoriaStatus extends LightningElement {
  @api vistoriaId;

  @wire(getVistoria, { externalId: "$vistoriaId" })
  vistoria;

  get isLoading() {
    return !this.vistoria || (!this.vistoria.data && !this.vistoria.error);
  }

  get statusLabel() {
    return this.vistoria?.data?.status ?? "—";
  }

  get errorMessage() {
    return this.vistoria?.error?.body?.message ?? this.vistoria?.error?.message;
  }
}
