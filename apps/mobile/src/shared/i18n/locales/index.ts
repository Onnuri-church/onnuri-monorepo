// 언어별 번역 묶음 — 키는 한국어 원문이다 (shared/i18n/index.ts 설명 참고). 한국어는 파일이 없다(키가 곧 문구).
// 지금은 English만 지원한다. 파일을 추가하면 아래 두 곳에 같은 이름을 적는다.

import en_g0 from "./en/g0-settings.json";
import en_g1 from "./en/g1-admin-a.json";
import en_g2 from "./en/g2-admin-b.json";
import en_g3 from "./en/g3-cell.json";
import en_g4 from "./en/g4-meeting.json";
import en_g5 from "./en/g5-boards.json";
import en_g6 from "./en/g6-team.json";
import en_g7 from "./en/g7-shared.json";
import en_g8 from "./en/g8-plural.json";

export const resources = {
  en: {
    translation: {
      ...en_g0,
      ...en_g1,
      ...en_g2,
      ...en_g3,
      ...en_g4,
      ...en_g5,
      ...en_g6,
      ...en_g7,
      ...en_g8,
    } as Record<string, string>,
  },
};
