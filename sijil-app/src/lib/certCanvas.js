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
 * Compress canvas ke JPEG dengan kualiti yang sesuai untuk kekal < targetKB
 */
async function compressToTarget(canvas, targetKB = 190) {
  const targetBytes = targetKB * 1024

  // Cuba JPEG dulu dengan kualiti berbeza
  const qualities = [0.85, 0.70, 0.55, 0.40, 0.25]
  for (const q of qualities) {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q))
    if (blob && blob.size <= targetBytes) return blob
  }

  // Kalau masih besar, kecilkan resolusi canvas separuh dan cuba semula
  const small = document.createElement('canvas')
  small.width  = Math.round(canvas.width  * 0.6)
  small.height = Math.round(canvas.height * 0.6)
  const ctx = small.getContext('2d')
  ctx.drawImage(canvas, 0, 0, small.width, small.height)

  for (const q of [0.75, 0.55, 0.35]) {
    const blob = await new Promise(res => small.toBlob(res, 'image/jpeg', q))
    if (blob && blob.size <= targetBytes) return blob
  }

  // Fallback — bagi apa yang ada
  return new Promise(res => small.toBlob(res, 'image/jpeg', 0.3))
}

/**
 * Tulis teks pada canvas dan compress kepada <200KB
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
 * Jana PDF satu muka surat dengan sijil, saiz < 200KB
 * Guna kaedah manual tanpa library luar — embed JPEG dalam PDF wrapper mudah
 */
export async function generateCertificatePDF(opts = {}) {
  const canvas   = await buildCanvas(opts)
  const jpegBlob = await compressToTarget(canvas, 185) // lebih kecil sikit dari 200KB

  // Baca JPEG sebagai ArrayBuffer
  const jpegBuffer = await jpegBlob.arrayBuffer()
  const jpegBytes  = new Uint8Array(jpegBuffer)
  const jpegSize   = jpegBytes.length

  // Dimensi PDF dalam pt (A4 landscape: 841.89 x 595.28)
  // Atau ikut nisbah gambar
  const ratio  = canvas.height / canvas.width
  const pdfW   = 841.89  // A4 landscape lebar (pt)
  const pdfH   = Math.round(pdfW * ratio * 100) / 100

  // Encode JPEG ke ASCII stream untuk PDF
  // PDF boleh embed raw JPEG bytes terus
  const now    = new Date()
  const dateStr = now.toISOString().replace(/[-:T]/g,'').slice(0,14)

  // Bina struktur PDF manual
  const objects = []

  // Object 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`)

  // Object 2: Pages
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`)

  // Object 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R\n` +
    `/MediaBox [0 0 ${pdfW} ${pdfH}]\n` +
    `/Contents 4 0 R\n` +
    `/Resources << /XObject << /Img 5 0 R >> >> >>\nendobj`
  )

  // Object 4: Content stream — lukis gambar penuh muka surat
  const contentStr = `q ${pdfW} 0 0 ${pdfH} 0 0 cm /Img Do Q`
  const contentBytes = new TextEncoder().encode(contentStr)
  objects.push(
    `4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n` +
    contentStr +
    `\nendstream\nendobj`
  )

  // Object 5: Image XObject (JPEG)
  // Header dulu sebagai string, kemudian JPEG bytes
  const imgHeader =
    `5 0 obj\n` +
    `<< /Type /XObject /Subtype /Image\n` +
    `/Width ${canvas.width} /Height ${canvas.height}\n` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8\n` +
    `/Filter /DCTDecode /Length ${jpegSize} >>\n` +
    `stream\n`

  const imgFooter = `\nendstream\nendobj`

  // Kira offset untuk xref
  const headerLine = `%PDF-1.4\n`
  const enc = new TextEncoder()

  // Assemble semua sebagai Uint8Array
  const parts = []
  parts.push(enc.encode(headerLine))

  const offsets = []
  let pos = headerLine.length

  for (let i = 0; i < objects.length; i++) {
    if (i === 4) {
      // Object 5: gabung header + jpeg bytes + footer
      const hBytes = enc.encode(imgHeader)
      const fBytes = enc.encode(imgFooter)
      offsets.push(pos)
      parts.push(hBytes)
      parts.push(jpegBytes)
      parts.push(fBytes)
      pos += hBytes.length + jpegSize + fBytes.length
    } else {
      offsets.push(pos)
      const bytes = enc.encode(objects[i] + '\n')
      parts.push(bytes)
      pos += bytes.length
    }
  }

  // xref table
  const xrefOffset = pos
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n'
  }
  xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\n`
  xref += `startxref\n${xrefOffset}\n%%EOF`

  parts.push(enc.encode(xref))

  // Gabung semua parts
  const totalLen = parts.reduce((s, p) => s + p.length, 0)
  const result   = new Uint8Array(totalLen)
  let offset = 0
  for (const p of parts) { result.set(p, offset); offset += p.length }

  return new Blob([result], { type: 'application/pdf' })
}

/**
 * Pratonton — data URL untuk papar dalam <img>
 */
export async function generateCertificatePreview(opts = {}) {
  const canvas = await buildCanvas(opts)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function downloadBlob(blob, filename = 'sijil.pdf') {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export function openPdfInTab(blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
