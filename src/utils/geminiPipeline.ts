// Gemini API를 사용하여 Python 코드 생성

/**
 * localStorage에서 사용자가 입력한 API 키를 가져옵니다.
 * 사용자는 UI에서 직접 Gemini API 키를 설정해야 합니다.
 */
const getApiKey = (): string | null => {
    return localStorage.getItem('gemini_api_key') || null;
};

export interface NodeGuide {
    step: number;
    nodeType: string;
    nodeName: string;
    description: string;
    reason?: string; // 이 노드를 왜 사용하는지 설명
    settings?: Record<string, any>;
    connections?: {
        from?: { step: number; output: string; input: string }[];
        to?: { step: number; output: string; input: string }[];
    };
}

export interface CodeGenerationResult {
    code: string;
    nodeGuide: NodeGuide[];
}

/**
 * Gemini API를 사용하여 사용자 프롬프트로부터 Python 코드와 노드 배치 가이드를 생성합니다.
 */
export async function generatePythonCode(userPrompt: string): Promise<CodeGenerationResult> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 머신러닝 전문가입니다. 사용자의 요구사항에 맞는 scikit-learn 기반 Python 코드를 생성하고, **초보자를 위한** 노드 기반 에디터에서 구현하기 위한 **상세한 가이드**를 제공해주세요.

**🎯 핵심 원칙**:
1. nodeName은 반드시 "영어이름 (한국어설명)" 형식으로 작성 (예: "Data Loader (데이터 로더)")
2. 노드 연결 정보를 명확히 포함
3. **소켓 이름은 초보자가 이해하기 쉬운 한국어 사용** (훈련용, 테스트용, 모델, 예측결과)
4. 각 노드에 대해 "왜 이 노드를 사용하는지" reason을 **초보자 눈높이**로 설명

