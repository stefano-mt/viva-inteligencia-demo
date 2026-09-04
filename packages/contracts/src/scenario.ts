import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

// Keep null first: Fastify's Ajv coercion otherwise turns JSON null into 0/""
// while evaluating the first union branch, changing a valid default scenario.
const NullableNumber = Type.Union([Type.Null(), Type.Number()]);
const NullableString = Type.Union([Type.Null(), Type.String()]);

export const ScenarioSchema = Type.Object(
  {
    version: Type.Literal(1),
    district_id: Type.String({ minLength: 1 }),
    scope_mode: Type.Union([
      Type.Literal("district"),
      Type.Literal("quadrant"),
      Type.Literal("radius"),
    ]),
    quadrant_id: NullableString,
    center_latitude: NullableNumber,
    center_longitude: NullableNumber,
    radius_meters: NullableNumber,
    typology: Type.String({ minLength: 1 }),
    bedrooms: Type.Union([Type.Literal("all"), Type.Integer({ minimum: 0 })]),
    target_area_m2: NullableNumber,
    target_price_pen: NullableNumber,
    delivery_year: Type.Union([Type.Literal("all"), Type.Integer()]),
    visualization: Type.Union([
      Type.Literal("geographic"),
      Type.Literal("positioning"),
    ]),
    source: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const ScenarioInputSchema = Type.Partial(ScenarioSchema, {
  additionalProperties: false,
});

export const ScenarioCorrectionSchema = Type.Object({
  code: Type.String(),
  field: Type.String(),
  recovery: Type.String(),
});

export type Scenario = Static<typeof ScenarioSchema>;
export type ScenarioInput = Static<typeof ScenarioInputSchema>;
export type ScenarioCorrection = Static<typeof ScenarioCorrectionSchema>;
