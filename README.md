# 하루 가계부

React + TypeScript + Vite로 만든 개인용 가계부 PWA입니다. iPhone과 PC에서 사용할 수 있는 모바일 중심 대시보드를 제공합니다.

## 실행

Node.js 22.12 이상을 사용하세요. 개발 환경에서는 Node.js 24로 검증했습니다.

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

개발 서버의 기본 포트는 5173입니다. 클라우드 환경에서 npm 기본 캐시 경로에 쓸 수 없다면 `npm ci --cache /tmp/daily-money-npm`을 사용하세요.

## 빌드와 검사

```bash
npm run build
npm run lint
npm run preview -- --host 0.0.0.0
```

빌드 결과는 `dist/`에 생성됩니다. preview 기본 포트는 4173입니다. PWA 서비스 워커는 프로덕션 빌드에서 생성되므로 오프라인 동작은 빌드 후 preview로 확인하세요.

별도 터미널에서 브라우저 기능 검사를 실행할 수 있습니다.

```bash
npx playwright install chromium
npm run test:smoke
```

이미 설치된 Chromium을 사용하려면 `CHROMIUM_PATH=/usr/bin/chromium npm run test:smoke`를 실행하세요. 다른 서버 주소를 검사하려면 `TEST_URL`을 설정하세요. 테스트는 격리된 브라우저 컨텍스트에서 예산 수정, 지출 추가/삭제, 큰 지출 제외, 데이터 유지, 월별 분리, 모바일/PC 가로 넘침, 오프라인 재접속을 확인합니다.

## 주요 기능

- 식비 500,000원, 생활비 400,000원, 육아 500,000원, 기타 200,000원: 기본 월 예산 1,600,000원
- ‘예산 수정’에서 선택한 달의 카테고리별 예산 변경. 수정하지 않은 달에는 기본값 적용
- 월 이동, 월별 사용액·잔액·사용률, 카테고리별 초과 금액 표시
- 날짜·카테고리·금액·메모를 포함한 지출 추가와 삭제
- ‘큰 지출’은 생활 예산과 사용률 계산에서 제외하고 별도로 집계. 날짜별 목록에는 함께 표시
- 초기 데이터는 비어 있으며 예시 지출을 실제 기록으로 저장하지 않음

## iPhone 홈 화면에 추가

1. `dist/`를 HTTPS 정적 호스팅의 도메인 루트(`/`)에 배포합니다.
2. iPhone Safari에서 사이트를 열고 공유 → ‘홈 화면에 추가’를 선택합니다.
3. 홈 화면의 ‘하루 가계부’를 실행합니다.

웹 앱 매니페스트, 192/512px 아이콘, Apple 터치 아이콘, standalone 표시 모드, 서비스 워커를 포함합니다. 온라인 최초 접속과 캐시 완료 후 오프라인에서 앱을 다시 열 수 있습니다. 개발용 HTTP LAN 주소는 iPhone에서 서비스 워커를 사용할 수 없으므로 HTTPS 배포로 검증하세요. 실제 iPhone 홈 화면 설치는 아직 테스트하지 않았습니다. 기본 빌드는 도메인 루트 배포 기준입니다. GitHub Pages 하위 경로는 아래 자동 배포 설정에서 처리합니다.

## 저장 계층과 향후 동기화

- `src/domain/money.ts`: 데이터 타입, 기본 예산, 월별 집계. 브라우저 저장소에 의존하지 않습니다.
- `src/data/repository.ts`: 비동기 `MoneyRepository` 인터페이스와 `LocalMoneyRepository` 구현
- `src/App.tsx`: 저장 계층을 통해 로드/저장하는 UI

로컬 저장 키는 `daily-money:v1`이며 버전 1 데이터에 월별 예산과 지출을 보관합니다. 향후 API 기반 저장소를 구현하고 `moneyRepository`의 구현을 교체할 수 있습니다. 기기 간 동기화에는 별도로 사용자 인증, 서버 저장소, 충돌 처리, 데이터 마이그레이션 설계가 필요합니다.

현재 데이터는 같은 기기·같은 브라우저·같은 출처에만 저장됩니다. 다른 기기와 자동 동기화되지 않으며 브라우저 데이터 삭제 시 사라집니다. Safari와 홈 화면 앱의 저장 공간이 공유된다고 가정하지 마세요. 백업/내보내기 및 암호화는 아직 제공하지 않습니다. 읽기 또는 저장 실패는 화면에 표시하고 기존 데이터를 자동으로 초기화하지 않습니다.

## 모바일에서 사용하기: GitHub Pages 배포

GitHub 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택하세요. 이후 **Actions → Deploy to GitHub Pages → Run workflow**로 배포를 실행할 수 있습니다. `main`에 변경 사항이 올라오면 자동으로 다시 배포됩니다.

배포 성공 후 사용 주소는 `https://jjongeunlee.github.io/daily_money_status/`입니다. Safari로 접속한 뒤 공유 → 홈 화면에 추가를 선택하세요. 이 주소는 배포가 완료되기 전에는 열리지 않습니다. 저장소 공개 여부와 GitHub 요금제에 따라 Pages 사용 가능 여부가 달라질 수 있습니다.

자동 배포는 `VITE_BASE_PATH=/daily_money_status/`로 빌드해 하위 경로용 아이콘·서비스 워커·매니페스트 경로를 설정합니다. 도메인 루트 배포는 환경 변수 없이 빌드하면 됩니다.
