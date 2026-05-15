import { useMemo } from "react";
import type { Row } from "../types";
import {
  computeInsights,
  type Insight,
  type InsightSeverity,
} from "../lib/insights";

export type { Insight, InsightSeverity };

interface Params {
  rows: Row[];
  mes: number;
  ano: number;
}

export function useInsights({ rows, mes, ano }: Params): Insight[] {
  return useMemo(() => computeInsights({ rows, mes, ano }), [rows, mes, ano]);
}
