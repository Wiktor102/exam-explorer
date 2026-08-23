import type { Exam, Task } from '../../types/catalog'

export type DuplicateTaskRow = {
  task: Task
  exam: Exam | undefined
  isSameSessionRepeat: boolean
}
