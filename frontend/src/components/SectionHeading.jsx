import Reveal from './Reveal.jsx'
import styles from './SectionHeading.module.css'

export default function SectionHeading({ eyebrow, title, lead, align = 'left', action, as: Tag = 'h2', light = false }) {
  const classes = [styles.head, align === 'center' ? styles.center : '', light ? styles.light : ''].filter(Boolean).join(' ')

  return (
    <Reveal className={classes}>
      <div className={styles.text}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Tag className={styles.title}>{title}</Tag>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </Reveal>
  )
}
