import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { splitCitationText } from "./literatureCitations";

export type LiteratureExportReference = {
  number: string;
  text: string;
  url: string;
};

export async function createLiteratureDocx(
  title: string,
  paragraphs: string[],
  references: LiteratureExportReference[],
): Promise<Blob> {
  const links = new Map(
    references.map((reference) => [reference.number, reference.url]),
  );
  const textRuns = (text: string) =>
    splitCitationText(text).flatMap((part): (TextRun | ExternalHyperlink)[] => {
      if (!part.numbers) return [new TextRun(part.text)];
      return [
        new TextRun({ text: "[", superScript: true, size: 17 }),
        ...part.numbers.flatMap((number, index) => {
          const run = new TextRun({
            text: number,
            superScript: true,
            size: 17,
          });
          const url = links.get(number);
          const citation = url
            ? new ExternalHyperlink({ link: url, children: [run] })
            : run;
          return index
            ? [
                new TextRun({ text: ",", superScript: true, size: 17 }),
                citation,
              ]
            : [citation];
        }),
        new TextRun({ text: "]", superScript: true, size: 17 }),
      ];
    });
  const document = new Document({
    creator: "Lilly Content Studio",
    title,
    styles: {
      default: {
        document: { run: { font: "微软雅黑", size: 24, color: "222222" } },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
          ...paragraphs.flatMap((paragraph) =>
            paragraph.split("\n").map(
              (line) =>
                new Paragraph({
                  children: textRuns(line),
                  spacing: { after: 160, line: 360 },
                }),
            ),
          ),
          ...(references.length
            ? [
                new Paragraph({
                  text: "参考文献",
                  heading: HeadingLevel.HEADING_1,
                }),
                ...references.map(
                  (reference) =>
                    new Paragraph({
                      children: [
                        new ExternalHyperlink({
                          link: reference.url,
                          children: [new TextRun(reference.text)],
                        }),
                      ],
                      spacing: { after: 160 },
                    }),
                ),
              ]
            : []),
        ],
      },
    ],
  });
  return Packer.toBlob(document);
}
