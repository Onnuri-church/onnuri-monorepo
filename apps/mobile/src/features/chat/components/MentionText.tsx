import type { ChatMessageInfo } from "@onnuri/shared";
import { Text } from "react-native";

interface MentionTextProps {
  message: ChatMessageInfo;
  className?: string;
  /** 언급 강조 색 클래스 (말풍선 배경에 따라 다르다) */
  mentionClassName: string;
  /** 대화 검색어 — 본문에서 이 글자만 형광펜처럼 칠한다 (SCRUM-235) */
  highlight?: string;
  /** 지금 가리키는 검색 결과면 더 진하게 칠한다 */
  highlightActive?: boolean;
}

// 본문 속 "@이름"을 강조해서 그린다. 서버가 방 멤버로 확인한 언급만 강조한다.
// 대화 검색 중이면 찾은 글자에만 배경을 칠한다 (카카오톡처럼 — 말풍선 전체를 칠하면 부담스럽다).
export function MentionText({
  message,
  className,
  mentionClassName,
  highlight,
  highlightActive = false,
}: MentionTextProps) {
  const mentionTokens = message.mentions.map((mention) => `@${mention.name}`);
  const query = highlight?.trim() ?? "";
  if (mentionTokens.length === 0 && query === "") {
    return <Text className={className}>{message.content}</Text>;
  }

  const highlightStyle = {
    backgroundColor: highlightActive ? "rgba(255, 196, 0, 0.75)" : "rgba(120, 170, 255, 0.45)",
  };
  // 언급과 검색어를 한 번에 쪼갠다 (검색어는 대소문자 무시)
  const sources = [...mentionTokens.map(escapeRegExp), ...(query ? [escapeRegExp(query)] : [])];
  const pattern = new RegExp(`(${sources.join("|")})`, "gi");
  const parts = message.content.split(pattern);
  return (
    <Text className={className}>
      {parts.map((part, index) => {
        if (query && part.toLowerCase() === query.toLowerCase()) {
          return (
            <Text key={index} style={highlightStyle}>
              {part}
            </Text>
          );
        }
        if (mentionTokens.includes(part)) {
          return (
            <Text key={index} className={mentionClassName}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
