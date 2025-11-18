# Netlify Functions를 사용한 안전한 Gemini API 통합 가이드

이 프로젝트는 Netlify Functions를 사용하여 Gemini API 키를 안전하게 서버 측에서 관리합니다.

## 🔐 보안 개선사항

**이전 (클라이언트 측)**:
- ❌ API 키가 브라우저 코드에 노출
- ❌ 누구나 개발자 도구로 API 키 확인 가능
- ❌ 악용 가능성 높음

**현재 (서버리스 함수)**:
- ✅ API 키가 서버 측에서만 존재
- ✅ 브라우저에 절대 노출되지 않음
- ✅ Netlify 환경변수로 안전하게 관리

## 📦 배포 방법

### 1. Netlify에 프로젝트 연결

Netlify 대시보드에서:
1. **New site from Git** 클릭
2. GitHub 저장소 선택 (`CREATIVE_AI`)
3. 브랜치: `dev`
4. Build command: `npm run build`
5. Publish directory: `dist`

### 2. 환경변수 설정 (매우 중요!)

Netlify 대시보드에서:
1. **Site settings** → **Environment variables** 이동
2. **Add a variable** 클릭
3. 다음 환경변수 추가:

```
Key: GEMINI_API_KEY
Value: AIzaSyAmrkC22LaJeMV6pcsdy38uHRhDrXe3-Og
```

⚠️ **주의**: Scopes는 "All environments" 선택

### 3. 배포 확인

1. Netlify가 자동으로 빌드 시작
2. Functions 탭에서 `gemini` 함수 확인
3. 배포된 사이트 접속하여 AI 코드 생성 테스트

## 🛠️ 로컬 개발

로컬에서는 여전히 `.env` 파일의 API 키 사용:

```bash
# .env 파일
VITE_GEMINI_API_KEY=AIzaSyAmrkC22LaJeMV6pcsdy38uHRhDrXe3-Og
```

**자동 감지**:
- `localhost` 접속 시 → `.env`의 API 키 사용 (직접 호출)
- 배포된 사이트 접속 시 → Netlify Functions 사용 (안전)

## 📂 파일 구조

```
CREATIVE_AI/
├── netlify.toml                    # Netlify 설정 파일
├── netlify/
│   └── functions/
│       └── gemini.js               # 서버리스 함수 (API 키 보호)
├── src/
│   └── utils/
│       └── geminiPipeline.ts       # 클라이언트 코드 (수정됨)
└── .env                            # 로컬 개발용 (Git 무시됨)
```

## 🔄 작동 방식

### 프로덕션 (배포 후)
```
사용자 브라우저
    ↓ POST /.netlify/functions/gemini
Netlify Function (gemini.js)
    ↓ API 키 추가
Gemini API
    ↓ 응답
Netlify Function
    ↓ 결과만 반환
사용자 브라우저 (API 키 노출 안 됨! ✅)
```

### 로컬 개발
```
사용자 브라우저 (localhost)
    ↓ .env의 API 키 사용
Gemini API (직접 호출)
    ↓ 응답
사용자 브라우저
```

## ✅ 배포 체크리스트

- [ ] `netlify.toml` 파일 확인
- [ ] `netlify/functions/gemini.js` 파일 확인
- [ ] GitHub에 푸시
- [ ] Netlify에서 저장소 연결
- [ ] **환경변수 `GEMINI_API_KEY` 설정** (가장 중요!)
- [ ] 빌드 성공 확인
- [ ] Functions 탭에서 `gemini` 함수 확인
- [ ] 배포된 사이트에서 AI 기능 테스트

## 🚨 문제 해결

### "API 키가 설정되지 않았습니다" 오류
→ Netlify 환경변수 설정 확인

### Function 호출 실패
→ Netlify Functions 탭에서 로그 확인

### CORS 오류
→ `gemini.js`의 CORS 헤더 확인 (이미 설정됨)

## 💰 비용

- Netlify Functions: **무료** (월 125,000 요청까지)
- Gemini API (Tier1): **무료** (일 1,500 요청)

→ 충분한 무료 사용량! 🎉

## 🔒 보안 확인

1. 브라우저 개발자 도구 → Network 탭 열기
2. AI 코드 생성 실행
3. `/.netlify/functions/gemini` 요청 확인
4. **API 키가 보이면 안 됨!** ✅
