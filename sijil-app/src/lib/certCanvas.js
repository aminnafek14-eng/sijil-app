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
 *
 * nameSize/icSize adalah saiz dalam px pada lebar pratonton (previewWidth).
 * Canvas skala saiz ini secara proporsional kepada saiz gambar sebenar.
 */
export async function generateCertificate(opts = {}) {
  const {
    templateUrl,
    name,
    ic           = '',
    nameX        = 50,
    nameY        = 55,
    nameSize     = 36,
    nameColor    = '#1e3a5f',
    nameFont     = 'Georgia',
    showIc       = true,
    icSize       = 20,
    icColor      = '#1e3a5f',
    previewWidth = 600,   // lebar div pratonton dalam px
    output       = 'blob',
  } = opts

  const img = await loadImage(templateUrl)
  const canvas = document.createElement('canvas')
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  // Skala saiz font: pratonton vs gambar sebenar
  const scaleRatio   = canvas.width / previewWidth
  const realNameSize = Math.round(nameSize * scaleRatio)
  const realIcSize   = Math.round(icSize   * scaleRatio)

  const x        = (nameX / 100) * canvas.width
  const nameY_px = (nameY / 100) * canvas.height

  // Nama — bold
  ctx.font         = `bold ${realNameSize}px "${nameFont}", Georgia, serif`
  ctx.fillStyle    = nameColor
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.toUpperCase(), x, nameY_px)

  // IC — bold, font sama, di bawah nama
  if (showIc && ic) {
    const icY_px = nameY_px + realNameSize * 1.5
    ctx.font      = `bold ${realIcSize}px "${nameFont}", Georgia, serif`
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
