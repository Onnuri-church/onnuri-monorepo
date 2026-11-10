import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { colors } from "../../shared/theme/tokens";
import { PRIVACY_POLICY_URL, declineConsent, submitConsent } from "./api";

// 개인정보 동의 화면 — 처음 가입할 때(프로필 설정 앞)와, 이미 가입한 회원이 아직 현재 방침에
// 동의하지 않았을 때 RootNavigator가 이 화면만 그린다 (SCRUM-175).
// 필수(수집·이용)에 동의해야 넘어가고, 민감정보(큐티·기도제목) 동의는 선택이다 — 안 하면 그 글쓰기만
// 막힌다. 시안이 없어 기존 토큰·베이스 컴포넌트로 구성했다 (시안이 나오면 맞춘다).
export function ConsentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [privacy, setPrivacy] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allChecked = privacy && sensitive;
  const handleAllPress = () => {
    setPrivacy(!allChecked);
    setSensitive(!allChecked);
  };

  const handleSubmitPress = async () => {
    setSubmitting(true);
    try {
      await submitConsent({ privacy: true, sensitive });
      // 세션이 바뀌면 RootNavigator가 다음 화면(프로필 설정 또는 메인)으로 넘긴다.
    } catch {
      Alert.alert(t("동의를 저장하지 못했어요"), t("잠시 후 다시 시도해 주세요."));
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-6 pt-8">
        <View className="gap-2">
          <Text className="text-title text-text-normal">{t("서비스 이용을 위해 동의해 주세요")}</Text>
          <Text className="text-body-regular text-text-alternative">
            {t("청년부 앱은 모임 운영과 나눔을 위해 아래 정보를 처리해요.")}
          </Text>
        </View>

        <ConsentRow
          checked={allChecked}
          onPress={handleAllPress}
          title={t("모두 동의하기")}
          emphasized
        />

        <View className="h-px bg-background-assistive" />

        <ConsentRow
          checked={privacy}
          onPress={() => setPrivacy(!privacy)}
          title={t("[필수] 개인정보 수집·이용 동의")}
          description={t(
            "이름, 이메일, 생년월일, 성별, 연락처, 소속 팀·셀, 출석 기록을 청년부 모임 운영과 앱 제공에 사용해요. 탈퇴하면 30일 뒤 프로필을 파기해요.",
          )}
        />
        <ConsentRow
          checked={sensitive}
          onPress={() => setSensitive(!sensitive)}
          title={t("[선택] 민감정보(신앙 관련 글) 처리 동의")}
          description={t(
            "큐티나눔·기도제목에는 신앙에 관한 내용이 담길 수 있어요. 동의하지 않아도 앱을 쓸 수 있지만, 큐티나눔·기도제목 글쓰기는 동의 후에 할 수 있어요. 설정에서 언제든 바꿀 수 있어요.",
          )}
        />

        <PressableScale
          className="self-start"
          scaleTo={0.94}
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        >
          <Text className="text-body-small-bold text-text-neutral underline">
            {t("개인정보처리방침 전문 보기")}
          </Text>
        </PressableScale>
      </ScrollView>

      <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          label={t("동의하고 계속하기")}
          onPress={() => void handleSubmitPress()}
          disabled={!privacy}
          loading={submitting}
        />
        {/* 동의하지 않으면 가입·이용을 진행할 수 없다 — 막 가입한 계정이면 지우고(SCRUM-183), 로그인 화면으로 돌아간다. */}
        <PressableScale className="items-center py-2" scaleTo={0.94} onPress={() => void declineConsent()}>
          <Text className="text-body-small text-text-alternative">{t("동의하지 않고 나가기")}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

interface ConsentRowProps {
  checked: boolean;
  onPress: () => void;
  title: string;
  description?: string;
  emphasized?: boolean;
}

function ConsentRow({ checked, onPress, title, description, emphasized }: ConsentRowProps) {
  return (
    <PressableScale className="flex-row gap-3" scaleTo={0.98} onPress={onPress}>
      <View
        className={
          checked
            ? "h-6 w-6 items-center justify-center rounded-md bg-primary-normal"
            : "h-6 w-6 items-center justify-center rounded-md border border-background-assistive"
        }
      >
        {checked && <Icon name="check" size={18} color={colors.text.disable} />}
      </View>
      <View className="flex-1 gap-1">
        <Text className={emphasized ? "text-heading-small text-text-normal" : "text-body-main text-text-normal"}>
          {title}
        </Text>
        {description && <Text className="text-body-small text-text-alternative">{description}</Text>}
      </View>
    </PressableScale>
  );
}
