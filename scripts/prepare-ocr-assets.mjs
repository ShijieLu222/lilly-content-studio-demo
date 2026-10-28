import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const destination = fileURLToPath(
  new URL("../public/assets/ocr/", import.meta.url),
);
const packageDirectory = (name) =>
  dirname(require.resolve(`${name}/package.json`));

await Promise.all([
  mkdir(join(destination, "core"), { recursive: true }),
  mkdir(join(destination, "lang"), { recursive: true }),
]);

// Serve OCR runtime and language data from this app, including offline demos.
// Generated files are rebuilt from the versions pinned in package-lock.json.
const runtime = packageDirectory("tesseract.js");
const core = packageDirectory("tesseract.js-core");
const copies = [
  [join(runtime, "dist/worker.min.js"), join(destination, "worker.min.js")],
  [
    join(runtime, "dist/worker.min.js.LICENSE.txt"),
    join(destination, "worker.LICENSE.txt"),
  ],
  [join(core, "LICENSE"), join(destination, "core/LICENSE")],
];
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
  for (const extension of ["wasm.js", "wasm"]) {
    const name = `tesseract-core-${variant}.${extension}`;
    copies.push([join(core, name), join(destination, "core", name)]);
  }
}
for (const language of ["chi_sim", "eng"]) {
  copies.push([
    join(
      packageDirectory(`@tesseract.js-data/${language}`),
      "4.0.0_best_int",
      `${language}.traineddata.gz`,
    ),
    join(destination, "lang", `${language}.traineddata.gz`),
  ]);
}
await Promise.all(copies.map(([source, target]) => copyFile(source, target)));
console.log("Prepared local Chinese/English OCR assets.");
