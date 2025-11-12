import React, { useState, useCallback } from 'react';
import { loadCSVFile, saveCSVData, listStoredCSVFiles, deleteStoredCSV, validateCSV } from '../utils/csvHandler';
import { useToast } from './toast/ToastProvider';

const CSVDataManager = ({ onSelectFile }) => {
    const toast = useToast();
    const [uploadedFiles, setUploadedFiles] = useState(listStoredCSVFiles());
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [showUploader, setShowUploader] = useState(false);

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
            saveCSVData(csvData.fileName, csvData.content);
            
            // 목록 업데이트
            setUploadedFiles(listStoredCSVFiles());
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
            deleteStoredCSV(fileName);
            setUploadedFiles(listStoredCSVFiles());
            if (selectedFile === fileName) {
                setSelectedFile(null);
                setPreview(null);
            }
            toast.success('파일이 삭제되었습니다');
        }
    }, [selectedFile, toast]);

    const handleSelectFile = useCallback((fileName) => {
        setSelectedFile(fileName);
        if (onSelectFile) {
            onSelectFile(fileName);
        }
    }, [onSelectFile]);

    return (
        <div className="csv-data-manager p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200">📊 CSV 데이터 관리</h3>
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="px-3 py-1 text-sm font-semibold text-white bg-cyan-600 rounded hover:bg-cyan-500"
                >
                    {showUploader ? '닫기' : '+ 파일 추가'}
                </button>
            </div>

            {/* 파일 업로드 영역 */}
            {showUploader && (
                <div className="mb-4 p-4 bg-neutral-950 rounded-lg border border-neutral-800">
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                        CSV 파일 선택
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-cyan-600 file:text-white
                            hover:file:bg-cyan-500
                            cursor-pointer"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        CSV 파일을 선택하면 브라우저에 저장됩니다
                    </p>
                </div>
            )}

            {/* 업로드된 파일 목록 */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">저장된 파일</h4>
                {uploadedFiles.length === 0 ? (
                    <p className="text-sm text-gray-500">저장된 CSV 파일이 없습니다</p>
                ) : (
                    <div className="space-y-1">
                        {uploadedFiles.map((fileName) => (
                            <div
                                key={fileName}
                                className={`flex items-center justify-between p-2 rounded border ${
                                    selectedFile === fileName
                                        ? 'bg-cyan-900/30 border-cyan-600'
                                        : 'bg-neutral-800/50 border-neutral-700'
                                } hover:bg-neutral-700/50`}
                            >
                                <button
                                    onClick={() => handleSelectFile(fileName)}
                                    className="flex-1 text-left text-sm text-gray-300 hover:text-white"
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
                <div className="mt-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">미리보기</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-gray-400">
                            <tbody>
                                {preview.preview.slice(0, 5).map((row, i) => (
                                    <tr key={i} className={i === 0 ? 'font-semibold text-cyan-400' : ''}>
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-2 py-1 border-b border-neutral-800">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        총 {preview.rows}행 × {preview.columns}열
                    </p>
                </div>
            )}
        </div>
    );
};

export default CSVDataManager;
