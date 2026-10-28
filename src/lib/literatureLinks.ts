import type { EvidenceReference } from "../literature/types";

export function safeWebUrl(value?: string): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol)) return url.href;
  } catch {
    // Incomplete or non-web addresses must not become external links.
  }
}

export function referenceDoiUrl(reference: EvidenceReference) {
  return reference.doi && /^10\.\d{4,9}\/\S+$/i.test(reference.doi.trim())
    ? `https://doi.org/${encodeURI(reference.doi.trim())}`
    : undefined;
}

export function referencePmidUrl(reference: EvidenceReference) {
  return reference.pmid && /^\d+$/.test(reference.pmid)
    ? `https://pubmed.ncbi.nlm.nih.gov/${reference.pmid}/`
    : undefined;
}

export function referenceDestination(reference: EvidenceReference) {
  const url =
    safeWebUrl(reference.url) ||
    referenceDoiUrl(reference) ||
    referencePmidUrl(reference);
  if (url) return { url, isSearch: false, label: "查看文献" };
  // An unresolved bibliography gets an explicitly labelled search, never a
  // guessed paper URL or an assertion that its evidence has been verified.
  const query = [
    reference.title.startsWith("原图未列题名")
      ? ""
      : reference.title.replace(/\s*[·（].*$/, ""),
    reference.authors,
    reference.publication,
  ]
    .map((part) => part.replace(/（[^）]*）/g, ""))
    .join(" ");
  return {
    url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    isSearch: true,
    label: "检索文献（原文待定位）",
  };
}
