import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { TextField } from "../../shared/components/base/TextField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateHomeBanner, useHomeBanners, useUpdateHomeBanner } from "./api";
import { RadioOption } from "./components/RadioOption";

// 홈 배너 등록·수정 (자체 디자인 — 시안 없음). 말씀 제목·성경 구절을 입력하고 배경사진을 고르면
// 홈 배너에 "N월 설교 시리즈 / 구절 / 제목"이 사진 위에 올라간다. "9월 설교 시리즈" 라벨은
// 등록 월로 서버가 자동으로 만든다. 사진은 선택이고, 고를 때 홈 배너 비율로 자른다.
export function AdminBannerFormScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AdminBannerForm">>();
  const bannerId = route.params?.bannerId;
  const createBanner = useCreateHomeBanner();
  const updateBanner = useUpdateHomeBanner(bannerId ?? "");
  // 수정 모드 — 관리 목록 캐시에서 기존 값을 찾아 채운다 (유형은 고정).
  const { data: banners } = useHomeBanners();
  const editing = bannerId ? banners?.find((banner) => banner.id === bannerId) : undefined;
  const isEditing = bannerId !== undefined;

  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title);
    setPassage(editing.passage ?? "");
    setPosterUri(editing.imageUrl);
  }, [editing]);

  const canSubmit = !saving && title.trim() !== "" && passage.trim() !== "";

  const handlePosterUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (셀 커버 업로드와 동일).
    // 프로필 사진처럼 자르는 화면을 열어 홈 배너 비율(362:240)로 미리 맞춘다.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [362, 240],
    });
    if (result.canceled) return;
    setPosterUri(result.assets[0].uri);
  };

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (isEditing) {
        // 기존 이미지(http 주소)를 그대로 두면 다시 올리지 않는다 — 새로 고른 로컬 파일만 업로드.
        const unchanged = posterUri !== null && posterUri === editing?.imageUrl;
        const imageUrl =
          posterUri === null ? null : unchanged ? undefined : await uploadImage(posterUri);
        await updateBanner.mutateAsync({
          title: title.trim(),
          passage: passage.trim(),
          ...(imageUrl !== undefined && { imageUrl }),
        });
        navigation.goBack();
        return;
      }
      const imageUrl = posterUri ? await uploadImage(posterUri) : undefined;
      await createBanner.mutateAsync({
        title: title.trim(),
        passage: passage.trim(),
        ...(imageUrl && { imageUrl }),
      });
      navigation.goBack();
    } catch {
      Alert.alert(isEditing ? t("수정 실패") : t("등록 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-6 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <>
            <TextField
              label={t("말씀 제목")}
              placeholder={t("예: 나를 따르라")}
              value={title}
              onChangeText={setTitle}
            />
            <TextField
              label={t("성경 구절")}
              placeholder={t("예: 마태복음 6:5-8")}
              value={passage}
              onChangeText={setPassage}
            />
            <Text className="-mt-2 text-caption-main text-text-alternative">
              {t('"{{month}}월 설교 시리즈" 라벨은 자동으로 붙어요', { month: new Date().getMonth() + 1 })}
            </Text>
            <View className="py-3">
              <Text className="text-body-main text-text-normal">{t("배경사진 (선택)")}</Text>
              <View className="mt-4 h-43">
                <ImageSlot
                  imageUri={posterUri}
                  outline
                  onUploadPress={handlePosterUploadPress}
                  onDeletePress={() => setPosterUri(null)}
                />
              </View>
              <Text className="mt-2 text-caption-main text-text-alternative">
                {t("고르면 홈 배너 비율에 맞게 직접 잘라서 쓸 수 있어요. 없으면 회색 배경에 글만 올라가요")}
              </Text>
            </View>
          </>
        </ScrollView>

        <View className="px-5 pb-12">
          <Button
            label={
              saving
                ? isEditing
                  ? t("저장하는 중...")
                  : t("등록하는 중...")
                : isEditing
                  ? t("저장하기")
                  : t("등록하기")
            }
            disabled={!canSubmit}
            loading={saving}
            onPress={handleSubmitPress}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
