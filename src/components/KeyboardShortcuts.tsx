import { useState, useEffect } from 'react';
import './KeyboardShortcuts.css';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  category: string;
  items: ShortcutItem[];
}

/**
 * KeyboardShortcuts - 키보드 단축키 안내 모달
 * 
 * 사용자가 ?를 누르면 사용 가능한 모든 키보드 단축키를 표시합니다.
 */
const KeyboardShortcuts: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ? 키를 누르면 모달 토글 (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // input, textarea에서는 작동하지 않도록
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }
      }
      // ESC 키로 닫기
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts: ShortcutSection[] = [
    {
      category: '일반',
      items: [
        { keys: ['?'], description: '단축키 도움말 보기/숨기기' },
        { keys: ['Esc'], description: '모달 닫기' },
        { keys: ['Ctrl', 'S'], description: '파이프라인 저장' },
      ]
    },
    {
      category: '에디터',
      items: [
        { keys: ['Ctrl', 'C'], description: '노드 복사' },
        { keys: ['Ctrl', 'X'], description: '노드 잘라내기' },
        { keys: ['Ctrl', 'V'], description: '노드 붙여넣기' },
        { keys: ['Delete'], description: '선택한 노드 삭제' },
        { keys: ['Ctrl', 'Z'], description: '실행 취소' },
        { keys: ['Ctrl', 'Y'], description: '다시 실행' },
        { keys: ['Shift', 'Click'], description: '다중 선택' },
      ]
    },
    {
      category: '뷰 제어',
      items: [
        { keys: ['Ctrl', '+'], description: '확대' },
        { keys: ['Ctrl', '-'], description: '축소' },
        { keys: ['Ctrl', '0'], description: '줌 리셋' },
        { keys: ['Space', 'Drag'], description: '캔버스 이동' },
      ]
    },
    {
      category: '노드 조작',
      items: [
        { keys: ['Ctrl', 'A'], description: '모든 노드 선택' },
        { keys: ['Ctrl', 'D'], description: '선택 해제' },
        { keys: ['Ctrl', 'F'], description: '노드 검색' },
      ]
    }
  ];

  return (
    <div className="keyboard-shortcuts-overlay" onClick={() => setIsOpen(false)}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ 키보드 단축키</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </div>
        
        <div className="shortcuts-content">
          {shortcuts.map((section, idx) => (
            <div key={idx} className="shortcuts-section">
              <h3>{section.category}</h3>
              <div className="shortcuts-list">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="shortcut-item">
                    <div className="shortcut-keys">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd>{key}</kbd>
                          {keyIdx < item.keys.length - 1 && <span className="plus">+</span>}
                        </span>
                      ))}
                    </div>
                    <div className="shortcut-description">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="shortcuts-footer">
          <p>💡 <strong>Tip:</strong> 언제든지 <kbd>?</kbd> 키를 눌러 이 창을 열 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
