import React from 'react';
import { IonApp, IonContent, IonPage, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route, Switch } from 'react-router-dom';
import { motion } from 'framer-motion';

// Desktop Pages
import Dashboard from '../../pages/Dashboard';
import Zones from '../../pages/Zones';
import HistoryDashboard from '../../pages/HistoryDashboard';
import Settings from '../../pages/Settings';

// Mobile Pages
import MobileDashboard from '../../pages/mobile/MobileDashboard';
import MobileZones from '../../pages/mobile/MobileZones';
import MobileZoneDetails from '../../pages/mobile/MobileZoneDetails';
import MobileZoneDetailsFull from '../../pages/mobile/MobileZoneDetailsFull';
import MobileZoneConfig from '../../pages/mobile/MobileZoneConfig';
import MobileHistory from '../../pages/mobile/MobileHistory';
import MobileSettings from '../../pages/mobile/MobileSettings';
import MobileWelcome from '../../pages/mobile/MobileWelcome';
import MobileDeviceScan from '../../pages/mobile/MobileDeviceScan';
import MobilePermissions from '../../pages/mobile/MobilePermissions';
import MobileOnboardingWizard from '../../pages/mobile/MobileOnboardingWizard';
import MobileWeatherDetails from '../../pages/mobile/MobileWeatherDetails';
import MobileNotifications from '../../pages/mobile/MobileNotifications';
import MobileDeviceInfo from '../../pages/mobile/MobileDeviceInfo';
import MobileDeviceSettings from '../../pages/mobile/MobileDeviceSettings';
import MobileAppSettings from '../../pages/mobile/MobileAppSettings';
import MobileHelpAbout from '../../pages/mobile/MobileHelpAbout';
import MobileTimeLocation from '../../pages/mobile/MobileTimeLocation';
import MobilePowerMode from '../../pages/mobile/MobilePowerMode';
import MobileDeviceReset from '../../pages/mobile/MobileDeviceReset';
import MobileMasterValve from '../../pages/mobile/MobileMasterValve';
import MobileFlowCalibration from '../../pages/mobile/MobileFlowCalibration';
import MobileNoDevices from '../../pages/mobile/MobileNoDevices';
import MobileConnectionSuccess from '../../pages/mobile/MobileConnectionSuccess';
import MobileManageDevices from '../../pages/mobile/MobileManageDevices';
import MobileZoneAddWizard from '../../pages/mobile/MobileZoneAddWizard';
import MobileAlarmHistory from '../../pages/mobile/MobileAlarmHistory';
import MobilePacksSettings from '../../pages/mobile/MobilePacksSettings';

import AndroidBackButtonHandler from '../AndroidBackButtonHandler';

// Components
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import MobileBottomNav from '../mobile/MobileBottomNav';
import { useAppStore } from '../../store/useAppStore';

// Hooks
import { useMediaQuery } from '../../hooks/useMediaQuery';

setupIonicReact();

const Shell: React.FC = () => {
  // Desktop is 1024px+, tablet/mobile below
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { connectionState } = useAppStore();
  const isConnected = connectionState === 'connected';

  // Mobile UI for phones (< 1024px)
  if (!isDesktop) {
    return (
      <IonApp className="bg-mobile-bg-dark text-white font-manrope">
        <IonReactRouter>
          <AndroidBackButtonHandler />
          <IonPage>
            <IonContent
              fullscreen
              className="bg-transparent"
              style={{ '--background': 'transparent' } as React.CSSProperties}
            >
              <div className="min-h-screen bg-mobile-bg-dark">
                <Switch>
              {/* Welcome & Connection Flow */}
              <Route exact path="/welcome" component={MobileWelcome} />
              <Route exact path="/no-devices" component={MobileNoDevices} />
              <Route exact path="/permissions" component={MobilePermissions} />
              <Route exact path="/scan" component={MobileDeviceScan} />
              <Route exact path="/connection-success" component={MobileConnectionSuccess} />
              <Route exact path="/onboarding" component={MobileOnboardingWizard} />
              
              {/* Main App Routes - only accessible when connected */}
              <Route exact path="/dashboard">
                {isConnected ? <MobileDashboard /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/zones">
                {isConnected ? <MobileZones /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/zones/add">
                {isConnected ? <MobileZoneAddWizard /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/zones/:channelId">
                {isConnected ? <MobileZoneDetailsFull /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/zones/:channelId/config">
                {isConnected ? <MobileZoneConfig /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/history">
                {isConnected ? <MobileHistory /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/settings">
                {isConnected ? <MobileSettings /> : <Redirect to="/welcome" />}
              </Route>
              
              {/* Weather & Environment */}
              <Route exact path="/weather">
                {isConnected ? <MobileWeatherDetails /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/notifications">
                {isConnected ? <MobileNotifications /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/alarms">
                {isConnected ? <MobileAlarmHistory /> : <Redirect to="/welcome" />}
              </Route>
              
              {/* Device Settings */}
              <Route exact path="/device">
                {isConnected ? <MobileDeviceSettings /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/info">
                {isConnected ? <MobileDeviceInfo /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/time">
                {isConnected ? <MobileTimeLocation /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/master-valve">
                {isConnected ? <MobileMasterValve /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/flow-calibration">
                {isConnected ? <MobileFlowCalibration /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/power-mode">
                {isConnected ? <MobilePowerMode /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/reset">
                {isConnected ? <MobileDeviceReset /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/device/packs">
                {isConnected ? <MobilePacksSettings /> : <Redirect to="/welcome" />}
              </Route>
              
              {/* App Settings */}
              <Route exact path="/app-settings">
                {isConnected ? <MobileAppSettings /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/help">
                {isConnected ? <MobileHelpAbout /> : <Redirect to="/welcome" />}
              </Route>
              <Route exact path="/manage-devices">
                {isConnected ? <MobileManageDevices /> : <Redirect to="/welcome" />}
              </Route>
              
              {/* Default redirect */}
              <Route exact path="/">
                <Redirect to={isConnected ? "/dashboard" : "/welcome"} />
              </Route>
              
              {/* Fallback */}
              <Route>
                <Redirect to={isConnected ? "/dashboard" : "/welcome"} />
              </Route>
                </Switch>

                {/* Bottom Navigation - only show when connected and not on welcome/scan/onboarding */}
                {isConnected && (
                  <Route render={({ location }) => {
                    const hideNavPaths = ['/welcome', '/scan', '/permissions', '/onboarding', '/device/', '/zones/', '/weather', '/notifications', '/app-settings', '/help'];
                    const shouldHide = hideNavPaths.some(p => location.pathname.startsWith(p)) ||
                                      (location.pathname.startsWith('/zones/') && location.pathname.includes('/'));
                    return shouldHide ? null : <MobileBottomNav />;
                  }} />
                )}
              </div>
            </IonContent>
          </IonPage>
        </IonReactRouter>
      </IonApp>
    );
  }

  // Desktop UI (original)
  return (
    <IonApp className="bg-cyber-dark text-white">
      <IonReactRouter>
        <AndroidBackButtonHandler />
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
