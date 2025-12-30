import { useState } from 'react';
import { 
  pipelineTemplates, 
  templateCategories, 
  difficultyLevels,
  getTemplatesByCategory,
  getTemplatesByDifficulty 
} from '../utils/pipelineTemplates';
import './TemplateGallery.css';

/**
 * TemplateGallery - 파이프라인 템플릿 갤러리
 * 
 * 사용자가 미리 정의된 템플릿을 선택하여 빠르게 시작할 수 있습니다.
 */
const TemplateGallery = ({ onSelectTemplate, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // 필터링된 템플릿
  const filteredTemplates = pipelineTemplates.filter(template => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const handleSelectTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    if (onClose) {
      onClose();
    }
  };

  const getDifficultyColor = (difficulty) => {
    const level = difficultyLevels.find(d => d.id === difficulty);
    return level ? level.color : '#999';
  };

  return (
    <div className="template-gallery-overlay" onClick={onClose}>
      <div className="template-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-gallery-header">
          <div>
            <h2>🎨 파이프라인 템플릿</h2>
            <p>미리 만들어진 템플릿으로 빠르게 시작하세요</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="template-gallery-filters">
          {/* 카테고리 필터 */}
          <div className="filter-group">
            <label>카테고리</label>
            <div className="filter-buttons">
              {templateCategories.map(category => (
                <button
                  key={category.id}
                  className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="filter-icon">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 난이도 필터 */}
          <div className="filter-group">
            <label>난이도</label>
            <div className="filter-buttons">
              {difficultyLevels.map(level => (
                <button
                  key={level.id}
                  className={`filter-btn ${selectedDifficulty === level.id ? 'active' : ''}`}
                  onClick={() => setSelectedDifficulty(level.id)}
                  style={selectedDifficulty === level.id ? { 
                    borderColor: level.color,
                    backgroundColor: `${level.color}20`
                  } : {}}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="template-gallery-content">
          {filteredTemplates.length === 0 ? (
            <div className="no-templates">
              <p>해당 조건에 맞는 템플릿이 없습니다.</p>
            </div>
          ) : (
            <div className="templates-grid">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id} 
                  className="template-card"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="template-icon">{template.icon}</div>
                  <div className="template-info">
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                    <div className="template-meta">
                      <span 
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(template.difficulty) }}
                      >
                        {difficultyLevels.find(d => d.id === template.difficulty)?.name}
                      </span>
                      <span className="node-count">
                        {template.nodes.length} 노드
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="template-gallery-footer">
          <p>💡 템플릿을 클릭하면 에디터에 자동으로 로드됩니다</p>
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
