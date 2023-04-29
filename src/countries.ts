export interface CountryData {
  url: URL;
  dataFileName: string;
  outputFileName: string;
}

const urlPrefix = "https://download.geonames.org/export/zip";

export const COUNTRIES: Map<string, Readonly<CountryData>> = new Map(
  [
    [
      "CA",
      {
        url: new URL(`${urlPrefix}/CA.zip`),
        dataFileName: "CA.txt",
        outputFileName: "CA3.txt",
      },
    ],
    [
      "CA6",
      {
        url: new URL(`${urlPrefix}/CA_full.csv.zip`),
        dataFileName: "CA_full.txt",
        outputFileName: "CA6.txt",
      },
    ],
    [
      "US",
      {
        url: new URL(`${urlPrefix}/US.zip`),
        dataFileName: "US.txt",
        outputFileName: "US.txt",
      },
    ],
  ],
);
