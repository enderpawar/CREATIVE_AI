# 🎯 ML Pipeline Builder - 노드별 상세 역할 설명

현재 구현된 10개의 ML 노드들의 역할을 자세히 설명합니다.

---

## 📊 1. Data Source (데이터 소스)

### 🔹 Data Loader (데이터 로더)
**역할**: 외부 파일에서 데이터를 불러오는 시작점

**입력**: 없음 (루트 노드)  
**출력**: 
- `data` - 로드된 DataFrame

**설정**:
- `fileType`: 파일 형식 (CSV, JSON, SQL 등)
- `path`: 파일 경로

**생성되는 코드**:
```python
step_node_1 = pd.read_csv('iris.csv')
print(f"Data loaded: {step_node_1.shape}")
```

**실제 활용**:
- CSV 파일에서 데이터 읽기
- 데이터베이스에서 쿼리 실행
- API에서 데이터 가져오기

---

## 🔧 2. Preprocessing (전처리)

### 🔹 Data Split (데이터 분할)
**역할**: 데이터를 훈련용과 테스트용으로 분리

**입력**: 
- `data` - 원본 데이터

**출력**:
- `train` - 훈련용 데이터 (80%)
- `test` - 테스트용 데이터 (20%)

**설정**:
- `ratio`: 훈련 데이터 비율 (0.0 ~ 1.0)

**생성되는 코드**:
```python
X = step_node_1.drop('target', axis=1)
y = step_node_1['target']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
```

**왜 필요한가?**:
- **과적합 방지**: 모델이 훈련 데이터만 외우는 것 방지
- **일반화 성능 측정**: 본 적 없는 데이터로 성능 평가
- **표준 관행**: ML에서 필수적인 단계

---

### 🔹 Scaler (스케일러/정규화)
**역할**: 특성(feature)들의 범위를 동일하게 맞춤

**입력**: 
- `data` - 원본 데이터

**출력**:
- `scaled` - 정규화된 데이터

**설정**:
- `method`: 정규화 방법
  - `StandardScaler`: 평균 0, 표준편차 1로 변환
  - `MinMaxScaler`: 0~1 범위로 변환

**생성되는 코드**:
```python
step_node_3 = StandardScaler()
X_train_scaled = step_node_3.fit_transform(X_train)
X_test_scaled = step_node_3.transform(X_test)
print("Features scaled using StandardScaler")
```

**예시**:
```
원본 데이터:
나이: [20, 30, 40, 50, 60]
연봉: [3000만, 4000만, 5000만, 6000만, 7000만]

StandardScaler 적용 후:
나이: [-1.41, -0.71, 0.00, 0.71, 1.41]
연봉: [-1.41, -0.71, 0.00, 0.71, 1.41]
```

**왜 필요한가?**:
- 특성 간 스케일 차이로 인한 편향 제거
- 경사 하강법 알고리즘의 수렴 속도 향상
- 거리 기반 알고리즘(KNN, SVM)의 성능 향상

---

### 🔹 Feature Selection (특성 선택)
**역할**: 중요한 특성만 선택하여 모델 성능 향상

**입력**: 
- `data` - 스케일된 데이터

**출력**:
- `selected` - 선택된 특성들

**설정**:
- `method`: 선택 방법 (SelectKBest, RFE 등)
- `k`: 선택할 특성 개수

**생성되는 코드**:
```python
step_node_4 = SelectKBest(k=10)
X_train_selected = step_node_4.fit_transform(X_train_scaled, y_train)
X_test_selected = step_node_4.transform(X_test_scaled)
print(f"Selected 10 best features")
```

**효과**:
- **차원의 저주 방지**: 불필요한 특성 제거
- **과적합 감소**: 노이즈 제거
- **학습 속도 향상**: 데이터 크기 감소
- **해석 가능성 향상**: 중요 변수만 사용

---

## 🤖 3. Models (모델)

### 🔹 Classifier (분류기)
**역할**: 카테고리를 예측하는 모델 학습

**입력**: 
- `train` - 훈련용 데이터

**출력**:
- `model` - 학습된 분류 모델

**설정**:
- `algorithm`: 알고리즘 선택
  - **RandomForest**: 여러 결정 트리의 앙상블 (정확도 높음)
  - **LogisticRegression**: 선형 모델 (빠르고 해석 쉬움)
  - **SVM**: 서포트 벡터 머신 (복잡한 경계 학습)
