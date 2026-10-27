type ResultProject = {
  stage: number;
  completed: number[];
  confirmedAssets?: string;
  revisionAssets?: string;
};

// Media availability is independent from workflow completion. A saved asset
// must never unlock a new project or a revision that has not been confirmed.
export function isResultReady({
  project,
  assetsLoaded,
  hasRequiredAssets,
  assetSignature,
}: {
  project?: ResultProject;
  assetsLoaded: boolean;
  hasRequiredAssets: boolean;
  assetSignature: string;
}): boolean {
  return Boolean(
    project &&
    assetsLoaded &&
    hasRequiredAssets &&
    assetSignature &&
    project.stage === 6 &&
    [0, 1, 2, 3, 4, 5, 6].every((step) => project.completed.includes(step)) &&
    !project.revisionAssets &&
    project.confirmedAssets === assetSignature,
  );
}
