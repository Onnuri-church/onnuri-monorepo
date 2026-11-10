import { useRoute, type RouteProp } from "@react-navigation/native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AuthStackParamList } from "../../shared/types/navigation";
import { POLICIES } from "./policies";

// 약관·개인정보 문서 전문 보기 (SCRUM-184) — 동의 화면의 "상세보기"와 설정의 처리방침·이용약관이 연다.
// 가입 전(AuthStack)과 가입 후(메인 Stack) 양쪽에 같은 이름·파라미터로 등록돼 있다.
export function PolicyDocumentScreen() {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<AuthStackParamList, "PolicyDocument">>();
  const doc = POLICIES[params.kind];

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="gap-3 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <Text className="text-body-small text-text-alternative">시행일: {doc.effectiveDate}</Text>
      {doc.blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <Text key={index} className="mt-4 text-heading-small text-text-normal">
              {block.text}
            </Text>
          );
        }
        if (block.type === "bullet") {
          return (
            <View key={index} className="flex-row gap-2 pl-1">
              <Text className="text-body-medium text-text-neutral">•</Text>
              <Text className="flex-1 text-body-medium text-text-neutral">{block.text}</Text>
            </View>
          );
        }
        return (
          <Text key={index} className="text-body-medium text-text-neutral">
            {block.text}
          </Text>
        );
      })}
    </ScrollView>
  );
}
