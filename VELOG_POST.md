# React 프로젝트 리팩토링 - 로깅, 에러 핸들링, 그리고 유틸리티 모듈화

## 들어가며

CREATIVE AI 프로젝트를 개발하면서 코드가 점점 복잡해지고 중복이 늘어나는 문제를 발견했습니다. 특히 `console.log`가 곳곳에 산재해 있고, 에러 처리 방식이 제각각이었죠. 이번 포스트에서는 프로젝트의 유지보수성과 확장성을 높이기 위해 진행한 리팩토링 작업을 공유합니다.

## 🎯 리팩토링 목표

1. **프로덕션 환경에서 불필요한 로그 제거**
2. **일관된 에러 처리 방식 구축**
3. **중복 코드 제거 및 재사용성 향상**
4. **API 키 보안 강화**

---

## 1. 로깅 시스템 구축 🔍

### 문제점

```javascript
// 프로젝트 곳곳에 산재된 console.log
console.log('로직이 삭제되었습니다.');
console.log('📥 Received pipeline:', pipeline);
console.error('로직 목록 로딩 실패:', e);
```

프로덕션 빌드에서도 모든 로그가 그대로 출력되어 성능 저하와 보안 이슈가 있었습니다.

### 해결 방법

개발/프로덕션 환경을 구분하는 로깅 유틸리티를 만들었습니다.

```typescript
// src/utils/logger.ts
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    console.warn(...args); // 항상 출력
  },

  error: (...args: any[]) => {
    console.error(...args); // 항상 출력
  },

  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
};
```

### 적용 예시

```javascript
// Before
console.error('로직 목록 로딩 실패:', e);
console.log('Generated pipeline:', pipeline);

// After
logger.error('로직 목록 로딩 실패:', e);
logger.debug('Generated pipeline:', pipeline);
```

### 효과

- ✅ 프로덕션 빌드 크기 감소
- ✅ 민감한 정보 노출 방지
- ✅ 개발 시 필요한 디버그 정보는 유지

---

## 2. 에러 핸들링 표준화 ⚠️

### 문제점

```javascript
// 각기 다른 에러 처리 방식
try {
  await fetchData();
} catch (error) {
  console.error('에러 발생:', error);
  toast.error('오류가 발생했습니다.');
}

try {
  await apiCall();
} catch (e) {
  toast.error(e.message || '실패했습니다.');
}
```

### 해결 방법

API 에러를 파싱하고 사용자 친화적인 메시지로 변환하는 유틸리티를 구축했습니다.

```typescript
// src/utils/errorHandler.ts
export function parseApiError(error: any): ApiError {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.error?.message || error.response.statusText;
    
    return {
      message: getUserFriendlyMessage(status, message),
      code: error.response.data?.error?.code,
      status,
    };
  } else if (error.request) {
    return {
      message: '서버와 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
    };
  } else {
    return {
      message: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }
}

function getUserFriendlyMessage(status: number, originalMessage: string): string {
  switch (status) {
    case 401:
      return 'API 키가 유효하지 않습니다. API 키를 다시 확인해주세요.';
    case 429:
      return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    case 500:
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    default:
      return originalMessage || `오류가 발생했습니다 (코드: ${status})`;
  }
}
```

### 재시도 로직 추가

```typescript
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
```

### 적용 예시

```javascript
// Before
try {
  const result = await generatePythonCode(prompt);
  setGeneratedCode(result.code);
} catch (error) {
  console.error('코드 생성 오류:', error);
  toast.error(error.message || '코드 생성에 실패했습니다.');
}

// After
try {
  const result = await generatePythonCode(prompt);
  setGeneratedCode(result.code);
} catch (error) {
  const errorMessage = handleError(error, 'Gemini API - generatePythonCode');
  toast.error(errorMessage);
}
```

### 효과

- ✅ 일관된 에러 메시지
- ✅ HTTP 상태 코드별 맞춤 안내
- ✅ 일시적 네트워크 오류 자동 재시도
- ✅ 향상된 사용자 경험

---

## 3. 테마 색상 유틸리티로 중복 제거 🎨

### 문제점

```javascript
// CSVDataManager.jsx
const colors = {
  dark: {
    bg: 'bg-neutral-900/60',
    border: 'border-neutral-800/70',
    title: 'text-gray-200',
    // ... 13개 속성
  },
  light: {
    bg: 'bg-white/80',
    border: 'border-gray-300',
    title: 'text-gray-800',
    // ... 13개 속성
  }
};

// 다른 컴포넌트에서도 동일한 코드 반복...
```

### 해결 방법

테마 색상을 중앙화된 유틸리티로 관리합니다.

```typescript
// src/utils/themeColors.ts
export type Theme = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  border: string;
  title: string;
  text: string;
  // ... 더 많은 속성
}

const darkTheme: ThemeColors = {
  bg: 'bg-neutral-900/60',
  border: 'border-neutral-800/70',
  title: 'text-gray-200',
  // ...
};

const lightTheme: ThemeColors = {
  bg: 'bg-white/80',
  border: 'border-gray-300',
  title: 'text-gray-800',
  // ...
};

export function getThemeColors(theme: Theme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
```

### 적용 예시

```javascript
// Before
const colors = { dark: {...}, light: {...} };
const c = colors[theme] || colors.dark;

// After
import { getThemeColors } from '../utils/themeColors';

const c = getThemeColors(theme);
```

