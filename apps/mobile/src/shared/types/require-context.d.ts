// Metro가 번들 시점에 require.context를 주입한다(Webpack 호환 API) — Node.js 표준 require엔 없어서
// 선언이 없으면 tsc가 에러를 낸다. PhotoUploadBox/ImageUploadBoxSingle 등이 preset-images 폴더를
// 스캔할 때 쓴다.
interface RequireContext {
  keys(): string[];
  (id: string): unknown;
  resolve(id: string): string;
  id: string;
}

interface NodeRequire {
  context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
}
