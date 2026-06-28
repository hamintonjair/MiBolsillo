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

-- 1. Crear tabla de Gastos (expenses) con columna profile_id para independizar perfiles
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    profile_id TEXT DEFAULT 'Principal', -- Identificador del perfil/usuario o email
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar que la columna profile_id exista si la tabla ya había sido creada anteriormente
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS profile_id TEXT DEFAULT 'Principal';

-- 2. Crear tabla de Ingresos Mensuales (monthly_income)
-- El campo month almacenará la combinación 'profile_id:month' para asegurar perfiles independientes
CREATE TABLE IF NOT EXISTS public.monthly_income (
    month TEXT PRIMARY KEY, -- Formato 'profile_id:month' o 'YYYY-MM' (retrocompatible)
    income NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla de Usuarios (custom_users) para evitar problemas de confirmación de email con Supabase Auth
CREATE TABLE IF NOT EXISTS public.custom_users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar el acceso público (o políticas RLS si lo prefieres)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en custom_users" ON public.custom_users;
CREATE POLICY "Permitir todo a usuarios anonimos en custom_users" 
ON public.custom_users FOR ALL 
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

    // Probar a consultar custom_users
    const { error: errorUsers } = await supabase.from('custom_users').select('email').limit(1);
    let usersExist = true;

    if (errorUsers) {
      if (errorUsers.code === '42P01') {
        usersExist = false;
      } else if (errorUsers.code === 'PGRST301' || errorUsers.message?.includes('JWT') || errorUsers.message?.includes('API key')) {
        isConnected = false;
        errorMsg = 'API Key o URL de Supabase inválida: ' + errorUsers.message;
      } else if (errorUsers.code === '42501') {
        usersExist = true;
        if (!errorMsg) errorMsg = 'Error de políticas RLS en custom_users: ' + errorUsers.message;
      } else {
        if (!errorMsg) errorMsg = errorUsers.message;
      }
    }

    if (!isConnected) {
      return { success: false, tablesExist: false, error: errorMsg };
    }

    const tablesExist = expensesExist && incomeExist && usersExist;
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
 * Obtiene todos los gastos desde Supabase para un perfil específico, ordenados por fecha desc
 */
export async function fetchExpensesFromSupabase(profileId: string): Promise<{ data: Expense[] | null; error: string | null }> {
  if (!hasValidCredentials()) {
    return { data: [], error: 'Supabase no configurado' };
  }
  try {
    const query = supabase
      .from('expenses')
      .select('id, amount, category, date, description, profile_id');

    // Si es el perfil por defecto "Principal", traemos también registros anteriores que tengan profile_id nulo o 'default'
    if (profileId === 'Principal' || profileId === 'default') {
      query.or(`profile_id.eq.${profileId},profile_id.is.null,profile_id.eq.default`);
    } else {
      query.eq('profile_id', profileId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as Expense[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al obtener gastos' };
  }
}

/**
 * Sincroniza un gasto individual en Supabase para un perfil específico (inserta o actualiza)
 */
export async function saveExpenseToSupabase(expense: Expense, profileId: string): Promise<{ success: boolean; error: string | null }> {
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
        description: expense.description,
        profile_id: profileId
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
 * Sincroniza múltiples gastos de forma masiva para un perfil específico (útil para la carga inicial/migración offline)
 */
export async function syncMultipleExpensesToSupabase(expenses: Expense[], profileId: string): Promise<{ success: boolean; error: string | null }> {
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
      description: e.description,
      profile_id: profileId
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
 * Obtiene el ingreso mensual para un mes y perfil específico
 */
export async function fetchIncomeFromSupabase(month: string, profileId: string): Promise<{ income: number | null; error: string | null }> {
  if (!hasValidCredentials()) {
    return { income: null, error: 'Supabase no configurado' };
  }
  try {
    const key = `${profileId}:${month}`;
    // Intentar buscar con el formato 'perfil:mes'
    const { data, error } = await supabase
      .from('monthly_income')
      .select('income')
      .eq('month', key)
      .maybeSingle();

    if (error) {
      return { income: null, error: error.message };
    }
    
    if (data) {
      return { income: Number(data.income), error: null };
    }
    
    // Si no se encuentra y el perfil es 'Principal', intentar buscar con el formato antiguo de solo 'mes' para retrocompatibilidad
    if (profileId === 'Principal') {
      const { data: oldData, error: oldError } = await supabase
        .from('monthly_income')
        .select('income')
        .eq('month', month)
        .maybeSingle();
        
      if (!oldError && oldData) {
        return { income: Number(oldData.income), error: null };
      }
    }
    
    return { income: null, error: null };
  } catch (err: any) {
    return { income: null, error: err.message || 'Error al obtener ingresos' };
  }
}

/**
 * Guarda o actualiza el ingreso mensual de un mes y perfil específico
 */
export async function saveIncomeToSupabase(month: string, income: number, profileId: string): Promise<{ success: boolean; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, error: 'Supabase no configurado' };
  }
  try {
    const key = `${profileId}:${month}`;
    const { error } = await supabase
      .from('monthly_income')
      .upsert({
        month: key,
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

/**
 * Registra un nuevo usuario con Correo y Contraseña
 */
export async function signUpUser(email: string, password: string): Promise<{ success: boolean; user: any; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, user: null, error: 'Supabase no configurado' };
  }
  try {
    const cleanEmail = email.toLowerCase().trim();
    // 1. Verificar si ya existe en la tabla custom_users
    const { data: existingUser, error: checkError } = await supabase
      .from('custom_users')
      .select('email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (checkError) {
      return { success: false, user: null, error: 'Error al verificar disponibilidad del correo: ' + checkError.message };
    }

    if (existingUser) {
      return { success: false, user: null, error: 'El correo electrónico ya está registrado.' };
    }

    // 2. Insertar nuevo usuario
    const { error: insertError } = await supabase
      .from('custom_users')
      .insert({
        email: cleanEmail,
        password: password
      });

    if (insertError) {
      return { success: false, user: null, error: 'Error al crear la cuenta: ' + insertError.message };
    }

    const user = { email: cleanEmail };
    try {
      localStorage.setItem('custom_session_user', JSON.stringify(user));
    } catch (e) {}

    return { success: true, user, error: null };
  } catch (err: any) {
    return { success: false, user: null, error: err.message || 'Error al registrar usuario' };
  }
}

/**
 * Inicia sesión con Correo y Contraseña
 */
export async function signInUser(email: string, password: string): Promise<{ success: boolean; user: any; error: string | null }> {
  if (!hasValidCredentials()) {
    return { success: false, user: null, error: 'Supabase no configurado' };
  }
  try {
    const cleanEmail = email.toLowerCase().trim();
    const { data: userRecord, error } = await supabase
      .from('custom_users')
      .select('email, password')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      return { success: false, user: null, error: 'Error al buscar el usuario: ' + error.message };
    }

    if (!userRecord || userRecord.password !== password) {
      return { success: false, user: null, error: 'Correo o contraseña incorrectos.' };
    }

    const user = { email: cleanEmail };
    try {
      localStorage.setItem('custom_session_user', JSON.stringify(user));
    } catch (e) {}

    return { success: true, user, error: null };
  } catch (err: any) {
    return { success: false, user: null, error: err.message || 'Error al iniciar sesión' };
  }
}

/**
 * Actualiza el correo electrónico del usuario y sincroniza sus datos
 */
export async function updateUserEmail(oldEmail: string, newEmail: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };
  
  const cleanOld = oldEmail.toLowerCase().trim();
  const cleanNew = newEmail.toLowerCase().trim();

  try {
    // 1. Verificar si el nuevo email ya existe
    const { data: existing } = await supabase
      .from('custom_users')
      .select('email')
      .eq('email', cleanNew)
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: 'El nuevo correo ya está registrado por otro usuario.' };
    }

    // 2. Obtener la contraseña actual (para re-insertar o actualizar)
    const { data: userRecord } = await supabase
      .from('custom_users')
      .select('password')
      .eq('email', cleanOld)
      .single();

    if (!userRecord) return { success: false, error: 'Usuario no encontrado.' };

    // 3. Crear el nuevo registro de usuario
    const { error: insertError } = await supabase
      .from('custom_users')
      .insert({ email: cleanNew, password: userRecord.password });

    if (insertError) return { success: false, error: 'Error al crear nuevo perfil: ' + insertError.message };

    // 4. Actualizar referencias en gastos e ingresos
    await supabase.from('expenses').update({ profile_id: cleanNew }).eq('profile_id', cleanOld);
    await supabase.from('monthly_income').update({ profile_id: cleanNew }).eq('profile_id', cleanOld);

    // 5. Eliminar el registro antiguo
    await supabase.from('custom_users').delete().eq('email', cleanOld);

    // 6. Actualizar sesión local
    localStorage.setItem('custom_session_user', JSON.stringify({ email: cleanNew }));

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Elimina la cuenta y todos sus datos asociados
 */
export async function deleteUserAccount(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };
  
  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. Eliminar datos asociados
    await supabase.from('expenses').delete().eq('profile_id', cleanEmail);
    await supabase.from('monthly_income').delete().eq('profile_id', cleanEmail);

    // 2. Eliminar usuario
    const { error } = await supabase.from('custom_users').delete().eq('email', cleanEmail);
    
    if (error) return { success: false, error: error.message };

    // 3. Limpiar sesión
    localStorage.removeItem('custom_session_user');

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza la contraseña del usuario
 */
export async function updateUserPassword(email: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: 'Supabase no configurado' };
  
  const cleanEmail = email.toLowerCase().trim();

  try {
    const { error } = await supabase
      .from('custom_users')
      .update({ password: newPassword })
      .eq('email', cleanEmail);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cierra la sesión activa
 */
export async function signOutUser(): Promise<{ success: boolean; error: string | null }> {
  try {
    try {
      localStorage.removeItem('custom_session_user');
    } catch (e) {}
    return { success: true, error: null };
  } catch (err: any) {
    return { success: true, error: null };
  }
}

/**
 * Obtiene el usuario actual si hay una sesión activa
 */
export async function getCurrentUser(): Promise<{ user: any; error: string | null }> {
  try {
    const saved = localStorage.getItem('custom_session_user');
    if (saved) {
      const user = JSON.parse(saved);
      return { user, error: null };
    }
  } catch (e) {}
  return { user: null, error: null };
}

