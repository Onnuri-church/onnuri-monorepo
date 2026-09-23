import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { TextField } from "../../shared/components/base/TextField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateHomeBanner } from "./api";
import { RadioOption } from "./components/RadioOption";

type BannerKind = "SERMON" | "POSTER";

// 홈 배너 등록 (자체 디자인 — 시안 없음). 말씀 배너는 텍스트 2개(제목·구절)로 현재 홈
// 디자인에 얹히고, 포스터 배너는 이미지 한 장을 통으로 채운다. "9월 설교 시리즈" 라벨은
// 등록 월로 서버가 자동으로 만든다.
export function AdminBannerFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const createBanner = useCreateHomeBanner();

  const [kind, setKind] = useState<BannerKind>("SERMON");
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    !saving &&
    title.trim() !== "" &&
    (kind === "SERMON" ? passage.trim() !== "" : posterUri !== null);

  const handlePosterUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (셀 커버 업로드와 동일).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setPosterUri(result.assets[0].uri);
  };

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (kind === "POSTER" && posterUri) {
        imageUrl = await uploadImage(posterUri);
      }
      await createBanner.mutateAsync({
        title: title.trim(),
        ...(kind === "SERMON" ? { passage: passage.trim() } : { imageUrl }),
      });
      navigation.goBack();
    } catch {
      Alert.alert("등록 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-6 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-4">
            <Text className="text-body-main text-text-normal">배너 유형</Text>
            <View className="flex-row items-center gap-5">
              <RadioOption
                label="말씀 배너"
                selected={kind === "SERMON"}
                onPress={() => setKind("SERMON")}
              />
              <RadioOption
                label="포스터 배너"
                selected={kind === "POSTER"}
                onPress={() => setKind("POSTER")}
              />
            </View>
          </View>

          {kind === "SERMON" ? (
            <>
              <TextField
                label="말씀 제목"
                placeholder="예: 나를 따르라"
                value={title}
                onChangeText={setTitle}
              />
              <TextField
                label="성경 구절"
                placeholder="예: 마태복음 6:5-8"
                value={passage}
                onChangeText={setPassage}
              />
              <Text className="-mt-2 text-caption-main text-text-alternative">
                "{new Date().getMonth() + 1}월 설교 시리즈" 라벨은 자동으로 붙어요
              </Text>
            </>
          ) : (
            <>
              <TextField
                label="배너 이름"
                placeholder="예: 여름 수련회 (관리 목록에만 보여요)"
                value={title}
                onChangeText={setTitle}
              />
              <View className="py-3">
                <Text className="text-body-main text-text-normal">포스터</Text>
                <View className="mt-4 h-43">
                  <ImageSlot
                    imageUri={posterUri}
                    outline
                    onUploadPress={handlePosterUploadPress}
                    onDeletePress={() => setPosterUri(null)}
                  />
                </View>
                <Text className="mt-2 text-caption-main text-text-alternative">
                  홈에서는 배너 크기에 맞춰 잘려 보이고, 탭하면 원본 비율로 크게 볼 수 있어요
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View className="px-5 pb-12">
          <Button
            label={saving ? "등록하는 중..." : "등록하기"}
            disabled={!canSubmit}
            onPress={handleSubmitPress}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
