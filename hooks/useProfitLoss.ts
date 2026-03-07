import { useState, useCallback, useEffect } from 'react';
import { AnnualPLRecord, PLMonthData, PLAnnualTarget } from '../types';
import { mockPLRecords } from '../data/profitLossData';

const STORAGE_KEY = 'pl_records';

function loadFromStorage(): AnnualPLRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : mockPLRecords;
  } catch {
    return mockPLRecords;
  }
}

function saveToStorage(data: AnnualPLRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useProfitLoss() {
  const [records, setRecords] = useState<AnnualPLRecord[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(records);
  }, [records]);

  const getRecord = useCallback((divisionId: string, year: number): AnnualPLRecord | undefined => {
    return records.find(r => r.divisionId === divisionId && r.year === year);
  }, [records]);

  const upsertRecord = useCallback((record: AnnualPLRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.divisionId === record.divisionId && r.year === record.year);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [...prev, record];
    });
  }, []);

  const updateMonthData = useCallback((
    divisionId: string,
    year: number,
    month: number,
    updates: Partial<PLMonthData>
  ) => {
    setRecords(prev => prev.map(record => {
      if (record.divisionId !== divisionId || record.year !== year) return record;
      return {
        ...record,
        monthlyData: record.monthlyData.map(m =>
          m.month === month ? { ...m, ...updates } : m
        ),
      };
    }));
  }, []);

  const updateAnnualTarget = useCallback((
    divisionId: string,
    year: number,
    updates: Partial<PLAnnualTarget>
  ) => {
    setRecords(prev => prev.map(record => {
      if (record.divisionId !== divisionId || record.year !== year) return record;
      return {
        ...record,
        annualTarget: { ...record.annualTarget, ...updates },
      };
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setRecords(mockPLRecords);
  }, []);

  return {
    records,
    getRecord,
    upsertRecord,
    updateMonthData,
    updateAnnualTarget,
    resetToDefault,
  };
}
