import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";

// 줄 높이(h-11 = 44). 제목들을 세로로 쌓아 두고 이 높이만큼씩 밀어 올린다.
const ROW_HEIGHT = 44;
// 다음 공지로 넘어가는 간격과 밀어 올리는 시간.
const ROTATE_INTERVAL_MS = 4000;
const SLIDE_DURATION_MS = 350;

interface NoticeBarProps {
  /** 돌려 보여 줄 공지들 (최신순). 1건이면 고정, 2건 이상이면 일정 간격으로 세로로 넘어간다 */
  notices: { id: string; title: string }[];
  /** 확성기를 눌렀을 때 — 공지 목록으로 */
  onListPress: () => void;
  /** 제목을 눌렀을 때 — 그 순간 보이는 공지 상세로 */
  onNoticePress: (id: string) => void;
}

// 홈 맨 위 공지 한 줄. 왼쪽 확성기는 공지 목록, 제목은 그 공지의 상세로 이동한다.
// 공지가 여러 건이면 4초마다 아래에서 위로 밀려 올라오며 다음 공지로 바뀐다 (손을 대고 있는 동안은 멈춘다).
// 공지가 없으면 호출부가 아예 그리지 않는다.
//
// 제목들을 한 줄짜리 세로 띠로 쌓고 띠 전체를 위로 밀어 올린다. 맨 뒤에 첫 공지를 한 번 더 붙여 두고,
// 거기까지 올라온 뒤에 띠를 처음 위치로 되돌린다 — 되돌리는 순간 보이는 글이 똑같아서 깜빡임이 없다.
// (예전 방식은 "현재/다음" 두 글을 겹쳐 두고 애니메이션 값을 0으로 되돌렸는데, 값 되돌리기와 글 교체가
// 한 프레임 어긋나면 옛 글이 잠깐 다시 보였다.)
export function NoticeBar({ notices, onListPress, onNoticePress }: NoticeBarProps) {
  // 보이는 공지의 위치 (0..N-1). 넘어가는 애니메이션이 끝난 뒤에만 바뀐다.
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const focused = useIsFocused();
  const offset = useRef(new Animated.Value(0)).current;
  // 타이머 콜백이 항상 최신 위치를 읽도록 ref로도 들고 있는다.
  const positionRef = useRef(0);

  const count = notices.length;
  // 마지막 뒤에 첫 공지를 한 번 더 붙인 띠.
  const strip = useMemo(
    () => (count > 1 ? [...notices, notices[0]] : notices),
    [notices, count],
  );
  // 공지가 바뀌었는지 판단하는 키 — 새로고침으로 같은 목록이 다시 와도 위치를 흔들지 않는다.
  const listKey = notices.map((notice) => notice.id).join(",");

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // 공지 목록이 실제로 바뀌면 처음으로 되돌린다.
  useEffect(() => {
    positionRef.current = 0;
    setPosition(0);
    offset.setValue(0);
  }, [listKey, offset]);

  const rotating = count > 1 && focused && !paused;

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => {
      const from = positionRef.current;
      const to = from + 1; // count이면 맨 뒤에 붙인 첫 공지 사본
      const settle = () => {
        // 사본까지 왔으면 처음으로 되돌린다 — 사본과 첫 공지가 같은 글이라 눈에는 변화가 없다.
        const settled = to >= count ? 0 : to;
        positionRef.current = settled;
        if (to >= count) offset.setValue(0);
        setPosition(settled);
      };
      if (reduceMotion) {
        offset.setValue(-(to >= count ? 0 : to) * ROW_HEIGHT);
        settle();
        return;
      }
      Animated.timing(offset, {
        toValue: -to * ROW_HEIGHT,
        duration: SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) settle();
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [rotating, reduceMotion, count, offset]);

  const current = notices[position % Math.max(count, 1)];
  if (!current) return null;

  return (
    <View className="h-11 flex-row items-center rounded-xl bg-background-alternative px-3">
      <Pressable className="pr-3 active:opacity-60" onPress={onListPress} hitSlop={8}>
        <Icon name="announcement" size={22} />
      </Pressable>
      <Pressable
        className="h-11 flex-1 overflow-hidden"
        onPress={() => onNoticePress(current.id)}
        // 누르고 있는 동안 멈춘다 — 누르는 순간 다른 공지로 넘어가 엉뚱한 상세가 열리는 걸 막는다.
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
      >
        <Animated.View style={{ transform: [{ translateY: offset }] }}>
          {strip.map((notice, stripIndex) => (
            <View
              key={`${notice.id}-${stripIndex}`}
              style={{ height: ROW_HEIGHT, justifyContent: "center" }}
            >
              <Text className="text-body-main text-text-normal" numberOfLines={1}>
                {notice.title}
              </Text>
            </View>
          ))}
        </Animated.View>
      </Pressable>
    </View>
  );
}
