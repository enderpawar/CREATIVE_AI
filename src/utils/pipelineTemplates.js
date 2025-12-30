/**
 * pipelineTemplates.js
 * 
 * 자주 사용되는 머신러닝 파이프라인 템플릿 모음
 * 사용자가 빠르게 시작할 수 있도록 미리 정의된 파이프라인 구조 제공
 */

export const pipelineTemplates = [
  {
    id: 'classification-basic',
    name: '기본 분류 모델',
    description: 'CSV 데이터를 로드하고 분류 모델을 학습하는 기본 파이프라인',
    category: 'classification',
    difficulty: 'beginner',
    icon: '📊',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'data.csv',
          separator: ',',
        }
      },
      {
        id: 'preprocessor-1',
        type: 'Preprocessor',
        position: { x: 100, y: 250 },
        config: {
          handleMissing: 'drop',
          scaleFeatures: true,
        }
      },
      {
        id: 'classifier-1',
        type: 'Classifier',
        position: { x: 100, y: 400 },
        config: {
          algorithm: 'RandomForest',
          testSize: 0.2,
        }
      },
      {
        id: 'evaluator-1',
        type: 'Evaluator',
        position: { x: 100, y: 550 },
        config: {
          metrics: ['accuracy', 'precision', 'recall', 'f1'],
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'preprocessor-1' },
      { from: 'preprocessor-1', to: 'classifier-1' },
      { from: 'classifier-1', to: 'evaluator-1' },
    ]
  },
  {
    id: 'regression-basic',
    name: '기본 회귀 모델',
    description: '수치 예측을 위한 회귀 분석 파이프라인',
    category: 'regression',
    difficulty: 'beginner',
    icon: '📈',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'data.csv',
          separator: ',',
        }
      },
      {
        id: 'preprocessor-1',
        type: 'Preprocessor',
        position: { x: 100, y: 250 },
        config: {
          handleMissing: 'mean',
          scaleFeatures: true,
        }
      },
      {
        id: 'regressor-1',
        type: 'Regressor',
        position: { x: 100, y: 400 },
        config: {
          algorithm: 'LinearRegression',
          testSize: 0.2,
        }
      },
      {
        id: 'evaluator-1',
        type: 'Evaluator',
        position: { x: 100, y: 550 },
        config: {
          metrics: ['mse', 'rmse', 'r2'],
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'preprocessor-1' },
      { from: 'preprocessor-1', to: 'regressor-1' },
      { from: 'regressor-1', to: 'evaluator-1' },
    ]
  },
  {
    id: 'clustering-basic',
    name: '기본 클러스터링',
    description: '비지도 학습으로 데이터를 그룹화하는 파이프라인',
    category: 'clustering',
    difficulty: 'beginner',
    icon: '🎯',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'data.csv',
          separator: ',',
        }
      },
      {
        id: 'preprocessor-1',
        type: 'Preprocessor',
        position: { x: 100, y: 250 },
        config: {
          handleMissing: 'drop',
          scaleFeatures: true,
        }
      },
      {
        id: 'clusterer-1',
        type: 'Clusterer',
        position: { x: 100, y: 400 },
        config: {
          algorithm: 'KMeans',
          nClusters: 3,
        }
      },
      {
        id: 'visualizer-1',
        type: 'Visualizer',
        position: { x: 100, y: 550 },
        config: {
          plotType: 'scatter',
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'preprocessor-1' },
      { from: 'preprocessor-1', to: 'clusterer-1' },
      { from: 'clusterer-1', to: 'visualizer-1' },
    ]
  },
  {
    id: 'neural-network-advanced',
    name: '딥러닝 분류',
    description: '신경망을 활용한 고급 분류 파이프라인',
    category: 'deep-learning',
    difficulty: 'advanced',
    icon: '🧠',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'data.csv',
          separator: ',',
        }
      },
      {
        id: 'preprocessor-1',
        type: 'Preprocessor',
        position: { x: 100, y: 250 },
        config: {
          handleMissing: 'drop',
          scaleFeatures: true,
          encodeCategories: true,
        }
      },
      {
        id: 'neural-network-1',
        type: 'NeuralNetwork',
        position: { x: 100, y: 400 },
        config: {
          layers: [64, 32, 16],
          activation: 'relu',
          optimizer: 'adam',
          epochs: 50,
        }
      },
      {
        id: 'evaluator-1',
        type: 'Evaluator',
        position: { x: 100, y: 550 },
        config: {
          metrics: ['accuracy', 'loss'],
        }
      },
      {
        id: 'visualizer-1',
        type: 'Visualizer',
        position: { x: 300, y: 550 },
        config: {
          plotType: 'training_history',
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'preprocessor-1' },
      { from: 'preprocessor-1', to: 'neural-network-1' },
      { from: 'neural-network-1', to: 'evaluator-1' },
      { from: 'neural-network-1', to: 'visualizer-1' },
    ]
  },
  {
    id: 'feature-engineering',
    name: '특성 공학 파이프라인',
    description: '고급 특성 추출 및 선택을 포함한 파이프라인',
    category: 'preprocessing',
    difficulty: 'intermediate',
    icon: '🔧',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'data.csv',
          separator: ',',
        }
      },
      {
        id: 'preprocessor-1',
        type: 'Preprocessor',
        position: { x: 100, y: 250 },
        config: {
          handleMissing: 'median',
          scaleFeatures: true,
        }
      },
      {
        id: 'feature-engineer-1',
        type: 'FeatureEngineer',
        position: { x: 100, y: 400 },
        config: {
          polyFeatures: true,
          degree: 2,
          selectKBest: 10,
        }
      },
      {
        id: 'classifier-1',
        type: 'Classifier',
        position: { x: 100, y: 550 },
        config: {
          algorithm: 'GradientBoosting',
          testSize: 0.2,
        }
      },
      {
        id: 'evaluator-1',
        type: 'Evaluator',
        position: { x: 100, y: 700 },
        config: {
          metrics: ['accuracy', 'roc_auc'],
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'preprocessor-1' },
      { from: 'preprocessor-1', to: 'feature-engineer-1' },
      { from: 'feature-engineer-1', to: 'classifier-1' },
      { from: 'classifier-1', to: 'evaluator-1' },
    ]
  },
  {
    id: 'time-series',
    name: '시계열 예측',
    description: '시간에 따른 데이터 예측 파이프라인',
    category: 'time-series',
    difficulty: 'intermediate',
    icon: '⏱️',
    nodes: [
      {
        id: 'data-loader-1',
        type: 'DataLoader',
        position: { x: 100, y: 100 },
        config: {
          filePath: 'timeseries.csv',
          separator: ',',
          parseDate: true,
        }
      },
      {
        id: 'time-series-prep-1',
        type: 'TimeSeriesPreprocessor',
        position: { x: 100, y: 250 },
        config: {
          frequency: 'daily',
          fillMethod: 'interpolate',
        }
      },
      {
        id: 'time-series-model-1',
        type: 'TimeSeriesModel',
        position: { x: 100, y: 400 },
        config: {
          model: 'ARIMA',
          forecastPeriod: 30,
        }
      },
      {
        id: 'visualizer-1',
        type: 'Visualizer',
        position: { x: 100, y: 550 },
        config: {
          plotType: 'time_series',
        }
      }
    ],
    connections: [
      { from: 'data-loader-1', to: 'time-series-prep-1' },
      { from: 'time-series-prep-1', to: 'time-series-model-1' },
      { from: 'time-series-model-1', to: 'visualizer-1' },
    ]
  }
];

