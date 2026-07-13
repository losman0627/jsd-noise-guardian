# JSD 도시 소음 지킴이 v5 — Cloudflare Pages 배포 안내

## 포함 파일

- `index.html` — 화면 구조
- `styles.css` — 모바일·데스크톱 UI
- `app.js` — 마이크 측정, 주파수 분석, ANC 목표 잠금, 지도·AI 연동
- `_headers` — 마이크·위치 권한 및 기본 보안 헤더
- `_redirects` — 단일 페이지 라우팅
- `manifest.webmanifest`, `icon.svg` — 앱 아이콘과 설치 정보

ZIP 파일의 최상위에 `index.html`이 있도록 구성되어 있습니다. ZIP을 다시 풀지 않고 Cloudflare Pages의 드래그 앤드 드롭에 그대로 올릴 수 있습니다.

## Cloudflare Pages에 처음 배포하기

1. Cloudflare 대시보드에 로그인합니다.
2. 왼쪽 메뉴에서 **Workers & Pages**를 엽니다.
3. **Create application**을 누릅니다.
4. **Get started**를 선택합니다.
5. **Drag and drop your files**를 선택합니다.
6. 프로젝트 이름을 입력합니다. 예: `jsd-noise-guardian`
7. 제공된 `JSD_Cloudflare_v5.zip`을 업로드 영역에 끌어다 놓습니다.
8. **Deploy site** 또는 **Save and Deploy**를 누릅니다.
9. 배포가 끝나면 `https://프로젝트명.pages.dev` 주소로 접속합니다.
10. 휴대전화 Chrome에서 열고 마이크 권한을 허용합니다.

## 같은 주소로 업데이트하기

1. Cloudflare 대시보드에서 기존 Pages 프로젝트를 엽니다.
2. **Create a new deployment**를 누릅니다.
3. **Production** 배포를 선택합니다.
4. 새 ZIP을 올리고 배포합니다.
5. 기존 `pages.dev` 주소는 유지되고 사이트 내용만 교체됩니다.

## 기존 Apps Script 연결하기

1. 사이트 우측 상단의 `로컬 모드`를 누릅니다.
2. 기존 Google Apps Script 웹 앱의 `/exec` 주소를 입력합니다.
3. **연결 시험**을 누릅니다.
4. 정상 응답이 표시되면 **저장**을 누릅니다.

연결 가능한 기본 동작은 다음과 같습니다.

- `health`
- `saveMeasurement`
- `getMapData`
- `askAI`

기존 JSD v4.1 Apps Script의 JSONP 응답 및 `payload_b64` 방식과 호환되도록 제작했습니다.

## 300Hz 테스트 권장 순서

1. 다른 핸드폰이나 노트북에서 외부 소음 스피커로 300Hz를 재생합니다.
2. 측정용 핸드폰에는 ANC 출력 스피커만 유선으로 연결합니다.
3. `측정` 탭에서 마이크를 시작합니다.
4. `알고 있는 테스트 주파수`에 `300`을 입력합니다.
5. 입력 장치명과 에코 제거·소음 억제·자동 이득 상태를 확인합니다.
6. `ANC` 탭에서 목표를 300Hz로 잠급니다.
7. 유선 스피커의 물리 볼륨을 매우 낮게 두고 ANC를 시작합니다.
8. 목표 주파수 잔류값이 기준보다 커지면 앱이 자동 정지하지만, 불편한 소리가 나면 즉시 직접 정지합니다.

## 중요한 한계

- 표시 dB는 휴대전화 마이크의 디지털 입력을 보정한 추정값입니다.
- 단일 휴대전화·스피커의 ANC는 마이크가 있는 작은 지점에서만 효과가 나타날 수 있습니다.
- 브라우저와 운영체제가 에코 제거 또는 자동 이득을 강제로 적용할 수 있습니다.
- 유선 연결 시 내장 마이크가 헤드셋 마이크로 바뀔 수 있으므로 입력 장치명을 확인해야 합니다.
- Direct Upload 프로젝트는 나중에 같은 프로젝트를 Git 연동 방식으로 전환할 수 없습니다. Git 자동 배포가 필요하면 새 Pages 프로젝트를 만들어야 합니다.
