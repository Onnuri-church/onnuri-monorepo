import { parseSermonTitle } from './youtube-title';

// 실제 채널(@onnuri_youth) 제목들 — 시기마다 표기가 달라서 각 형태를 하나씩 둔다.
describe('parseSermonTitle', () => {
  it('최근 형식: 제목 안의 따옴표를 지우고 설교자·본문을 가른다', () => {
    expect(
      parseSermonTitle(
        '주일 4부 예배 [26.09.13.주일] | " 나를 따르라 #23 " 누가 왕인가 " | 원준호 목사 | 마태복음 6장 10절 | 부산온누리교회 청년부',
      ),
    ).toEqual({
      serviceName: '주일 4부 예배',
      date: new Date(Date.UTC(2026, 8, 13)),
      title: '나를 따르라 #23 누가 왕인가',
      passage: '마태복음 6장 10절',
      preacher: '원준호 목사',
    });
  });

  it('시리즈명이 따옴표 밖에 있는 형식', () => {
    expect(
      parseSermonTitle(
        '주일 4부 예배 [26.05.24.주일] | 나를 따르라 #11 " 아름다운 삶 " | 원준호 목사 | 마태복음 5:14-16, 고전 7:1-16 | 부산온누리교회 청년부',
      ),
    ).toMatchObject({
      title: '나를 따르라 #11 아름다운 삶',
      passage: '마태복음 5:14-16, 고전 7:1-16',
      preacher: '원준호 목사',
    });
  });

  it('설교자가 없고 교회명 앞 구분자가 / 인 형식', () => {
    expect(
      parseSermonTitle(
        '주일 4부 예배 [26.03.29.주일] | 나를따르라 #4 " 나에게 갇히지 않은 사람 " |  마태복음 5장 5절 / 시편 37편 1-7절 / 부산온누리교회 청년부',
      ),
    ).toMatchObject({
      date: new Date(Date.UTC(2026, 2, 29)),
      title: '나를따르라 #4 나에게 갇히지 않은 사람',
      passage: '마태복음 5장 5절 / 시편 37편 1-7절',
      preacher: null,
    });
  });

  it('예배 머리가 없는 영상(찬양·홍보 등)은 설교가 아니다', () => {
    expect(
      parseSermonTitle(
        '부산 온누리 교회 청년부 | 2025 여름 수련회 찬양 Song List | by Ezra Worship',
      ),
    ).toBeNull();
    expect(
      parseSermonTitle('부산 온누리 교회 청년부 설교 2020.08.02'),
    ).toBeNull();
  });
});
