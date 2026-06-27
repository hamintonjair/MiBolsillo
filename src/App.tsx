/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, Category } from './types';
import { INITIAL_EXPENSES, CATEGORIES } from './data';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CategoryIcon from './components/CategoryIcon';
import { Preferences } from '@capacitor/preferences';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'add'>('dashboard');
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  
  // Nuevo estado para el mes que se está visualizando
  const [viewMonth, setViewMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  
  const [monthlyIncome, setMonthlyIncome] = useState<number>(1500000);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Reloj simulador de la barra de estado móvil
  const [time, setTime] = useState<string>('12:00');

  // Trigger custom in-app notification
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Función para borrar de forma masiva registros antiguos
  const handleDeleteExpensesBulk = (type: 'weeks' | 'months') => {
    const today = new Date();
    let cutoffDateStr = '';

    if (type === 'weeks') {
      // Gastos de semanas anteriores (más antiguos de 7 días atrás)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoffDateStr = cutoff.toISOString().split('T')[0];
    } else if (type === 'months') {
      // Gastos de meses anteriores (más antiguos que el día 1 del mes actual)
      cutoffDateStr = today.toISOString().slice(0, 7) + '-01';
    }

    const updated = expenses.filter(exp => {
      // Conservamos los gastos cuya fecha es mayor o igual a la de corte
      return exp.date >= cutoffDateStr;
    });

    const deletedCount = expenses.length - updated.length;
    if (deletedCount > 0) {
      saveExpensesToStorage(updated);
      triggerNotification(`Se eliminaron ${deletedCount} registros anteriores con éxito.`, 'success');
    } else {
      triggerNotification('No se encontraron registros anteriores para eliminar en este rango.', 'info');
    }
  };

  // Cargar ingresos mensuales de forma asíncrona desde Capacitor Preferences
  useEffect(() => {
    const loadIncome = async () => {
      const incomeKey = `monthly_income_${viewMonth}`;
      try {
        const { value } = await Preferences.get({ key: incomeKey });
        if (value) {
          setMonthlyIncome(parseFloat(value));
        } else {
          // Valor por defecto inicial
          setMonthlyIncome(1500000);
          await Preferences.set({ key: incomeKey, value: '1500000' });
        }
      } catch (e) {
        // Fallback robusto a localStorage por si acaso
        const saved = localStorage.getItem(incomeKey);
        if (saved) {
          setMonthlyIncome(parseFloat(saved));
        } else {
          setMonthlyIncome(1500000);
          localStorage.setItem(incomeKey, '1500000');
        }
      }
    };
    loadIncome();
  }, [viewMonth]);

  // Función para actualizar y persistir los ingresos mensuales
  const handleUpdateIncome = async (newIncome: number) => {
    setMonthlyIncome(newIncome);
    const incomeKey = `monthly_income_${viewMonth}`;
    try {
      await Preferences.set({ key: incomeKey, value: newIncome.toString() });
    } catch (e) {
      localStorage.setItem(incomeKey, newIncome.toString());
    }
  };

  // Inicializar reloj
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
      const hoursStr = hours < 10 ? '0' + hours : hours.toString();
      setTime(`${hoursStr}:${minutesStr}`);
    };
    
    updateClock();
    const interval = setInterval(updateClock, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  // Cargar datos iniciales de localStorage
  useEffect(() => {
    try {
      const storedExpenses = localStorage.getItem('expenses');
      if (storedExpenses) {
        const parsed = JSON.parse(storedExpenses);
        // Si contiene los registros semilla iniciales (que empiezan con 'exp-'), limpiamos para dejar la app vacía
        if (Array.isArray(parsed) && parsed.some((exp: Expense) => exp.id && exp.id.startsWith('exp-'))) {
          setExpenses([]);
          localStorage.setItem('expenses', JSON.stringify([]));
        } else {
          setExpenses(parsed);
        }
      } else {
        // Por defecto arranca completamente vacía
        setExpenses([]);
        localStorage.setItem('expenses', JSON.stringify([]));
      }
    } catch (e) {
      console.error('Error al leer de localStorage:', e);
      setExpenses([]);
    }
  }, []);

  // Persistir cambios en localStorage cada vez que el estado cambie
  const saveExpensesToStorage = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    try {
      localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    } catch (e) {
      console.error('Error al escribir en localStorage:', e);
    }
  };

  // Acción para crear o actualizar un registro
  const handleSaveExpense = (formData: Omit<Expense, 'id'> & { id?: string }) => {
    let updated: Expense[];
    
    if (formData.id) {
      // Editar registro existente
      updated = expenses.map(exp => 
        exp.id === formData.id 
          ? { ...exp, amount: formData.amount, category: formData.category, date: formData.date, description: formData.description }
          : exp
      );
      setExpenseToEdit(null); // Resetear edición
      triggerNotification('¡Gasto actualizado con éxito!', 'success');
    } else {
      // Crear nuevo registro
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        amount: formData.amount,
        category: formData.category,
        date: formData.date,
        description: formData.description
      };
      updated = [newExpense, ...expenses];
      triggerNotification('¡Gasto registrado con éxito!', 'success');
    }

    saveExpensesToStorage(updated);
    // Redirigir a la pestaña correspondiente
    setCurrentTab('history');
  };

  // Acción para eliminar un registro
  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(exp => exp.id !== id);
    saveExpensesToStorage(updated);
    triggerNotification('El registro de gasto fue eliminado.', 'info');
    
    // Si estábamos editando el gasto eliminado, cancelar edición
    if (expenseToEdit && expenseToEdit.id === id) {
      setExpenseToEdit(null);
    }
  };

  // Acción para iniciar la edición de un registro
  const handleStartEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setCurrentTab('add'); // Cambiar a la pestaña de formulario
  };

  // Cancelar la edición activa
  const handleCancelEdit = () => {
    setExpenseToEdit(null);
    setCurrentTab('history');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center py-0 sm:py-8 font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`} id="main-app-container">
      {/* Contenedor Mock de Smartphone Premium */}
      <div 
        className={`w-full h-screen sm:h-[calc(100vh-48px)] sm:max-h-[820px] sm:min-h-[580px] sm:rounded-[40px] sm:shadow-2xl sm:border-[8px] flex flex-col overflow-hidden relative transition-all duration-300 ${
          isDark 
            ? 'bg-slate-900 sm:border-slate-950 shadow-black/80 text-white' 
            : 'bg-slate-50 sm:border-slate-900 shadow-slate-200/50 text-slate-800'
        }`}
        id="smartphone-bezel"
      >
        {/* Barra de Estado Móvil Simulada (Solo se ve en PC/Escritorio) */}
        <div className={`hidden sm:flex px-6 pt-3 pb-2 justify-between items-center text-[11px] font-black tracking-tight select-none z-10 shrink-0 transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`} id="simulated-status-bar">
          <div className="flex items-center gap-1">
            <span className={`font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{time}</span>
          </div>
          {/* Isla/Notch simulado en desktop */}
          <div className={`hidden sm:block w-28 h-4.5 rounded-full absolute left-1/2 -translate-x-1/2 top-2 ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`} />
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <CategoryIcon name="Wifi" size={12} />
            <span className="text-[9px]">5G</span>
            <CategoryIcon name="Battery" size={14} className={isDark ? 'text-slate-300' : 'text-slate-700'} />
          </div>
        </div>

        {/* Notificación Toast del Sistema */}
        {notification && (
          <div className={`absolute top-[calc(1rem+env(safe-area-inset-top,0px))] sm:top-[48px] left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-fade-in border text-xs transition-colors duration-300 ${
            isDark ? 'bg-slate-950 text-white border-slate-800 shadow-black/60' : 'bg-white text-slate-800 border-slate-200 shadow-slate-200/40'
          }`}>
            <CategoryIcon 
              name={notification.type === 'success' ? 'Sparkles' : 'Info'} 
              className={notification.type === 'success' ? 'text-emerald-400' : 'text-amber-400'} 
              size={16} 
            />
            <p className="font-bold flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-200 transition-colors">
              <CategoryIcon name="X" size={14} />
            </button>
          </div>
        )}

        {/* Cabecera de la Aplicación */}
        <header className={`px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-4 pb-4 flex justify-between items-center border-b shrink-0 transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-50 border-slate-100/60'}`} id="app-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <CategoryIcon name="DollarSign" size={16} />
            </div>
            <div>
              <h1 className={`text-sm font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>MiBolsillo</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contabilidad Offline</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {expenses.length > 0 && (
              <span className={`text-[10px] py-1 px-2 rounded-full font-bold border transition-colors ${
                isDark 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {expenses.length} T.
              </span>
            )}
          </div>
        </header>

        {/* Cuerpo Principal Scrollable */}
        <main className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-24 space-y-4" id="app-body-content">
          {currentTab === 'dashboard' && (
            <div className="animate-fade-in space-y-4">
              <Dashboard 
                expenses={expenses} 
                onAddExpenseClick={() => setCurrentTab('add')}
                monthlyIncome={monthlyIncome}
                onUpdateIncome={handleUpdateIncome}
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                isDark={isDark}
              />
            </div>
          )}

          {currentTab === 'history' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Historial de Gastos</h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtro offline</span>
              </div>
              <ExpenseList
                expenses={expenses}
                onEditExpense={handleStartEditExpense}
                onDeleteExpense={handleDeleteExpense}
                onDeleteExpensesBulk={handleDeleteExpensesBulk}
                isDark={isDark}
              />
            </div>
          )}

          {currentTab === 'add' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {expenseToEdit ? 'Editar Registro' : 'Agregar Nuevo Gasto'}
                </h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {expenseToEdit ? 'Modo Edición' : 'Nueva Entrada'}
                </span>
              </div>
              <div className={`border rounded-3xl p-5 shadow-sm transition-colors duration-300 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-100/85'
              }`}>
                <ExpenseForm
                  onSaveExpense={handleSaveExpense}
                  expenseToEdit={expenseToEdit}
                  onCancelEdit={handleCancelEdit}
                  isDark={isDark}
                />
              </div>
            </div>
          )}
        </main>

        {/* Barra de Navegación Inferior */}
        <nav 
          className={`absolute bottom-0 left-0 right-0 border-t px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3 flex justify-around items-center z-20 shrink-0 transition-colors duration-300 ${
            isDark 
              ? 'bg-slate-900/95 backdrop-blur-md border-slate-800/80 shadow-[0_-4px_16px_rgba(0,0,0,0.2)]' 
              : 'bg-white/95 backdrop-blur-md border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]'
          }`} 
          id="app-bottom-nav"
        >
          {/* Tab Resumen */}
          <button
            onClick={() => {
              setExpenseToEdit(null);
              setCurrentTab('dashboard');
            }}
            className={`flex flex-col items-center gap-1 py-1 transition-all relative ${
              currentTab === 'dashboard' 
                ? 'text-emerald-500 font-black' 
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="nav-tab-dashboard"
          >
            <CategoryIcon name="PieChart" size={19} className="transition-transform duration-200" />
            <span className="text-[9px] font-bold">Resumen</span>
            {currentTab === 'dashboard' && (
              <span className="absolute bottom-[-4px] w-4 h-1 bg-emerald-500 rounded-full" />
            )}
          </button>

          {/* Tab Historial */}
          <button
            onClick={() => {
              setExpenseToEdit(null);
              setCurrentTab('history');
            }}
            className={`flex flex-col items-center gap-1 py-1 transition-all relative ${
              currentTab === 'history' 
                ? 'text-emerald-500 font-black' 
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="nav-tab-history"
          >
            <CategoryIcon name="List" size={19} className="transition-transform duration-200" />
            <span className="text-[9px] font-bold">Historial</span>
            {currentTab === 'history' && (
              <span className="absolute bottom-[-4px] w-4 h-1 bg-emerald-500 rounded-full" />
            )}
          </button>

          {/* Tab Agregar / Editar */}
          <button
            onClick={() => setCurrentTab('add')}
            className={`flex flex-col items-center gap-1 py-1 transition-all relative ${
              currentTab === 'add' 
                ? 'text-emerald-500 font-black' 
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="nav-tab-add"
          >
            <div className={`p-1.5 rounded-full transition-all ${
              currentTab === 'add' 
                ? 'bg-emerald-500 text-white shadow-md' 
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-200/80 text-slate-600 hover:text-slate-800'
            }`}>
              <CategoryIcon name={expenseToEdit ? 'Edit3' : 'Plus'} size={17} />
            </div>
            <span className="text-[9px] font-bold">
              {expenseToEdit ? 'Editar' : 'Agregar'}
            </span>
          </button>

          {/* Tab Tema Claro/Oscuro */}
          <button
            onClick={toggleTheme}
            className={`flex flex-col items-center gap-1 py-1 transition-all relative ${
              isDark ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-850'
            }`}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            id="nav-tab-theme"
          >
            <div className={`p-1.5 rounded-full transition-all ${
              isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
              <CategoryIcon name={isDark ? "Sun" : "Moon"} size={17} />
            </div>
            <span className="text-[9px] font-bold">
              {isDark ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          </button>
        </nav>
      </div>

      {/* Panel Técnico en la vista de escritorio */}
      <div className={`hidden lg:flex flex-col max-w-[420px] border rounded-[30px] p-6 shadow-xl mt-6 space-y-4 self-center ml-8 text-xs leading-relaxed absolute left-[calc(50%+230px)] top-1/2 -translate-y-1/2 transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-300 shadow-black/40' 
          : 'bg-white border-slate-200 text-slate-600 shadow-slate-100'
      }`}>
        <div className={`flex items-center gap-1.5 border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-150'}`}>
          <CategoryIcon name="Sparkles" className="text-emerald-500" size={16} />
          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Persistencia y Datos Offline</h3>
        </div>
        <p>
          Esta aplicación está diseñada con una arquitectura <strong>totalmente local</strong> que guarda la información en el almacenamiento local seguro del dispositivo. En tu entorno web interactivo, utiliza <code>localStorage</code>, lo cual preserva de forma permanente tus gastos incluso si recargas el navegador o closes la pestaña.
        </p>
        <p>
          Si llevas este código a un entorno móvil nativo, te recomendamos <strong>React Native</strong> o <strong>Expo</strong>, ya que te permitirán reutilizar casi todo este código React y migrar la persistencia de forma idéntica con el módulo oficial de <code>@react-native-async-storage/async-storage</code>.
        </p>
        <div className={`p-3 rounded-2xl border flex gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800/50' : 'bg-slate-50 border-slate-100/50'
        }`}>
          <CategoryIcon name="Info" size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <p className={`text-[10px] leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <strong>Consejo:</strong> Agrega gastos, filtra por categorías y edítalos desde las pestañas inferiores del móvil simulador. ¡Cambia el tema con el botón de sol/luna en la barra de navegación inferior!
          </p>
        </div>
      </div>
    </div>
  );
}
