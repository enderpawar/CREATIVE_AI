/**
 * 에러 핸들링 유틸리티
 * 일관된 에러 처리 및 사용자 피드백을 제공합니다.
 */

import { logger } from './logger';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * API 에러를 파싱하여 사용자 친화적인 메시지로 변환
 */
export function parseApiError(error: any): ApiError {
  if (error.response) {
    // HTTP 응답 에러
    const status = error.response.status;
    const message = error.response.data?.error?.message || error.response.statusText;
    
    return {
      message: getUserFriendlyMessage(status, message),
      code: error.response.data?.error?.code,
      status,
    };
  } else if (error.request) {
    // 요청은 보냈지만 응답이 없음
    return {
      message: '서버와 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
    };
  } else {
    // 요청 설정 중 에러 발생
    return {
      message: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * HTTP 상태 코드에 따른 사용자 친화적 메시지
 */
function getUserFriendlyMessage(status: number, originalMessage: string): string {
  switch (status) {
    case 400:
      return '잘못된 요청입니다. 입력 내용을 확인해주세요.';
    case 401:
      return 'API 키가 유효하지 않습니다. API 키를 다시 확인해주세요.';
    case 403:
      return 'API 키 권한이 부족합니다.';
    case 404:
      return '요청한 리소스를 찾을 수 없습니다.';
    case 429:
      return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    case 500:
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 503:
      return '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
    default:
      return originalMessage || `오류가 발생했습니다 (코드: ${status})`;
  }
}

/**
 * 에러를 로깅하고 사용자에게 표시할 메시지 반환
 */
export function handleError(error: any, context?: string): string {
  const apiError = parseApiError(error);
  
  // 에러 로깅 (컨텍스트 정보 포함)
  logger.error(`[${context || 'Error'}]`, {
    message: apiError.message,
    code: apiError.code,
    status: apiError.status,
    originalError: error,
  });
  
  return apiError.message;
}

/**
 * 재시도 가능한 에러인지 판단
 */
export function isRetryableError(error: any): boolean {
  const status = error.response?.status;
  // 429 (Too Many Requests), 500, 502, 503, 504는 재시도 가능
  return [429, 500, 502, 503, 504].includes(status);
}

/**
 * 지수 백오프를 사용한 재시도 로직
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || i === maxRetries - 1) {
        throw error;
      }
      
      // 지수 백오프: 1초, 2초, 4초...
      const delay = baseDelay * Math.pow(2, i);
      logger.warn(`요청 실패. ${delay}ms 후 재시도합니다... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
