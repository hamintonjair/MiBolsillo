/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../data';
import CategoryIcon from './CategoryIcon';

interface ExpenseFormProps {
  onSaveExpense: (expense: Omit<Expense, 'id'> & { id?: string }) => void;
  expenseToEdit?: Expense | null;
  onCancelEdit?: () => void;
  isDark?: boolean;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  onSaveExpense, 
  expenseToEdit, 
  onCancelEdit,
  isDark = true
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('alimentacion');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Sincronizar campos si se pasa un gasto para editar
  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setSelectedCategory(expenseToEdit.category);
      setDate(expenseToEdit.date);
      setDescription(expenseToEdit.description);
      setError('');
    } else {
      // Reiniciar campos por defecto para nueva inserción
      setAmount('');
      setSelectedCategory('alimentacion');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setError('');
    }
  }, [expenseToEdit]);

  const handleQuickAdd = (value: number) => {
    const currentVal = parseFloat(amount) || 0;
    setAmount((currentVal + value).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, ingresa un monto válido y mayor a cero ($).');
      return;
    }

    if (!selectedCategory) {
      setError('Por favor, selecciona una categoría de gasto.');
      return;
    }

    if (!date) {
      setError('Por favor, selecciona una fecha válida.');
      return;
    }

    // Guardar gasto
    onSaveExpense({
      id: expenseToEdit?.id, // se pasa si estamos editando
      amount: parsedAmount,
      category: selectedCategory,
      date,
      description: description.trim(),
    });

    // Limpiar formulario si es una creación nueva
    if (!expenseToEdit) {
      setAmount('');
      setSelectedCategory('alimentacion');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" id="expense-form">
      {error && (
        <div className={`border p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-shake ${
          isDark ? 'bg-rose-950/20 border-rose-900/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <CategoryIcon name="Info" className="shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Input de Monto Destacado */}
      <div className="space-y-1.5">
        <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`} htmlFor="input-amount">
          Monto del Gasto
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">
            $
          </div>
          <input
            id="input-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`w-full pl-10 pr-4 py-4 border rounded-2xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-700/60 text-white placeholder-slate-600 focus:bg-slate-950' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'
            }`}
            required
          />
        </div>

        {/* Botones de incremento rápido (Sabor móvil premium) */}
        <div className="flex gap-2 pt-1" id="quick-add-buttons">
          {[5000, 10000, 20000, 50000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAdd(val)}
              className={`flex-1 py-1.5 border text-xs font-bold rounded-xl transition-colors active:scale-95 ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
              }`}
            >
              {`+${val}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount('')}
            className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-colors active:scale-95 ${
              isDark 
                ? 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/40 text-rose-400' 
                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 shadow-2xs'
            }`}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Selector de Categorías en Cuadrícula (Grid) */}
      <div className="space-y-2">
        <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Seleccionar Categoría
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id="category-grid">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            
            const activeColorStyles = isDark ? {
              emerald: 'border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/10 text-emerald-300',
              blue: 'border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/10 text-blue-300',
              violet: 'border-violet-500/60 bg-violet-500/10 ring-2 ring-violet-500/10 text-violet-300',
              amber: 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/10 text-amber-300',
              rose: 'border-rose-500/60 bg-rose-500/10 ring-2 ring-rose-500/10 text-rose-300',
              slate: 'border-slate-500/60 bg-slate-500/10 ring-2 ring-slate-500/10 text-slate-300',
            }[cat.color] || 'border-emerald-500 bg-emerald-950/20' : {
              emerald: 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/25 text-emerald-700',
              blue: 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/25 text-blue-700',
              violet: 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/25 text-violet-700',
              amber: 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/25 text-amber-700',
              rose: 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/25 text-rose-700',
              slate: 'border-slate-500 bg-slate-100 ring-2 ring-slate-500/25 text-slate-700',
            }[cat.color] || 'border-emerald-500 bg-emerald-50';

            const badgeStyles = isDark ? {
              emerald: 'bg-emerald-500/20 text-emerald-300',
              blue: 'bg-blue-500/20 text-blue-300',
              violet: 'bg-violet-500/20 text-violet-300',
              amber: 'bg-amber-500/20 text-amber-300',
              rose: 'bg-rose-500/20 text-rose-300',
              slate: 'bg-slate-500/20 text-slate-300',
            }[cat.color] || 'bg-slate-500/20 text-slate-300' : {
              emerald: 'bg-emerald-100 text-emerald-750',
              blue: 'bg-blue-100 text-blue-750',
              violet: 'bg-violet-100 text-violet-750',
              amber: 'bg-amber-100 text-amber-750',
              rose: 'bg-rose-100 text-rose-750',
              slate: 'bg-slate-200 text-slate-700',
            }[cat.color] || 'bg-slate-100 text-slate-700';

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 justify-between relative ${
                  isSelected 
                    ? activeColorStyles 
                    : isDark 
                      ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className={`p-2 rounded-xl w-fit ${
                  isSelected 
                    ? badgeStyles 
                    : isDark ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <CategoryIcon name={cat.icon} size={16} />
                </div>
                <div className="space-y-0.5">
                  <span className={`text-xs font-extrabold block leading-tight ${
                    isDark ? 'text-slate-200' : 'text-slate-850'
                  }`}>
                    {cat.name}
                  </span>
                  {cat.budget && (
                    <span className={`text-[9px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Meta: ${cat.budget.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fecha y Descripción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fecha */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`} htmlFor="input-date">
            Fecha de Gasto
          </label>
          <div className="relative">
            <input
              id="input-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full p-3 border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isDark 
                  ? 'bg-slate-900 border-slate-700/60 text-white focus:bg-slate-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
              }`}
              required
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`} htmlFor="input-description">
            Descripción / Detalle <span className="text-slate-500 font-normal">(Opcional)</span>
          </label>
          <input
            id="input-description"
            type="text"
            placeholder="Ej. Almuerzo con Juan, Gasolina, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full p-3 border rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-700/60 text-white placeholder-slate-600 focus:bg-slate-950' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-3 pt-2" id="form-actions">
        {expenseToEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className={`flex-1 py-3.5 border text-xs font-bold rounded-2xl transition-all active:scale-95 text-center ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-2xs'
            }`}
          >
            Cancelar Edición
          </button>
        )}
        <button
          type="submit"
          className="flex-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
        >
          <CategoryIcon name="PlusCircle" size={16} />
          {expenseToEdit ? 'Guardar Cambios' : 'Registrar Nuevo Gasto'}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
