import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';
import { extractTextFromFile } from './features/learning/services/fileTextExtractor';

vi.mock('./features/learning/services/fileTextExtractor', () => ({
  extractTextFromFile: vi.fn(),
  isSupportedFile: (file) => /\.(pdf|docx|txt|md|markdown)$/i.test(file.name),
}));

const sourceText = [
  'Mitochondria generate cellular energy through aerobic respiration.',
  'Photosynthesis transforms sunlight into chemical energy in plants.',
  'Enzymes accelerate important chemical reactions inside living cells.',
].join('\n\n');

describe('learning workspace', () => {
  beforeEach(() => {
    extractTextFromFile.mockResolvedValue(sourceText);
  });

  test('uploads a document, opens its lecture, and gives quiz feedback', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /turn your notes into/i })).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['notes'], 'cell-biology.txt', { type: 'text/plain' })] },
    });

    expect(await screen.findByText('Your guided lecture')).toBeInTheDocument();
    expect(screen.getByText('Mitochondria generate cellular energy through aerobic respiration.')).toBeInTheDocument();

    await user.click(screen.getByTestId('quiz-tab'));
    expect(screen.getByRole('heading', { name: 'Knowledge check' })).toBeInTheDocument();
    const questions = screen.getAllByRole('article');
    await user.click(within(questions[0]).getByRole('button', { name: 'Mitochondria' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('That’s right.'));
    await user.click(within(questions[1]).getByRole('button', { name: 'Photosynthesis' }));
    await user.click(within(questions[2]).getByRole('button', { name: 'Enzymes' }));
    expect(screen.getByTestId('quiz-score')).toHaveTextContent('Score: 3/3');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByTestId('quiz-score')).not.toBeInTheDocument();
  });

  test('shows extraction errors to the learner', async () => {
    extractTextFromFile.mockRejectedValueOnce(new Error('No readable text was found in this file.'));
    render(<App />);
    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File([''], 'empty.txt', { type: 'text/plain' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('No readable text was found');
  });
});
