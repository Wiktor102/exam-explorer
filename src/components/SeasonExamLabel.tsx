import { Snowflake, Sun } from 'lucide-react'
import clsx from 'clsx'
import type { Exam } from '../types/catalog'
import { examFileName, formatExamLabel } from '../utils/catalog'

type SeasonExamLabelProps = {
  exam: Exam
  tone?: 'default' | 'heading' | 'compact'
}

export function SeasonExamLabel({ exam, tone = 'default' }: SeasonExamLabelProps) {
  const isSummer = exam.month === '06'
  const SeasonIcon = isSummer ? Sun : Snowflake

  return (
    <span className={clsx('exam-code', tone, isSummer ? 'summer' : 'winter')} title={examFileName(exam)}>
      <SeasonIcon className="season-icon" aria-hidden="true" />
      <span>{formatExamLabel(exam)}</span>
    </span>
  )
}
