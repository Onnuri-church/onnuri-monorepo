import { useCallback, useRef, useState } from "react";

/**
 * 등록·저장 버튼의 연타(중복 제출) 방어.
 *
 * mutation의 isPending은 요청을 보낸 "뒤에야" true가 된다 — 사진 업로드를 기다리는 동안이나 화면이
 * 다시 그려지기 전에 한 번 더 누르면 같은 글·셀·방이 두 번 만들어진다. acquire는 누르는 즉시 바뀌는 ref로
 * 두 번째 호출을 막고, locked는 버튼을 잠그는 데 쓴다.
 *
 * 사용: `if (!acquire()) return;`으로 시작해서, 실패하는 모든 경로에서 release()를 부른다.
 * 성공하면 화면을 떠나므로 풀지 않는다.
 */
export function useSubmitLock() {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const acquire = useCallback((): boolean => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    setLocked(true);
    return true;
  }, []);

  const release = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
  }, []);

  return { locked, acquire, release };
}
