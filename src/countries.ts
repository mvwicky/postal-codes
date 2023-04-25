export interface CountryData {
  url: URL;
  dataFileName: string;
}

const urlPrefix = "https://download.geonames.org/export/zip";

export const COUNTRIES: Map<string, Readonly<CountryData>> = new Map(
  [
    [
      "CA",
      {
        url: new URL(`${urlPrefix}/CA_full.csv.zip`),
        dataFileName: "CA_full.txt",
      },
    ],
    [
      "US",
      {
        url: new URL(`${urlPrefix}/US.zip`),
        dataFileName: "US.txt",
      },
    ],
  ],
);
