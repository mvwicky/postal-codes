DROP INDEX IF EXISTS geo_postal_code;
DROP TABLE IF EXISTS geo;

CREATE TABLE geo (
  id INTEGER PRIMARY KEY,
  country_code TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  place_name TEXT NOT NULL,
  admin_name_1 TEXT NOT NULL,
  admin_code_1 TEXT NOT NULL,
  admin_name_2 TEXT NOT NULL,
  admin_code_2 TEXT NOT NULL,
  admin_name_3 TEXT NOT NULL,
  admin_code_3 TEXT NOT NULL,
  latitude INTEGER NOT NULL,
  longitude INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  UNIQUE (country_code, postal_code)
);

CREATE INDEX geo_postal_code ON geo (postal_code);
