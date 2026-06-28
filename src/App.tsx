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
import { 
  testSupabaseConnection, 
  fetchExpensesFromSupabase, 
  saveExpenseToSupabase, 
  syncMultipleExpensesToSupabase, 
  deleteExpenseFromSupabase, 
  fetchIncomeFromSupabase, 
  saveIncomeToSupabase,
  SQL_CREATION_SCRIPT,
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUser,
  updateUserEmail,
  deleteUserAccount,
  updateUserPassword
} from './supabase';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'add'>('dashboard');
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  
  // Nuevo estado para el mes que se está visualizando
  const [viewMonth, setViewMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Reloj simulador de la barra de estado móvil
  const [time, setTime] = useState<string>('12:00');

  // Estado de la conexión a Supabase
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    tablesExist: boolean;
    error?: string;
    loading: boolean;
  }>({
    connected: false,
    tablesExist: false,
    loading: true
  });

  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  // Estado para el perfil activo (ahora único por usuario)
  const [activeProfile, setActiveProfile] = useState<string>('Principal');

  // Estados de autenticación en Supabase
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [showAuthGate, setShowAuthGate] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
  const [newPasswordUpdateInput, setNewPasswordUpdateInput] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState<boolean>(false);

  // Estado para modal de confirmación premium en la app
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Trigger custom in-app notification
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Función para comprobar la conexión a Supabase y obtener sesión activa
  const checkSupabase = async () => {
    setDbStatus(prev => ({ ...prev, loading: true }));
    const result = await testSupabaseConnection();
    setDbStatus({
      connected: result.success,
      tablesExist: result.tablesExist,
      error: result.error,
      loading: false
    });

    if (result.success && result.tablesExist) {
      const { user } = await getCurrentUser();
      if (user) {
        setSessionUser(user);
        setActiveProfile(user.email || 'Principal');
      } else {
        setShowAuthGate(true);
      }
    }
    return result;
  };

  // Manejadores de Autenticación de Supabase
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      triggerNotification('Por favor, ingresa un correo y contraseña.', 'error');
      return;
    }
    if (password.length < 6) {
      triggerNotification('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    setIsAuthLoading(true);
    const { success, user, error } = await signUpUser(email, password);
    setIsAuthLoading(false);

    if (success) {
      triggerNotification('¡Cuenta creada e inicio de sesión exitoso!', 'success');
      setSessionUser(user);
      setActiveProfile(email);
      setShowAuthGate(false);
      setAuthEmail('');
      setAuthPassword('');
    } else {
      triggerNotification(error || 'Error al crear la cuenta.', 'error');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      triggerNotification('Por favor, ingresa correo y contraseña.', 'error');
      return;
    }

    setIsAuthLoading(true);
    const { success, user, error } = await signInUser(email, password);
    setIsAuthLoading(false);

    if (success) {
      triggerNotification('¡Sesión iniciada con éxito!', 'success');
      setSessionUser(user);
      setActiveProfile(email);
      setShowAuthGate(false);
      setAuthEmail('');
      setAuthPassword('');
    } else {
      triggerNotification(error || 'Credenciales incorrectas.', 'error');
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    const { success, error } = await signOutUser();
    setIsAuthLoading(false);
    if (success) {
      setSessionUser(null);
      setActiveProfile('Principal');
      triggerNotification('Sesión cerrada correctamente.', 'info');
      setShowProfileModal(false);
      setShowAuthGate(true);
    } else {
      triggerNotification(error || 'Error al cerrar sesión.', 'error');
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser || !newEmailInput.trim()) return;
    
    setIsUpdatingEmail(true);
    const { success, error } = await updateUserEmail(sessionUser.email, newEmailInput.trim());
    setIsUpdatingEmail(false);
    
    if (success) {
      triggerNotification('Correo actualizado con éxito.', 'success');
      setSessionUser({ email: newEmailInput.trim() });
      setActiveProfile(newEmailInput.trim());
      setNewEmailInput('');
    } else {
      triggerNotification(error || 'Error al actualizar el correo.', 'error');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser || !newPasswordUpdateInput.trim()) return;

    if (newPasswordUpdateInput.trim().length < 6) {
      triggerNotification('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    
    setIsUpdatingPassword(true);
    const { success, error } = await updateUserPassword(sessionUser.email, newPasswordUpdateInput.trim());
    setIsUpdatingPassword(false);
    
    if (success) {
      triggerNotification('Contraseña actualizada con éxito.', 'success');
      setNewPasswordUpdateInput('');
      setShowUpdatePassword(false);
    } else {
      triggerNotification(error || 'Error al actualizar la contraseña.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!sessionUser) return;
    
    setConfirmModal({
      isOpen: true,
      title: '¡ADVERTENCIA CRÍTICA!',
      message: 'Esta acción es permanente e irreversible. Al confirmar se eliminarán: \n\n • Todo tu historial de gastos. \n • Todos tus registros de ingresos. \n • Tu cuenta y acceso sincronizado. \n\n ¿Estás absolutamente seguro de que deseas continuar?',
      onConfirm: async () => {
        const { success, error } = await deleteUserAccount(sessionUser.email);
        if (success) {
          triggerNotification('Cuenta eliminada correctamente.', 'info');
          setSessionUser(null);
          setActiveProfile('Principal');
          setShowProfileModal(false);
          setShowAuthGate(true);
        } else {
          triggerNotification(error || 'Error al eliminar la cuenta.', 'error');
        }
      }
    });
  };

  const handleContinueAsGuest = () => {
    setSessionUser(null);
    setActiveProfile('Principal');
    setShowAuthGate(false);
    triggerNotification('Usando la aplicación en Modo Local (Sin sincronización).', 'info');
  };

  useEffect(() => {
    checkSupabase();
  }, []);

  // Función para borrar de forma masiva registros antiguos
  const handleDeleteExpensesBulk = async (type: 'weeks' | 'months') => {
    const today = new Date();
    let cutoffDateStr = '';

    if (type === 'weeks') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoffDateStr = cutoff.toISOString().split('T')[0];
    } else if (type === 'months') {
      cutoffDateStr = today.toISOString().slice(0, 7) + '-01';
    }

    const expensesToDelete = expenses.filter(exp => exp.date < cutoffDateStr);
    const updated = expenses.filter(exp => exp.date >= cutoffDateStr);

    const deletedCount = expenses.length - updated.length;
    if (deletedCount > 0) {
      setExpenses(updated);
      
      // Eliminar de Supabase de manera secuencial
      if (dbStatus.connected && dbStatus.tablesExist) {
        let errorOccurred = false;
        for (const exp of expensesToDelete) {
          const { success } = await deleteExpenseFromSupabase(exp.id);
          if (!success) errorOccurred = true;
        }
        if (errorOccurred) {
          triggerNotification(`Error al sincronizar con la nube al borrar algunos registros.`, 'error');
        } else {
          triggerNotification(`Sincronizado: ${deletedCount} registros eliminados con éxito en la nube.`, 'success');
        }
      } else {
        triggerNotification(`Error: La base de datos en la nube no está disponible para borrar registros.`, 'error');
      }
    } else {
      triggerNotification('No se encontraron registros anteriores para eliminar en este rango.', 'info');
    }
  };

  // Cargar ingresos mensuales de forma asíncrona desde Supabase
  useEffect(() => {
    const loadIncome = async () => {
      if (dbStatus.connected && dbStatus.tablesExist) {
        const { income, error } = await fetchIncomeFromSupabase(viewMonth, activeProfile);
        if (income !== null) {
          setMonthlyIncome(income);
        } else {
          // Valor por defecto inicial si no existe en Supabase
          setMonthlyIncome(0);
        }
      } else {
        setMonthlyIncome(0);
      }
    };
    loadIncome();
  }, [viewMonth, activeProfile, dbStatus.connected, dbStatus.tablesExist]);

  // Función para actualizar y persistir los ingresos mensuales en la nube
  const handleUpdateIncome = async (newIncome: number) => {
    if (!dbStatus.connected) {
      triggerNotification('Error: La base de datos no está conectada.', 'error');
      return;
    }
    if (!dbStatus.tablesExist) {
      triggerNotification('Error: Falta crear la tabla "monthly_income". Abre el modal de configuración para ver el script.', 'error');
      return;
    }

    const { success, error } = await saveIncomeToSupabase(viewMonth, newIncome, activeProfile);
    if (success) {
      setMonthlyIncome(newIncome);
      triggerNotification('¡Ingreso mensual guardado con éxito!', 'success');
    } else {
      console.error('Error al guardar ingreso en base de datos:', error);
      triggerNotification('Error al guardar el ingreso mensual: ' + error, 'error');
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

  // Cargar datos iniciales de Supabase
  const loadExpensesData = async () => {
    if (dbStatus.connected && dbStatus.tablesExist) {
      const { data, error } = await fetchExpensesFromSupabase(activeProfile);
      if (data) {
        setExpenses(data);
        return;
      } else if (error) {
        console.error('Error al cargar de base de datos:', error);
        triggerNotification('Error al obtener datos de la nube: ' + error, 'error');
      }
    }
    setExpenses([]);
  };

  useEffect(() => {
    if (!dbStatus.loading) {
      loadExpensesData();
    }
  }, [dbStatus.loading, dbStatus.connected, dbStatus.tablesExist, activeProfile]);

  // Acción para crear o actualizar un registro en la nube
  const handleSaveExpense = async (formData: Omit<Expense, 'id'> & { id?: string }) => {
    if (!dbStatus.connected) {
      triggerNotification('Error: La base de datos no está conectada.', 'error');
      return;
    }
    if (!dbStatus.tablesExist) {
      triggerNotification('Error: Falta crear la tabla "expenses". Abre el modal de configuración para ver el script SQL.', 'error');
      return;
    }

    const isEdit = !!formData.id;
    const targetExpense: Expense = {
      id: formData.id || `exp-${Date.now()}`,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      description: formData.description
    };

    const { success, error } = await saveExpenseToSupabase(targetExpense, activeProfile);
    if (success) {
      if (isEdit) {
        setExpenses(expenses.map(exp => exp.id === targetExpense.id ? targetExpense : exp));
        triggerNotification('¡Gasto actualizado con éxito!', 'success');
      } else {
        setExpenses([targetExpense, ...expenses]);
        triggerNotification('¡Gasto registrado con éxito!', 'success');
      }
      loadExpensesData();
      
      // Redirigir a la pestaña correspondiente
      setExpenseToEdit(null);
      setCurrentTab('history');
    } else {
      console.error('Error en base de datos:', error);
      triggerNotification('Error al guardar el gasto: ' + error, 'error');
    }
  };

  // Acción para eliminar un registro en la nube
  const handleDeleteExpense = async (id: string) => {
    if (!dbStatus.connected) {
      triggerNotification('Error: La base de datos no está conectada.', 'error');
      return;
    }
    if (!dbStatus.tablesExist) {
      triggerNotification('Error: Falta crear la tabla "expenses" para poder eliminar.', 'error');
      return;
    }

    const { success, error } = await deleteExpenseFromSupabase(id);
    if (success) {
      setExpenses(expenses.filter(exp => exp.id !== id));
      triggerNotification('Gasto eliminado con éxito.', 'success');
      
      // Si estábamos editando el gasto eliminado, cancelar edición
      if (expenseToEdit && expenseToEdit.id === id) {
        setExpenseToEdit(null);
      }
    } else {
      console.error('Error al eliminar en base de datos:', error);
      triggerNotification('Error al eliminar el gasto: ' + error, 'error');
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

        {dbStatus.loading ? (
          <div className={`flex-1 flex flex-col justify-center items-center animate-pulse ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
             <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
               <CategoryIcon name="DollarSign" size={28} className="text-emerald-500" />
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest">Cargando...</p>
          </div>
        ) : showAuthGate ? (
          <div className={`flex-1 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`} id="auth-gate-container">
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3.5 bg-emerald-600 text-white rounded-[22px] shadow-md shadow-emerald-600/15 animate-pulse">
                  <CategoryIcon name="DollarSign" size={24} />
                </div>
                <h2 className="text-xl font-black tracking-tight mt-2">MiBolsillo Cloud</h2>
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-[280px] mx-auto">
                  {isRegisterMode 
                    ? 'Regístrate para guardar y sincronizar tu bolsillo personal con la nube de forma segura.' 
                    : 'Inicia sesión con tu correo para acceder de forma segura a tus finanzas.'}
                </p>
              </div>

              <form onSubmit={isRegisterMode ? handleSignUp : handleSignIn} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">Correo Electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <CategoryIcon name="User" size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl font-bold border outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-emerald-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-xs'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <CategoryIcon name="Lock" size={14} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl font-bold border outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-emerald-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-xs'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                        isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <CategoryIcon name={showPassword ? "EyeOff" : "Eye"} size={14} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-550 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/15 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CategoryIcon name={isRegisterMode ? "UserPlus" : "LogIn"} size={14} />
                      {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </>
                  )}
                </button>
              </form>

              <div className="text-center space-y-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-[11px] font-bold text-emerald-500 hover:underline bg-transparent border-none cursor-pointer"
                >
                  {isRegisterMode ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate gratis'}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-700/30"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">o</span>
                  <div className="flex-grow border-t border-slate-700/30"></div>
                </div>

                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all border ${
                    isDark 
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-850 text-slate-300' 
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs'
                  }`}
                >
                  Continuar como Invitado (Modo Offline)
                </button>
              </div>
            </div>

            {/* Pie del Auth Gate con estado de Supabase */}
            <div className="text-center text-[10px] text-slate-400 font-bold border-t border-slate-800/40 pt-4 flex items-center justify-center gap-1.5 font-sans">
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {dbStatus.connected ? 'Servidor de base de datos conectado' : 'Modo local sin servidor'}
            </div>
          </div>
        ) : (
          <>
            {/* Cabecera de la Aplicación */}
            <header className={`px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-4 pb-4 flex justify-between items-center border-b shrink-0 transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-50 border-slate-100/60'}`} id="app-header">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <CategoryIcon name="DollarSign" size={16} />
                </div>
                <div>
                  <h1 className={`text-sm font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>MiBolsillo</h1>
                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider">
                    {dbStatus.connected && dbStatus.tablesExist ? 'Nube Supabase' : 'Conectando Nube...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón de Cuenta */}
                <button
                  onClick={() => {
                    if (sessionUser) {
                      setShowProfileModal(true);
                    } else {
                      setShowAuthGate(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 text-[10px] py-1 px-3 rounded-full font-black border transition-all hover:scale-105 active:scale-95 ${
                    sessionUser
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                      : isDark 
                      ? 'bg-slate-850 border-slate-750 text-slate-200 hover:text-white hover:bg-slate-750' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  id="profile-select-badge"
                  title={sessionUser ? `Sesión activa: ${sessionUser.email}` : 'Iniciar Sesión / Registrarse'}
                >
                  <CategoryIcon name="User" size={11} className={sessionUser ? "text-emerald-500" : "text-amber-500"} />
                  <span className="max-w-[90px] truncate">
                    {sessionUser ? sessionUser.email.split('@')[0] : 'Iniciar Sesión'}
                  </span>
                </button>

                {/* Supabase status indicator */}
                <button
                  onClick={() => setShowDbModal(true)}
                  className={`flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-full font-bold border transition-all hover:scale-105 active:scale-95 ${
                    dbStatus.loading
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      : dbStatus.connected && dbStatus.tablesExist
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                      : dbStatus.connected
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                  }`}
                  id="supabase-status-badge"
                  title="Configuración de base de datos Supabase"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    dbStatus.loading
                      ? 'bg-slate-400 animate-pulse'
                      : dbStatus.connected && dbStatus.tablesExist
                      ? 'bg-emerald-500 animate-pulse'
                      : dbStatus.connected
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`} />
                  <span>Supabase</span>
                </button>

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
          {dbStatus.connected && !dbStatus.tablesExist && (
            <div className={`p-4 rounded-3xl border flex items-start gap-3 animate-fade-in ${
              isDark ? 'bg-amber-950/25 border-amber-900/40 text-amber-300 shadow-sm' : 'bg-amber-50/70 border-amber-200/60 text-amber-800 shadow-sm'
            }`} id="missing-tables-warning-banner">
              <div className="p-1.5 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                <CategoryIcon name="AlertTriangle" size={15} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-black">¡Falta configurar las Tablas en Supabase!</h4>
                <p className="text-[10.5px] leading-relaxed opacity-95">
                  La conexión con Supabase es correcta pero <strong>no se han creado las tablas requeridas</strong>. Por esto, los registros no se guardan permanentemente en la nube. Haz clic en el botón <strong className="underline cursor-pointer" onClick={() => setShowDbModal(true)}>Supabase</strong> arriba para copiar el script SQL y ejecutarlo en el panel de control de Supabase.
                </p>
              </div>
            </div>
          )}

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
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtros</span>
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

        {/* Modal de Conexión de Base de Datos Supabase */}
        {showDbModal && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-45 flex flex-col justify-end animate-fade-in" id="supabase-config-modal">
            <div className={`w-full max-h-[85%] rounded-t-[32px] p-6 overflow-y-auto flex flex-col space-y-4 border-t transition-colors duration-300 shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <CategoryIcon name="Database" className="text-emerald-500" size={18} />
                    Base de Datos Supabase
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sincronización en la Nube</p>
                </div>
                <button 
                  onClick={() => setShowDbModal(false)} 
                  className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                >
                  <CategoryIcon name="X" size={16} />
                </button>
              </div>

              {/* Tarjeta de Estado */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                dbStatus.loading
                  ? 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  : dbStatus.connected && dbStatus.tablesExist
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                  : dbStatus.connected
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
                  : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      dbStatus.loading
                        ? 'bg-slate-400 animate-pulse'
                        : dbStatus.connected && dbStatus.tablesExist
                        ? 'bg-emerald-500 animate-pulse'
                        : dbStatus.connected
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                    }`} />
                    <span className="text-xs font-black">
                      {dbStatus.loading 
                        ? 'Verificando...' 
                        : dbStatus.connected && dbStatus.tablesExist 
                        ? '¡Conectado y Listo!' 
                        : dbStatus.connected 
                        ? 'Conectado (Faltan Tablas)' 
                        : 'Desconectado'}
                    </span>
                  </div>
                </div>

                <div className="text-xs leading-relaxed">
                  {dbStatus.loading && <p className="text-slate-400">Comprobando la disponibilidad del servidor de Supabase...</p>}
                  {!dbStatus.loading && dbStatus.connected && dbStatus.tablesExist && (
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Tu aplicación está conectada con éxito. Todos los gastos y presupuestos se están sincronizando en tiempo real con Supabase.
                    </p>
                  )}
                  {!dbStatus.loading && dbStatus.connected && !dbStatus.tablesExist && (
                    <p className="text-amber-600 dark:text-amber-400 font-bold">
                      La conexión se estableció, pero no se encontraron las tablas "expenses" y/o "monthly_income". Ejecuta el script SQL de abajo en tu panel de Supabase.
                    </p>
                  )}
                  {!dbStatus.loading && !dbStatus.connected && (
                    <p className="text-rose-600 dark:text-rose-400 font-bold">
                      No se pudo conectar. Error: {dbStatus.error || 'Credenciales inválidas'}. Asegúrate de configurar las variables correctamente.
                    </p>
                  )}
                </div>

                {/* Acciones de sincronización */}
                {dbStatus.connected && dbStatus.tablesExist && (
                  <div className="flex gap-2 pt-2 border-t border-slate-250 dark:border-slate-800">
                    <button
                      onClick={checkSupabase}
                      className={`w-full py-2.5 px-3 border font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
                        isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                      title="Refrescar estado"
                    >
                      <CategoryIcon name="RefreshCw" size={13} />
                      Refrescar Estado de la Conexión
                    </button>
                  </div>
                )}
              </div>

              {/* Script de Creación de Tablas SQL (para cuando falta la tabla) */}
              {!dbStatus.loading && dbStatus.connected && !dbStatus.tablesExist && (
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">Instrucciones de Instalación:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(SQL_CREATION_SCRIPT);
                        triggerNotification('¡Script SQL copiado!', 'success');
                      }}
                      className="text-[10px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
                    >
                      <CategoryIcon name="Copy" size={12} />
                      Copiar SQL
                    </button>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto max-h-[150px]">
                    <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap leading-tight select-all">
                      {SQL_CREATION_SCRIPT}
                    </pre>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Paso: Ve a tu proyecto en <strong>Supabase</strong> -&gt; <strong>SQL Editor</strong> -&gt; <strong>New Query</strong>, pega el código de arriba y presiona <strong>Run</strong>. Después de correrlo, haz clic en verificar.
                  </p>
                  <button
                    onClick={checkSupabase}
                    className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform animate-pulse"
                  >
                    <CategoryIcon name="RefreshCw" size={14} />
                    Verificar conexión de tablas
                  </button>
                </div>
              )}

              {/* Botón de reintento para Desconectado */}
              {!dbStatus.loading && !dbStatus.connected && (
                <button
                  onClick={checkSupabase}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <CategoryIcon name="RefreshCw" size={14} />
                  Reintentar Conexión
                </button>
              )}

              <button
                onClick={() => setShowDbModal(false)}
                className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all border ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        )}

        {/* Modal de Gestión de Perfil */}
        {showProfileModal && sessionUser && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-45 flex flex-col justify-end animate-fade-in" id="profile-management-modal">
            <div className={`w-full max-h-[90%] rounded-t-[32px] p-6 overflow-y-auto flex flex-col space-y-5 border-t transition-colors duration-300 shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <CategoryIcon name="User" className="text-emerald-500" size={18} />
                    Gestión de Perfil
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configuración de tu Cuenta</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                >
                  <CategoryIcon name="X" size={16} />
                </button>
              </div>

              {/* Información Actual */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Correo Electrónico Actual</span>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <CategoryIcon name="Mail" size={14} />
                  </div>
                  <span className="text-xs font-black truncate">{sessionUser.email}</span>
                </div>
              </div>

              {/* Actualizar Correo */}
              <form onSubmit={handleUpdateEmail} className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-0.5">Cambiar Correo Electrónico</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="Nuevo correo"
                    className={`flex-1 px-3 py-2 text-xs rounded-xl font-bold border outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950 border-slate-850 text-white focus:border-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingEmail}
                    className="px-4 bg-emerald-600 hover:bg-emerald-550 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {isUpdatingEmail ? '...' : 'Actualizar'}
                  </button>
                </div>
              </form>

              {/* Actualizar Contraseña */}
              <div className="flex flex-col gap-2">
                <button 
                  type="button"
                  onClick={() => setShowUpdatePassword(!showUpdatePassword)}
                  className={`text-[10px] font-extrabold uppercase tracking-wider text-left px-0.5 flex items-center justify-between group ${
                    showUpdatePassword ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                >
                  Cambiar Contraseña
                  <CategoryIcon name={showUpdatePassword ? "ChevronUp" : "ChevronDown"} size={14} className="transition-transform" />
                </button>
                
                {showUpdatePassword && (
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPasswordUpdateInput}
                        onChange={(e) => setNewPasswordUpdateInput(e.target.value)}
                        placeholder="Nueva contraseña (min. 6)"
                        className={`flex-1 px-3 py-2 text-xs rounded-xl font-bold border outline-none transition-all ${
                          isDark 
                            ? 'bg-slate-950 border-slate-850 text-white focus:border-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-xs'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-4 bg-emerald-600 hover:bg-emerald-550 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        {isUpdatingPassword ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="border-t border-slate-750/20 my-1"></div>

              {/* Acciones de Peligro */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
                >
                  <CategoryIcon name="LogOut" size={14} />
                  Cerrar Sesión
                </button>

                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2.5 bg-rose-600/5 hover:bg-rose-600/10 text-rose-500 font-bold text-xs rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2"
                >
                  <CategoryIcon name="Trash2" size={14} />
                  Eliminar mi Cuenta para Siempre
                </button>
              </div>

              <div className={`p-3 rounded-xl border text-[9px] leading-normal flex gap-2 ${
                isDark ? 'bg-slate-950/30 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-150 text-slate-500'
              }`}>
                <CategoryIcon name="Info" size={12} className="text-slate-400 shrink-0 mt-0.5" />
                <p>
                  Al actualizar tu correo, tus registros de gastos e ingresos se transferirán automáticamente a tu nueva identidad.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Cerrar Sesión si está logueado - ELIMINADO en favor del modal de perfil */}

        {/* Custom Confirmation Modal para Perfiles */}
        {confirmModal && confirmModal.isOpen && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="custom-confirm-modal-profiles">
            <div 
              className={`w-full max-w-xs rounded-3xl p-5 border shadow-2xl transition-all scale-in ${
                isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'
              }`}
            >
              <h3 className="text-xs font-black tracking-tight mb-2 uppercase text-rose-500">
                {confirmModal.title}
              </h3>
              <p className={`text-[11px] mb-5 leading-normal font-medium whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-slate-655'}`}>
                {confirmModal.message}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                    isDark 
                      ? 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700 hover:text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-3 py-1.5 text-[10px] font-black rounded-lg bg-rose-600 text-white hover:bg-rose-550 transition-colors shadow-sm shadow-rose-600/15"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

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
      </>
    )}
  </div>

      {/* Panel Técnico en la vista de escritorio */}
      <div className={`hidden lg:flex flex-col max-w-[420px] border rounded-[30px] p-6 shadow-xl mt-6 space-y-4 self-center ml-8 text-xs leading-relaxed absolute left-[calc(50%+230px)] top-1/2 -translate-y-1/2 transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-300 shadow-black/40' 
          : 'bg-white border-slate-200 text-slate-600 shadow-slate-100'
      }`}>
        <div className={`flex items-center gap-1.5 border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-150'}`}>
          <CategoryIcon name="Sparkles" className="text-emerald-500" size={16} />
          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Sincronización en la Nube</h3>
        </div>
        <p>
          Esta aplicación ahora cuenta con una integración completa con <strong>Supabase</strong>. Tus gastos e ingresos mensuales están sincronizados y respaldados en la nube de manera segura.
        </p>
        <p>
          Puedes usar el botón <strong>Supabase</strong> en la barra superior para ver el estado de tu conexión, migrar registros antiguos, o verificar que las tablas necesarias estén correctamente creadas.
        </p>
        <div className={`p-3 rounded-2xl border flex gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800/50' : 'bg-slate-50 border-slate-100/50'
        }`}>
          <CategoryIcon name="Info" size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <p className={`text-[10px] leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <strong>Consejo:</strong> Haz clic en el badge <strong>Supabase</strong> del smartphone simulado para acceder al panel de administración de sincronización.
          </p>
        </div>
      </div>
    </div>
  );
}
