import React, { useEffect, useRef, useState } from 'react';

const WeatherBackground = ({ condition = 'clear', isDay = true }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [lightningFlash, setLightningFlash] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle arrays
    let rainDrops = [];
    let rainSplashes = [];
    let snowFlakes = [];
    let stars = [];
    let activeLightning = null;

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // --- Particle Initializers ---

    // Initialize stars (only for clear night or cloudy night)
    const initStars = () => {
      stars = [];
      const starCount = 120;
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.75, // top 75% of screen
          radius: Math.random() * 1.5 + 0.3,
          opacity: Math.random(),
          twinkleSpeed: Math.random() * 0.015 + 0.005,
          twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    };

    // Initialize rain drops
    const initRain = (density = 100) => {
      rainDrops = [];
      for (let i = 0; i < density; i++) {
        rainDrops.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          length: Math.random() * 20 + 15,
          vy: Math.random() * 12 + 18,
          vx: Math.random() * 2 - 4, // slight slant to the left
          opacity: Math.random() * 0.4 + 0.2,
        });
      }
    };

    // Initialize snow
    const initSnow = () => {
      snowFlakes = [];
      const snowCount = 80;
      for (let i = 0; i < snowCount; i++) {
        snowFlakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 3 + 1,
          density: Math.random() * 20,
          vy: Math.random() * 1.2 + 0.8,
          vx: Math.random() * 0.8 - 0.4,
          opacity: Math.random() * 0.6 + 0.2,
        });
      }
    };

    // Trigger initialization based on active weather state
    const normalizedCond = condition.toLowerCase();
    const isNight = !isDay;

    if (isNight || normalizedCond === 'clear') {
      initStars();
    }
    if (normalizedCond === 'rain') {
      initRain(90);
    } else if (normalizedCond === 'storm') {
      initRain(160);
    } else if (normalizedCond === 'snow') {
      initSnow();
    }

    // --- Lightning Generator for Storms ---
    const generateLightningFork = (startX, startY) => {
      const segments = [];
      let currentX = startX;
      let currentY = startY;
      const length = Math.random() * (height * 0.5) + height * 0.3;
      const count = 15;
      const stepY = length / count;

      for (let i = 0; i < count; i++) {
        const nextY = currentY + stepY;
        // Jitter horizontally
        const nextX = currentX + (Math.random() * 60 - 30);
        segments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY });

        // Branching probability
        if (Math.random() < 0.25 && i < count - 3) {
          let branchX = nextX;
          let branchY = nextY;
          const branchLength = length * 0.3;
          const branchSteps = 5;
          const bStepY = branchLength / branchSteps;

          for (let j = 0; j < branchSteps; j++) {
            const bNextY = branchY + bStepY;
            const bNextX = branchX + (Math.random() * 40 - 20) + 15; // bend outwards
            segments.push({ x1: branchX, y1: branchY, x2: bNextX, y2: bNextY });
            branchX = bNextX;
            branchY = bNextY;
          }
        }

        currentX = nextX;
        currentY = nextY;
      }
      return {
        segments,
        opacity: 1,
        width: Math.random() * 3 + 2,
      };
    };

    // --- Frame Render Loop ---
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Stars (Clear Night or Cloudy Night)
      if (isNight) {
        ctx.fillStyle = '#ffffff';
        stars.forEach((star) => {
          // Twinkle logic
          star.opacity += star.twinkleSpeed * star.twinkleDirection;
          if (star.opacity >= 0.95) {
            star.twinkleDirection = -1;
          } else if (star.opacity <= 0.15) {
            star.twinkleDirection = 1;
          }

          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
          ctx.fill();
        });
      }

      // 2. Draw Rain Drops & Splashes
      if (normalizedCond === 'rain' || normalizedCond === 'storm') {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineCap = 'round';

        rainDrops.forEach((drop) => {
          ctx.beginPath();
          ctx.lineWidth = normalizedCond === 'storm' ? 2 : 1.5;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + drop.vx, drop.y + drop.length);
          ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`;
          ctx.stroke();

          // Move drop
          drop.x += drop.vx;
          drop.y += drop.vy;

          // Splash trigger when hitting ground/bottom area
          const groundLevel = height - Math.random() * 20;
          if (drop.y >= groundLevel) {
            // Create splashes
            if (rainSplashes.length < 100) {
              const splashCount = Math.random() * 3 + 1;
              for (let s = 0; s < splashCount; s++) {
                rainSplashes.push({
                  x: drop.x,
                  y: groundLevel,
                  vx: Math.random() * 4 - 2,
                  vy: Math.random() * -3 - 2,
                  radius: Math.random() * 1.5 + 0.5,
                  life: 0,
                  maxLife: Math.random() * 12 + 6,
                  opacity: Math.random() * 0.6 + 0.2,
                });
              }
            }

            // Reset drop to top
            drop.y = -20;
            drop.x = Math.random() * width;
            drop.vy = Math.random() * 12 + 18;
          }
        });

        // Draw Splashes
        rainSplashes.forEach((splash, idx) => {
          ctx.beginPath();
          ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(174, 194, 224, ${splash.opacity * (1 - splash.life / splash.maxLife)})`;
          ctx.fill();

          splash.x += splash.vx;
          splash.y += splash.vy;
          splash.vy += 0.2; // gravity effect
          splash.life++;

          if (splash.life >= splash.maxLife) {
            rainSplashes.splice(idx, 1);
          }
        });
      }

      // 3. Draw Snowflakes
      if (normalizedCond === 'snow') {
        snowFlakes.forEach((flake) => {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
          ctx.fill();

          // Move snow
          flake.y += flake.vy;
          // Sway side to side using sine wave
          flake.density += 0.01;
          flake.x += flake.vx + Math.sin(flake.density) * 0.4;

          // Reset when hitting bottom
          if (flake.y >= height) {
            flake.y = -10;
            flake.x = Math.random() * width;
            flake.vy = Math.random() * 1.2 + 0.8;
          }
        });
      }

      // 4. Draw lightning forks (Storm)
      if (normalizedCond === 'storm') {
        // Trigger lightning flashes at random intervals
        if (!activeLightning && Math.random() < 0.004) {
          const lX = Math.random() * width * 0.8 + width * 0.1;
          activeLightning = generateLightningFork(lX, 0);
          setLightningFlash(true);
          setTimeout(() => setLightningFlash(false), 80 + Math.random() * 120);
        }

        if (activeLightning) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(230, 235, 255, 1)';
          ctx.strokeStyle = `rgba(240, 245, 255, ${activeLightning.opacity})`;
          ctx.lineWidth = activeLightning.width;

          ctx.beginPath();
          activeLightning.segments.forEach((seg) => {
            ctx.moveTo(seg.y1 === 0 ? seg.x1 : seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          });
          ctx.stroke();

          // Reset shadows
          ctx.shadowBlur = 0;

          // Decay fork opacity
          activeLightning.opacity -= 0.08;
          if (activeLightning.opacity <= 0) {
            activeLightning = null;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [condition, isDay]);

  // Determine atmospheric type classes for CSS overlays
  const normalizedCond = condition.toLowerCase();
  const isNight = !isDay;

  return (
    <div
      ref={containerRef}
      className={`weather-bg ${normalizedCond}-bg ${isNight ? 'night-bg' : 'day-bg'} ${
        lightningFlash ? 'lightning-flash-active' : ''
      }`}
    >
      {/* HTML5 Canvas overlay for particles */}
      <canvas ref={canvasRef} className="weather-canvas" />

      {/* Sun overlay for Sunny Day */}
      {normalizedCond === 'clear' && isDay && (
        <div className="sun-container">
          <div className="sun-core" />
          <div className="sun-rays" />
        </div>
      )}

      {/* Moon overlay for Clear Night */}
      {normalizedCond === 'clear' && isNight && (
        <div className="moon-container">
          <div className="moon-core">
            <div className="moon-shadow" />
          </div>
          <div className="moon-glow" />
        </div>
      )}

      {/* Cloud Layers for cloudy state */}
      {(normalizedCond === 'cloudy' || normalizedCond === 'rain' || normalizedCond === 'storm') && (
        <div className="clouds-container">
          <div className="cloud-layer cloud-layer-1" />
          <div className="cloud-layer cloud-layer-2" />
          <div className="cloud-layer cloud-layer-3" />
        </div>
      )}

      {/* Ambient flash overlay for lighting */}
      {normalizedCond === 'storm' && (
        <div className={`lightning-overlay ${lightningFlash ? 'flash' : ''}`} />
      )}
    </div>
  );
};

export default WeatherBackground;
