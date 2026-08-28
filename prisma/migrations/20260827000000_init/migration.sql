-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "showInNav" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seoJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "draftJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "alt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'PARTNER',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "program" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NEWS',
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'News',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "eventDate" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT '',
    "seoJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'book',
    "href" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '+',
    "icon" TEXT NOT NULL DEFAULT 'star',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "album" TEXT NOT NULL DEFAULT 'Campus',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "successMessage" TEXT NOT NULL DEFAULT 'Thank you! We will get back to you shortly.',
    "notifyEmail" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaHref" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "frequency" TEXT NOT NULL DEFAULT 'ONCE',
    "delayMs" INTEGER NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
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

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "snapshotJson" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT '',
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Section_pageId_order_idx" ON "Section"("pageId", "order");

-- CreateIndex
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "Partner_order_idx" ON "Partner"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_type_isPublished_publishedAt_idx" ON "Post"("type", "isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_createdAt_idx" ON "FormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "MenuItem_menuKey_order_idx" ON "MenuItem"("menuKey", "order");

-- CreateIndex
CREATE INDEX "ContentVersion_entityType_entityId_createdAt_idx" ON "ContentVersion"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_createdAt_idx" ON "VisitEvent"("createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_visitorKey_idx" ON "VisitEvent"("visitorKey");

-- CreateIndex
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

