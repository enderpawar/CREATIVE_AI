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
 * 노드를 Python 코드로 변환
 */
function nodeToCode(node: NodeData, connections: ConnectionData[], _nodeMap: Map<string, NodeData>): string {
    const varName = `step_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`
    
    switch (node.kind) {
        case 'dataLoader': {
            // exportGraph는 이미 .value를 추출해서 controls에 저장함
            const fileName = node.controls?.fileName || 'data.csv'
            
            // localStorage에서 실제 CSV 데이터 확인
            const storedData = typeof window !== 'undefined' ? localStorage.getItem(`csv_data_${fileName}`) : null
            
            if (storedData) {
                // 실제 업로드된 CSV 데이터를 Base64로 인코딩하여 포함
                const base64Content = typeof btoa !== 'undefined' 
                    ? btoa(unescape(encodeURIComponent(storedData)))
                    : Buffer.from(storedData).toString('base64')
                
                return `# Load Data from uploaded CSV: ${fileName}
import io
import base64

# Embedded CSV data (uploaded from browser)
csv_content_${varName} = base64.b64decode('${base64Content}').decode('utf-8')
${varName} = pd.read_csv(io.StringIO(csv_content_${varName}))
print(f"Data loaded from ${fileName}: {${varName}.shape}")
print("\\nFirst 5 rows:")
print(${varName}.head())`
            } else {
                // 파일 경로만 있는 경우 (기존 방식)
                return `# Load Data from file
${varName} = pd.read_csv('${fileName}')
print(f"Data loaded: {${varName}.shape}")
print("\\nFirst 5 rows:")
print(${varName}.head())`
            }
        }
        
        case 'dataSplit': {
            const ratio = node.controls?.ratio || 0.8
            const targetColumn = node.controls?.targetColumn || 'target'
            const inputConn = connections.find(c => c.target === node.id && c.targetInput === 'data')
            const sourceVar = inputConn ? `step_${inputConn.source.replace(/[^a-zA-Z0-9]/g, '_')}` : 'df'
            
            // 각 출력에 명확한 변수명 부여
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
            
            return `# Train/Test Split
# Target column: '${targetColumn}'
X = ${sourceVar}.drop('${targetColumn}', axis=1)
y = ${sourceVar}['${targetColumn}']
step_${nodeId}_X_train, step_${nodeId}_X_test, step_${nodeId}_y_train, step_${nodeId}_y_test = train_test_split(
    X, y, test_size=${(1 - ratio).toFixed(2)}, random_state=42
)
print(f"Train size: {{len(step_${nodeId}_X_train)}}, Test size: {{len(step_${nodeId}_X_test)}}")
print(f"Target column: '${targetColumn}'")`
        }
        
        case 'scaler': {
            const method = node.controls?.method || 'StandardScaler'
            
            // 입력 연결 찾기 - data 입력은 보통 X_train 또는 X_test를 받음
            const inputConn = connections.find(c => c.target === node.id && c.targetInput === 'data')
            
            if (!inputConn) {
                return `# WARNING: Scaler has no input connection
${varName} = ${method}()
# Please connect a data source to this scaler node`
            }
            
            const sourceNodeId = inputConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const sourceOutput = inputConn.sourceOutput // 예: 'X_train', 'X_test', 'scaled' 등
            
            // 소스 변수명 결정
            let sourceVar = `step_${sourceNodeId}_${sourceOutput}`
            
            return `# Scale Features
${varName} = ${method}()
${varName}_scaled = ${varName}.fit_transform(${sourceVar})
print("Features scaled using ${method}")
print(f"Scaled data shape: {${varName}_scaled.shape}")`
        }
        
        case 'featureSelection': {
            const method = node.controls?.method || 'SelectKBest'
            const k = node.controls?.k || 10
            
            // 입력 연결 찾기
            const inputConn = connections.find(c => c.target === node.id && c.targetInput === 'data')
            
            if (!inputConn) {
                return `# WARNING: FeatureSelection has no input connection
# Please connect data to this feature selection node`
            }
            
            const sourceNodeId = inputConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const sourceOutput = inputConn.sourceOutput
            const sourceVar = `step_${sourceNodeId}_${sourceOutput}`
            
            return `# Feature Selection
${varName} = ${method}(k=${k})
${varName}_selected = ${varName}.fit_transform(${sourceVar}, y_train)
print(f"Selected {k} best features from {${sourceVar}.shape[1]} features")`
        }
        
        case 'classifier': {
            const algorithm = node.controls?.algorithm || 'RandomForest'
            const nEstimators = node.controls?.n_estimators || 100
            
            // 입력 연결 찾기 (X_train과 y_train)
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this classifier node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            let modelCode = ''
            if (algorithm === 'RandomForest') {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            } else if (algorithm === 'LogisticRegression') {
                modelCode = `LogisticRegression(random_state=42)`
            } else if (algorithm === 'SVM') {
                modelCode = `SVC(random_state=42)`
            } else {
                modelCode = `RandomForestClassifier(n_estimators=${nEstimators}, random_state=42)`
            }
            
            return `# Train Classifier
${varName} = ${modelCode}
${varName}.fit(${xTrainVar}, ${yTrainVar})
print("Model trained: ${algorithm}")
print(f"Training score: {${varName}.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'regressor': {
            const algorithm = node.controls?.algorithm || 'LinearRegression'
            
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this regressor node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            let modelCode = ''
            if (algorithm === 'LinearRegression') {
                modelCode = `LinearRegression()`
            } else if (algorithm === 'Ridge') {
                modelCode = `Ridge(random_state=42)`
            } else if (algorithm === 'RandomForest') {
                modelCode = `RandomForestRegressor(random_state=42)`
            } else {
                modelCode = `LinearRegression()`
            }
            
            return `# Train Regressor
${varName} = ${modelCode}
${varName}.fit(${xTrainVar}, ${yTrainVar})
print("Model trained: ${algorithm}")
print(f"Training R² score: {${varName}.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'neuralNet': {
            const layers = node.controls?.layers || '64,32'
            const epochs = node.controls?.epochs || 50
            
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this neural network node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            return `# Train Neural Network
${varName} = MLPClassifier(hidden_layer_sizes=(${layers}), max_iter=${epochs}, random_state=42)
${varName}.fit(${xTrainVar}, ${yTrainVar})
print("Neural Network trained with layers: [${layers}]")
print(f"Training score: {${varName}.score(${xTrainVar}, ${yTrainVar}):.4f}")`
        }
        
        case 'evaluate': {
            // 입력 연결 찾기
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const xTestConn = connections.find(c => c.target === node.id && c.targetInput === 'X_test')
            const yTestConn = connections.find(c => c.target === node.id && c.targetInput === 'y_test')
            
            // 연결이 없으면 경고
            if (!modelConn || !xTestConn || !yTestConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!modelConn) warnings += '#   - model input not connected\n'
                if (!xTestConn) warnings += '#   - X_test input not connected\n'
                if (!yTestConn) warnings += '#   - y_test input not connected\n'
                return warnings + '# Please connect model and test data to this evaluate node'
            }
            
            const modelSourceId = modelConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTestSourceId = xTestConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTestSourceId = yTestConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            
            const modelVar = `step_${modelSourceId}`
            const xTestVar = `step_${xTestSourceId}_${xTestConn.sourceOutput}`
            const yTestVar = `step_${yTestSourceId}_${yTestConn.sourceOutput}`
            
            return `# Evaluate Model
y_pred = ${modelVar}.predict(${xTestVar})
accuracy = accuracy_score(${yTestVar}, y_pred)
print(f"Accuracy: {accuracy:.4f}")
print("\\nClassification Report:")
print(classification_report(${yTestVar}, y_pred))
print("\\nConfusion Matrix:")
print(confusion_matrix(${yTestVar}, y_pred))`
        }
        
        case 'predict': {
            // 입력 연결 찾기
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const dataConn = connections.find(c => c.target === node.id && c.targetInput === 'data')
            
            // 연결이 없으면 경고
            if (!modelConn || !dataConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!modelConn) warnings += '#   - model input not connected\n'
                if (!dataConn) warnings += '#   - data input not connected\n'
                return warnings + '# Please connect model and data to this predict node'
            }
            
            const modelSourceId = modelConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const dataSourceId = dataConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            
            const modelVar = `step_${modelSourceId}`
            const dataVar = `step_${dataSourceId}_${dataConn.sourceOutput}`
            
            return `# Make Predictions
${varName} = ${modelVar}.predict(${dataVar})
print(f"Predictions made: {len(${varName})} samples")
print(f"First 10 predictions: {${varName}[:10]}")`
        }
        
        case 'hyperparamTune': {
            // 입력 연결 찾기
            const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
            const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
            
            // 연결이 없으면 경고
            if (!xTrainConn || !yTrainConn) {
                let warnings = '# WARNING: Missing required connections!\n'
                if (!xTrainConn) warnings += '#   - X_train input not connected\n'
                if (!yTrainConn) warnings += '#   - y_train input not connected\n'
                return warnings + '# Please connect training data to this hyperparameter tuning node'
            }
            
            const xTrainSourceId = xTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const yTrainSourceId = yTrainConn.source.replace(/[^a-zA-Z0-9]/g, '_')
            const xTrainOutput = xTrainConn.sourceOutput
            const yTrainOutput = yTrainConn.sourceOutput
            
            const xTrainVar = `step_${xTrainSourceId}_${xTrainOutput}`
            const yTrainVar = `step_${yTrainSourceId}_${yTrainOutput}`
            
            return `# Hyperparameter Tuning
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, 30]
}
${varName} = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5)
${varName}.fit(${xTrainVar}, ${yTrainVar})
print(f"Best parameters: {${varName}.best_params_}")
print(f"Best score: {${varName}.best_score_:.4f}")`
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
    
    // dataLoader에서 CSV embedding 사용 시 필요
    const hasDataLoader = nodes.some(n => n.kind === 'dataLoader')
    if (hasDataLoader) {
        imports.add('import io')
        imports.add('import base64')
    }
    
    nodes.forEach(node => {
        switch (node.kind) {
            case 'dataSplit':
                imports.add('from sklearn.model_selection import train_test_split')
                break
            case 'scaler':
                imports.add('from sklearn.preprocessing import StandardScaler, MinMaxScaler')
                break
            case 'featureSelection':
                imports.add('from sklearn.feature_selection import SelectKBest, f_classif')
                break
            case 'classifier':
                imports.add('from sklearn.ensemble import RandomForestClassifier')
                imports.add('from sklearn.linear_model import LogisticRegression')
                imports.add('from sklearn.svm import SVC')
                break
            case 'regressor':
                imports.add('from sklearn.linear_model import LinearRegression, Ridge')
                imports.add('from sklearn.ensemble import RandomForestRegressor')
                break
            case 'neuralNet':
                imports.add('from sklearn.neural_network import MLPClassifier')
                break
            case 'evaluate':
                imports.add('from sklearn.metrics import accuracy_score, classification_report, confusion_matrix')
                break
            case 'hyperparamTune':
                imports.add('from sklearn.model_selection import GridSearchCV')
                break
        }
    })
    
    return Array.from(imports).join('\n')
}

/**
 * 전체 파이프라인을 Python 코드로 변환
 */
export function generatePythonCode(graph: GraphData): string {
    if (!graph.nodes || graph.nodes.length === 0) {
        return '# No nodes in the pipeline'
    }
    
    // ML 노드만 필터링
    const mlNodes = graph.nodes.filter(n => 
        ['dataLoader', 'dataSplit', 'scaler', 'featureSelection', 
         'classifier', 'regressor', 'neuralNet', 'evaluate', 
         'predict', 'hyperparamTune'].includes(n.kind)
    )
    
    if (mlNodes.length === 0) {
        return '# No ML nodes in the pipeline'
    }
    
    // 노드 실행 순서 결정
    const sortedNodes = topologicalSort(mlNodes, graph.connections)
    const nodeMap = new Map(mlNodes.map(n => [n.id, n]))
    
    // Import 문 생성
    const imports = generateImports(mlNodes)
    
    // 각 노드를 코드로 변환
    const codeBlocks = sortedNodes.map(node => 
        nodeToCode(node, graph.connections, nodeMap)
    )
    
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
export function generateJupyterNotebook(graph: GraphData, pipelineName: string = 'ML Pipeline'): string {
    const pythonCode = generatePythonCode(graph)
    
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
export function generatePythonScript(graph: GraphData, pipelineName: string = 'ML Pipeline'): string {
    const pythonCode = generatePythonCode(graph)
    
    const header = `"""
${pipelineName}

Auto-generated ML Pipeline Script
Generated on: ${new Date().toLocaleString('ko-KR')}

This script was created from a visual ML pipeline builder.
"""

`
    
    return header + pythonCode
}
