import { useReveal } from '../hooks/useReveal.js'

/**
 * Fades and lifts its children in when they enter the viewport.
 * `delay` (ms) staggers siblings; `as` picks the wrapper element.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, visible] = useReveal()

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...style, '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
