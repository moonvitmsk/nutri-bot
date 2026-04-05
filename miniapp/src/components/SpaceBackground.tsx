import React, { useEffect, useRef } from 'react';

const rgba = (r: number, g: number, b: number, a: number) =>
  `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const bh = { x: W * 0.52, y: H * 0.55, r: Math.min(W, H) * 0.04 };
    const TILT = 0.4; // disk perspective tilt

    // ── Stars ──
    let stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      sz: 0.3 + Math.random() * 1.0,
      op: 0.06 + Math.random() * 0.2,
      ph: Math.random() * TAU, sp: 0.003 + Math.random() * 0.007,
    }));

    // ── Spiral particles (the KEY visual — spiraling into BH) ──
    // Each particle orbits on a logarithmic spiral, shrinking radius over time
    const spirals = Array.from({ length: 250 }, () => {
      const maxR = bh.r * (2 + Math.random() * 8); // start radius
      return {
        angle: Math.random() * TAU,           // current angle
        maxR,                                   // starting radius
        r: maxR * (0.3 + Math.random() * 0.7), // current radius
        decay: 0.9985 + Math.random() * 0.001, // how fast it spirals in (closer to 1 = slower)
        angSpeed: (0.008 + Math.random() * 0.02) * (1 + bh.r * 2 / maxR), // angular speed (faster near center)
        sz: 0.3 + Math.random() * 2.5,
        op: 0.2 + Math.random() * 0.7,
        tail: Math.floor(3 + Math.random() * 8), // tail length (prev positions)
        hx: [] as number[], hy: [] as number[],   // position history for tail
        golden: Math.random() < 0.75,
      };
    });

    // ── Large "streamer" spirals (thick glowing arcs) ──
    const streamers = Array.from({ length: 30 }, () => {
      const maxR = bh.r * (3 + Math.random() * 7);
      return {
        angle: Math.random() * TAU,
        maxR,
        r: maxR * (0.5 + Math.random() * 0.5),
        decay: 0.999 + Math.random() * 0.0008,
        angSpeed: (0.005 + Math.random() * 0.012) * (1 + bh.r * 1.5 / maxR),
        width: 1 + Math.random() * 4,
        op: 0.1 + Math.random() * 0.3,
        arcLen: 0.3 + Math.random() * 1.2, // radians of arc to draw
        golden: Math.random() < 0.7,
      };
    });

    // Project 3D spiral position to 2D (with disk tilt)
    function project(angle: number, radius: number) {
      return {
        x: bh.x + Math.cos(angle) * radius,
        y: bh.y + Math.sin(angle) * radius * Math.sin(TILT),
      };
    }

    // Color based on distance
    function col(radius: number, golden: boolean): [number, number, number] {
      const t = 1 - Math.min(1, (radius - bh.r) / (bh.r * 6)); // 0=far, 1=near
      if (golden) {
        return [
          Math.round(lerp(180, 255, t)),
          Math.round(lerp(160, 200, t * 0.7)),
          Math.round(lerp(220, 30, t)),
        ];
      }
      return [
        Math.round(lerp(140, 200, t)),
        Math.round(lerp(170, 210, t)),
        Math.round(lerp(255, 255, t)),
      ];
    }

    let time = 0;

    function render() {
      try { renderInner(); } catch (e) { console.error('[BH]', e); }
      frameRef.current = requestAnimationFrame(render);
    }

    function renderInner() {
      if (!ctx) return;
      time++;
      ctx.clearRect(0, 0, W, H);

      // ── 1. Stars ──
      for (const s of stars) {
        const tw = Math.sin(time * s.sp + s.ph) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.sz, 0, TAU);
        ctx.fillStyle = rgba(185, 195, 230, s.op * tw);
        ctx.fill();
      }

      // ── 2. Nebula atmosphere ──
      const ng = ctx.createRadialGradient(bh.x, bh.y, bh.r, bh.x, bh.y, bh.r * 12);
      ng.addColorStop(0, 'rgba(255,130,15,0.16)');
      ng.addColorStop(0.08, 'rgba(255,100,10,0.1)');
      ng.addColorStop(0.2, 'rgba(220,70,80,0.05)');
      ng.addColorStop(0.4, 'rgba(120,40,140,0.025)');
      ng.addColorStop(0.7, 'rgba(60,20,100,0.01)');
      ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.r * 12, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // ── 3. Streamer arcs (thick glowing spiraling arcs) ──
      ctx.shadowColor = 'rgba(255,180,40,0.4)';
      ctx.shadowBlur = 8;
      ctx.lineCap = 'round';

      for (const s of streamers) {
        // Update orbit
        s.angle += s.angSpeed * (bh.r * 2 / Math.max(s.r, bh.r));
        s.r *= s.decay;
        if (s.r < bh.r * 0.6) { s.r = s.maxR; s.angle = Math.random() * TAU; }

        const [cr, cg, cb] = col(s.r, s.golden);

        // Draw arc by sampling spiral positions
        ctx.beginPath();
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const a = s.angle - s.arcLen * frac;
          const r = s.r * Math.pow(1 / s.decay, frac * 15); // extrapolate backward
          const p = project(a, Math.min(r, s.maxR));
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }

        // Gradient along the arc: bright head → fading tail
        const head = project(s.angle, s.r);
        const tail = project(s.angle - s.arcLen, Math.min(s.r / Math.pow(s.decay, 15), s.maxR));
        const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
        grad.addColorStop(0, rgba(cr, cg, cb, s.op));
        grad.addColorStop(0.4, rgba(cr, cg, cb, s.op * 0.5));
        grad.addColorStop(1, rgba(cr, cg, cb, 0));

        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width * (1 + (1 - s.r / s.maxR) * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ── 4. Spiral particles with tails ──
      ctx.shadowColor = 'rgba(255,200,60,0.7)';
      for (const sp of spirals) {
        // Update orbital physics
        sp.angle += sp.angSpeed * (bh.r * 2 / Math.max(sp.r, bh.r)); // Kepler-ish: faster near center
        sp.r *= sp.decay;

        // Respawn if absorbed
        if (sp.r < bh.r * 0.5) {
          sp.r = sp.maxR;
          sp.angle = Math.random() * TAU;
          sp.hx.length = 0;
          sp.hy.length = 0;
        }

        const p = project(sp.angle, sp.r);

        // Store position history for tail
        sp.hx.unshift(p.x);
        sp.hy.unshift(p.y);
        if (sp.hx.length > sp.tail) { sp.hx.pop(); sp.hy.pop(); }

        const [cr, cg, cb] = col(sp.r, sp.golden);
        const nearness = 1 - Math.min(1, (sp.r - bh.r) / (bh.r * 6));
        const sz = sp.sz * (0.6 + nearness * 1.5);

        // Don't draw if inside event horizon visual
        if (sp.r < bh.r * 0.7) continue;

        // Tail (fading trail)
        if (sp.hx.length > 1 && sp.sz > 0.8) {
          ctx.beginPath();
          ctx.moveTo(sp.hx[0], sp.hy[0]);
          for (let i = 1; i < sp.hx.length; i++) {
            ctx.lineTo(sp.hx[i], sp.hy[i]);
          }
          ctx.strokeStyle = rgba(cr, cg, cb, sp.op * 0.15);
          ctx.lineWidth = sz * 0.6;
          ctx.stroke();
        }

        // Spark head
        ctx.shadowBlur = nearness > 0.3 ? 4 + nearness * 8 : 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, TAU);
        ctx.fillStyle = rgba(cr, cg, cb, sp.op * (0.4 + nearness * 0.6));
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── 5. Accretion disk rings ──
      const diskLayers = 20;
      for (let i = 0; i < diskLayers; i++) {
        const f = i / diskLayers;
        const rx = bh.r * 1.0 + f * bh.r * 5;
        const ry = rx * Math.sin(TILT);
        const brightness = 1 - f * 0.4;
        const wave = Math.sin(time * 0.01 + f * 8) * 0.08 + 0.92;
        // Front half brighter
        for (const half of ['back', 'front'] as const) {
          const front = half === 'front';
          const alpha = brightness * wave * (front ? 0.18 : 0.04);
          ctx.beginPath();
          ctx.ellipse(bh.x, bh.y, rx, ry, 0,
            front ? 0 : Math.PI,
            front ? Math.PI : TAU);
          ctx.strokeStyle = rgba(255, Math.round(lerp(245, 80, f)), Math.round(lerp(190, 10, f)), alpha);
          ctx.lineWidth = lerp(3.5, 0.2, f);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      // ── 6. Event horizon — SPHERE effect ──
      // Outer gradient fade
      const outerG = ctx.createRadialGradient(bh.x, bh.y, bh.r * 0.15, bh.x, bh.y, bh.r * 2.5);
      outerG.addColorStop(0, 'rgba(0,0,0,1)');
      outerG.addColorStop(0.3, 'rgba(0,0,0,0.97)');
      outerG.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      outerG.addColorStop(0.7, 'rgba(0,0,0,0.3)');
      outerG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = outerG;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.r * 2.5, 0, TAU);
      ctx.fill();

      // Inner sphere — 3D look with highlight
      const sphereG = ctx.createRadialGradient(
        bh.x - bh.r * 0.25, bh.y - bh.r * 0.3, bh.r * 0.05, // highlight offset
        bh.x, bh.y, bh.r * 0.9,
      );
      sphereG.addColorStop(0, 'rgba(30,25,50,0.6)');  // subtle purple highlight
      sphereG.addColorStop(0.3, 'rgba(10,8,20,0.85)');
      sphereG.addColorStop(0.7, 'rgba(2,2,5,0.95)');
      sphereG.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = sphereG;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.r * 0.9, 0, TAU);
      ctx.fill();

      // Rim light (edge glow from accretion disk light)
      ctx.globalCompositeOperation = 'lighter';
      const rimG = ctx.createRadialGradient(bh.x, bh.y, bh.r * 0.7, bh.x, bh.y, bh.r * 1.1);
      rimG.addColorStop(0, 'transparent');
      rimG.addColorStop(0.75, 'transparent');
      rimG.addColorStop(0.9, 'rgba(255,180,60,0.08)');
      rimG.addColorStop(1, 'rgba(255,200,80,0.15)');
      ctx.fillStyle = rimG;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.r * 1.1, 0, TAU);
      ctx.fill();

      // ── 7. Photon ring with bloom ──
      const pulse = 0.85 + Math.sin(time * 0.02) * 0.15;
      const pRy = bh.r * Math.sin(TILT);

      ctx.shadowColor = 'rgba(255,200,50,0.9)';
      const rings = [
        { r: 1.5, w: 7, a: 0.05, bl: 14 },
        { r: 1.25, w: 3.5, a: 0.15, bl: 8 },
        { r: 1.08, w: 2, a: 0.35, bl: 5 },
        { r: 0.95, w: 1, a: 0.5, bl: 3 },
      ];
      for (const ring of rings) {
        ctx.shadowBlur = ring.bl;
        ctx.beginPath();
        ctx.ellipse(bh.x, bh.y, bh.r * ring.r, pRy * ring.r, 0, 0, TAU);
        ctx.strokeStyle = rgba(255, 225, 110, ring.a * pulse);
        ctx.lineWidth = ring.w;
        ctx.stroke();
      }

      // Rotating hot spots
      ctx.shadowBlur = 14;
      for (let i = 0; i < 3; i++) {
        const ha = time * 0.006 + i * TAU / 3;
        const hx = bh.x + Math.cos(ha) * bh.r * 1.12;
        const hy = bh.y + Math.sin(ha) * pRy * 1.12;
        ctx.beginPath();
        ctx.arc(hx, hy, bh.r * 0.08, 0, TAU);
        ctx.fillStyle = rgba(255, 235, 120, 0.5 * pulse);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    frameRef.current = requestAnimationFrame(render);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      bh.x = W * 0.52;
      bh.y = H * 0.55;
      bh.r = Math.min(W, H) * 0.04;
      stars = stars.map(s => ({ ...s, x: Math.random() * W, y: Math.random() * H }));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
