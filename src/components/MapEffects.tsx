import { useEffect, useRef } from 'react';
import { PixiComponent } from '@pixi/react';
import * as PIXI from 'pixi.js';

// Strobe light positions (tile coords) — dancefloor and stage areas
const STROBE_LIGHTS = [
  // Dancefloor strobes
  { x: 4, y: 4, color: 0xff2d95, radius: 48, speed: 0.03 },
  { x: 8, y: 6, color: 0x00f0ff, radius: 40, speed: 0.025 },
  { x: 6, y: 8, color: 0xb026ff, radius: 44, speed: 0.035 },
  { x: 10, y: 4, color: 0xffe600, radius: 36, speed: 0.04 },
  { x: 3, y: 7, color: 0xff2d95, radius: 38, speed: 0.028 },
  // Stage area
  { x: 15, y: 3, color: 0x00f0ff, radius: 50, speed: 0.02 },
  { x: 16, y: 5, color: 0xb026ff, radius: 46, speed: 0.032 },
  { x: 14, y: 4, color: 0xff2d95, radius: 42, speed: 0.027 },
  // VIP zone
  { x: 27, y: 4, color: 0xffe600, radius: 35, speed: 0.022 },
  { x: 29, y: 6, color: 0xb026ff, radius: 40, speed: 0.03 },
  // Chill area
  { x: 38, y: 20, color: 0x00f0ff, radius: 30, speed: 0.015 },
  { x: 40, y: 22, color: 0xb026ff, radius: 28, speed: 0.018 },
];

// Smoke particle config
const SMOKE_EMITTERS = [
  // Near stage
  { x: 14, y: 2, count: 6 },
  { x: 17, y: 2, count: 6 },
  // Dancefloor edges
  { x: 1, y: 1, count: 4 },
  { x: 12, y: 10, count: 4 },
  // VIP
  { x: 25, y: 2, count: 3 },
  { x: 31, y: 2, count: 3 },
];

interface SmokeParticle {
  gfx: PIXI.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export const MapEffects = PixiComponent('MapEffects', {
  create: (props: { tileDim: number }) => {
    const container = new PIXI.Container();
    container.sortableChildren = true;

    const tileDim = props.tileDim;

    // === STROBE LIGHTS ===
    const strobeContainer = new PIXI.Container();
    strobeContainer.zIndex = 1;
    strobeContainer.alpha = 0.4;
    container.addChild(strobeContainer);

    const strobeGraphics: { gfx: PIXI.Graphics; config: typeof STROBE_LIGHTS[0]; phase: number }[] = [];

    for (const light of STROBE_LIGHTS) {
      const gfx = new PIXI.Graphics();
      gfx.beginFill(light.color, 0.6);
      gfx.drawCircle(0, 0, light.radius);
      gfx.endFill();
      gfx.x = light.x * tileDim + tileDim / 2;
      gfx.y = light.y * tileDim + tileDim / 2;
      gfx.blendMode = PIXI.BLEND_MODES.ADD;
      strobeContainer.addChild(gfx);
      strobeGraphics.push({ gfx, config: light, phase: Math.random() * Math.PI * 2 });
    }

    // === SMOKE PARTICLES ===
    const smokeContainer = new PIXI.Container();
    smokeContainer.zIndex = 2;
    container.addChild(smokeContainer);

    const particles: SmokeParticle[] = [];

    function spawnSmoke(emitter: typeof SMOKE_EMITTERS[0]) {
      const gfx = new PIXI.Graphics();
      const size = 8 + Math.random() * 16;
      gfx.beginFill(0xffffff, 0.15);
      gfx.drawCircle(0, 0, size);
      gfx.endFill();
      gfx.blendMode = PIXI.BLEND_MODES.ADD;

      const px = emitter.x * tileDim + Math.random() * tileDim * 2;
      const py = emitter.y * tileDim + Math.random() * tileDim;
      gfx.x = px;
      gfx.y = py;

      smokeContainer.addChild(gfx);
      particles.push({
        gfx,
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        life: 0,
        maxLife: 120 + Math.random() * 180,
        size,
      });
    }

    // Initial smoke spawn
    for (const emitter of SMOKE_EMITTERS) {
      for (let i = 0; i < emitter.count; i++) {
        spawnSmoke(emitter);
        // Spread out initial particles across their lifetime
        particles[particles.length - 1].life = Math.random() * particles[particles.length - 1].maxLife;
      }
    }

    // Animation ticker
    let frame = 0;
    const ticker = PIXI.Ticker.shared;
    const update = () => {
      frame++;

      // Update strobes
      for (const strobe of strobeGraphics) {
        const t = frame * strobe.config.speed + strobe.phase;
        // Pulsing intensity with occasional flashes
        const pulse = Math.sin(t) * 0.5 + 0.5;
        const flash = Math.sin(t * 7.3) > 0.92 ? 1.0 : 0;
        strobe.gfx.alpha = Math.min(1, pulse * 0.7 + flash);
        strobe.gfx.scale.set(0.8 + pulse * 0.4);
      }

      // Update smoke
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.05;
        p.gfx.x = p.x;
        p.gfx.y = p.y;

        const lifeRatio = p.life / p.maxLife;
        // Fade in then out
        if (lifeRatio < 0.2) {
          p.gfx.alpha = lifeRatio / 0.2 * 0.15;
        } else {
          p.gfx.alpha = (1 - lifeRatio) * 0.15;
        }
        p.gfx.scale.set(1 + lifeRatio * 2);

        if (p.life >= p.maxLife) {
          smokeContainer.removeChild(p.gfx);
          p.gfx.destroy();
          particles.splice(i, 1);
        }
      }

      // Respawn smoke
      if (frame % 10 === 0) {
        const emitter = SMOKE_EMITTERS[Math.floor(Math.random() * SMOKE_EMITTERS.length)];
        if (particles.length < 60) {
          spawnSmoke(emitter);
        }
      }
    };

    ticker.add(update);
    (container as any)._cleanupEffects = () => {
      ticker.remove(update);
    };

    return container;
  },

  willUnmount: (instance) => {
    (instance as any)._cleanupEffects?.();
  },

  applyProps: (instance, oldProps, newProps) => {
    // Static component, no prop updates needed
  },
});
