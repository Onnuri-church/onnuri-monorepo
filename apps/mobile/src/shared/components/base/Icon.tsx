import AddRoundLight from "../../assets/icons/add-round-light.svg";
import Announcement from "../../assets/icons/announcement.svg";
import ArrowDropDown from "../../assets/icons/arrow-drop-down.svg";
import Back from "../../assets/icons/back.svg";
import Bell from "../../assets/icons/bell.svg";
import BookOpenAltLight from "../../assets/icons/book-open-alt-light.svg";
import Bookmark from "../../assets/icons/bookmark.svg";
import BookmarkActive from "../../assets/icons/bookmark-active.svg";
import BoxFill from "../../assets/icons/box-fill.svg";
import Calendar from "../../assets/icons/calendar.svg";
import Card from "../../assets/icons/card.svg";
import Chat from "../../assets/icons/chat.svg";
import CloseSquare from "../../assets/icons/close-square.svg";
import CommentLight from "../../assets/icons/comment-light.svg";
import Edit from "../../assets/icons/edit.svg";
import Expand from "../../assets/icons/expand.svg";
import ExpandRight from "../../assets/icons/expand-right.svg";
import Export from "../../assets/icons/export.svg";
import EyeOff from "../../assets/icons/eye-off.svg";
import FavoriteLight from "../../assets/icons/favorite-light.svg";
import Home from "../../assets/icons/home.svg";
import Jubo from "../../assets/icons/jubo.svg";
import More from "../../assets/icons/more.svg";
import NavHome from "../../assets/icons/nav-home.svg";
import Place from "../../assets/icons/place.svg";
import Search from "../../assets/icons/search.svg";
import SendFill from "../../assets/icons/send-fill.svg";
import Setting from "../../assets/icons/setting.svg";
import TrashCan from "../../assets/icons/trash-can.svg";
import User from "../../assets/icons/user.svg";
import Video from "../../assets/icons/video.svg";
import ViewLight from "../../assets/icons/view-light.svg";
import Write from "../../assets/icons/write.svg";
import { colors } from "../../theme/tokens";

// 아이콘은 여러 곳에서 가져온 SVG를 직접 모아서 쓴다 (팩 미설치).
// 화면 코드는 파일 경로를 모르고 name만 알면 되도록 여기서만 매핑한다 — 아이콘을 교체하거나
// 나중에 팩으로 갈아타도 사용처는 안 건드린다. 새 SVG는 assets/icons/에 넣고 여기 한 줄 추가.
const ICONS = {
  "add-round-light": AddRoundLight,
  announcement: Announcement,
  "arrow-drop-down": ArrowDropDown,
  back: Back,
  bell: Bell,
  bookmark: Bookmark,
  "bookmark-active": BookmarkActive,
  "book-open-alt-light": BookOpenAltLight,
  "box-fill": BoxFill,
  calendar: Calendar,
  card: Card,
  chat: Chat,
  "close-square": CloseSquare,
  "comment-light": CommentLight,
  edit: Edit,
  expand: Expand,
  // expand의 좌우 반전. 원본이 같은 벡터라 Figma도 scaleX(-1)로 쓰고 있다.
  "expand-right": ExpandRight,
  export: Export,
  "eye-off": EyeOff,
  "favorite-light": FavoriteLight,
  home: Home,
  jubo: Jubo,
  more: More,
  "nav-home": NavHome,
  place: Place,
  search: Search,
  "send-fill": SendFill,
  setting: Setting,
  "trash-can": TrashCan,
  user: User,
  video: Video,
  "view-light": ViewLight,
  write: Write,
} as const;

interface IconProps {
  name: keyof typeof ICONS;
  /** 정사각형 기준 한 변 길이(px). 원본 viewBox가 달라도 이 값으로 스케일된다. */
  size?: number;
  /** SVG 안의 색이 전부 currentColor로 치환돼 있어서(svgr.config.js) 여기서 결정된다. */
  color?: string;
}

export function Icon({ name, size = 24, color = colors.icon.normal }: IconProps) {
  const Source = ICONS[name];

  return <Source width={size} height={size} color={color} />;
}
