-- =====================================================================
--  Imtiyaz El Djazair — is the database complete?
-- =====================================================================
--
--  READ ONLY. This is a single SELECT: it cannot create, alter or delete
--  anything. Safe to run at any time, as often as you like.
--
--  Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
--  Every row should read present = true. Any row reading false is a table the
--  application expects and the database does not have.
-- =====================================================================

SELECT t.name AS "table",
       (to_regclass('public.' || quote_ident(t.name)) IS NOT NULL) AS "present"
FROM (VALUES
  ('AuditLog'),
  ('ContentVersion'),
  ('FaqItem'),
  ('Form'),
  ('FormSubmission'),
  ('GalleryItem'),
  ('LoginAttempt'),
  ('MediaAsset'),
  ('MenuItem'),
  ('Page'),
  ('Partner'),
  ('Popup'),
  ('Post'),
  ('Section'),
  ('Service'),
  ('Session'),
  ('SiteSetting'),
  ('Stat'),
  ('StoredFile'),
  ('Testimonial'),
  ('User'),
  ('VisitEvent')
) AS t(name)
ORDER BY "present", "table";

--  And the count, for a one-line answer:
SELECT count(*) FILTER (WHERE to_regclass('public.' || quote_ident(name)) IS NOT NULL) AS "present",
       count(*) AS "expected"
FROM (VALUES
  ('AuditLog'),
  ('ContentVersion'),
  ('FaqItem'),
  ('Form'),
  ('FormSubmission'),
  ('GalleryItem'),
  ('LoginAttempt'),
  ('MediaAsset'),
  ('MenuItem'),
  ('Page'),
  ('Partner'),
  ('Popup'),
  ('Post'),
  ('Section'),
  ('Service'),
  ('Session'),
  ('SiteSetting'),
  ('Stat'),
  ('StoredFile'),
  ('Testimonial'),
  ('User'),
  ('VisitEvent')
) AS t(name);
