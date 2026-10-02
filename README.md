# POE2 유틸리티

Path of Exile 2 유틸리티 모음입니다. https://poe2-utility.vercel.app

- **교환비**: 화폐가 서로 몇 대 몇으로 교환되는지 한 화면에서 비교
- **서판**: 창고 검색용 정규식 생성과 서판 옵션 경매장 시세
- **제작 가이드**: 풀매찬 반지, 5옵션 보석 제작 순서

시세는 [poe.ninja](https://poe.ninja/poe2) 교환 시장 데이터를 사용합니다. 원본은 대략 1시간 단위로 갱신되고, 이 앱은 5분 동안 캐시합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

로컬 Vite 서버가 `poe.ninja` API를 프록시하므로 CORS 없이 조회됩니다.

## Vercel 배포

이 프로젝트는 Vite 앱이고, 시세 API는 `/ninja` 경로로 프록시합니다. `vercel.json`이 그 경로를 `poe.ninja`로 넘깁니다.

### GitHub으로 올리기 (권장)

1. 이 폴더를 git 저장소로 만들고 GitHub에 푸시합니다.
2. [vercel.com](https://vercel.com)에 로그인한 뒤 **Add New… → Project**를 누릅니다.
3. 해당 GitHub 저장소를 Import 합니다.
4. Framework Preset이 `Vite`, Build Command가 `npm run build`, Output이 `dist`인지 확인한 뒤 Deploy 합니다.

이후 `main`에 푸시하면 자동으로 다시 배포됩니다.

### CLI로 올리기

```bash
npx vercel login
npx vercel
```

프로덕션 URL까지 바로 만들려면 `npx vercel --prod`를 사용합니다.
