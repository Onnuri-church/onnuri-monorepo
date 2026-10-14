import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import { CellManageList } from "./components/CellManageList";

// 마이페이지 관리자 메뉴 > 셀 관리 — 생성은 목록 끝의 점선 행(2026-09-21 A안 시안,
// 헤더 생성 버튼에서 이동), 편집·삭제는 헤더 ⋮ > 편집하기로 행마다 아이콘을 켠다.
// 관리자는 하단 탭 "셀 페이지"에서도 같은 목록을 본다(CellScreen).
export function AdminCellManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [editing, setEditing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () =>
        editing ? (
          <Header
            variant="sub"
            title={t("셀 관리")}
            rightAction="text"
            rightLabel={t("완료")}
            onPressRightLabel={() => setEditing(false)}
          />
        ) : (
          <Header
            variant="sub"
            title={t("셀 관리")}
            rightAction="more"
            menuItems={[{ icon: "edit", label: t("편집하기"), onPress: () => setEditing(true) }]}
          />
        ),
    });
  }, [navigation, editing, t]);

  return <CellManageList editing={editing} />;
}
