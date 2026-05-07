"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaCanadianMapleLeaf } from "react-icons/fa";
import CanadaMap from "@react-map/canada";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

const pathways = ["Students", "Skilled Talent", "HR Teams", "Families"];
const stats = [
  { label: "Countries served", value: "65+" },
  { label: "College alliances", value: "120" },
  { label: "Portal decisions", value: "9K+" },
];

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const leaves = useMemo(() => (mounted ? generateLeaves() : []), [mounted]);
  const heroRef = useRef<HTMLElement | null>(null);
  const [pointer, setPointer] = useState<PointerState>({
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = heroRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPointer({
      active: true,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      width: bounds.width,
      height: bounds.height,
    });
  };

  const handlePointerLeave = () => {
    setPointer((prev) => ({ ...prev, active: false }));
  };

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-white"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]">
        <MapleGlowBackground leaves={leaves} pointer={pointer} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#ffd5dd,transparent_65%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-[#ffe1e9] blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-16 h-80 w-80 rounded-full bg-[#ffeff3] blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center">
        <div className="relative flex h-full w-[min(85vw,840px)] items-center justify-center opacity-35 mix-blend-multiply">
          <CanadaMap
            type="select-single"
            size={620}
            mapColor="transparent"
            strokeColor="rgba(255,0,0,0.6)"
            strokeWidth={1}
            disableClick
            disableHover
          />
        </div>
      </div>
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 pb-32 pt-40 text-center md:px-10 lg:px-12 xl:px-16">
        <div className="flex w-full flex-col items-center gap-6 md:gap-8">
          <motion.div
            className="flex flex-col items-center gap-4 md:gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c1121f]">
              Arrive in Canada
            </p>
            <h1 className="text-balance text-4xl font-semibold text-slate-900 md:text-5xl lg:text-6xl">
              Your Journey to Canada Starts Here
            </h1>
            <p className="max-w-3xl text-lg text-slate-600">
              Trusted immigration pathways for students, workers, and families worldwide.
              CompleteCanadaVisa unifies eligibility, compliance, and personalized
              concierge support in one enterprise-grade portal.
            </p>
          </motion.div>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="primary" href="#eligibility">
              Check Eligibility
            </Button>
            <Button href={siteConfig.portalUrl} variant="secondary" newTab>
              Access Portal
            </Button>
          </motion.div>
          <motion.div
            className="flex flex-wrap justify-center gap-4 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 md:gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {pathways.map((path) => (
              <span
                key={path}
                className="rounded-full border border-[#c1121f]/30 bg-white/80 px-4 py-2 text-[#c1121f]"
              >
                {path}
              </span>
            ))}
          </motion.div>
          <motion.div
            className="w-full p-6 md:p-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="grid gap-6 text-sm text-slate-500 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-3">
                  <p className="text-4xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-base">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

type MapleGlowBackgroundProps = {
  leaves: MapleLeaf[];
  pointer: PointerState;
};

