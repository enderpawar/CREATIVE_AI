import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 키는 환경변수나 localStorage에서 가져옵니다
const getApiKey = (): string | null => {
    // 환경변수에서 먼저 확인
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    
    // localStorage에서 확인
    return localStorage.getItem('gemini_api_key');
};

export interface PipelineNode {
    type: string;
    id: string;
    position: { x: number; y: number };
    controls?: Record<string, any>;
}

export interface PipelineConnection {
    source: string;
    sourceOutput: string;
    target: string;
    targetInput: string;
}

export interface GeneratedPipeline {
    nodes: PipelineNode[];
    connections: PipelineConnection[];
}

/**
 * Gemini API를 사용하여 사용자 프롬프트로부터 ML 파이프라인을 생성합니다.
 */
export async function generatePipelineFromPrompt(
    userPrompt: string
): Promise<GeneratedPipeline> {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다. API 키를 먼저 설정해주세요.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 프롬프트 엔지니어링: ML 파이프라인 노드 정의를 포함한 시스템 프롬프트
    const systemPrompt = `당신은 머신러닝 파이프라인 설계 전문가입니다. 사용자의 요구사항을 분석하여 적절한 노드 그래프를 생성해야 합니다.

사용 가능한 노드 타입:
1. dataLoader - CSV 데이터를 로드 (controls: { fileName: string })
2. dataSplit - 데이터를 train/test로 분할 (controls: { test_size: number, random_state: number })
3. scaler - 데이터 스케일링 (controls: { method: "standard" | "minmax" | "robust" })
4. featureSelection - 특성 선택 (controls: { method: "variance" | "kbest" | "rfe", k: number })
5. classifier - 분류 모델 (controls: { algorithm: "logistic" | "randomForest" | "svm" | "knn" | "gradientBoosting" })
6. regressor - 회귀 모델 (controls: { algorithm: "linear" | "ridge" | "lasso" | "randomForest" | "svr" })
7. neuralNet - 신경망 (controls: { layers: string, activation: string, optimizer: string, epochs: number })
8. evaluate - 모델 평가 (controls: { metrics: string })
9. predict - 예측 수행
10. hyperparamTune - 하이퍼파라미터 튜닝 (controls: { method: "grid" | "random", cv: number })

노드 간 연결 규칙:
- dataLoader → dataSplit (output: "data" → input: "data")
- dataSplit → scaler (output: "X_train" → input: "data")
- scaler → classifier/regressor/neuralNet (output: "scaled" → input: "X_train")
- dataSplit → classifier/regressor/neuralNet (output: "y_train" → input: "y_train")
- classifier/regressor/neuralNet → evaluate (output: "model" → input: "model")
- dataSplit → evaluate (output: "X_test" → input: "X_test", output: "y_test" → input: "y_test")

응답 형식 (JSON만 출력):
{
    "nodes": [
        {
            "type": "dataLoader",
            "id": "node_1",
            "position": { "x": 100, "y": 100 },
            "controls": { "fileName": "data.csv" }
        },
        ...
    ],
    "connections": [
        {
            "source": "node_1",
            "sourceOutput": "data",
            "target": "node_2",
            "targetInput": "data"
        },
        ...
    ]
}

중요: 반드시 유효한 JSON만 출력하고, 설명이나 추가 텍스트는 포함하지 마세요.`;

    const fullPrompt = `${systemPrompt}\n\n사용자 요구사항: ${userPrompt}\n\n위 요구사항을 분석하여 적절한 ML 파이프라인 JSON을 생성하세요.`;

    try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        // JSON 추출 (코드 블록이나 추가 텍스트 제거)
        let jsonText = text.trim();
        
        // 마크다운 코드 블록 제거
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const pipeline = JSON.parse(jsonText) as GeneratedPipeline;
        
        // 기본 검증
        if (!pipeline.nodes || !Array.isArray(pipeline.nodes)) {
            throw new Error('잘못된 파이프라인 형식: nodes 배열이 없습니다.');
        }
        
        return pipeline;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        throw new Error(`파이프라인 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
