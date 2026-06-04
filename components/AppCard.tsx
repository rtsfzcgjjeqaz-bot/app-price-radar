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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
        {/* Icon – centred, large */}
        <div className="flex justify-center mb-4">
          <AppIcon
            src={app.iconUrl}
            alt={app.name}
            size={72}
            className="w-18 h-18 rounded-2xl shadow-sm"
          />
        </div>

        {/* Name + meta */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#1a6bff] transition-colors text-sm">
            {app.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{app.developer}</p>
        </div>

        {/* Lowest price – prominent */}
        {lowestPrice !== undefined ? (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {lowestPrice === 0 ? 'Free' : `$${lowestPrice.toFixed(2)}`}
            </div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {lowestCountryFlag && (
                <span className="text-sm leading-none">{lowestCountryFlag}</span>
              )}
              <span className="text-xs text-gray-400">lowest price</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-300">No data</div>
        )}
      </div>
    </Link>
  );
}
