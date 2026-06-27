/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../data';
import CategoryIcon from './CategoryIcon';

interface DashboardProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
  monthlyIncome: number;
  onUpdateIncome: (newIncome: number) => void;
  viewMonth: string;
  setViewMonth: (month: string) => void;
  isDark?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, 
  onAddExpenseClick,
  monthlyIncome,
  onUpdateIncome,
  viewMonth,
  setViewMonth,
  isDark = true
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(monthlyIncome.toString());

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(incomeInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateIncome(parsed);
      setIsEditingIncome(false);
    }
  };

  // Sincronizar el input cuando cambia el ingreso desde el componente padre
  React.useEffect(() => {
    setIncomeInput(monthlyIncome.toString());
  }, [monthlyIncome]);

  // Obtener fecha de hoy y sus componentes
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Inicio de la semana (Lunes de la semana actual)
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar si es domingo
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const startOfWeek = getStartOfWeek();
  // Usar viewMonth en lugar de today
  const currentMonthYear = viewMonth; 

  // Filtrar gastos de acuerdo al periodo seleccionado
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date + 'T00:00:00');
    if (period === 'day') {
      return exp.date === todayStr;
    } else if (period === 'week') {
      return expDate >= startOfWeek;
    } else { // month
      return exp.date.startsWith(currentMonthYear);
    }
  });

  // Gasto total en el periodo
  const totalPeriodSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Gasto por categoría
  const categoryTotals = CATEGORIES.reduce((acc, cat) => {
    const total = filteredExpenses
      .filter(exp => exp.category === cat.id)
      .reduce((sum, exp) => sum + exp.amount, 0);
    acc[cat.id] = total;
    return acc;
  }, {} as Record<string, number>);

  // Ordenar categorías por las de mayor gasto
  const sortedCategories = [...CATEGORIES]
    .map(cat => ({
      ...cat,
      spent: categoryTotals[cat.id] || 0,
      percentage: totalPeriodSpent > 0 ? Math.round(((categoryTotals[cat.id] || 0) / totalPeriodSpent) * 100) : 0
    }))
    .filter(cat => cat.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // Presupuesto Total vs Consumido
  const totalMonthlyBudget = CATEGORIES.reduce((sum, cat) => sum + (cat.budget || 0), 0);
  const totalMonthlySpent = expenses
    .filter(exp => exp.date.startsWith(currentMonthYear))
    .reduce((sum, exp) => sum + exp.amount, 0);
  const budgetPercentage = Math.min(Math.round((totalMonthlySpent / totalMonthlyBudget) * 100), 100);

  // Colores dinámicos del presupuesto
  let budgetColor = 'bg-emerald-500';
  let budgetTextColor = 'text-emerald-400';
  if (budgetPercentage > 85) {
    budgetColor = 'bg-rose-500 animate-pulse';
    budgetTextColor = 'text-rose-400';
  } else if (budgetPercentage > 60) {
    budgetColor = 'bg-amber-500';
    budgetTextColor = 'text-amber-400';
  }

  // Generar datos para el gráfico circular SVG (Donut chart)
  let accumulatedPercent = 0;
  const donutSlices = sortedCategories.map((cat) => {
    const startPercent = accumulatedPercent;
    accumulatedPercent += cat.percentage;
    return {
      category: cat,
      start: startPercent,
      end: accumulatedPercent
    };
  });

  // Función para crear coordenadas de arco de círculo para el Donut Chart
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  // Helper para generar el path SVG para cada rebanada del Donut Chart
  const makeDonutSlicePath = (startPercent: number, endPercent: number) => {
    if (endPercent - startPercent >= 100) {
      return "M 0 -1 A 1 1 0 1 1 -0.0001 -1 L -0.00007 -0.7 A 0.7 0.7 0 1 0 0 -0.7 Z";
    }
    
    // Convertimos porcentajes a base 1 (0 a 1) y rotamos 90 grados en contra-reloj para que empiece arriba
    const start = startPercent / 100 - 0.25;
    const end = endPercent / 100 - 0.25;
    
    const [startX, startY] = getCoordinatesForPercent(start);
    const [endX, endY] = getCoordinatesForPercent(end);
    
    // Si la rebanada es de más de 50%, necesitamos usar el arco grande
    const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;
    
    // Path externo e interno para crear el donut
    const r1 = 1; // radio exterior
    const r2 = 0.7; // radio interior

    const startX1 = (startX * r1).toFixed(4);
    const startY1 = (startY * r1).toFixed(4);
    const endX1 = (endX * r1).toFixed(4);
    const endY1 = (endY * r1).toFixed(4);

    const startX2 = (startX * r2).toFixed(4);
    const startY2 = (startY * r2).toFixed(4);
    const endX2 = (endX * r2).toFixed(4);
    const endY2 = (endY * r2).toFixed(4);

    return `M ${startX1} ${startY1} A ${r1} ${r1} 0 ${largeArcFlag} 1 ${endX1} ${endY1} L ${endX2} ${endY2} A ${r2} ${r2} 0 ${largeArcFlag} 0 ${startX2} ${startY2} Z`;
  };

  // Mapear color Tailwind a código hexadecimal para SVG
  const getCategoryHexColor = (color: string) => {
    switch (color) {
      case 'emerald': return '#10b981';
      case 'blue': return '#3b82f6';
      case 'violet': return '#8b5cf6';
      case 'amber': return '#f59e0b';
      case 'rose': return '#f43f5e';
      case 'slate': return '#64748b';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Periodo */}
      <div className={`p-1 rounded-2xl flex items-center justify-between gap-2 transition-colors duration-300 ${
        isDark ? 'bg-slate-800' : 'bg-slate-250/60'
      }`} id="dashboard-period-selector">
        {period === 'month' && (
          <input 
            type="month" 
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            className={`px-3 py-2 text-xs font-bold border rounded-xl focus:outline-none transition-colors duration-300 ${
              isDark ? 'bg-slate-900 border-slate-700/60 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        )}
        <div className="flex-1 flex gap-1">
          <button
            onClick={() => setPeriod('day')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 ${
              period === 'day' 
                ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn-period-day"
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 ${
              period === 'week' 
                ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn-period-week"
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 ${
              period === 'month' 
                ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm font-bold'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn-period-month"
          >
            Mes
          </button>
        </div>
      </div>

      {/* Tarjeta Gasto Principal */}
      <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
          : 'bg-gradient-to-br from-emerald-600 to-teal-700'
      }`} id="card-total-spent">
        {/* Adorno visual circular de fondo */}
        <div className="absolute right-[-40px] top-[-40px] w-48 h-48 rounded-full bg-white opacity-5 pointer-events-none" />
        <div className="absolute left-[-20px] bottom-[-25px] w-32 h-32 rounded-full bg-emerald-500 opacity-10 blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-300/90">
              Gasto total {period === 'day' ? 'de hoy' : period === 'week' ? 'esta semana' : 'este mes'}
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight mt-1">
              ${totalPeriodSpent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </h1>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/5 shadow-inner">
            <CategoryIcon name="TrendingDown" className="text-rose-300" size={22} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 text-xs text-slate-100 bg-white/5 border border-white/5 rounded-xl py-2 px-3 self-start w-fit">
          <CategoryIcon name="Calendar" className="text-slate-200" size={14} />
          <span>
            {period === 'day' 
              ? 'Gastos registrados el día de hoy' 
              : period === 'week' 
                ? `Desde el lunes ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`
                : `Todo el mes actual (${today.toLocaleString('es-ES', { month: 'long' })})`
            }
          </span>
        </div>
      </div>

      {/* Módulo de Pago Mensual (Salario) */}
      <div className={`border rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in transition-colors duration-300 ${
        isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
      }`} id="card-monthly-income">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <CategoryIcon name="DollarSign" size={18} />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ingreso Mensual (Salario)</h3>
              {isEditingIncome ? (
                <form onSubmit={handleSaveIncome} className="flex items-center gap-2 mt-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">$</span>
                    <input
                      type="number"
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                      className={`pl-4 pr-1 py-1 border rounded-xl text-xs font-black w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      autoFocus
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[9px] font-bold shadow-xs hover:bg-emerald-500 transition-colors"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingIncome(false)}
                    className="px-2 py-1 bg-slate-850/60 text-slate-400 rounded-lg text-[9px] font-bold hover:bg-slate-700 transition-colors"
                  >
                    X
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ${monthlyIncome.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                  <button
                    onClick={() => {
                      setIncomeInput(monthlyIncome.toString());
                      setIsEditingIncome(true);
                    }}
                    className={`p-1 transition-all rounded-lg ${
                      isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                    title="Editar salario mensual"
                  >
                    <CategoryIcon name="Edit3" size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${monthlyIncome - totalMonthlySpent >= 0 ? 'text-emerald-500 font-extrabold' : 'text-rose-500 font-extrabold'}`}>
              Ahorro Estimado
            </span>
            <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ${(monthlyIncome - totalMonthlySpent).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Micro-analizador de porcentaje de salario gastado */}
        <div className={`rounded-2xl p-3 flex justify-between items-center text-xs transition-colors duration-300 ${
          isDark ? 'bg-slate-950/40' : 'bg-slate-50 border border-slate-100'
        }`}>
          <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <CategoryIcon name="Clock" size={14} />
            <span>Consumo de ingresos</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {monthlyIncome > 0 ? Math.round((totalMonthlySpent / monthlyIncome) * 100) : 0}%
            </span>
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-550'} font-medium`}>de tu salario habitual gastado</span>
          </div>
        </div>
      </div>

      {/* Indicador de Presupuesto Mensual */}
      <div className={`border rounded-3xl p-5 shadow-sm space-y-3 transition-colors duration-300 ${
        isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
      }`} id="card-budget-tracker">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
              <CategoryIcon name="Info" size={16} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Límite Mensual General</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Control de presupuesto offline</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-sm font-extrabold ${budgetTextColor}`}>
              {budgetPercentage}%
            </span>
            <p className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Consumido</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1">
          <div className={`w-full rounded-full h-2.5 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-500 ${budgetColor}`} 
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
          <div className={`flex justify-between text-[11px] font-semibold px-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Gastado: ${totalMonthlySpent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            <span>Meta: ${totalMonthlyBudget.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Gráfico Donut y Desglose de Categorías */}
      {filteredExpenses.length === 0 ? (
        <div className={`border rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-slate-400 border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-150'
          }`}>
            <CategoryIcon name="HelpCircle" size={28} />
          </div>
          <div className="max-w-[260px] space-y-1">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Sin gastos en este periodo</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No tienes ningún registro en este filtro de tiempo. Pulsa abajo para agregar tu primer gasto.
            </p>
          </div>
          <button 
            onClick={onAddExpenseClick}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-500 active:scale-95 transition-all"
            id="btn-add-expense-empty"
          >
            Registrar Gasto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Donut Chart Visualizer */}
          <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center md:col-span-5 space-y-4 transition-colors duration-300 ${
            isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider self-start ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Distribución visual
            </h3>
            
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Gráfico SVG de Donut real */}
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
                {donutSlices.map((slice, idx) => (
                  <path
                    key={idx}
                    d={makeDonutSlicePath(slice.start, slice.end)}
                    fill={getCategoryHexColor(slice.category.color)}
                    className="hover:scale-105 origin-center transition-all duration-300 cursor-pointer"
                  />
                ))}
                {/* Fondo central interior del donut */}
                {donutSlices.length === 0 && (
                  <circle cx="0" cy="0" r="0.9" fill={isDark ? "#0f172a" : "#f8fafc"} />
                )}
              </svg>

              {/* Texto central */}
              <div className="absolute text-center">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gastado</span>
                <p className={`text-lg font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  ${totalPeriodSpent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Micro-leyendas */}
            <div className={`flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {sortedCategories.slice(0, 3).map((cat) => (
                <div key={cat.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryHexColor(cat.color) }} />
                  <span>{cat.name} ({cat.percentage}%)</span>
                </div>
              ))}
              {sortedCategories.length > 3 && (
                <span>+{sortedCategories.length - 3} más</span>
              )}
            </div>
          </div>

          {/* Listado de Categorías Desglosado */}
          <div className={`border rounded-3xl p-5 shadow-sm md:col-span-7 space-y-4 transition-colors duration-300 ${
            isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Desglose por Categoría
              </h3>
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {sortedCategories.length} activas
              </span>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {sortedCategories.map((cat) => {
                const badgeStyles = {
                  emerald: 'bg-emerald-500/15 text-emerald-400',
                  blue: 'bg-blue-500/15 text-blue-400',
                  violet: 'bg-violet-500/15 text-violet-400',
                  amber: 'bg-amber-500/15 text-amber-400',
                  rose: 'bg-rose-500/15 text-rose-400',
                  slate: 'bg-slate-500/15 text-slate-400',
                }[cat.color] || 'bg-slate-500/15 text-slate-400';

                const lightBadgeStyles = {
                  emerald: 'bg-emerald-50 text-emerald-700',
                  blue: 'bg-blue-50 text-blue-700',
                  violet: 'bg-violet-50 text-violet-700',
                  amber: 'bg-amber-50 text-amber-700',
                  rose: 'bg-rose-50 text-rose-700',
                  slate: 'bg-slate-100 text-slate-700',
                }[cat.color] || 'bg-slate-100 text-slate-700';

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDark ? badgeStyles : lightBadgeStyles}`}>
                          <CategoryIcon name={cat.icon} size={14} />
                        </div>
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ${cat.spent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-medium ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Barra de progreso de categoría */}
                    <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: getCategoryHexColor(cat.color)
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta Informativa de Consejos Financieros Inteligentes */}
      <div className={`border rounded-3xl p-4 flex gap-3 items-start transition-colors duration-300 ${
        isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'
      }`} id="card-finance-tip">
        <div className={`p-2 rounded-2xl shadow-sm border shrink-0 transition-colors ${
          isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
        }`}>
          <CategoryIcon name="Sparkles" size={18} />
        </div>
        <div className="space-y-0.5">
          <h4 className={`text-xs font-bold ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}>Consejo de Ahorro</h4>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-emerald-300/80' : 'text-emerald-700/95'}`}>
            {totalMonthlySpent > totalMonthlyBudget * 0.8
              ? "Has consumido más del 80% de tu presupuesto mensual. Considera reducir gastos en Ocio y Diversión para mantener el equilibrio antes de fin de mes."
              : totalPeriodSpent === 0 
                ? "El hábito hace al maestro. Registra tus gastos en cuanto los realices para mantener una contabilidad personal al día de manera perfecta."
                : `Tu categoría de mayor gasto es "${sortedCategories[0]?.name || 'Alimentación'}" con $${(sortedCategories[0]?.spent || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}. Un pequeño ajuste de 10% aquí impulsará tu ahorro offline.`}
          </p>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
