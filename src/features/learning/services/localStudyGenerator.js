const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being',
  'between', 'could', 'document', 'first', 'from', 'have', 'into', 'more',
  'most', 'other', 'over', 'should', 'some', 'such', 'than', 'that', 'their',
  'there', 'these', 'they', 'this', 'those', 'through', 'under', 'until',
  'very', 'were', 'which', 'while', 'with', 'would', 'your',
]);

const cleanParagraphs = (text) => text
  .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
  .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
  .filter((paragraph) => paragraph.length > 25);

const getKeyword = (sentence) => {
  const words = sentence.match(/\b[a-zA-Z][a-zA-Z'-]{4,}\b/g) || [];
  return words.find((word) => !STOP_WORDS.has(word.toLowerCase())) || words[0];
};

const makeQuestion = (sentence, allKeywords, index) => {
  const answer = getKeyword(sentence);
  if (!answer) return null;

  const distractors = [...new Set(allKeywords
    .filter((word) => word.toLowerCase() !== answer.toLowerCase())
    .sort((a, b) => a.localeCompare(b)))].slice(index % 2, (index % 2) + 3);
  const choices = [answer, ...distractors];
  if (choices.length < 2) return null;

  const question = sentence.replace(new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '_____');
  return {
    id: `question-${index}`,
    prompt: `Complete the sentence from your material: “${question}”`,
    answer,
    choices: choices.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    explanation: sentence,
  };
};

export const createLocalStudyGuide = (text, title = 'Untitled study material') => {
  const paragraphs = cleanParagraphs(text);
  if (!paragraphs.length) {
    throw new Error('Add more readable text before creating a study guide.');
  }

  const keywords = paragraphs.flatMap((paragraph) =>
    (paragraph.match(/\b[a-zA-Z][a-zA-Z'-]{4,}\b/g) || [])
      .filter((word) => !STOP_WORDS.has(word.toLowerCase())));
  const uniqueKeywords = [...new Map(keywords.map((word) => [word.toLowerCase(), word])).values()];
  const quiz = paragraphs
    .slice(0, 5)
    .map((paragraph, index) => makeQuestion(paragraph, uniqueKeywords, index))
    .filter(Boolean);

  return {
    title,
    summary: paragraphs.slice(0, 2).join(' '),
    sections: paragraphs.slice(0, 6).map((content, index) => ({
      id: `section-${index}`,
      title: index === 0 ? 'Start with the main idea' : `Key idea ${index + 1}`,
      content,
    })),
    keyTerms: uniqueKeywords.slice(0, 8),
    quiz,
  };
};
