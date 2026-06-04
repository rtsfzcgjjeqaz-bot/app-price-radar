'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, ArrowRight, LayoutList, Globe, Bot, Home } from 'lucide-react';
import { search } from '@/lib/search';

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const results = search(q);
    if (results.length === 1 && results[0].type === 'app' && results[0].app) {
      router.push(`/apps/${results[0].app.id}`);
    } else if (results.length === 1 && results[0].type === 'country' && results[0].country) {
      router.push(`/countries/${results[0].country.code}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/app-ranking', icon: LayoutList, label: 'App Ranking' },
    { href: '/country-ranking', icon: Globe, label: 'Country Ranking' },
    { href: '/ai', icon: Bot, label: 'AI Assistant' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 bg-white">
      {/* Status number */}
      <div className="text-[120px] font-extrabold leading-none text-gray-100 select-none mb-2">
        404
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Page not found
      </h1>
      <p className="text-gray-400 text-sm mb-10 text-center max-w-sm">
        The page you're looking for doesn't exist or has been moved. Try searching for an app or country below.
      </p>

      {/* Search */}
      <form onSubmit={handleSubmit} className="w-full max-w-md mb-10">
        <div className="flex items-center gap-2 border border-gray-200 rounded-2xl p-2 focus-within:border-[#1a6bff]/50 transition-colors shadow-sm">
          <Search size={16} className="ml-2 text-gray-300 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps, countries..."
            className="flex-1 text-sm bg-transparent text-gray-700 placeholder-gray-300 px-2 py-2 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-[#1a6bff] hover:bg-[#3580ff] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            Search
            <ArrowRight size={13} />
          </button>
        </div>
      </form>

      {/* Nav links */}
      <div className="flex flex-wrap justify-center gap-3">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-100 text-sm text-gray-600 hover:border-[#1a6bff]/40 hover:text-[#1a6bff] transition-colors bg-white shadow-sm"
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
