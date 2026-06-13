export type TaskType =
  | 'console'
  | 'desktop'
  | 'documentation'
  | 'mobile'
  | 'testing'
  | 'unit-testing'
  | 'web'
  | 'application'

export type Exam = {
  id: string
  code: string
  year: number
  month: string
  session: string
  number: string
  variant: string
  pdf: string
  scoringPdf: string | null
  sourcePath: string
  solutionFolder: string | null
  pageCount: number
  tasks: string[]
  assetFiles: string[]
}

export type Task = {
  id: string
  examId: string
  part: number
  partLabel: string
  title: string
  heading: string
  type: TaskType
  typeLabel: string
  tags: string[]
  pageStart: number
  pageEnd: number
  pdf: string
  text: string
  summary: string
  duplicateGroup: string
  duplicates: string[]
}

export type Catalog = {
  generatedAt: string
  sourceRepository: string
  examCount: number
  taskCount: number
  years: number[]
  taskTypes: TaskType[]
  exams: Exam[]
  tasks: Task[]
}

export type PreviewMode = 'task' | 'exam' | 'scoring'
export type RegistryMode = 'tasks' | 'exams'
export type SortMode = 'newest' | 'oldest' | 'type' | 'part' | 'duplicates'
export type SeasonFilter = 'all' | 'winter' | 'summer'
