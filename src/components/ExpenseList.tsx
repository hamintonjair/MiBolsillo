/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../data';
import CategoryIcon from './CategoryIcon';

interface ExpenseListProps {
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteExpensesBulk: (type: 'weeks' | 'months') => void;
  isDark?: boolean;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  onEditExpense, 
  onDeleteExpense,
  onDeleteExpensesBulk,
  isDark = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [datePreset, setDatePreset] = useState<string>('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeItem, setActiveItem] = useState<string | null>(null); // To toggle actions drawer on mobile
  
  // Generar fecha actual y cálculos de rangos
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().slice(0, 7);

  // Estado para el mes de consulta en el Historial (por defecto, el mes actual)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Obtener todos los meses con actividad registrada de forma única
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);
    expenses.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        months.add(exp.date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonthStr]);

  // Formatear mes en español amigable
  const formatMonthName = (monthStr: string) => {
    if (monthStr === currentMonthStr) {
      return `Mes Actual (${new Date(monthStr + '-02T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())})`;
    }
    const dateObj = new Date(monthStr + '-02T00:00:00');
    return dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estado para colapsar/expandir el panel de Limpieza Masiva
  const [showCleanupPanel, setShowCleanupPanel] = useState(false);

  const getPastDateString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Resetear a la primera página si cambian los filtros de búsqueda, categoría, fecha o mes seleccionado
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, datePreset, customStartDate, customEndDate, selectedMonth]);

  // Filtrar los gastos según la entrada del usuario
  const filteredExpenses = expenses.filter(exp => {
    // 1. Filtrar por término de búsqueda (descripción)
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (CATEGORIES.find(c => c.id === exp.category)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Filtrar por categoría
    const matchesCategory = selectedCategory === 'todos' || exp.category === selectedCategory;

    // 3. Filtrar por fecha o rango
    let matchesDate = true;
    if (datePreset === 'hoy') {
      matchesDate = exp.date === todayStr;
    } else if (datePreset === 'semana') {
      const sevenDaysAgo = getPastDateString(7);
      matchesDate = exp.date >= sevenDaysAgo && exp.date <= todayStr;
    } else if (datePreset === 'mes') {
      const currentMonthYear = today.toISOString().slice(0, 7); // 'YYYY-MM'
      matchesDate = exp.date.startsWith(currentMonthYear);
    } else if (datePreset === 'personalizado') {
      if (customStartDate && customEndDate) {
        matchesDate = exp.date >= customStartDate && exp.date <= customEndDate;
      } else if (customStartDate) {
        matchesDate = exp.date >= customStartDate;
      } else if (customEndDate) {
        matchesDate = exp.date <= customEndDate;
      }
    }

    // 4. Filtrar por el mes seleccionado
    const matchesMonth = selectedMonth === 'todos' || exp.date.startsWith(selectedMonth);

    return matchesSearch && matchesCategory && matchesDate && matchesMonth;
  });

  // Ordenar de más reciente a más antiguo
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    return new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime();
  });

  // Calcular límites de Paginación
  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + itemsPerPage);

  // Agrupar gastos de la página actual por fecha para mostrarlos organizados cronológicamente
  const groupExpensesByDate = () => {
    const groups: Record<string, Expense[]> = {};
    paginatedExpenses.forEach(exp => {
      if (!groups[exp.date]) {
        groups[exp.date] = [];
      }
      groups[exp.date].push(exp);
    });
    return groups;
  };

  const groupedExpenses = groupExpensesByDate();

  // Calcular el número de gastos antiguos para la limpieza masiva
  const sevenDaysAgoStr = getPastDateString(7);
  const currentMonthStartStr = today.toISOString().slice(0, 7) + '-01';

  const olderWeeksCount = expenses.filter(exp => exp.date < sevenDaysAgoStr).length;
  const olderMonthsCount = expenses.filter(exp => exp.date < currentMonthStartStr).length;

  // Helper para formatear títulos de fecha humanizados
  const formatGroupHeader = (dateStr: string) => {
    const expDate = new Date(dateStr + 'T00:00:00');
    const todayString = new Date().toISOString().split('T')[0];
    
    // Calcular ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    if (dateStr === todayString) return 'Hoy';
    if (dateStr === yesterdayString) return 'Ayer';

    // Retorna algo como "Lunes, 22 de Junio"
    return expDate.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).replace(/^\w/, c => c.toUpperCase());
  };

  // Encontrar datos de categoría correspondientes a un ID
  const getCategoryDetails = (catId: string): Category => {
    const found = CATEGORIES.find(c => c.id === catId);
    return found || {
      id: 'otros',
      name: 'Otros',
      icon: 'Package',
      color: 'slate',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-700'
    };
  };

  // Helper para generar los estilos de los chips de categoría
  const getBadgeStyles = (color: string, isActive: boolean) => {
    if (isDark) {
      const maps = {
        emerald: isActive ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40 border border-emerald-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
        blue: isActive ? 'bg-blue-500/20 text-blue-300 ring-2 ring-blue-500/40 border border-blue-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
        violet: isActive ? 'bg-violet-500/20 text-violet-300 ring-2 ring-violet-500/40 border border-violet-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
        amber: isActive ? 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/40 border border-amber-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
        rose: isActive ? 'bg-rose-500/20 text-rose-300 ring-2 ring-rose-500/40 border border-rose-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
        slate: isActive ? 'bg-slate-500/20 text-slate-300 ring-2 ring-slate-500/40 border border-slate-500/30' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white',
      };
      return maps[color as keyof typeof maps] || (isActive ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white');
    } else {
      const maps = {
        emerald: isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
        blue: isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
        violet: isActive ? 'bg-violet-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
        amber: isActive ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
        rose: isActive ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
        slate: isActive ? 'bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950',
      };
      return maps[color as keyof typeof maps] || (isActive ? 'bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950');
    }
  };

  // Helper para generar los estilos de color de categorías (icono) según el tema
  const getCategoryColorClasses = (color: string) => {
    if (isDark) {
      const maps = {
        emerald: 'bg-emerald-500/15 text-emerald-400',
        blue: 'bg-blue-500/15 text-blue-400',
        violet: 'bg-violet-500/15 text-violet-400',
        amber: 'bg-amber-500/15 text-amber-400',
        rose: 'bg-rose-500/15 text-rose-400',
        slate: 'bg-slate-500/15 text-slate-400',
      };
      return maps[color as keyof typeof maps] || 'bg-slate-500/15 text-slate-400';
    } else {
      const maps = {
        emerald: 'bg-emerald-50 text-emerald-700',
        blue: 'bg-blue-50 text-blue-700',
        violet: 'bg-violet-50 text-violet-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
        slate: 'bg-slate-100 text-slate-700',
      };
      return maps[color as keyof typeof maps] || 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector Principal de Mes de Consulta (Evita mezcla de meses) */}
      <div className={`border rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-300 ${
        isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150 shadow-2xs'
      }`} id="month-selector-ledger">
        <div className="space-y-0.5">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Periodo de Consulta
          </span>
          <h3 className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {selectedMonth === 'todos' ? 'Mostrando todos los gastos registrados' : `Mostrando desglose de: ${formatMonthName(selectedMonth)}`}
          </h3>
        </div>
        <div className="relative min-w-[180px]">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`w-full p-2.5 pr-8 border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors appearance-none ${
              isDark ? 'bg-slate-900 border-slate-700/60 text-slate-200 focus:bg-slate-950' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
            }`}
          >
            <option value="todos">Todos los meses (Historial completo)</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthName(m)}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <CategoryIcon name="ChevronDown" size={14} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors duration-300 ${
        isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
      }`} id="filters-container">
        {/* Caja de Búsqueda */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-700/60 text-white placeholder-slate-500 focus:bg-slate-950' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'
            }`}
            id="input-search"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <CategoryIcon name="Filter" size={14} />
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 font-bold"
            >
              <CategoryIcon name="X" size={14} />
            </button>
          )}
        </div>

        {/* Filtro de Categorías con Desplazamiento Horizontal (Chips) */}
        <div className="space-y-1.5">
          <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Filtrar por Categoría
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800 select-none" id="category-chips">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'todos'
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950'
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${getBadgeStyles(cat.color, selectedCategory === cat.id)}`}
              >
                <CategoryIcon name={cat.icon} size={12} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Selector de Presets */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filtrar por Fecha
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className={`w-full p-2.5 border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                isDark ? 'bg-slate-900 border-slate-700/60 text-slate-200 focus:bg-slate-950' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
              }`}
            >
              <option value="todos">Cualquier fecha</option>
              <option value="hoy">Gastar hoy</option>
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Este mes</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
          </div>

          {/* Rango Personalizado de Fechas (Si está seleccionado) */}
          {datePreset === 'personalizado' && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Inicio</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-700/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Fin</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-700/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Panel de Limpieza Masiva de Historial Antiguo */}
      <div className={`border rounded-3xl p-4 shadow-sm space-y-3 animate-fade-in transition-colors duration-300 ${
        isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
      }`} id="cleanup-container">
        <button
          onClick={() => setShowCleanupPanel(!showCleanupPanel)}
          className={`w-full flex items-center justify-between text-xs font-bold transition-colors py-1 px-1 ${
            isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
              <CategoryIcon name="Trash2" size={12} />
            </div>
            <span>Herramientas de Limpieza Masiva</span>
          </div>
          <CategoryIcon 
            name="ChevronRight" 
            size={16} 
            className={`text-slate-400 transition-transform duration-200 ${showCleanupPanel ? 'rotate-90' : ''}`}
          />
        </button>

        {showCleanupPanel && (
          <div className={`pt-2 border-t space-y-2.5 animate-fade-in ${isDark ? 'border-slate-800' : 'border-slate-150'}`}>
            <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Libera espacio eliminando de forma permanente registros de gastos antiguos. Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (olderWeeksCount === 0) return;
                  if (confirm('¿Estás seguro de que deseas eliminar permanentemente todos los gastos registrados de semanas anteriores (más de 7 días atrás)?')) {
                    onDeleteExpensesBulk('weeks');
                  }
                }}
                disabled={olderWeeksCount === 0}
                className={`py-2 px-3 border rounded-xl text-[10px] font-black transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  olderWeeksCount > 0
                    ? 'border-rose-950/40 bg-rose-950/15 hover:bg-rose-950/30 text-rose-450 active:scale-95'
                    : isDark ? 'border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed' : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Semanas anteriores</span>
                <span className="font-extrabold text-[9px] opacity-80">({olderWeeksCount} registros)</span>
              </button>

              <button
                onClick={() => {
                  if (olderMonthsCount === 0) return;
                  if (confirm('¿Estás seguro de que deseas eliminar permanentemente todos los gastos de meses anteriores (anteriores al 1 de este mes)?')) {
                    onDeleteExpensesBulk('months');
                  }
                }}
                disabled={olderMonthsCount === 0}
                className={`py-2 px-3 border rounded-xl text-[10px] font-black transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  olderMonthsCount > 0
                    ? 'border-rose-950/40 bg-rose-950/15 hover:bg-rose-950/30 text-rose-450 active:scale-95'
                    : isDark ? 'border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed' : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Meses anteriores</span>
                <span className="font-extrabold text-[9px] opacity-80">({olderMonthsCount} registros)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Gastos con Estilo Ledger */}
      <div className="space-y-4" id="expenses-ledger">
        {Object.keys(groupedExpenses).length === 0 ? (
          <div className={`border rounded-3xl p-10 text-center space-y-3 transition-colors duration-300 ${
            isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-slate-400 mx-auto border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-150'
            }`}>
              <CategoryIcon name="Info" size={20} />
            </div>
            <div className="space-y-1">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No se encontraron gastos</h3>
              <p className={`text-xs leading-relaxed max-w-[280px] mx-auto ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>
                No hay ningún gasto registrado que coincida con los criterios de búsqueda o filtros seleccionados.
              </p>
            </div>
            {(searchTerm || selectedCategory !== 'todos' || datePreset !== 'todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('todos');
                  setDatePreset('todos');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors active:scale-95 ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-250 text-slate-700 border border-slate-200'
                }`}
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {Object.entries(groupedExpenses).map(([dateStr, items]) => {
              // Calcular el total gastado en ese día específico
              const dailyTotal = items.reduce((sum, item) => sum + item.amount, 0);

              return (
                <div key={dateStr} className="space-y-2 animate-fade-in">
                  {/* Cabecera del día */}
                  <div className="flex justify-between items-center px-1.5 text-xs font-bold">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{formatGroupHeader(dateStr)}</span>
                    <span className={`font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>-${dailyTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                  </div>

                  {/* Tarjetas de gastos de ese día */}
                  <div className={`border rounded-3xl overflow-hidden shadow-sm divide-y transition-colors duration-300 ${
                    isDark ? 'bg-slate-800/40 border-slate-800 divide-slate-800' : 'bg-white border-slate-150 divide-slate-100'
                  }`}>
                    {items.map((exp) => {
                      const cat = getCategoryDetails(exp.category);
                      const isExpanded = activeItem === exp.id;

                      return (
                        <div 
                          key={exp.id} 
                          className={`transition-all duration-200 ${
                            isExpanded 
                              ? isDark ? 'bg-slate-800/80' : 'bg-slate-50' 
                              : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/50'
                          }`}
                          id={`expense-item-${exp.id}`}
                        >
                          {/* Fila Principal */}
                          <div 
                            onClick={() => setActiveItem(isExpanded ? null : exp.id)}
                            className="p-4 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-2xl shrink-0 ${getCategoryColorClasses(cat.color)}`}>
                                <CategoryIcon name={cat.icon} size={16} />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className={`text-xs font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                  {exp.description || cat.name}
                                </h4>
                                {exp.description && (
                                  <span className={`text-[10px] font-semibold block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>
                                    {cat.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                -${exp.amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </span>
                              <CategoryIcon 
                                name="ChevronRight" 
                                className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                                size={16} 
                              />
                            </div>
                          </div>

                          {/* Fila de Acciones Desplegables */}
                          {isExpanded && (
                            <div className={`px-4 py-2.5 flex justify-end gap-2 border-t animate-fade-in ${
                              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
                            }`} id={`expense-actions-${exp.id}`}>
                              <button
                                onClick={() => {
                                  onEditExpense(exp);
                                  setActiveItem(null);
                                }}
                                className={`px-3 py-1.5 border text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs ${
                                  isDark 
                                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                                id={`btn-edit-${exp.id}`}
                              >
                                <CategoryIcon name="Edit3" size={12} className="text-slate-450" />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('¿Estás seguro de que deseas eliminar este gasto de forma permanente?')) {
                                    onDeleteExpense(exp.id);
                                    setActiveItem(null);
                                  }
                                }}
                                className={`px-3 py-1.5 border text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs ${
                                  isDark 
                                    ? 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/40 text-rose-400' 
                                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-750'
                                }`}
                                id={`btn-delete-${exp.id}`}
                              >
                                <CategoryIcon name="Trash2" size={12} className="text-rose-500" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between border rounded-2xl p-3 shadow-xs mt-2 transition-colors duration-300 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-150'
              }`} id="pagination-controls">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    currentPage === 1
                      ? 'text-slate-400 cursor-not-allowed opacity-50'
                      : isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                  }`}
                  id="btn-pagination-prev"
                >
                  <span className="text-[13px]">←</span>
                  <span>Anterior</span>
                </button>

                <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Página <span className={isDark ? 'text-white' : 'text-slate-900'}>{currentPage}</span> de <span className={isDark ? 'text-white' : 'text-slate-900'}>{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    currentPage === totalPages
                      ? 'text-slate-400 cursor-not-allowed opacity-50'
                      : isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                  }`}
                  id="btn-pagination-next"
                >
                  <span>Siguiente</span>
                  <span className="text-[13px]">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
