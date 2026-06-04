import Link from 'next/link';
import type { CountryAppRow } from '@/types';
import AppIcon from './AppIcon';

interface Props {
  rows: CountryAppRow[];
  countryName?: string;
  currency?: string;
}

export default function CountryAppPriceTable({ rows, currency }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">App</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Price {currency && `(${currency})`}</th>
            <th className="px-4 py-3 text-right font-medium">USD</th>
            <th className="px-4 py-3 text-right font-medium">CNY</th>
            <th className="px-4 py-3 text-center font-medium">Global Rank</th>
            <th className="px-4 py-3 text-center font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr
              key={row.app.id}
              className={`hover:bg-blue-50/40 transition-colors ${row.isLowest ? 'bg-green-50/60' : ''}`}
            >
              <td className="px-4 py-3">
                <Link href={`/apps/${row.app.id}`} className="flex items-center gap-3 group">
                  <AppIcon src={row.app.iconUrl} alt={row.app.name} size={36} className="w-9 h-9 rounded-lg" />
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {row.app.name}
                    </div>
                    <div className="text-xs text-gray-400">{row.app.developer}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {row.app.category}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {row.price} {row.currency}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">${row.priceUSD.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-600">¥{row.priceCNY.toFixed(2)}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-xs font-semibold ${row.rank <= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                    {row.rank}/{row.total}
                  </span>
                  {row.isLowest && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                      Best
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center text-xs text-gray-400">{row.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
