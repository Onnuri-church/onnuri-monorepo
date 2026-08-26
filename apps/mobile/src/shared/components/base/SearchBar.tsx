import { Pressable, TextInput, View } from "react-native";

import { colors } from "../../theme/tokens";
import { Icon } from "./Icon";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

// 시안 확정값(402pt 프레임): 바 362x56(h-14), 라운드 28 → pill.
// 바깥 여백 4(p-1) 안에 내용이 들어가고, 텍스트는 거기서 20 더(pl-5) 들어가 왼쪽 끝에서 24다.
// 우측 아이콘은 48x48 버튼(h-12 w-12) 안의 24 아이콘이라, 아이콘이 바 오른쪽 끝에서 16 떨어진다.
// 폭은 박지 않는다 — 호출부의 좌우 여백이 정한다. 무엇을 검색하는지는 모르고 값과 콜백만 받는다.
export function SearchBar({ value, onChangeText, placeholder, onSubmit }: SearchBarProps) {
  return (
    <View className="h-14 flex-row items-center rounded-full bg-background-muted p-1">
      <TextInput
        className="h-full flex-1 pl-5 text-body-medium text-text-normal"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.alternative}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-full active:opacity-60"
        onPress={onSubmit}
      >
        <Icon name="search" size={24} color={colors.icon.strong} />
      </Pressable>
    </View>
  );
}
