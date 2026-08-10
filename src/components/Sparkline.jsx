function buildPath(values, width, height, max) {
  if (values.length === 0) return ''
  const stepX = width / (values.length - 1 || 1)

  return values
    .map((val, i) => {
      const x = i * stepX
      const y = height - (val / max) * (height - 4) - 2
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export default function Sparkline({ values = [], max = 100, color = '#446a45', width = 110, height = 30 }) {
  if (values.length < 2) return null

  const path = buildPath(values, width, height, max)
  const last = values[values.length - 1]
  const lastY = height - (last / max) * (height - 4) - 2

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      role="img"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="2.5" fill={color} />
    </svg>
  )
}
