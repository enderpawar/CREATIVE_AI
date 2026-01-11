/**
 * 로깅 유틸리티
 * 개발/프로덕션 환경을 구분하여 로그를 관리합니다.
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * 일반 로그 (개발 환경에서만 출력)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * 정보 로그 (개발 환경에서만 출력)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * 경고 로그 (항상 출력)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * 에러 로그 (항상 출력)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * 디버그 로그 (개발 환경에서만 출력)
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
};
