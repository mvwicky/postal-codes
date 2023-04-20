import { z } from "../deps.ts";

export const ZIPEntrySchema = z.object({
  zip: z.string(),
  type: z.string(),
  decommissioned: z.string().transform((val) => val !== "0"),
  primary_city: z.string(),
  acceptable_cities: z.string().transform((val) => val.split(",")),
  unacceptable_cities: z.string().transform((val) => val.split(",")),
  state: z.string(),
  county: z.string(),
  timezone: z.string(),
  area_codes: z.string().transform((val) => val.split(",")),
  world_region: z.string(),
  country: z.string(),
  latitude: z.string().transform((val) => Number(val)).refine(
    (val) => !Number.isNaN(val),
    { message: "latitude was NaN" },
  ).refine(
    (val) => val !== 0,
    { message: "latitude was zero" },
  ),
  longitude: z.string().transform((val) => Number(val)).refine(
    (val) => !Number.isNaN(val),
    { message: "longitude was NaN" },
  ).refine(
    (val) => val !== 0,
    { message: "longitude was zero" },
  ),
  irs_estimated_population: z.string().transform((val) => Number(val)),
});

export type ZIPEntry = z.infer<typeof ZIPEntrySchema>;

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
