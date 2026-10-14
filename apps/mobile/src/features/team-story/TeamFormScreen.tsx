import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useCreateTeam, useTeamDetail, useUpdateTeam } from "./api";
import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { Icon, type IconName } from "../../shared/components/base/Icon";
import { ImageUploadBoxSingle } from "../../shared/components/base/ImageUploadBoxSingle";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { Toggle } from "../../shared/components/base/Toggle";
import { MemberPickerField } from "../../shared/components/composed/MemberPickerField";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useAdminMembers } from "../admin/api";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";

// 팀 목록 아이콘 선택지 — Icon 에셋 중 팀 성격에 맞는 16종. 앞 7개는 현재 팀들이 쓰는 값,
// 뒤 9개는 앞으로 생길 만한 팀 예상(홍보·교육/새가족·친교·행사·섬김·환영·안내·행정·재정).
// 새 종류가 필요하면 assets/icons에 SVG를 넣고 Icon 등록 후 여기에 추가한다.
const TEAM_ICONS: IconName[] = [
  "thumb-up",
  "palette",
  "video-on",
  "media-strip",
  "pray",
  "note",
  "soccer",
  "announcement",
  "book-open-alt-light",
  "chat",
  "calendar",
  "favorite-light",
  "user",
  "place",
  "write",
  "card",
];

