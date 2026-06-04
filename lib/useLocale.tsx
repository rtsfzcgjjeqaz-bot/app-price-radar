'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from '@/locales/en';
import { zh } from '@/locales/zh';
import type { LocaleKey } from '@/locales/en';

type Lang = 'en' | 'zh';
type Dict = typeof en;

interface LocaleCtx {
  lang: Lang;
  t: (key: LocaleKey, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LocaleCtx>({
  lang: 'en',
  t: (k) => en[k],
  setLang: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved === 'en' || saved === 'zh') setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  const dict: Dict = lang === 'zh' ? zh : en;

  const t = useCallback(
    (key: LocaleKey, vars?: Record<string, string | number>) => {
      let str = dict[key] ?? en[key];
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, String(v));
        });
      }
      return str;
    },
    [dict],
  );

  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}
