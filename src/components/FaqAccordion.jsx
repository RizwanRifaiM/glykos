import { FAQ_GROUPS } from '../constants/faq'
import { IconChevronDown } from './icons'

export default function FaqAccordion() {
  return (
    <div className="faq">
      {FAQ_GROUPS.map((group) => (
        <div key={group.title} className="faq-group">
          <h3 className="faq-group__title">{group.title}</h3>
          <div className="faq-group__list">
            {group.items.map((item) => (
              <details key={item.question} className="faq-item">
                <summary className="faq-item__question">
                  <span>{item.question}</span>
                  <IconChevronDown size={16} className="faq-item__chevron" />
                </summary>
                <p className="faq-item__answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
