import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  currentDate: Date;
  mode: 'MONTHLY' | 'CUSTOM'; // If monthly, we show calendar view. If custom/year, we show horizontal strip.
  currency: string;
}

const HeatmapChart: React.FC<Props> = ({ transactions, currentDate, mode, currency }) => {
  // Helpers
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);

  const formatDay = (date: Date) => date.getDate();

  // 1. Process Data
  const { dailyExpenses, maxExpense } = useMemo(() => {
    const map: Record<string, number> = {};
    let max = 0;

    // Filter relevant transactions based on mode
    transactions.forEach(tx => {
      if (tx.type === TransactionType.EXPENSE) {
        const txDate = new Date(tx.date);
        
        let include = false;
        if (mode === 'MONTHLY') {
            // Check if same month and year
            if (txDate.getMonth() === currentDate.getMonth() && txDate.getFullYear() === currentDate.getFullYear()) {
                include = true;
            }
        } else {
            // Include everything for year view (or maybe just current year)
            if (txDate.getFullYear() === currentDate.getFullYear()) {
                include = true;
            }
        }

        if (include) {
            const dateKey = tx.date; // YYYY-MM-DD
            map[dateKey] = (map[dateKey] || 0) + Number(tx.amount);
            if (map[dateKey] > max) max = map[dateKey];
        }
      }
    });

    return { dailyExpenses: map, maxExpense: max };
  }, [transactions, currentDate, mode]);

  // Calculate Level (0-4)
  const getLevel = (value: number) => {
      if (value === 0) return 0;
      if (maxExpense === 0) return 0;
      if (value <= maxExpense * 0.25) return 1;
      if (value <= maxExpense * 0.50) return 2;
      if (value <= maxExpense * 0.75) return 3;
      return 4;
  };

  // Color Palette (Red for Expenses)
  const getLevelColor = (level: number) => {
      switch (level) {
          case 1: return '#ffcdd2'; // Very Light Red
          case 2: return '#ef9a9a'; // Light Red
          case 3: return '#e57373'; // Medium Red
          case 4: return '#c62828'; // Dark Red
          default: return '#EBEDF0'; // Gray (Empty)
      }
  };

  // --- RENDER MONTHLY VIEW (Calendar Grid) ---
  if (mode === 'MONTHLY') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      // Determine starting empty slots (Monday based)
      // getDay: 0=Sun, 1=Mon...
      let startDay = firstDayOfMonth.getDay() - 1;
      if (startDay === -1) startDay = 6;

      const daysInMonth = lastDayOfMonth.getDate();
      const totalSlots = startDay + daysInMonth;
      const rows = Math.ceil(totalSlots / 7);

      const grid = [];
      let dayCounter = 1;

      for (let i = 0; i < rows; i++) {
          const row = [];
          for (let j = 0; j < 7; j++) {
              if ((i === 0 && j < startDay) || dayCounter > daysInMonth) {
                  row.push(null); // Empty slot
              } else {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
                  const value = dailyExpenses[dateStr] || 0;
                  row.push({ day: dayCounter, value, level: getLevel(value), dateStr });
                  dayCounter++;
              }
          }
          grid.push(row);
      }

      const weekDays = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];

      return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4">
                {new Intl.DateTimeFormat('hu-HU', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h4>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {weekDays.map(d => <div key={d} className="text-[10px] text-textSecondary font-bold">{d}</div>)}
            </div>

            <div className="flex flex-col gap-1">
                {grid.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-7 gap-1 h-8">
                        {row.map((cell, cIdx) => (
                            cell ? (
                                <div 
                                    key={cIdx} 
                                    className="rounded-md flex items-center justify-center text-[10px] relative group transition-transform hover:scale-110 hover:z-10"
                                    style={{ 
                                        backgroundColor: getLevelColor(cell.level),
                                        color: cell.level > 2 ? 'white' : '#434A54',
                                        fontWeight: cell.value > 0 ? 'bold' : 'normal'
                                    }}
                                >
                                    {cell.day}
                                    {cell.value > 0 && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-20 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-1 rounded pointer-events-none shadow-lg">
                                            <div>{formatMoney(cell.value)}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div key={cIdx}></div>
                            )
                        ))}
                    </div>
                ))}
            </div>
            {maxExpense > 0 && (
                <div className="mt-3 text-[10px] text-textSecondary text-center">
                    Legnagyobb napi költés: <span className="font-bold text-danger">{formatMoney(maxExpense)}</span>
                </div>
            )}
        </div>
      );
  }

  // --- RENDER YEARLY/CUSTOM VIEW (Github Style Horizontal) ---
  // Re-using the previous logic but simplified for the "Year" context or just current year
  const year = currentDate.getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const weeks: { date: string; value: number; level: number }[][] = [];
  let currentWeek: { date: string; value: number; level: number }[] = [];

  let startDayOfWeek = startDate.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  for (let i = 0; i < startDayOfWeek; i++) currentWeek.push({ date: '', value: 0, level: 0 });

  const iterDate = new Date(startDate);
  while (iterDate <= endDate) {
      const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
      const value = dailyExpenses[dateStr] || 0;
      currentWeek.push({ date: dateStr, value, level: getLevel(value) });

      if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
      }
      iterDate.setDate(iterDate.getDate() + 1);
  }
  if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push({ date: '', value: 0, level: 0 });
      weeks.push(currentWeek);
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Éves Áttekintés ({year})</h4>
            <div className="flex items-center gap-1 text-[10px] text-textSecondary">
                <div className="w-2 h-2 rounded-[2px]" style={{background: getLevelColor(0)}}></div>
                <div className="w-2 h-2 rounded-[2px]" style={{background: getLevelColor(2)}}></div>
                <div className="w-2 h-2 rounded-[2px]" style={{background: getLevelColor(4)}}></div>
            </div>
        </div>
        <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-[3px]">
                {weeks.map((week, wIndex) => (
                    <div key={wIndex} className="flex flex-col gap-[3px]">
                        {week.map((day, dIndex) => (
                            <div 
                                key={dIndex}
                                className="w-[10px] h-[10px] rounded-[2px]"
                                style={{ backgroundColor: getLevelColor(day.level) }}
                                title={day.date ? `${day.date}: ${formatMoney(day.value)}` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default HeatmapChart;