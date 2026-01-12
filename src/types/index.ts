// 공통 타입 정의

export interface LogicMeta {
  id: string;
  name: string;
  stock?: string;
  order: number;
  _temp?: boolean;
}

export interface GraphData {
  nodes: NodeData[];
  connections: ConnectionData[];
}

export interface NodeData {
  id: string;
  label: string;
  kind: string;
  controls?: Record<string, any>;
  position: { x: number; y: number };
}

export interface ConnectionData {
  id: string;
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Logic {
  id: string;
  name: string;
  exchange?: string;
  stock?: string;
  data: {
    buyGraph?: GraphData;
    sellGraph?: GraphData;
  };
}

export interface Pipeline {
  nodes: PipelineNode[];
  connections: PipelineConnection[];
}

export interface PipelineNode {
  id: string;
  step: number;
  kind: string;
  type: string;
  nodeType: string;
  controls?: Record<string, any>;
  settings?: Record<string, any>;
  position?: { x: number; y: number };
}

export interface PipelineConnection {
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

export interface NodeGuide {
  step: number;
  nodeType: string;
  nodeName: string;
  description: string;
  reason?: string;
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

export interface CSVData {
  fileName: string;
  content: string;
  rows: number;
  columns: number;
}

export type Theme = 'dark' | 'light';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface Toast {
  id: number;
  title: string | null;
  message: string;
  variant: ToastVariant;
}

export interface ToastAPI {
  show: (toast: ToastOptions | string) => number;
  info: (message: string, opts?: Partial<ToastOptions>) => number;
  success: (message: string, opts?: Partial<ToastOptions>) => number;
  warning: (message: string, opts?: Partial<ToastOptions>) => number;
  error: (message: string, opts?: Partial<ToastOptions>) => number;
  remove: (id: number) => void;
}
