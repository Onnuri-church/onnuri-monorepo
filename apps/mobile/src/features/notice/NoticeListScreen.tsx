import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NoticeInfo } from "@onnuri/shared";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { ContextMenu } from "../../shared/components/base/ContextMenu";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { toNoticeDateLabel, useDeleteNotice, useNoticeList } from "./api";

// 마이페이지 > 공지사항 (자체 디자인 — 시안 없음, 홈 배너 관리 목록과 같은 결).
// 열람은 누구나, 등록(헤더 오른쪽 버튼)·수정·삭제(⋮ 메뉴)는 관리자에게만 보인다.
// 공지가 계속 쌓이므로 20개씩 받아 스크롤이 끝에 닿으면 다음 쪽을 이어 붙인다.
export function NoticeListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNoticeList();
  const notices = (data?.pages ?? []).flatMap((page) => page.items);
  const isAdmin = useMe()?.isAdmin === true;
  const deleteNotice = useDeleteNotice();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // ⋮ 메뉴 — 누른 버튼의 화면 좌표 아래에 붙인다 (기도제목 게시판과 같은 방식).
  const [menu, setMenu] = useState<{ notice: NoticeInfo; top: number; right: number } | null>(
    null,
  );

  const [pendingDelete, setPendingDelete] = useState<NoticeInfo | null>(null);
  const dialogRef = useRef<AppDialogRef>(null);

  // 등록 버튼이 관리자 여부에 달려 있어 화면이 헤더를 직접 등록한다 (DESIGN.md 헤더 규칙).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () =>
        isAdmin ? (
          <Header
            variant="sub"
            title={t("공지사항")}
            rightAction="text"
            rightLabel={t("등록")}
            onPressRightLabel={() => navigation.navigate("NoticeWrite")}
          />
        ) : (
          <Header variant="sub" title={t("공지사항")} />
        ),
    });
  }, [navigation, isAdmin, t]);

  const handleDeletePress = (notice: NoticeInfo) => {
    setPendingDelete(notice);
    dialogRef.current?.open();
  };

  const confirmDelete = () => {
    dialogRef.current?.close();
    if (!pendingDelete) return;
    deleteNotice.mutate(pendingDelete.id, {
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
    setPendingDelete(null);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <FlatList
        data={notices}
        keyExtractor={(notice) => notice.id}
        contentContainerClassName="pt-2"
        // 바닥 여백에 안전영역을 더한다 — 안드로이드 내비 바에 마지막 공지가 가리지 않게.
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item: notice }) => (
          <Pressable
            className="mx-5 flex-row items-center justify-between border-b border-background-assistive py-4"
            onPress={() => navigation.navigate("NoticeDetail", { id: notice.id })}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <View className="flex-1 pr-3">
              <Text className="text-body-main text-text-normal" numberOfLines={1}>
                {notice.title}
              </Text>
              <Text className="mt-1 text-body-small text-text-alternative">
                {toNoticeDateLabel(notice.createdAt)}
              </Text>
            </View>
            {isAdmin ? (
              <NoticeMenuButton
                onPress={(anchor) =>
                  setMenu({
                    notice,
                    top: anchor.y + anchor.height + 4,
                    right: windowWidth - (anchor.x + anchor.width),
                  })
                }
              />
            ) : (
              <Icon name="expand-right" size={16} color={colors.icon.normal} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-10 text-center text-body-medium text-text-alternative">
              {t("등록된 공지가 없어요")}
            </Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator className="mt-4" /> : null
        }
      />

      <ContextMenu
        visible={menu !== null}
        onClose={() => setMenu(null)}
        style={menu ? { top: menu.top, right: menu.right } : undefined}
        items={[
          {
            icon: "edit",
            label: t("수정하기"),
            onPress: () => menu && navigation.navigate("NoticeWrite", { id: menu.notice.id }),
          },
          {
            icon: "trash-can",
            label: t("삭제하기"),
            onPress: () => menu && handleDeletePress(menu.notice),
          },
        ]}
      />

      <AppDialog
        ref={dialogRef}
        title={t("\"{{title}}\" 공지를 삭제하시겠습니까?", { title: pendingDelete?.title ?? "" })}
        description={t("삭제된 공지는 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

interface NoticeMenuButtonProps {
  onPress: (anchor: { x: number; y: number; width: number; height: number }) => void;
}

// 행 오른쪽 ⋮ 버튼. 메뉴를 붙일 화면 좌표를 눌렀을 때 실측해서 넘긴다.
function NoticeMenuButton({ onPress }: NoticeMenuButtonProps) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      onPress={() =>
        ref.current?.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }))
      }
      hitSlop={10}
    >
      <Icon name="more" size={24} color={colors.icon.normal} />
    </Pressable>
  );
}
