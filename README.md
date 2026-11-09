# Studywise

A browser-based learning workspace that turns uploaded study material into a guided reading outline and a short knowledge check.

> **Prototype:** Learning content is generated locally using simple text patterns. It is not generative AI and may miss context or produce imperfect questions.

## Features

- **Local file processing**: Read PDF, DOCX, TXT, and Markdown files in the browser. Files are not sent to a server.
- **Guided lecture**: Review an overview, key ideas, and terms derived from extracted text.
- **Knowledge check**: Answer fill-in-the-blank questions based on source sentences, with immediate feedback and a score.
- **Recent sessions**: Reopen documents during the current page session.
- **Responsive interface**: Study on mobile and desktop.

## Technology

- React 19 with functional components and hooks
- Tailwind CSS 4 and Heroicons
- Vite and Vitest

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v10+)

### Installation

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build for production
- `npm test` - Run the test suite with Vitest

## File support and privacy

Text and Markdown are read directly by the browser. DOCX text is read from the document XML; PDF text is extracted from common uncompressed and Flate-compressed text streams. Image-only/scanned PDFs need OCR, and unusual PDF filters, custom font encodings, or complex documents may not extract completely. For best results, use files with selectable text and a modern browser.

The current prototype keeps documents and study sessions in memory only; refreshing the page clears them. There is no account, upload service, or external AI provider configured. A future AI-powered version will need a provider decision and a server-side integration so provider credentials are never exposed in browser code.

## Project structure

- `src/App.jsx` - Learning library and study-session interface
- `src/features/learning/services/fileTextExtractor.js` - Browser-side text extraction for supported formats
- `src/features/learning/services/localStudyGenerator.js` - Local outline, terms, and quiz generation
- `src/features/learning/services/*.test.js` - Extraction and generation tests
- `src/context` and `src/features/tasks`, `lists`, and `tags` - Existing task-dashboard components retained for reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
