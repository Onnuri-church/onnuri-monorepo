import { isAxiosError } from "axios";
import { Alert } from "react-native";

import { i18n } from "../i18n";

// 요청 실패 공통 안내 (SCRUM-262).
//
// 저장·삭제 같은 요청(mutation)이 실패했는데 화면이 아무 안내도 하지 않으면 버튼 로딩만 풀리고
// "아무 일도 없는 것처럼" 보인다 (팀 등록·팀원 관리 등 10개 화면이 그랬다). 화면마다 안내를 넣는
// 대신, 실패 뒤 잠깐 기다렸다가 그 사이 화면이 스스로 안내(알림창·토스트)하지 않았을 때만 여기서
// 서버 문구로 알림창을 띄운다. 이미 자기 안내가 있는 화면은 그대로 두고, 새 화면은 따로 신경 쓰지
// 않아도 최소한의 안내가 보장된다.

/** 실패 뒤 화면의 자체 안내를 기다리는 시간 — catch 안에서 한두 단계 더 거친 뒤 띄우는 경우까지 봐준다. */
const WAIT_FOR_SCREEN_MS = 300;
/** 실패 직전에 뜬 안내도 그 실패의 안내로 본다 — 세션 만료처럼 인터셉터가 먼저 알리고 실패를 돌려주는 경우. */
const NOTICE_LOOKBACK_MS = 500;

let lastNoticeAt = 0;

/** 사용자에게 무언가를 알렸다고 기록한다. 알림창은 아래에서 자동으로 기록되고, 토스트는 직접 부른다. */
export function markUserNotified(): void {
  lastNoticeAt = Date.now();
}

// 화면들이 쓰는 Alert.alert를 감싸 "안내가 떴다"는 사실만 기록한다 — 동작은 그대로다.
const originalAlert = Alert.alert.bind(Alert);
Alert.alert = (...args: Parameters<typeof Alert.alert>) => {
  markUserNotified();
  originalAlert(...args);
};

/** 사용자에게 보여줄 실패 문구 — 서버가 준 문구가 있으면 그대로, 없으면 상황에 맞는 기본 문구. */
export function requestErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // 응답이 없으면 서버에 닿지 못한 것 (통신 끊김·시간 초과).
    if (!error.response) {
      return i18n.t("연결이 불안정해요. 잠시 후 다시 시도해주세요.");
    }
    const body = error.response.data as { message?: unknown } | undefined;
    // 서버(NestJS)는 입력 검증 실패면 문구 배열을, 그 밖엔 문구 하나를 준다. 5xx는 내부 오류라 감춘다.
    if (error.response.status < 500) {
      const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
      if (typeof message === "string" && message.length > 0) return message;
    }
  }
  return i18n.t("잠시 후 다시 시도해주세요.");
}

/** 실패 안내 알림창을 바로 띄운다 — mutation 밖의 실패(사진 업로드 등)를 화면이 직접 알릴 때 쓴다. */
export function showRequestError(error: unknown): void {
  Alert.alert(i18n.t("요청을 처리하지 못했어요"), requestErrorMessage(error));
}

/** 실패 뒤 화면이 스스로 안내하지 않았으면 공통 안내를 띄운다. QueryClient의 mutation 실패에 연결돼 있다. */
export function alertIfUnnoticed(error: unknown): void {
  // 세션 만료(401)는 인터셉터가 이미 알리고 로그인 화면으로 보낸다.
  if (isAxiosError(error) && error.response?.status === 401) return;
  const failedAt = Date.now();
  setTimeout(() => {
    if (lastNoticeAt >= failedAt - NOTICE_LOOKBACK_MS) return;
    showRequestError(error);
  }, WAIT_FOR_SCREEN_MS);
}
