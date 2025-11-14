import React, { useState, useCallback } from 'react';
import { loadCSVFile, saveCSVData, listStoredCSVFiles, deleteStoredCSV, validateCSV, loadStoredCSV } from '../utils/csvHandler';
import { useToast } from './toast/ToastProvider';

const CSVDataManager = ({ onSelectFile, theme = 'dark', logicId }) => {
    const toast = useToast();
    const [uploadedFiles, setUploadedFiles] = useState(listStoredCSVFiles(logicId));
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [showUploader, setShowUploader] = useState(false);

    // 테마에 따른 색상 정의
    const colors = {
        dark: {
            bg: 'bg-neutral-900/60',
            border: 'border-neutral-800/70',
            title: 'text-gray-200',
            text: 'text-gray-300',
            muted: 'text-gray-400',
            mutedLight: 'text-gray-500',
            sectionBg: 'bg-neutral-950',
            sectionBorder: 'border-neutral-800',
            itemBorder: 'border-neutral-700',
            itemBg: 'bg-neutral-800',
            itemHoverText: 'hover:text-white',
            selectedBorder: 'border-cyan-500',
            selectedBg: 'bg-cyan-950/30'
        },
        light: {
            bg: 'bg-white/80',
            border: 'border-gray-300',
            title: 'text-gray-800',
            text: 'text-gray-700',
            muted: 'text-gray-600',
            mutedLight: 'text-gray-500',
            sectionBg: 'bg-gray-50',
            sectionBorder: 'border-gray-200',
            itemBorder: 'border-gray-300',
            itemBg: 'bg-gray-100',
            itemHoverText: 'hover:text-gray-900',
            selectedBorder: 'border-cyan-600',
            selectedBg: 'bg-cyan-50'
        }
    };

    const c = colors[theme] || colors.dark;

    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('CSV 파일만 업로드 가능합니다');
            return;
        }

        try {
            const csvData = await loadCSVFile(file);
            
            // 검증
            const validation = validateCSV(csvData.content);
            if (!validation.valid) {
                toast.error(`CSV 검증 실패: ${validation.error}`);
                return;
            }

            // localStorage에 저장
            saveCSVData(csvData.fileName, csvData.content, logicId);
            
            // 목록 업데이트
            setUploadedFiles(listStoredCSVFiles(logicId));
            setPreview(csvData);
            setSelectedFile(csvData.fileName);
            
            toast.success(`${csvData.fileName} 업로드 완료! (${csvData.rows}행 × ${csvData.columns}열)`);
            
            // 부모 컴포넌트에 알림
            if (onSelectFile) {
                onSelectFile(csvData.fileName);
            }
        } catch (error) {
            console.error('CSV 업로드 오류:', error);
            toast.error('CSV 파일 업로드 실패');
        }
    }, [toast, onSelectFile]);

    const handleDeleteFile = useCallback((fileName) => {
        if (confirm(`${fileName}을(를) 삭제하시겠습니까?`)) {
            deleteStoredCSV(fileName, logicId);
            setUploadedFiles(listStoredCSVFiles(logicId));
            if (selectedFile === fileName) {
                setSelectedFile(null);
                setPreview(null);
            }
            toast.success('파일이 삭제되었습니다');
        }
    }, [selectedFile, toast, logicId]);

    const handleSelectFile = useCallback((fileName) => {
        setSelectedFile(fileName);
        
        // localStorage에서 파일 내용 로드하여 미리보기 생성
        const content = loadStoredCSV(fileName, logicId);
        if (content) {
            try {
                const lines = content.split('\n').filter(line => line.trim());
                
                // CSV 파싱
                const rows = lines.map(line => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result;
                });
                
                const previewData = rows.slice(0, 10);
                const columns = rows[0]?.length || 0;
                
                setPreview({
                    fileName,
                    content,
                    rows: rows.length,
                    columns,
                    preview: previewData
                });
                
                toast.success(`${fileName} 선택됨 (${rows.length}행 × ${columns}열)`);
            } catch (error) {
                console.error('미리보기 생성 오류:', error);
                toast.error('파일 미리보기 생성 실패');
                setPreview(null);
            }
        } else {
            toast.error('파일을 찾을 수 없습니다');
            setPreview(null);
        }
        
        if (onSelectFile) {
            onSelectFile(fileName);
        }
    }, [onSelectFile, toast, logicId]);

    return (
        <div className={`csv-data-manager p-4 ${c.bg} rounded-2xl border ${c.border}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${c.title}`}>📊 CSV 데이터 관리</h3>
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="px-3 py-1 text-sm font-semibold text-white bg-cyan-600 rounded hover:bg-cyan-500"
                >
                    {showUploader ? '닫기' : '+ 파일 추가'}
                </button>
            </div>

            {/* 파일 업로드 영역 */}
            {showUploader && (
                <div className={`mb-4 p-4 ${c.sectionBg} rounded-lg border ${c.sectionBorder}`}>
                    <label className={`block mb-2 text-sm font-medium ${c.text}`}>
                        CSV 파일 선택
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className={`block w-full text-sm ${c.muted}
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-cyan-600 file:text-white
                            hover:file:bg-cyan-500
                            cursor-pointer`}
                    />
                    <p className={`mt-2 text-xs ${c.mutedLight}`}>
                        CSV 파일을 선택하면 브라우저에 저장됩니다
                    </p>
                </div>
            )}

            {/* 업로드된 파일 목록 */}
            <div className="space-y-2">
                <h4 className={`text-sm font-medium ${c.muted}`}>저장된 파일</h4>
                {uploadedFiles.length === 0 ? (
                    <p className={`text-sm ${c.mutedLight}`}>저장된 CSV 파일이 없습니다</p>
                ) : (
                    <div className="space-y-1">
                        {uploadedFiles.map((fileName) => (
                            <div
                                key={fileName}
                                className={`flex items-center justify-between p-2 rounded border ${
                                    selectedFile === fileName
                                        ? `${c.selectedBg} ${c.selectedBorder}`
                                        : `${c.itemBg}/50 ${c.itemBorder}`
                                } hover:bg-neutral-700/50`}
                            >
                                <button
                                    onClick={() => handleSelectFile(fileName)}
                                    className={`flex-1 text-left text-sm ${c.text} ${c.itemHoverText}`}
                                >
                                    📄 {fileName}
                                </button>
                                <button
                                    onClick={() => handleDeleteFile(fileName)}
                                    className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300"
                                    title="삭제"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 미리보기 */}
            {preview && (
                <div className={`mt-4 p-3 ${c.sectionBg} rounded-lg border ${c.sectionBorder}`}>
                    <h4 className={`text-sm font-medium ${c.text} mb-2`}>미리보기</h4>
                    <div className="overflow-x-auto">
                        <table className={`min-w-full text-xs ${c.muted}`}>
                            <tbody>
                                {preview.preview.slice(0, 5).map((row, i) => (
                                    <tr key={i} className={i === 0 ? 'font-semibold text-cyan-600' : ''}>
                                        {row.map((cell, j) => (
                                            <td key={j} className={`px-2 py-1 border-b ${c.sectionBorder}`}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className={`mt-2 text-xs ${c.mutedLight}`}>
                        총 {preview.rows}행 × {preview.columns}열
                    </p>
                </div>
            )}
        </div>
    );
};

export default CSVDataManager;
