'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useLocale } from '@/lib/useLocale';
import type { ChatMessage } from '@/types';

const SUGGEST_KEYS = [
  'ai_suggest_1',
  'ai_suggest_2',
  'ai_suggest_3',
  'ai_suggest_4',
  'ai_suggest_5',
  'ai_suggest_6',
] as const;

function AIChatInner() {
  const { t, lang } = useLocale();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t('ai_initial'), timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialQ && !sentInitial.current) {
      sentInitial.current = true;
      sendQuery(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendQuery(text: string) {
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, locale: lang }),
      });
      const data = await res.json();
      const content = data.reply ?? data.error ?? t('ai_error_network');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content, timestamp: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('ai_error_network'), timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendQuery(text);
  }

  const showSuggested = messages.length <= 1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('ai_title')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('ai_subtitle')}</p>
      </div>

      {showSuggested && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t('ai_suggested')}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGEST_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => sendQuery(t(key))}
                className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-600"
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 mb-6">
        {messages.map((msg) => (
          <div key={msg.timestamp} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-1">
                AI
              </div>
            )}
            <div
              className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0">
              AI
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
                <span className="ml-2 text-xs text-gray-400">{t('ai_loading')}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-4">
        <form onSubmit={handleSubmit} className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai_placeholder')}
            className="flex-1 text-sm px-3 py-2 focus:outline-none bg-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label={t('ai_send')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {t('ai_send')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>}>
      <AIChatInner />
    </Suspense>
  );
}
