# 코드 개선 필요 사항

## 1. DataSplit 노드 출력 변수명 표준화

### 문제점
DataSplit 노드가 4개의 출력을 생성하지만, 각 출력에 대한 변수명 규칙이 일관되지 않음

### 해결 방안
```python
# 현재 (문제)
X_train, X_test, y_train, y_test = train_test_split(...)

# 개선안
step_DataSplit_xxx = {}
step_DataSplit_xxx['X_train'], step_DataSplit_xxx['X_test'], \
step_DataSplit_xxx['y_train'], step_DataSplit_xxx['y_test'] = train_test_split(...)
```

또는 더 간단하게:
```python
# 접두사를 각 변수에 추가
step_DataSplit_xxx_X_train, step_DataSplit_xxx_X_test, \
step_DataSplit_xxx_y_train, step_DataSplit_xxx_y_test = train_test_split(...)
```

---

## 2. Scaler 노드 개선

### 문제점
- Scaler는 학습 데이터로 fit하고, 학습/테스트 데이터 모두 transform 해야 함
- 현재는 하나의 입력만 처리

### 해결 방안
```python
# 개선된 Scaler 코드
scaler_xxx = StandardScaler()
# fit은 X_train으로만
scaler_xxx.fit(step_yyy_X_train)
# transform은 둘 다
step_xxx_X_train_scaled = scaler_xxx.transform(step_yyy_X_train)
step_xxx_X_test_scaled = scaler_xxx.transform(step_yyy_X_test)
print(f"Features scaled using StandardScaler")
```

---

## 3. 연결 추적 개선

### 문제점
현재 연결 추적이 소스 노드 ID만 사용하여 어떤 출력인지 구분 못함

### 해결 방안
```typescript
// sourceOutput 정보도 활용
const xTestConn = connections.find(c => 
    c.target === node.id && 
    c.targetInput === 'X_test'
)

if (xTestConn) {
    const sourceNodeId = xTestConn.source.replace(/[^a-zA-Z0-9]/g, '_')
    const sourceOutput = xTestConn.sourceOutput // 'X_test'
    const xTestVar = `step_${sourceNodeId}_${sourceOutput}`
} else {
    // 경고 추가
    const xTestVar = 'X_test  # WARNING: No connection found'
}
```

---

## 4. Import 문 개선

### 문제점
- dataLoader에서 base64, io 모듈 사용하지만 import 안됨
- 실제 사용된 알고리즘만 import 해야 효율적

### 해결 방안
```typescript
function generateImports(nodes: NodeData[]): string {
    const imports = new Set<string>()
    
    imports.add('import pandas as pd')
    imports.add('import numpy as np')
    
    // dataLoader에 CSV embedding이 있으면 추가
    const hasEmbeddedCSV = nodes.some(n => n.kind === 'dataLoader')
    if (hasEmbeddedCSV) {
        imports.add('import io')
        imports.add('import base64')
    }
    
    // 실제 사용된 알고리즘만 import
    nodes.forEach(node => {
        if (node.kind === 'classifier') {
            const algo = node.controls?.algorithm || 'RandomForest'
            if (algo === 'RandomForest') {
                imports.add('from sklearn.ensemble import RandomForestClassifier')
            } else if (algo === 'LogisticRegression') {
                imports.add('from sklearn.linear_model import LogisticRegression')
            }
            // ... 기타
        }
    })
    
    return Array.from(imports).join('\n')
}
```

---

## 5. 타겟 컬럼 설정 개선

### 문제점
타겟 컬럼명이 'target'으로 하드코딩됨

### 해결 방안

**방법 1: DataLoader 노드에 targetColumn 컨트롤 추가**
```typescript
// app-editor.ts
export class DataLoaderNode extends TradeNode {
    constructor() {
        super('데이터 로더')
        this.addOutput('data', new ClassicPreset.Output(numberSocket, '데이터'))
        this.addControl('fileName', new ClassicPreset.InputControl('text', { initial: 'data.csv' }))
        this.addControl('targetColumn', new ClassicPreset.InputControl('text', { initial: 'target' }))
        // ...
    }
}
```

**방법 2: DataSplit 노드에 targetColumn 컨트롤 추가**
```typescript
export class DataSplitNode extends TradeNode {
    constructor() {
        super('데이터 분할')
        this.addInput('data', new ClassicPreset.Input(numberSocket, '데이터'))
        this.addOutput('X_train', new ClassicPreset.Output(numberSocket, 'X_훈련'))
        this.addOutput('X_test', new ClassicPreset.Output(numberSocket, 'X_테스트'))
        this.addOutput('y_train', new ClassicPreset.Output(numberSocket, 'y_훈련'))
        this.addOutput('y_test', new ClassicPreset.Output(numberSocket, 'y_테스트'))
        this.addControl('ratio', new ClassicPreset.InputControl('number', { initial: 0.8 }))
        this.addControl('targetColumn', new ClassicPreset.InputControl('text', { initial: 'target' }))
        this.kind = 'dataSplit'
        this.category = 'ml-preprocessing'
    }
}
```

그리고 코드 생성 시:
```typescript
case 'dataSplit': {
    const ratio = node.controls?.ratio || 0.8
    const targetCol = node.controls?.targetColumn || 'target'
    
    return `# Train/Test Split
X = ${sourceVar}.drop('${targetCol}', axis=1)
y = ${sourceVar}['${targetCol}']
X_train, X_test, y_train, y_test = train_test_split(...)
`
}
```

---

## 6. 에러 처리 및 경고 추가

### 문제점
연결이 없는 경우 조용히 폴백 변수 사용

