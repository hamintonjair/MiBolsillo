/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Expense {
  id: string;
  amount: number;
  category: string; // ID de la categoría
  date: string; // Formato YYYY-MM-DD
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Nombre del icono de Lucide
  color: string; // Color base para UI (clase Tailwind)
  bgColor: string; // Fondo suave para UI (clase Tailwind)
  textColor: string; // Color de texto para UI (clase Tailwind)
  budget?: number; // Presupuesto opcional mensual
}

export type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'all';
