import { Download, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import type { Catalog, Exam } from '../../types/catalog'
import { resourceUrl, solutionUrl } from '../../utils/catalog'

type ResourceMetadataProps = {
  catalog: Catalog
  selectedExam: Exam
}

export function ResourceMetadata({ catalog, selectedExam }: ResourceMetadataProps) {
  return (
    <div className="metadata-grid metadata-grid-primary">
      <span>Zasoby</span>
      <strong className={clsx(selectedExam.assetFiles.length > 0 && 'resource-links')}>
        {selectedExam.assetFiles.length > 0
          ? selectedExam.assetFiles.map((assetFile) => (
              <a
                key={assetFile}
                href={resourceUrl(catalog.sourceRepository, selectedExam, assetFile)}
                target="_blank"
                rel="noreferrer"
                download
              >
                <Download size={13} aria-hidden="true" />
                {assetFile}
              </a>
            ))
          : 'brak w katalogu'}
      </strong>
      <span>Rozwiązania</span>
      <strong>
        <a href={solutionUrl(catalog.sourceRepository, selectedExam.solutionFolder)} target="_blank" rel="noreferrer">
          {selectedExam.solutionFolder ?? 'repozytorium źródłowe'}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </strong>
    </div>
  )
}
