import React, { useState, useEffect } from 'react';
import { 
    generatePythonCode, 
    saveGeminiApiKey, 
    getStoredGeminiApiKey,
    removeGeminiApiKey 
} from '../utils/geminiPipeline';
import { useToast } from './toast/ToastProvider.jsx';

/**
 * Gemini API를 사용한 Python 코드 생성 컴포넌트
 */
const GeminiPipelineGenerator = () => {
    const toast = useToast();
    const [apiKey, setApiKey] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
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
        setGeneratedCode('');
        
        try {
            const code = await generatePythonCode(prompt);
            setGeneratedCode(code);
            toast.success('코드가 생성되었습니다!');
        } catch (error) {
            console.error('코드 생성 오류:', error);
            toast.error(error.message || '코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        toast.success('코드가 클립보드에 복사되었습니다!');
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
                    🤖 AI Python 코드 생성
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
                            원하는 ML 코드를 설명해주세요
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
                            transition: 'background-color 0.2s',
                            marginBottom: '15px'
                        }}
                    >
                        {isGenerating ? '🔄 생성 중...' : '✨ AI로 코드 생성하기'}
                    </button>

                    {/* 생성된 코드 표시 */}
                    {generatedCode && (
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 15px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)'
                                }}>
                                    생성된 Python 코드
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📋 복사
                                </button>
                            </div>
                            <pre style={{
                                margin: 0,
                                padding: '15px',
                                fontSize: '13px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                color: 'var(--text-primary)',
                                backgroundColor: '#1e1e1e',
                                overflow: 'auto',
                                maxHeight: '500px',
                                lineHeight: '1.5'
                            }}>
                                <code>{generatedCode}</code>
                            </pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GeminiPipelineGenerator;
