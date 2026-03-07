import React, { useState, useCallback, useMemo } from 'react';
import { useProfitLoss } from '../hooks/useProfitLoss';
import { plDivisions, calculateMonthSummary, sumAnnualTarget } from '../data/profitLossData';
import { AnnualPLRecord, PLMonthData, PLDivision } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  TrendingUp, TrendingDown, Edit3, Save, RotateCcw, Download,
  ChevronDown, ChevronRight, DollarSign, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────────────────

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const CURRENT_MONTH = 3; // March 2026

function fmt(value: number): string {
  if (value === 0) return '-';
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function fmtPct(value: number): string {
  return `${value >= 0 ? '' : ''}${value.toFixed(1)}%`;
}

function parseNumber(str: string): number {
  return Number(str.replace(/[^0-9.-]/g, '')) || 0;
}

function colorByValue(value: number, isProfit = true): string {
  if (value === 0) return 'text-gray-400';
  if (isProfit) return value > 0 ? 'text-blue-600' : 'text-red-500';
  return value > 0 ? 'text-red-500' : 'text-blue-600';
}

function pctBadgeColor(rate: number): string {
  if (rate >= 10) return 'bg-green-100 text-green-700 border-green-300';
  if (rate >= 0) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-red-100 text-red-700 border-red-300';
}

// ─── Inline editable cell ─────────────────────────────────────────────────────

interface EditCellProps {
  value: number;
  editing: boolean;
  onSave: (v: number) => void;
  className?: string;
  colored?: boolean;
  isProfit?: boolean;
}

function EditCell({ value, editing, onSave, className = '', colored = false, isProfit = true }: EditCellProps) {
  const [draft, setDraft] = useState(String(value));

  const handleBlur = () => {
    onSave(parseNumber(draft));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') setDraft(String(value));
  };

  if (editing) {
    return (
      <input
        className="w-full text-right text-xs bg-blue-50 border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  const colorClass = colored ? colorByValue(value, isProfit) : '';
  return (
    <span className={`text-xs tabular-nums ${colorClass} ${className}`}>
      {fmt(value)}
    </span>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  prevValue?: number;
  isRate?: boolean;
  isProfit?: boolean;
}

function SummaryCard({ label, value, prevValue, isRate = false, isProfit = true }: SummaryCardProps) {
  const diff = prevValue !== undefined ? value - prevValue : undefined;
  const isPositive = isProfit ? value >= 0 : value <= 0;
  const valueColor = isPositive ? 'text-blue-600' : 'text-red-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>
        {isRate ? fmtPct(value) : fmt(value)}
      </p>
      {diff !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {diff >= 0
            ? <TrendingUp className="w-3 h-3 text-green-500" />
            : <TrendingDown className="w-3 h-3 text-red-500" />
          }
          <span className={`text-xs ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {isRate ? fmtPct(Math.abs(diff)) : fmt(Math.abs(diff))} vs 목표
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main P&L table row ────────────────────────────────────────────────────────

interface RowDef {
  id: string;
  label: string;
  indent?: number;
  bold?: boolean;
  colored?: boolean;     // show profit coloring
  isRate?: boolean;      // % row
  isProfit?: boolean;    // profit direction (true = higher is better)
  getValue: (m: PLMonthData) => { target: number; actual: number };
  getAnnualTarget?: (r: AnnualPLRecord) => number;
  getPrevYear?: (r: AnnualPLRecord) => number;
  bg?: string;
  separator?: boolean;
}

function buildRows(): RowDef[] {
  return [
    // ── 매출
    {
      id: 'revenue',
      label: '매출액',
      bold: true,
      getValue: m => m.revenue,
      getAnnualTarget: r => r.annualTarget.revenue,
      getPrevYear: r => r.prevYearCumulative.revenue,
    },
    {
      id: 'deposits',
      label: '입금액',
      indent: 1,
      getValue: m => m.deposits,
      getAnnualTarget: r => r.annualTarget.deposits,
      getPrevYear: r => r.prevYearCumulative.deposits,
    },
    // ── 원가
    {
      id: 'purchases',
      label: '매입',
      indent: 1,
      getValue: m => m.purchases,
      getAnnualTarget: r => r.annualTarget.purchases,
      getPrevYear: r => r.prevYearCumulative.purchases,
    },
    {
      id: 'projectLaborInternal',
      label: '프로젝트인건비 (내부)',
      indent: 1,
      getValue: m => m.projectLaborInternal,
      getAnnualTarget: r => r.annualTarget.projectLaborInternal,
      getPrevYear: r => r.prevYearCumulative.projectLaborInternal,
    },
    {
      id: 'projectLaborExternal',
      label: '프로젝트인건비 (외주)',
      indent: 1,
      getValue: m => m.projectLaborExternal,
      getAnnualTarget: r => r.annualTarget.projectLaborExternal,
      getPrevYear: r => r.prevYearCumulative.projectLaborExternal,
    },
    {
      id: 'divisionLaborCommon',
      label: '사업부인건비 (공통)',
      indent: 1,
      getValue: m => m.divisionLaborCommon,
      getAnnualTarget: r => r.annualTarget.divisionLaborCommon,
      getPrevYear: r => r.prevYearCumulative.divisionLaborCommon,
    },
    {
      id: 'divisionLaborProposal',
      label: '사업부인건비 (제안)',
      indent: 1,
      getValue: m => m.divisionLaborProposal,
      getAnnualTarget: r => r.annualTarget.divisionLaborProposal,
      getPrevYear: r => r.prevYearCumulative.divisionLaborProposal,
    },
    {
      id: 'idleLaborCost',
      label: '유휴인력비',
      indent: 1,
      getValue: m => m.idleLaborCost,
      getAnnualTarget: r => r.annualTarget.idleLaborCost,
      getPrevYear: r => r.prevYearCumulative.idleLaborCost,
    },
    {
      id: 'directCostProject',
      label: '사업부직접비 (프로젝트)',
      indent: 1,
      getValue: m => m.directCostProject,
      getAnnualTarget: r => r.annualTarget.directCostProject,
      getPrevYear: r => r.prevYearCumulative.directCostProject,
    },
    {
      id: 'directCostCommon',
      label: '사업부직접비 (공통)',
      indent: 1,
      getValue: m => m.directCostCommon,
      getAnnualTarget: r => r.annualTarget.directCostCommon,
      getPrevYear: r => r.prevYearCumulative.directCostCommon,
    },
    // ── 매출총이익 (computed)
    {
      id: 'grossProfit',
      label: '매출총이익',
      bold: true,
      colored: true,
      isProfit: true,
      bg: 'bg-gray-50',
      getValue: m => {
        const rev = m.revenue;
        const compute = (field: 'target' | 'actual') => {
          const cost =
            m.purchases[field] + m.projectLaborInternal[field] + m.projectLaborExternal[field] +
            m.divisionLaborCommon[field] + m.divisionLaborProposal[field] + m.idleLaborCost[field] +
            m.directCostProject[field] + m.directCostCommon[field];
          return rev[field] - cost;
        };
        return { target: compute('target'), actual: compute('actual') };
      },
      getAnnualTarget: r => {
        const s = sumAnnualTarget(r.annualTarget);
        return s.grossProfit;
      },
      getPrevYear: r => {
        const s = sumAnnualTarget(r.prevYearCumulative);
        return s.grossProfit;
      },
    },
    {
      id: 'grossProfitRate',
      label: '이익률',
      indent: 1,
      isRate: true,
      colored: true,
      isProfit: true,
      getValue: m => {
        const compute = (field: 'target' | 'actual') => {
          const rev = m.revenue[field];
          if (rev === 0) return 0;
          const cost =
            m.purchases[field] + m.projectLaborInternal[field] + m.projectLaborExternal[field] +
            m.divisionLaborCommon[field] + m.divisionLaborProposal[field] + m.idleLaborCost[field] +
            m.directCostProject[field] + m.directCostCommon[field];
          return ((rev - cost) / rev) * 100;
        };
        return { target: compute('target'), actual: compute('actual') };
      },
      getAnnualTarget: r => sumAnnualTarget(r.annualTarget).grossProfitRate,
      getPrevYear: r => sumAnnualTarget(r.prevYearCumulative).grossProfitRate,
    },
    // ── 간접비
    {
      id: 'indirectCost',
      label: '간접비',
      getValue: m => m.indirectCost,
      getAnnualTarget: r => r.annualTarget.indirectCost,
      getPrevYear: r => r.prevYearCumulative.indirectCost,
    },
    // ── 영업이익 (computed)
    {
      id: 'operatingProfit',
      label: '영업이익',
      bold: true,
      colored: true,
      isProfit: true,
      bg: 'bg-yellow-50',
      getValue: m => {
        const compute = (field: 'target' | 'actual') => {
          const rev = m.revenue[field];
          const cost =
            m.purchases[field] + m.projectLaborInternal[field] + m.projectLaborExternal[field] +
            m.divisionLaborCommon[field] + m.divisionLaborProposal[field] + m.idleLaborCost[field] +
            m.directCostProject[field] + m.directCostCommon[field];
          return rev - cost - m.indirectCost[field];
        };
        return { target: compute('target'), actual: compute('actual') };
      },
      getAnnualTarget: r => sumAnnualTarget(r.annualTarget).operatingProfit,
      getPrevYear: r => sumAnnualTarget(r.prevYearCumulative).operatingProfit,
    },
    {
      id: 'operatingProfitRate',
      label: '영업이익률',
      indent: 1,
      isRate: true,
      colored: true,
      isProfit: true,
      bg: 'bg-yellow-50',
      getValue: m => {
        const compute = (field: 'target' | 'actual') => {
          const rev = m.revenue[field];
          if (rev === 0) return 0;
          const cost =
            m.purchases[field] + m.projectLaborInternal[field] + m.projectLaborExternal[field] +
            m.divisionLaborCommon[field] + m.divisionLaborProposal[field] + m.idleLaborCost[field] +
            m.directCostProject[field] + m.directCostCommon[field];
          return ((rev - cost - m.indirectCost[field]) / rev) * 100;
        };
        return { target: compute('target'), actual: compute('actual') };
      },
      getAnnualTarget: r => sumAnnualTarget(r.annualTarget).operatingProfitRate,
      getPrevYear: r => sumAnnualTarget(r.prevYearCumulative).operatingProfitRate,
    },
  ];
}

// ─── Sub-row pair (목표 / 실적) ────────────────────────────────────────────────

interface SubRowProps {
  rowDef: RowDef;
  record: AnnualPLRecord;
  editMode: boolean;
  onUpdateMonth: (month: number, updates: Partial<PLMonthData>) => void;
  onUpdateTarget: (field: keyof AnnualPLRecord['annualTarget'], value: number) => void;
  showPrevYear: boolean;
  editingCell: string | null;
  onCellClick: (cellId: string) => void;
}

function SubRow({
  rowDef, record, editMode, onUpdateMonth, onUpdateTarget,
  showPrevYear, editingCell, onCellClick,
}: SubRowProps) {
  const cumulativeActual = useMemo(() => {
    return record.monthlyData
      .filter(m => m.month <= CURRENT_MONTH)
      .reduce((sum, m) => sum + rowDef.getValue(m).actual, 0);
  }, [record, rowDef]);

  const cumulativeTarget = useMemo(() => {
    return record.monthlyData.reduce((sum, m) => sum + rowDef.getValue(m).target, 0);
  }, [record, rowDef]);

  const annualTargetVal = rowDef.getAnnualTarget ? rowDef.getAnnualTarget(record) : 0;
  const prevYearVal = rowDef.getPrevYear ? rowDef.getPrevYear(record) : 0;

  const paddingLeft = `${(rowDef.indent ?? 0) * 12 + 8}px`;
  const isRate = rowDef.isRate ?? false;
  const formatVal = (v: number) => isRate ? fmtPct(v) : fmt(v);
  const colorFn = (v: number) => rowDef.colored ? colorByValue(v, rowDef.isProfit ?? true) : '';

  const nonEditable = ['grossProfit', 'grossProfitRate', 'operatingProfit', 'operatingProfitRate'].includes(rowDef.id);

  return (
    <>
      {/* 목표 행 */}
      <tr className={`border-b border-gray-100 hover:bg-blue-50/30 ${rowDef.bg ?? ''}`}>
        <td
          className="sticky left-0 bg-white border-r border-gray-200 py-1 px-2 min-w-[180px] z-10"
          style={{ paddingLeft }}
        >
          <span className={`text-xs ${rowDef.bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
            {rowDef.label}
          </span>
        </td>
        <td className="text-center py-1 px-1 min-w-[40px]">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">목표</Badge>
        </td>

        {/* Annual target */}
        <td className="text-right py-1 px-2 min-w-[100px] border-r border-gray-100">
          {editMode && !nonEditable ? (
            <EditCell
              value={annualTargetVal}
              editing={editingCell === `annual-${rowDef.id}`}
              onSave={v => {
                if (rowDef.id in record.annualTarget) {
                  onUpdateTarget(rowDef.id as keyof AnnualPLRecord['annualTarget'], v);
                }
              }}
              colored={rowDef.colored}
              isProfit={rowDef.isProfit}
            />
          ) : (
            <span className={`text-xs tabular-nums ${colorFn(annualTargetVal)}`}>{formatVal(annualTargetVal)}</span>
          )}
        </td>

        {/* Prev year cumulative */}
        {showPrevYear && (
          <td className="text-right py-1 px-2 min-w-[100px] border-r border-gray-100 bg-gray-50/50">
            <span className={`text-xs tabular-nums text-gray-500`}>{formatVal(prevYearVal)}</span>
          </td>
        )}

        {/* Current year cumulative */}
        <td className="text-right py-1 px-2 min-w-[100px] border-r border-blue-100 bg-blue-50/20">
          <span className={`text-xs tabular-nums font-medium ${colorFn(cumulativeTarget)}`}>{formatVal(cumulativeTarget)}</span>
        </td>

        {/* Monthly target cells */}
        {record.monthlyData.map(m => {
          const { target } = rowDef.getValue(m);
          const cellId = `${rowDef.id}-${m.month}-target`;
          return (
            <td
              key={m.month}
              className={`text-right py-1 px-2 min-w-[80px] border-r border-gray-50 ${
                m.month > CURRENT_MONTH ? 'bg-green-50/30' : ''
              } ${editMode && !nonEditable ? 'cursor-pointer hover:bg-blue-100' : ''}`}
              onClick={() => editMode && !nonEditable && onCellClick(cellId)}
            >
              {editMode && editingCell === cellId && !nonEditable ? (
                <EditCell
                  value={target}
                  editing
                  onSave={v => onUpdateMonth(m.month, { [rowDef.id]: { ...rowDef.getValue(m), target: v } } as Partial<PLMonthData>)}
                />
              ) : (
                <span className={`text-xs tabular-nums ${colorFn(target)}`}>{formatVal(target)}</span>
              )}
            </td>
          );
        })}
      </tr>

      {/* 실적 행 */}
      <tr className={`border-b border-gray-200 hover:bg-orange-50/30 ${rowDef.bg ?? ''}`}>
        <td className="sticky left-0 bg-white border-r border-gray-200 py-1 px-2 z-10" style={{ paddingLeft }}>
          <span className="text-[10px] text-gray-400">실적</span>
        </td>
        <td className="text-center py-1 px-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">실적</Badge>
        </td>

        {/* Annual target placeholder */}
        <td className="text-right py-1 px-2 border-r border-gray-100">
          <span className="text-xs text-gray-300">—</span>
        </td>

        {/* Prev year */}
        {showPrevYear && (
          <td className="text-right py-1 px-2 border-r border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-300">—</span>
          </td>
        )}

        {/* Current year cumulative actual */}
        <td className="text-right py-1 px-2 min-w-[100px] border-r border-blue-100 bg-blue-50/20">
          <span className={`text-xs tabular-nums font-medium ${colorFn(cumulativeActual)}`}>{formatVal(cumulativeActual)}</span>
        </td>

        {/* Monthly actual cells */}
        {record.monthlyData.map(m => {
          const { actual } = rowDef.getValue(m);
          const isFuture = m.month > CURRENT_MONTH;
          const cellId = `${rowDef.id}-${m.month}-actual`;
          return (
            <td
              key={m.month}
              className={`text-right py-1 px-2 border-r border-gray-50 ${
                isFuture ? 'bg-green-50/30' : ''
              } ${editMode && !nonEditable && !isFuture ? 'cursor-pointer hover:bg-orange-100' : ''}`}
              onClick={() => editMode && !nonEditable && !isFuture && onCellClick(cellId)}
            >
              {editMode && editingCell === cellId && !nonEditable && !isFuture ? (
                <EditCell
                  value={actual}
                  editing
                  onSave={v => onUpdateMonth(m.month, { [rowDef.id]: { ...rowDef.getValue(m), actual: v } } as Partial<PLMonthData>)}
                />
              ) : (
                <span className={`text-xs tabular-nums ${isFuture ? 'text-gray-300' : colorFn(actual)}`}>
                  {isFuture ? '—' : formatVal(actual)}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    </>
  );
}

// ─── Monthly summary panel ─────────────────────────────────────────────────────

interface MonthlySummaryProps {
  record: AnnualPLRecord;
}

function MonthlySummary({ record }: MonthlySummaryProps) {
  const rows = [
    { label: '매출액', key: 'rev', bold: false },
    { label: '원가 합계', key: 'totalCost', bold: false },
    { label: '매출총이익', key: 'grossProfit', bold: true, colored: true },
    { label: '이익률', key: 'grossProfitRate', bold: false, isRate: true, colored: true },
    { label: '간접비', key: 'indirectCost', bold: false },
    { label: '영업이익', key: 'operatingProfit', bold: true, colored: true, highlight: true },
    { label: '영업이익률', key: 'operatingProfitRate', bold: false, isRate: true, colored: true, highlight: true },
  ];

  const pastMonths = record.monthlyData.filter(m => m.month <= CURRENT_MONTH);
  const cumulativeActual = calculateMonthSummary(
    pastMonths.reduce((acc, m) => ({
      month: 0,
      revenue: { target: acc.revenue.target + m.revenue.target, actual: acc.revenue.actual + m.revenue.actual },
      deposits: { target: acc.deposits.target + m.deposits.target, actual: acc.deposits.actual + m.deposits.actual },
      purchases: { target: acc.purchases.target + m.purchases.target, actual: acc.purchases.actual + m.purchases.actual },
      projectLaborInternal: { target: acc.projectLaborInternal.target + m.projectLaborInternal.target, actual: acc.projectLaborInternal.actual + m.projectLaborInternal.actual },
      projectLaborExternal: { target: acc.projectLaborExternal.target + m.projectLaborExternal.target, actual: acc.projectLaborExternal.actual + m.projectLaborExternal.actual },
      divisionLaborCommon: { target: acc.divisionLaborCommon.target + m.divisionLaborCommon.target, actual: acc.divisionLaborCommon.actual + m.divisionLaborCommon.actual },
      divisionLaborProposal: { target: acc.divisionLaborProposal.target + m.divisionLaborProposal.target, actual: acc.divisionLaborProposal.actual + m.divisionLaborProposal.actual },
      idleLaborCost: { target: acc.idleLaborCost.target + m.idleLaborCost.target, actual: acc.idleLaborCost.actual + m.idleLaborCost.actual },
      directCostProject: { target: acc.directCostProject.target + m.directCostProject.target, actual: acc.directCostProject.actual + m.directCostProject.actual },
      directCostCommon: { target: acc.directCostCommon.target + m.directCostCommon.target, actual: acc.directCostCommon.actual + m.directCostCommon.actual },
      indirectCost: { target: acc.indirectCost.target + m.indirectCost.target, actual: acc.indirectCost.actual + m.indirectCost.actual },
    }), record.monthlyData[0] ? { ...record.monthlyData[0] } : record.monthlyData[0]),
    'actual'
  );

  const summaryByMonth = record.monthlyData.map(m => ({
    month: m.month,
    actual: calculateMonthSummary(m, 'actual'),
    target: calculateMonthSummary(m, 'target'),
  }));

  const getValue = (key: string, data: ReturnType<typeof calculateMonthSummary>) => {
    switch (key) {
      case 'rev': return data.rev;
      case 'totalCost': return data.totalCost;
      case 'grossProfit': return data.grossProfit;
      case 'grossProfitRate': return data.grossProfitRate;
      case 'indirectCost': return data.indirectCost;
      case 'operatingProfit': return data.operatingProfit;
      case 'operatingProfitRate': return data.operatingProfitRate;
      default: return 0;
    }
  };

  const cumulativeTarget = record.monthlyData.reduce((acc, m) => {
    const s = calculateMonthSummary(m, 'target');
    return {
      rev: acc.rev + s.rev,
      totalCost: acc.totalCost + s.totalCost,
      grossProfit: acc.grossProfit + s.grossProfit,
      grossProfitRate: 0,
      indirectCost: acc.indirectCost + s.indirectCost,
      operatingProfit: acc.operatingProfit + s.operatingProfit,
      operatingProfitRate: 0,
    };
  }, { rev: 0, totalCost: 0, grossProfit: 0, grossProfitRate: 0, indirectCost: 0, operatingProfit: 0, operatingProfitRate: 0 });
  cumulativeTarget.grossProfitRate = cumulativeTarget.rev !== 0 ? (cumulativeTarget.grossProfit / cumulativeTarget.rev) * 100 : 0;
  cumulativeTarget.operatingProfitRate = cumulativeTarget.rev !== 0 ? (cumulativeTarget.operatingProfit / cumulativeTarget.rev) * 100 : 0;

  return (
    <div className="overflow-x-auto">
      <div className="text-right text-xs text-gray-400 mb-1 pr-2">(단위: 원, 진행매출 기준)</div>
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-gray-700 text-white">
            <th className="text-left py-2 px-3 text-sm font-medium min-w-[200px]">구분</th>
            {MONTHS.slice(0, CURRENT_MONTH).map((m, i) => (
              <th key={i} className="text-right py-2 px-3 text-sm font-medium min-w-[110px]">{m}</th>
            ))}
            <th className="text-right py-2 px-3 text-sm font-medium min-w-[120px] bg-gray-800">누계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isHighlight = row.highlight;
            const rowBg = isHighlight ? 'bg-yellow-50' : '';
            return (
              <tr key={row.key} className={`border-b border-gray-200 hover:bg-gray-50 ${rowBg}`}>
                <td className={`py-2 px-3 text-sm ${row.bold ? 'font-semibold' : ''} ${isHighlight ? 'text-red-600 font-bold' : ''}`}>
                  {row.label}
                </td>
                {summaryByMonth.slice(0, CURRENT_MONTH).map(s => {
                  const val = getValue(row.key, s.actual);
                  const isRate = row.isRate ?? false;
                  const colored = row.colored ?? false;
                  const colorClass = colored ? colorByValue(val, true) : '';
                  return (
                    <td key={s.month} className="text-right py-2 px-3">
                      <span className={`text-sm tabular-nums ${colorClass} ${isHighlight ? 'font-semibold' : ''}`}>
                        {isRate ? fmtPct(val) : fmt(val)}
                      </span>
                    </td>
                  );
                })}
                <td className="text-right py-2 px-3 bg-gray-50">
                  {(() => {
                    const cumVal = getValue(row.key, row.key === 'rev' || row.key === 'totalCost' || row.key === 'grossProfit' || row.key === 'indirectCost' || row.key === 'operatingProfit'
                      ? cumulativeActual
                      : { ...cumulativeActual, [row.key]: (cumulativeTarget as any)[row.key] }
                    );
                    const finalVal = row.key === 'grossProfitRate' || row.key === 'operatingProfitRate'
                      ? getValue(row.key, cumulativeActual)
                      : cumVal;
                    const isRate = row.isRate ?? false;
                    const colored = row.colored ?? false;
                    const colorClass = colored ? colorByValue(finalVal, true) : '';
                    return (
                      <span className={`text-sm tabular-nums font-medium ${colorClass} ${isHighlight ? 'font-bold' : ''}`}>
                        {isRate ? fmtPct(finalVal) : fmt(finalVal)}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ProfitLoss() {
  const { records, getRecord, updateMonthData, updateAnnualTarget, resetToDefault } = useProfitLoss();

  const [selectedDivisionId, setSelectedDivisionId] = useState(plDivisions[1].id); // 2본부 default
  const [selectedYear, setSelectedYear] = useState(2026);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [showPrevYear, setShowPrevYear] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'summary'>('table');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cost']));

  const record = getRecord(selectedDivisionId, selectedYear);
  const rows = useMemo(() => buildRows(), []);

  const handleUpdateMonth = useCallback((month: number, updates: Partial<PLMonthData>) => {
    updateMonthData(selectedDivisionId, selectedYear, month, updates);
    setEditingCell(null);
  }, [selectedDivisionId, selectedYear, updateMonthData]);

  const handleUpdateTarget = useCallback((field: keyof AnnualPLRecord['annualTarget'], value: number) => {
    updateAnnualTarget(selectedDivisionId, selectedYear, { [field]: value });
    setEditingCell(null);
  }, [selectedDivisionId, selectedYear, updateAnnualTarget]);

  const handleCellClick = useCallback((cellId: string) => {
    setEditingCell(prev => prev === cellId ? null : cellId);
  }, []);

  // Quick summary from record
  const summaryMetrics = useMemo(() => {
    if (!record) return null;
    const pastMonths = record.monthlyData.filter(m => m.month <= CURRENT_MONTH);
    if (pastMonths.length === 0) return null;

    const totals = pastMonths.reduce((acc, m) => ({
      revenue: acc.revenue + m.revenue.actual,
      cost: acc.cost + m.purchases.actual + m.projectLaborInternal.actual + m.projectLaborExternal.actual +
        m.divisionLaborCommon.actual + m.divisionLaborProposal.actual + m.idleLaborCost.actual +
        m.directCostProject.actual + m.directCostCommon.actual,
      indirect: acc.indirect + m.indirectCost.actual,
    }), { revenue: 0, cost: 0, indirect: 0 });

    const grossProfit = totals.revenue - totals.cost;
    const operatingProfit = grossProfit - totals.indirect;
    return {
      revenue: totals.revenue,
      grossProfit,
      grossProfitRate: totals.revenue ? (grossProfit / totals.revenue) * 100 : 0,
      operatingProfit,
      operatingProfitRate: totals.revenue ? (operatingProfit / totals.revenue) * 100 : 0,
    };
  }, [record]);

  const years = [2025, 2026, 2027];

  if (!record) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <p className="text-gray-500">선택한 사업부/연도의 데이터가 없습니다.</p>
        <Button onClick={resetToDefault} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          기본 데이터 복원
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">월별 손익 관리</h1>
              <p className="text-xs text-gray-500">연간 손익 현황 및 실적 관리</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year selector */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedYear === y
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {y}년
                </button>
              ))}
            </div>

            {/* Division selector */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {plDivisions.map(div => (
                <button
                  key={div.id}
                  onClick={() => setSelectedDivisionId(div.id)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedDivisionId === div.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {div.name}
                </button>
              ))}
            </div>

            {/* Toggle prev year */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrevYear(v => !v)}
              className={showPrevYear ? 'border-gray-400 text-gray-700' : 'border-gray-200 text-gray-400'}
            >
              전년 누계 {showPrevYear ? '숨기기' : '보기'}
            </Button>

            {/* Edit mode toggle */}
            {editMode ? (
              <>
                <Button size="sm" onClick={() => { setEditMode(false); setEditingCell(null); }} className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditingCell(null); }}>
                  취소
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Edit3 className="w-4 h-4 mr-1" />
                편집
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-1" />
              초기화
            </Button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'table' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            연간 손익 표
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'summary' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            월별 요약
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Quick summary cards */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="누계 매출액" value={summaryMetrics.revenue} />
            <SummaryCard label="누계 매출총이익" value={summaryMetrics.grossProfit} isProfit />
            <SummaryCard label="매출총이익률" value={summaryMetrics.grossProfitRate} isRate isProfit />
            <SummaryCard label="누계 영업이익" value={summaryMetrics.operatingProfit} isProfit />
            <SummaryCard label="영업이익률" value={summaryMetrics.operatingProfitRate} isRate isProfit />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">
                {selectedYear}년 {plDivisions.find(d => d.id === selectedDivisionId)?.name} 월별 손익 현황
              </h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
                  목표 이상 달성
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
                  적자
                </span>
                {editMode && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    편집 모드 - 셀을 클릭하여 수정
                  </Badge>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-purple-700 text-white sticky top-0">
                    <th className="sticky left-0 bg-purple-700 text-left py-2.5 px-3 text-xs font-semibold min-w-[180px] z-10 border-r border-purple-600">
                      구분
                    </th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold min-w-[48px]"></th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold min-w-[100px] border-r border-purple-600">
                      목표
                    </th>
                    {showPrevYear && (
                      <th className="text-right py-2.5 px-3 text-xs font-semibold min-w-[100px] border-r border-purple-600 bg-purple-800">
                        {selectedYear - 1}년 누계
                      </th>
                    )}
                    <th className="text-right py-2.5 px-3 text-xs font-semibold min-w-[100px] border-r border-purple-500 bg-purple-600">
                      {selectedYear}년 누계
                    </th>
                    {MONTHS.map((m, i) => (
                      <th
                        key={i}
                        className={`text-right py-2.5 px-3 text-xs font-semibold min-w-[80px] border-r border-purple-600 ${
                          i + 1 > CURRENT_MONTH ? 'bg-purple-800/60' : ''
                        }`}
                      >
                        {m}
                        {i + 1 === CURRENT_MONTH && (
                          <span className="ml-1 text-[9px] bg-yellow-400 text-yellow-900 px-1 rounded">현재</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <SubRow
                      key={row.id}
                      rowDef={row}
                      record={record}
                      editMode={editMode}
                      onUpdateMonth={handleUpdateMonth}
                      onUpdateTarget={handleUpdateTarget}
                      showPrevYear={showPrevYear}
                      editingCell={editingCell}
                      onCellClick={handleCellClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer legend */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
              <span>■ 파란색: 이익 (양수)</span>
              <span>■ 빨간색: 손실 (음수)</span>
              <span>■ 초록 배경: 미래 월 (계획 값)</span>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">
                {selectedYear}년 {plDivisions.find(d => d.id === selectedDivisionId)?.name} 월별 손익 요약
              </h2>
            </div>
            <div className="p-4">
              <MonthlySummary record={record} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
