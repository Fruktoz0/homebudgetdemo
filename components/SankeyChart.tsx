import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { COLORS } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const { name, value, source, target } = payload[0].payload;
    const formatMoney = (val: number) => 
      new Intl.NumberFormat('hu-HU', { style: 'currency', currency }).format(val);

    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
        {source && target ? (
          // Link tooltip
          <>
            <div className="font-bold text-textPrimary mb-1">{source.name} <span className="text-gray-400">→</span> {target.name}</div>
            <div className="text-primary font-bold">{formatMoney(value)}</div>
          </>
        ) : (
          // Node tooltip
          <>
             <div className="font-bold text-textPrimary mb-1">{name}</div>
             <div className="text-primary font-bold">{formatMoney(value)}</div>
          </>
        )}
      </div>
    );
  }
  return null;
};

const SankeyChart: React.FC<Props> = ({ transactions, currency }) => {
  const data = useMemo(() => {
    // 1. Calculate totals per category
    const incomeTotals: Record<string, number> = {};
    const expenseTotals: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) {
        incomeTotals[tx.category] = (incomeTotals[tx.category] || 0) + amount;
        totalIncome += amount;
      } else {
        expenseTotals[tx.category] = (expenseTotals[tx.category] || 0) + amount;
        totalExpense += amount;
      }
    });

    if (totalIncome === 0 && totalExpense === 0) return { nodes: [], links: [] };

    // 2. Create Nodes
    // Structure: [Income Categories..., "Költségvetés", Expense Categories..., "Megtakarítás" (if surplus)]
    const nodes: { name: string, type: 'income' | 'hub' | 'expense' | 'saving' }[] = [];
    
    // Income Nodes (indices 0 to N-1)
    const incomeCategories = Object.keys(incomeTotals);
    incomeCategories.forEach(cat => nodes.push({ name: cat, type: 'income' }));

    // Hub Node
    const hubIndex = nodes.length;
    nodes.push({ name: 'Pénztárca', type: 'hub' });

    // Expense Nodes
    const expenseCategories = Object.keys(expenseTotals);
    const expenseStartIndex = nodes.length;
    expenseCategories.forEach(cat => nodes.push({ name: cat, type: 'expense' }));

    // Savings Node (if needed)
    let savingIndex = -1;
    if (totalIncome > totalExpense) {
      savingIndex = nodes.length;
      nodes.push({ name: 'Megtakarítás', type: 'saving' });
    }

    // 3. Create Links
    const links: { source: number, target: number, value: number }[] = [];

    // Income -> Hub
    incomeCategories.forEach((cat, idx) => {
      links.push({
        source: idx,
        target: hubIndex,
        value: incomeTotals[cat]
      });
    });

    // Hub -> Expenses
    expenseCategories.forEach((cat, idx) => {
      links.push({
        source: hubIndex,
        target: expenseStartIndex + idx,
        value: expenseTotals[cat]
      });
    });

    // Hub -> Saving (Surplus)
    if (savingIndex !== -1) {
      links.push({
        source: hubIndex,
        target: savingIndex,
        value: totalIncome - totalExpense
      });
    }

    return { nodes, links };
  }, [transactions]);

  if (data.nodes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-textSecondary text-sm bg-gray-50 rounded-xl border border-gray-100">
        Nincs elegendő adat a diagramhoz ebben az időszakban.
      </div>
    );
  }

  // Custom Node Renderer
  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const isIncome = payload.type === 'income';
    const isExpense = payload.type === 'expense';
    const isHub = payload.type === 'hub';
    const isSaving = payload.type === 'saving';

    let fill = COLORS.textSecondary;
    if (isIncome) fill = COLORS.success;
    if (isExpense) fill = COLORS.danger;
    if (isHub) fill = COLORS.primary;
    if (isSaving) fill = COLORS.accent;

    return (
      <Layer key={`node-${index}`}>
        <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} radius={4} />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize={10}
          fontWeight="bold"
          style={{ pointerEvents: 'none', textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}
          transform={width < 60 ? `rotate(-90 ${x + width/2} ${y + height/2})` : undefined}
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  return (
    <div className="h-[400px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
      <h4 className="text-center text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Pénzmozgások (Sankey)</h4>
      <ResponsiveContainer width="100%" height="90%">
        <Sankey
          data={data}
          node={renderNode}
          nodePadding={50}
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
          link={{ stroke: '#E6E9ED', strokeOpacity: 0.6 }}
        >
          <Tooltip content={<CustomTooltip currency={currency} />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};

export default SankeyChart;