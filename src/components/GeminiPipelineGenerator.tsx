import React, { useState, useEffect } from 'react';
import { generatePythonCode } from '../utils/geminiPipeline';
import { listStoredCSVFiles, getCSVColumns } from '../utils/csvHandler';
import { useToast } from './toast/ToastProvider';
import { logger } from '../utils/logger';
import geminiIcon from '../assets/gemini-color.png';
import type { NodeGuide, Pipeline, PipelineNode } from '../types';

interface GeminiPipelineGeneratorProps {
    onApplyPipeline?: (pipeline: Pipeline) => void;
    logicId?: string;
}

/**
 * Gemini API를 사용한 Python 코드 생성 컴포넌트
 * 개발자의 Tier1 API로 동작하므로 사용자는 API 키 설정 없이 바로 사용 가능합니다.
 */
const GeminiPipelineGenerator: React.FC<GeminiPipelineGeneratorProps> = ({ onApplyPipeline, logicId }) => {
    const toast = useToast();
    const [prompt, setPrompt] = useState<string>('');
    const [, setGeneratedCode] = useState<string>(''); // 향후 코드 표시 기능에 사용
    const [nodeGuide, setNodeGuide] = useState<NodeGuide[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // 외부에서 프롬프트 설정 이벤트 수신
    useEffect(() => {
        const handleSetPrompt = (event: CustomEvent<string>) => {
            setPrompt(event.detail);
        };
        window.addEventListener('setGeminiPrompt', handleSetPrompt as EventListener);
        return () => window.removeEventListener('setGeminiPrompt', handleSetPrompt as EventListener);
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('프롬프트를 입력해주세요.');
            return;
        }

        setIsGenerating(true);
        setGeneratedCode('');
        setNodeGuide([]);
        
        try {
            // CSV 파일 및 컬럼 정보 수집
            const uploadedFiles = listStoredCSVFiles(logicId);
            let csvInfo = '';
            
            if (uploadedFiles.length > 0) {
                csvInfo = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                csvInfo += '📁 업로드된 CSV 파일 정보:\n';
                csvInfo += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                
                uploadedFiles.forEach(fileName => {
                    const columns = getCSVColumns(fileName, logicId);
                    csvInfo += `\n📄 파일명: ${fileName}\n`;
                    if (columns.length > 0) {
                        csvInfo += `   컬럼 목록: ${columns.join(', ')}\n`;
                        csvInfo += `   통계: 총 ${columns.length}개 컬럼\n`;
                    }
                });
                
                csvInfo += '\n⚠️ 중요: dataSplit 노드의 targetColumn은 반드시 위 컬럼 목록에 있는 정확한 컬럼명을 사용해야 합니다!\n';
                csvInfo += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            }
            
            const enhancedPrompt = prompt + csvInfo;
            const result = await generatePythonCode(enhancedPrompt);
            setGeneratedCode(result.code);
            setNodeGuide(result.nodeGuide || []);
            toast.success('코드가 생성되었습니다!');
        } catch (error) {
            logger.error('코드 생성 오류:', error);
            const errorMessage = error instanceof Error ? error.message : '코드 생성에 실패했습니다.';
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    // 향후 사용을 위해 주석 처리
    // const handleCopyCode = () => {
    //     navigator.clipboard.writeText(generatedCode);
    //     toast.success('코드가 클립보드에 복사되었습니다!');
    // };

    // const examplePrompts = [
    //     '아이리스 데이터셋으로 꽃 분류하기',
    //     '주택 가격 예측 회귀 모델 만들기',
    //     '신경망으로 손글씨 숫자 분류하기'
    // ];

    return (
        <div 
            data-gemini-generator
            style={{
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
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <img src={geminiIcon} alt="Gemini" style={{ width: '20px', height: '20px' }} />
                    노드 로직 배치 가이드 
                </h3>
            </div>

            {/* 프롬프트 입력 섹션 */}
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
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
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
                {isGenerating ? '🔄 생성 중...' : '✨ AI로 노드 가이드 생성하기'}
            </button>

            {/* 캔버스에 적용 버튼 */}
            {nodeGuide.length > 0 && onApplyPipeline && (
                <button
                    onClick={() => {
                        // NodeGuide를 파이프라인 형식으로 변환
                        const pipeline: Pipeline = {
                            nodes: nodeGuide.map((guide): PipelineNode => ({
                                id: `node-${guide.step}`,
                                step: guide.step,
                                kind: guide.nodeType,
                                type: guide.nodeType,
                                nodeType: guide.nodeType,
                                controls: guide.settings || {},
                                settings: guide.settings || {}
                                // position은 LogicEditorPage에서 자동 계산됨
                            })),
                            connections: []
                        };

                        // 연결 정보 생성
                        nodeGuide.forEach(guide => {
                            if (guide.connections?.from) {
                                guide.connections.from.forEach(conn => {
                                    pipeline.connections.push({
                                        source: `node-${conn.step}`,
                                        sourceOutput: conn.output,
                                        target: `node-${guide.step}`,
                                        targetInput: conn.input
                                    });
                                });
                            }
                        });

                        logger.debug('Generated pipeline:', pipeline);
                        onApplyPipeline(pipeline);
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        marginBottom: '15px',
                        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = '#059669')}
                    onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = '#10b981')}
                >
                    🎨 캔버스에 자동 배치하기
                </button>
            )}

            {/* 노드 배치 가이드 */}
            {nodeGuide.length > 0 && (
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    border: '1px solid var(--border-color)',
                    maxHeight: '500px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '15px 15px 12px 15px',
                        borderBottom: '1px solid var(--border-color)',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'var(--bg-primary)',
                        zIndex: 1
                    }}>
                        <h4 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>📋</span>
                            <span>노드 배치 가이드</span>
                            <span style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                fontWeight: 'normal',
                                marginLeft: 'auto'
                            }}>
                                ({nodeGuide.length}단계)
                            </span>
                        </h4>
                    </div>
                    <div style={{
                        padding: '12px 15px 15px 15px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        flex: 1
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                        {nodeGuide.map((guide, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '6px',
                                    borderLeft: '3px solid #3b82f6'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '6px'
                                }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {guide.step}
                                    </span>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {guide.nodeName}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                        color: '#3b82f6',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace'
                                    }}>
                                        {guide.nodeType}
                                    </span>
                                </div>
                                <div style={{
                                    margin: '6px 0 0 32px'
                                }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '13px',
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.5'
                                    }}>
                                        {guide.description}
                                    </p>
                                    {guide.reason && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 10px',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            borderLeft: '3px solid #3b82f6',
                                            borderRadius: '4px'
                                        }}>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: '#3b82f6',
                                                marginBottom: '4px'
                                            }}>
                                                💡 왜 이 노드를 사용하나요?
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--text-primary)',
                                                lineHeight: '1.6'
                                            }}>
                                                {guide.reason}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {guide.settings && Object.keys(guide.settings).length > 0 && (
                                    <div style={{
                                        marginTop: '8px',
                                        marginLeft: '32px',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: 'var(--text-secondary)',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        padding: '6px 10px',
                                        borderRadius: '4px'
                                    }}>
                                        <div style={{ 
                                            fontSize: '10px', 
                                            color: 'var(--text-secondary)', 
                                            marginBottom: '4px',
                                            fontWeight: '600'
                                        }}>
                                            ⚙️ 설정 값:
                                        </div>
                                        {Object.entries(guide.settings).map(([key, value]) => (
                                            <div key={key} style={{ marginBottom: '2px' }}>
                                                <span style={{ color: '#f59e0b' }}>{key}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>: </span>
                                                <span style={{ color: '#10b981' }}>
                                                    {typeof value === 'string' ? `"${value}"` : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* 연결 정보 - 간단하고 명확하게 */}
                                {guide.connections && (guide.connections.from?.length || guide.connections.to?.length) ? (
                                    <div style={{
                                        marginTop: '10px',
                                        marginLeft: '32px'
                                    }}>
                                        {/* 이 노드로 들어오는 연결 */}
                                        {guide.connections.from && guide.connections.from.length > 0 && (
                                            <div style={{
                                                marginBottom: '8px',
                                                padding: '8px 10px',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                borderLeft: '3px solid #10b981',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#10b981',
                                                    marginBottom: '6px'
                                                }}>
                                                    📥 입력 소켓에 연결하기:
                                                </div>
                                                {guide.connections.from.map((conn, connIdx) => {
                                                    const sourceNode = nodeGuide.find(n => n.step === conn.step);
                                                    const inputSocket = conn.input || 'data';
                                                    
                                                    return (
                                                        <div key={connIdx} style={{
                                                            fontSize: '12px',
                                                            color: 'var(--text-primary)',
                                                            marginBottom: '6px',
                                                            lineHeight: '1.6',
                                                            padding: '6px',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <div style={{ marginBottom: '3px' }}>
                                                                <code style={{ 
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '11px',
                                                                    color: '#10b981',
                                                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {inputSocket}
                                                                </code>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> 입력 소켓에</span>
                                                            </div>
                                                            <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(16, 185, 129, 0.3)' }}>
                                                                <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                                    {conn.step}단계
                                                                </span>
                                                                <span style={{ color: 'var(--text-secondary)' }}> ({sourceNode?.nodeName})의 </span>
                                                                <code style={{ 
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '11px',
                                                                    color: '#f59e0b',
                                                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {conn.output}
                                                                </code>
                                                                <span style={{ color: 'var(--text-secondary)' }}> 출력 연결</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        
                                        {/* 이 노드에서 나가는 연결 */}
                                        {guide.connections.to && guide.connections.to.length > 0 && (
                                            <div style={{
                                                padding: '8px 10px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                borderLeft: '3px solid #3b82f6',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#3b82f6',
                                                    marginBottom: '6px'
                                                }}>
                                                    📤 출력 소켓에서 내보내기:
                                                </div>
                                                {guide.connections.to.map((conn, connIdx) => {
                                                    const targetNode = nodeGuide.find(n => n.step === conn.step);
                                                    const outputSocket = conn.output || 'scaled';
                                                    
                                                    return (
                                                        <div key={connIdx} style={{
                                                            fontSize: '12px',
                                                            color: 'var(--text-primary)',
                                                            marginBottom: '6px',
                                                            lineHeight: '1.6',
                                                            padding: '6px',
                                                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <div style={{ marginBottom: '3px' }}>
                                                                <code style={{ 
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '11px',
                                                                    color: '#3b82f6',
                                                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {outputSocket}
                                                                </code>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> 출력 소켓을</span>
                                                            </div>
                                                            <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(59, 130, 246, 0.3)' }}>
                                                                <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                                                                    {conn.step}단계
                                                                </span>
                                                                <span style={{ color: 'var(--text-secondary)' }}> ({targetNode?.nodeName})의 </span>
                                                                <code style={{ 
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '11px',
                                                                    color: '#3b82f6',
                                                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {conn.input}
                                                                </code>
                                                                <span style={{ color: 'var(--text-secondary)' }}> 입력에 연결</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeminiPipelineGenerator;
