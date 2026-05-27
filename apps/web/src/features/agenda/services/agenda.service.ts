import { apiClient } from "@/lib/api-client";
import {
  AgendaSlotSchema,
  BulkOpResponseSchema,
  ListAgendaSlotsResponseSchema,
  type AgendaSlot,
  type BulkBlockRequest,
  type BulkDeleteRequest,
  type BulkOpResponse,
  type BulkUpdateRequest,
  type CreateAgendaSlotsRequest,
  type ListAgendaSlotsQuery,
  type ListAgendaSlotsResponse,
  type UpdateAgendaSlotRequest,
} from "@vistoria/api-contracts";

export async function listAgendaSlots(
  vistoriadorId: string,
  query: Partial<ListAgendaSlotsQuery> = {},
): Promise<ListAgendaSlotsResponse> {
  const { data } = await apiClient.get(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda`,
    { params: query },
  );
  return ListAgendaSlotsResponseSchema.parse(data);
}

export async function createAgendaSlots(
  vistoriadorId: string,
  input: CreateAgendaSlotsRequest,
): Promise<ListAgendaSlotsResponse> {
  const { data } = await apiClient.post(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda`,
    input,
  );
  return ListAgendaSlotsResponseSchema.parse(data);
}

export async function updateAgendaSlot(
  vistoriadorId: string,
  slotId: string,
  input: UpdateAgendaSlotRequest,
): Promise<AgendaSlot> {
  const { data } = await apiClient.patch(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda/${slotId}`,
    input,
  );
  return AgendaSlotSchema.parse(data);
}

export async function deleteAgendaSlot(
  vistoriadorId: string,
  slotId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda/${slotId}`,
  );
}

/** Sprint 27 BE: substitui N PATCHes paralelos por uma única request em
 * transação. Bloqueia todos os slots livres no intervalo. */
export async function bulkBlockAgenda(
  vistoriadorId: string,
  input: BulkBlockRequest,
): Promise<BulkOpResponse> {
  const { data } = await apiClient.post(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda:bulk-block`,
    input,
  );
  return BulkOpResponseSchema.parse(data);
}

export async function bulkUpdateAgenda(
  vistoriadorId: string,
  input: BulkUpdateRequest,
): Promise<BulkOpResponse> {
  const { data } = await apiClient.post(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda:bulk-update`,
    input,
  );
  return BulkOpResponseSchema.parse(data);
}

export async function bulkDeleteAgenda(
  vistoriadorId: string,
  input: BulkDeleteRequest,
): Promise<BulkOpResponse> {
  const { data } = await apiClient.delete(
    `/api/v1/vistoriadores/${vistoriadorId}/agenda:bulk-delete`,
    { data: input },
  );
  return BulkOpResponseSchema.parse(data);
}
