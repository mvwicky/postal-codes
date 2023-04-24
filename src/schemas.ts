import { z } from "../deps.ts";

export const GeoNameSchema = z.object({
  country_code: z.string(),
  postal_code: z.string(),
  place_name: z.string(),
  admin_name_1: z.string(),
  admin_code_1: z.string(),
  admin_name_2: z.string(),
  admin_code_2: z.string(),
  admin_name_3: z.string(),
  admin_code_3: z.string(),
  latitude: z.string().transform((val) => Number(val)),
  longitude: z.string().transform((val) => Number(val)),
  accuracy: z.string().transform((val) => Number(val)),
});

export const GEO_COLUMNS = [
  "country_code",
  "postal_code",
  "place_name",
  "admin_name_1",
  "admin_code_1",
  "admin_name_2",
  "admin_code_2",
  "admin_name_3",
  "admin_code_3",
  "latitude",
  "longitude",
  "accuracy",
] as const;

export type GeoName = z.infer<typeof GeoNameSchema>;
