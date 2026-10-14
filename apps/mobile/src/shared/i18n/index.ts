import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "./locales";

export const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

// 번역 키는 한국어 원문 그대로다 — `t("로그아웃")`. 한국어는 번역 파일이 없고 키가 곧 화면 문구이며,
// 다른 언어는 locales/<언어>/*.json에서 "한국어 원문": "번역"으로 찾는다. 번역이 없는 문구는 키(한국어)가
// 그대로 보이므로 누락돼도 화면이 비지 않는다. 문구를 고치면 키가 바뀌므로 모든 언어 파일의 키도 같이 고친다.
// 값에 끼워 넣는 부분은 {{이름}}으로 쓴다: t("{{count}}명", { count }).
void i18n.use(initReactI18next).init({
  resources,
  lng: "ko",
  fallbackLng: "ko",
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export { i18n };
