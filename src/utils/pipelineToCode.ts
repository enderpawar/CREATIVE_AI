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
            const fileName = node.controls?.fileName?.value || 'data.csv'
            
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
            const ratio = node.controls?.ratio?.value || 0.8
            const inputConn = connections.find(c => c.target === node.id && c.targetInput === 'data')
            const sourceVar = inputConn ? `step_${inputConn.source.replace(/[^a-zA-Z0-9]/g, '_')}` : 'df'
            
            return `# Train/Test Split
X = ${sourceVar}.drop('target', axis=1)  # Adjust 'target' column name
y = ${sourceVar}['target']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=${(1 - ratio).toFixed(2)}, random_state=42)
print(f"Train size: {{len(X_train)}}, Test size: {{len(X_test)}}")`
        }
        
        case 'scaler': {
            const method = node.controls?.method?.value || 'StandardScaler'
            
            return `# Scale Features\n${varName} = ${method}()\nX_train_scaled = ${varName}.fit_transform(X_train)\nX_test_scaled = ${varName}.transform(X_test)\nprint("Features scaled using ${method}")`
        }
        
        case 'featureSelection': {
            const method = node.controls?.method?.value || 'SelectKBest'
            const k = node.controls?.k?.value || 10
            
            return `# Feature Selection\n${varName} = ${method}(k=${k})\nX_train_selected = ${varName}.fit_transform(X_train_scaled, y_train)\nX_test_selected = ${varName}.transform(X_test_scaled)\nprint(f"Selected {k} best features")`
        }
        
        case 'classifier': {
            const algorithm = node.controls?.algorithm?.value || 'RandomForest'
            const nEstimators = node.controls?.n_estimators?.value || 100
            
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
            
            return `# Train Classifier\n${varName} = ${modelCode}\n${varName}.fit(X_train_scaled, y_train)\nprint("Model trained: ${algorithm}")`
        }
        
        case 'regressor': {
            const algorithm = node.controls?.algorithm?.value || 'LinearRegression'
            
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
            
            return `# Train Regressor\n${varName} = ${modelCode}\n${varName}.fit(X_train_scaled, y_train)\nprint("Model trained: ${algorithm}")`
        }
        
        case 'neuralNet': {
            const layers = node.controls?.layers?.value || '64,32'
            const epochs = node.controls?.epochs?.value || 50
            
            return `# Train Neural Network\n${varName} = MLPClassifier(hidden_layer_sizes=(${layers}), max_iter=${epochs}, random_state=42)\n${varName}.fit(X_train_scaled, y_train)\nprint("Neural Network trained with layers: [${layers}]")`
        }
        
        case 'evaluate': {
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const modelVar = modelConn ? `step_${modelConn.source.replace(/[^a-zA-Z0-9]/g, '_')}` : 'model'
            
            return `# Evaluate Model\ny_pred = ${modelVar}.predict(X_test_scaled)\naccuracy = accuracy_score(y_test, y_pred)\nprint(f"Accuracy: {accuracy:.4f}")\nprint("\\nClassification Report:")\nprint(classification_report(y_test, y_pred))\nprint("\\nConfusion Matrix:")\nprint(confusion_matrix(y_test, y_pred))`
        }
        
        case 'predict': {
            const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
            const modelVar = modelConn ? `step_${modelConn.source.replace(/[^a-zA-Z0-9]/g, '_')}` : 'model'
            
            return `# Make Predictions\n${varName} = ${modelVar}.predict(X_test_scaled)\nprint(f"Predictions: {${varName}[:10]}")  # Show first 10 predictions`
        }
        
        case 'hyperparamTune': {
            return `# Hyperparameter Tuning\nparam_grid = {\n    'n_estimators': [50, 100, 200],\n    'max_depth': [10, 20, 30]\n}\n${varName} = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5)\n${varName}.fit(X_train_scaled, y_train)\nprint(f"Best parameters: {${varName}.best_params_}")\nprint(f"Best score: {${varName}.best_score_:.4f}")`
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
