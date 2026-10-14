import type { ChatMessageInfo } from "@onnuri/shared";
import { Text } from "react-native";

interface MentionTextProps {
  message: ChatMessageInfo;
  className?: string;
  /** 언급 강조 색 클래스 (말풍선 배경에 따라 다르다) */
  mentionClassName: string;
}

// 본문 속 "@이름"을 강조해서 그린다. 서버가 방 멤버로 확인한 언급만 강조한다.
export function MentionText({ message, className, mentionClassName }: MentionTextProps) {
  const tokens = message.mentions.map((mention) => `@${mention.name}`);
  if (tokens.length === 0) return <Text className={className}>{message.content}</Text>;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "g");
  const parts = message.content.split(pattern);
  return (
    <Text className={className}>
      {parts.map((part, index) =>
        tokens.includes(part) ? (
          <Text key={index} className={mentionClassName}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
