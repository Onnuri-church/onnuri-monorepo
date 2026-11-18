import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Image, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "../../../shared/components/base/Icon";
import { useRecentPhotos } from "./RecentPhotos";

interface AttachmentSheetProps {
  /** 손잡이를 아래로 끌어 닫을 때 */
  onClose: () => void;
  /** 패널 최소 높이 — 마지막 키보드 높이를 넘겨 키보드 ↔ 패널을 바꿀 때 채팅이 출렁이지 않게 한다 */
  minHeight?: number;
  /** 카메라로 바로 찍기 */
  onPickCamera: () => void;
  /** 앨범에서 사진·동영상 고르기 */
  onPickMedia: () => void;
  /** 파일(악보·문서) 고르기 */
  onPickFile: () => void;
  /** 투표 만들기 */
  onPickPoll: () => void;
  /** 최근 사진 줄에서 골라 바로 보내기 (SCRUM-241, 아이폰) */
  onSendRecent?: (uris: string[]) => void;
}

const TILE = 96;
const MAX_PICK = 20;

interface AttachmentRow {
  icon: IconName;
  /** 아이콘 칸 배경색 — 카카오톡처럼 종류마다 다른 색 */
  color: string;
  label: string;
  onPress: () => void;
}

// 단톡방 + 버튼을 눌렀을 때 입력줄 아래 키보드 자리에 들어가는 패널 (SCRUM-243) — 카카오톡처럼
// 채팅 목록이 그만큼 줄어 마지막 메시지가 패널 바로 위에 보인다. 예전엔 화면을 덮는 팝업이었다.
// 위에 카메라 칸 + 최근 사진, 아래에 사진·동영상 / 파일 / 투표 (SCRUM-228·241).
// 열려 있을 때만 그려지므로 고른 사진은 닫히면 저절로 비워진다.
export function AttachmentSheet({
  onClose,
  minHeight,
  onPickCamera,
  onPickMedia,
  onPickFile,
  onPickPoll,
  onSendRecent,
}: AttachmentSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const recent = useRecentPhotos(true);
  // 고른 순서대로 번호를 붙인다 (카카오톡처럼)
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (uri: string) =>
    setPicked((prev) =>
      prev.includes(uri)
        ? prev.filter((value) => value !== uri)
        : prev.length >= MAX_PICK
          ? prev
          : [...prev, uri],
    );

  // 위: 최근 사진 줄 (카메라 칸 + 사진첩 최근 사진, 아이폰) — SCRUM-228·241
  // 아래: 사진·동영상 / 파일 / 투표
  const rows: AttachmentRow[] = [
    { icon: "image", color: "#3FA55B", label: t("사진·동영상"), onPress: onPickMedia },
    { icon: "paperclip", color: "#8A93A6", label: t("파일"), onPress: onPickFile },
    { icon: "poll", color: "#F2A33A", label: t("투표"), onPress: onPickPoll },
  ];

  // 아래에서 올라오며 나타나고, 손잡이·제목 줄을 아래로 끌면 따라 내려가다 닫힌다 (카카오톡처럼).
  const offset = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.timing(offset, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [offset]);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => offset.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 60 || gesture.vy > 0.8) {
          onClose();
        } else {
          Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  return (
    <Animated.View
      className="rounded-t-3xl bg-background-normal"
      style={{ paddingBottom: insets.bottom + 8, minHeight, transform: [{ translateY: offset }] }}
    >
      {/* 손잡이 + 제목 줄 — 여기를 아래로 끌면 닫힌다 */}
      <View {...pan.panHandlers}>
        <View className="items-center pb-1 pt-2.5">
          <View className="h-1 w-10 rounded-full bg-background-assistive" />
        </View>
        {/* 최근 사진 — 고르면 오른쪽 위 "전송"이 켜진다 */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Text className="font-pretendard-semibold text-body-main text-text-normal">
            {t("최근 사진")}
          </Text>
          {recent.length > 0 && (
            <Pressable
              disabled={picked.length === 0}
              onPress={() => onSendRecent?.(picked)}
              className={
                picked.length > 0
                  ? "rounded-full bg-primary-normal px-4 py-1.5"
                  : "rounded-full bg-background-muted px-4 py-1.5"
              }
            >
              <Text
                className={
                  picked.length > 0
                    ? "text-body-small text-text-onImage"
                    : "text-body-small text-text-alternative"
                }
              >
                {picked.length > 0 ? t("전송 {{count}}", { count: picked.length }) : t("전송")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 6 }}
      >
        <Pressable
          onPress={onPickCamera}
          className="items-center justify-center rounded-2xl active:opacity-70"
          style={{ width: TILE, height: TILE, backgroundColor: "#9A9A9A" }}
          accessibilityLabel={t("카메라")}
        >
          <Icon name="camera" size={34} color="#FFFFFF" />
        </Pressable>
        {recent.map((photo) => {
          const order = picked.indexOf(photo.uri);
          return (
            <Pressable key={photo.id} onPress={() => togglePick(photo.uri)}>
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: TILE,
                  height: TILE,
                  borderRadius: 16,
                  opacity: order >= 0 ? 0.75 : 1,
                }}
                resizeMode="cover"
              />
              <View
                className={
                  order >= 0
                    ? "absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-primary-normal"
                    : "absolute right-1.5 top-1.5 h-6 w-6 rounded-full border-2 border-text-onImage"
                }
                style={order >= 0 ? undefined : { backgroundColor: "rgba(0,0,0,0.15)" }}
              >
                {order >= 0 && (
                  <Text className="text-caption-main text-text-onImage">{order + 1}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="border-t border-background-assistive">
        {rows.map((row) => (
          <Pressable
            key={row.label}
            className="h-14 flex-row items-center gap-4 px-5 active:bg-background-muted"
            onPress={row.onPress}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: row.color }}
            >
              <Icon name={row.icon} size={18} color="#FFFFFF" />
            </View>
            <Text className="text-body-medium text-text-normal">{row.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
