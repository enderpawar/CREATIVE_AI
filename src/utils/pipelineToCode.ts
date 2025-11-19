/**
 * ML Pipeline 노드 그래프를 Python 코드로 변환
 */

export interface NodeData {
    id: string
    label: string
    kind: string
    controls?: Record<string, any>
    position: { x: number; y: number }
}

export interface ConnectionData {
    id: string
    source: string
    target: string
    sourceOutput: string
    targetInput: string
}

export interface GraphData {
    nodes: NodeData[]
    connections: ConnectionData[]
}

export class PipelineValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PipelineValidationError'
    }
}

/**
 * 파이프라인 사전 검증
 */
function validatePipelineStructure(nodes: NodeData[], connections: ConnectionData[]): void {
    // 1. DataLoader 노드 필수
    const hasDataLoader = nodes.some(n => n.kind === 'dataLoader')
    if (!hasDataLoader) {
        throw new PipelineValidationError('파이프라인에 DataLoader 노드가 필요합니다.')
    }

    // 2. 고립된 노드 검사
    const connectedNodes = new Set<string>()
    connections.forEach(conn => {
        connectedNodes.add(conn.source)
        connectedNodes.add(conn.target)
    })
    
    const orphanedNodes = nodes.filter(n => 
        n.kind !== 'dataLoader' && !connectedNodes.has(n.id)
    )
    
    if (orphanedNodes.length > 0) {
        const orphanLabels = orphanedNodes.map(n => n.label).join(', ')
        throw new PipelineValidationError(
            `연결되지 않은 노드가 있습니다: ${orphanLabels}`
        )
    }

    // 3. 기본 연결 검증
    nodes.forEach(node => {
        const incoming = connections.filter(c => c.target === node.id)
        
        // DataSplit은 데이터 입력 필요
        if (node.kind === 'dataSplit' && incoming.length === 0) {
            throw new PipelineValidationError(
                `${node.label}: 데이터를 입력해주세요.`
            )
        }
        
        // 모델 노드는 훈련 데이터 필요
        if (['classifier', 'regressor', 'neuralNet', 'hyperparamTune'].includes(node.kind || '')) {
            const hasTrain = incoming.some(c => c.targetInput === 'train')
            
            if (!hasTrain) {
                throw new PipelineValidationError(
                    `${node.label}: 훈련용 데이터를 연결해주세요.`
                )
            }
        }
        
        // Predict 노드는 모델과 테스트 데이터 필요
        if (node.kind === 'predict') {
            const hasModel = incoming.some(c => c.targetInput === 'model')
            const hasTest = incoming.some(c => c.targetInput === 'test')
            
            if (!hasModel || !hasTest) {
                throw new PipelineValidationError(
                    `${node.label}: 모델과 테스트용 데이터를 모두 연결해주세요.`
                )
            }
        }
        
        // Evaluate 노드는 예측결과와 테스트 데이터 필요
        if (node.kind === 'evaluate') {
            const hasPrediction = incoming.some(c => c.targetInput === 'prediction')
            const hasTest = incoming.some(c => c.targetInput === 'test')
            
            if (!hasPrediction || !hasTest) {
                throw new PipelineValidationError(
                    `${node.label}: 예측결과와 테스트용 데이터를 모두 연결해주세요.`
                )
            }
        }
    })
}

/**
 * 노드 그래프를 분석하여 실행 순서 결정 (Topological Sort)
 */
function topologicalSort(nodes: NodeData[], connections: ConnectionData[]): NodeData[] {
    const graph = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    
    // 그래프 초기화
    nodes.forEach(node => {
        graph.set(node.id, [])
        inDegree.set(node.id, 0)
    })
    
    // 연결 정보로 그래프 구성
    connections.forEach(conn => {
        graph.get(conn.source)?.push(conn.target)
        inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1)
    })
    
    // 진입 차수가 0인 노드들로 시작
    const queue: string[] = []
    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) queue.push(nodeId)
    })
    
    const sorted: NodeData[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    while (queue.length > 0) {
        const nodeId = queue.shift()!
        const node = nodeMap.get(nodeId)
        if (node) sorted.push(node)
        
        graph.get(nodeId)?.forEach(neighbor => {
            const degree = (inDegree.get(neighbor) || 0) - 1
            inDegree.set(neighbor, degree)
            if (degree === 0) queue.push(neighbor)
        })
    }
    
    return sorted
}

