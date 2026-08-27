type JsonLdValue = Record<string, unknown>;

/**
 * Schema.org data. Serialised with `<` escaped so a stray character in
 * CMS-authored text can never break out of the script tag.
 */
export function JsonLd({ data }: { data: JsonLdValue | JsonLdValue[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
