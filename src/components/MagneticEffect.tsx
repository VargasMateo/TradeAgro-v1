import React, { useRef, useState, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MagneticEffectProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  intensity?: number;
}

export default function MagneticEffect({ children, className, onClick, intensity = 4 }: MagneticEffectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    
    // Calculate relative mouse position for rotation
    const x = (clientX - (left + width / 2)) / (width / 2);
    const y = (clientY - (top + height / 2)) / (height / 2);
    
    setPosition({ x, y });
    
    // Calculate mouse position for spotlight
    setMousePos({
      x: clientX - left,
      y: clientY - top
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX: isHovered ? position.y * -intensity : 0,
        rotateY: isHovered ? position.x * intensity : 0,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.5
      }}
      className={cn("relative overflow-hidden", className)}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      {children}
      
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.4), transparent 40%)`,
          mixBlendMode: 'overlay',
        }}
      />
    </motion.div>
  );
}
