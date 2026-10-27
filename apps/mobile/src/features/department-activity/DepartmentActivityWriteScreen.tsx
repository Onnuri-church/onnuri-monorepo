import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { createTeamActivity, fetchTeamActivity, updateTeamActivity } from "./api";
import { uploadImage } from "../../shared/api/upload";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { useDiscardGuard, useFormDirty } from "../../shared/hooks/useDiscardGuard";
import { useSubmitLock } from "../../shared/hooks/useSubmitLock";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";

const MAX_IMAGES = 5;

// 부서활동 글쓰기 2단계 — 본문과 사진. 팀 게시판 글쓰기와 같은 모양(큰 입력칸 + 키보드 위 도구줄)이다.
// 날짜·부서·제목은 앞 화면(DepartmentActivityMeta)에서 정해 넘어온다. 올린 사진은 상세 맨 위에서
// 가로로 넘겨 보는 캐러셀이 된다. postId가 있으면 수정 모드다.
export function DepartmentActivityWriteScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, "DepartmentActivityWrite">>();
  const { postId, teamId, teamName, title, eventDate } = params;
  const isEditing = postId !== undefined;
  const queryClient = useQueryClient();

  const { data: editing } = useQuery({
    queryKey: ["team-activity", postId ?? ""],
    queryFn: () => fetchTeamActivity(postId ?? ""),
    enabled: isEditing,
  });

  const [content, setContent] = useState("");
  // 기존 사진(http)과 새로 고른 사진(file://)이 섞여 있어도 uploadImage가 http는 통과시킨다.
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !editing) return;
    setContent(editing.content);
    setPhotoUris(editing.imageUrls);
    setPrefilled(true);
  }, [editing, prefilled]);

  // isPending은 요청을 보낸 뒤에야 바뀐다 — 그 전에 "완료"를 연타하면 pop(2)가 여러 번 불려
  // 앞 화면들까지 닫힌다. 누르는 즉시 잠그고, 실패하면 푼다.
  const { locked, acquire, release } = useSubmitLock();

  // 쓰던 내용이 있는 채로 뒤로가기를 누르면 확인을 받는다. 등록에 성공해 두 화면이 닫힐 때(pop(2))는 막지 않는다(locked).
  // 앞 단계(날짜·부서·제목)는 짧고 이 화면에서 되돌아가면 그대로 남아 있어서 여기에만 단다.
  const dirty = useFormDirty({ content, photoUris }, !isEditing || prefilled);
  const discardDialog = useDiscardGuard({
    dirty,
    submitting: locked,
    mode: isEditing ? "edit" : "write",
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      // 사진은 기기 경로(file://)라 글에 담기 전에 URL로 바꾼다. 한 장이라도 실패하면
      // 글을 저장하지 않는다 — 사진이 빠진 채 올라가면 올린 줄 알고 그냥 넘어간다.
      const imageUrls = await Promise.all(photoUris.map(uploadImage));
      if (isEditing && postId) {
        return updateTeamActivity(postId, {
          title,
          content: content.trim(),
          eventDate,
          imageUrls,
        });
      }
      return createTeamActivity({ teamId, title, content: content.trim(), eventDate, imageUrls });
    },
    onSuccess: (post) => {
      // 목록 카드의 날짜 문구·조회수는 서버가 만드는 값이라 다시 받는다.
      void queryClient.invalidateQueries({ queryKey: ["team-activities"] });
      void queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      queryClient.setQueryData(["team-activity", post.id], post);
      // 날짜·부서·제목 화면과 이 화면, 두 단계를 같이 닫는다.
      navigation.pop(2);
    },
    onError: () => {
      release();
      Alert.alert(
        isEditing ? t("저장하지 못했어요") : t("등록하지 못했어요"),
        t("잠시 후 다시 시도해주세요."),
      );
    },
  });

  const canSubmit = !isPending && content.trim().length > 0;

  const handlePickPhotos = async () => {
    const remaining = MAX_IMAGES - photoUris.length;
    if (remaining <= 0) {
      Alert.alert(t("사진은 최대 5장까지 올릴 수 있어요."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setPhotoUris((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_IMAGES));
  };

  // "완료"가 입력 내용에 의존해서 화면이 헤더를 단독 등록한다.
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={isEditing ? t("글 수정") : t("글쓰기")}
          rightAction="text"
          rightLabel={isPending ? t("올리는 중...") : t("완료")}
          onPressRightLabel={() => {
            if (canSubmit && acquire()) submit();
          }}
        />
      ),
    });
  });

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        {/* 앞 화면에서 정한 부서·날짜·제목 */}
        <View className="border-b border-background-assistive px-5 py-3">
          <Text className="text-body-main text-text-normal" numberOfLines={1}>
            {title}
          </Text>
          <Text className="mt-0.5 text-caption-main text-text-alternative">
            {teamName} · {eventDate.replaceAll("-", ".")}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 py-4"
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            className="min-h-48 text-body-regular text-text-normal"
            value={content}
            onChangeText={setContent}
            placeholder={t(
              "오늘 은혜받은 말씀을 기록해보세요!\n욕설 및 비방은 예고 없이 삭제될 수 있어요.",
            )}
            placeholderTextColor={themeColors.text.alternative}
            multiline
            textAlignVertical="top"
            autoFocus={!isEditing}
          />

          {photoUris.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {photoUris.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 12 }} />
                  <Pressable
                    className="absolute right-1 top-1"
                    onPress={() => setPhotoUris((prev) => prev.filter((item) => item !== uri))}
                    hitSlop={8}
                  >
                    <Icon name="close-square" size={20} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 도구줄 — 사진 */}
        <View className="flex-row items-center gap-6 border-t border-background-assistive px-5 py-3">
          <Pressable onPress={() => void handlePickPhotos()} hitSlop={8} className="active:opacity-60">
            <Icon name="image" size={26} />
          </Pressable>
          <View className="flex-1" />
          <Text className="text-caption-main text-text-alternative">
            {t("사진 {{count}}/{{max}}", { count: photoUris.length, max: MAX_IMAGES })}
          </Text>
        </View>
      </KeyboardAvoidingContainer>
      {discardDialog}
    </View>
  );
}
