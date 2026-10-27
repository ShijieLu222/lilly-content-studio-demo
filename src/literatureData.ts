import { scriptCase } from "./literature/scriptCase";
import { h5Case } from "./literature/h5Case";
export { scriptCase, h5Case };
export const literatureCases = [scriptCase, h5Case];
export type {
  LiteratureCase,
  LiteratureSegment,
  EvidenceReference,
  EvidenceLink,
  EvidenceStatus,
} from "./literature/types";
