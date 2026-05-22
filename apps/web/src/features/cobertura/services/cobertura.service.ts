import { apiClient } from "@/lib/api-client";
import {
  ListCoberturasResponseSchema,
  VistoriadorCoberturaSchema,
  type CreateCoberturaRequest,
  type ListCoberturasResponse,
  type VistoriadorCobertura,
} from "@vistoria/api-contracts";

export async function listCoberturas(
  userId: string,
): Promise<ListCoberturasResponse> {
  const { data } = await apiClient.get(`/api/v1/users/${userId}/cobertura`);
  return ListCoberturasResponseSchema.parse(data);
}

export async function createCobertura(
  userId: string,
  input: CreateCoberturaRequest,
): Promise<VistoriadorCobertura> {
  const { data } = await apiClient.post(
    `/api/v1/users/${userId}/cobertura`,
    input,
  );
  return VistoriadorCoberturaSchema.parse(data);
}

export async function deleteCobertura(
  userId: string,
  coberturaId: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/users/${userId}/cobertura/${coberturaId}`);
}
