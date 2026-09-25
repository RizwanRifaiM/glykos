import { describe, expect, it } from 'vitest'
import { countEventsOnDay, groupAlertEvents } from './alertEvents'

const at = (day, hour, minute = 0) => new Date(2026, 8, day, hour, minute)
const alert = (id, metric, status, createdAt, extra = {}) => ({
  id,
  metric,
  status,
  createdAt,
  ...extra,
})

describe('groupAlertEvents', () => {
  it('menggabungkan metrik dan status yang sama pada hari yang sama', () => {
    const events = groupAlertEvents([
      alert('c', 'pressure', 'danger', at(25, 15)),
      alert('b', 'pressure', 'danger', at(25, 14)),
      alert('a', 'pressure', 'danger', at(25, 13)),
    ])

    expect(events).toHaveLength(1)
    expect(events[0].count).toBe(3)
    expect(events[0].latest.id).toBe('c')
    expect(events[0].lastAt).toEqual(at(25, 15))
    expect(events[0].firstAt).toEqual(at(25, 13))
  })

  it('menggabungkan walaupun diselingi metrik lain', () => {
    const events = groupAlertEvents([
      alert('c', 'pressure', 'danger', at(25, 15)),
      alert('b', 'temperature', 'warning', at(25, 14)),
      alert('a', 'pressure', 'danger', at(25, 13)),
    ])

    expect(events.map((event) => [event.latest.id, event.count])).toEqual([
      ['c', 2],
      ['b', 1],
    ])
  })

  it('memisahkan status yang berbeda — Risiko tidak tertelan Perhatian', () => {
    const events = groupAlertEvents([
      alert('b', 'pressure', 'danger', at(25, 14)),
      alert('a', 'pressure', 'warning', at(25, 13)),
    ])

    expect(events).toHaveLength(2)
  })

  it('memisahkan hari yang berbeda', () => {
    const events = groupAlertEvents([
      alert('b', 'pressure', 'danger', at(25, 9)),
      alert('a', 'pressure', 'danger', at(24, 22)),
    ])

    expect(events).toHaveLength(2)
  })

  it('menggabungkan catatan lama berdasarkan label', () => {
    const events = groupAlertEvents([
      alert('b', undefined, 'danger', at(25, 14), { label: 'Tekanan' }),
      alert('a', undefined, 'danger', at(25, 13), { label: 'Tekanan' }),
    ])

    expect(events).toHaveLength(1)
    expect(events[0].count).toBe(2)
  })

  it('tidak menggabungkan catatan tanpa waktu', () => {
    const events = groupAlertEvents([
      alert('b', 'pressure', 'danger', null),
      alert('a', 'pressure', 'danger', null),
    ])

    expect(events).toHaveLength(2)
  })
})

describe('countEventsOnDay', () => {
  it('menghitung kejadian hari itu saja, bukan catatan mentah', () => {
    const alerts = [
      alert('d', 'pressure', 'danger', at(25, 15)),
      alert('c', 'pressure', 'danger', at(25, 14)),
      alert('b', 'temperature', 'warning', at(25, 9)),
      alert('a', 'pressure', 'danger', at(24, 20)),
    ]

    expect(countEventsOnDay(alerts, '2026-09-25')).toBe(2)
    expect(countEventsOnDay(alerts, '2026-09-24')).toBe(1)
    expect(countEventsOnDay(alerts, '2026-09-26')).toBe(0)
  })
})
