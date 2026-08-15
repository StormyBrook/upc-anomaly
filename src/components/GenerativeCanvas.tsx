"use client";

import React, { useEffect, useRef } from "react";
import p5 from "p5";
import { AnomalyConfig, ColorHSLA, ShapeArchetype } from "@/lib/upcEngine";

interface GenerativeCanvasProps {
  config: AnomalyConfig;
  onCanvasTouch?: (normalizedX: number, normalizedY: number) => void;
  onCanvasPan?: (normalizedX: number, normalizedY: number) => void;
  onParticleCollision?: (pitchRatio: number, size: number) => void;
  canvasRefOut?: React.MutableRefObject<HTMLCanvasElement | null>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  color: ColorHSLA;
  isWireframe: boolean;
  pulsePhase: number;
  hasCollided: boolean;
  shapeType: ShapeArchetype;
  radialAngle: number;
  distFromCenter: number;
}

export const GenerativeCanvas: React.FC<GenerativeCanvasProps> = ({
  config,
  onCanvasTouch,
  onCanvasPan,
  onParticleCollision,
  canvasRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
    }

    const sketch = (p: p5) => {
      let particles: Particle[] = [];
      const angleRad = (config.particles.flowAngleDegrees * Math.PI) / 180;
      const baseDx = Math.cos(angleRad) * config.particles.speed;
      const baseDy = Math.sin(angleRad) * config.particles.speed;

      const pickColor = (): ColorHSLA => {
        const rand = p.random(1);
        if (rand < 0.5) return config.colors.primary;
        if (rand < 0.85) return config.colors.secondary;
        return config.colors.accent;
      };

      // Determine single uniform shape for this entire anomaly stream
      const getUniformShape = (): ShapeArchetype => {
        if (config.shapeArchetype === "mixed") {
          return "triangles"; // Default clean stream shape if mixed requested
        }
        return config.shapeArchetype;
      };

      const anomalyShape = getUniformShape();

      const createParticle = (x?: number, y?: number): Particle => {
        const px = x !== undefined ? x : p.random(-50, p.width + 50);
        const py = y !== undefined ? y : p.random(-50, p.height + 50);

        const sizeRand = Math.pow(p.random(0, 1), 2.8);
        const sz = config.particles.minSize + sizeRand * (config.particles.maxSize - config.particles.minSize);
        const rAngle = p.random(p.TWO_PI);

        return {
          x: px,
          y: py,
          vx: baseDx,
          vy: baseDy,
          size: sz,
          rotation: p.random(p.TWO_PI),
          rotSpeed: p.random(-config.particles.spinSpeed, config.particles.spinSpeed),
          color: pickColor(),
          isWireframe: p.random(1) < config.particles.wireframeRatio,
          pulsePhase: p.random(p.TWO_PI),
          hasCollided: false,
          shapeType: anomalyShape,
          radialAngle: rAngle,
          distFromCenter: p.random(5, Math.max(p.width, p.height) * 0.65),
        };
      };

      const drawShape = (pt: Particle, currentSize: number) => {
        const c = pt.color;
        if (pt.isWireframe) {
          p.noFill();
          p.stroke(c.h, c.s, c.l, c.a);
          p.strokeWeight(1.5);
        } else {
          p.fill(c.h, c.s, c.l, c.a);
          p.noStroke();
        }

        switch (pt.shapeType) {
          case "triangles": {
            const h = currentSize * 0.866;
            p.triangle(0, -h * 0.66, -currentSize * 0.5, h * 0.33, currentSize * 0.5, h * 0.33);
            break;
          }
          case "diamonds": {
            const half = currentSize * 0.5;
            p.quad(0, -half * 1.3, half, 0, 0, half * 1.3, -half, 0);
            break;
          }
          case "hexagons": {
            p.beginShape();
            for (let a = 0; a < p.TWO_PI; a += p.TWO_PI / 6) {
              const hx = Math.cos(a) * currentSize * 0.5;
              const hy = Math.sin(a) * currentSize * 0.5;
              p.vertex(hx, hy);
            }
            p.endShape(p.CLOSE);
            break;
          }
          case "rings": {
            p.ellipse(0, 0, currentSize, currentSize);
            if (!pt.isWireframe) {
              p.fill(config.colors.bgHSLA.h, config.colors.bgHSLA.s, config.colors.bgHSLA.l);
              p.ellipse(0, 0, currentSize * 0.45, currentSize * 0.45);
            }
            break;
          }
          case "crosses": {
            const w = currentSize * 0.2;
            const len = currentSize * 0.6;
            p.rect(-w, -len, w * 2, len * 2);
            p.rect(-len, -w, len * 2, w * 2);
            break;
          }
          case "shards": {
            p.quad(
              0, -currentSize * 0.8,
              currentSize * 0.35, currentSize * 0.1,
              0, currentSize * 0.6,
              -currentSize * 0.2, 0
            );
            break;
          }
          default: {
            const h = currentSize * 0.866;
            p.triangle(0, -h * 0.66, -currentSize * 0.5, h * 0.33, currentSize * 0.5, h * 0.33);
          }
        }
      };

      p.setup = () => {
        const width = containerRef.current?.clientWidth || window.innerWidth;
        const height = containerRef.current?.clientHeight || window.innerHeight;
        const canvas = p.createCanvas(width, height);
        canvas.parent(containerRef.current!);

        if (canvasRefOut) {
          canvasRefOut.current = canvas.elt as HTMLCanvasElement;
        }

        p.colorMode(p.HSL);

        particles = [];
        for (let i = 0; i < config.particles.count; i++) {
          particles.push(createParticle());
        }

        p.background(
          config.colors.bgHSLA.h,
          config.colors.bgHSLA.s,
          config.colors.bgHSLA.l
        );
      };

      p.draw = () => {
        const bg = config.colors.bgHSLA;
        p.fill(bg.h, bg.s, bg.l, config.particles.trailFade / 255);
        p.noStroke();
        p.rect(0, 0, p.width, p.height);

        if (config.colors.blendMode === "screen") {
          p.blendMode(p.SCREEN);
        } else if (config.colors.blendMode === "additive") {
          p.blendMode(p.ADD);
        } else {
          p.blendMode(p.BLEND);
        }

        const isPointerActive = p.mouseIsPressed || p.touches.length > 0;
        const ptrX = p.mouseX;
        const ptrY = p.mouseY;
        const centerX = p.width * 0.5;
        const centerY = p.height * 0.5;
        const maxRadius = Math.max(p.width, p.height) * 0.65;

        if (isPointerActive && onCanvasPan) {
          onCanvasPan(ptrX / p.width, ptrY / p.height);
        }

        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];

          // Uniform motion logic for all particles
          if (
            config.flowPattern === "spiralVortex" ||
            config.flowPattern === "radialBurst" ||
            config.flowPattern === "convergingCore"
          ) {
            if (config.flowPattern === "spiralVortex") {
              pt.radialAngle += 0.012 * (config.particles.speed / 3);
              pt.distFromCenter += config.particles.speed * 0.6;
              if (pt.distFromCenter > maxRadius) {
                pt.distFromCenter = p.random(2, 15);
                pt.radialAngle = p.random(p.TWO_PI);
              }
            } else if (config.flowPattern === "radialBurst") {
              pt.distFromCenter += config.particles.speed * 1.2;
              if (pt.distFromCenter > maxRadius) {
                pt.distFromCenter = p.random(2, 15);
                pt.radialAngle = p.random(p.TWO_PI);
              }
            } else if (config.flowPattern === "convergingCore") {
              pt.distFromCenter -= config.particles.speed * 0.9;
              if (pt.distFromCenter < 5) {
                pt.distFromCenter = maxRadius;
                pt.radialAngle = p.random(p.TWO_PI);
              }
            }

            pt.x = centerX + Math.cos(pt.radialAngle) * pt.distFromCenter;
            pt.y = centerY + Math.sin(pt.radialAngle) * pt.distFromCenter;
          } else {
            // Linear, Cardinal, Wave Flow
            let targetVx = baseDx;
            let targetVy = baseDy;

            if (config.flowPattern === "waveFlow") {
              const freq = config.particles.waveFrequency || 0.04;
              const amp = config.particles.waveAmplitude || 5.0;
              const waveVal = Math.sin(p.frameCount * freq + pt.x * 0.01) * amp;
              targetVy = baseDy + waveVal;
            }

            const noiseScale = config.particles.turbulence;
            const noiseVal = p.noise(pt.x * noiseScale, pt.y * noiseScale, p.frameCount * 0.005);
            const noiseAngle = noiseVal * p.TWO_PI * 2;

            let forceX = Math.cos(noiseAngle) * 0.3 + config.particles.gravity.x;
            let forceY = Math.sin(noiseAngle) * 0.3 + config.particles.gravity.y;

            if (isPointerActive) {
              const dx = ptrX - pt.x;
              const dy = ptrY - pt.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const radius = config.touch.radius;

              if (dist < radius && dist > 0.001) {
                const normFactor = (1 - dist / radius) * config.touch.force;

                if (!pt.hasCollided && dist < radius * 0.35 && p.random(1) < 0.25) {
                  pt.hasCollided = true;
                  if (onParticleCollision) {
                    const pitchRatio = (pt.x + pt.y) / (p.width + p.height);
                    onParticleCollision(pitchRatio, pt.size);
                  }
                }

                switch (config.touch.mode) {
                  case "repel":
                    forceX -= (dx / dist) * normFactor * 3;
                    forceY -= (dy / dist) * normFactor * 3;
                    break;
                  case "attract":
                    forceX += (dx / dist) * normFactor * 2;
                    forceY += (dy / dist) * normFactor * 2;
                    break;
                  case "vortex":
                    forceX += (-dy / dist) * normFactor * 3.5;
                    forceY += (dx / dist) * normFactor * 3.5;
                    break;
                  case "ripple":
                    forceX += Math.sin(dist * 0.1) * normFactor * 2.5;
                    forceY += Math.cos(dist * 0.1) * normFactor * 2.5;
                    break;
                  case "orbit":
                    forceX += ((-dy / dist) * 2 + (dx / dist) * 0.5) * normFactor;
                    forceY += ((dx / dist) * 2 + (dy / dist) * 0.5) * normFactor;
                    break;
                }
              } else {
                pt.hasCollided = false;
              }
            } else {
              pt.hasCollided = false;
            }

            pt.vx = p.lerp(pt.vx, targetVx + forceX, 0.05);
            pt.vy = p.lerp(pt.vy, targetVy + forceY, 0.05);

            pt.x += pt.vx;
            pt.y += pt.vy;

            // Screen boundary wrap
            if (
              pt.x < -100 ||
              pt.x > p.width + 100 ||
              pt.y < -100 ||
              pt.y > p.height + 100
            ) {
              pt.hasCollided = false;
              if (baseDx >= 0 && baseDy >= 0) {
                if (p.random(1) > 0.5) {
                  pt.x = p.random(-40, p.width * 0.5);
                  pt.y = -30;
                } else {
                  pt.x = -30;
                  pt.y = p.random(-40, p.height * 0.5);
                }
              } else {
                pt.x = p.random(-20, p.width + 20);
                pt.y = p.random(-20, p.height + 20);
              }
            }
          }

          pt.rotation += pt.rotSpeed;
          pt.pulsePhase += 0.03;

          p.push();
          p.translate(pt.x, pt.y);
          p.rotate(pt.rotation);

          const currentSize = pt.size * (1 + Math.sin(pt.pulsePhase) * 0.12);
          drawShape(pt, currentSize);

          p.pop();
        }

        p.blendMode(p.BLEND);
      };

      p.mousePressed = () => {
        if (
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          if (onCanvasTouch) {
            onCanvasTouch(p.mouseX / p.width, p.mouseY / p.height);
          }
        }
      };

      p.windowResized = () => {
        if (containerRef.current) {
          p.resizeCanvas(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
          );
        }
      };
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }
    };
  }, [config, onCanvasTouch, onCanvasPan, onParticleCollision, canvasRefOut]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none select-none overflow-hidden" />;
};