- `n_estimators`: 트리 개수 (RandomForest용)

**생성되는 코드**:
```python
step_node_5 = RandomForestClassifier(n_estimators=100, random_state=42)
step_node_5.fit(X_train_scaled, y_train)
print("Model trained: RandomForest")
```

**활용 예시**:
- 스팸 메일 분류 (스팸 / 정상)
- 꽃 종류 분류 (Iris 데이터셋)
- 고객 이탈 예측 (이탈 / 유지)
- 질병 진단 (양성 / 음성)

---

### 🔹 Regressor (회귀)
**역할**: 연속적인 숫자 값을 예측하는 모델 학습

**입력**: 
- `train` - 훈련용 데이터

**출력**:
- `model` - 학습된 회귀 모델

**설정**:
- `algorithm`: 알고리즘 선택
  - **LinearRegression**: 선형 회귀
  - **Ridge**: 규제가 있는 선형 회귀
  - **RandomForest**: 랜덤 포레스트 회귀

**생성되는 코드**:
```python
step_node_5 = LinearRegression()
step_node_5.fit(X_train_scaled, y_train)
print("Model trained: LinearRegression")
```

**활용 예시**:
- 집값 예측 (평수, 위치 → 가격)
- 매출 예측 (마케팅 비용 → 매출액)
- 온도 예측 (시간, 계절 → 온도)
- 주식 가격 예측

**Classifier vs Regressor**:
```
Classifier: "이 메일은 스팸입니다" (카테고리)
Regressor: "이 집의 가격은 5억입니다" (숫자)
```

---

### 🔹 Neural Network (신경망)
**역할**: 다층 퍼셉트론을 사용한 복잡한 패턴 학습

**입력**: 
- `train` - 훈련용 데이터

**출력**:
- `model` - 학습된 신경망 모델

**설정**:
- `layers`: 은닉층 구조 (예: "64,32" = 64개 뉴런, 32개 뉴런)
- `epochs`: 학습 반복 횟수

**생성되는 코드**:
```python
step_node_5 = MLPClassifier(
    hidden_layer_sizes=(64,32), 
    max_iter=50, 
    random_state=42
)
step_node_5.fit(X_train_scaled, y_train)
print("Neural Network trained with layers: [64,32]")
```

**구조 시각화**:
```
입력층 → 은닉층1(64) → 은닉층2(32) → 출력층
  [4]  →    [64]    →    [32]    →  [3]
```

**언제 사용?**:
- 복잡한 비선형 관계가 있을 때
- 데이터가 충분히 많을 때 (최소 수천 개)
- 이미지, 음성 등 고차원 데이터

---

## 📈 4. Evaluation (평가)

### 🔹 Evaluate Model (모델 평가)
**역할**: 학습된 모델의 성능을 측정

**입력**: 
- `model` - 학습된 모델
- `test` - 테스트 데이터

**출력**:
- `metrics` - 평가 지표들

**생성되는 코드**:
```python
y_pred = step_node_5.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"Accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))
```

**출력 예시**:
```
Accuracy: 0.9667
That's 96.67%!

Classification Report:
              precision    recall  f1-score
setosa            1.00      1.00      1.00
versicolor        0.93      0.93      0.93
virginica         0.93      0.93      0.93

Confusion Matrix:
[[10  0  0]
 [ 0 13  1]
 [ 0  1  5]]
```

**주요 지표**:
- **Accuracy**: 전체 정확도
- **Precision**: 예측이 맞을 확률
- **Recall**: 실제를 찾아낸 비율
- **F1-Score**: Precision과 Recall의 조화평균
- **Confusion Matrix**: 예측 vs 실제 비교표

---

### 🔹 Predict (예측)
**역할**: 새로운 데이터에 대한 예측 수행

**입력**: 
- `model` - 학습된 모델
- `data` - 예측할 데이터

**출력**:
- `prediction` - 예측 결과

**생성되는 코드**:
```python
step_node_7 = step_node_5.predict(X_test_scaled)
print(f"Predictions: {step_node_7[:10]}")  # Show first 10
```

**출력 예시**:
```
Predictions: [0 1 2 1 0 2 1 1 1 2]
# 0=setosa, 1=versicolor, 2=virginica
```

