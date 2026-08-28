-- =====================================================================
--  Imtiyaz El Djazair — create the missing tables
--  SiteSetting, FaqItem, MenuItem
-- =====================================================================
--
--  These three are declared by migration 20260827000000_init. That migration
--  was recorded as applied by `migrate resolve --applied`, which records
--  WITHOUT running the SQL — so the tables were never created while Prisma
--  believes they were. This creates them for real. It does not record or
--  re-record any migration, so nothing is masked.
--
--  Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
--  The statements below are copied verbatim from that migration, with
--  IF NOT EXISTS added. There is no DROP, TRUNCATE, DELETE or UPDATE here.
--  A table that already exists is left untouched, with its rows. Running this
--  twice changes nothing the second time.
-- =====================================================================

BEGIN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuItem" (
    "id" TEXT NOT NULL,
    "menuKey" TEXT NOT NULL DEFAULT 'header',
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MenuItem_menuKey_order_idx" ON "MenuItem"("menuKey", "order");

COMMIT;

-- ---------------------------------------------------------------------
--  Proof: all three should read true.
-- ---------------------------------------------------------------------
SELECT t.name AS "table", (to_regclass('public.' || quote_ident(t.name)) IS NOT NULL) AS "exists"
FROM (VALUES ('SiteSetting'), ('FaqItem'), ('MenuItem')) AS t(name)
ORDER BY 1;
