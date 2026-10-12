import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { createBulletin, fetchBulletin, updateBulletin } from "./api";

// 주보는 앞/뒤 2장 고정, 나눔지는 0~5장 (나눔지 없이 주보만 올릴 수 있다).
const BULLETIN_PHOTO_COUNT = 2;
const MAX_SHARING_SHEET_PHOTOS = 5;

// 주보/나눔지 업로드 (시안: 날짜 → 주보 → 나눔지 → 등록하기).
// 사진 섹션 둘은 같은 컴포넌트지만 올리는 대상이 달라 상태를 따로 갖는다.
// params.id가 있으면 수정 모드 — 날짜는 못 바꾸고 이미지만 교체한다.
export function BulletinWriteScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "BulletinWrite">>();
  const editingId = params?.id;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // 날짜는 오늘로 시작한다 — 비워둘 수 없어서 등록 조건에는 사진만 본다.
  const [selectDate, setSelectDate] = useState(toDateString(new Date()));
  const [bulletinUris, setBulletinUris] = useState<string[]>([]);
  const [sharingSheetUris, setSharingSheetUris] = useState<string[]>([]);

  // 수정 모드 프리필 — 기존 이미지(http 주소)를 그대로 채운다 (uploadImage가 http는 그대로 통과).
  const { data: existing } = useQuery({
    queryKey: ["bulletin", editingId],
    queryFn: () => fetchBulletin(editingId as string),
    enabled: editingId !== undefined,
  });
  // 처음 한 번만 채운다 — 배경 재조회가 편집 중인 사진을 덮어쓰지 않게.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    setBulletinUris(existing.bulletinImages.map((image) => image.url));
    setSharingSheetUris(existing.handoutImages.map((image) => image.url));
  }, [existing]);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      // 사진은 기기 경로(file://)라 등록 전에 URL로 바꾼다. 한 장이라도 실패하면 등록하지
      // 않는다 — 주보 한 면이 빠진 채 올라가면 올린 줄 알고 그냥 넘어간다.
      const [bulletinImageUrls, handoutImageUrls] = await Promise.all([
        Promise.all(bulletinUris.map(uploadImage)),
        Promise.all(sharingSheetUris.map(uploadImage)),
      ]);
      if (editingId) {
        return updateBulletin(editingId, { bulletinImageUrls, handoutImageUrls });
      }
      return createBulletin({ date: selectDate, bulletinImageUrls, handoutImageUrls });
    },

    onSuccess: (bulletin) => {
      // 목록의 월 필터·카드는 서버가 만드는 값이라 다시 받는다.
      // 상세는 방금 받은 응답이 곧 최신이라 요청 없이 캐시에 바로 넣는다.
      void queryClient.invalidateQueries({ queryKey: ["bulletins"] });
      queryClient.setQueryData(["bulletin", bulletin.id], bulletin);
      navigation.goBack();
    },

    onError: (error) => {
      // 이미 주보가 있는 날짜 등은 서버가 이유를 message로 준다 (검증 실패면 배열로 온다).
      const message = (error as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      Alert.alert(
        editingId ? t("수정 실패") : t("등록 실패"),
        (Array.isArray(message) ? message.join("\n") : message) ?? t("잠시 후 다시 시도해주세요."),
      );
    },
  });

  // 주보는 앞·뒤 2장이 다 있어야 한다 (서버도 정확히 2장만 받는다). 나눔지는 없어도 된다.
  const canSubmit = bulletinUris.length === BULLETIN_PHOTO_COUNT;

  const handleSubmitPress = () => submit();

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        className="h-full flex-1"
        contentContainerClassName="justify-start gap-8 px-5 pt-4"
        // 바닥 여백에 안전영역을 더한다 — 안드로이드 내비 바에 등록 버튼이 가리지 않게.
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        {editingId ? (
          // 날짜는 바꿀 수 없다 — 날짜를 바꾸려면 삭제 후 다시 올린다.
          <Field label={t("날짜")}>
            <Text className="text-body-main text-text-alternative">{existing?.dateLabel ?? ""}</Text>
          </Field>
        ) : (
          <DateField
            label={t("날짜")}
            placeholder={t("날짜를 선택하세요.")}
            value={selectDate}
            onChange={setSelectDate}
          />
        )}

        <Field label={t("주보")}>
          <ImageUploadBoxMultiple
            imageUris={bulletinUris}
            onChange={setBulletinUris}
            maxCount={BULLETIN_PHOTO_COUNT}
          />
        </Field>

        <Field label={t("나눔지(최대 {{count}}장)", { count: MAX_SHARING_SHEET_PHOTOS })}>
          <ImageUploadBoxMultiple
            imageUris={sharingSheetUris}
            onChange={setSharingSheetUris}
            maxCount={MAX_SHARING_SHEET_PHOTOS}
          />
        </Field>

        <View className="mt-8">
          {/* 등록 중에도 막는다 — 사진 업로드까지 끝나야 응답이 와서 두 번 눌리기 쉽다. */}
          <Button
            label={editingId ? t("저장") : t("등록하기")}
            onPress={handleSubmitPress}
            disabled={!canSubmit}
            loading={isPending}
          />
        </View>
      </ScrollView>
    </View>
  );
}
