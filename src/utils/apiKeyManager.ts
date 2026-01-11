/**
 * API 키 관리 유틸리티
 * API 키의 저장, 검증 및 관리를 담당합니다.
 */

import { logger } from './logger';

const STORAGE_KEY = 'gemini_api_key';

/**
 * API 키를 localStorage에 저장
 */
export function saveApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API 키가 비어있습니다.');
  }
  
  const trimmedKey = apiKey.trim();
  
  // 기본적인 형식 검증
  if (!isValidApiKeyFormat(trimmedKey)) {
    throw new Error('API 키 형식이 올바르지 않습니다.');
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, trimmedKey);
    logger.info('API 키가 성공적으로 저장되었습니다.');
  } catch (error) {
    logger.error('API 키 저장 실패:', error);
    throw new Error('API 키를 저장할 수 없습니다.');
  }
}

/**
 * localStorage에서 API 키 조회
 */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    logger.error('API 키 조회 실패:', error);
    return null;
  }
}

/**
 * API 키 삭제
 */
export function removeApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('API 키가 삭제되었습니다.');
  } catch (error) {
    logger.error('API 키 삭제 실패:', error);
  }
}

/**
 * API 키 존재 여부 확인
 */
export function hasApiKey(): boolean {
  const key = getApiKey();
  return key !== null && key.length > 0;
}

/**
 * API 키 형식 검증 (기본)
 * Gemini API 키는 일반적으로 "AIza"로 시작
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  // 최소 길이 확인
  if (apiKey.length < 30) {
    return false;
  }
  
  // Gemini API 키는 보통 AIza로 시작
  // 하지만 다른 형식도 허용할 수 있도록 유연하게
  const startsWithAIza = apiKey.startsWith('AIza');
  const hasValidLength = apiKey.length >= 30 && apiKey.length <= 100;
  const hasValidChars = /^[A-Za-z0-9_-]+$/.test(apiKey);
  
  return startsWithAIza && hasValidLength && hasValidChars;
}

/**
 * API 키 유효성 검증 (실제 API 호출)
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
        generationConfig: {
          maxOutputTokens: 10,
        }
      })
    });
    
    // 401이면 인증 실패, 200이면 성공
    return response.ok || response.status !== 401;
  } catch (error) {
    logger.error('API 키 검증 실패:', error);
    return false;
  }
}

/**
 * API 키를 마스킹하여 표시 (로깅/UI용)
 * 예: AIzaSyABC...XYZ → AIza****XYZ
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '****';
  }
  
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 3);
  return `${start}****${end}`;
}
