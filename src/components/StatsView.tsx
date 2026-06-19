import React from 'react';
import { useAppContext } from '../store';
import { ShoppingBag, Star, Lock, Gift, Check, History } from 'lucide-react';
import { motion } from 'motion/react';

export default function StatsView() {
  const { userData, redeemReward } = useAppContext();

  if (!userData) return null;

  const rewards = [
    { id: 'cash_100', title: '₹100 UPI/Cash', cost: 1000, icon: Gift, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'cash_200', title: '₹200 UPI/Cash', cost: 2000, icon: Gift, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'cash_500', title: '₹500 UPI/Cash', cost: 5000, icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'cash_1000', title: '₹1000 UPI/Cash', cost: 10000, icon: Gift, color: 'text-rose-500', bg: 'bg-rose-500/10' }
  ];

  const handleRedeem = (cost: number, rewardId: string, rewardTitle: string) => {
    if (confirm(`Redeem "${rewardTitle}" for ${cost} Points?`)) {
      redeemReward(cost, rewardId, rewardTitle);
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
                  onClick={() => handleRedeem(reward.cost, reward.id, reward.title)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Milestones Card left */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
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

        {/* Redemption History right */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <History className="text-indigo-500" /> Redemption History
          </h2>
          
          {(!userData.redemptionHistory || userData.redemptionHistory.length === 0) ? (
            <div className="app-card border border-dashed rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center min-h-[160px]">
              <ShoppingBag className="mb-2 opacity-40" size={32} />
              <p className="font-medium text-sm">No points redeemed yet.</p>
              <p className="text-xs mt-1">Your redeemed rewards will appear here.</p>
            </div>
          ) : (
            <div className="app-card border rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[300px] overflow-y-auto custom-scrollbar">
              {userData.redemptionHistory.slice().reverse().map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Check size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(item.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-right justify-end">
                    <div className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      Code: <span className="font-bold text-indigo-500 select-all">{item.coupon}</span>
                    </div>
                    <div className="text-xs font-black text-rose-500 dark:text-rose-400">
                      -{item.cost} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
