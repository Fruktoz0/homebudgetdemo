import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { COLORS } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

const StackedAreaChart: React.FC<Props> = ({ transactions, currency }) => {
  const data = useMemo(() => {
    // 1. Get last 12 months range
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1, 0); // End of current month
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1); // Start of 12 months ago

    // 2. Identify all categories used in expenses
    const categories = new Set<string>();
    transactions.forEach(tx => {
        if (tx.type === TransactionType.EXPENSE) categories.add(tx.category);
    });
    const categoryList = Array.from(categories);

    // 3. Initialize monthly buckets
    const monthlyData: Record<string, any> = {};
    const months: string[] = [];
    
    let tempDate = new Date(startDate);
    while (tempDate <= endDate) {
        const key = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`;
        months.push(key);
        monthlyData[key] = { name: key }; // name used for XAxis label
        categoryList.forEach(cat => monthlyData[key][cat] = 0);
        
        // Formatted label for display (e.g. "Jan")
        monthlyData[key].displayLabel = new Intl.DateTimeFormat('hu-HU', { month: 'short' }).format(tempDate);
        
        tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // 4. Fill data
    transactions.forEach(tx => {
        if (tx.type !== TransactionType.EXPENSE) return;
        const txDate = new Date(tx.date);
        if (txDate < startDate || txDate > endDate) return;

        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) {
            monthlyData[key][tx.category] = (monthlyData[key][tx.category] || 0) + tx.amount;
        }
    });

    // 5. Convert to array
    return months.map(m => monthlyData[m]);
  }, [transactions]);

  // Generate colors
  const PALETTE = [
      COLORS.primary, 
      COLORS.accent, 
      COLORS.danger, 
      COLORS.success, 
      '#FFCE54', // Yellow
      '#AC92EC', // Lavender
      '#48CFAD', // Mint
      '#EC87C0', // Pink
      '#656D78'  // Gray
  ];

  // Get categories from first data point to generate layers
  const areaKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name' && k !== 'displayLabel') : [];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-4">
         <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Életmód Infláció (Trend)</h4>
         <p className="text-[10px] text-textSecondary">Kiadások összetétele az elmúlt 12 hónapban.</p>
      </div>

      <div className="h-[300px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
                {areaKeys.map((key, index) => (
                    <linearGradient key={`grad-${key}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE[index % PALETTE.length]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={PALETTE[index % PALETTE.length]} stopOpacity={0.1}/>
                    </linearGradient>
                ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E9ED" />
            <XAxis 
                dataKey="displayLabel" 
                tick={{fill: COLORS.textSecondary, fontSize: 10}} 
                axisLine={false}
                tickLine={false}
                interval={1} // Skip every other label if crowded
            />
            <YAxis 
                tick={{fill: COLORS.textSecondary, fontSize: 10}} 
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
            />
            <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)}
                contentStyle={{ backgroundColor: COLORS.surface, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                labelStyle={{ color: COLORS.textPrimary, fontWeight: 'bold', marginBottom: '5px' }}
            />
            {areaKeys.map((key, index) => (
                <Area 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stackId="1" 
                    stroke={PALETTE[index % PALETTE.length]} 
                    fill={`url(#color-${index})`} 
                />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StackedAreaChart;