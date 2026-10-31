import qrcodeGenerator from 'qrcode-generator'

/**
 * QR code en SVG, avec le logo Zafy au centre (même rendu que dans l'app mobile).
 * Correction d'erreur « H » (30 %) pour rester lisible malgré le logo.
 */
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const qr = qrcodeGenerator(0, 'H')
  qr.addData(value)
  qr.make()
  const n = qr.getModuleCount()

  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
  }

  // Logo : ~20 % de la largeur, centré
  const logo = Math.round(n * 0.2)
  const start = (n - logo) / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} role="img" aria-label="QR code de téléchargement">
      <path fill="#13213A" d={d} />
      <rect x={start - 0.6} y={start - 0.6} width={logo + 1.2} height={logo + 1.2} rx={1.2} fill="#fff" />
      <rect x={start} y={start} width={logo} height={logo} rx={1} fill="#13213A" />
      <g transform={`translate(${start + logo * 0.15} ${start + logo * 0.15}) scale(${(logo * 0.7) / 100})`}>
        <rect x={4} y={4} width={92} height={92} fill="none" stroke="#6EDDD6" strokeWidth={8} />
        <rect x={20} y={20} width={60} height={12} fill="#6EDDD6" />
        <rect x={40} y={36} width={40} height={12} fill="#6EDDD6" />
        <rect x={20} y={52} width={40} height={12} fill="#6EDDD6" />
        <rect x={20} y={68} width={60} height={12} fill="#6EDDD6" />
      </g>
    </svg>
  )
}
