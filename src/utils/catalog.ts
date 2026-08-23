import { sessionLabels } from '../constants/catalog'
import type { Exam } from '../types/catalog'

export function formatExamLabel(exam: Exam) {
  const session = sessionLabels[exam.month] ?? exam.session
  const sheetNumber = String(Number(exam.number))
  return `${session} ${exam.year} arkusz ${sheetNumber} ${exam.variant.toLowerCase()}`
}

export function examFileName(exam: Exam) {
  return exam.sourcePath?.split('/').at(-1) ?? exam.pdf.split('/').at(-1) ?? exam.code
}

export function examSessionKey(exam: Exam) {
  return `${exam.session}-${exam.number}`
}

export function formatPartNumber(part: number) {
  const romanNumerals: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
  }

  return romanNumerals[part] ?? String(part)
}

export function solutionUrl(repository: string, folder: string | null) {
  if (!folder) {
    return repository
  }

  return `${repository}/tree/main/${folder.split('/').map(encodeURIComponent).join('/')}`
}

export function repositoryFileUrl(repository: string, path: string) {
  return `${repository}/raw/main/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function resourceUrl(repository: string, exam: Exam, assetFile: string) {
  const sourceDirectory = exam.sourcePath?.split('/').slice(0, -1).join('/') ?? ''
  return repositoryFileUrl(repository, sourceDirectory ? `${sourceDirectory}/${assetFile}` : assetFile)
}
