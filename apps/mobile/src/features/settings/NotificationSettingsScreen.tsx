import type { NotificationSettings } from "@onnuri/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AppState, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppToast, type AppToastRef } from "../../shared/components/base/AppToast";
import { Button } from "../../shared/components/base/Button";
import { Toggle } from "../../shared/components/base/Toggle";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { enablePush, getPushStatus, type PushStatus } from "../notification/pushPermission";
import { useMe } from "../profile/useMe";
import { useNotificationSettings, useUpdateNotificationSettings } from "./api";
import { SettingRow } from "./components/SettingRow";

// 알림 종류별 켜짐 여부 — 서버에 저장되고, 끄면 그 종류의 푸시가 오지 않는다
// (알림센터에는 그대로 쌓인다). key는 NotificationSettings 필드명과 같다.
// 화면에는 묶음별 카드로 나눠 그린다. 팔로워 노트는 리더·관리자에게만 보인다.
const NOTIFICATION_GROUPS = [
  {
    label: "콘텐츠 알림",
    rows: [
      { key: "sermonUpload", title: "말씀영상 업로드 알림" },
      { key: "liveWorship", title: "실시간 예배 시작 알림" },
      { key: "notice", title: "공지사항 알림" },
      { key: "bulletin", title: "주보·나눔자료 알림" },
    ],
  },
  {
    label: "소통 알림",
    rows: [
      { key: "qtNewPost", title: "큐티나눔 새글 알림" },
      { key: "comment", title: "댓글 알림" },
      {
        key: "chatMessage",
        title: "단톡방 새 메시지 알림",
        subtitle: "멘션·공지·투표 마감은 항상 알려드려요",
      },
    ],
  },
  {
    label: "리더 알림",
    leaderOnly: true,
    rows: [{ key: "followerNote", title: "팔로워 노트 알림" }],
  },
] as const;

type NotificationRow = {
  key: NotificationKey;
  title: string;
  subtitle?: string;
};
type NotificationKey = keyof NotificationSettings;

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-caption-main text-text-alternative">{children}</Text>;
}

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // 서버 값이 오기 전에는 기본값(전부 켜짐)으로 그린다 — 기본값과 같아서 깜빡임이 없다.
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const notifications: Record<NotificationKey, boolean> = settings ?? {
    sermonUpload: true,
    liveWorship: true,
    qtNewPost: true,
    notice: true,
    bulletin: true,
    chatMessage: true,
    comment: true,
    followerNote: true,
  };
  const me = useMe();
  const isLeader = me?.isAdmin === true || me?.canUseLeaderRooms === true;

  // 저장 피드백은 토스트 한 줄 — 확인 팝업은 조작을 끊어서 두지 않는다 (2026-10-02 결정,
  // 광고성 푸시가 생기면 그때 법정 고지 팝업을 별도로 단다).
  const toastRef = useRef<AppToastRef>(null);

  // 이 기기의 알림 권한 (SCRUM-267). 아래 스위치들은 "어떤 종류를 받을지"를 서버에 저장할 뿐이라,
  // 기기 권한이 꺼져 있으면 스위치가 켜져 있어도 푸시가 오지 않는다 — 그 상태를 위에 알리고 여기서 켠다.
  // 홈 안내에서 "알림 보지 않기"를 누른 기기가 다시 켤 수 있는 유일한 곳이다.
  // 휴대폰 설정에 다녀오면(앱이 다시 활성화되면) 상태를 다시 읽는다.
  const isLoggedIn = useAuthStore((state) => state.session.status === "authenticated");
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [enabling, setEnabling] = useState(false);
  useEffect(() => {
    const refresh = () => {
      getPushStatus()
        .then(setPushStatus)
        .catch(() => undefined);
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);
  const deviceOff = isLoggedIn && (pushStatus === "askable" || pushStatus === "blocked");

  const handleEnablePress = async () => {
    if (enabling) return;
    setEnabling(true);
    try {
      const next = await enablePush();
      setPushStatus(next);
      if (next === "granted") toastRef.current?.show(t("이 기기의 알림이 켜졌어요"));
    } finally {
      setEnabling(false);
    }
  };

  // 게스트도 들어올 수 있는데 저장은 계정이 필요하다 — 서버가 401로 거절하기 전에 로그인 안내부터.
  const requireLogin = () => {
    const { session } = useAuthStore.getState();
    if (session.status === "authenticated") return true;
    Alert.alert(t("로그인이 필요해요"), t("로그인 후 이용할 수 있어요."));
    return false;
  };

  const handleNotificationChange = (key: NotificationKey, value: boolean) => {
    if (!requireLogin()) return;
    const title =
      NOTIFICATION_GROUPS.flatMap((group) => group.rows as readonly NotificationRow[]).find(
        (row) => row.key === key,
      )?.title ?? "알림";
    toastRef.current?.show(
      value ? t("{{title}}이 켜졌어요", { title: t(title) }) : t("{{title}}이 꺼졌어요", { title: t(title) }),
    );
    updateSettings.mutate(
      { [key]: value },
      {
        // 훅의 onError가 토글을 서버 값으로 되돌린다 — 여기서는 안내만 띄운다.
        onError: () => toastRef.current?.show(t("저장하지 못했어요. 다시 시도해주세요")),
      },
    );
  };

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="px-5 pt-8"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      {deviceOff && (
        <View className="mb-7.5 gap-3 rounded-5 bg-background-muted px-4 py-5">
          <View className="gap-1">
            <Text className="text-body-main text-text-normal">{t("이 기기는 알림이 꺼져 있어요")}</Text>
            <Text className="text-body-small text-text-alternative">
              {pushStatus === "blocked"
                ? t("휴대폰 설정에서 알림을 허용해야 소식을 받을 수 있어요.")
                : t("알림을 켜야 공지·댓글·채팅 소식을 받을 수 있어요.")}
            </Text>
          </View>
          <Button
            label={pushStatus === "blocked" ? t("휴대폰 설정 열기") : t("알림 켜기")}
            loading={enabling}
            onPress={() => void handleEnablePress()}
          />
        </View>
      )}

      {/* 기기 알림이 꺼져 있으면 종류별 스위치는 흐리게 — 바꿀 수는 있지만 지금은 효과가 없다는 표시 */}
      <View className="gap-7.5" style={deviceOff ? { opacity: 0.5 } : undefined}>
        {NOTIFICATION_GROUPS.filter((group) => !("leaderOnly" in group) || isLeader).map((group) => (
          <View key={group.label} className="gap-2">
            <SectionLabel>{t(group.label)}</SectionLabel>
            <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
              {(group.rows as readonly NotificationRow[]).map((row) => (
                <SettingRow
                  key={row.key}
                  title={t(row.title)}
                  subtitle={row.subtitle ? t(row.subtitle) : undefined}
                  right={
                    <Toggle
                      value={notifications[row.key]}
                      onValueChange={(value) => handleNotificationChange(row.key, value)}
                    />
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <AppToast ref={toastRef} />
    </ScrollView>
  );
}
