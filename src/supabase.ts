/// <reference types="vite/client" />

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Expense } from './types';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Limpiar comillas residuales que puedan venir del archivo .env
const cleanString = (val: string) => {
  if (typeof val !== 'string') return '';
  return val.replace(/^["']|["']$/g, '').trim();
};

const supabaseUrl = cleanString(rawUrl);
const supabaseAnonKey = cleanString(rawKey);

// Validar si las credenciales son reales y válidas
const isRealValue = (val: string) => {
  if (!val) return false;
  const lower = val.toLowerCase().trim();
  return lower !== 'undefined' && lower !== 'null' && lower !== 'placeholder-url' && lower !== '';
};

export const hasValidCredentials = (): boolean => {
  return isRealValue(supabaseUrl) && isRealValue(supabaseAnonKey) && supabaseUrl.startsWith('http');
};

// Instanciar cliente. Si las credenciales no son válidas, usamos un placeholder amigable para que no explote al instanciarse
export const supabase = createClient(
  hasValidCredentials() ? supabaseUrl : 'https://placeholder-url-not-configured.supabase.co',
  hasValidCredentials() ? supabaseAnonKey : 'placeholder-anon-key'
);

export const SQL_CREATION_SCRIPT = `
-- Copia y pega este script en el editor SQL de Supabase (SQL Editor -> New Query)

-- 1. Crear tabla de Gastos (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla de Ingresos Mensuales (monthly_income)
CREATE TABLE IF NOT EXISTS public.monthly_income (
    month TEXT PRIMARY KEY, -- Formato 'YYYY-MM'
    income NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar el acceso público (o políticas RLS si lo prefieres)
-- Para facilitar las pruebas iniciales, habilitamos acceso público libre:
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si ya existían para evitar errores de duplicación
DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en expenses" ON public.expenses;
CREATE POLICY "Permitir todo a usuarios anonimos en expenses" 
ON public.expenses FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en monthly_income" ON public.monthly_income;
CREATE POLICY "Permitir todo a usuarios anonimos en monthly_income" 
ON public.monthly_income FOR ALL 
USING (true) 
WITH CHECK (true);
`;

/**
 * Verifica si podemos conectarnos y si las tablas requeridas existen.
 * Retorna { success: boolean, tablesExist: boolean, error?: string }
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; tablesExist: boolean; error?: string }> {
  try {
    if (!hasValidCredentials()) {
      return { success: false, tablesExist: false, error: 'Credenciales de Supabase no configuradas. Por favor, crea un archivo .env o configúralas en el modal.' };
    }

    // Probar a consultar expenses
    const { error: errorExpenses } = await supabase.from('expenses').select('id').limit(1);
    
    let expensesExist = true;
    let isConnected = true;
    let errorMsg = '';

    if (errorExpenses) {
      if (errorExpenses.code === '42P01') {
        expensesExist = false;
      } else if (errorExpenses.code === 'PGRST301' || errorExpenses.message?.includes('JWT') || errorExpenses.message?.includes('API key')) {
        isConnected = false;
        errorMsg = 'API Key o URL de Supabase inválida: ' + errorExpenses.message;
      } else if (errorExpenses.code === '42501') {
        // La tabla existe pero el acceso está denegado por políticas RLS
        expensesExist = true; 
        errorMsg = 'Error de políticas RLS: ' + errorExpenses.message;
      } else {
        // Otro tipo de error
        errorMsg = errorExpenses.message;
      }
    }

    // Probar a consultar monthly_income
    const { error: errorIncome } = await supabase.from('monthly_income').select('month').limit(1);
    let incomeExist = true;

    if (errorIncome) {
      if (errorIncome.code === '42P01') {
        incomeExist = false;
      } else if (errorIncome.code === 'PGRST301' || errorIncome.message?.includes('JWT') || errorIncome.message?.includes('API key')) {
        isConnected = false;
        errorMsg = 'API Key o URL de Supabase inválida: ' + errorIncome.message;
      } else if (errorIncome.code === '42501') {
        incomeExist = true;
        if (!errorMsg) errorMsg = 'Error de políticas RLS en monthly_income: ' + errorIncome.message;
      } else {
        if (!errorMsg) errorMsg = errorIncome.message;
      }
    }

    if (!isConnected) {
      return { success: false, tablesExist: false, error: errorMsg };
    }

    const tablesExist = expensesExist && incomeExist;
    return {
      success: true,
      tablesExist,
      error: errorMsg || undefined
    };

  } catch (err: any) {
    return { success: false, tablesExist: false, error: err.message || 'Error de conexión desconocido' };
  }
}

/**
 * Obtiene todos los gastos desde Supabase, ordenados por fecha desc
 */
export async function fetchExpensesFromSupabase(): Promise<{ data: Expense[] | null; error: string | null }> {
  if (!hasValidCredentials()) {
    return { data: [], error: 'Supabase no configurado' };
  }
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, category, date, description')
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as Expense[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al obtener gastos' };
  }
}

/**
 * Sincroniza un gasto individual en Supabase (inserta o actualiza)
 */
export async function saveExpenseToSupabase(expense: Expense): Promise<{ success: boolean; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const { error } = await supabase
      .from('expenses')
      .upsert({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        description: expense.description
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar gasto' };
  }
}

/**
 * Sincroniza múltiples gastos de forma masiva (útil para la carga inicial/migración offline)
 */
export async function syncMultipleExpensesToSupabase(expenses: Expense[]): Promise<{ success: boolean; error: string | null }> {
  if (expenses.length === 0) return { success: true, error: null };
  if (!hasValidCredentials()) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const payload = expenses.map(e => ({
      id: e.id,
      amount: e.amount,
      category: e.category,
      date: e.date,
      description: e.description
    }));

    const { error } = await supabase
      .from('expenses')
      .upsert(payload);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al sincronizar gastos' };
  }
}

/**
 * Elimina un gasto de Supabase
 */
export async function deleteExpenseFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al eliminar gasto' };
  }
}

/**
 * Obtiene el ingreso mensual para un mes específico
 */
export async function fetchIncomeFromSupabase(month: string): Promise<{ income: number | null; error: string | null }> {
  if (!hasValidCredentials()) {
    return { income: null, error: 'Supabase no configurado' };
  }
  try {
    const { data, error } = await supabase
      .from('monthly_income')
      .select('income')
      .eq('month', month)
      .maybeSingle();

    if (error) {
      return { income: null, error: error.message };
    }
    return { income: data ? Number(data.income) : null, error: null };
  } catch (err: any) {
    return { income: null, error: err.message || 'Error al obtener ingresos' };
  }
}

/**
 * Guarda o actualiza el ingreso mensual de un mes específico
 */
export async function saveIncomeToSupabase(month: string, income: number): Promise<{ success: boolean; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const { error } = await supabase
      .from('monthly_income')
      .upsert({
        month,
        income
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar ingresos' };
  }
}
