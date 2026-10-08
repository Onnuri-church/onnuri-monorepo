// 언어별 번역 묶음 — 키는 한국어 원문이다 (shared/i18n/index.ts 설명 참고). 파일을 추가하면 아래 두 곳에 같은 이름을 적는다.

import en_g0 from "./en/g0-settings.json";
import en_g1 from "./en/g1-admin-a.json";
import en_g2 from "./en/g2-admin-b.json";
import en_g3 from "./en/g3-cell.json";
import en_g4 from "./en/g4-meeting.json";
import en_g5 from "./en/g5-boards.json";
import en_g6 from "./en/g6-team.json";
import en_g7 from "./en/g7-shared.json";
import zh_g0 from "./zh/g0-settings.json";
import zh_g1 from "./zh/g1-admin-a.json";
import zh_g2 from "./zh/g2-admin-b.json";
import zh_g3 from "./zh/g3-cell.json";
import zh_g4 from "./zh/g4-meeting.json";
import zh_g5 from "./zh/g5-boards.json";
import zh_g6 from "./zh/g6-team.json";
import zh_g7 from "./zh/g7-shared.json";
import ja_g0 from "./ja/g0-settings.json";
import ja_g1 from "./ja/g1-admin-a.json";
import ja_g2 from "./ja/g2-admin-b.json";
import ja_g3 from "./ja/g3-cell.json";
import ja_g4 from "./ja/g4-meeting.json";
import ja_g5 from "./ja/g5-boards.json";
import ja_g6 from "./ja/g6-team.json";
import ja_g7 from "./ja/g7-shared.json";
import fr_g0 from "./fr/g0-settings.json";
import fr_g1 from "./fr/g1-admin-a.json";
import fr_g2 from "./fr/g2-admin-b.json";
import fr_g3 from "./fr/g3-cell.json";
import fr_g4 from "./fr/g4-meeting.json";
import fr_g5 from "./fr/g5-boards.json";
import fr_g6 from "./fr/g6-team.json";
import fr_g7 from "./fr/g7-shared.json";

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
    } as Record<string, string>,
  },
  zh: {
    translation: {
      ...zh_g0,
      ...zh_g1,
      ...zh_g2,
      ...zh_g3,
      ...zh_g4,
      ...zh_g5,
      ...zh_g6,
      ...zh_g7,
    } as Record<string, string>,
  },
  ja: {
    translation: {
      ...ja_g0,
      ...ja_g1,
      ...ja_g2,
      ...ja_g3,
      ...ja_g4,
      ...ja_g5,
      ...ja_g6,
      ...ja_g7,
    } as Record<string, string>,
  },
  fr: {
    translation: {
      ...fr_g0,
      ...fr_g1,
      ...fr_g2,
      ...fr_g3,
      ...fr_g4,
      ...fr_g5,
      ...fr_g6,
      ...fr_g7,
    } as Record<string, string>,
  },
};
