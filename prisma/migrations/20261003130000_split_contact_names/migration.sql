ALTER TABLE "Contact" ADD COLUMN "prenom" TEXT;

UPDATE "Contact"
SET
  "prenom" = split_part(trim("nom"), ' ', 1),
  "nom" = ltrim(substring(trim("nom") from position(' ' in trim("nom")) + 1))
WHERE position(' ' in trim("nom")) > 0;
