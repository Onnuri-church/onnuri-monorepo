import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useChatMediaPages } from "./api";
import { ChatImageViewer } from "./components/ChatImageViewer";

const COLUMNS = 3;
const GAP = 2;

type Row =
  | { type: "month"; key: string; label: string }
  | { type: "photos"; key: string; items: { url: string; index: number }[] };

// 단톡방 사진 전체 보기 (SCRUM-233) — 카카오톡의 사진/동영상 모아보기처럼 한 줄에 3장씩,
// "2026년 11월"처럼 달별로 나눈다. 아래로 내리면 이전 사진을 이어 받고, 누르면 크게 보며 옆으로 넘긴다.
export function ChatMediaScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { kind, id } = useRoute<RouteProp<RootStackParamList, "ChatMedia">>().params;
  const { width } = useWindowDimensions();
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatMediaPages(
    kind,
    id,
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <Header variant="sub" title={t("사진/동영상")} rightAction="none" />,
    });
  }, [navigation, t]);

  const items = useMemo(() => (data?.pages ?? []).flat(), [data]);
  const urls = useMemo(() => items.map((item) => item.url), [items]);

  // 달이 바뀔 때마다 제목 줄을 넣고, 그 달 사진을 3장씩 줄로 묶는다.
  const rows = useMemo(() => {
    const result: Row[] = [];
    let month = "";
    let bucket: { url: string; index: number }[] = [];
    const flush = () => {
      if (bucket.length > 0) {
        result.push({ type: "photos", key: `p-${bucket[0].index}`, items: bucket });
        bucket = [];
      }
    };
    items.forEach((item, index) => {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (key !== month) {
        flush();
        month = key;
        const label = i18n.language.startsWith("ko")
          ? `${date.getFullYear()}년 ${date.getMonth() + 1}월`
          : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
        result.push({ type: "month", key: `m-${key}`, label });
      }
      bucket.push({ url: item.url, index });
      if (bucket.length === COLUMNS) flush();
    });
    flush();
    return result;
  }, [items, i18n.language]);

  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View className="flex-1 bg-background-normal">
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item: row }) =>
          row.type === "month" ? (
            <Text className="px-5 pb-2 pt-5 text-body-main text-text-normal">{row.label}</Text>
          ) : (
            <View className="flex-row" style={{ gap: GAP, marginBottom: GAP }}>
              {row.items.map((photo) => (
                <Pressable key={photo.index} onPress={() => setViewerIndex(photo.index)}>
                  <Image
                    source={{ uri: photo.url }}
                    style={{ width: size, height: size }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          isPending ? (
            <ActivityIndicator className="mt-16" />
          ) : (
            <Text className="mt-16 text-center text-body-medium text-text-alternative">
              {t("아직 주고받은 사진이 없어요")}
            </Text>
          )
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null}
      />

      <ChatImageViewer urls={urls} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}
