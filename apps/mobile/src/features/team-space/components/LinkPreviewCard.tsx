import type { LinkPreview } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";
import { Image, Linking, Pressable, Text, View } from "react-native";

import { apiClient } from "../../../shared/api/client";

// 링크 한 줄 — 미리보기를 만들 수 있는 주소(유튜브)는 썸네일+제목 카드로, 아닌 주소는 주소만 보여준다.
export function LinkPreviewCard({ url }: { url: string }) {
  const { data: preview } = useQuery({
    queryKey: ["link-preview", url],
    queryFn: () =>
      apiClient
        .get<LinkPreview | null>("/link-previews", { params: { url } })
        .then((res) => res.data ?? null),
    staleTime: 60 * 60 * 1000,
  });

  if (!preview) {
    return (
      <Pressable
        className="rounded-xl bg-background-muted px-3 py-3 active:opacity-60"
        onPress={() => void Linking.openURL(url)}
      >
        <Text className="text-body-small text-primary-normal" numberOfLines={1}>
          {url}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      className="flex-row overflow-hidden rounded-xl bg-background-muted active:opacity-80"
      onPress={() => void Linking.openURL(url)}
    >
      {preview.thumbnailUrl && (
        <Image source={{ uri: preview.thumbnailUrl }} style={{ width: 120, height: 90 }} resizeMode="cover" />
      )}
      <View className="flex-1 justify-center px-3 py-2">
        <Text className="text-body-main text-text-normal" numberOfLines={2}>
          {preview.title}
        </Text>
        {preview.description && (
          <Text className="mt-1 text-body-small text-text-alternative" numberOfLines={1}>
            {preview.description}
          </Text>
        )}
        <Text className="mt-1 text-caption-main text-text-alternative" numberOfLines={1}>
          {preview.domain}
        </Text>
      </View>
    </Pressable>
  );
}
