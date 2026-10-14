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

// 주보 상세. 이미지만 넘겨서 보므로 화면은 데이터만 고르고 나머지는 ImagePager가 한다
// (나눔지 화면 SharingSheetScreen과 같은 구조다 — 같은 응답의 다른 이미지 묶음을 쓴다).
// 주보 업로드 권한이 있는 사람(관리자·권한 팀 팀원)에게는 헤더 ⋮ 메뉴에 삭제하기가 붙는다.
export function BulletinDetailScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "BulletinDetail">>();
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

  // ⋮ 메뉴가 권한 여부에 달려 있어 화면이 헤더를 직접 등록한다 (DESIGN.md 헤더 규칙).
  // 권한이 없으면 라우트 기본 헤더(공유 아이콘)를 그대로 쓴다.
  useLayoutEffect(() => {
    if (!canManage) return;
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("주보")}
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
  }, [navigation, canManage, t]);

  if (isPending) return <View className="flex-1 bg-background-normal" />;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("주보를 불러오지 못했어요")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={data.bulletinImages} />
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
