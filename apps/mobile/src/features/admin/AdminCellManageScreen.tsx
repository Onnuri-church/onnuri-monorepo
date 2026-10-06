import { CellManageList } from "./components/CellManageList";

// 마이페이지 관리자 메뉴 > 셀 관리 — 생성은 목록 끝의 점선 행(2026-09-21 A안 시안,
// 헤더 생성 버튼에서 이동), 편집·삭제는 목록 행 스와이프.
// 관리자는 하단 탭 "셀 페이지"에서도 같은 목록을 본다(CellScreen).
export function AdminCellManageScreen() {
  return <CellManageList />;
}
