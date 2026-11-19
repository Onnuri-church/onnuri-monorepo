import { MutationCache, QueryClient } from "@tanstack/react-query";

import { alertIfUnnoticed } from "./requestErrorAlert";

export const queryClient = new QueryClient({
  // 저장·삭제 요청이 실패했는데 화면이 안내하지 않으면 공통 안내를 띄운다 (SCRUM-262).
  // 사용자가 누르지 않았는데 뒤에서 도는 요청(읽음 처리 등)은 meta.silentError로 뺀다.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silentError) return;
      alertIfUnnoticed(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});
