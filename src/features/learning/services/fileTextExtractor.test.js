import { extractTextFromFile, isSupportedFile } from './fileTextExtractor';

const createStoredDocx = (body) => {
  const encoder = new TextEncoder();
  const name = encoder.encode('word/document.xml');
  const content = encoder.encode(body);
  const localHeader = new Uint8Array(30 + name.length + content.length);
  const localView = new DataView(localHeader.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(18, content.length, true);
  localView.setUint16(22, content.length, true);
  localView.setUint16(26, name.length, true);
  localHeader.set(name, 30);
  localHeader.set(content, 30 + name.length);

  const centralDirectory = new Uint8Array(46 + name.length);
  const centralView = new DataView(centralDirectory.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint32(20, content.length, true);
  centralView.setUint32(24, content.length, true);
  centralView.setUint16(28, name.length, true);
  centralDirectory.set(name, 46);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localHeader.length, true);
  const file = new Uint8Array(localHeader.length + centralDirectory.length + end.length);
  file.set(localHeader);
  file.set(centralDirectory, localHeader.length);
  file.set(end, localHeader.length + centralDirectory.length);
  return Promise.resolve(file.buffer);
};

describe('fileTextExtractor', () => {
  test('reads and trims plain text and Markdown files', async () => {
    const file = {
      name: 'notes.md',
      text: async () => '  Chapter one\n\nStudy notes  ',
    };

    await expect(extractTextFromFile(file)).resolves.toBe('Chapter one\n\nStudy notes');
  });

  test('extracts text operators from an uncompressed PDF text stream', async () => {
    const pdf = '%PDF-1.4\n1 0 obj\n<< /Length 45 >>\nstream\nBT (Cellular ) Tj [(energy) 20 (matters.)] TJ ET\nendstream\nendobj\n%%EOF';
    const file = {
      name: 'lesson.pdf',
      arrayBuffer: async () => new TextEncoder().encode(pdf).buffer,
    };

    await expect(extractTextFromFile(file)).resolves.toContain('Cellular energy matters.');
  });

  test('extracts paragraph text from a DOCX document body', async () => {
    const file = {
      name: 'lesson.docx',
      arrayBuffer: () => createStoredDocx(
        '<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>Document sentence for learning.</w:t></w:r></w:p></w:body></w:document>',
      ),
    };

    await expect(extractTextFromFile(file)).resolves.toBe('Document sentence for learning.');
  });

  test('rejects unsupported extensions and malformed PDFs', async () => {
    expect(isSupportedFile({ name: 'slides.pptx' })).toBe(false);
    await expect(extractTextFromFile({ name: 'slides.pptx' }))
      .rejects.toThrow('Choose a PDF, DOCX, TXT, or Markdown file.');
    await expect(extractTextFromFile({
      name: 'broken.pdf',
      arrayBuffer: async () => new TextEncoder().encode('not a PDF').buffer,
    })).rejects.toThrow('valid PDF');
  });
});
