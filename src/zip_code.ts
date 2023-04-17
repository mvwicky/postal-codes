import { z } from "zod";

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
    (val) => val !== 0,
    { message: "latitude was zero" },
  ),
  longitude: z.string().transform((val) => Number(val)).refine(
    (val) => val !== 0,
    { message: "longitude was zero" },
  ),
  irs_estimated_population: z.string().transform((val) => Number(val)),
});

export type ZIPEntry = z.infer<typeof ZIPEntrySchema>;
