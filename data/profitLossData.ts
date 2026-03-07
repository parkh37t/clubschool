import { PLDivision, AnnualPLRecord, PLMonthData, PLAnnualTarget } from '../types';

export const plDivisions: PLDivision[] = [
  { id: 'div-1', name: '1본부', code: 'D1' },
  { id: 'div-2', name: '2본부', code: 'D2' },
  { id: 'div-3', name: '3본부', code: 'D3' },
  { id: 'div-4', name: '전사', code: 'ALL' },
];

function makeMonthValue(target: number, actualRatio: number, month: number) {
  // 미래 월은 실적 0
  const currentMonth = 3; // 현재 3월
  const actual = month <= currentMonth ? Math.round(target * actualRatio) : 0;
  return { target, actual };
}

function buildMonth(month: number, base: {
  revenue: number;
  deposits: number;
  purchases: number;
  projectLaborInternal: number;
  projectLaborExternal: number;
  divisionLaborCommon: number;
  divisionLaborProposal: number;
  idleLaborCost: number;
  directCostProject: number;
  directCostCommon: number;
  indirectCost: number;
}, ratios: number[]): PLMonthData {
  const r = ratios[month - 1] ?? 0;
  return {
    month,
    revenue: makeMonthValue(base.revenue, r, month),
    deposits: makeMonthValue(base.deposits, r * 0.95, month),
    purchases: makeMonthValue(base.purchases, r * 1.02, month),
    projectLaborInternal: makeMonthValue(base.projectLaborInternal, r * 1.05, month),
    projectLaborExternal: makeMonthValue(base.projectLaborExternal, r * 0.98, month),
    divisionLaborCommon: makeMonthValue(base.divisionLaborCommon, month === 1 ? 1.0 : 0, month),
    divisionLaborProposal: makeMonthValue(base.divisionLaborProposal, month === 1 ? 1.0 : 0, month),
    idleLaborCost: makeMonthValue(base.idleLaborCost, 0, month),
    directCostProject: makeMonthValue(base.directCostProject, r * 0.85, month),
    directCostCommon: makeMonthValue(base.directCostCommon, month <= 1 ? 1.0 : 0, month),
    indirectCost: makeMonthValue(base.indirectCost, 1.0, month),
  };
}

// 2본부 데이터 - 스크린샷 기준
const div2Base = {
  revenue: 82_200_000,
  deposits: 0,
  purchases: 0,
  projectLaborInternal: 55_000_000,
  projectLaborExternal: 13_100_000,
  divisionLaborCommon: 16_371_857,
  divisionLaborProposal: 8_272_934,
  idleLaborCost: 0,
  directCostProject: 523_000,
  directCostCommon: 0,
  indirectCost: 45_900_713,
};

