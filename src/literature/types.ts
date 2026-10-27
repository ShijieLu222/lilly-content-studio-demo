export type EvidenceStatus = "supported" | "partial" | "pending" | "not-needed";

export interface EvidenceReference {
  id: string;
  label?: string;
  title: string;
  authors: string;
  publication: string;
  year?: number;
  doi?: string;
  pmid?: string;
  url?: string;
  verified: boolean;
  verificationNote: string;
  scope: string;
  retrievedAt?: string;
  verificationLevel?: "full-text" | "abstract" | "official-document";
  checkedSections?: string[];
  localUrl?: string;
}

export interface EvidenceLink {
  claim?: string;
  referenceId: string;
  locator: string;
  support: string;
  boundary: string;
}

export interface LiteratureSegment {
  id: string;
  sourceNumber: string;
  title: string;
  original: string;
  revised: string;
  reason: string;
  status: EvidenceStatus;
  claims: string[];
  keywords: string[];
  evidence: EvidenceLink[];
  duration?: string;
  visual?: string;
  caption?: string;
  imageId?: string;
  region?: { x: number; y: number; width: number; height: number };
}

export interface LiteratureCase {
  id: string;
  kind: "script" | "h5";
  title: string;
  subtitle: string;
  source: string;
  sourceFile?: string;
  sourceNote: string;
  version: string;
  segments: LiteratureSegment[];
  references: EvidenceReference[];
  images?: { id: string; src: string; label: string }[];
  research?: {
    performedAt: string;
    summary: string;
    bibliographyUrl?: string;
    queries: { query: string; source: string; referenceIds: string[] }[];
    limitations: string[];
  };
}
