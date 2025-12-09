import React, { useEffect } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import Shell from './components/Layout/Shell';
import { DatabaseService } from './services/DatabaseService';
import { BleService } from './services/BleService';
import { I18nProvider } from './i18n';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';
import './index.css'; // Tailwind

setupIonicReact();

const App: React.FC = () => {
  
  useEffect(() => {
    // Initialize Services
    const init = async () => {
      await DatabaseService.getInstance().initialize();
      await BleService.getInstance().initialize();
    };
    init();
  }, []);

  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
};

export default App;