/**
 * 연결 정보를 인덱싱하여 빠른 조회 지원
 */
function indexConnections(connections: ConnectionData[]): Map<string, Map<string, ConnectionData>> {
    const index = new Map<string, Map<string, ConnectionData>>()
    
    connections.forEach(conn => {
        if (!index.has(conn.target)) {
            index.set(conn.target, new Map())
        }
        index.get(conn.target)!.set(conn.targetInput, conn)
    })
    
    return index
}

/**
 * 노드 종류에 따른 간단한 변수명 생성
 */
function getSimpleVarName(node: NodeData, nodeIndex: Map<string, number>): string {
    const kindMap: Record<string, string> = {
        'dataLoader': 'data',
        'dataSplit': 'split',
        'scaler': 'scaler',
        'featureSelection': 'selector',
        'classifier': 'model',
        'regressor': 'model',
        'neuralNet': 'nn',
        'evaluation': 'metrics',
        'tuning': 'tuner',
        'predict': 'pred',
        'evaluate': 'eval'
    }
    
    const baseName = kindMap[node.kind] || 'step'
    const index = nodeIndex.get(node.kind) || 0
    nodeIndex.set(node.kind, index + 1)
    
    return index === 0 ? baseName : `${baseName}${index + 1}`
}

/**
 * 노드를 Python 코드로 변환
 */
