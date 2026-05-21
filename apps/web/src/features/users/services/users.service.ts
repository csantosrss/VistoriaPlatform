import { apiClient } from "@/lib/api-client";
import {
  ListUsersResponseSchema,
  UserSchema,
  type CreateUserRequest,
  type ListUsersQuery,
  type ListUsersResponse,
  type UpdateUserRequest,
  type User,
} from "@vistoria/api-contracts";

export async function listUsers(
  query: Partial<ListUsersQuery> = {},
): Promise<ListUsersResponse> {
  const { data } = await apiClient.get("/api/v1/users", { params: query });
  return ListUsersResponseSchema.parse(data);
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get(`/api/v1/users/${id}`);
  return UserSchema.parse(data);
}

export async function createUser(input: CreateUserRequest): Promise<User> {
  const { data } = await apiClient.post("/api/v1/users", input);
  return UserSchema.parse(data);
}

export async function updateUser(
  id: string,
  input: UpdateUserRequest,
): Promise<User> {
  const { data } = await apiClient.patch(`/api/v1/users/${id}`, input);
  return UserSchema.parse(data);
}

export async function deactivateUser(id: string): Promise<User> {
  const { data } = await apiClient.delete(`/api/v1/users/${id}`);
  return UserSchema.parse(data);
}
