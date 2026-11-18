import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "../../../shared/components/base/Icon";
import { useRecentPhotos } from "./RecentPhotos";

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 닫힘 애니메이션까지 끝났을 때 (iOS) — 이때부터 사진·파일 선택창을 띄울 수 있다 */
  onDismiss?: () => void;
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

// 단톡방 + 버튼을 눌렀을 때 아래에서 올라오는 목록 — 카카오톡처럼 색 아이콘과 짧은 글자 한 줄씩.
// 위에 카메라 칸, 아래에 사진·동영상 / 파일 / 투표 (SCRUM-228).
export function AttachmentSheet({
  visible,
  onClose,
  onDismiss,
  onPickCamera,
  onPickMedia,
  onPickFile,
  onPickPoll,
  onSendRecent,
}: AttachmentSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const recent = useRecentPhotos(visible);
  // 고른 순서대로 번호를 붙인다 (카카오톡처럼)
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    if (!visible) setPicked([]);
  }, [visible]);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-background-normal pt-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* 시트 손잡이 */}
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-background-assistive" />
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
