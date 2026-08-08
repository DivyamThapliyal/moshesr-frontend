/* ============================================================================
   zipread — lists what is inside a dropped .zip (real names, real sizes)
   without decompressing a byte, by reading the central directory. Ported
   verbatim from js/zipread.js. Fails closed on truncated/corrupt/ZIP64
   archives; callers fall back to treating the archive as one opaque file.
   ========================================================================== */
const EOCD_SIG = 0x06054b50;
const CDFH_SIG = 0x02014b50;
const EOCD_MAX_BACK = 22 + 65535;

function findEOCD(view) {
  const start = Math.max(0, view.byteLength - EOCD_MAX_BACK);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  return -1;
}

function decodeName(bytes, isUtf8) {
  try {
    return new TextDecoder(isUtf8 ? 'utf-8' : 'windows-1252').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export async function readZipEntries(file) {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);

  const eocdAt = findEOCD(view);
  if (eocdAt < 0) throw new Error('not a zip this reader can parse');

  const total = view.getUint16(eocdAt + 10, true);
  const cdSize = view.getUint32(eocdAt + 12, true);
  const cdOffset = view.getUint32(eocdAt + 16, true);

  if (total === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    throw new Error('zip64 is not supported by this reader');
  }
  if (cdOffset + cdSize > view.byteLength) {
    throw new Error('central directory falls outside the file');
  }

  const entries = [];
  let p = cdOffset;
  const end = cdOffset + cdSize;

  while (p + 46 <= end) {
    if (view.getUint32(p, true) !== CDFH_SIG) break;

    const flags = view.getUint16(p + 8, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);

    const nameStart = p + 46;
    if (nameStart + nameLen > view.byteLength) break;
    const nameBytes = new Uint8Array(buf, nameStart, nameLen);
    const name = decodeName(nameBytes, (flags & 0x0800) !== 0);

    const isDir = name.endsWith('/') || (size === 0 && /\/$/.test(name));
    if (!isDir && name.trim()) entries.push({ name: name.split('/').pop(), size });

    p = nameStart + nameLen + extraLen + commentLen;
  }

  return entries;
}
