import { i18n } from "../../shared/i18n";

// 팔로워 노트 화면 공용 상수. 노트 데이터는 /cells/:id/follower-notes 실데이터 (api.ts).
// 노트는 셀모임 날짜(일요일) 단위로 셀장이 쓰는 주간 보고다 — 열람은 그 셀의
// 셀장(부셀장 포함)과 관리자뿐, 작성은 셀장만이고 관리자(목사님) 댓글은 "목사님 댓글"로 표시된다.

// 작성 화면의 3문항. 상세 화면의 섹션 제목도 이걸 쓴다. 언어가 바뀌어도 따라가도록 호출 시점에 번역한다.
// 노트마다 양식 버전(formVersion)이 있어, 예전 노트는 예전 문항 제목으로 보여준다 (SCRUM-179).
// 새 노트는 항상 최신 버전 — 서버가 기본값으로 넣는다.
export const getNoteQuestions = (formVersion = 2) =>
  formVersion === 1
    ? [
        { title: i18n.t("요즘 상황과 기도제목"), placeholder: "" },
        { title: i18n.t("나눔 중 함께 이야기하면 좋을 것"), placeholder: "" },
        { title: i18n.t("궁금한 점이나 하고 싶은 말"), placeholder: "" },
      ]
    : [
        {
          title: i18n.t("셀 나눔 이야기"),
          placeholder: i18n.t("이번 모임에서 나눈 이야기"),
        },
        {
          title: i18n.t("셀 기도제목"),
          placeholder: i18n.t("셀원들의 기도제목"),
        },
        {
          title: i18n.t("그 외 이야기"),
          placeholder: i18n.t("예) 목사님께 함께 기도·관심 부탁, 셀 계획, 셀장으로서 근황"),
        },
      ];

// 답변 한 칸의 최대 글자 수 — 서버 검증(FOLLOWER_NOTE_ANSWER_MAX)과 같다.
export const NOTE_ANSWER_MAX_LENGTH = 5000;
