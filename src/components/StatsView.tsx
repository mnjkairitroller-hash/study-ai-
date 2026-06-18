import React from 'react';
import { useAppContext } from '../store';
import { ShoppingBag, Star, Lock, Gift, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function StatsView() {
  const { userData, redeemReward } = useAppContext();

  if (!userData) return null;

  const rewards = [
    { id: 'cash_100', title: '₹100 UPI/Cash', cost: 100, icon: Gift, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'cash_250', title: '₹250 UPI/Cash', cost: 200, icon: Star, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'cash_1000', title: '₹1000 UPI/Cash', cost: 500, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  const handleRedeem = (cost: number, title: string) => {
    if (confirm(`Redeem "${title}" for ${cost} Points?`)) {
      redeemReward(cost, title);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Rewards Store</h2>
        <p className="app-text-muted">Exchange your hard-earned points for real rewards!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rewards.map(reward => {
          const Icon = reward.icon;
          const canAfford = userData.points >= reward.cost;
          return (
            <motion.div 
               whileHover={{ scale: 1.01 }}
               key={reward.id} 
               className="app-card rounded-2xl border p-4 flex flex-col justify-between gap-4 relative overflow-hidden"
            >
               <div className="flex items-center gap-4">
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${reward.bg}`}>
                   <Icon size={32} className={reward.color} />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-lg leading-tight mb-1">{reward.title}</h3>
                   <div className="text-sm font-semibold text-yellow-500 flex items-center gap-1">
                     <span>{reward.cost} Points</span>
                   </div>
                 </div>
               </div>
               <div>
                <button
                  onClick={() => handleRedeem(reward.cost, reward.id)}
                  disabled={!canAfford}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                    canAfford 
                      ? 'app-btn-primary hover:scale-[1.02]' 
                      : 'bg-black/10 dark:bg-white/10 opacity-50 cursor-not-allowed flex items-center justify-center gap-2 text-slate-400'
                  }`}
                >
                  {!canAfford && <Lock size={14} />}
                  Redeem
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Star className="text-yellow-500" /> Milestones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="app-card border rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check size={24} />
            </div>
            <div className="font-bold">First Steps</div>
            <div className="text-xs app-text-muted">Reached Level 1</div>
          </div>
          <div className="app-card border rounded-xl p-4 text-center opacity-50 grayscale">
            <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-xl">
              5
            </div>
            <div className="font-bold">Dedicated</div>
            <div className="text-xs app-text-muted">Reach a 5 day streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}
