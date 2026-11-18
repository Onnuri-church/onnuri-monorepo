import { i18n } from "../i18n";

/** ISO 시각을 "38분 전"처럼 바꾼다. 상대 표기는 시간이 지나면 값이 변해서 서버가 문구로
 *  만들어 주면 캐시에 굳은 채로 남으므로, 서버는 ISO만 내리고 화면이 이걸 쓴다. */
export function toTimeAgo(isoDate: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000);
  if (minutes < 5) return i18n.t("방금 전");
  if (minutes < 60) return i18n.t("{{count}}분 전", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("{{count}}시간 전", { count: hours });
  return i18n.t("{{count}}일 전", { count: Math.floor(hours / 24) });
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const isKorean = () => !i18n.language || i18n.language.startsWith("ko");

/** 채팅 시각 — 카카오톡처럼 "오후 9:01" (영어면 "9:01 PM"). 기기 시간대 기준. */
export function toChatTime(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  if (isKorean()) return `${hours < 12 ? "오전" : "오후"} ${hour12}:${minutes}`;
  return `${hour12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** 채팅 날짜 구분선 — "2026년 11월 8일 일요일" (영어면 "Sunday, November 8, 2026"). */
export function toChatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  if (isKorean()) return `${y}년 ${m + 1}월 ${d}일 ${WEEKDAYS_KO[date.getDay()]}요일`;
  return `${WEEKDAYS_EN[date.getDay()]}, ${MONTHS_EN[m]} ${d}, ${y}`;
}

/** 두 시각이 기기 시간대로 같은 날인지 */
export function isSameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/** 두 시각이 같은 분인지 — 같은 사람이 같은 분에 연달아 보낸 메시지는 마지막에만 시각을 단다 (카카오톡처럼) */
export function isSameMinute(a: string, b: string): boolean {
  return Math.floor(new Date(a).getTime() / 60_000) === Math.floor(new Date(b).getTime() / 60_000);
}
