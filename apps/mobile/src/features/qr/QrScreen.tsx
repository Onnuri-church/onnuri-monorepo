import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 시안 좌표(402x874 프레임): 조준 프레임 266, 헤더 아래 149, 프레임-안내문구 간격 57.
// 화면 가운데가 아니라 위쪽에 치우쳐 있어서 세로 가운데 정렬로는 맞지 않는다.
const CROSSHAIR_SIZE = 266;
const CROSSHAIR_TOP = 149;
// 실패 안내 카드 (시안 확정값): 폭 320, 버튼 폭 254, 안전영역 위로 20 띄움.
const CARD_WIDTH = 320;
const CARD_BUTTON_WIDTH = 254;
const CARD_BOTTOM_GAP = 20;

// TODO(카메라): 스캔 흉내용 카운터. 화면 밖에 두는 이유는 "확인"이 스캔 화면까지 걷어내서
// 다시 들어오면 화면 상태가 초기화되기 때문이다 — 안에 두면 항상 첫 결과만 나온다.
let mockAttempt = 0;

// 출석 QR을 찍는 화면. 헤더를 Header 컴포넌트로 그리지 않고 여기서 직접 그린다 —
// 시안이 검은 배경에 흰 타이틀인데 sub(흰 배경)에 그 조합이 없다 (사진 뷰어와 같은 이유).
export function QrScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [invalid, setInvalid] = useState(false);

  // expo-camera를 붙이기 전이라 스캔을 흉내낸다 — 조준 프레임을 누를 때마다
  // 출석 완료 → 이미 출석 → 인식 실패 순으로 돌려 세 결과를 다 확인할 수 있게 한다.
  // 카메라가 붙으면 이 자리가 스캔 콜백이 되고 결과는 서버 응답이 정한다.
  const handleScanPress = () => {
    const outcome = mockAttempt % 3;
    mockAttempt += 1;
    if (outcome === 2) {
      setInvalid(true);
      return;
    }
    navigation.navigate("QrResult", { duplicate: outcome === 1 });
  };

  return (
    <View className="flex-1 bg-text-normal" style={{ paddingTop: insets.top }}>
      {/* 배경이 검정이라 상태바 글자를 밝게 뒤집는다 (스플래시와 같은 처리). */}
      <StatusBar style="light" />

      {/* 시안: 상태바 아래 27 띄우고 32 높이의 줄. 패딩으로 주면 높이 안에서 먹혀 줄이 눌린다. */}
      <View className="mt-7 h-8 flex-row items-center justify-between px-5">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="back" size={28} color={colors.icon.disable} />
        </Pressable>
        <Text className="text-heading-small text-text-disable">출석체크</Text>
        {/* 자리를 남겨야 타이틀이 가운데 온다 */}
        <View className="w-7" />
      </View>

      <Pressable
        className="items-center"
        style={{ marginTop: CROSSHAIR_TOP }}
        onPress={handleScanPress}
      >
        <Icon
          name="crosshair"
          size={CROSSHAIR_SIZE}
          color={invalid ? colors.semantic.danger : colors.primary.normal}
        />
      </Pressable>

      <View className="mt-14 items-center gap-3.5">
        <Text className="text-body-small-bold text-text-disable">QR코드를 화면 안에 맞춰주세요</Text>
        <Text className="text-body-regular text-text-disable">입구에 있는 출석 QR을 스캔해요</Text>
      </View>

      {/* 실패 안내는 화면 위에 얹는 카드다 — 시안에 딤 처리가 없고 조준 프레임이 계속 보여야 해서
          AppDialog(딤 + 바텀시트)를 쓰지 않는다. */}
      {invalid && (
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: insets.bottom + CARD_BOTTOM_GAP }}
        >
          <View
            className="items-center gap-4 rounded-2xl bg-background-normal p-6 shadow-card"
            style={{ width: CARD_WIDTH }}
          >
            <View className="h-20 w-20 items-center justify-center rounded-full bg-background-red">
              <Icon name="error" size={40} color={colors.semantic.danger} />
            </View>
            <View className="items-center gap-px">
              <Text className="text-body-main text-text-normal">인식할 수 없는 QR코드예요</Text>
              <Text className="text-body-regular text-text-alternative">
                출석용 QR을 확인 후 다시 스캔해주세요
              </Text>
            </View>
            <Pressable
              className="h-7.5 items-center justify-center rounded-lg bg-primary-normal active:opacity-80"
              style={{ width: CARD_BUTTON_WIDTH }}
              onPress={() => setInvalid(false)}
            >
              <Text className="text-body-medium text-text-disable">다시 스캔하기</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