function nodeToCode(
    node: NodeData, 
    connectionIndex: Map<string, Map<string, ConnectionData>>,
    nodeMap: Map<string, NodeData>, 
    varName: string,
    varNameMap: Map<string, string>,
    logicId?: string
): string {
    
    // Helper: 연결된 소스 노드의 변수명 가져오기
    const getSourceVarName = (inputKey: string): string => {
        const conn = connectionIndex.get(node.id)?.get(inputKey)
        if (!conn) return 'data'
        return varNameMap.get(conn.source) || 'data'
    }
    
    // Helper: 연결 확인
    const getConnection = (inputKey: string): ConnectionData | undefined => {
        return connectionIndex.get(node.id)?.get(inputKey)
    }
    
    switch (node.kind) {
        case 'dataLoader': {
            // exportGraph는 이미 .value를 추출해서 controls에 저장함
            const fileName = node.controls?.fileName || 'data.csv'
            
            // localStorage에서 실제 CSV 데이터 확인 (로직별로 분리된 데이터 사용)
            const storageKey = logicId ? `csv_data_${logicId}_${fileName}` : `csv_data_global_${fileName}`
            const storedData = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
            
            if (storedData) {
                // 실제 업로드된 CSV 데이터를 Base64로 인코딩하여 포함
                const base64Content = typeof btoa !== 'undefined' 
                    ? btoa(unescape(encodeURIComponent(storedData)))
                    : Buffer.from(storedData).toString('base64')
                
                return `# Load Data from uploaded CSV: ${fileName}
import io
import base64

# Embedded CSV data (uploaded from browser)
csv_content = base64.b64decode('${base64Content}').decode('utf-8')
${varName} = pd.read_csv(io.StringIO(csv_content))

print(f"Data loaded from ${fileName}: {${varName}.shape}")
print(f"Columns: {${varName}.columns.tolist()}")
print("First 5 rows:")
print(${varName}.head())`
            } else {
                // 파일 경로만 있는 경우 (기존 방식)
                return `# Load Data from file
${varName} = pd.read_csv('${fileName}')

print(f"Data loaded: {${varName}.shape}")
print(f"Columns: {${varName}.columns.tolist()}")
print("First 5 rows:")
print(${varName}.head())`
            }
        }
        
        case 'dataSplit': {
            const ratio = node.controls?.ratio || 0.8
            const targetColumn = node.controls?.targetColumn || 'target'
            const sourceVar = getSourceVarName('data')
            
            return `# 훈련/테스트 데이터 분할
# 목표 변수: '${targetColumn}'
if '${targetColumn}' not in ${sourceVar}.columns:
    raise ValueError(f"❌ 타겟 컬럼 '{targetColumn}'이(가) 데이터에 없습니다.\\n사용 가능한 컬럼: {${sourceVar}.columns.tolist()}")

X = ${sourceVar}.drop('${targetColumn}', axis=1)
y = ${sourceVar}['${targetColumn}']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=${(1 - ratio).toFixed(2)}, random_state=42
)

# 모든 클래스 저장 (평가 시 사용)
import numpy as np
all_classes = np.unique(y)

print(f"훈련 데이터: {len(X_train)}개, 테스트 데이터: {len(X_test)}개")
print(f"목표 변수: '${targetColumn}'")
print(f"클래스: {all_classes.tolist()}")`
        }
        
        case 'scaler': {
            const method = node.controls?.method || 'StandardScaler'
            
            return `# 데이터 스케일링 (${method})
${varName} = ${method}()
X_train_scaled = ${varName}.fit_transform(X_train)
X_test_scaled = ${varName}.transform(X_test)
print("${method}로 스케일링 완료")
print(f"훈련 데이터 크기: {X_train_scaled.shape}")

# 변수 업데이트
X_train = X_train_scaled
X_test = X_test_scaled`
        }
        
        case 'preprocess': {
            const method = node.controls?.method?.value || node.controls?.method || 'fillna'
            const params = node.controls?.params || ''
            const sourceVar = getSourceVarName('data')
            
            let code = ''
            switch(method) {
                case 'fillna':
                    code = `# 전처리 - 결측치 처리 (수치형: 평균값, 범주형: 최빈값)
${varName} = ${sourceVar}.copy()
# 수치형 컬럼 결측치 평균으로 채우기
numeric_cols = ${varName}.select_dtypes(include=['number']).columns
${varName}[numeric_cols] = ${varName}[numeric_cols].fillna(${varName}[numeric_cols].mean())
# 범주형 컬럼 결측치 최빈값으로 채우기
categorical_cols = ${varName}.select_dtypes(include=['object']).columns
for col in categorical_cols:
    ${varName}[col] = ${varName}[col].fillna(${varName}[col].mode()[0] if not ${varName}[col].mode().empty else 'Unknown')
print(f"결측치 처리 완료: {${varName}.shape}")`
                    break
                case 'drop_duplicates':
                    code = `# 전처리 - 중복 행 제거
${varName} = ${sourceVar}.drop_duplicates().reset_index(drop=True)
print(f"중복 제거 완료: {${sourceVar}.shape} → {${varName}.shape}")`
                    break
                case 'drop_columns': {
                    const colsToDrop = params ? params.split(',').map((c: string) => c.trim()) : []
                    if (colsToDrop.length > 0) {
                        code = `# 전처리 - 특정 컬럼 삭제
columns_to_drop = ${JSON.stringify(colsToDrop)}
${varName} = ${sourceVar}.drop(columns=[col for col in columns_to_drop if col in ${sourceVar}.columns])
print(f"컬럼 삭제 완료: {${sourceVar}.shape} → {${varName}.shape}")`
                    } else {
                        code = `# 전처리 - 특정 컬럼 삭제 (파라미터 미지정)
${varName} = ${sourceVar}.copy()
print("⚠️ 삭제할 컬럼을 파라미터에 지정하세요 (예: col1,col2)")`
                    }
                    break
                }
                case 'rename_columns':
                    code = `# 전처리 - 컬럼명 정리 (소문자, 공백→언더스코어)
${varName} = ${sourceVar}.copy()
${varName}.columns = ${varName}.columns.str.strip()
${varName}.columns = ${varName}.columns.str.lower().str.replace(' ', '_').str.replace('[^a-z0-9_]', '', regex=True)
print(f"컬럼명 정리 완료")
print(f"정리된 컬럼: {${varName}.columns.tolist()}")`
                    break
                case 'encode_categorical':
                    code = `# 전처리 - 범주형 데이터 인코딩 (Label Encoding)
from sklearn.preprocessing import LabelEncoder
${varName} = ${sourceVar}.copy()
categorical_cols = ${varName}.select_dtypes(include=['object']).columns
encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    ${varName}[col] = le.fit_transform(${varName}[col].astype(str))
    encoders[col] = le
print(f"범주형 인코딩 완료: {len(categorical_cols)}개 컬럼")
print(f"인코딩된 컬럼: {list(categorical_cols)}")`
                    break
                default:
                    code = `# 전처리 (${method})
${varName} = ${sourceVar}.copy()`
            }
            
            return code
        }
        
        case 'featureSelection': {
            const method = node.controls?.method?.value || node.controls?.method || 'SelectKBest'
            const k = node.controls?.k || 10
            
            let code = ''
            switch(method) {
                case 'SelectKBest':
                    code = `# 특성 선택 - SelectKBest (점수 기반 상위 k개)
# 각 특징을 통계적 점수로 평가하여 상위 k개 선택
${varName} = SelectKBest(score_func=f_classif, k=${k})
X_train_selected = ${varName}.fit_transform(X_train, y_train)
X_test_selected = ${varName}.transform(X_test)
print(f"SelectKBest: {X_train.shape[1]}개 특징 중 {${k}}개 선택")
print(f"선택된 특징 인덱스: {${varName}.get_support(indices=True)}")`
                    break
                case 'RFE':
                    code = `# 특성 선택 - RFE (재귀적 특징 제거)
# 재귀적으로 특징을 제거하며 가장 중요한 n개 선택
estimator = RandomForestClassifier(n_estimators=10, random_state=42)
${varName} = RFE(estimator, n_features_to_select=${k}, step=1)
X_train_selected = ${varName}.fit_transform(X_train, y_train)
X_test_selected = ${varName}.transform(X_test)
print(f"RFE: {X_train.shape[1]}개 특징 중 {${k}}개 선택")
print(f"선택된 특징 인덱스: {${varName}.get_support(indices=True)}")
print(f"특징 순위: {${varName}.ranking_}")`
                    break
                case 'SelectFromModel':
                    code = `# 특성 선택 - SelectFromModel (모델 기반 중요도)
# 학습된 모델에서 중요도가 평균 이상인 특징만 선택
estimator = RandomForestClassifier(n_estimators=100, random_state=42)
${varName} = SelectFromModel(estimator, threshold='mean')
X_train_selected = ${varName}.fit_transform(X_train, y_train)
X_test_selected = ${varName}.transform(X_test)
print(f"SelectFromModel: {X_train.shape[1]}개 특징 중 {${varName}.get_support().sum()}개 선택")
print(f"선택된 특징 인덱스: {${varName}.get_support(indices=True)}")
print(f"임계값: {${varName}.threshold_}")`
                    break
                case 'VarianceThreshold':
                    code = `# 특성 선택 - VarianceThreshold (분산 임계값)
# 분산이 임계값 이하인 특징 제거 (값이 거의 변하지 않는 특징 제거)
${varName} = VarianceThreshold(threshold=0.0)
X_train_selected = ${varName}.fit_transform(X_train)
X_test_selected = ${varName}.transform(X_test)
print(f"VarianceThreshold: {X_train.shape[1]}개 특징 중 {X_train_selected.shape[1]}개 선택")
print(f"제거된 분산이 0인 특징들")
print(f"각 특징의 분산: {${varName}.variances_}")`
                    break
                case 'SelectPercentile':
                    code = `# 특성 선택 - SelectPercentile (상위 백분위)
# 점수 기반으로 상위 백분위 특징 선택
${varName} = SelectPercentile(score_func=f_classif, percentile=${k})
X_train_selected = ${varName}.fit_transform(X_train, y_train)
X_test_selected = ${varName}.transform(X_test)
print(f"SelectPercentile({k}%): {X_train.shape[1]}개 특징 중 {X_train_selected.shape[1]}개 선택")
print(f"선택된 특징 인덱스: {${varName}.get_support(indices=True)}")`
                    break
                default:
                    code = `# 특성 선택 (${method})
${varName} = ${method}(k=${k})
X_train_selected = ${varName}.fit_transform(X_train, y_train)
X_test_selected = ${varName}.transform(X_test)
print(f"{X_train.shape[1]}개 특징 중 {k}개 선택")`
            }
            
            return code + `

# 변수 업데이트
X_train = X_train_selected
X_test = X_test_selected`
        }
        
        case 'classifier': {
            const algorithm = node.controls?.algorithm || 'RandomForest'
            const nEstimators = node.controls?.n_estimators || 100
            
            let modelCode = ''
            if (algorithm === 'RandomForest') {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            } else if (algorithm === 'LogisticRegression') {
                modelCode = `LogisticRegression(random_state=42, max_iter=1000)`
            } else if (algorithm === 'SVM') {
                modelCode = `SVC(random_state=42)`
            } else if (algorithm === 'DecisionTree') {
                modelCode = `DecisionTreeClassifier(random_state=42)`
            } else if (algorithm === 'KNN') {
                modelCode = `KNeighborsClassifier(n_neighbors=5)`
            } else if (algorithm === 'GradientBoosting') {
                modelCode = `GradientBoostingClassifier(n_estimators=${nEstimators}, random_state=42)`
            } else {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            }
            
            return `# 모델 훈련 (${algorithm})
${varName} = ${modelCode}
${varName}.fit(X_train, y_train)
print("모델 훈련 완료: ${algorithm}")
print(f"훈련 정확도: {${varName}.score(X_train, y_train):.4f}")`
        }
        
        case 'regressor': {
            const algorithm = node.controls?.algorithm || 'LinearRegression'
            
            let modelCode = ''
            if (algorithm === 'LinearRegression') {
                modelCode = `LinearRegression()`
            } else if (algorithm === 'Ridge') {
                modelCode = `Ridge(random_state=42)`
            } else if (algorithm === 'Lasso') {
                modelCode = `Lasso(random_state=42)`
            } else if (algorithm === 'RandomForestRegressor') {
                modelCode = `RandomForestRegressor(random_state=42)`
            } else if (algorithm === 'SVR') {
                modelCode = `SVR()`
            } else if (algorithm === 'GradientBoostingRegressor') {
                modelCode = `GradientBoostingRegressor(random_state=42)`
            } else {
                modelCode = `LinearRegression()`
            }
            
            return `# 모델 훈련 (${algorithm})
${varName} = ${modelCode}
${varName}.fit(X_train, y_train)
print("모델 훈련 완료: ${algorithm}")
print(f"훈련 R² 점수: {${varName}.score(X_train, y_train):.4f}")`
        }
        
        case 'neuralNet': {
            const layers = node.controls?.layers || '64,32'
            const epochs = node.controls?.epochs || 50
            
            return `# 신경망 모델 훈련
${varName} = MLPClassifier(hidden_layer_sizes=(${layers}), max_iter=${epochs}, random_state=42)
${varName}.fit(X_train, y_train)
print("신경망 훈련 완료: [${layers}] 레이어")
print(f"훈련 정확도: {${varName}.score(X_train, y_train):.4f}")`
        }
        
        case 'evaluate': {
            // v4.0 단순화: 'test' 소켓 이름 사용
            const testConn = getConnection('test')
            const predictionConn = getConnection('prediction')
            
            const hasPrediction = !!predictionConn
            const hasTest = !!testConn
            
            if (!hasTest) {
                return `# ⚠️ Warning: Test data not connected to evaluate node\nprint("⚠️ 경고: 테스트용 데이터가 연결되지 않았습니다")`
            }
            
            if (!hasPrediction) {
                return `# ⚠️ Warning: No predictions connected to evaluate\nprint("⚠️ 경고: 예측 결과가 연결되지 않았습니다")`
            }
            
            // 모델 종류 확인 (회귀 vs 분류) - prediction의 source 노드 추적
            let isRegression = false
            if (predictionConn) {
                // Predict 노드를 찾고, 그 노드가 받는 model의 source를 추적
                const predictNode = nodeMap.get(predictionConn.source)
                if (predictNode) {
                    const predictModelConn = connectionIndex.get(predictNode.id)?.get('model')
                    if (predictModelConn) {
                        const modelNode = nodeMap.get(predictModelConn.source)
                        isRegression = modelNode?.kind === 'regressor'
                    }
                }
            }
            
            let evaluationCode = ''
            
            // v4.0에서는 항상 prediction을 통해 평가 (predict 노드 필수)
            if (isRegression) {
                evaluationCode = `# 모델 평가 (회귀)\nfrom sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error\nimport numpy as np\nmse = mean_squared_error(y_test, y_pred)\nrmse = np.sqrt(mse)\nmae = mean_absolute_error(y_test, y_pred)\nr2 = r2_score(y_test, y_pred)\nprint(f"Mean Squared Error (MSE): {mse:.4f}")\nprint(f"Root Mean Squared Error (RMSE): {rmse:.4f}")\nprint(f"Mean Absolute Error (MAE): {mae:.4f}")\nprint(f"R² Score: {r2:.4f}")`
            } else {
                evaluationCode = `# 모델 평가 (분류)\naccuracy = accuracy_score(y_test, y_pred)\nprint(f"Accuracy: {accuracy:.4f}")\nprint("\\nClassification Report:")\n# Data Split에서 저장된 모든 클래스 사용 (경고 방지)\nprint(classification_report(y_test, y_pred, labels=all_classes, zero_division=0))\nprint("\\nConfusion Matrix:")\nprint(confusion_matrix(y_test, y_pred, labels=all_classes))`
            }
            
            return evaluationCode
        }
        
        case 'predict': {
            // v4.0 단순화: 'model', 'test' 소켓 사용
            const modelConn = getConnection('model')
            const testConn = getConnection('test')
            
            if (!modelConn) {
                return `# TODO: 모델을 연결해주세요
y_pred = None
print("⚠️ 경고: 모델이 연결되지 않음")`
            }
            
            if (!testConn) {
                return `# TODO: 테스트용 데이터를 연결해주세요
y_pred = None
print("⚠️ 경고: 테스트 데이터가 연결되지 않음")`
            }
            
            const modelVar = varNameMap.get(modelConn.source) || 'model'
            
            return `# 예측 수행
y_pred = ${modelVar}.predict(X_test)
print(f"예측 완료: {len(y_pred)}개 샘플")
print(f"처음 10개 예측: {y_pred[:10]}")`
        }
        
        case 'hyperparamTune': {
            const method = node.controls?.method?.value || node.controls?.method || 'GridSearchCV'
            const cv = node.controls?.cv || 5
            const n_iter = node.controls?.n_iter || 10
            
            let code = ''
            const paramGrid = `{
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, 30],
    'min_samples_split': [2, 5, 10]
}`
            
            switch(method) {
                case 'GridSearchCV':
                    code = `# 하이퍼파라미터 튜닝 - GridSearchCV (격자 탐색)
# 모든 파라미터 조합을 체계적으로 탐색
param_grid = ${paramGrid}
${varName} = GridSearchCV(
    RandomForestClassifier(random_state=42), 
    param_grid, 
    cv=${cv},
    n_jobs=-1,  # 모든 CPU 코어 사용
    verbose=1
)
${varName}.fit(X_train, y_train)
best_model = ${varName}.best_estimator_
print(f"최적 파라미터: {${varName}.best_params_}")
print(f"최고 교차검증 점수: {${varName}.best_score_:.4f}")`
                    break
                    
                case 'RandomizedSearchCV':
                    code = `# 하이퍼파라미터 튜닝 - RandomizedSearchCV (랜덤 탐색)
param_distributions = ${paramGrid}
${varName} = RandomizedSearchCV(
    RandomForestClassifier(random_state=42),
    param_distributions,
    n_iter=${n_iter},
    cv=${cv},
    random_state=42,
    verbose=1
)
${varName}.fit(X_train, y_train)
best_model = ${varName}.best_estimator_
print(f"최적 파라미터: {${varName}.best_params_}")
print(f"최고 교차검증 점수: {${varName}.best_score_:.4f}")`
                    break
                    
                case 'BayesSearchCV':
                    code = `# 하이퍼파라미터 튜닝 - BayesSearchCV (베이지안 최적화)
# 주의: scikit-optimize 설치 필요 (pip install scikit-optimize)
try:
    search_spaces = {
        'n_estimators': (50, 200),
        'max_depth': (10, 30),
        'min_samples_split': (2, 10)
    }
    ${varName} = BayesSearchCV(
        RandomForestClassifier(random_state=42),
        search_spaces,
        n_iter=${n_iter},
        cv=${cv},
        random_state=42,
        verbose=1
    )
    ${varName}.fit(X_train, y_train)
    best_model = ${varName}.best_estimator_
    print(f"최적 파라미터: {${varName}.best_params_}")
    print(f"최고 교차검증 점수: {${varName}.best_score_:.4f}")
except ImportError:
    print("BayesSearchCV를 사용하려면 scikit-optimize를 설치해야 합니다.")
    print("설치: pip install scikit-optimize")
    # Fallback to GridSearchCV
    param_grid = ${paramGrid}
    ${varName} = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=${cv})
    ${varName}.fit(X_train, y_train)
    best_model = ${varName}.best_estimator_`
                    break
                    
                default:
                    code = `# 하이퍼파라미터 튜닝
param_grid = ${paramGrid}
grid_search = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5)
grid_search.fit(X_train, y_train)
${varName} = grid_search.best_estimator_
print(f"최적 파라미터: {grid_search.best_params_}")
print(f"최고 점수: {grid_search.best_score_:.4f}")`
            }
            
            return code
        }
        
        default:
            return `# Unknown node type: ${node.kind}`
    }
}

