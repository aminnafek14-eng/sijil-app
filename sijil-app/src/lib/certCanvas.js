/**
 * certCanvas.js
 * Jana sijil sebagai PDF menggunakan jsPDF (CDN via dynamic import)
 * Saiz dijaga < 1MB dengan compress JPEG
 */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal muatkan gambar template. Pastikan CORS dibenarkan.'))
    img.src = url
  })
}

/**
 * Lukis nama + IC atas gambar, return canvas
 */
async function buildCanvas(opts = {}) {
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
    previewWidth = 600,
  } = opts

  const img = await loadImage(templateUrl)

  const canvas = document.createElement('canvas')
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const scale        = canvas.width / previewWidth
  const realNameSize = Math.round(nameSize * scale)
  const realIcSize   = Math.round(icSize   * scale)

  const x        = (nameX / 100) * canvas.width
  const nameY_px = (nameY / 100) * canvas.height

  ctx.font         = `bold ${realNameSize}px "${nameFont}", Georgia, serif`
  ctx.fillStyle    = nameColor
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.toUpperCase(), x, nameY_px)

  if (showIc && ic) {
    const icY_px = nameY_px + realNameSize * 1.5
    ctx.font      = `bold ${realIcSize}px "${nameFont}", Georgia, serif`
    ctx.fillStyle = icColor
    ctx.fillText(`No. IC: ${ic}`, x, icY_px)
  }

  return canvas
}

/**
 * Compress canvas ke JPEG, cuba kurangkan kualiti sehingga < targetKB
 */
function canvasToJpegDataUrl(canvas, targetKB = 900) {
  const targetSize = targetKB * 1024

  // Cuba kualiti dari tinggi ke rendah
  const qualities = [0.92, 0.80, 0.65, 0.50, 0.35, 0.20]

  for (const q of qualities) {
    const dataUrl = canvas.toDataURL('image/jpeg', q)
    // Anggaran saiz: base64 * 0.75
    const approxBytes = (dataUrl.length * 0.75)
    if (approxBytes <= targetSize) return dataUrl
  }

  // Kecilkan resolusi canvas jika masih besar
  const scale  = 0.6
  const small  = document.createElement('canvas')
  small.width  = Math.round(canvas.width  * scale)
  small.height = Math.round(canvas.height * scale)
  const ctx    = small.getContext('2d')
  ctx.drawImage(canvas, 0, 0, small.width, small.height)

  for (const q of [0.75, 0.55, 0.35]) {
    const dataUrl = small.toDataURL('image/jpeg', q)
    const approxBytes = dataUrl.length * 0.75
    if (approxBytes <= targetSize) return dataUrl
  }

  return small.toDataURL('image/jpeg', 0.25)
}

/**
 * Load jsPDF dari CDN
 */
async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload  = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return window.jspdf.jsPDF
}

/**
 * Jana PDF satu muka surat — sijil penuh memenuhi halaman
 * Saiz < 1MB
 */
export async function generateCertificatePDF(opts = {}) {
  const canvas   = await buildCanvas(opts)
  const jpegUrl  = canvasToJpegDataUrl(canvas, 900)

  // Dimensi gambar dalam mm
  const imgW = canvas.width
  const imgH = canvas.height

  // Tentukan orientasi — landscape atau portrait
  const isLandscape = imgW > imgH
  const JsPDF = await loadJsPDF()

  // Saiz halaman PDF ikut nisbah gambar (A4 asas)
  const A4w = isLandscape ? 297 : 210
  const A4h = isLandscape ? 210 : 297

  // Kira dimensi gambar dalam mm supaya penuh halaman
  const ratio    = imgH / imgW
  let pdfImgW    = A4w
  let pdfImgH    = A4w * ratio

  if (pdfImgH > A4h) {
    pdfImgH = A4h
    pdfImgW = A4h / ratio
  }

  const offsetX = (A4w - pdfImgW) / 2
  const offsetY = (A4h - pdfImgH) / 2

  const doc = new JsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [A4w, A4h],
    compress: true,
  })

  doc.addImage(jpegUrl, 'JPEG', offsetX, offsetY, pdfImgW, pdfImgH, '', 'FAST')

  return doc.output('blob')
}

/**
 * Jana pratonton sebagai data URL (untuk papar dalam <img>)
 */
export async function generateCertificatePreview(opts = {}) {
  const canvas = await buildCanvas(opts)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Muat turun blob sebagai fail
 */
export function downloadBlob(blob, filename = 'sijil.pdf') {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Buka PDF dalam tab baharu
 */
export function openPdfInTab(blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}
