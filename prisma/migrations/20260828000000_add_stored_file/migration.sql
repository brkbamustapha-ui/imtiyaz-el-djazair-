-- CreateTable
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "StoredFile_isPrivate_idx" ON "StoredFile"("isPrivate");