/**
 * 필요한 import 문 생성
 */
function generateImports(nodes: NodeData[]): string {
    const imports = new Set<string>()
    
    imports.add('import pandas as pd')
    imports.add('import numpy as np')
    
    nodes.forEach(node => {
        switch (node.kind) {
            case 'dataSplit':
                imports.add('from sklearn.model_selection import train_test_split')
                break
            case 'scaler':
                imports.add('from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler')
                break
            case 'featureSelection': {
                const fsMethod = node.controls?.method?.value || node.controls?.method || 'SelectKBest'
                if (fsMethod === 'SelectKBest') {
                    imports.add('from sklearn.feature_selection import SelectKBest, f_classif')
                } else if (fsMethod === 'RFE') {
                    imports.add('from sklearn.feature_selection import RFE')
                    imports.add('from sklearn.ensemble import RandomForestClassifier')
                } else if (fsMethod === 'SelectFromModel') {
                    imports.add('from sklearn.feature_selection import SelectFromModel')
                    imports.add('from sklearn.ensemble import RandomForestClassifier')
                } else if (fsMethod === 'VarianceThreshold') {
                    imports.add('from sklearn.feature_selection import VarianceThreshold')
                } else if (fsMethod === 'SelectPercentile') {
                    imports.add('from sklearn.feature_selection import SelectPercentile, f_classif')
                } else {
                    imports.add('from sklearn.feature_selection import SelectKBest, RFE, SelectFromModel, VarianceThreshold, SelectPercentile')
                    imports.add('from sklearn.ensemble import RandomForestClassifier')
                }
                break
            }
            case 'classifier':
                imports.add('from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier')
                imports.add('from sklearn.linear_model import LogisticRegression')
                imports.add('from sklearn.svm import SVC')
                imports.add('from sklearn.tree import DecisionTreeClassifier')
                imports.add('from sklearn.neighbors import KNeighborsClassifier')
                break
            case 'regressor':
                imports.add('from sklearn.linear_model import LinearRegression, Ridge, Lasso')
                imports.add('from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor')
                imports.add('from sklearn.svm import SVR')
                break
            case 'neuralNet':
                imports.add('from sklearn.neural_network import MLPClassifier')
                break
            case 'evaluate':
                imports.add('from sklearn.metrics import accuracy_score, classification_report, confusion_matrix')
                break
            case 'hyperparamTune': {
                const htMethod = node.controls?.method?.value || node.controls?.method || 'GridSearchCV'
                imports.add('from sklearn.ensemble import RandomForestClassifier')
                if (htMethod === 'GridSearchCV') {
                    imports.add('from sklearn.model_selection import GridSearchCV')
                } else if (htMethod === 'RandomizedSearchCV') {
                    imports.add('from sklearn.model_selection import RandomizedSearchCV')
                } else if (htMethod === 'BayesSearchCV') {
                    imports.add('# from skopt import BayesSearchCV  # pip install scikit-optimize')
                    imports.add('from sklearn.model_selection import GridSearchCV')
                } else {
                    imports.add('from sklearn.model_selection import GridSearchCV, RandomizedSearchCV')
                }
                break
            }
        }
    })
    
    return Array.from(imports).join('\n')
}

