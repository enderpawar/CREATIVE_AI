/**
 * CSV 파일 처리 및 데이터 저장 유틸리티
 */

export interface CSVData {
    fileName: string
    content: string
    rows: number
    columns: number
    preview: string[][]
}

/**
 * CSV 파일을 읽고 파싱
 */
export async function loadCSVFile(file: File): Promise<CSVData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const lines = content.split('\n').filter(line => line.trim())
                
                if (lines.length === 0) {
                    reject(new Error('CSV 파일이 비어있습니다'))
                    return
                }
                
                // CSV 파싱 (간단한 구현)
                const rows = lines.map(line => {
                    // 콤마로 분리하되, 따옴표 안의 콤마는 무시
                    const result = []
                    let current = ''
                    let inQuotes = false
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i]
                        if (char === '"') {
                            inQuotes = !inQuotes
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim())
                            current = ''
                        } else {
                            current += char
                        }
                    }
                    result.push(current.trim())
                    return result
                })
                
                const preview = rows.slice(0, 10) // 처음 10줄 미리보기
                const columns = rows[0]?.length || 0
                
                resolve({
                    fileName: file.name,
                    content,
                    rows: rows.length,
                    columns,
                    preview
                })
            } catch (error) {
                reject(error)
            }
        }
        
        reader.onerror = () => {
            reject(new Error('파일 읽기 실패'))
        }
        
        reader.readAsText(file)
    })
}

/**
 * CSV 데이터를 localStorage에 저장
 */
export function saveCSVData(fileName: string, content: string): void {
    const key = `csv_data_${fileName}`
    localStorage.setItem(key, content)
}

/**
 * localStorage에서 CSV 데이터 로드
 */
export function loadStoredCSV(fileName: string): string | null {
    const key = `csv_data_${fileName}`
    return localStorage.getItem(key)
}

/**
 * 저장된 모든 CSV 파일 목록
 */
export function listStoredCSVFiles(): string[] {
    const files: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('csv_data_')) {
            files.push(key.replace('csv_data_', ''))
        }
    }
    return files
}

/**
 * CSV 파일 삭제
 */
export function deleteStoredCSV(fileName: string): void {
    const key = `csv_data_${fileName}`
    localStorage.removeItem(key)
}

/**
 * CSV 내용을 Python 코드로 변환
 */
export function csvToPythonCode(fileName: string, content: string): string {
    // CSV를 Base64로 인코딩하여 Python 코드에 포함
    const base64Content = btoa(unescape(encodeURIComponent(content)))
    
    return `# Load CSV data from embedded content
import io
import base64

csv_content = base64.b64decode('${base64Content}').decode('utf-8')
data = pd.read_csv(io.StringIO(csv_content))
print(f"Data loaded from ${fileName}: {data.shape}")
print("\\nFirst 5 rows:")
print(data.head())`
}

/**
 * CSV 데이터 검증
 */
export function validateCSV(content: string): { valid: boolean; error?: string } {
    try {
        const lines = content.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
            return { valid: false, error: '최소 2줄(헤더 + 데이터) 필요합니다' }
        }
        
        const firstRowLength = lines[0].split(',').length
        for (let i = 1; i < lines.length; i++) {
            const rowLength = lines[i].split(',').length
            if (rowLength !== firstRowLength) {
                return { valid: false, error: `${i + 1}번째 줄의 열 개수가 일치하지 않습니다` }
            }
        }
        
        return { valid: true }
    } catch (error) {
        return { valid: false, error: '파일 형식이 올바르지 않습니다' }
    }
}
