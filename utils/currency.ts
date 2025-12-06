/**
 * 한국 원화 통화 포맷팅 유틸리티
 */

/**
 * 금액을 한국 원화 형식으로 포맷팅합니다.
 * @param amount 포맷팅할 금액 (숫자)
 * @returns 포맷팅된 문자열 (예: "1,500만원", "2.5억원", "₩50,000")
 */
export const formatCurrency = (amount: number): string => {
  // 음수 처리
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const prefix = isNegative ? '-' : '';
  
  // 100억 이상
  if (absAmount >= 10000000000) {
    const billions = absAmount / 100000000;
    return `${prefix}${billions.toFixed(1)}억원`;
  }
  
  // 1억 이상 100억 미만
  if (absAmount >= 100000000) {
    const billions = absAmount / 100000000;
    return `${prefix}${billions.toFixed(1)}억원`;
  }
  
  // 1만 이상 1억 미만
  if (absAmount >= 10000) {
    const tenThousands = Math.floor(absAmount / 10000);
    const remainder = absAmount % 10000;
    
    if (remainder === 0) {
      return `${prefix}${tenThousands}만원`;
    } else {
      // 천원 단위가 있는 경우
      const thousands = Math.floor(remainder / 1000);
      if (thousands > 0) {
        return `${prefix}${tenThousands}만 ${thousands}천원`;
      } else {
        return `${prefix}${tenThousands}만원`;
      }
    }
  }
  
  // 1만 미만은 원화 기호와 함께 표시
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(absAmount).replace(/^/, prefix);
};

/**
 * 금액을 간단한 한국 원화 형식으로 포맷팅합니다 (원화 기호 없음)
 * @param amount 포맷팅할 금액 (숫자)
 * @returns 포맷팅된 문자열 (예: "1,500만원", "2.5억원", "50,000원")
 */
export const formatCurrencySimple = (amount: number): string => {
  // 음수 처리
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const prefix = isNegative ? '-' : '';
  
  // 100억 이상
  if (absAmount >= 10000000000) {
    const billions = absAmount / 100000000;
    return `${prefix}${billions.toFixed(1)}억원`;
  }
  
  // 1억 이상 100억 미만
  if (absAmount >= 100000000) {
    const billions = absAmount / 100000000;
    return `${prefix}${billions.toFixed(1)}억원`;
  }
  
  // 1만 이상 1억 미만
  if (absAmount >= 10000) {
    const tenThousands = Math.floor(absAmount / 10000);
    return `${prefix}${tenThousands}만원`;
  }
  
  // 1만 미만
  return `${prefix}${absAmount.toLocaleString('ko-KR')}원`;
};

/**
 * 시간당 요율을 한국 원화로 포맷팅합니다.
 * @param hourlyRate 시간당 요율
 * @returns 포맷팅된 문자열 (예: "85,000원/시간")
 */
export const formatHourlyRate = (hourlyRate: number): string => {
  return `${hourlyRate.toLocaleString('ko-KR')}원/시간`;
};

/**
 * 예산을 입력 폼에 적합한 형태로 포맷팅합니다.
 * @param amount 포맷팅할 금액
 * @returns 포맷팅된 문자열 (콤마 포함, 원 단위 표시)
 */
export const formatBudgetInput = (amount: number): string => {
  if (amount === 0) return '';
  return amount.toLocaleString('ko-KR');
};

/**
 * 포맷팅된 통화 문자열을 숫자로 변환합니다.
 * @param formattedCurrency 포맷팅된 통화 문자열
 * @returns 숫자 값
 */
export const parseCurrency = (formattedCurrency: string): number => {
  // 숫자가 아닌 문자 제거 (콤마, 원, 공백 등)
  const numericString = formattedCurrency.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numericString);
  return isNaN(parsed) ? 0 : parsed;
};