**실무 활용**:
- 실시간 예측 API
- 배치 예측 (대량 데이터)
- A/B 테스트

---

## ⚙️ 5. Optimization (최적화)

### 🔹 Hyperparameter Tuning (하이퍼파라미터 튜닝)
**역할**: 모델의 최적 설정값 자동 탐색

**입력**: 
- `train` - 훈련용 데이터

**출력**:
- `best_model` - 최적 설정으로 학습된 모델

**설정**:
- `method`: 탐색 방법 (GridSearch, RandomSearch)

**생성되는 코드**:
```python
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, 30]
}
step_node_6 = GridSearchCV(
    RandomForestClassifier(random_state=42), 
    param_grid, 
    cv=5
)
step_node_6.fit(X_train_scaled, y_train)
print(f"Best parameters: {step_node_6.best_params_}")
print(f"Best score: {step_node_6.best_score_:.4f}")
```

**탐색 과정**:
```
시도 1: n_estimators=50,  max_depth=10  → Accuracy: 0.92
시도 2: n_estimators=50,  max_depth=20  → Accuracy: 0.94
시도 3: n_estimators=100, max_depth=10  → Accuracy: 0.95
시도 4: n_estimators=100, max_depth=20  → Accuracy: 0.96 ✓ 최고!
...
최종: n_estimators=100, max_depth=20 선택
```

**효과**:
- 수동 조정 시간 절약
- 더 나은 성능 발견
- 체계적인 실험 관리

---

## 🔗 노드 연결 예시

### 기본 분류 파이프라인:
```
Data Loader → Data Split → Scaler → Classifier → Evaluate
    ↓             ↓          ↓           ↓           ↓
  iris.csv    80/20 분할   정규화    RandomForest  96.7%
```

### 고급 최적화 파이프라인:
```
Data Loader → Data Split → Scaler → Feature Selection → Hyperparameter Tuning → Evaluate
```

### 예측 파이프라인:
```
Data Loader → Scaler → Trained Model → Predict
                                           ↓
                                    [0,1,2,1,0...]
```

---

## 💡 각 노드가 하는 일 요약표

| 노드 | 입력 | 출력 | 핵심 역할 |
|------|------|------|-----------|
| Data Loader | - | DataFrame | 데이터 로드 |
| Data Split | 데이터 | Train/Test | 훈련/테스트 분리 |
| Scaler | 데이터 | 정규화 데이터 | 특성 스케일링 |
| Feature Selection | 데이터 | 선택된 특성 | 중요 변수 추출 |
| Classifier | 훈련 데이터 | 분류 모델 | 카테고리 예측 학습 |
| Regressor | 훈련 데이터 | 회귀 모델 | 숫자 예측 학습 |
| Neural Network | 훈련 데이터 | 신경망 모델 | 복잡한 패턴 학습 |
| Evaluate | 모델 + 테스트 | 평가 지표 | 성능 측정 |
| Predict | 모델 + 데이터 | 예측값 | 실제 예측 수행 |
| Hyperparameter Tuning | 훈련 데이터 | 최적 모델 | 파라미터 자동 탐색 |

---

## 📚 학습 자료

### 초보자용 파이프라인
```
Data Loader → Data Split → Classifier → Evaluate
```
- 가장 단순한 구조
- Iris 데이터셋으로 실습 추천

### 중급자용 파이프라인
```
Data Loader → Data Split → Scaler → Feature Selection → Classifier → Evaluate
```
- 전처리 단계 추가
- 실무에서 가장 많이 사용

### 고급자용 파이프라인
```
Data Loader → Data Split → Scaler → Hyperparameter Tuning → Evaluate → Predict
```
- 최적화 단계 포함
- 프로덕션 레벨 파이프라인

---

## 🎓 다음 단계

1. **실습**: `examples/iris_classification_example.ipynb` 노트북 실행
2. **커스터마이징**: 각 노드의 파라미터 변경해보기
3. **새 데이터셋**: 자신의 CSV 파일로 파이프라인 구성
4. **코드 학습**: 생성된 Python 코드 분석
5. **배포**: 학습된 모델을 실제 서비스에 적용

---

**프로젝트 저장소**: https://github.com/enderpawar/2025_oss_term_project-22101203_-

**문의 및 기여**: Issues와 Pull Requests 환영합니다! 🙌
