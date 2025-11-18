/**
 * Netlify Serverless Function - Gemini API 프록시
 * API 키를 서버 측에서 안전하게 관리합니다.
 */

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // 환경변수에서 API 키 가져오기 (Netlify 대시보드에서 설정)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }),
      };
    }

    // 클라이언트로부터 받은 요청 본문
    const requestBody = JSON.parse(event.body);
    
    // Gemini API 호출
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API 오류:', errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: errorData.error?.message || 'Gemini API 호출 실패',
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('서버 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || '서버 오류가 발생했습니다.',
      }),
    };
  }
};
