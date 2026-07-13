/**
 * certCanvas.js
 * Tulis nama peserta atas gambar sijil (PNG/JPG) menggunakan Canvas API.
 * Output: Blob (PDF-ready) atau data URL untuk pratonton.
 */

/**
 * Muatkan gambar dari URL (handle CORS via proxy jika perlu)
 */
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
 * Jana sijil — tulis nama atas template gambar
 *
 * @param {Object} opts
 * @param {string}  opts.templateUrl  - URL awam gambar sijil
 * @param {string}  opts.name         - Nama peserta
 * @param {string}  opts.ic           - No. IC peserta
 * @param {string}  opts.program      - Nama program
 * @param {string}  opts.date         - Tarikh program
 * @param {number}  opts.nameX        - Kedudukan X dalam % (0–100)
 * @param {number}  opts.nameY        - Kedudukan Y dalam % (0–100)
 * @param {number}  opts.nameSize     - Saiz fon nama (px pada 1000px lebar)
 * @param {string}  opts.nameColor    - Warna teks nama
 * @param {string}  opts.nameFont     - Fon nama (e.g. 'Georgia')
 * @param {'blob'|'dataurl'} opts.output - Jenis output
 * @returns {Promise<Blob|string>}
 */
export async function generateCertificate(opts = {}) {
  const {
    templateUrl,
    name,
    ic       = '',
    program  = '',
    date     = '',
    nameX    = 50,
    nameY    = 55,
    nameSize = 36,
    nameColor = '#1e3a5f',
    nameFont  = 'Georgia',
    output    = 'blob',
  } = opts

  // 1. Muatkan gambar template
  const img = await loadImage(templateUrl)

  // 2. Buat canvas sama saiz dengan gambar
  const canvas = document.createElement('canvas')
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')

  // 3. Lukis gambar template
  ctx.drawImage(img, 0, 0)

  // 4. Kira saiz fon relatif kepada lebar gambar
  //    nameSize ditetapkan untuk lebar 1000px; skala ikut saiz sebenar
  const scaledSize = Math.round((nameSize / 1000) * canvas.width)

  // 5. Tulis nama
  ctx.font         = `${scaledSize}px "${nameFont}", Georgia, serif`
  ctx.fillStyle    = nameColor
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  // Posisi dalam pixel dari peratus
  const x = (nameX / 100) * canvas.width
  const y = (nameY / 100) * canvas.height

  ctx.fillText(name.toUpperCase(), x, y)

  // 6. Output
  if (output === 'dataurl') {
    return canvas.toDataURL('image/png')
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob gagal')),
      'image/png',
    )
  })
}

/**
 * Pratonton langsung — tulis nama pada canvas yang diberikan
 * (untuk editor admin drag-and-drop)
 */
export async function drawPreview(canvas, opts = {}) {
  const {
    templateUrl,
    name     = 'NAMA PESERTA',
    nameX    = 50,
    nameY    = 55,
    nameSize = 36,
    nameColor = '#1e3a5f',
    nameFont  = 'Georgia',
  } = opts

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!templateUrl) {
    // Placeholder kosong
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

    // Fit gambar dalam canvas pratonton (lebarkan / tinggi)
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
    const drawW = img.naturalWidth  * scale
    const drawH = img.naturalHeight * scale
    const offX  = (canvas.width  - drawW) / 2
    const offY  = (canvas.height - drawH) / 2

    ctx.drawImage(img, offX, offY, drawW, drawH)

    // Nama — skala relatif kepada lebar pratonton
    const scaledSize = Math.round((nameSize / 1000) * drawW)
    ctx.font         = `${scaledSize}px "${nameFont}", Georgia, serif`
    ctx.fillStyle    = nameColor
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    const x = offX + (nameX / 100) * drawW
    const y = offY + (nameY / 100) * drawH

    // Bayangan teks supaya mudah nampak
    ctx.shadowColor   = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur    = 4
    ctx.fillText(name.toUpperCase(), x, y)
    ctx.shadowBlur    = 0
  } catch {
    ctx.fillStyle = '#fee2e2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#dc2626'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Gagal muatkan gambar template', canvas.width / 2, canvas.height / 2)
  }
}

/**
 * Muat turun sijil sebagai fail PNG
 */
export function downloadBlob(blob, filename = 'sijil.png') {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Cetak sijil dalam tetingkap baharu
 */
export function printDataUrl(dataUrl, title = 'Sijil') {
  const win = window.open('', '_blank')
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f0f0; }
        img  { max-width: 100%; max-height: 100vh; display: block; }
        @media print {
          body { background: white; }
          img  { width: 100%; height: auto; }
        }
      </style>
    </head>
    <body>
      <img src="${dataUrl}" alt="${title}" />
      <script>
        window.onload = () => { window.focus(); window.print(); }
      <\/script>
    </body>
    </html>
  `)
  win.document.close()
}
