import { useEffect, type RefObject } from 'react';

export function useHolographicTilt(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Mouse movement handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element.
      const y = e.clientY - rect.top;  // y position within the element.
      
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      // Calculate angles based on mouse position relative to center
      const tiltX = (yc - y) / 10; // max ~10 degrees
      const tiltY = (x - xc) / 10;
      
      // Calculate highlight sheen position
      const percentageX = (x / rect.width) * 100;
      const percentageY = (y / rect.height) * 100;
      
      el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
      el.style.setProperty('--sheen-x', `${percentageX}%`);
      el.style.setProperty('--sheen-y', `${percentageY}%`);
      el.style.setProperty('--sheen-opacity', '0.25');
    };

    const handleMouseLeave = () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      el.style.setProperty('--sheen-opacity', '0');
    };

    // Device orientation handler for mobile
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const { beta, gamma } = e; // beta (pitch -180 to 180), gamma (roll -90 to 90)
      if (beta === null || gamma === null) return;
      
      // Constrain rotation
      const tiltX = Math.max(-15, Math.min(15, (beta - 45) / 2)); // assume sitting angle ~45 deg
      const tiltY = Math.max(-15, Math.min(15, gamma / 2));
      
      // Scheen mapping based on orientation angles
      const percentageX = ((gamma + 30) / 60) * 100;
      const percentageY = ((beta - 20) / 50) * 100;
      
      el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
      el.style.setProperty('--sheen-x', `${percentageX}%`);
      el.style.setProperty('--sheen-y', `${percentageY}%`);
      el.style.setProperty('--sheen-opacity', '0.2');
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [ref, enabled]);
}
