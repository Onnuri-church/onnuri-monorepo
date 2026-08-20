import { TextInput } from "react-native";

import { Field } from "./Field";
import { colors } from "../../theme/tokens";

interface TextAreaFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

// 라벨 + 박스형 멀티라인 입력. TextField(밑줄 한 줄)와 달리 둥근 테두리 박스에
// 여러 줄을 받는다. textAlignVertical은 Android에서 커서를 위에서 시작시키기 위한 것.
export function TextAreaField({ label, placeholder, value, onChangeText }: TextAreaFieldProps) {
  return (
    <Field label={label}>
      <TextInput
        className="min-h-72 rounded-2xl border border-background-assistive bg-background-normal p-4 text-body-regular text-text-normal"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.assistive}
        multiline
        textAlignVertical="top"
        // Android 네이티브 EditText의 기본 밑줄 제거. RN 0.86(신 아키텍처)은 border를 줘도
        // 원래 배경을 보존한 채 겹쳐 그려서, 이걸 안 주면 박스 하단에 밑줄이 하나 더 보인다.
        underlineColorAndroid="transparent"
      />
    </Field>
  );
}
