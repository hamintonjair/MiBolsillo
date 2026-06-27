/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Expense } from './types';

// Categorías predefinidas para control de gastos personales
export const CATEGORIES: Category[] = [
  {
    id: 'alimentacion',
    name: 'Alimentación',
    icon: 'Utensils',
    color: 'emerald',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    textColor: 'text-emerald-700',
    budget: 300000,
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: 'Car',
    color: 'blue',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    textColor: 'text-blue-700',
    budget: 100000,
  },
  {
    id: 'ocio',
    name: 'Ocio y Diversión',
    icon: 'Gamepad2',
    color: 'violet',
    bgColor: 'bg-violet-50 hover:bg-violet-100',
    textColor: 'text-violet-700',
    budget: 150000,
  },
  {
    id: 'hogar',
    name: 'Hogar y Servicios',
    icon: 'Home',
    color: 'amber',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    textColor: 'text-amber-700',
    budget: 400000,
  },
  {
    id: 'salud',
    name: 'Salud y Cuidado',
    icon: 'Heart',
    color: 'rose',
    bgColor: 'bg-rose-50 hover:bg-rose-100',
    textColor: 'text-rose-700',
    budget: 80000,
  },
  {
    id: 'otros',
    name: 'Otros Gastos',
    icon: 'Package',
    color: 'slate',
    bgColor: 'bg-slate-50 hover:bg-slate-100',
    textColor: 'text-slate-700',
    budget: 100000,
  },
];

// Función para formatear fechas relativas al día de hoy para que el dashboard siempre se vea vivo
export function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysOffset);
  return date.toISOString().split('T')[0];
}

// Generador de gastos por defecto
export const INITIAL_EXPENSES = (): Expense[] => [];
