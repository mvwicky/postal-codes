# Postal Codes

Where I figure out postal code parsing.

## Data Sources

- [ODA](./data/ODA_QC_v1.zip): Quebec specific Canadian postal code data. (Huge
  and not super helpful.)
- [`zip_code_database.csv`](./data/zip_code_database.csv): US Zip Code Data
  (from [](https://www.unitedstateszipcodes.org/zip-code-database/))

### [geonames.org](https://download.geonames.org/export/zip/)

- [US](./data/US/US.txt)
- [CA](./data/CA/CA.txt)
    - Also [CA full](./data/CA_full.txt)
    - The CA.txt file contains entries for three character postal codes

#### Format

TSV files with the following fields:

- country code
- postal code
- place name
- admin name 1 (state)
- admin code 1
- admin name 2 (county/province)
- admin code 2
- admin name 3 (community)
- admin code 3
- latitude (estimated)
- longitude (estimated)
- accuracy
  - 1: estimated
  - 4: geonameid
  - 6: centroid of address or shape
