import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ATTENDANCE_QR_CODE } from "@onnuri/shared";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { checkInWorship } from "./api";

// 시안 좌표(402x874 프레임): 조준 프레임 266, 헤더 아래 149, 프레임-안내문구 간격 57.
// 화면 가운데가 아니라 위쪽에 치우쳐 있어서 세로 가운데 정렬로는 맞지 않는다.
const CROSSHAIR_SIZE = 266;
const CROSSHAIR_TOP = 149;
// 실패 안내 카드 (시안 확정값): 폭 320, 버튼 폭 254, 안전영역 위로 20 띄움.
const CARD_WIDTH = 320;
const CARD_BUTTON_WIDTH = 254;
const CARD_BOTTOM_GAP = 20;

interface ScanError {
  title: string;
  /** 없으면 부제 줄을 그리지 않는다 (시간창 안내처럼 제목만으로 충분한 경우) */
  sub: string | null;
}

// 출석 QR을 찍는 화면 — 카메라 위에 시안의 검은 오버레이·조준 프레임을 얹는다.
// 헤더를 Header 컴포넌트로 그리지 않고 여기서 직접 그린다 —
// 시안이 검은 배경에 흰 타이틀인데 sub(흰 배경)에 그 조합이 없다 (사진 뷰어와 같은 이유).
export function QrScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<ScanError | null>(null);
  // 카메라가 같은 QR을 프레임마다 계속 읽어대므로, 한 번 처리하면 잠그고
  // 결과 화면에서 돌아오거나 "다시 스캔하기"를 눌러야 푼다. 렌더와 무관해 ref로 든다.
  const lockedRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // 결과 화면에서 돌아오면 다시 스캔할 수 있게 푼다.
  useFocusEffect(
    useCallback(() => {
      lockedRef.current = false;
      setError(null);
    }, []),
  );

  const handleBarcodeScanned = async (data: string) => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    // 코드 선검증 — 출석 QR이 아니면 서버까지 갈 필요가 없다 (서버도 재검증한다).
    if (data !== ATTENDANCE_QR_CODE) {
      setError({
        title: "인식할 수 없는 QR코드예요",
        sub: "출석용 QR을 확인 후 다시 스캔해주세요",
      });
      return;
    }

    try {
      const result = await checkInWorship(data);
      navigation.navigate("QrResult", { result });
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })
        .response;
      if (response?.status === 401) {
        Alert.alert("로그인이 필요해요", "출석 체크는 로그인 후 할 수 있어요.");
        lockedRef.current = false;
        return;
      }
      // 시간창 밖·요일 아님 등 — 서버 안내 문구를 카드 제목으로 그대로 보여준다.
      setError({
        title: response?.data?.message ?? "출석 처리에 실패했어요",
        sub: response?.data?.message ? null : "잠시 후 다시 스캔해주세요",
      });
    }
  };

  const handleRescanPress = () => {
    setError(null);
    lockedRef.current = false;
  };

  return (
    <View className="flex-1 bg-text-normal">
      {/* 배경이 검정이라 상태바 글자를 밝게 뒤집는다 (스플래시와 같은 처리). */}
      <StatusBar style="light" />

      {/* 카메라는 배경 전체 — 시안의 검은 배경은 카메라가 뜨기 전(권한 없음 포함)의 바탕색이다. */}
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={(scan) => void handleBarcodeScanned(scan.data)}
        />
      )}

      <View style={{ paddingTop: insets.top }} className="flex-1">
        {/* 시안: 상태바 아래 27 띄우고 32 높이의 줄. 패딩으로 주면 높이 안에서 먹혀 줄이 눌린다. */}
        <View className="mt-7 h-8 flex-row items-center justify-between px-5">
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Icon name="back" size={28} color={colors.icon.disable} />
          </Pressable>
          <Text className="text-heading-small text-text-disable">출석체크</Text>
          {/* 자리를 남겨야 타이틀이 가운데 온다 */}
          <View className="w-7" />
        </View>

        {/* 개발 편의: 시뮬레이터에는 카메라가 없어서, 개발 빌드에서만 조준 프레임을 탭하면
            출석 QR을 스캔한 것으로 친다. 배포 빌드에서는 눌리지 않는다. */}
        <Pressable
          className="items-center"
          style={{ marginTop: CROSSHAIR_TOP }}
          disabled={!__DEV__}
          onPress={() => void handleBarcodeScanned(ATTENDANCE_QR_CODE)}
        >
          <Icon
            name="crosshair"
            size={CROSSHAIR_SIZE}
            color={error ? colors.semantic.danger : colors.primary.normal}
          />
        </Pressable>

        <View className="mt-14 items-center gap-3.5 px-5">
          {permission && !permission.granted ? (
            <>
              <Text className="text-body-small-bold text-text-disable">
                카메라 권한이 필요해요
              </Text>
              <Text className="text-center text-body-regular text-text-disable">
                출석 QR을 스캔하려면 설정에서{"\n"}카메라 접근을 허용해주세요
              </Text>
            </>
          ) : (
            <>
              <Text className="text-body-small-bold text-text-disable">
                QR코드를 화면 안에 맞춰주세요
              </Text>
              <Text className="text-body-regular text-text-disable">
                입구에 있는 출석 QR을 스캔해요
              </Text>
            </>
          )}
        </View>

        {/* 실패 안내는 화면 위에 얹는 카드다 — 시안에 딤 처리가 없고 조준 프레임이 계속 보여야 해서
            AppDialog(딤 + 바텀시트)를 쓰지 않는다. */}
        {error && (
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
                <Text className="text-center text-body-main text-text-normal">{error.title}</Text>
                {error.sub && (
                  <Text className="text-body-regular text-text-alternative">{error.sub}</Text>
                )}
              </View>
              <Pressable
                className="h-7.5 items-center justify-center rounded-lg bg-primary-normal active:opacity-80"
                style={{ width: CARD_BUTTON_WIDTH }}
                onPress={handleRescanPress}
              >
                <Text className="text-body-medium text-text-disable">다시 스캔하기</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
