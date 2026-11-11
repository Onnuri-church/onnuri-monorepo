import configuration from '../src/config/configuration';

// 사진 주소 칸은 우리 저장소 주소만 받는다 (SCRUM-190) — 테스트도 그 모양의 주소를 쓴다.
// 실제 파일은 없어도 된다 (검증은 주소 모양만 본다). 설정은 AppModule을 불러온 뒤에 읽혀야 해서 호출 시점에 만든다.
export function img(name: string): string {
  const { storage } = configuration();
  return `${storage.url}/storage/v1/object/public/${storage.bucket}/e2e/${name}`;
}
