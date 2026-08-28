-- =====================================================================
--  Imtiyaz El Djazair — bring a deployed database up to date, by hand
-- =====================================================================
--
--  WHEN YOU NEED THIS
--  A connection string marked "Sensitive" in Vercel cannot be read back,
--  not even by `vercel env pull`. When that is the case there is no way to
--  point `prisma migrate deploy` at the production database from a laptop.
--  This script does the same work from inside the provider's own SQL editor,
--  so the credentials never leave it.
--
--  HOW TO RUN IT
--  Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
--  WHAT IT DOES
--  Creates the StoredFile table and its index, then records both migrations
--  in Prisma's bookkeeping table so `prisma migrate deploy` agrees with
--  reality afterwards and applies nothing twice.
--
--  WHAT IT WILL NOT DO
--  There is no DROP, no TRUNCATE, no DELETE, no ALTER of an existing table
--  and no UPDATE of a row anywhere below. It only ever creates what is
--  missing. Running it twice changes nothing the second time.
--
--  The checksums are the SHA-256 of the migration files in this repository.
--  Prisma verifies them; wrong values would make it refuse to run later.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. The table the application is missing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "StoredFile" (
    "key"       TEXT         NOT NULL,
    "mimeType"  TEXT         NOT NULL,
    "size"      INTEGER      NOT NULL,
    "data"      BYTEA        NOT NULL,
    "isPrivate" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "StoredFile_isPrivate_idx" ON "StoredFile"("isPrivate");

-- ---------------------------------------------------------------------
-- 2. Prisma's own bookkeeping table, if this database never had one.
--    Column types match what `prisma migrate` creates, exactly.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                  VARCHAR(36)  NOT NULL,
    "checksum"            VARCHAR(64)  NOT NULL,
    "finished_at"         TIMESTAMPTZ,
    "migration_name"      VARCHAR(255) NOT NULL,
    "logs"                TEXT,
    "rolled_back_at"      TIMESTAMPTZ,
    "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------
-- 3. Record both migrations as applied — only if they are not already.
--
--    The first one describes the 21 tables this database already had; it is
--    recorded, never executed, which is what `prisma migrate resolve
--    --applied` would have done. The second is the table created above.
-- ---------------------------------------------------------------------
INSERT INTO "_prisma_migrations"
       ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
SELECT gen_random_uuid()::text,
       '73805d0285a58da5a45846143d5ed9611d8a1f1f361e39aa022851e30eb69662',
       '20260827000000_init',
       now(), now(), 1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260827000000_init'
);

INSERT INTO "_prisma_migrations"
       ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
SELECT gen_random_uuid()::text,
       'ce50de3f701c4003ef138abba79b0362a3fdcae75b9c474d5353407a6ecf816f',
       '20260828000000_add_stored_file',
       now(), now(), 1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260828000000_add_stored_file'
);

COMMIT;

-- ---------------------------------------------------------------------
-- 4. Proof. Both rows should read t / applied.
-- ---------------------------------------------------------------------
SELECT to_regclass('public."StoredFile"') IS NOT NULL AS "StoredFile exists";

SELECT "migration_name",
       ("finished_at" IS NOT NULL) AS "applied"
FROM "_prisma_migrations"
ORDER BY "migration_name";
