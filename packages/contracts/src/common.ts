import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const ContractVersionSchema = Type.Literal("2.4.0", {
  description: "Versión del contrato funcional preservado por la API.",
});

export const VersionedResponseSchema = Type.Object({
  datasetVersion: Type.String({ minLength: 1 }),
  contractVersion: ContractVersionSchema,
});

export const ApiErrorSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
  requestId: Type.String({ minLength: 1 }),
  details: Type.Array(Type.Unknown()),
});

export type ContractVersion = Static<typeof ContractVersionSchema>;
export type VersionedResponse = Static<typeof VersionedResponseSchema>;
export type ApiError = Static<typeof ApiErrorSchema>;
