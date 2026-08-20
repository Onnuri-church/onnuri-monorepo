import { TextInput } from "react-native";

import { Field } from "./Field";
import { colors } from "../../theme/tokens";

interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

// 라벨 + 밑줄 한 줄 입력. 입력줄은 시안 확정값(높이 48 / 좌우 8 / 아래 구분선)으로
// DateField의 트리거 줄과 같은 스타일이다.
export function TextField({ label, placeholder, value, onChangeText }: TextFieldProps) {
  return (
    <Field label={label}>
      <TextInput
        className="h-12 border-b border-background-assistive px-2 text-heading-small text-text-normal"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.assistive}
      />
    </Field>
  );
}