**출력 형식 (반드시 JSON)**:
\`\`\`json
{
  "code": "완전한 Python 코드 (X_train, y_train, X_test, y_test 변수 사용)",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "Data Loader (데이터 로더)",
      "description": "iris.csv 파일에서 아이리스 데이터를 로드합니다.",
      "reason": "머신러닝 파이프라인의 첫 단계는 분석할 데이터를 로드하는 것입니다. 이 CSV 파일에는 아이리스 꽃의 꽃받침 길이/너비, 꽃잎 길이/너비와 품종 정보가 들어있습니다.",
      "settings": { "fileName": "iris.csv" },
      "connections": {
        "from": [],
        "to": [{ "step": 2, "output": "데이터", "input": "데이터" }]
      }
    }
  ]
}
\`\`\`

**📋 사용 가능한 노드 타입 및 정확한 소켓 이름**:

⚠️ **중요**: 소켓 이름은 아래 표시된 **정확한 영문 이름**을 사용해야 합니다!

1. **dataLoader** - "Data Loader (데이터 로더)"
   - 입력: 없음
   - 출력: **data** (정확한 이름: "data")
   - settings: { fileName: "파일명.csv" }

2. **preprocess** - "Preprocess (전처리)"
   - 입력: **data** (정확한 이름: "data")
   - 출력: **data** (정확한 이름: "data")
   - settings: { method: "fillna" | "drop_duplicates" | "drop_columns" | "rename_columns" | "encode_categorical", params: "옵션값" }
   - 💡 데이터 전처리: 결측치 처리, 중복 제거, 컬럼 삭제, 컬럼명 정리, 범주형 인코딩
   - method 옵션:
     * fillna: 결측치 채우기 (수치형=평균, 범주형=최빈값) - params 불필요
     * drop_duplicates: 중복 행 제거 - params 불필요
     * drop_columns: 특정 컬럼 삭제 - **params 필수!** 예: "id,timestamp,불필요컬럼명"
     * rename_columns: 컬럼명 정리 (소문자, 공백→언더스코어) - params 불필요
     * encode_categorical: 범주형 데이터 인코딩 (LabelEncoder) - params 불필요
   - ⚠️ **중요**: drop_columns 사용 시 반드시 settings에 params 포함: { method: "drop_columns", params: "삭제할컬럼1,삭제할컬럼2" }

3. **dataSplit** - "Data Split (데이터 분할)"
   - 입력: **data** (정확한 이름: "data")
   - 출력: **train**, **test** (정확한 이름: "train", "test")
   - settings: { ratio: 0.8, targetColumn: "컬럼명" }
   - 💡 중요: 출력은 정확히 "train"과 "test"입니다

4. **scaler** - "Scaler (정규화)"
   - 입력: **data** (정확한 이름: "data")
   - 출력: **data** (정확한 이름: "data")
   - settings: { method: "StandardScaler" 또는 "MinMaxScaler" }
   - 💡 훈련용 데이터를 정규화합니다

5. **featureSelection** - "Feature Selection (피처 선택)"
   - 입력: **data** (정확한 이름: "data")
   - 출력: **data** (정확한 이름: "data")
   - settings: { method: "SelectKBest", k: 10 }
   - 💡 훈련용 데이터에서 중요한 특성만 선택합니다

6. **classifier** - "Classifier (분류 모델)"
   - 입력: **train** (정확한 이름: "train")
   - 출력: **model** (정확한 이름: "model")
   - settings: { algorithm: "RandomForest", n_estimators: 100 }
   - 💡 훈련용 데이터로 분류 모델을 학습시킵니다

7. **regressor** - "Regressor (회귀 모델)"
   - 입력: **train** (정확한 이름: "train")
   - 출력: **model** (정확한 이름: "model")
   - settings: { algorithm: "LinearRegression" }
   - 💡 훈련용 데이터로 회귀 모델을 학습시킵니다

8. **neuralNet** - "Neural Network (신경망)"
   - 입력: **train** (정확한 이름: "train")
   - 출력: **model** (정확한 이름: "model")
   - settings: { layers: "64,32", epochs: 50 }
   - 💡 훈련용 데이터로 신경망을 학습시킵니다

9. **hyperparamTune** - "Hyperparameter Tuning (하이퍼파라미터 튜닝)"
   - 입력: **train** (정확한 이름: "train")
   - 출력: **model** (정확한 이름: "model")
   - settings: { method: "GridSearchCV" | "RandomizedSearchCV" | "BayesSearchCV", cv: 5, n_iter: 10 }
   - 💡 최적의 설정값을 찾아 모델을 학습시킵니다

10. **clustering** - "Clustering (클러스터링)"
   - 입력: **train** (정확한 이름: "train")
   - 출력: **model**, **labels** (정확한 이름: "model", "labels")
   - settings: { 
       algorithm: "KMeans" | "DBSCAN" | "AgglomerativeClustering" | "GaussianMixture",
       param1: 3,    // KMeans: n_clusters, DBSCAN: eps, Hierarchical: n_clusters, GMM: n_components
       param2: 300   // KMeans: max_iter, DBSCAN: min_samples, Hierarchical: linkage(0-2), GMM: covariance_type(0-3)
     }
   - 💡 비지도 학습으로 데이터를 여러 그룹으로 자동 분류합니다
   - ⚠️ 레이블이 없는 데이터에 사용 (targetColumn 불필요)
   - 알고리즘별 파라미터:
     * KMeans: param1=클러스터 개수, param2=최대 반복 횟수
     * DBSCAN: param1=eps(이웃 거리, 0.1~2.0), param2=min_samples(최소 샘플 수)
     * AgglomerativeClustering: param1=클러스터 개수, param2=linkage(0=ward, 1=complete, 2=average)
     * GaussianMixture: param1=구성 요소 개수, param2=covariance_type(0=full, 1=tied, 2=diag, 3=spherical)

11. **predict** - "Predict (예측)"
   - 입력: **model**, **test** (정확한 이름: "model", "test")
   - 출력: **prediction** (정확한 이름: "prediction")
   - settings: {}
   - 💡 학습된 모델로 테스트 데이터에 대한 예측을 수행합니다

12. **evaluate** - "Evaluate (모델 평가)"
   - 입력: **prediction**, **test** (정확한 이름: "prediction", "test")
   - 출력: **metrics** (정확한 이름: "metrics")
   - settings: {}
   - 💡 예측 결과의 정확도를 측정합니다

**⚠️ 소켓 연결 규칙 (매우 중요!)**:
- 모든 소켓 이름은 **정확한 영문 이름**을 사용하세요: data, train, test, model, prediction, metrics, labels
- 한글 이름(데이터, 훈련용 등)은 사용하지 마세요
- 예시: { "step": 2, "output": "data", "input": "data" } ✅
- 잘못된 예시: { "step": 2, "output": "데이터", "input": "데이터" } ❌

**완전한 예시 - 아이리스 분류 (정확한 소켓 이름 사용)**:
\`\`\`json
{
  "code": "# 필요한 라이브러리 import\\nimport pandas as pd\\nimport numpy as np\\nfrom sklearn.model_selection import train_test_split\\nfrom sklearn.preprocessing import StandardScaler\\nfrom sklearn.ensemble import RandomForestClassifier\\nfrom sklearn.metrics import accuracy_score, classification_report\\n\\n# 1. 데이터 로딩\\ndf = pd.read_csv('iris.csv')\\n\\n# 2. 데이터 분할\\nX = df.drop('species', axis=1)\\ny = df['species']\\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\\n\\n# 3. 정규화\\nscaler = StandardScaler()\\nX_train = scaler.fit_transform(X_train)\\nX_test = scaler.transform(X_test)\\n\\n# 4. 모델 훈련\\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\\nmodel.fit(X_train, y_train)\\n\\n# 5. 예측\\ny_pred = model.predict(X_test)\\n\\n# 6. 평가\\naccuracy = accuracy_score(y_test, y_pred)\\nprint(f'정확도: {accuracy:.4f}')\\nprint(classification_report(y_test, y_pred))",
  "nodeGuide": [
    {
      "step": 1,
      "nodeType": "dataLoader",
      "nodeName": "Data Loader (아이리스 데이터 로더)",
      "description": "iris.csv 파일에서 아이리스 데이터를 로드합니다.",
      "reason": "머신러닝의 첫 번째 단계는 데이터를 불러오는 것입니다. 이 CSV 파일에는 아이리스 꽃의 꽃받침 길이/너비, 꽃잎 길이/너비 측정값과 품종 정보가 들어있습니다.",
      "settings": {
        "fileName": "iris.csv"
      },
      "connections": {
        "from": [],
        "to": [
          { "step": 2, "output": "data", "input": "data" }
        ]
      }
    },
    {
      "step": 2,
      "nodeType": "dataSplit",
      "nodeName": "Data Split (데이터 분할)",
      "description": "데이터를 훈련용(80%)과 테스트용(20%)으로 나눕니다.",
      "reason": "모델이 실제로 얼마나 잘 작동하는지 확인하려면, 일부 데이터는 학습에 사용하고(훈련용), 나머지는 검증용(테스트용)으로 남겨둬야 합니다. 이렇게 하면 모델이 새로운 데이터에서도 잘 작동하는지 확인할 수 있습니다.",
      "settings": {
        "ratio": 0.8,
        "targetColumn": "species"
      },
      "connections": {
        "from": [
          { "step": 1, "output": "data", "input": "data" }
        ],
        "to": [
          { "step": 3, "output": "train", "input": "data" },
          { "step": 5, "output": "test", "input": "test" }
        ]
      }
    },
    {
      "step": 3,
      "nodeType": "scaler",
      "nodeName": "Scaler (표준 정규화)",
      "description": "StandardScaler로 데이터를 정규화합니다.",
      "reason": "꽃받침 길이(5-8cm)와 꽃잎 너비(0.1-2.5cm)처럼 값의 범위가 다르면, 큰 숫자가 더 중요해 보일 수 있습니다. 정규화는 모든 값을 같은 기준으로 맞춰서 공정하게 비교할 수 있게 만듭니다.",
      "settings": {
        "method": "StandardScaler"
      },
      "connections": {
        "from": [
          { "step": 2, "output": "train", "input": "data" }
        ],
        "to": [
          { "step": 4, "output": "data", "input": "train" }
        ]
      }
    },
    {
      "step": 4,
      "nodeType": "classifier",
      "nodeName": "Classifier (랜덤 포레스트 분류기)",
      "description": "100개의 결정 트리를 사용하는 랜덤 포레스트로 학습합니다.",
      "reason": "랜덤 포레스트는 100개의 '질문 트리'를 만들어서 투표로 결정하는 방식입니다. 한 개의 트리보다 100개가 투표하면 더 정확한 답을 얻을 수 있습니다. 마치 한 사람 의견보다 100명 의견이 더 믿을 만한 것과 같습니다.",
      "settings": {
        "algorithm": "RandomForest",
        "n_estimators": 100
      },
      "connections": {
        "from": [
          { "step": 3, "output": "data", "input": "train" }
        ],
        "to": [
          { "step": 5, "output": "model", "input": "model" }
        ]
      }
    },
    {
      "step": 5,
      "nodeType": "predict",
      "nodeName": "Predict (예측 수행)",
      "description": "학습된 모델로 테스트 데이터에 대한 예측을 수행합니다.",
      "reason": "모델이 새로운 꽃을 보고 정말 품종을 맞출 수 있는지 테스트합니다. 학습할 때 보지 못했던 데이터로 시험을 보는 것입니다.",
      "settings": {},
      "connections": {
        "from": [
          { "step": 4, "output": "model", "input": "model" },
          { "step": 2, "output": "test", "input": "test" }
        ],
        "to": [
          { "step": 6, "output": "prediction", "input": "prediction" }
        ]
      }
    },
    {
      "step": 6,
      "nodeType": "evaluate",
      "nodeName": "Evaluate (모델 평가)",
      "description": "예측 결과의 정확도를 측정하고 상세 리포트를 출력합니다.",
      "reason": "모델이 얼마나 잘 맞췄는지 점수를 매깁니다. 정확도가 95%라면 100개 중 95개를 맞췄다는 뜻입니다. 또한 어떤 품종을 잘 맞추고 못 맞추는지도 알려줍니다.",
      "settings": {},
      "connections": {
        "from": [
          { "step": 5, "output": "prediction", "input": "prediction" },
          { "step": 2, "output": "test", "input": "test" }
        ],
        "to": []
      }
    }
  ]
}
\`\`\`

**🔑 핵심 연결 규칙 (정확한 소켓 이름 사용!)**:
- dataLoader의 **data** → dataSplit의 **data**
- dataSplit의 **train** → Scaler/FeatureSelection → Classifier/Regressor/NeuralNet
- dataSplit의 **test** → Predict의 **test** / Evaluate의 **test**
- 모델 노드(Classifier/Regressor)의 **model** → Predict의 **model**
- Predict의 **prediction** → Evaluate의 **prediction**

**연결 정보 작성 방법 (정확한 소켓 이름 필수!)**:
- **from**: 이 노드의 입력 소켓에 연결될 이전 노드들
  - step: 이전 노드의 단계 번호
  - output: 이전 노드의 출력 소켓 이름 (영문: data, train, test, model, prediction)
  - input: 현재 노드의 입력 소켓 이름 (영문: data, train, test, model, prediction)
- **to**: 이 노드의 출력 소켓이 연결될 다음 노드들
  - step: 다음 노드의 단계 번호
  - output: 현재 노드의 출력 소켓 이름 (영문: data, train, test, model, prediction)
  - input: 다음 노드의 입력 소켓 이름 (영문: data, train, test, model, prediction)

**💡 가이드 작성 팁**:
- **reason 필드는 필수**: 각 노드가 왜 필요한지 초보자 눈높이로 설명 (전문 용어 최소화)
- **⚠️ 소켓 이름은 반드시 영문 사용**: data, train, test, model, prediction, metrics
- **연결은 명확하게**: from/to 모두 작성하여 사용자가 어떻게 연결해야 하는지 정확히 알 수 있도록

이제 사용자 요구사항에 맞는 Python 코드와 **초보자를 위한 상세한** 노드 가이드를 JSON 형식으로 생성해주세요.

사용자 요구사항: ${userPrompt}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 3072,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // JSON 블록 추출
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const result = JSON.parse(jsonText) as CodeGenerationResult;
        
        // 기본 검증
        if (!result.code || !result.nodeGuide) {
            throw new Error('잘못된 응답 형식입니다.');
        }
        
        return result;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        throw new Error(`코드 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

