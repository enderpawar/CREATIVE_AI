import { useState, useMemo } from 'react';
import './SearchFilter.css';

/**
 * SearchFilter - 파이프라인 검색 및 필터링 컴포넌트
 * 
 * 파이프라인 목록을 검색하고, 날짜, 상태 등으로 필터링합니다.
 */
const SearchFilter = ({ logics, onFilter }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name'
  const [filterTag, setFilterTag] = useState('all'); // 'all', 'recent', 'starred'

  // 필터링 및 정렬 로직
  const filteredLogics = useMemo(() => {
    let result = [...logics];

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(logic => 
        logic.name.toLowerCase().includes(query) ||
        (logic.description && logic.description.toLowerCase().includes(query))
      );
    }

    // 태그 필터
    if (filterTag === 'recent') {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      result = result.filter(logic => 
        logic.createdAt && new Date(logic.createdAt).getTime() > sevenDaysAgo
      );
    } else if (filterTag === 'starred') {
      result = result.filter(logic => logic.starred);
    }

    // 정렬
    if (sortBy === 'newest') {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [logics, searchQuery, sortBy, filterTag]);

  // 부모 컴포넌트에 필터링된 결과 전달
  useMemo(() => {
    if (onFilter) {
      onFilter(filteredLogics);
    }
  }, [filteredLogics, onFilter]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="search-filter-container">
      {/* 검색 바 */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="파이프라인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={handleClearSearch}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="filter-controls">
        <div className="filter-tags">
          <button 
            className={`filter-tag ${filterTag === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTag('all')}
          >
            전체
          </button>
          <button 
            className={`filter-tag ${filterTag === 'recent' ? 'active' : ''}`}
            onClick={() => setFilterTag('recent')}
          >
            최근 7일
          </button>
          <button 
            className={`filter-tag ${filterTag === 'starred' ? 'active' : ''}`}
            onClick={() => setFilterTag('starred')}
          >
            ⭐ 즐겨찾기
          </button>
        </div>

        <div className="sort-controls">
          <label>정렬:</label>
          <select 
            className="sort-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      {/* 검색 결과 정보 */}
      {searchQuery && (
        <div className="search-results-info">
          <span className="results-count">
            "{searchQuery}" 검색 결과: {filteredLogics.length}개
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
