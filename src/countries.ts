export const ALLOWED_COUNTRIES = ["CA", "US"] as const;
export type Country = typeof ALLOWED_COUNTRIES[number];

export interface CountryData {
  url: URL;
  dataFileName: string;
}

export const COUNTRIES = new Map<Country, Readonly<CountryData>>([["CA", {
  url: new URL("https://download.geonames.org/export/zip/CA_full.csv.zip"),
  dataFileName: "CA_full.txt",
}], ["US", {
  url: new URL("https://download.geonames.org/export/zip/US.zip"),
  dataFileName: "US.txt",
}]]);
export const COUNTRIES_SET = new Set<Country>(ALLOWED_COUNTRIES);
export const COUNTRY_URLS = new Map<Country, URL>([
  ["CA", new URL("https://download.geonames.org/export/zip/CA_full.csv.zip")],
  ["US", new URL("https://download.geonames.org/export/zip/US.zip")],
]);
