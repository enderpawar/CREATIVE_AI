// Gemini API를 사용하여 Python 코드 생성

const getApiKey = (): string | null => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    return localStorage.getItem('gemini_api_key');
};

/**
 * Gemini API를 사용하여 사용자 프롬프트로부터 Python 코드를 생성합니다.
 */
export async function generatePythonCode(userPrompt: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 머신러닝 전문가입니다. 사용자의 요구사항에 맞는 scikit-learn 기반 Python 코드를 생성해주세요.

중요한 규칙:
1. 완전하고 실행 가능한 코드를 작성하세요
2. 필요한 모든 import 문을 포함하세요
3. 데이터 로딩, 전처리, 모델 훈련, 평가를 모두 포함하세요
4. 주석을 포함하여 코드를 설명하세요
5. 반드시 \`\`\`python 코드 블록으로 감싸주세요

예시 출력 형식:
\`\`\`python
# 필요한 라이브러리 import
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 데이터 로딩
df = pd.read_csv('data.csv')

# 특성과 타겟 분리
X = df.drop('target', axis=1)
y = df['target']

# 훈련/테스트 데이터 분할
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 정규화
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 모델 훈련
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# 예측 및 평가
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f'Accuracy: {accuracy:.4f}')
print(classification_report(y_test, y_pred))
\`\`\`

사용자 요구사항: ${userPrompt}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Python 코드 블록 추출
        const match = text.match(/```python\n([\s\S]+?)\n```/);
        if (match) {
            return match[1].trim();
        }
        
        // 코드 블록이 없으면 전체 텍스트 반환
        return text.trim();
    } catch (error) {
        console.error('Gemini API 오류:', error);
        throw new Error(`코드 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * API 키를 localStorage에 저장합니다.
 */
export function saveGeminiApiKey(apiKey: string): void {
    localStorage.setItem('gemini_api_key', apiKey);
}

/**
 * 저장된 API 키를 가져옵니다.
 */
export function getStoredGeminiApiKey(): string | null {
    return localStorage.getItem('gemini_api_key');
}

/**
 * API 키를 삭제합니다.
 */
export function removeGeminiApiKey(): void {
    localStorage.removeItem('gemini_api_key');
}