// 팀을 새로 만들거나 기존 팀을 고치는 화면. teamId가 있으면 편집, 없으면 생성이다.
// 두 모드가 폼도 항목도 같아서 화면을 나누지 않는다. 진입은 팀 관리(관리자의 팀스토리 탭)에서만.
export function TeamFormScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const teamId = params?.teamId;
  const { data: team } = useTeamDetail(teamId ?? "");

  // 팀장 선택지 — 관리자 전용 회원 목록을 검색해서 id로 고른다 (MemberPickerField).
  const { data: members } = useAdminMembers();

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam(teamId ?? "");

  const [name, setName] = useState("");
  // 팀장은 한 명 이상 — 팀에 따라 여러 명이다 (셀장·부셀장처럼).
  const [leaderIds, setLeaderIds] = useState<string[]>([]);
  // 목록 아이콘 — 안 고르면 회색 원으로 보인다. 선택사항이라 제출 조건에 넣지 않는다.
  const [iconName, setIconName] = useState<IconName | null>(null);
  // 커버는 기존 저장 주소(http) 또는 새로 고른 로컬 사진(file://)을 한 상태로 들고,
  // 저장할 때 로컬이면 업로드해서 주소로 바꾼다 (uploadImage가 http는 그대로 통과).
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  // 콘텐츠 업로드 권한 — 켜면 이 팀의 팀원(팀장 포함) 전원이 주보 등록 / 홈 배너 관리를 할 수 있다.
  const [canUploadBulletin, setCanUploadBulletin] = useState(false);
  const [canManageBanner, setCanManageBanner] = useState(false);

  // 편집 모드 프리필 — 상세를 받아온 뒤에 채운다 (PrayerWrite와 같은 방식).
  useEffect(() => {
    if (!team) return;
    setName(team.name);
    setLeaderIds(team.members.filter((member) => member.role === "LEADER").map((member) => member.id));
    setIconName(
      team.iconName && TEAM_ICONS.includes(team.iconName as IconName)
        ? (team.iconName as IconName)
        : null,
    );
    setCoverUri(team.coverImageUrl);
    setTagline(team.tagline ?? "");
    setDescription(team.description ?? "");
    setCanUploadBulletin(team.canUploadBulletin);
    setCanManageBanner(team.canManageBanner);
  }, [team]);

  const handleSubmitPress = async () => {
    if (leaderIds.length === 0) return;

    const coverImageUrl = coverUri ? await uploadImage(coverUri) : null;
    const body = {
      name,
      leaderIds,
      iconName,
      tagline,
      description,
      coverImageUrl,
      canUploadBulletin,
      canManageBanner,
    };
    if (teamId) {
      await updateTeam.mutateAsync(body);
    } else {
      await createTeam.mutateAsync(body);
    }
    navigation.goBack();
  };

  const submitting = createTeam.isPending || updateTeam.isPending;

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* 시안에서 팀 이름만 안내 문구가 없다. */}
            <TextField label={t("팀 이름")} placeholder="" value={name} onChangeText={setName} />
          </View>

          {/* 팀장 — 한 명 이상, 여러 명 가능. 행의 X로 빼고 아래 검색 선택으로 추가한다. */}
          <View className="py-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-body-main text-text-normal">{t("팀장")}</Text>
              <Text className="text-caption-main text-text-alternative">{t("한 명 이상")}</Text>
            </View>
            <View className="mt-2">
              {leaderIds.map((id) => {
                const member = (members ?? []).find((item) => item.id === id);
                const teamName = team?.members.find((item) => item.id === id)?.name;
                return (
                  <View
                    key={id}
                    className="flex-row items-center justify-between border-b border-background-assistive py-2.5"
                  >
                    <Text className="text-body-main text-text-normal">
                      {member?.name ?? teamName ?? ""}
                    </Text>
                    <Pressable
                      onPress={() => setLeaderIds((prev) => prev.filter((value) => value !== id))}
                      hitSlop={8}
                    >
                      <Icon name="close-square" size={18} color={themeColors.icon.normal} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <View className="-mt-2">
              <MemberPickerField
                label=""
                placeholder={t("팀장 추가")}
                members={members}
                valueId={null}
                // 같은 사람이 연달아 두 번 들어와도 한 번만 붙게 최신 상태로 거른다.
                onSelect={(memberId) =>
                  setLeaderIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]))
                }
                excludeIds={leaderIds}
              />
            </View>
          </View>

          <View>
            {/* 다시 누르면 해제 — 아이콘 없는 팀(회색 원)도 허용한다 */}
            <Field label={t("팀 아이콘")}>
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {TEAM_ICONS.map((icon) => {
                  const selected = iconName === icon;
                  return (
                    <Pressable
                      key={icon}
                      onPress={() => setIconName(selected ? null : icon)}
                      className={
                        selected
                          ? "items-center justify-center rounded-full border border-primary-normal bg-background-alternative"
                          : "items-center justify-center rounded-full bg-background-muted"
                      }
                      style={{ width: 52, height: 52 }}
                    >
                      <Icon
                        name={icon}
                        size={24}
                        color={selected ? themeColors.primary.normal : themeColors.icon.normal}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </View>

          <View>
            <Field label={t("배경사진")}>
              <ImageUploadBoxSingle imageUri={coverUri} onChange={setCoverUri} />
            </Field>
          </View>

          <View>
            <TextField
              label={t("한 줄 소개")}
              placeholder={t("목록에 표시될 짧은 소개를 입력하세요.")}
              value={tagline}
              onChangeText={setTagline}
            />
          </View>

          <View>
            <TextAreaField
              label={t("팀 소개")}
              placeholder={t("팀에 대한 자세한 설명을 입력하세요.")}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View>
            <Field label={t("업로드 권한")}>
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-body-main text-text-normal">{t("주보 등록")}</Text>
                    <Text className="text-body-small text-text-alternative">
                      {t("이 팀의 팀원이 주보를 올리고 삭제할 수 있어요.")}
                    </Text>
                  </View>
                  <Toggle value={canUploadBulletin} onValueChange={setCanUploadBulletin} />
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-body-main text-text-normal">{t("홈 배너 관리")}</Text>
                    <Text className="text-body-small text-text-alternative">
                      {t("이 팀의 팀원이 홈 배너를 등록·수정·삭제할 수 있어요.")}
                    </Text>
                  </View>
                  <Toggle value={canManageBanner} onValueChange={setCanManageBanner} />
                </View>
              </View>
            </Field>
          </View>

          <View className="mt-16">
            <Button
              label={teamId ? t("저장") : t("등록하기")}
              onPress={handleSubmitPress}
              loading={submitting}
              disabled={
                name.trim().length === 0 ||
                leaderIds.length === 0 ||
                tagline.trim().length === 0 ||
                description.trim().length === 0
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}
