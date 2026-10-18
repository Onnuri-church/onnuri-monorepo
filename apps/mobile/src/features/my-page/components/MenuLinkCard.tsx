import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { UnreadBadge } from "../../../shared/components/base/UnreadBadge";

export interface MenuLink {
  label: string;
  onPress?: () => void;
  /** 0보다 크면 라벨 옆에 빨간 점을 단다 — 안 읽은 메시지가 있다는 표시 */
  unreadCount?: number;
}

interface MenuLinkCardProps {
  links: MenuLink[];
}

// "라벨 + > 화살표" 행 목록 카드. 등급별 관리 메뉴와 공지사항 진입점이 같은 모양을 쓴다.
// 화살표 색은 시안의 #888888 = icon.normal(Icon 기본값).
export function MenuLinkCard({ links }: MenuLinkCardProps) {
  return (
    <View className="rounded-5 bg-background-normal px-4 py-5 shadow-card">
      {links.map((link, index) => (
        <Fragment key={link.label}>
          {index > 0 && <View className="my-5 h-px bg-background-assistive" />}
          <Pressable
            className="flex-row items-center justify-between"
            onPress={link.onPress}
          >
            <View className="flex-row items-center">
              <Text className="text-body-main text-text-normal">{link.label}</Text>
              <UnreadBadge count={link.unreadCount ?? 0} dot className="ml-2" />
            </View>
            <Icon name="expand-right" size={28} />
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}
