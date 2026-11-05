import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  onExample: () => void
}

const STEPS = [
  {
    title: '抄四个数',
    body: '份额、单位成本、当前净值、持有天数。不知道在哪抄，输入页里有示意图。',
  },
  {
    title: '选一个流派',
    body: '落袋为安、趋势跟随、分批收割……选一个最像你想法的，参数之后还能改。',
  },
  {
    title: '看规则给出的结果',
    body: '工具只做算术：按你设的规则算出该减多少、付多少费、要不要等几天。',
  },
]

export function Onboarding({ open, onClose, onExample }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="三步算清楚"
      subtitle="不用注册，数据只留在这台设备"
      footer={
        <>
          <Button variant="secondary" onClick={onExample}>
            先看示例
          </Button>
          <Button variant="primary" onClick={onClose}>
            开始
          </Button>
        </>
      }
    >
      <ol className="steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="step-num">{i + 1}</span>
            <span>
              <b>{step.title}</b>
              <em>{step.body}</em>
            </span>
          </li>
        ))}
      </ol>
      <p className="sheet-note">
        <Icon name="shield" size={15} />
        不上传、不联网、没有账号。换设备时用「更多 → 导出备份」搬过去。
      </p>
    </Sheet>
  )
}
