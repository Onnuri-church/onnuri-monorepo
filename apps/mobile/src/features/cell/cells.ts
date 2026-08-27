// 전체 셀 목록 목업. 셀 API가 생기면 이 파일을 지우고 서버 데이터로 교체한다.
// 셀 이름은 프로필 설정 화면의 선택지와 같은 실제 셀 구성을 따랐다.
// myCell 판별은 마이페이지 목업(누리셀)과 맞춘 임시 값이다 — 유저 정보 연동 시 함께 정리.
export interface Cell {
  id: string;
  name: string;
  leaderName: string;
  viceLeaderName: string | null;
}

export const MY_CELL_ID = "nuri";

// 개별 셀 페이지가 라우트 param(cellId)으로 셀 정보를 찾을 때 쓴다 (팀스토리의 findTeam과 같은 패턴).
export function findCell(id: string): Cell | undefined {
  return CELLS.find((cell) => cell.id === id);
}

export const CELLS: Cell[] = [
  { id: "nuri", name: "누리셀", leaderName: "이서연", viceLeaderName: "김민준" },
  { id: "beomjun", name: "범준셀", leaderName: "김범준", viceLeaderName: null },
  { id: "sanghyun", name: "상현셀", leaderName: "박상현", viceLeaderName: "최지우" },
  { id: "subin", name: "수빈셀", leaderName: "신수빈", viceLeaderName: null },
  { id: "yeongwoo", name: "영우셀", leaderName: "정영우", viceLeaderName: null },
  { id: "yeeun", name: "예은셀", leaderName: "강예은", viceLeaderName: "한재민" },
  { id: "jisu", name: "지수셀", leaderName: "윤지수", viceLeaderName: null },
  { id: "jiyeon", name: "지연셀", leaderName: "오지연", viceLeaderName: null },
  { id: "jihwan", name: "지환셀", leaderName: "이지환", viceLeaderName: "남현지" },
  { id: "junyoung", name: "준영셀", leaderName: "장준영", viceLeaderName: null },
  { id: "hyunho", name: "현호셀", leaderName: "서현호", viceLeaderName: null },
  { id: "hyemin", name: "혜민셀", leaderName: "임혜민", viceLeaderName: null },
  { id: "hyowon", name: "효원셀", leaderName: "고효원", viceLeaderName: null },
];
