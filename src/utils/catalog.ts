import { sessionLabels } from "../constants/catalog";
import type { Exam } from "../types/catalog";

export function formatExamLabel(
  exam: Exam,
  showSeason = true,
  showVariant = true,
) {
  const session = sessionLabels[exam.month] ?? exam.session;
  const sheetNumber = String(Number(exam.number));
  return `${showSeason ? `${session} ` : ""}${exam.year} arkusz ${sheetNumber}${showVariant ? ` ${exam.variant.toLowerCase()}` : ""}`;
}

export function examFileName(exam: Exam) {
  return (
    exam.sourcePath?.split("/").at(-1) ??
    exam.pdf.split("/").at(-1) ??
    exam.code
  );
}

export function examSessionKey(exam: Exam) {
  return `${exam.session}-${exam.number}`;
}

export function formatPartNumber(part: number) {
  const romanNumerals: Record<number, string> = {
    1: "I",
    2: "II",
    3: "III",
  };

  return romanNumerals[part] ?? String(part);
}

export function solutionUrl(
  repository: string,
  folder: string | null,
  branch = "main",
) {
  if (!folder) {
    return repository;
  }

  return `${repository}/tree/${encodeURIComponent(branch)}/${folder.split("/").map(encodeURIComponent).join("/")}`;
}

export function repositoryFileUrl(
  repository: string,
  path: string,
  branch = "main",
) {
  return `${repository}/raw/${encodeURIComponent(branch)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function resourceFileName(
  exam: Exam,
  assetFile: string,
  index: number,
) {
  const extensionIndex = assetFile.lastIndexOf(".");
  const extension =
    extensionIndex >= 0 ? assetFile.slice(extensionIndex).toLowerCase() : "";
  const sequence = exam.assetFiles.length > 1 ? `-${index + 1}` : "";

  return `${exam.code}${sequence}${extension}`;
}

export function resourceUrl(
  repository: string,
  exam: Exam,
  assetFile: string,
  branch = "main",
) {
  const externalUrl = exam.assetUrls?.[assetFile];
  if (externalUrl) {
    return externalUrl;
  }

  const sourceDirectory =
    exam.sourcePath?.split("/").slice(0, -1).join("/") ?? "";
  return repositoryFileUrl(
    repository,
    sourceDirectory ? `${sourceDirectory}/${assetFile}` : assetFile,
    branch,
  );
}
