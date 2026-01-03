import React, { useState } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import WateringHistoryCard from '../components/WateringHistoryCard';
import RainHistoryCard from '../components/RainHistoryCard';
import EnvHistoryCard from '../components/EnvHistoryCard';
import StatisticsCard from '../components/StatisticsCard';
import { useI18n } from '../i18n';

const Analytics: React.FC = () => {
  const { currentTask, envData, connectionState, wateringHistory, rainHistoryDaily } = useAppStore();
  const { t } = useI18n();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastColor, setToastColor] = useState<string>('dark');

  const handleToast = (message: string, color: string = 'dark') => {
    setToastMessage(message);
    setToastColor(color);
  };

  const totalVolumeLiters = currentTask ? (currentTask.total_volume / 1000).toFixed(1) : '0.0';
  const currentTemp = envData ? envData.temperature.toFixed(1) : '--';
  const currentHumidity = envData ? envData.humidity.toFixed(0) : '--';
  
  // Calculate total rain from history
  const totalRainMm = rainHistoryDaily.length > 0 
    ? (rainHistoryDaily.reduce((sum, e) => sum + e.total_rainfall_mm_x100, 0) / 100).toFixed(1)
    : '--';
    
  // Calculate watering efficiency (success rate)
  const efficiencyPct = wateringHistory.length > 0
    ? Math.round(wateringHistory.filter(e => e.success_status === 1).length / wateringHistory.length * 100)
    : 0;

  return (
    <IonPage>
      <IonContent className="bg-cyber-dark">
        <div className="p-6 max-w-7xl mx-auto pb-24">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">{t('analytics.title')}</h1>
            <span className={`text-sm font-mono ${connectionState === 'connected' ? 'text-cyber-primary' : 'text-gray-500'}`}>
              {connectionState === 'connected' ? t('analytics.liveData') : t('analytics.offline')}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('labels.totalVolume'), value: `${totalVolumeLiters} ${t('common.litersShort')}`, color: 'text-blue-400' },
              { label: t('analytics.summary.currentTemp'), value: `${currentTemp}${t('common.degreesC')}`, color: 'text-orange-400' },
              { label: t('analytics.summary.rain7d'), value: `${totalRainMm} ${t('common.mm')}`, color: 'text-cyan-400' },
              { label: t('labels.efficiency'), value: `${efficiencyPct}${t('common.percent')}`, color: 'text-green-400' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-xl p-4"
              >
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Statistics Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <StatisticsCard onToast={handleToast} />
          </motion.div>

          {/* History Cards */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <WateringHistoryCard onToast={handleToast} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <EnvHistoryCard onToast={handleToast} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <RainHistoryCard onToast={handleToast} />
            </motion.div>
          </div>

        </div>
      </IonContent>

      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage(null)}
        message={toastMessage || ''}
        duration={2500}
        color={toastColor}
        position="bottom"
      />
    </IonPage>
  );
};

export default Analytics;