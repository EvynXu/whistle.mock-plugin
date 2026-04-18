import React from 'react';

const FeatureCard = ({ icon, title, description, color = 'primary' }) => {
  const colorClasses = {
    primary: 'border-cyber-cyan text-cyber-cyan shadow-cyber-glow',
    green: 'border-cyber-green text-cyber-green shadow-cyber-glow-green',
    purple: 'border-cyber-purple text-cyber-purple',
    orange: 'border-cyber-orange text-cyber-orange',
    blue: 'border-cyber-cyan text-cyber-cyan',
    pink: 'border-cyber-pink text-cyber-pink',
  };

  const glowClasses = {
    primary: 'group-hover:shadow-cyber-glow',
    green: 'group-hover:shadow-cyber-glow-green',
    purple: 'group-hover:shadow-[0_0_10px_rgba(189,0,255,0.5)]',
    orange: 'group-hover:shadow-[0_0_10px_rgba(255,107,53,0.5)]',
    blue: 'group-hover:shadow-cyber-glow',
    pink: 'group-hover:shadow-[0_0_10px_rgba(255,0,128,0.5)]',
  };

  return (
    <div className="card-cyber group">
      <div className={`w-14 h-14 border-2 ${colorClasses[color]} bg-cyber-black flex items-center justify-center mb-4 transition-all duration-300 ${glowClasses[color]}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-xl font-display font-bold text-white mb-2 tracking-wide">{title}</h3>
      <p className="text-cyber-muted leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
