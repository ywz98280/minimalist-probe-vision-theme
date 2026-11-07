export interface LoadChartPalette {
  primary: string
  primaryAreaStrong: string
  primaryAreaFaint: string
  secondary: string
  tertiary: string
  tertiaryAreaStrong: string
  tertiaryAreaFaint: string
  quaternary: string
  quinary: string
  senary: string
}

// 幻视配色：金（心灵宝石）、绯红（幻视告警）、合成青（量子链路）、墨色（文字）
const DEFAULT_LOAD_CHART_PALETTE: LoadChartPalette = {
  primary: '#E8B923',
  primaryAreaStrong: 'rgba(232, 185, 35, 0.28)',
  primaryAreaFaint: 'rgba(232, 185, 35, 0.02)',
  secondary: '#C0392B',
  tertiary: '#0E9A8B',
  tertiaryAreaStrong: 'rgba(14, 154, 139, 0.26)',
  tertiaryAreaFaint: 'rgba(14, 154, 139, 0.02)',
  quaternary: '#1A2332',
  quinary: '#F2C94C',
  senary: '#9A6B00',
}

const ACCESSIBLE_LOAD_CHART_PALETTE: LoadChartPalette = {
  primary: '#D55E00',
  primaryAreaStrong: 'rgba(213, 94, 0, 0.25)',
  primaryAreaFaint: 'rgba(213, 94, 0, 0.02)',
  secondary: '#E69F00',
  tertiary: '#009E73',
  tertiaryAreaStrong: 'rgba(0, 158, 115, 0.25)',
  tertiaryAreaFaint: 'rgba(0, 158, 115, 0.02)',
  quaternary: '#CC79A7',
  quinary: '#0072B2',
  senary: '#56B4E9',
}

const DEFAULT_SERIES_PALETTE = [
  '#E8B923',
  '#C0392B',
  '#0E9A8B',
  '#1A2332',
  '#9A6B00',
  '#F2C94C',
  '#E0655A',
  '#5A6B7F',
]

const ACCESSIBLE_SERIES_PALETTE = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#CC79A7',
  '#D55E00',
  '#56B4E9',
  '#F0C94A',
  '#6B7280',
]

export const ACCESSIBLE_LINE_TYPES = ['solid', 'dashed', 'dotted'] as const

export function getLoadChartPalette(accessible: boolean): LoadChartPalette {
  return accessible ? ACCESSIBLE_LOAD_CHART_PALETTE : DEFAULT_LOAD_CHART_PALETTE
}

export function getChartSeriesPalette(accessible: boolean): string[] {
  return [...(accessible ? ACCESSIBLE_SERIES_PALETTE : DEFAULT_SERIES_PALETTE)]
}