/**
 * 전체 파이프라인을 Python 코드로 변환
 */
export function generatePythonCode(graph: GraphData, logicId?: string): string {
    if (!graph.nodes || graph.nodes.length === 0) {
        throw new PipelineValidationError('파이프라인에 노드가 없습니다.')
    }
    
    // ML 노드만 필터링
    const mlNodes = graph.nodes.filter(n => 
        ['dataLoader', 'preprocess', 'dataSplit', 'scaler', 'featureSelection', 
         'classifier', 'regressor', 'neuralNet', 'evaluate', 
         'predict', 'hyperparamTune'].includes(n.kind)
    )
    
    if (mlNodes.length === 0) {
        throw new PipelineValidationError('파이프라인에 ML 노드가 없습니다.')
    }
    
    // ✅ 파이프라인 구조 검증
    validatePipelineStructure(mlNodes, graph.connections)
    
    // 노드 실행 순서 결정
    const sortedNodes = topologicalSort(mlNodes, graph.connections)
    const nodeMap = new Map(mlNodes.map(n => [n.id, n]))
    
    // 연결 인덱스 생성 (빠른 조회)
    const connectionIndex = indexConnections(graph.connections)
    
    // 변수명 맵 생성 (간단한 이름 부여)
    const varNameMap = new Map<string, string>()
    const nodeIndex = new Map<string, number>()
    
    sortedNodes.forEach(node => {
        const varName = getSimpleVarName(node, nodeIndex)
        varNameMap.set(node.id, varName)
    })
    
    // Import 문 생성
    const imports = generateImports(mlNodes)
    
    // 각 노드를 코드로 변환
    const codeBlocks = sortedNodes.map(node => {
        const varName = varNameMap.get(node.id) || 'data'
        return nodeToCode(node, connectionIndex, nodeMap, varName, varNameMap, logicId)
    })
    
    // 전체 코드 조립
    return `${imports}

# ========================================
# ML Pipeline Auto-Generated Code
# ========================================

${codeBlocks.join('\n\n')}

# ========================================
# Pipeline Complete!
# ========================================
`
}

