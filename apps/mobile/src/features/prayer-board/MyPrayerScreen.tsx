import { useState } from "react";

import { fetchMyPrayers } from "./api";
import { PrayerFilterList } from "./components/PrayerFilterList";
import { PrayerMenu } from "./components/PrayerMenu";

// 게시판(PrayerBoardScreen)에서 ⋮ > "내 기도제목 보기"로 들어온다.
// 내가 쓴 글만 보는 화면이라 시안에 북마크 표시가 없다.
// 수정/삭제 줄은 들어오자마자 보이지 않고 ⋮ > "수정하기"로 켠다 — 삭제가 목록에 항상 떠 있으면
// 스크롤 중 오탭으로 글이 지워진다.
export function MyPrayerScreen() {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <PrayerFilterList
        name="mine"
        fetchList={fetchMyPrayers}
        editing={editing}
        emptyText="작성한 기도제목이 없어요"
      />
      {/* 내 화면이라 이동 항목(내 기도제목/저장한 기도제목)은 빼고 수정하기만 둔다. */}
      <PrayerMenu
        title="내 기도제목"
        items={[
          {
            icon: "edit",
            label: editing ? "수정 완료" : "수정하기",
            onPress: () => setEditing((prev) => !prev),
          },
        ]}
      />
    </>
  );
}