### 해결 방안
```typescript
case 'evaluate': {
    const modelConn = connections.find(c => c.target === node.id && c.targetInput === 'model')
    const xTestConn = connections.find(c => c.target === node.id && c.targetInput === 'X_test')
    const yTestConn = connections.find(c => c.target === node.id && c.targetInput === 'y_test')
    
    const modelVar = modelConn ? `step_${modelConn.source}` : 'model  # WARNING: No model connection'
    const xTestVar = xTestConn ? `step_${xTestConn.source}_X_test` : 'X_test  # WARNING: No X_test connection'
    const yTestVar = yTestConn ? `step_${yTestConn.source}_y_test` : 'y_test  # WARNING: No y_test connection'
    
    // 연결이 없으면 주석으로 경고 추가
    let warnings = ''
    if (!modelConn || !xTestConn || !yTestConn) {
        warnings = `# ⚠️ WARNING: Missing connections detected!\n`
        if (!modelConn) warnings += `#   - No model input connected\n`
        if (!xTestConn) warnings += `#   - No X_test input connected\n`
        if (!yTestConn) warnings += `#   - No y_test input connected\n`
    }
    
    return `${warnings}# Evaluate Model
y_pred = ${modelVar}.predict(${xTestVar})
...
`
}
```

---

## 7. 변수명 충돌 방지

### 문제점
같은 종류의 노드가 여러 개 있으면 변수명 충돌

### 해결 방안
이미 `step_${node.id}`를 사용하므로 충돌은 없지만, 
더 명확한 변수명을 위해:

```typescript
function nodeToCode(node: NodeData, ...): string {
    // 노드 ID를 안전한 변수명으로 변환 (이미 구현됨)
    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_')
    
    // 노드 종류를 접두사로 추가하면 더 명확
    const varPrefix = `${node.kind}_${safeId}`
    
    // 예: scaler_abc123 = StandardScaler()
    //     classifier_xyz789 = RandomForestClassifier()
}
```

---

## 8. Topological Sort 개선

### 문제점
순환 참조 감지가 없음

### 해결 방안
```typescript
function topologicalSort(nodes: NodeData[], connections: ConnectionData[]): NodeData[] {
    // ... 기존 코드 ...
    
    // 순환 참조 감지
    if (sorted.length !== nodes.length) {
        console.error('Circular dependency detected or disconnected nodes!')
        console.error('Sorted nodes:', sorted.length, 'Total nodes:', nodes.length)
        
        // 정렬되지 않은 노드 찾기
        const sortedIds = new Set(sorted.map(n => n.id))
        const missing = nodes.filter(n => !sortedIds.has(n.id))
        console.error('Missing nodes:', missing.map(n => n.label))
    }
    
    return sorted
}
```

---

## 9. FeatureSelection 개선

### 문제점
y_train이 필요한데 입력으로 받지 않음

### 해결 방안
```typescript
// app-editor.ts
export class FeatureSelectionNode extends TradeNode {
    constructor() {
        super('피처 선택')
        this.addInput('X_train', new ClassicPreset.Input(numberSocket, 'X_훈련'))
        this.addInput('y_train', new ClassicPreset.Input(numberSocket, 'y_훈련'))  // 추가!
        this.addOutput('selected', new ClassicPreset.Output(numberSocket, '선택됨'))
        this.addControl('method', new ClassicPreset.InputControl('text', { initial: 'SelectKBest' }))
        this.addControl('k', new ClassicPreset.InputControl('number', { initial: 10 }))
        this.kind = 'featureSelection'
        this.category = 'ml-preprocessing'
    }
}

// pipelineToCode.ts
case 'featureSelection': {
    const xTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'X_train')
    const yTrainConn = connections.find(c => c.target === node.id && c.targetInput === 'y_train')
    
    const xTrainVar = xTrainConn ? `step_${xTrainConn.source}_X_train` : 'X_train'
    const yTrainVar = yTrainConn ? `step_${yTrainConn.source}_y_train` : 'y_train'
    
    return `# Feature Selection
${varName} = SelectKBest(k=${k})
${varName}_selected = ${varName}.fit_transform(${xTrainVar}, ${yTrainVar})
`
}
```

---

## 10. 코드 가독성 개선

### 문제점
생성된 Python 코드에 주석이 부족

### 해결 방안
```python
# 각 단계마다 상세한 주석 추가
# ========================================
# Step 1: Load Data
# Node ID: abc123
# File: iris_data.csv
# ========================================
step_abc123 = pd.read_csv('iris_data.csv')
print(f"Data loaded: {step_abc123.shape}")

# ========================================
# Step 2: Train/Test Split
# Node ID: xyz789
# Input: step_abc123 (from DataLoader)
# Split Ratio: 80% train, 20% test
# ========================================
X = step_abc123.drop('species', axis=1)
y = step_abc123['species']
...
```

---

## 우선순위

### 🔴 Critical (즉시 수정 필요)
1. **Import 문 누락** (base64, io)
2. **DataSplit 변수명 추적** (다른 노드에서 사용 못함)
3. **Scaler X_train/X_test 구분**

### 🟡 High (빠른 시일 내 수정)
4. **타겟 컬럼명 설정** (사용자 데이터 대응)
5. **연결 추적 로직 개선** (sourceOutput 활용)
6. **에러 처리 및 경고**

### 🟢 Medium (점진적 개선)
7. **FeatureSelection y_train 입력**
8. **순환 참조 감지**
9. **코드 가독성 개선**
10. **변수명 충돌 방지**

---

## 다음 단계

위 개선 사항을 적용하면:
- ✅ 생성된 Python 코드가 실제로 실행 가능
- ✅ 노드 연결 정보가 정확하게 반영됨
- ✅ 사용자 데이터에 유연하게 대응
- ✅ 디버깅이 쉬운 코드 생성
