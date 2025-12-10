import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { COLORS } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

const AverageSpendingChart: React.FC<Props> = ({ transactions, currency }) => {
  const [range, setRange] = useState<6 | 12>(6);

  const data = useMemo(() => {
    const now = new Date();
    // Set to end of current day to include today's transactions
    now.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - range);
    startDate.setHours(0, 0, 0, 0);

    const totals: Record<string, number> = {};

    transactions.forEach(tx => {
      // Only consider expenses
      if (tx.type !== TransactionType.EXPENSE) return;
      
      const txDate = new Date(tx.date);
      // Filter within the calculated range relative to NOW
      if (txDate >= startDate && txDate <= now) {
        totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
      }
    });

    return Object.keys(totals).map(cat => ({
      name: cat,
      value: Math.round(totals[cat] / range)
    })).sort((a, b) => b.value - a.value); // Sort descending by amount
  }, [transactions, range]);

  const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.danger, COLORS.success, '#FFCE54', '#AC92EC', '#48CFAD'];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
         <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Havi Átlagos Költés</h4>
         <div className="flex bg-gray-100 p-0.5 rounded-lg">
            <button 
              onClick={() => setRange(6)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${range === 6 ? 'bg-white shadow-sm text-primary' : 'text-textSecondary'}`}
            >
              6 Hó
            </button>
            <button 
              onClick={() => setRange(12)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${range === 12 ? 'bg-white shadow-sm text-primary' : 'text-textSecondary'}`}
            >
              12 Hó
            </button>
         </div>
      </div>

      <div className="h-[300px] w-full text-xs">
        {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-textSecondary italic">
                Nincs adat az elmúlt {range} hónapban.
            </div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E9ED" />
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={90} 
                    tick={{fill: COLORS.textSecondary, fontSize: 10}} 
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number) => new Intl.NumberFormat('hu-HU', { style: 'currency', currency }).format(value)}
                    contentStyle={{ backgroundColor: COLORS.surface, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 text-[10px] text-textSecondary text-center italic">
          Az elmúlt {range} hónap összesített adatai alapján számolva.
      </div>
    </div>
  );
};

export default AverageSpendingChart;