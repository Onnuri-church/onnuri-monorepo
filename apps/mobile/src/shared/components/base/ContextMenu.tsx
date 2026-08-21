import { Modal, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../../theme/tokens";
import { Icon } from "./Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

export interface ContextMenuItem {
  icon: IconName;
  label: string;
  onPress: () => void;
}

interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  /** 메뉴를 붙일 위치. 화면 좌표 기준이라 헤더 높이를 아는 호출부가 정한다. */
  style?: StyleProp<ViewStyle>;
}

// 시안 확정값: 폭 177, 높이 106(= 위아래 여백 10 + 항목 43*2), 라운드 20, 아이콘 18, 항목 좌우 여백 8.
// 시안은 흰색 70% + 블러다. 앱 배경이 흰색이라 그대로 두면 패널 경계가 사라지고 뒤 글자가 비쳐
// 읽히지 않으므로, 흰색 70%가 회색 위에 얹혔을 때의 느낌만 살려 회색 표면(background.muted)으로
// 칠한다. 실제 투명도를 주면 뒤 글자가 그대로 비친다.
const MENU_WIDTH = 177;
const ITEM_HEIGHT = 43;
const ITEM_LINE = 23;
const MENU_VERTICAL = 20;

// 누른 버튼 아래 붙는 팝오버. 바텀시트(AppSheet)와 달리 화면 위쪽 특정 위치에 떠야 하고
// 헤더까지 덮어야 해서 RN Modal로 띄운다 — 화면 안 절대 위치로는 네비게이터가 그리는 헤더를 못 덮는다.
export function ContextMenu({ visible, onClose, items, style }: ContextMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 바깥 아무 곳이나 누르면 닫힌다. 안드로이드 뒤로가기는 onRequestClose가 받는다. */}
      <Pressable className="flex-1" onPress={onClose}>
        <View
          className="absolute rounded-5 bg-background-muted px-2 pt-2.5"
          style={[{ width: MENU_WIDTH, height: MENU_VERTICAL + ITEM_HEIGHT * items.length }, style]}
        >
          {items.map((item) => (
            <Pressable
              key={item.label}
              className="flex-row items-center gap-2 px-3 active:opacity-60"
              style={{ height: ITEM_HEIGHT }}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Icon name={item.icon} size={18} color={colors.icon.normal} />
              <Text
                className="flex-1 text-center text-body-medium text-text-normal"
                style={{ lineHeight: ITEM_LINE }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