const div2Ratios = [
  // 1월: 비율 기반 실적값 (스크린샷 기준 역산)
  // revenue target=82.2M, actual=82.2M (100%)
  1.0, // 1월 (but we override with actual data)
  1.0, // 2월
  1.0, // 3월
  0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const div2Annual: PLAnnualTarget = {
  revenue: 909_000_000,
  deposits: 909_000_000,
  purchases: 0,
  projectLaborInternal: 597_000_000,
  projectLaborExternal: 157_200_000,
  divisionLaborCommon: 0,
  divisionLaborProposal: 0,
  idleLaborCost: 0,
  directCostProject: 8_270_000,
  directCostCommon: 0,
  indirectCost: 550_808_556,
};

const div2PrevYear: PLAnnualTarget = {
  revenue: 246_600_000,
  deposits: 246_600_000,
  purchases: 0,
  projectLaborInternal: 166_903_667,
  projectLaborExternal: 39_411_900,
  divisionLaborCommon: 0,
  divisionLaborProposal: 0,
  idleLaborCost: 0,
  directCostProject: 1_569_000,
  directCostCommon: 0,
  indirectCost: 206_315_567,
};

// Override with exact values from screenshot
function buildDiv2Month(month: number): PLMonthData {
  const exactData: Record<number, PLMonthData> = {
    1: {
      month: 1,
      revenue: { target: 82_200_000, actual: 82_200_000 },
      deposits: { target: 82_200_000, actual: 0 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 55_000_000, actual: 55_000_000 },
      projectLaborExternal: { target: 13_100_000, actual: 13_211_900 },
      divisionLaborCommon: { target: 55_000_000, actual: 55_000_000 },
      divisionLaborProposal: { target: 55_000_000, actual: 55_000_000 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 523_000, actual: 523_000 },
      directCostCommon: { target: 0, actual: 0 },
      indirectCost: { target: 45_900_713, actual: 45_900_713 },
    },
    2: {
      month: 2,
      revenue: { target: 82_200_000, actual: 82_200_000 },
      deposits: { target: 82_200_000, actual: 0 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 55_000_000, actual: 55_000_000 },
      projectLaborExternal: { target: 13_100_000, actual: 13_100_000 },
      divisionLaborCommon: { target: 55_000_000, actual: 55_000_000 },
      divisionLaborProposal: { target: 55_000_000, actual: 55_000_000 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 523_000, actual: 523_000 },
      directCostCommon: { target: 0, actual: 0 },
      indirectCost: { target: 45_900_713, actual: 45_900_713 },
    },
    3: {
      month: 3,
      revenue: { target: 82_200_000, actual: 82_200_000 },
      deposits: { target: 82_200_000, actual: 0 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 55_000_000, actual: 55_000_000 },
      projectLaborExternal: { target: 13_100_000, actual: 13_100_000 },
      divisionLaborCommon: { target: 48_000_000, actual: 48_000_000 },
      divisionLaborProposal: { target: 48_000_000, actual: 48_000_000 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 523_000, actual: 523_000 },
      directCostCommon: { target: 0, actual: 0 },
      indirectCost: { target: 45_900_713, actual: 45_900_713 },
    },
  };

  if (exactData[month]) return exactData[month];

  // Future months
  const monthlyTarget = 82_200_000;
  return {
    month,
    revenue: { target: monthlyTarget, actual: 0 },
    deposits: { target: monthlyTarget, actual: 0 },
    purchases: { target: 0, actual: 0 },
    projectLaborInternal: { target: 55_000_000, actual: 0 },
    projectLaborExternal: { target: 13_100_000, actual: 0 },
    divisionLaborCommon: { target: 48_000_000, actual: 0 },
    divisionLaborProposal: { target: 48_000_000, actual: 0 },
    idleLaborCost: { target: 0, actual: 0 },
    directCostProject: { target: 523_000, actual: 0 },
    directCostCommon: { target: 0, actual: 0 },
    indirectCost: { target: 45_900_713, actual: 0 },
  };
}

// 1본부 데이터
function buildDiv1Month(month: number): PLMonthData {
  const baseRevenue = 287_787_037;
  const baseLaborInt = 158_167_063;
  const baseLaborExt = 170_450_548;
  const directProj = 2_272_156;

  if (month === 1) {
    return {
      month,
      revenue: { target: 300_000_000, actual: 287_787_037 },
      deposits: { target: 300_000_000, actual: 260_000_000 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 160_000_000, actual: 158_167_063 },
      projectLaborExternal: { target: 170_000_000, actual: 170_450_548 },
      divisionLaborCommon: { target: 0, actual: 0 },
      divisionLaborProposal: { target: 8_272_934, actual: 8_272_934 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 2_500_000, actual: 2_272_156 },
      directCostCommon: { target: 1_700_000, actual: 1_642_147 },
      indirectCost: { target: 0, actual: 0 },
    };
  }
  if (month === 2) {
    return {
      month,
      revenue: { target: 270_000_000, actual: 176_611_984 },
      deposits: { target: 270_000_000, actual: 150_000_000 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 150_000_000, actual: 84_367_143 },
      projectLaborExternal: { target: 140_000_000, actual: 113_968_000 },
      divisionLaborCommon: { target: 0, actual: 0 },
      divisionLaborProposal: { target: 0, actual: 0 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 2_500_000, actual: 1_076_400 },
      directCostCommon: { target: 0, actual: 0 },
      indirectCost: { target: 0, actual: 0 },
    };
  }
  if (month === 3) {
    return {
      month,
      revenue: { target: 250_000_000, actual: 145_018_929 },
      deposits: { target: 250_000_000, actual: 130_000_000 },
      purchases: { target: 0, actual: 0 },
      projectLaborInternal: { target: 130_000_000, actual: 52_938_387 },
      projectLaborExternal: { target: 100_000_000, actual: 76_937_226 },
      divisionLaborCommon: { target: 0, actual: 0 },
      divisionLaborProposal: { target: 0, actual: 0 },
      idleLaborCost: { target: 0, actual: 0 },
      directCostProject: { target: 2_000_000, actual: 192_800 },
      directCostCommon: { target: 0, actual: 0 },
      indirectCost: { target: 0, actual: 0 },
    };
  }

  // 미래 월
  return {
    month,
    revenue: { target: 250_000_000, actual: 0 },
    deposits: { target: 250_000_000, actual: 0 },
    purchases: { target: 0, actual: 0 },
    projectLaborInternal: { target: 130_000_000, actual: 0 },
    projectLaborExternal: { target: 100_000_000, actual: 0 },
    divisionLaborCommon: { target: 0, actual: 0 },
    divisionLaborProposal: { target: 0, actual: 0 },
    idleLaborCost: { target: 0, actual: 0 },
    directCostProject: { target: 2_000_000, actual: 0 },
    directCostCommon: { target: 0, actual: 0 },
    indirectCost: { target: 0, actual: 0 },
  };
}

export const mockPLRecords: AnnualPLRecord[] = [
  // 1본부
  {
    id: 'pl-2026-div1',
    divisionId: 'div-1',
    year: 2026,
    annualTarget: {
      revenue: 4_091_000_000,
      deposits: 4_091_000_000,
      purchases: 0,
      projectLaborInternal: 1_653_258_051,
      projectLaborExternal: 1_443_068_723,
      divisionLaborCommon: 0,
      divisionLaborProposal: 8_272_934,
      idleLaborCost: 0,
      directCostProject: 57_730_000,
      directCostCommon: 14_971_697,
      indirectCost: 0,
    },
    prevYearCumulative: {
      revenue: 609_177_294,
      deposits: 540_000_000,
      purchases: 0,
      projectLaborInternal: 394_605_051,
      projectLaborExternal: 354_418_723,
      divisionLaborCommon: 16_371_857,
      divisionLaborProposal: 8_272_934,
      idleLaborCost: 0,
      directCostProject: 3_540_356,
      directCostCommon: 1_642_147,
      indirectCost: 137_702_139,
    },
    monthlyData: Array.from({ length: 12 }, (_, i) => buildDiv1Month(i + 1)),
  },
  // 2본부
  {
    id: 'pl-2026-div2',
    divisionId: 'div-2',
    year: 2026,
    annualTarget: div2Annual,
    prevYearCumulative: div2PrevYear,
    monthlyData: Array.from({ length: 12 }, (_, i) => buildDiv2Month(i + 1)),
  },
];

export function calculateMonthSummary(monthData: PLMonthData, field: 'target' | 'actual') {
  const rev = monthData.revenue[field];
  const totalCost =
    monthData.purchases[field] +
    monthData.projectLaborInternal[field] +
    monthData.projectLaborExternal[field] +
    monthData.divisionLaborCommon[field] +
    monthData.divisionLaborProposal[field] +
    monthData.idleLaborCost[field] +
    monthData.directCostProject[field] +
    monthData.directCostCommon[field];
  const grossProfit = rev - totalCost;
  const grossProfitRate = rev !== 0 ? (grossProfit / rev) * 100 : 0;
  const indirectCost = monthData.indirectCost[field];
  const operatingProfit = grossProfit - indirectCost;
  const operatingProfitRate = rev !== 0 ? (operatingProfit / rev) * 100 : 0;
  return { rev, totalCost, grossProfit, grossProfitRate, indirectCost, operatingProfit, operatingProfitRate };
}

export function sumAnnualTarget(target: PLAnnualTarget) {
  const totalCost =
    target.purchases +
    target.projectLaborInternal +
    target.projectLaborExternal +
    target.divisionLaborCommon +
    target.divisionLaborProposal +
    target.idleLaborCost +
    target.directCostProject +
    target.directCostCommon;
  const grossProfit = target.revenue - totalCost;
  const grossProfitRate = target.revenue !== 0 ? (grossProfit / target.revenue) * 100 : 0;
  const operatingProfit = grossProfit - target.indirectCost;
  const operatingProfitRate = target.revenue !== 0 ? (operatingProfit / target.revenue) * 100 : 0;
  return { totalCost, grossProfit, grossProfitRate, operatingProfit, operatingProfitRate };
}
