import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstallable(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We can't use the prompt again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-4 right-4 z-50 flex items-center justify-between p-4 bg-indigo-500 text-white rounded-2xl shadow-xl border border-indigo-400"
        >
          <div>
            <h4 className="font-bold">Install App</h4>
            <p className="text-xs text-indigo-100">Add to your home screen for offline access</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-transform"
          >
            <Download size={16} />
            Install
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
