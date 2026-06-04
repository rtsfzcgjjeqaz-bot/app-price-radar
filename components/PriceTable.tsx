import type { PriceRow } from '@/types';

interface Props {
  rows: PriceRow[];
}

export default function PriceTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Rank</th>
            <th className="px-4 py-3 text-left font-medium">Country / Region</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">USD</th>
            <th className="px-4 py-3 text-right font-medium">CNY</th>
            <th className="px-4 py-3 text-center font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr
              key={row.country.code}
              className={`hover:bg-blue-50/40 transition-colors ${row.isLowest ? 'bg-green-50/60' : ''}`}
            >
              <td className="px-4 py-3">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                  row.rank === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {row.rank}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{row.country.flag}</span>
                  <div>
                    <div className="font-medium text-gray-900">{row.country.name}</div>
                    <div className="text-xs text-gray-400">{row.country.currency}</div>
                  </div>
                  {row.isLowest && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                      Lowest
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {row.price} {row.currency}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                ${row.priceUSD.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                ¥{row.priceCNY.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-center text-xs text-gray-400">
                {row.updatedAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
