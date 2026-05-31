import { Subject, UserPlan } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Prisma enums for use across the app
// ─────────────────────────────────────────────────────────────────────────────
export { Subject, UserPlan };

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response wrapper
// ─────────────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stat cards
// ─────────────────────────────────────────────────────────────────────────────
export interface StatCard {
  title: string;
  value: string | number;
  description: string;
  trend?: number; // percentage change
  icon: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject display metadata
// ─────────────────────────────────────────────────────────────────────────────
export const SUBJECT_META: Record<
  Subject,
  { label: string; shortLabel: string; color: string }
> = {
  ENGINEERING_MATHS: {
    label: "Engineering Mathematics",
    shortLabel: "Engg Math",
    color: "hsl(220 70% 60%)",
  },
  DISCRETE_MATHS: {
    label: "Discrete Mathematics",
    shortLabel: "Discrete Math",
    color: "hsl(280 70% 60%)",
  },
  ALGORITHMS: {
    label: "Algorithms",
    shortLabel: "Algo",
    color: "hsl(160 70% 45%)",
  },
  DATA_STRUCTURES: {
    label: "Data Structures",
    shortLabel: "DS",
    color: "hsl(30 80% 55%)",
  },
  THEORY_OF_COMPUTATION: {
    label: "Theory of Computation",
    shortLabel: "TOC",
    color: "hsl(340 70% 55%)",
  },
  COMPILER_DESIGN: {
    label: "Compiler Design",
    shortLabel: "CD",
    color: "hsl(200 70% 50%)",
  },
  OPERATING_SYSTEMS: {
    label: "Operating Systems",
    shortLabel: "OS",
    color: "hsl(140 60% 45%)",
  },
  COMPUTER_NETWORKS: {
    label: "Computer Networks",
    shortLabel: "CN",
    color: "hsl(50 80% 50%)",
  },
  DATABASES: {
    label: "Database Management",
    shortLabel: "DBMS",
    color: "hsl(260 65% 55%)",
  },
  COMPUTER_ORGANIZATION: {
    label: "Computer Organization",
    shortLabel: "CO",
    color: "hsl(180 60% 45%)",
  },
  DIGITAL_LOGIC: {
    label: "Digital Logic",
    shortLabel: "DL",
    color: "hsl(320 65% 55%)",
  },
  PROGRAMMING_C: {
    label: "Programming in C",
    shortLabel: "C Prog",
    color: "hsl(100 55% 45%)",
  },
  GENERAL_APTITUDE: {
    label: "General Aptitude",
    shortLabel: "GA",
    color: "hsl(15 75% 55%)",
  },
};
