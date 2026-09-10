import type { QtShareListResponse } from "@onnuri/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { likePost, unlikePost } from "./api";

interface ToggleLikeArgs {
  postId: string;
  /** 누르기 직전의 상태. true면 취소 요청을 보낸다 */
  likedByMe: boolean;
}

// 좋아요는 누르는 즉시 반응해야 해서 서버 응답을 기다리지 않고 캐시를 먼저 고친다.
// 그냥 invalidate만 하면 요청 왕복 두 번(좋아요 → 목록 다시 받기)을 기다린 뒤에야
// 하트가 바뀌어서 눌러도 반응이 없는 것처럼 보인다.
// 실패하면 이전 값으로 되돌리고, 끝나면 서버 값으로 다시 맞춘다(남이 누른 좋아요 반영).
export function useToggleQtLike() {
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: ({ postId, likedByMe }: ToggleLikeArgs) =>
      likedByMe ? unlikePost(postId) : likePost(postId),

    onMutate: async ({ postId, likedByMe }) => {
      // 진행 중인 목록 요청을 멈춘다 — 늦게 도착한 응답이 방금 고친 캐시를 덮어쓰지 않게.
      await queryClient.cancelQueries({ queryKey: ["qt-shares"] });

      // 달마다 캐시가 따로 있어서(queryKey에 month가 들어간다) 전부 훑는다.
      const previous = queryClient.getQueriesData<QtShareListResponse>({
        queryKey: ["qt-shares"],
      });

      queryClient.setQueriesData<QtShareListResponse>(
        { queryKey: ["qt-shares"] },
        (old) =>
          old && {
            ...old,
            items: old.items.map((item) =>
              item.id === postId
                ? {
                    ...item,
                    likedByMe: !likedByMe,
                    likeCount: item.likeCount + (likedByMe ? -1 : 1),
                  }
                : item,
            ),
          },
      );

      return { previous };
    },

    onError: (_error, _args, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["qt-shares"] });
    },
  });

  return mutate;
}
