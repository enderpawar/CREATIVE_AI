/**
 * useUndoRedo - 실행 취소/다시 실행 기능을 제공하는 커스텀 훅
 * 
 * 상태 변경 이력을 관리하고, 사용자가 이전 상태로 되돌리거나 다시 진행할 수 있게 합니다.
 * 
 * @param {any} initialState - 초기 상태
 * @param {number} maxHistorySize - 저장할 최대 히스토리 크기 (기본값: 50)
 * @returns {object} 현재 상태, setState, undo, redo, 상태 정보
 */
import { useState, useCallback, useRef } from 'react';

export const useUndoRedo = (initialState, maxHistorySize = 50) => {
  const [state, setState] = useState(initialState);
  const [historyIndex, setHistoryIndex] = useState(0);
  const history = useRef([initialState]);

  // 새로운 상태를 히스토리에 추가
  const setStateWithHistory = useCallback((newState) => {
    setState(prev => {
      const nextState = typeof newState === 'function' ? newState(prev) : newState;
      
      // 현재 위치 이후의 히스토리는 제거
      const newHistory = history.current.slice(0, historyIndex + 1);
      newHistory.push(nextState);
      
      // 최대 크기 제한
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      
      history.current = newHistory;
      return nextState;
    });
  }, [historyIndex, maxHistorySize]);

  // 실행 취소 (Undo)
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(history.current[newIndex]);
      return true;
    }
    return false;
  }, [historyIndex]);

  // 다시 실행 (Redo)
  const redo = useCallback(() => {
    if (historyIndex < history.current.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(history.current[newIndex]);
      return true;
    }
    return false;
  }, [historyIndex]);

  // 히스토리 초기화
  const reset = useCallback((newInitialState = initialState) => {
    setState(newInitialState);
    history.current = [newInitialState];
    setHistoryIndex(0);
  }, [initialState]);

  // 현재 상태 정보
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.current.length - 1;
  const historySize = history.current.length;

  return {
    state,
    setState: setStateWithHistory,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyIndex,
    historySize,
  };
};

/**
 * useKeyboardShortcuts - 키보드 단축키를 등록하는 커스텀 훅
 * 
 * @param {object} shortcuts - 키 조합과 핸들러 매핑
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+z': handleUndo,
 *   'ctrl+y': handleRedo,
 *   'ctrl+s': handleSave,
 * });
 */
export const useKeyboardShortcuts = (shortcuts) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e) => {
    // input, textarea에서는 단축키 비활성화
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // 키 조합 생성
    let combo = '';
    if (ctrl) combo += 'ctrl+';
    if (shift) combo += 'shift+';
    if (alt) combo += 'alt+';
    combo += key;

    // 단축키 실행
    const handler = shortcutsRef.current[combo];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  }, []);

  // 이벤트 리스너 등록
  const registerShortcuts = useCallback(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return registerShortcuts;
};

export default useUndoRedo;
