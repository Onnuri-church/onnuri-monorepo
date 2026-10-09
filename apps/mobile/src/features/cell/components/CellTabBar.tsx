import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { useThemeColors } from "../../../shared/theme/useThemeColors";

export type CellTabKey = "news" | "gallery" | "members" | "manage";

const TAB_KEYS: CellTabKey[] = ["news", "gallery", "members", "manage"];

interface CellTabBarProps {
  active: CellTabKey;
  onChange: (tab: CellTabKey) => void;
  /** true면 관리 탭이 잠긴다 — 자물쇠만 보이고 눌리지 않는다 (셀장·관리자 외). */
  manageLocked: boolean;
}

// 개별 셀 페이지 상단 탭 (시안: 높이 48, 좌우 25, 탭 간격 35 — 24/36으로 근사).
// 활성 탭은 검정 + 2px 밑줄, 관리 탭이 활성일 땐 warning 색(시안 확정)으로 바뀐다.
// 커버 사진 아래에 붙고 스크롤 시 상단에 고정된다(stickyHeaderIndices) — 배경을 직접 칠한다.
export function CellTabBar({ active, onChange, manageLocked }: CellTabBarProps) {
  const { t } = useTranslation();
  const labels: Record<CellTabKey, string> = {
    news: t("소식"),
    gallery: t("갤러리"),
    members: t("구성원"),
    manage: t("관리"),
  };
  const themeColors = useThemeColors();
  return (
    <View
      className="h-12 flex-row items-center gap-9 bg-background-normal px-6"
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: themeColors.text.alternative,
      }}
    >
      {TAB_KEYS.map((key) => {
        const isManage = key === "manage";
        const disabled = isManage && manageLocked;
        const isActive = active === key;
        // 관리 탭만 활성 색이 warning이다 (잠금 화면의 성격을 색으로 구분한 시안).
        const activeColor = isManage ? "text-semantic-warning" : "text-text-normal";

        return (
          <Pressable
            key={key}
            className="h-full min-w-0 shrink flex-row items-center gap-1"
            onPress={() => onChange(key)}
            disabled={disabled}
          >
            {isManage && (
              <Icon
                name="lock"
                size={12}
                color={isActive ? themeColors.semantic.warning : themeColors.icon.normal}
              />
            )}
            {/* 번역으로 탭 라벨이 길어져 한 줄에 안 들어가면 탭이 줄어들고 글자도 같이 줄여 맞춘다. */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className={`shrink text-body-main ${isActive ? activeColor : "text-text-alternative"}`}
            >
              {labels[key]}
            </Text>
            {isActive && (
              <View
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                  isManage ? "bg-semantic-warning" : "bg-text-normal"
                }`}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
