import { useEffect, useRef } from "react";

export default function GoldBackground() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W * devicePixelRatio;
    cv.height = H * devicePixelRatio;
    const ctx = cv.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Toned down from 16 rays / 80 particles — too much motion was competing
    // with foreground cards. Half the density, half the alpha = atmospheric
    // without being noisy.
    const rays = Array.from({ length: 6 }, () => ({
      x: W * (0.15 + Math.random() * 0.7),
      y: H * (0.0 + Math.random() * 0.4),
      angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.1,
      len: 250 + Math.random() * 300,
      w: 1.2 + Math.random() * 3.5,
      alpha: 0.04 + Math.random() * 0.06,
      speed: 0.0015 + Math.random() * 0.003,
      t: Math.random() * Math.PI * 2,
    }));

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 2,
      alpha: 0.08 + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.06 - Math.random() * 0.2,
      t: Math.random() * Math.PI * 2,
    }));

    let raf;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Halved glow alpha so the dark base reads through and foreground
      // content stays the focal point.
      const g1 = ctx.createRadialGradient(W * 0.85, H * 0.02, 0, W * 0.85, H * 0.02, W * 0.85);
      g1.addColorStop(0, "rgba(120,80,18,0.45)");
      g1.addColorStop(0.2, "rgba(80,50,10,0.28)");
      g1.addColorStop(0.55, "rgba(35,22,5,0.12)");
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g3 = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.6);
      g3.addColorStop(0, "rgba(90,60,12,0.22)");
      g3.addColorStop(0.5, "rgba(40,25,5,0.09)");
      g3.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.05, H * 0.95, 0, W * 0.05, H * 0.95, W * 0.55);
      g2.addColorStop(0, "rgba(100,30,8,0.18)");
      g2.addColorStop(0.5, "rgba(50,15,4,0.07)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // 光线
      rays.forEach((r) => {
        r.t += r.speed;
        const flicker = 0.6 + Math.sin(r.t) * 0.4;
        const x2 = r.x + Math.cos(r.angle) * r.len;
        const y2 = r.y + Math.sin(r.angle) * r.len;
        const grad = ctx.createLinearGradient(r.x, r.y, x2, y2);
        grad.addColorStop(0, "rgba(242,213,138,0)");
        grad.addColorStop(0.15, `rgba(252,230,160,${r.alpha * flicker * 1.4})`);
        grad.addColorStop(0.5, `rgba(222,185,100,${r.alpha * flicker})`);
        grad.addColorStop(0.85, `rgba(188,130,50,${r.alpha * 0.4 * flicker})`);
        grad.addColorStop(1, "rgba(150,90,20,0)");
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = r.w;
        ctx.stroke();
      });

      // 粒子
      particles.forEach((p) => {
        p.t += 0.02;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        const pulse = 0.4 + Math.sin(p.t) * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(252,225,140,${p.alpha * pulse})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={cvRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
