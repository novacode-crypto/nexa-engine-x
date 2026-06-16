import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Binaries from "./components/Binaries";
import Dashboard from "./components/Dashboard";
import Diagnostics from "./components/Diagnostics";
import Extension from "./components/Extension";
import Layout from "./components/Layout";
import Logs from "./components/Logs";
import Plugins from "./components/Plugins";
import Settings from "./components/Settings";
import { SplashScreen } from "./components/SplashScreen";
import { useAppStore } from "./store/app-store";

function App() {
  const [loading, setLoading] = useState(true);
  const { activeTab, setActiveTab } = useAppStore();

  useEffect(() => {
    const unsubscribe = window.electronAPI.onNavigate((route) => {
      const tabMap: Record<string, string> = {
        "/binaries": "binaries",
        "/settings": "settings",
      };
      if (tabMap[route]) {
        setActiveTab(tabMap[route]);
      }
    });
    return unsubscribe;
  }, [setActiveTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "binaries":
        return <Binaries />;
      case "plugins":
        return <Plugins />;
      case "extension":
        return <Extension />;
      case "settings":
        return <Settings />;
      case "logs":
        return <Logs />;
      case "diagnostics":
        return <Diagnostics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-[#07071a]">
      <AnimatePresence>
        {loading && <SplashScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
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
      )}
    </div>
  );
}

export default App;