// API 키 관리 함수는 더 이상 필요하지 않음 (환경변수 사용)

/**
 * 노드 기반으로 생성된 기본 코드를 AI로 후처리하여 완전한 형태로 개선합니다.
 * @param generatedCode 노드로부터 생성된 기본 Python 코드
 * @param userIntent 사용자가 원하는 코드의 목적/의도
 * @returns AI가 개선한 완전한 Python 코드
 */
export async function enhanceCodeWithAI(generatedCode: string, userIntent: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const systemPrompt = `당신은 Python 머신러닝 코드 리팩토링 전문가입니다. 

**중요: 원본 코드의 구조와 데이터를 정확히 유지하면서 개선만 하세요!**

아래 자동 생성된 코드를 분석하고, **사용자 요구사항**에 맞춰 개선해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 원본 코드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`python
${generatedCode}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 사용자 요구사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userIntent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 개선 가이드라인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. 원본 코드 분석 (반드시 확인)**
   • CSV 파일명 추출 → 그대로 사용
   • 컬럼명 추출 (특히 target 컬럼) → 정확히 유지
   • train_test_split 비율 → 변경하지 말 것
   • 사용된 모델 → 동일한 알고리즘 유지
   • 임베드된 CSV 데이터 → 절대 삭제 금지

**2. 변수명 개선**
   • step_xxxxx_model → model 또는 regressor/classifier
   • step_xxxxx_X_train → X_train
   • step_xxxxx_prediction → y_pred
   • 의미 있고 간결한 이름으로 변경

**3. 코드 구조 개선**
   • 불필요한 import 제거
   • 중복 코드 제거
   • 명확한 섹션 구분 (주석으로)

**4. 에러 처리 (최소한)**
   • try-except는 필수적인 부분만
   • 과도한 함수 분리 금지
   • 단순하고 읽기 쉽게

**5. 시각화 추가 (사용자 요구 시)**
   • matplotlib으로 결과 플롯
   • 파일명은 사용자가 요구한 대로
   • 간단하고 명확한 차트

**6. 금지 사항 체크**
   • 사용자가 금지한 라이브러리 절대 사용 금지
   • 예: "sklearn.linear_model.LinearRegression 사용 금지" → numpy.linalg.pinv 사용
   • 원본에 없던 복잡한 기능 추가 금지

**7. 출력 파일명**
   • 사용자가 명시한 파일명 사용
   • 예: class_score_predict.png, model.pkl 등

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 출력 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Python 코드만** 출력 (설명 금지)
2. 주석은 한국어로 간결하게
3. 실행 가능한 완전한 코드
4. 마크다운 코드 블록 사용: \`\`\`python ... \`\`\`
5. 원본의 데이터 소스(CSV 임베딩 또는 파일 경로) 유지

**출력 시작**:`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.3, // 더 정확한 개선을 위해 낮춤
                    maxOutputTokens: 8192, // 더 긴 코드 허용
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // 코드 블록 추출
        text = text.trim();
        if (text.startsWith('```python')) {
            text = text.replace(/^```python\n/, '').replace(/\n```$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        return text;
    } catch (error) {
        console.error('AI 코드 개선 오류:', error);
        throw new Error(`코드 개선 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}
