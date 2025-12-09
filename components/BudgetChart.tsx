import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { COLORS } from '../constants';

interface Props {
  transactions: Transaction[];
}

const BudgetChart: React.FC<Props> = ({ transactions }) => {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    return Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat]
    }));
  }, [transactions]);

  const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.danger, COLORS.success, '#FFCE54', '#AC92EC', '#48CFAD'];

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-textSecondary text-sm bg-background rounded-full mx-10">
        Nincs adat ebben a hónapban
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF' }).format(value)}
            contentStyle={{ backgroundColor: COLORS.surface, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetChart;