import { apiClient } from "@/lib/api-client";
import {
  ListVistoriaTransicoesResponseSchema,
  ListVistoriasResponseSchema,
  VistoriaSchema,
  VistoriaStatsResponseSchema,
  type CancelVistoriaRequest,
  type CreateVistoriaRequest,
  type ListVistoriaTransicoesResponse,
  type ListVistoriasQuery,
  type ListVistoriasResponse,
  type Vistoria,
  type VistoriaStatsResponse,
} from "@vistoria/api-contracts";

export async function listVistorias(
  query: Partial<ListVistoriasQuery> = {},
): Promise<ListVistoriasResponse> {
  const { data } = await apiClient.get("/api/v1/vistorias", { params: query });
  return ListVistoriasResponseSchema.parse(data);
}

export async function getVistoriasStats(): Promise<VistoriaStatsResponse> {
  const { data } = await apiClient.get("/api/v1/vistorias/stats");
  return VistoriaStatsResponseSchema.parse(data);
}

export async function getVistoria(id: string): Promise<Vistoria> {
  const { data } = await apiClient.get(`/api/v1/vistorias/${id}`);
  return VistoriaSchema.parse(data);
}

export async function getVistoriaTransicoes(
  id: string,
): Promise<ListVistoriaTransicoesResponse> {
  const { data } = await apiClient.get(`/api/v1/vistorias/${id}/transicoes`);
  return ListVistoriaTransicoesResponseSchema.parse(data);
}

export async function createVistoria(
  input: CreateVistoriaRequest,
): Promise<Vistoria> {
  const { data } = await apiClient.post("/api/v1/vistorias", input);
  return VistoriaSchema.parse(data);
}

export async function cancelVistoria(
  id: string,
  input: CancelVistoriaRequest,
): Promise<Vistoria> {
  const { data } = await apiClient.post(
    `/api/v1/vistorias/${id}/cancelar`,
    input,
  );
  return VistoriaSchema.parse(data);
}
