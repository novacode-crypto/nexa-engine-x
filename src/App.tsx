import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from './store/app-store';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Binaries from './components/Binaries';
import Plugins from './components/Plugins';
import Extension from './components/Extension';
import Settings from './components/Settings';
import Logs from './components/Logs';
import Diagnostics from './components/Diagnostics';

function App() {
  const { activeTab, setActiveTab } = useAppStore();

  useEffect(() => {
    const unsubscribe = window.electronAPI.onNavigate((route) => {
      const tabMap: Record<string, string> = {
        '/binaries': 'binaries',
        '/settings': 'settings'
      };
      if (tabMap[route]) {
        setActiveTab(tabMap[route]);
      }
    });
    return unsubscribe;
  }, [setActiveTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'binaries': return <Binaries />;
      case 'plugins': return <Plugins />;
      case 'extension': return <Extension />;
      case 'settings': return <Settings />;
      case 'logs': return <Logs />;
      case 'diagnostics': return <Diagnostics />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default App;