import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, View } from "react-native";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { Toggle } from "../../shared/components/base/Toggle";
import { DateField } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { useAuthStore } from "../../shared/store/useAuthStore";
import type { RootStackParamList } from "../../shared/types/navigation";
import {
  PRAYER_CATEGORIES,
  categoryLabelToValue,
  createPrayer,
  fetchPrayerDetail,
  updatePrayer,
} from "./api";

// 카테고리 선택지는 목록 필터와 같은 소스를 쓰되 "전체"만 뺀다 — 글에 "전체"를 달 수는 없다.
const WRITE_CATEGORIES = PRAYER_CATEGORIES.filter((category) => category.value !== "all").map(
  (category) => category.label,
);

// 시안 확정값 (Action Sheet-공개기간 설정). "직접설정"은 시안이 후속 동작을 안 정해서
// 앱의 DateField로 종료일을 고르게 했다 — 시안이 나오면 그 형태로 교체.
const PERIOD_OPTIONS = ["1주일", "2주일", "1개월", "직접설정"];
const PERIOD_DAYS: Record<string, number> = { "1주일": 7, "2주일": 14, "1개월": 30 };

// 오늘 기준 days 뒤의 로컬 날짜 (YYYY-MM-DD). toISOString은 UTC라 밤에 하루 밀린다.
function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 기도제목 작성하기 (시안 402pt 프레임: 익명 토글 → 기도제목 → 카테고리 → 공개기간 → 사진 → 내용 → 등록).
export function PrayerWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PrayerWrite">>();
  const queryClient = useQueryClient();
  // id가 있으면 수정 모드 — 기존 글을 불러와 필드를 채운 채 시작한다.
  const editingId = route.params?.id;

  const [anonymous, setAnonymous] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [customUntil, setCustomUntil] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: editingPrayer } = useQuery({
    queryKey: ["prayer", editingId],
    queryFn: () => fetchPrayerDetail(editingId as string),
    enabled: editingId !== undefined,
  });

  // 수정 모드 프리필. 공개기간은 프리셋으로 되돌릴 수 없어 비워둔다 —
  // 안 고르면 기존 기간이 유지된다 (placeholder로 안내).
  useEffect(() => {
    if (!editingPrayer) return;
    setAnonymous(editingPrayer.isAnonymous);
    setTitle(editingPrayer.title);
    setCategory(editingPrayer.category);
    setContent(editingPrayer.content);
    setPhotoUris(editingPrayer.photoUrls);
  }, [editingPrayer]);

  // 프리셋이면 오늘부터 계산, 직접설정이면 고른 날짜, 수정 모드에서 안 골랐으면 null(기존 유지).
  const visibleUntil =
    period === null ? null : period === "직접설정" ? customUntil : addDays(PERIOD_DAYS[period]);

  const canSubmit =
    !saving &&
    title.trim().length > 0 &&
    category !== null &&
    content.trim().length > 0 &&
    (editingId !== undefined || visibleUntil !== null);

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    const { session } = useAuthStore.getState();
    if (session.status !== "authenticated") {
      Alert.alert("로그인이 필요해요", "기도제목은 로그인 후 등록할 수 있어요.");
      return;
    }
    const categoryValue = categoryLabelToValue(category);
    if (!categoryValue) return;

    setSaving(true);
    try {
      // 새로 고른 로컬 사진(file://)만 업로드되고 기존 주소(http)는 그대로 통과한다.
      const imageUrls = await Promise.all(photoUris.map((uri) => uploadImage(uri)));
      const body = {
        title: title.trim(),
        content: content.trim(),
        category: categoryValue,
        isAnonymous: anonymous,
        imageUrls,
      };
      if (editingId) {
        await updatePrayer(editingId, {
          ...body,
          ...(visibleUntil !== null && { visibleUntil }),
        });
        await queryClient.invalidateQueries({ queryKey: ["prayer", editingId] });
      } else {
        // canSubmit이 등록 모드의 visibleUntil을 보장한다.
        await createPrayer({ ...body, visibleUntil: visibleUntil as string });
      }
      await queryClient.invalidateQueries({ queryKey: ["prayers"] });
      navigation.goBack();
    } catch {
      Alert.alert("등록 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            {/* 라벨 타이포는 Field 라벨과 동일하게 맞춘다 (시안: 같은 위계). */}
            <Text className="text-body-main text-text-normal">익명으로 작성</Text>
            <Toggle value={anonymous} onValueChange={setAnonymous} />
          </View>

          <View>
            <TextField
              label="기도제목"
              placeholder="한 줄로 표현해보세요."
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <SelectField
            label="기도 카테고리"
            placeholder="카테고리를 선택하세요."
            options={WRITE_CATEGORIES}
            value={category}
            onChange={setCategory}
          />

          <View>
            <SelectField
              label="공개기간"
              placeholder={editingId ? "기존 공개기간 유지 (바꾸려면 선택)" : "공개기간을 지정하세요."}
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            {period === "직접설정" && (
              /* SelectField 아래 py-4와 DateField 위 py-4가 겹쳐 -mt-4로 한 번 상쇄한다. */
              <View className="-mt-4">
                <DateField
                  label=""
                  placeholder="공개 종료일을 선택하세요."
                  value={customUntil}
                  onChange={setCustomUntil}
                />
              </View>
            )}
            {/* SelectField 내부의 아래 py-4를 -mt-2로 상쇄해 안내문을 입력줄 가까이 붙인다. */}
            <Text className="-mt-2 text-caption-main text-text-alternative">
              선택한 기간이 지나면 기도제목이 자동으로 목록에서 사라져요
            </Text>
          </View>

          <View>
            <Field label="사진(선택)">
              <ImageUploadBoxMultiple imageUris={photoUris} onChange={setPhotoUris} />
            </Field>
          </View>

          <View>
            <TextAreaField
              label="내용"
              placeholder="나누고 싶은 기도제목을 자유롭게 적어주세요."
              value={content}
              onChangeText={setContent}
            />
          </View>

          <View className="mt-16">
            <Button
              label={saving ? "저장하는 중..." : editingId ? "저장하기" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
