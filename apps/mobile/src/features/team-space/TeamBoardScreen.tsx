import type { TeamBoardPostInfo } from "@onnuri/shared";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { PickerPill } from "../../shared/components/composed/PickerPill";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useTeamBoard } from "./api";

// "2026-10-12T05:30:00Z" → "2026.10.12" (KST 기준 날짜)
function toDateLabel(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${kst.getUTCFullYear()}.${month}.${day}`;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

// 팀 전용 게시판 목록 — 위에서 연·월을 골라 그 달의 글을 보고(최신순 20개씩), 공지는 달과 상관없이
// 맨 위에 고정된다. 글쓰기는 팀원(과 관리자) 누구나.
export function TeamBoardScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamBoard">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  // 처음엔 고르지 않고 보낸다 — 서버가 이번 달을 골라 준다.
  const [pick, setPick] = useState<{ year: number; month: number }>();
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTeamBoard(params.teamId, pick);

  const first = data?.pages[0];
  const notices = first?.notices ?? [];
  const posts = (data?.pages ?? []).flatMap((page) => page.items);
  const selectedYear = first?.selectedYear;
  const selectedMonth = first?.selectedMonth;
  const years = first?.years ?? [];

  const renderPost = (post: TeamBoardPostInfo) => (
    <Pressable
      key={post.id}
      className="gap-2 rounded-5 border border-background-muted bg-background-normal p-4 active:opacity-80"
      onPress={() =>
        navigation.navigate("TeamBoardDetail", { teamId: params.teamId, postId: post.id })
      }
    >
      {post.isNotice && (
        <View className="self-start rounded-full bg-background-gold px-2.5 py-0.5">
          <Text className="text-caption-main text-semantic-warning">{t("공지")}</Text>
        </View>
      )}
      <View className="flex-row items-center gap-2">
        <Avatar imageUrl={post.authorAvatarUrl} size={32} />
        <View className="flex-1">
          <Text className="text-body-main text-text-normal">{post.authorName}</Text>
        </View>
        {/* 올린 날짜 — 작게 */}
        <Text className="text-caption-main text-text-alternative">{toDateLabel(post.createdAt)}</Text>
      </View>
      {post.content !== "" && (
        <Text className="text-body-medium text-text-neutral" numberOfLines={3}>
          {post.content}
        </Text>
      )}
      <View className="flex-row items-center gap-3">
        {post.imageUrls.length > 0 && (
          <Text className="text-caption-main text-text-alternative">
            {t("사진 {{count}}", { count: post.imageUrls.length })}
          </Text>
        )}
        {post.files.length > 0 && (
          <Text className="text-caption-main text-text-alternative">
            {t("파일 {{count}}", { count: post.files.length })}
          </Text>
        )}
        {post.links.length > 0 && (
          <Text className="text-caption-main text-text-alternative">
            {t("링크 {{count}}", { count: post.links.length })}
          </Text>
        )}
        <View className="flex-1" />
        {post.reactions.length > 0 && (
          <Text className="text-caption-main text-text-alternative">
            {post.reactions.map((reaction) => reaction.emoji).join("")}{" "}
            {post.reactions.reduce((sum, reaction) => sum + reaction.count, 0)}
          </Text>
        )}
        <Text className="text-caption-main text-text-alternative">
          {t("댓글 {{count}}", { count: post.commentCount })}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background-normal">
      {/* 연·월 — 요청값이 아니라 서버가 실제로 조회한 연·월을 표시한다 */}
      {selectedYear !== undefined && selectedMonth !== undefined && (
        <View className="flex-row items-center gap-2 px-5 pb-1 pt-4">
          <PickerPill
            label={t("{{year}}년", { year: selectedYear })}
            options={years.map((year) => ({ value: year, label: t("{{year}}년", { year }) }))}
            selected={selectedYear}
            onSelect={(year) => setPick({ year, month: selectedMonth })}
          />
          <PickerPill
            label={t("{{month}}월", { month: selectedMonth })}
            options={MONTHS.map((month) => ({ value: month, label: t("{{month}}월", { month }) }))}
            selected={selectedMonth}
            onSelect={(month) => setPick({ year: selectedYear, month })}
          />
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerClassName="gap-4 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={notices.length > 0 ? <View className="gap-4">{notices.map(renderPost)}</View> : null}
        renderItem={({ item: post }) => renderPost(post)}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-16 text-center text-body-medium text-text-alternative">
              {t("이 달에는 올라온 글이 없어요.")}
            </Text>
          )
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="mt-4" /> : null}
      />

      <FloatingButton onPress={() => navigation.navigate("TeamBoardWrite", { teamId: params.teamId })}>
        <Icon name="write" size={24} color={colors.icon.disable} />
      </FloatingButton>
    </View>
  );
}
