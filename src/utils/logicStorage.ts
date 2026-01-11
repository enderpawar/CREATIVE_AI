// localStorage를 사용한 로직 저장소 관리

import { logger } from './logger';

const STORAGE_KEYS = {
  LOGIC_INDEX: 'trade-builder-logic-index',
  LOGIC_PREFIX: 'trade-builder-logic-',
  THEME: 'trade-builder-theme',
};

export interface LogicMeta {
  id: string;
  name: string;
  stock?: string;
  order: number;
}

export interface Logic {
  id: string;
  name: string;
  exchange?: string;
  stock?: string;
  data: {
    buyGraph?: any;
    sellGraph?: any;
  };
}

// 인덱스(로직 목록) 조회
export function listLogics(): LogicMeta[] {
  try {
    const index = localStorage.getItem(STORAGE_KEYS.LOGIC_INDEX);
    if (!index) return [];
    const parsed = JSON.parse(index);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logger.error('Failed to list logics:', e);
    return [];
  }
}

// 인덱스 저장
function saveIndex(logics: LogicMeta[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGIC_INDEX, JSON.stringify(logics));
  } catch (e) {
    logger.error('Failed to save index:', e);
  }
}

// 새 로직 생성
export function createLogic(name: string): LogicMeta {
  const id = `logic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const meta: LogicMeta = {
    id,
    name: name || 'Untitled',
    order: Number.MAX_SAFE_INTEGER,
  };

  // 로직 파일 생성
  const logic: Logic = {
    id,
    name: meta.name,
    data: {},
  };
  localStorage.setItem(`${STORAGE_KEYS.LOGIC_PREFIX}${id}`, JSON.stringify(logic));

  // 인덱스에 추가
  const index = listLogics();
  const newIndex = [...index, meta].map((m, i) => ({ ...m, order: i }));
  saveIndex(newIndex);

  return meta;
}

// 로직 로드
export function loadLogic(id: string): Logic | null {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.LOGIC_PREFIX}${id}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    logger.error('Failed to load logic:', e);
    return null;
  }
}

// 로직 저장
export function saveLogic(logic: Logic): boolean {
  try {
    if (!logic || !logic.id) {
      throw new Error('Invalid logic');
    }

    // 로직 저장
    localStorage.setItem(`${STORAGE_KEYS.LOGIC_PREFIX}${logic.id}`, JSON.stringify(logic));

    // 인덱스 업데이트
    const index = listLogics();
    const existIndex = index.findIndex((m) => m.id === logic.id);
    
    if (existIndex >= 0) {
      index[existIndex] = {
        ...index[existIndex],
        name: logic.name,
        stock: logic.stock,
      };
    } else {
      index.push({
        id: logic.id,
        name: logic.name,
        stock: logic.stock,
        order: index.length,
      });
    }
    
    saveIndex(index);
    return true;
  } catch (e) {
    console.error('Failed to save logic:', e);
    return false;
  }
}

// 로직 삭제
export function deleteLogic(id: string): boolean {
  try {
    // 로직 파일 삭제
    localStorage.removeItem(`${STORAGE_KEYS.LOGIC_PREFIX}${id}`);

    // 인덱스에서 제거
    const index = listLogics();
    const newIndex = index
      .filter((m) => m.id !== id)
      .map((m, i) => ({ ...m, order: i }));
    saveIndex(newIndex);

    return true;
  } catch (e) {
    console.error('Failed to delete logic:', e);
    return false;
  }
}

// 로직 순서 변경
export function reorderLogics(ids: string[]): boolean {
  try {
    const index = listLogics();
    const map = new Map(index.map((m) => [m.id, m]));
    
    const ordered: LogicMeta[] = ids.map((id, i) => {
      const m = map.get(id);
      return {
        id,
        name: m?.name || 'Untitled',
        stock: m?.stock,
        order: i,
      };
    });

    // 누락된 항목 추가
    index.forEach((m) => {
      if (!ids.includes(m.id)) {
        ordered.push({ id: m.id, name: m.name, stock: m.stock, order: ordered.length });
      }
    });

    saveIndex(ordered);
    return true;
  } catch (e) {
    console.error('Failed to reorder logics:', e);
    return false;
  }
}

// 테마 저장/로드
export function saveTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function loadTheme(): 'light' | 'dark' | null {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (theme === 'light' || theme === 'dark') return theme;
  return null;
}
