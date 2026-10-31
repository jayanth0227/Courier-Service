import React, { useEffect, useRef } from 'react';

/**
 * InteractiveParticleBackground
 * 
 * Professional, high-performance HTML5 canvas particle network with interactive
 * cursor magnetism, constellation node connections, beacon pulses, and click ripples.
 * 
 * Features:
 * - Ultra-smooth 60fps physics with requestAnimationFrame
 * - IntersectionObserver to pause rendering when offscreen (zero CPU/GPU waste)
 * - DevicePixelRatio scaling for razor-sharp rendering on Retina/HiDPI screens
 * - Respects prefers-reduced-motion
 * - Non-blocking pointer events (never interferes with buttons or inputs)
 */
export const InteractiveParticleBackground = ({
  className = '',
  style = {},
  particleCount = null,
  speed = 0.5,
  maxDistance = 115,
  mouseRadius = 135,
  interactive = true,
  theme = 'logistics', // 'logistics' | 'subtle'
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId = null;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse & Touch Tracking State
    const mouse = {
      x: -1000,
      y: -1000,
      isActive: false,
    };

    // Click ripples
    const ripples = [];

    // Color palette tuned to enterprise logistics theme
    const colors = theme === 'subtle'
      ? ['rgba(148, 163, 184, 0.45)', 'rgba(203, 213, 225, 0.55)', 'rgba(99, 102, 241, 0.35)']
      : [
          'rgba(79, 70, 229, 0.55)',   // Indigo primary
          'rgba(99, 102, 241, 0.50)',  // Indigo light
          'rgba(59, 130, 246, 0.45)',  // Transit blue
          'rgba(14, 165, 233, 0.45)',  // Sky telemetry
          'rgba(16, 185, 129, 0.40)',  // Emerald delivery signal
        ];

    let particles = [];

    class Particle {
      constructor(w, h) {
        this.reset(w, h, true);
      }

      reset(w, h, randomInit = false) {
        this.x = randomInit ? Math.random() * w : (Math.random() > 0.5 ? 0 : w);
        this.y = randomInit ? Math.random() * h : Math.random() * h;
        
        const moveSpeed = (0.2 + Math.random() * 0.4) * speed;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * moveSpeed;
        this.vy = Math.sin(angle) * moveSpeed;
        
        this.radius = 1.2 + Math.random() * 2.0;
        this.baseRadius = this.radius;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // 12% of nodes act as transit hubs with glowing pulses
        this.isHub = Math.random() < 0.12;
        this.pulseAngle = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.02 + Math.random() * 0.02;
      }

      update(w, h) {
        if (prefersReducedMotion) return;

        this.x += this.vx;
        this.y += this.vy;

        // Soft bounce off canvas borders
        if (this.x < 0) {
          this.x = 0;
          this.vx = Math.abs(this.vx);
        } else if (this.x > w) {
          this.x = w;
          this.vx = -Math.abs(this.vx);
        }

        if (this.y < 0) {
          this.y = 0;
          this.vy = Math.abs(this.vy);
        } else if (this.y > h) {
          this.y = h;
          this.vy = -Math.abs(this.vy);
        }

        // Mouse interaction (gentle repulsion + magnetic return)
        if (interactive && mouse.isActive) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < mouseRadius && dist > 0) {
            const force = (mouseRadius - dist) / mouseRadius;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * force * 1.5;
            this.y += Math.sin(angle) * force * 1.5;
          }
        }

        // Ripple interaction
        for (let i = 0; i < ripples.length; i++) {
          const rip = ripples[i];
          const rdx = this.x - rip.x;
          const rdy = this.y - rip.y;
          const rdist = Math.hypot(rdx, rdy);
          const diff = Math.abs(rdist - rip.currentRadius);
          if (diff < 20) {
            const push = (1 - diff / 20) * (1 - rip.currentRadius / rip.maxRadius) * 2.2;
            const angle = Math.atan2(rdy, rdx);
            this.x += Math.cos(angle) * push;
            this.y += Math.sin(angle) * push;
          }
        }

        if (this.isHub) {
          this.pulseAngle += this.pulseSpeed;
        }
      }

      draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();

        // Hub beacon effect
        if (this.isHub && !prefersReducedMotion) {
          const pulse = (Math.sin(this.pulseAngle) + 1) / 2;
          const ringRadius = this.radius + 2 + pulse * 4.5;
          const ringAlpha = (1 - pulse) * 0.35;

          context.beginPath();
          context.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
          context.strokeStyle = `rgba(99, 102, 241, ${ringAlpha})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    }

    const initParticles = () => {
      if (width === 0 || height === 0) return;
      const count = particleCount !== null
        ? particleCount
        : Math.min(85, Math.max(28, Math.floor((width * height) / 13000)));

      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(width, height));
      }
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      initParticles();
    };

    // ResizeObserver ensures exact canvas dimensions on all screens
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);

    // Mouse & Touch event handlers bound to the container
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.isActive = true;
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleTouchMove = (e) => {
      if (!e.touches || !e.touches[0]) return;
      const rect = container.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.isActive = true;
    };

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      ripples.push({
        x: clickX,
        y: clickY,
        currentRadius: 0,
        maxRadius: Math.min(width, height) * 0.35,
        speed: 3.5,
        alpha: 0.45,
      });

      // Cap ripples list
      if (ripples.length > 5) ripples.shift();
    };

    // Bind event listeners to container so they trigger even if canvas has pointer-events: none
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleMouseLeave, { passive: true });
    container.addEventListener('click', handleClick, { passive: true });

    // Window mousemove fallback so moving over interactive cards/buttons also updates position smoothly
    const handleWindowMouseMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.isActive = true;
      }
    };
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });

    // IntersectionObserver to pause rendering when hero/component is scrolled out of view
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !animationFrameId) {
            renderLoop();
          }
        });
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // Main animation loop
    const renderLoop = () => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw and update ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        rip.currentRadius += rip.speed;
        const progress = rip.currentRadius / rip.maxRadius;
        const currentAlpha = rip.alpha * (1 - progress);

        if (progress >= 1) {
          ripples.splice(r, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 102, 241, ${currentAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 2. Connect nearby particles (Transit Constellation Network)
      const pLen = particles.length;
      for (let i = 0; i < pLen; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < pLen; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.16;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // 3. Connect particles to mouse cursor when close
        if (interactive && mouse.isActive) {
          const mdx = p1.x - mouse.x;
          const mdy = p1.y - mouse.y;
          const mDist = Math.hypot(mdx, mdy);

          if (mDist < mouseRadius) {
            const mAlpha = (1 - mDist / mouseRadius) * 0.32;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(79, 70, 229, ${mAlpha})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }
      }

      // 4. Update and draw each particle
      for (let i = 0; i < pLen; i++) {
        const p = particles[i];
        p.update(width, height);
        p.draw(ctx);
      }

      // 5. Draw gentle cursor halo when active inside container
      if (interactive && mouse.isActive && !prefersReducedMotion) {
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouseRadius * 0.7
        );
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
        gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.03)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouseRadius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Initial setup
    resize();
    renderLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleMouseLeave);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, [particleCount, speed, maxDistance, mouseRadius, interactive, theme]);

  return (
    <div
      ref={containerRef}
      className={`particle-background-container ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none', // Allows clicking through to cards and buttons
        zIndex: 1,
        ...style,
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default InteractiveParticleBackground;
