export interface CountryParams {
  /** Where to fetch the data. */
  url: URL;
  /** The name of the data file within the zip file. */
  dataFileName: string;
  /** The name of the data file when written to disk locally. */
  outputFileName: string;
}

const urlPrefix = "https://download.geonames.org/export/zip/";

const COUNTRIES: Map<string, Readonly<CountryParams>> = new Map(
  [
    [
      "CA",
      {
        url: new URL("CA.zip", urlPrefix),
        dataFileName: "CA.txt",
        outputFileName: "CA3.txt",
      },
    ],
    [
      "CA6",
      {
        url: new URL("CA_full.csv.zip", urlPrefix),
        dataFileName: "CA_full.txt",
        outputFileName: "CA6.txt",
      },
    ],
    [
      "US",
      {
        url: new URL("US.zip", urlPrefix),
        dataFileName: "US.txt",
        outputFileName: "US.txt",
      },
    ],
  ],
);

export { COUNTRIES };
