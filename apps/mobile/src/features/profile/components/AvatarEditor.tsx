import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { uploadImage } from "../../../shared/api/upload";
import { AppSheet, type AppSheetRef } from "../../../shared/components/base/AppSheet";
import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";
import { patchMyAvatar } from "../api";

interface AvatarEditorProps {
  /** 현재 프로필 사진 — null이면 기본 이미지(Avatar의 OY 심볼). */
  avatarUrl: string | null;
  /** 저장이 끝난 뒤 새 값(기본 이미지는 null)을 알려준다 — 호출부가 자기 상태를 맞춘다. */
  onChange: (avatarUrl: string | null) => void;
  /** 지름(px). 기본은 마이페이지 아바타와 같은 100. */
  size?: number;
}

// 프로필 사진 편집 원 — 온보딩 프로필 설정과 회원 정보 수정(같은 화면)이 쓴다.
// 동작은 마이페이지 아바타 변경과 동일한 계약: 사진이 있으면 시트(앨범/기본 이미지),
// 없으면 바로 앨범. 고르는 즉시 서버에 저장한다 (PATCH /users/me/avatar).
export function AvatarEditor({ avatarUrl, onChange, size = 100 }: AvatarEditorProps) {
  const queryClient = useQueryClient();
  const sheetRef = useRef<AppSheetRef>(null);
  const [uploading, setUploading] = useState(false);

  // 서버 저장 + 캐시 정리 — 마이페이지 등 /users/me를 보는 화면이 이전 사진을 들고 있지 않게.
  const save = async (next: string | null) => {
    await patchMyAvatar(next);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    onChange(next);
  };

  const handlePickPress = async () => {
    sheetRef.current?.close();
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      await save(await uploadImage(result.assets[0].uri));
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleResetPress = async () => {
    sheetRef.current?.close();
    if (uploading) return;
    setUploading(true);
    try {
      await save(null);
    } catch {
      Alert.alert("변경 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (uploading) return;
    // 선택지가 하나뿐일 때 시트를 띄우는 건 손만 늘리는 일 — 마이페이지와 같은 분기.
    if (avatarUrl) {
      sheetRef.current?.open();
    } else {
      void handlePickPress();
    }
  };

  return (
    <View className="items-center">
      <Pressable
        onPress={handleAvatarPress}
        disabled={uploading}
        style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
      >
        <Avatar imageUrl={avatarUrl} size={size} />
        <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border border-background-assistive bg-background-normal">
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary.normal} />
          ) : (
            <Icon name="edit" size={14} color={colors.icon.normal} />
          )}
        </View>
      </Pressable>

      {/* 프로필 사진 변경 시트 — 마이페이지와 같은 구성 (앨범/기본 이미지 + 바닥 취소) */}
      <AppSheet
        ref={sheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => sheetRef.current?.close()}
              className="pt-4"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-alternative">취소</Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-6 p-4 pb-9">
          <Pressable
            onPress={() => void handlePickPress()}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-text-normal">
              앨범에서 사진 선택
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleResetPress()}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-semantic-danger">
              기본 이미지로 변경
            </Text>
          </Pressable>
        </View>
      </AppSheet>
    </View>
  );
}
