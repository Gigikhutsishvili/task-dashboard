import { createLocalStudyGuide } from './localStudyGenerator';

const sourceText = [
  'Mitochondria generate cellular energy through aerobic respiration.',
  'Photosynthesis transforms sunlight into chemical energy in plants.',
  'Enzymes accelerate important chemical reactions inside living cells.',
].join('\n\n');

describe('createLocalStudyGuide', () => {
  test('builds a reading outline, key terms, and source-based quiz questions', () => {
    const guide = createLocalStudyGuide(sourceText, 'Cell biology');

    expect(guide.title).toBe('Cell biology');
    expect(guide.sections).toHaveLength(3);
    expect(guide.summary).toContain('Mitochondria generate cellular energy');
    expect(guide.keyTerms).toContain('Mitochondria');
    expect(guide.quiz.length).toBeGreaterThan(0);
    expect(guide.quiz[0].prompt).toContain('_____');
    expect(guide.quiz[0].choices).toContain(guide.quiz[0].answer);
    expect(guide.quiz[0].explanation).toBe(sourceText.split('\n\n')[0]);
  });

  test('rejects documents without complete readable sentences', () => {
    expect(() => createLocalStudyGuide('Too short')).toThrow('Add more readable text');
  });
});
