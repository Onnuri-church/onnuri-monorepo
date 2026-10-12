import { Linking, Text } from "react-native";

// 본문 속 http(s) 주소를 눌러서 열 수 있게 파랗게 그린다 (밴드 글처럼).
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

/** 본문에서 http(s) 주소만 뽑아낸다 (중복 제거, 순서 유지). */
export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_PATTERN) ?? []));
}

export function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const parts = text.split(URL_PATTERN);
  return (
    <Text className={className}>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <Text
            key={index}
            className="text-primary-normal underline"
            onPress={() => void Linking.openURL(part)}
          >
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}
