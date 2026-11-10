import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { AuthStackParamList } from "../../shared/types/navigation";
import { declineConsent, submitConsent } from "./api";
import type { PolicyKind } from "./policies";

// 약관동의 화면 — 처음 가입할 때(프로필 설정 앞)와, 이미 가입한 회원이 아직 현재 방침에 동의하지
// 않았을 때 RootNavigator가 이 화면만 그린다 (SCRUM-175, 모양은 SCRUM-184: 회색 박스 + 항목별 상세보기).
// 필수 두 개(이용약관·수집·이용)는 둘 다 체크해야 넘어가고 서버에는 현재 방침 버전 동의 하나로 남는다.
// 민감정보(큐티·기도제목) 동의는 선택이다 — 안 하면 그 글쓰기만 막힌다.
export function ConsentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  // 이미 가입을 마친 회원이면(방침 개정으로 다시 묻는 경우) 버튼을 "계속하기"로 쓴다.
  const isNewMember = useAuthStore(
    (state) =>
      (state.session.status === "authenticated" || state.session.status === "onboarding") &&
      !state.session.user.profileCompleted,
  );
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allChecked = terms && privacy && sensitive;
  const requiredChecked = terms && privacy;
  const handleAllPress = () => {
    const next = !allChecked;
    setTerms(next);
    setPrivacy(next);
    setSensitive(next);
  };

  const openDocument = (kind: PolicyKind) => navigation.navigate("PolicyDocument", { kind });

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
      <ScrollView className="flex-1" contentContainerClassName="gap-8 px-5 pb-6 pt-10">
        <View className="gap-2">
          <Text className="text-title text-text-normal">{t("약관동의")}</Text>
          <Text className="text-body-regular text-text-alternative">
            {t("서비스 이용을 위해 약관에 동의해 주세요.")}
          </Text>
        </View>

        <View className="rounded-5 bg-background-page px-5 py-2">
          <ConsentRow
            checked={allChecked}
            onPress={handleAllPress}
            label={t("모두 동의하기")}
            emphasized
          />
          <View className="my-1 h-px bg-background-muted" />
          <ConsentRow
            checked={terms}
            onPress={() => setTerms(!terms)}
            label={t("서비스 이용약관 (필수)")}
            onDetailPress={() => openDocument("terms")}
          />
          <ConsentRow
            checked={privacy}
            onPress={() => setPrivacy(!privacy)}
            label={t("개인정보 수집·이용 동의 (필수)")}
            onDetailPress={() => openDocument("privacyConsent")}
          />
          <ConsentRow
            checked={sensitive}
            onPress={() => setSensitive(!sensitive)}
            label={t("민감정보(신앙 관련 글) 처리 동의 (선택)")}
            onDetailPress={() => openDocument("sensitiveConsent")}
          />
        </View>

        <View className="gap-2">
          <Text className="text-body-small text-text-alternative">
            {t("선택 항목에 동의하지 않아도 앱을 쓸 수 있어요. 큐티나눔·기도제목 글쓰기만 동의 후에 할 수 있어요.")}
          </Text>
          <Pressable className="self-start" onPress={() => openDocument("privacyPolicy")} hitSlop={8}>
            <Text className="text-body-small-bold text-text-neutral underline">
              {t("개인정보처리방침 전문 보기")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          label={isNewMember ? t("동의하고 가입하기") : t("동의하고 계속하기")}
          onPress={() => void handleSubmitPress()}
          disabled={!requiredChecked}
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
  label: string;
  /** 있으면 오른쪽에 "상세보기" — 문서 전문을 앱 안에서 연다 */
  onDetailPress?: () => void;
  emphasized?: boolean;
}

function ConsentRow({ checked, onPress, label, onDetailPress, emphasized }: ConsentRowProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 py-3">
      <PressableScale className="flex-1 flex-row items-center gap-3" scaleTo={0.98} onPress={onPress}>
        <View
          className={
            checked
              ? "h-6 w-6 items-center justify-center rounded-md bg-primary-normal"
              : "h-6 w-6 items-center justify-center rounded-md border border-background-assistive bg-background-normal"
          }
        >
          {checked && <Icon name="check" size={18} color={colors.text.disable} />}
        </View>
        <Text
          className={
            emphasized ? "flex-1 text-heading-small text-text-normal" : "flex-1 text-body-main text-text-normal"
          }
        >
          {label}
        </Text>
      </PressableScale>
      {onDetailPress && (
        <Pressable onPress={onDetailPress} hitSlop={8}>
          <Text className="text-body-small text-text-alternative underline">{t("상세보기")}</Text>
        </Pressable>
      )}
    </View>
  );
}