### 효과

- ✅ 약 40줄의 중복 코드 제거
- ✅ 테마 수정 시 단일 파일만 변경
- ✅ TypeScript 타입 지원으로 오타 방지

---

## 4. API 키 관리 보안 강화 🔐

### 문제점

```javascript
// 직접 localStorage 접근
const apiKey = localStorage.getItem('gemini_api_key');
localStorage.setItem('gemini_api_key', userInput);
```

형식 검증이나 유효성 체크 없이 바로 저장되었습니다.

### 해결 방법

API 키 관리를 위한 전용 유틸리티를 만들었습니다.

```typescript
// src/utils/apiKeyManager.ts
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

function isValidApiKeyFormat(apiKey: string): boolean {
  // 최소 길이 확인
  if (apiKey.length < 30) {
    return false;
  }
  
  // Gemini API 키는 보통 AIza로 시작
  const startsWithAIza = apiKey.startsWith('AIza');
  const hasValidLength = apiKey.length >= 30 && apiKey.length <= 100;
  const hasValidChars = /^[A-Za-z0-9_-]+$/.test(apiKey);
  
  return startsWithAIza && hasValidLength && hasValidChars;
}

// 실제 API 호출로 유효성 검증
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });
    
    return response.ok || response.status !== 401;
  } catch (error) {
    logger.error('API 키 검증 실패:', error);
    return false;
  }
}

// 보안을 위한 마스킹
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '****';
  }
  
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 3);
  return `${start}****${end}`;
}
```

### 적용 예시

```javascript
// Before
if (apiKeyInput.trim()) {
  localStorage.setItem('gemini_api_key', apiKeyInput.trim());
  toast.success('API 키가 저장되었습니다!');
}

// After
if (apiKeyInput.trim()) {
  try {
    saveApiKey(apiKeyInput.trim());
    toast.success('API 키가 저장되었습니다!');
    setShowApiKeyModal(false);
  } catch (error) {
    toast.error(error.message || 'API 키 저장에 실패했습니다.');
  }
}
```

### 효과

- ✅ API 키 형식 사전 검증
- ✅ 잘못된 키 저장 방지
- ✅ 실제 API 호출로 유효성 확인 가능
- ✅ 보안 강화 (마스킹 기능)

---

## 📊 전체 변경 사항 요약

### 생성된 파일 (4개)
- `src/utils/logger.ts` - 로깅 시스템
- `src/utils/themeColors.ts` - 테마 색상 관리
- `src/utils/errorHandler.ts` - 에러 처리
- `src/utils/apiKeyManager.ts` - API 키 관리

### 수정된 파일 (7개)
- `src/App.jsx`
- `src/components/CSVDataManager.jsx`
- `src/components/GeminiPipelineGenerator.jsx`
- `src/components/LogicEditorPage.jsx`
- `src/utils/geminiPipeline.ts`
- `src/utils/logicStorage.ts`

### 개선 지표
- 🗑️ **20개 이상의 console.log 제거**
- 🎨 **~40줄의 중복 코드 제거** (테마 색상)
- 🔒 **API 키 검증 로직 추가**
- ⚡ **프로덕션 빌드 최적화**

---

## 💡 사용 예시

### Logger

```javascript
import { logger } from './utils/logger';

// 개발 환경에서만 출력
logger.debug('디버그 정보', { data });
logger.log('일반 로그');
logger.info('정보 메시지');

// 항상 출력
logger.warn('경고!');
logger.error('에러 발생', error);
```

### Error Handler

```javascript
import { handleError, retryWithBackoff } from './utils/errorHandler';

try {
  // 최대 3번 재시도
  const data = await retryWithBackoff(() => fetchData(), 3);
} catch (error) {
  const message = handleError(error, 'fetchData');
  toast.error(message);
}
```

### API Key Manager

```javascript
import { saveApiKey, validateApiKey, maskApiKey } from './utils/apiKeyManager';

// 저장 (형식 검증 포함)
try {
  saveApiKey(userInput);
} catch (error) {
  toast.error(error.message);
}

// 유효성 검증
const isValid = await validateApiKey(apiKey);

// 마스킹하여 표시
console.log(maskApiKey('AIzaSyABCDEF123456')); // "AIza****456"
```

---

## 🚀 다음 단계

이번 리팩토링으로 기본적인 코드 품질은 많이 개선되었지만, 아직 개선할 부분이 남아있습니다:

1. **타입 안정성 강화**: JSX → TSX 마이그레이션
2. **상태 관리 개선**: Zustand/Jotai 도입 고려
3. **테스트 코드 작성**: Vitest + React Testing Library
4. **성능 최적화**: useMemo, useCallback 활용
5. **접근성 개선**: ARIA 속성 추가

---

## 마치며

작은 유틸리티 함수들을 만드는 것만으로도 코드의 가독성과 유지보수성이 크게 향상되었습니다. 특히 로깅과 에러 핸들링을 표준화한 것이 가장 큰 성과였던 것 같습니다.

여러분의 프로젝트에도 비슷한 문제가 있다면, 이 글이 도움이 되길 바랍니다! 🙌

---

**태그**: `#React` `#리팩토링` `#TypeScript` `#에러핸들링` `#로깅` `#코드품질`

**시리즈**: React 프로젝트 최적화 여정
