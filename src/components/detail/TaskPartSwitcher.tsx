import clsx from 'clsx'
import { typeLabels } from '../../constants/catalog'
import type { Task } from '../../types/catalog'
import { formatPartNumber } from '../../utils/catalog'

type TaskPartSwitcherProps = {
  sameExamTasks: Task[] | undefined
  selectedTask: Task
  onTaskSelect: (task: Task) => void
}

export function TaskPartSwitcher({ sameExamTasks, selectedTask, onTaskSelect }: TaskPartSwitcherProps) {
  return (
    <div className="task-switch-line">
      <div className="part-links">
        {sameExamTasks?.map((task) => (
          <button
            key={task.id}
            className={clsx(selectedTask.id === task.id && 'active')}
            onClick={() => onTaskSelect(task)}
          >
            {formatPartNumber(task.part)}. {typeLabels[task.type]}
          </button>
        ))}
      </div>
    </div>
  )
}
