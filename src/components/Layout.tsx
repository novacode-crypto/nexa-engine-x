import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-screen overflow-hidden"
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(45, 45, 107, 0.6)',
        boxShadow: '0 0 0 1px rgba(168, 85, 247, 0.1), 0 20px 50px -10px rgba(0, 0, 0, 0.5)',
        background: '#07071a',
        backgroundImage: 'radial-gradient(ellipse 200% 120% at 80% -10%, rgba(168,85,247,0.18) 0%, transparent 55%), radial-gradient(ellipse 150% 100% at 10% 110%, rgba(6,182,212,0.09) 0%, transparent 55%), linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px'
      }}
    >
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-[#07071a]/50">
          <div className="h-full p-5 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </motion.div>
  );
}
