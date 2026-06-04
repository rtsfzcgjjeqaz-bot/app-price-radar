import Link from 'next/link';
import type { App } from '@/types';
import AppIcon from './AppIcon';

interface Props {
  app: App;
  lowestPrice?: number;
  lowestCurrency?: string;
  lowestCountryFlag?: string;
}

export default function AppCard({ app, lowestPrice, lowestCurrency, lowestCountryFlag }: Props) {
  return (
    <Link href={`/apps/${app.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-100 transition-all duration-200">
        <div className="flex items-start gap-3">
          <AppIcon src={app.iconUrl} alt={app.name} size={56} className="w-14 h-14 rounded-xl shadow-sm" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {app.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{app.developer}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              {app.category}
            </span>
          </div>
        </div>

        {lowestPrice !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">Lowest price</span>
            <div className="flex items-center gap-1.5">
              {lowestCountryFlag && <span className="text-base">{lowestCountryFlag}</span>}
              <span className="text-sm font-bold text-green-600">
                {lowestPrice === 0 ? 'Free' : `${lowestPrice} ${lowestCurrency}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
