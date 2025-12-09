import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/zones', label: 'Zones', icon: '🌱' },
    { path: '/history', label: 'History', icon: '📈' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 h-full glass-panel m-4 flex flex-col p-4">
      <div className="text-2xl font-bold text-cyber-cyan mb-8 tracking-wider">
        AUTO<span className="text-white">WATER</span>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => history.push(item.path)}
              className={`
                flex items-center p-3 rounded-lg cursor-pointer transition-colors
                ${isActive ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30' : 'text-gray-400 hover:bg-white/5'}
              `}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-8 bg-cyber-cyan rounded-r-full"
                />
              )}
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10">
        <div className="text-xs text-gray-500">
          System Status: <span className="text-cyber-emerald">ONLINE</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
