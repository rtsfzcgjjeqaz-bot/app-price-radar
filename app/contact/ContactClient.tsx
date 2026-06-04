'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/useLocale';

export default function ContactClient() {
  const { t } = useLocale();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('contact_title')}</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-1">{t('contact_email_label')}</div>
        <a href="mailto:hello@apppriceradar.com" className="text-blue-600 hover:underline text-sm">
          hello@apppriceradar.com
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('contact_feedback_title')}</h2>
        {sent ? (
          <div className="text-green-600 font-medium py-8 text-center">{t('contact_sent')}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={t('contact_name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder={t('contact_email_input')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              rows={5}
              placeholder={t('contact_message')}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {t('contact_submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
