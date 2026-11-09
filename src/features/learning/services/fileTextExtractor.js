const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'markdown']);

const getExtension = (name = '') => name.split('.').pop().toLowerCase();

const decodePdfString = (value) => {
  if (value.startsWith('<')) {
    const bytes = value.slice(1, -1).replace(/\s/g, '').match(/.{1,2}/g) || [];
    const data = Uint8Array.from(bytes, (byte) => parseInt(byte.padEnd(2, '0'), 16));
    if (data[0] === 0xfe && data[1] === 0xff) {
      let decoded = '';
      for (let i = 2; i + 1 < data.length; i += 2) {
        decoded += String.fromCharCode((data[i] << 8) | data[i + 1]);
      }
      return decoded;
    }
    return new TextDecoder('latin1').decode(data);
  }

  return value.slice(1, -1)
    .replace(/\\([nrtbf()\\])/g, (_, escaped) => ({
      n: '\n', r: '\r', t: '\t', b: '\b', f: '\f',
      '(': '(', ')': ')', '\\': '\\',
    }[escaped]))
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\\r?\n/g, '');
};

const extractPdfStrings = (content) => {
  const token = String.raw`(?:\((?:\\.|[^\\)])*\)|<[\da-f\s]+>)`;
  const strings = [];
  const singleTextOperator = new RegExp(`(${token})\\s*(?:Tj|['"])`, 'gi');
  const textArrays = new RegExp(`\\[((?:\\\\.|[^\\]])*)\\]\\s*TJ`, 'gi');
  let match;
  while ((match = singleTextOperator.exec(content))) strings.push(decodePdfString(match[1]));
  while ((match = textArrays.exec(content))) {
    const stringTokens = match[1].match(new RegExp(token, 'gi')) || [];
    strings.push(...stringTokens.map(decodePdfString));
  }
  return strings;
};

const inflate = async (bytes, format) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress this file format. Try a newer browser.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const extractPdfText = async (buffer) => {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);
  if (!raw.startsWith('%PDF-')) {
    throw new Error('This does not appear to be a valid PDF file.');
  }

  const extracted = [];
  const streamPattern = /<<(.*?)>>\s*stream\r?\n/gs;
  let match;
  while ((match = streamPattern.exec(raw))) {
    const streamStart = streamPattern.lastIndex;
    const streamEnd = raw.indexOf('endstream', streamStart);
    if (streamEnd < 0) break;

    let streamBytes = bytes.subarray(streamStart, streamEnd);
    if (match[1].includes('/FlateDecode')) {
      streamBytes = await inflate(streamBytes, 'deflate');
    } else if (match[1].includes('/Filter')) {
      streamPattern.lastIndex = streamEnd + 9;
      continue;
    }

    const streamText = new TextDecoder('latin1').decode(streamBytes);
    if (/\bBT\b/.test(streamText)) extracted.push(...extractPdfStrings(streamText));
    streamPattern.lastIndex = streamEnd + 9;
  }

  return extracted.join(' ').replace(/\s+/g, ' ').trim();
};

const extractDocxText = async (buffer) => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('This does not appear to be a valid DOCX file.');

  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  let cursor = directoryOffset;
  let documentEntry;

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    if (name === 'word/document.xml') {
      documentEntry = { method, compressedSize, localOffset };
      break;
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (!documentEntry) throw new Error('This DOCX file has no readable document body.');

  const { method, compressedSize, localOffset } = documentEntry;
  const nameLength = view.getUint16(localOffset + 26, true);
  const extraLength = view.getUint16(localOffset + 28, true);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
  let xmlBytes;
  if (method === 0) {
    xmlBytes = compressed;
  } else if (method === 8) {
    xmlBytes = await inflate(compressed, 'deflate-raw');
  } else {
    throw new Error('This DOCX file uses an unsupported compression method.');
  }

  const xml = new DOMParser().parseFromString(decoder.decode(xmlBytes), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('The DOCX document body could not be read.');
  return Array.from(xml.getElementsByTagNameNS('*', 'p'))
    .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS('*', 't'))
      .map((node) => node.textContent)
      .join(''))
    .filter(Boolean)
    .join('\n\n');
};

export const extractTextFromFile = async (file) => {
  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Choose a PDF, DOCX, TXT, or Markdown file.');
  }

  let text;
  if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
    text = await file.text();
  } else if (extension === 'pdf') {
    text = await extractPdfText(await file.arrayBuffer());
  } else {
    text = await extractDocxText(await file.arrayBuffer());
  }

  const cleanedText = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (!cleanedText) throw new Error('No readable text was found in this file.');
  return cleanedText;
};

export const isSupportedFile = (file) => SUPPORTED_EXTENSIONS.has(getExtension(file.name));
