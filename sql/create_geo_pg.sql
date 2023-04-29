DROP SCHEMA IF EXISTS postal_codes CASCADE;

CREATE SCHEMA postal_codes;

CREATE TABLE postal_codes.geo (
  id serial NOT NULL PRIMARY KEY,
  country_code varchar(2) NOT NULL,
  postal_code varchar(20) NOT NULL,
  place_name varchar(180) NOT NULL,
  admin_name_1 varchar(100) NOT NULL,
  admin_code_1 varchar(20) NOT NULL,
  admin_name_2 varchar(100) NOT NULL,
  admin_code_2 varchar(20) NOT NULL,
  admin_name_3 varchar(100) NOT NULL,
  admin_code_3 varchar(20) NOT NULL,
  latitude numeric(15, 5) NOT NULL,
  longitude numeric(15, 5) NOT NULL,
  accuracy smallint NOT NULL,
  CONSTRAINT unique_cc_postal_code (country_code, postal_code)
);

CREATE INDEX geo_postal_code ON postal_codes.geo (postal_code);

CREATE INDEX geo_cc_postal_code ON postal_codes.geo (country_code, postal_code);

