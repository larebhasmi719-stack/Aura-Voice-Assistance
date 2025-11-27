import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  active: boolean;
  volume: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = ({ active, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;
    
    // Particles for effect
    const particles: {x: number, y: number, r: number, a: number, s: number}[] = [];
    for(let i=0; i<20; i++) {
        particles.push({
            x: Math.random() * canvas.width, 
            y: Math.random() * canvas.height, 
            r: Math.random() * 2, 
            a: Math.random() * Math.PI * 2,
            s: 0.5 + Math.random()
        });
    }

    const render = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Global Rotation for rings
      rotation += 0.005 + (volume * 0.05);

      if (!active) {
        // Idle State: Holographic Standby
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Date.now() / 3000);
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 15]);
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Small breathing center
        const breath = Math.sin(Date.now() / 1000) * 2;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
        ctx.arc(centerX, centerY, 5 + breath, 0, Math.PI * 2);
        ctx.fill();
        return; 
      }

      // ACTIVE STATE: CORE REACTOR
      const energy = volume * 150; // Dynamic scale based on voice
      
      ctx.save();
      ctx.translate(centerX, centerY);

      // 1. Outer Tech Ring (Rotating Slow)
      ctx.save();
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10, 5, 10]);
      ctx.arc(0, 0, 80 + (energy * 0.2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. Inner Ring (Rotating Reverse)
      ctx.save();
      ctx.rotate(-rotation * 1.5);
      ctx.beginPath();
      ctx.strokeStyle = '#d946ef'; // Magenta accent
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 20]);
      ctx.arc(0, 0, 60 + (energy * 0.3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Audio Waveform (Frequency simulation)
      ctx.beginPath();
      for (let i = 0; i < 360; i += 5) {
          const angle = (i * Math.PI) / 180;
          const r = 40 + energy + (Math.random() * energy * 0.5);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20 + energy;
      ctx.shadowColor = '#00ffff';
      ctx.fill();
      ctx.stroke();

      // 4. Center Core
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(0, 0, 10 + (energy * 0.1), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [active, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full absolute top-0 left-0 pointer-events-none"
    />
  );
};

export default Visualizer;