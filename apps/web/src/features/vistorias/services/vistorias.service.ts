import { apiClient } from "@/lib/api-client";
import {
  ListVistoriasResponseSchema,
  VistoriaSchema,
  type CancelVistoriaRequest,
  type CreateVistoriaRequest,
  type ListVistoriasQuery,
  type ListVistoriasResponse,
  type Vistoria,
} from "@vistoria/api-contracts";

export async function listVistorias(
  query: Partial<ListVistoriasQuery> = {},
): Promise<ListVistoriasResponse> {
  const { data } = await apiClient.get("/api/v1/vistorias", { params: query });
  return ListVistoriasResponseSchema.parse(data);
}

export async function getVistoria(id: string): Promise<Vistoria> {
  const { data } = await apiClient.get(`/api/v1/vistorias/${id}`);
  return VistoriaSchema.parse(data);
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
