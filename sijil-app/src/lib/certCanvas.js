function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Gagal muatkan gambar: ${url}`))
    img.src = url
  })
}

/**
 * Jana sijil — tulis nama DAN no. IC atas template gambar
 */
export async function generateCertificate(opts = {}) {
  const {
    templateUrl,
    name,
    ic        = '',
    nameX     = 50,
    nameY     = 55,
    nameSize  = 36,
    nameColor = '#1e3a5f',
    nameFont  = 'Georgia',
    // IC dipapar di bawah nama, saiz lebih kecil
    showIc    = true,
    icSize    = 20,
    icColor   = '#1e3a5f',
    output    = 'blob',
  } = opts

  const img = await loadImage(templateUrl)
  const canvas = document.createElement('canvas')
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const scaledNameSize = Math.round((nameSize / 1000) * canvas.width)
  const scaledIcSize   = Math.round((icSize   / 1000) * canvas.width)

  const x     = (nameX / 100) * canvas.width
  const nameY_px = (nameY / 100) * canvas.height

  // Tulis nama
  ctx.font         = `${scaledNameSize}px "${nameFont}", Georgia, serif`
  ctx.fillStyle    = nameColor
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.toUpperCase(), x, nameY_px)

  // Tulis IC di bawah nama
  if (showIc && ic) {
    const icY_px = nameY_px + scaledNameSize * 1.4
    ctx.font      = `${scaledIcSize}px "${nameFont}", Georgia, serif`
    ctx.fillStyle = icColor
    ctx.fillText(`No. IC: ${ic}`, x, icY_px)
  }

  if (output === 'dataurl') return canvas.toDataURL('image/png')

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob gagal')),
      'image/png',
    )
  })
}

/**
 * Pratonton — tulis nama dan IC pada canvas pratonton
 */
export async function drawPreview(canvas, opts = {}) {
  const {
    templateUrl,
    name      = 'NAMA PESERTA',
    ic        = '900215-01-1234',
    nameX     = 50,
    nameY     = 55,
    nameSize  = 36,
    nameColor = '#1e3a5f',
    nameFont  = 'Georgia',
    showIc    = true,
    icSize    = 20,
    icColor   = '#1e3a5f',
  } = opts

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!templateUrl) {
    ctx.fillStyle = '#e8edf2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tiada template — muat naik gambar sijil', canvas.width / 2, canvas.height / 2)
    return
  }

  try {
    const img = await loadImage(templateUrl)
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
    const drawW = img.naturalWidth  * scale
    const drawH = img.naturalHeight * scale
    const offX  = (canvas.width  - drawW) / 2
    const offY  = (canvas.height - drawH) / 2
    ctx.drawImage(img, offX, offY, drawW, drawH)

    const scaledNameSize = Math.round((nameSize / 1000) * drawW)
    const scaledIcSize   = Math.round((icSize   / 1000) * drawW)

    const x      = offX + (nameX / 100) * drawW
    const nameYpx = offY + (nameY / 100) * drawH

    // Nama
    ctx.shadowColor = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur  = 3
    ctx.font         = `${scaledNameSize}px "${nameFont}", Georgia, serif`
    ctx.fillStyle    = nameColor
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.toUpperCase(), x, nameYpx)

    // IC di bawah nama
    if (showIc && ic) {
      const icYpx = nameYpx + scaledNameSize * 1.4
      ctx.font      = `${scaledIcSize}px "${nameFont}", Georgia, serif`
      ctx.fillStyle = icColor
      ctx.fillText(`No. IC: ${ic}`, x, icYpx)
    }

    ctx.shadowBlur = 0
  } catch {
    ctx.fillStyle = '#fee2e2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#dc2626'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Gagal muatkan gambar template', canvas.width / 2, canvas.height / 2)
  }
}

export function downloadBlob(blob, filename = 'sijil.png') {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printDataUrl(dataUrl, title = 'Sijil') {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0}img{max-width:100%;max-height:100vh;display:block}@media print{body{background:white}img{width:100%;height:auto}}</style>
    </head><body><img src="${dataUrl}" alt="${title}" />
    <script>window.onload=()=>{window.focus();window.print()}<\/script></body></html>`)
  win.document.close()
}