function MapleGlowBackground({ leaves, pointer }: MapleGlowBackgroundProps) {
  const calcRepel = (leafLeftPercent: number, leafTopPercent: number) => {
    if (!pointer.active || !pointer.width || !pointer.height) {
      return { x: 0, y: 0 };
    }
    const leafLeft = (leafLeftPercent / 100) * pointer.width;
    const leafTop = (leafTopPercent / 100) * pointer.height;
    const dx = leafLeft - pointer.x;
    const dy = leafTop - pointer.y;
    const distance = Math.hypot(dx, dy);
    const radius = 130;
    if (distance === 0 || distance > radius) {
      return { x: 0, y: 0 };
    }
    const force = (radius - distance) / radius;
    const strength = 75;
    return {
      x: ((dx / distance) || 0) * force * strength,
      y: ((dy / distance) || 0) * force * strength,
    };
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-48 after:bg-gradient-to-b after:from-transparent after:via-[#ffd5dd]/50 after:to-transparent">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffeff3,transparent_70%)] opacity-70 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#ffe1e9,transparent_65%)] opacity-60 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.25),transparent,rgba(255,255,255,0.15))] mix-blend-screen" />
      <motion.div
        className="absolute -left-20 top-10 h-40 w-72 bg-linear-to-r from-white/60 to-transparent blur-2xl"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: [0, 0.8, 0], x: [0, 120] }}
        transition={{ duration: 6, repeat: Infinity, repeatDelay: 3 }}
      />
      <motion.div
        className="absolute -right-24 bottom-12 h-32 w-64 bg-linear-to-r from-transparent to-white/50 blur-2xl"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: [0, 0.7, 0], x: [0, -120] }}
        transition={{ duration: 6, repeat: Infinity, repeatDelay: 3, delay: 1.5 }}
      />
      {leaves.map((leaf, index) => {
        const repel = calcRepel(leaf.left, leaf.top);
        const scaleValue = leaf.size >= 30 ? 1.08 : 0.95;
        return (
          <motion.span
            key={`leaf-${index}`}
            className="absolute text-[#c1121f]"
            style={{ top: `${leaf.top}%`, left: `${leaf.left}%` }}
            initial={{
              opacity: 0,
              scale: scaleValue,
              rotate: leaf.rotate,
              x: leaf.driftX,
              y: -leaf.fallDistance * 0.9,
            }}
            animate={{
              opacity: [0, 0.7 + leaf.opacityVariation, 0],
              scale: [scaleValue, scaleValue * leaf.scaleVariation, scaleValue],
              rotate: [
                leaf.rotate,
                leaf.rotate + leaf.sway * leaf.rotateVariation1,
                leaf.rotate + leaf.sway * leaf.rotateVariation2,
              ],
              x: [leaf.driftX, leaf.xMid, leaf.xEnd],
              y: [-leaf.fallDistance * 0.9, leaf.fallDistance * 1.15],
            }}
            transition={{
              duration: leaf.duration,
              repeat: Infinity,
              repeatDelay: leaf.repeatDelay,
              delay: leaf.delay,
              ease: [0.4, 0, 0.6, 1], // Custom easing for more natural movement
            }}
          >
            <motion.span
              animate={{ x: repel.x, y: repel.y }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
            >
              <FaCanadianMapleLeaf
                size={leaf.size}
                className="drop-shadow-[0_0_15px_rgba(193,18,31,0.6)] opacity-80"
              />
            </motion.span>
          </motion.span>
        );
      })}
    </div>
  );
}

const LEAF_COUNT = 20;

type MapleLeaf = {
  top: number;
  left: number;
  size: number;
  delay: number;
  rotate: number;
  duration: number;
  sway: number;
  driftX: number;
  fallDistance: number;
  repeatDelay: number;
  // Additional random values for animation variation
  opacityVariation: number;
  scaleVariation: number;
  rotateVariation1: number;
  rotateVariation2: number;
  xMid: number;
  xEnd: number;
};

type PointerState = {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

const generateLeaves = (): MapleLeaf[] => {
  return Array.from({ length: LEAF_COUNT }).map(() => {
    // Completely random positioning across the entire width
    const left = Math.random() * 100;
    const top = Math.random() * 50; // Start from top half
    const driftX = +(Math.random() * 8 - 4).toFixed(1);
    const sway = +(Math.random() * 12 - 6).toFixed(1);
    
    return {
      top: Math.max(0, Math.min(50, top)),
      left: Math.max(0, Math.min(100, left)),
      size: Math.round(16 + Math.random() * 24), // 16-40px
      delay: +(Math.random() * 4).toFixed(2), // 0-4 seconds
      rotate: +(Math.random() * 360).toFixed(1), // Full 360 degree rotation
      duration: +(5 + Math.random() * 4).toFixed(2), // 5-9 seconds
      sway: sway,
      driftX: driftX,
      fallDistance: +(120 + Math.random() * 200).toFixed(1), // More varied fall distance
      repeatDelay: +(0.3 + Math.random() * 1.5).toFixed(2), // More varied repeat delay
      // Random animation variations
      opacityVariation: +(0.1 + Math.random() * 0.2).toFixed(2), // 0.1-0.3
      scaleVariation: +(0.92 + Math.random() * 0.12).toFixed(2), // 0.92-1.04
      rotateVariation1: +(0.2 + Math.random() * 0.4).toFixed(2), // 0.2-0.6
      rotateVariation2: +(0.1 + Math.random() * 0.3).toFixed(2), // 0.1-0.4
      xMid: +(driftX + sway * (0.4 + Math.random() * 0.4)).toFixed(1),
      xEnd: +(driftX - sway * (0.2 + Math.random() * 0.3)).toFixed(1),
    };
  });
};
