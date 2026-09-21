import { CellManageList } from "./components/CellManageList";

// 마이페이지 관리자 메뉴 > 셀 관리 — 생성은 헤더의 "생성" 버튼(RootNavigator 등록부),
// 편집·삭제는 목록 행 스와이프. 관리자는 하단 탭 "셀 페이지"에서도 같은 목록을 본다(CellScreen).
export function AdminCellManageScreen() {
  return <CellManageList />;
}
