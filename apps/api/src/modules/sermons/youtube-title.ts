// 교회 유튜브 채널의 예배 영상 제목을 설교 정보로 쪼갠다.
//
// 예: 주일 4부 예배 [26.09.13.주일] | " 나를 따르라 #23 " 누가 왕인가 " | 원준호 목사 | 마태복음 6장 10절 | 부산온누리교회 청년부
//
// 머리(예배명 [YY.MM.DD.요일])는 회차마다 같지만 뒷부분은 시기마다 다르다 — 따옴표 위치가
// 제각각이고, 설교자가 빠진 회차가 있고, 끝의 교회명 앞 구분자가 `|` 대신 `/`인 회차도 있다.
// 그래서 머리 뒤는 순서가 아니라 모양으로 가른다. 머리가 없는 영상(찬양·홍보영상 등)은
// 설교가 아니므로 null.

export interface ParsedSermonTitle {
  /** "주일 4부 예배" */
  serviceName: string;
  /** 예배일 — UTC 자정 (WorshipService.date가 @db.Date라서) */
  date: Date;
  /** "나를 따르라 #23 누가 왕인가" */
  title: string;
  /** "마태복음 6장 10절" */
  passage: string | null;
  /** "원준호 목사" */
  preacher: string | null;
}

const HEADER = /^(.+?)\s*\[(\d{2})\.(\d{2})\.(\d{2})\.[^\]]*\]\s*\|?(.*)$/;
const CHURCH_SUFFIX = /\s*[|/]\s*부산\s*온누리\s*교회\s*청년부\s*$/;
const PREACHER = /(목사|전도사|강도사|선교사)님?$/;

export function parseSermonTitle(raw: string): ParsedSermonTitle | null {
  const match = HEADER.exec(raw.trim());
  if (!match) return null;
  const [, serviceName, yy, mm, dd, rest] = match;

  const [titlePart, ...others] = rest
    .replace(CHURCH_SUFFIX, '')
    .split('|')
    .map((part) => part.trim());
  // 따옴표는 위치가 회차마다 달라 의미가 없다 — 지우고 공백만 정리한다.
  const title = titlePart.replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
  if (!title) return null;

  const preacher = others.find((part) => PREACHER.test(part)) ?? null;
  const passage =
    others.filter((part) => part && part !== preacher).join(', ') || null;

  return {
    serviceName: serviceName.trim(),
    date: new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd))),
    title,
    passage,
    preacher,
  };
}
