const UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbwHY7B15trgsBZZcug2snywAO2AVg8LfmpshAdxlGa0Afe9d_yW-tyaewmSOix5IrEl/exec';

const ALLOWED_ACTIONS = new Set([
  'health',
  'saveMeasurement',
  'submitReport',
  'getMapData',
  'getAIStatus',
  'askAI',
  'getNews'
]);

function javascriptResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-content-type-options': 'nosniff',
      'access-control-allow-origin': '*'
    }
  });
}

function callbackError(callback, message, status = 502) {
  return javascriptResponse(
    `${callback}(${JSON.stringify({ ok: false, error: message })});`,
    status
  );
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const callback = requestUrl.searchParams.get('callback') || 'callback';
  const action = requestUrl.searchParams.get('action') || '';

  if (!/^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) {
    return javascriptResponse('/* invalid callback */', 400);
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return callbackError(callback, '지원하지 않는 서버 요청입니다.', 400);
  }

  const upstream = new URL(UPSTREAM_URL);
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key !== '_ts') upstream.searchParams.append(key, value);
  }
  upstream.searchParams.set('_proxy_ts', String(Date.now()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  try {
    const response = await fetch(upstream.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'application/javascript, text/javascript, */*'
      }
    });

    const text = await response.text();
    if (!response.ok) {
      return callbackError(callback, `백엔드 응답 오류 (${response.status})`, 502);
    }

    if (!text.trim()) {
      return callbackError(callback, '백엔드에서 빈 응답을 받았습니다.');
    }

    return javascriptResponse(text);
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? '백엔드 응답 시간이 초과되었습니다.'
      : '백엔드 중계 연결에 실패했습니다.';
    return callbackError(callback, message);
  } finally {
    clearTimeout(timer);
  }
}
