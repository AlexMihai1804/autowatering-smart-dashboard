import React from 'react';
import { IonApp, IonContent, IonPage, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { motion } from 'framer-motion';

// Pages
import Dashboard from '../../pages/Dashboard';
import Zones from '../../pages/Zones';
import HistoryDashboard from '../../pages/HistoryDashboard';
import Settings from '../../pages/Settings';

// Components
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import { useAppStore } from '../../store/useAppStore';

// Hooks
import { useMediaQuery } from '../../hooks/useMediaQuery';

setupIonicReact();

const Shell: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { connectionState } = useAppStore();
  const isConnected = connectionState === 'connected';

  return (
    <IonApp className="bg-cyber-dark text-white">
      <IonReactRouter>
        {isDesktop ? (
          <div className="flex h-screen overflow-hidden bg-cyber-gradient">
            {isConnected && <Sidebar />}
            <main className="flex-1 overflow-y-auto relative">
               <IonRouterOutlet>
                  <Route exact path="/dashboard" component={Dashboard} />
                  <Route exact path="/zones" render={() => isConnected ? <Zones /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/history" render={() => isConnected ? <HistoryDashboard /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/settings" render={() => isConnected ? <Settings /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/" render={() => <Redirect to="/dashboard" />} />
               </IonRouterOutlet>
            </main>
          </div>
        ) : (
          <IonPage id="main-content">
            <IonContent className="bg-cyber-dark">
                <IonRouterOutlet>
                  <Route exact path="/dashboard" component={Dashboard} />
                  <Route exact path="/zones" render={() => isConnected ? <Zones /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/history" render={() => isConnected ? <HistoryDashboard /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/settings" render={() => isConnected ? <Settings /> : <Redirect to="/dashboard" />} />
                  <Route exact path="/" render={() => <Redirect to="/dashboard" />} />
                </IonRouterOutlet>
            </IonContent>
            {isConnected && <BottomTabs />}
          </IonPage>
        )}
      </IonReactRouter>
    </IonApp>
  );
};

export default Shell;
