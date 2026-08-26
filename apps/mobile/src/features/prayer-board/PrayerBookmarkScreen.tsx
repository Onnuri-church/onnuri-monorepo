import { fetchBookmarkedPrayers } from "./api";
import { PrayerFilterList } from "./components/PrayerFilterList";
import { PrayerMenu } from "./components/PrayerMenu";

// 게시판(PrayerBoardScreen)에서 ⋮ > "저장한 기도제목"으로 들어온다.
export function PrayerBookmarkScreen() {
  return (
    <>
      <PrayerFilterList
        name="bookmarked"
        fetchList={fetchBookmarkedPrayers}
        showBookmark
        emptyText="저장한 기도제목이 없어요"
      />
      <PrayerMenu title="저장한 기도제목" />
    </>
  );
}
