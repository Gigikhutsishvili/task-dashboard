import React, { useRef, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { extractTextFromFile, isSupportedFile } from './features/learning/services/fileTextExtractor';
import { createLocalStudyGuide } from './features/learning/services/localStudyGenerator';

const fileTypes = '.pdf,.docx,.txt,.md,.markdown';

function App() {
  const fileInput = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('learn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [dragging, setDragging] = useState(false);
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || loading) return;
    setError('');
    if (!isSupportedFile(file)) {
      setError('That file type is not supported. Choose a PDF, DOCX, TXT, or Markdown file.');
      return;
    }

    setActiveSessionId(null);
    setLoading(true);
    try {
      const text = await extractTextFromFile(file);
      const title = file.name.replace(/\.[^.]+$/, '') || file.name;
      const studyGuide = createLocalStudyGuide(text, title);
      const newSession = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        createdAt: new Date(),
        studyGuide,
      };
      setSessions((previous) => [newSession, ...previous]);
      setActiveSessionId(newSession.id);
      setActiveTab('learn');
      setAnswers({});
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'This file could not be read.');
    } finally {
      setLoading(false);
    }
  };

  const openSession = (session) => {
    setActiveSessionId(session.id);
    setActiveTab('learn');
    setAnswers({});
  };

  const resetQuiz = () => setAnswers({});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" data-testid="learning-app">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            type="button"
            className="flex items-center gap-3 text-left"
            onClick={() => setActiveSessionId(null)}
            aria-label="Go to your library"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">Studywise</span>
              <span className="block text-xs text-slate-500">Your personal study space</span>
            </span>
          </button>
          {activeSession && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add material</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {activeSession ? (
          <StudySession
            session={activeSession}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            answers={answers}
            setAnswers={setAnswers}
            onBack={() => setActiveSessionId(null)}
            onResetQuiz={resetQuiz}
          />
        ) : (
          <Library
            sessions={sessions}
            onOpenSession={openSession}
            onUpload={() => fileInput.current?.click()}
            loading={loading}
            error={error}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={handleFiles}
          />
        )}
        <input
          ref={fileInput}
          type="file"
          accept={fileTypes}
          className="sr-only"
          data-testid="file-input"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
          aria-label="Upload learning material"
        />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-7xl px-5 py-5 text-center text-xs text-slate-500 sm:px-8">
          Your files are processed in this browser and are not uploaded to a server.
        </p>
      </footer>
    </div>
  );
}