/**
 * Jupyter Notebook JSON 생성
 */
export function generateJupyterNotebook(graph: GraphData, pipelineName: string = 'ML Pipeline', logicId?: string): string {
    const pythonCode = generatePythonCode(graph, logicId)
    
    // 코드를 논리적 섹션으로 분할
    const sections = pythonCode.split('\n\n')
    
    const cells = [
        {
            cell_type: 'markdown',
            metadata: {},
            source: [
                `# ${pipelineName}\n`,
                '\n',
                'This notebook was auto-generated from a visual ML pipeline builder.\n',
                '\n',
                `Generated on: ${new Date().toLocaleString('ko-KR')}\n`
            ]
        },
        ...sections.map(section => ({
            cell_type: 'code',
            execution_count: null,
            metadata: {},
            outputs: [],
            source: section.split('\n').map(line => line + '\n')
        }))
    ]
    
    const notebook = {
        cells,
        metadata: {
            kernelspec: {
                display_name: 'Python 3',
                language: 'python',
                name: 'python3'
            },
            language_info: {
                name: 'python',
                version: '3.8.0'
            }
        },
        nbformat: 4,
        nbformat_minor: 4
    }
    
    return JSON.stringify(notebook, null, 2)
}

/**
 * Python 스크립트 파일 생성 (.py)
 */
export function generatePythonScript(graph: GraphData, pipelineName: string = 'ML Pipeline', logicId?: string): string {
    const pythonCode = generatePythonCode(graph, logicId)
    
    const header = `"""
${pipelineName}

Auto-generated ML Pipeline Script
Generated on: ${new Date().toLocaleString('ko-KR')}

This script was created from a visual ML pipeline builder.
"""

`
    
    return header + pythonCode
}
