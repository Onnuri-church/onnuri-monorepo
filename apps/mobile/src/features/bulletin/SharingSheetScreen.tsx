import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import { ImagePager } from "../../shared/components/base/ImagePager";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { deleteBulletin, fetchBulletin } from "./api";

// 나눔지. 주보 상세와 화면이 같아서 ImagePager를 함께 쓰고, 여기서는 데이터만 고른다.
// 주보와 한 응답(GET /bulletins/:id)에 같이 와서 캐시도 주보 상세와 같이 쓴다.
// 나눔지에만 붙는 것(본문·나눔 질문 등)이 생기면 이 파일에만 더하면 된다.
// 주보 업로드 권한이 있는 사람에게는 주보 상세와 같은 ⋮ 메뉴(수정·삭제)가 붙는다 (SCRUM-284) —
// 주보와 나눔지는 한 건으로 묶여 있어 수정 화면도 같고, 삭제하면 둘이 함께 지워진다.
export function SharingSheetScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "SharingSheet">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const canManage = useMe()?.canUploadBulletin === true;
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const { data, isPending, isError } = useQuery({
    queryKey: ["bulletin", params.id],
    queryFn: () => fetchBulletin(params.id),
  });

  const remove = useMutation({
    mutationFn: () => deleteBulletin(params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bulletins"] });
      navigation.goBack();
    },
    onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
  });

  // ⋮ 메뉴가 권한 여부에 달려 있어 화면이 헤더를 직접 등록한다 (주보 상세와 같은 방식).
  // 권한이 없으면 라우트 기본 헤더를 그대로 쓴다.
  useLayoutEffect(() => {
    if (!canManage) return;
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("나눔지")}
          rightAction="more"
          menuItems={[
            {
              icon: "edit",
              label: t("수정하기"),
              onPress: () => navigation.navigate("BulletinWrite", { id: params.id }),
            },
            {
              icon: "trash-can",
              label: t("삭제하기"),
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, canManage, t, params.id]);

  if (isPending) return <View className="flex-1 bg-background-normal" />;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("나눔지를 불러오지 못했어요")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={data.handoutImages} />
      <AppDialog
        ref={deleteDialogRef}
        title={t("{{date}} 주보를 삭제하시겠습니까?", { date: data.dateLabel })}
        description={t("주보와 나눔지 사진이 함께 삭제되며 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={() => {
          deleteDialogRef.current?.close();
          remove.mutate();
        }}
      />
    </View>
  );
}