function Library({ sessions, onOpenSession, onUpload, loading, error, dragging, setDragging, onFiles }) {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <SparklesIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">Learn actively</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Turn your notes into
          <span className="block text-indigo-600">a study session</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Add a document to get a guided reading outline and a quick knowledge check,
          made from the material you want to learn.
        </p>
      </section>

      <section
        className={`rounded-3xl border-2 border-dashed bg-white px-6 py-10 text-center shadow-sm transition sm:px-12 sm:py-14 ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(event.dataTransfer.files);
        }}
        data-testid="upload-dropzone"
      >
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <ArrowUpTrayIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold text-slate-900">Bring your learning material</h2>
        <p className="mt-2 text-sm text-slate-500">Drag and drop a file here, or browse your device.</p>
        <button
          type="button"
          onClick={onUpload}
          disabled={loading}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
          data-testid="browse-files-button"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              Reading your file…
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Choose a file
            </>
          )}
        </button>
        <p className="mt-4 text-xs text-slate-500">PDF, DOCX, TXT, or Markdown</p>
        {error && (
          <p role="alert" className="mx-auto mt-5 flex max-w-xl items-start justify-center gap-2 text-left text-sm text-rose-700">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </section>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <FeatureCard icon={DocumentTextIcon} title="Guided lecture" text="Read your material as a short, structured outline." />
        <FeatureCard icon={AcademicCapIcon} title="Quick quiz" text="Check what stuck with questions from the source." />
        <FeatureCard icon={LightBulbIcon} title="Made for practice" text="Get instant feedback and a score as you go." />
      </div>

      {sessions.length > 0 && (
        <section className="mt-14" aria-labelledby="recent-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="recent-heading" className="text-xl font-bold text-slate-900">Recent study sessions</h2>
              <p className="mt-1 text-sm text-slate-500">Pick up where you left off.</p>
            </div>
          </div>
          <div className="grid gap-3">
            {sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                onClick={() => onOpenSession(session)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                data-testid={`session-${session.id}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 grow">
                  <span className="block truncate font-semibold text-slate-900">{session.studyGuide.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {session.studyGuide.sections.length} key ideas · {session.studyGuide.quiz.length} quiz questions
                  </span>
                </span>
                <span className="hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  {session.createdAt.toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="mt-10 text-center text-xs leading-5 text-slate-400">
        Prototype mode: study content is created locally using simple text patterns, not generative AI.
      </p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <Icon className="mb-3 h-5 w-5 text-indigo-600" aria-hidden="true" />
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function StudySession({ session, activeTab, setActiveTab, answers, setAnswers, onBack, onResetQuiz }) {
  const { studyGuide } = session;
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const quizPercent = studyGuide.quiz.length ? Math.round((correctCount / studyGuide.quiz.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Your library
      </button>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-indigo-700">Study session</p>
          <h1 className="truncate text-3xl font-bold tracking-tight text-slate-950">{studyGuide.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
            {session.fileName}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
          <SparklesIcon className="h-4 w-4" aria-hidden="true" />
          Local prototype content
        </span>
      </div>

      <div className="mb-7 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Study session">
        <button
          id="learn-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'learn'}
          aria-controls="learn-panel"
          onClick={() => setActiveTab('learn')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === 'learn' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpenIcon className="h-4 w-4" aria-hidden="true" />
          Learn
        </button>
        <button
          id="quiz-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'quiz'}
          aria-controls="quiz-panel"
          onClick={() => setActiveTab('quiz')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === 'quiz' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          data-testid="quiz-tab"
        >
          <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
          Quiz
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{studyGuide.quiz.length}</span>
        </button>
      </div>

      <div
        id="learn-panel"
        role="tabpanel"
        aria-labelledby="learn-tab"
        hidden={activeTab !== 'learn'}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your guided lecture</h2>
                <p className="text-sm text-slate-500">A reading outline based on your source</p>
              </div>
            </div>
            <div className="mb-8 rounded-xl bg-indigo-50/70 p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-700">Overview</p>
              <p className="leading-7 text-slate-700">{studyGuide.summary}</p>
            </div>
            <div className="space-y-7">
              {studyGuide.sections.map((section, index) => (
                <section key={section.id} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="mb-2 font-semibold text-slate-900">{section.title}</h3>
                    <p className="leading-7 text-slate-600">{section.content}</p>
                  </div>
                </section>
              ))}
            </div>
          </article>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-slate-900">Key terms</h2>
              {studyGuide.keyTerms.length ? (
                <div className="flex flex-wrap gap-2">
                  {studyGuide.keyTerms.map((term) => (
                    <span key={term} className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800">{term}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">No key terms were identified.</p>}
            </div>
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-sm font-semibold">Ready to check your memory?</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Try a few questions pulled from the text you just read.</p>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-indigo-50"
              >
                Start quiz
                <ArrowLeftIcon className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            </div>
          </aside>
      </div>
      <section
        id="quiz-panel"
        role="tabpanel"
        aria-labelledby="quiz-tab"
        hidden={activeTab !== 'quiz'}
        className="mx-auto max-w-3xl"
      >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Knowledge check</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the word that completes each source sentence.</p>
            </div>
            {answeredCount > 0 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800" data-testid="quiz-score">
                Score: {correctCount}/{answeredCount}
              </span>
            )}
          </div>
          {studyGuide.quiz.length ? (
            <div className="space-y-4">
              {studyGuide.quiz.map((question, index) => (
                <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Question {index + 1}</p>
                  <h3 className="mb-5 text-base font-semibold leading-7 text-slate-900">{question.prompt}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice) => {
                      const response = answers[question.id];
                      const selected = response?.choice === choice;
                      const isCorrect = choice.toLowerCase() === question.answer.toLowerCase();
                      const style = response && selected
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-rose-400 bg-rose-50 text-rose-900'
                        : response && isCorrect
                          ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                          : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50';
                      return (
                        <button
                          type="button"
                          key={choice}
                          onClick={() => !response && setAnswers((previous) => ({
                            ...previous,
                            [question.id]: { choice, correct: isCorrect },
                          }))}
                          disabled={Boolean(response)}
                          aria-pressed={selected}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-default ${style}`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  {answers[question.id] && (
                    <p className={`mt-4 flex items-start gap-2 text-sm leading-6 ${
                      answers[question.id].correct ? 'text-emerald-800' : 'text-rose-800'
                    }`} role="status">
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {answers[question.id].correct ? 'That’s right.' : `Not quite. The source says: “${question.explanation}”`}
                    </p>
                  )}
                </article>
              ))}
              {answeredCount === studyGuide.quiz.length && (
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-indigo-700 p-5 text-white sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold">You finished the knowledge check</p>
                    <p className="mt-1 text-sm text-indigo-100">You got {correctCount} of {studyGuide.quiz.length} correct ({quizPercent}%).</p>
                  </div>
                  <button
                    type="button"
                    onClick={onResetQuiz}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
                  >
                    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center">
              <p className="font-semibold text-slate-900">There isn’t enough text for a quiz yet.</p>
              <p className="mt-2 text-sm text-slate-500">Try a document with a few complete sentences.</p>
            </div>
          )}
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            These fill-in-the-blank questions are generated from text patterns and may not capture the full meaning of the source.
          </p>
      </section>
    </div>
  );
}

export default App;
