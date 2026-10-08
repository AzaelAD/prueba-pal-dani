import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    business_name: 'CuraMed Material de Curación',
    business_rfc: 'CMED240101AB8',
    business_phone: '+52 (55) 5482-9900',
    business_address: 'Av. Paseo de los Médicos #124, Zona Hospitales, CDMX',
    ticket_footer: '¡Gracias por su compra! Material estéril con registro sanitario.',
    tax_rate: '16',
    apply_tax: 'true',
    currency: 'MXN'
  });

  const loadSettings = async () => {
    if (!token) return;
    try {
      const res = await api.get('/admin/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch {
      // Usar settings por defecto si falla
    }
  };

  useEffect(() => {
    loadSettings();
  }, [token]);

  const updateLocalSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const formatMoney = (amount) => {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: settings.currency || 'MXN',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <SettingsContext.Provider value={{ settings, loadSettings, updateLocalSettings, formatMoney }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