/**
 * 카테고리별 템플릿 가져오기
 */
export const getTemplatesByCategory = (category) => {
  if (category === 'all') return pipelineTemplates;
  return pipelineTemplates.filter(t => t.category === category);
};

/**
 * 난이도별 템플릿 가져오기
 */
export const getTemplatesByDifficulty = (difficulty) => {
  if (difficulty === 'all') return pipelineTemplates;
  return pipelineTemplates.filter(t => t.difficulty === difficulty);
};

/**
 * ID로 템플릿 가져오기
 */
export const getTemplateById = (id) => {
  return pipelineTemplates.find(t => t.id === id);
};

/**
 * 템플릿 카테고리 목록
 */
export const templateCategories = [
  { id: 'all', name: '전체', icon: '📦' },
  { id: 'classification', name: '분류', icon: '📊' },
  { id: 'regression', name: '회귀', icon: '📈' },
  { id: 'clustering', name: '클러스터링', icon: '🎯' },
  { id: 'deep-learning', name: '딥러닝', icon: '🧠' },
  { id: 'preprocessing', name: '전처리', icon: '🔧' },
  { id: 'time-series', name: '시계열', icon: '⏱️' },
];

/**
 * 난이도 목록
 */
export const difficultyLevels = [
  { id: 'all', name: '전체', color: '#999' },
  { id: 'beginner', name: '초급', color: '#10b981' },
  { id: 'intermediate', name: '중급', color: '#f59e0b' },
  { id: 'advanced', name: '고급', color: '#ef4444' },
];

export default pipelineTemplates;
