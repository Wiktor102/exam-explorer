import { Download, ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { Catalog, Exam } from "../../types/catalog";
import {
  developmentResourceUrl,
  resourceFileName,
  resourceUrl,
  solutionUrl,
} from "../../utils/catalog";

type ResourceMetadataProps = {
  catalog: Catalog;
  selectedExam: Exam;
};

export function ResourceMetadata({
  catalog,
  selectedExam,
}: ResourceMetadataProps) {
  return (
    <div className="metadata-grid metadata-grid-primary">
      <span>Zasoby</span>
      <strong
        className={clsx(selectedExam.assetFiles.length > 0 && "resource-links")}
      >
        {selectedExam.assetFiles.length > 0
          ? selectedExam.assetFiles.map((assetFile, index) => {
              const downloadName = resourceFileName(
                selectedExam,
                assetFile,
                index,
              );
              const sourceUrl = resourceUrl(
                catalog.sourceRepository,
                selectedExam,
                assetFile,
                catalog.sourceBranch,
              );

              return (
                <a
                  key={assetFile}
                  href={
                    import.meta.env.DEV
                      ? developmentResourceUrl(selectedExam, index)
                      : sourceUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  download={downloadName}
                >
                  <Download size={13} aria-hidden="true" />
                  {downloadName}
                </a>
              );
            })
          : "brak w katalogu"}
      </strong>
      <span>Rozwiązania</span>
      <strong>
        <a
          href={solutionUrl(
            catalog.sourceRepository,
            selectedExam.solutionFolder,
            catalog.sourceBranch,
          )}
          target="_blank"
          rel="noreferrer"
        >
          {selectedExam.solutionFolder ?? "repozytorium źródłowe"}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </strong>
    </div>
  );
}
