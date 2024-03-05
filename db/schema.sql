DROP DATABASE IF EXISTS translations;

CREATE DATABASE translations;

\c translations;

CREATE TABLE translations_tb (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  lang VARCHAR(10) NOT NULL,
  value TEXT NOT NULL
);