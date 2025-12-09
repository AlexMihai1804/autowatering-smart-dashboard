import React from 'react';
import { IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { statsChart, leaf, settings, timeOutline } from 'ionicons/icons';

const BottomTabs: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  return (
    <IonTabBar 
      slot="bottom" 
      className="bg-cyber-dark/90 backdrop-blur-lg border-t border-white/10"
      style={{ '--background': 'transparent', '--border': 'none' }}
    >
      <IonTabButton 
        tab="dashboard" 
        selected={location.pathname === '/dashboard'}
        onClick={() => history.push('/dashboard')}
        className="bg-transparent"
      >
        <IonIcon icon={statsChart} className={location.pathname === '/dashboard' ? 'text-cyber-cyan' : 'text-gray-500'} />
        <IonLabel className={location.pathname === '/dashboard' ? 'text-cyber-cyan' : 'text-gray-500'}>Dashboard</IonLabel>
      </IonTabButton>

      <IonTabButton 
        tab="zones" 
        selected={location.pathname === '/zones'}
        onClick={() => history.push('/zones')}
        className="bg-transparent"
      >
        <IonIcon icon={leaf} className={location.pathname === '/zones' ? 'text-cyber-emerald' : 'text-gray-500'} />
        <IonLabel className={location.pathname === '/zones' ? 'text-cyber-emerald' : 'text-gray-500'}>Zones</IonLabel>
      </IonTabButton>

      <IonTabButton 
        tab="history" 
        selected={location.pathname === '/history'}
        onClick={() => history.push('/history')}
        className="bg-transparent"
      >
        <IonIcon icon={timeOutline} className={location.pathname === '/history' ? 'text-cyan-400' : 'text-gray-500'} />
        <IonLabel className={location.pathname === '/history' ? 'text-cyan-400' : 'text-gray-500'}>History</IonLabel>
      </IonTabButton>

      <IonTabButton 
        tab="settings" 
        selected={location.pathname === '/settings'}
        onClick={() => history.push('/settings')}
        className="bg-transparent"
      >
        <IonIcon icon={settings} className={location.pathname === '/settings' ? 'text-cyber-amber' : 'text-gray-500'} />
        <IonLabel className={location.pathname === '/settings' ? 'text-cyber-amber' : 'text-gray-500'}>Settings</IonLabel>
      </IonTabButton>
    </IonTabBar>
  );
};

export default BottomTabs;
