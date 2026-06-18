export type ReportCategory =
  | 'Sales'
  | 'Orders'
  | 'Customers'
  | 'Behavior'
  | 'Inventory'
  | 'Finances';

export type MetricFormat = 'currency' | 'number' | 'percent' | 'text';

export interface ReportColumn {
  key: string;
  label: string;
  format: MetricFormat;
}

export interface ReportSummaryMetric {
  key: string;
  label: string;
  value: number;
  previousValue: number | null;
  format: MetricFormat;
}

export type ReportRow = Record<string, string | number | null>;

export interface ReportPayload {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  granularity: string;
  summary: ReportSummaryMetric[];
  /** Time series for the chart. Omitted for dimension reports (UI renders bars from table). */
  series?: ReportRow[];
  /** Equal-length previous-period series, index-aligned with `series`. */
  previousSeries?: ReportRow[];
  table: {
    columns: ReportColumn[];
    rows: ReportRow[];
    totals: Record<string, number>;
    previousTotals: Record<string, number> | null;
  };
  /** Shown when a report depends on tracking that started recently. */
  note?: string;
}

export interface ReportMeta {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
}
