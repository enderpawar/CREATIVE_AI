import React, { useState, useEffect } from 'react';
import { 
    generatePipelineFromPrompt, 
    saveGeminiApiKey, 
    getStoredGeminiApiKey,
    removeGeminiApiKey 
} from '../utils/geminiPipeline';
import { useToast } from './toast/ToastProvider.jsx';

/**
 * Gemini API를 사용한 파이프라인 자동 생성 컴포넌트
 */
const GeminiPipelineGenerator = ({ onPipelineGenerated }) => {
    const toast = useToast();
    const [apiKey, setApiKey] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // 저장된 API 키 확인
    useEffect(() => {
        const stored = getStoredGeminiApiKey();
        if (stored) {
            setHasApiKey(true);
            setApiKey(stored);
        }
    }, []);

    const handleSaveApiKey = () => {
        if (!apiKey.trim()) {
            toast.error('API 키를 입력해주세요.');
            return;
        }
        
        saveGeminiApiKey(apiKey.trim());
        setHasApiKey(true);
        setShowApiKeyInput(false);
        toast.success('API 키가 저장되었습니다.');
    };

    const handleRemoveApiKey = () => {
        removeGeminiApiKey();
        setApiKey('');
        setHasApiKey(false);
        setShowApiKeyInput(true);
        toast.success('API 키가 삭제되었습니다.');
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('프롬프트를 입력해주세요.');
            return;
        }

        if (!hasApiKey) {
            toast.error('먼저 API 키를 설정해주세요.');
            setShowApiKeyInput(true);
            return;
        }

        setIsGenerating(true);
        
        try {
            const pipeline = await generatePipelineFromPrompt(prompt);
            
            if (onPipelineGenerated) {
                onPipelineGenerated(pipeline);
            }
            
            toast.success('파이프라인이 생성되었습니다!');
            setPrompt(''); // 성공 후 프롬프트 초기화
        } catch (error) {
            console.error('파이프라인 생성 오류:', error);
            toast.error(error.message || '파이프라인 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const examplePrompts = [
        '아이리스 데이터셋으로 꽃 분류하기',
        '주택 가격 예측 회귀 모델 만들기',
        '신경망으로 손글씨 숫자 분류하기'
    ];

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginTop: '20px'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '15px'
            }}>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px',
                    color: 'var(--text-primary)'
                }}>
                    🤖 AI 파이프라인 생성
                </h3>
                {hasApiKey && !showApiKeyInput && (
                    <button
                        onClick={() => setShowApiKeyInput(true)}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        API 키 관리
                    </button>
                )}
            </div>

            {/* API 키 설정 섹션 */}
            {(!hasApiKey || showApiKeyInput) && (
                <div style={{
                    padding: '15px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '6px',
                    marginBottom: '15px'
                }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: 'var(--text-primary)'
                    }}>
                        Gemini API 키
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '14px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            marginBottom: '10px'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSaveApiKey}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '14px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            저장
                        </button>
                        {hasApiKey && (
                            <>
                                <button
                                    onClick={() => setShowApiKeyInput(false)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '14px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRemoveApiKey}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                    <p style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                    }}>
                        💡 <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6' }}
                        >
                            Google AI Studio
                        </a>에서 무료 API 키를 발급받을 수 있습니다.
                    </p>
                </div>
            )}

            {/* 프롬프트 입력 섹션 */}
            {hasApiKey && !showApiKeyInput && (
                <>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)'
                        }}>
                            원하는 ML 파이프라인을 설명해주세요
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="예: 아이리스 데이터셋으로 꽃의 종류를 분류하는 랜덤 포레스트 모델을 만들어주세요"
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* 예시 프롬프트 */}
                    <div style={{ marginBottom: '15px' }}>
                        <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            💡 예시:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {examplePrompts.map((example, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPrompt(example)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                    }}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 생성 버튼 */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: isGenerating || !prompt.trim() ? '#6b7280' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isGenerating ? '🔄 생성 중...' : '✨ AI로 파이프라인 생성하기'}
                    </button>
                </>
            )}
        </div>
    );
};

export default GeminiPipelineGenerator;
