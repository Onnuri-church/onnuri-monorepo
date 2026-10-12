import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useSendChatMessage } from "./api";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const HOUR_MS = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 마감을 켰을 때 기본값 — 지금부터 하루 뒤, 5분 단위로 올림한다.
function defaultCloseAt(): Date {
  const target = Date.now() + 24 * HOUR_MS;
  return new Date(Math.ceil(target / FIVE_MIN_MS) * FIVE_MIN_MS);
}

// "2026.10.14 (수) 오후 4:55"
function formatCloseAt(date: Date): string {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day} (${WEEKDAYS[date.getDay()]}) ${period} ${displayHour}:${minute}`;
}

// 투표 만들기 — 제목, 항목(2~10개), 옵션(복수 선택·익명·항목 추가 허용), 마감을 정해 방에 올린다.
// 팀·셀·소그룹 단톡방이 같이 쓴다 (route의 kind·id로 방을 구분).
export function ChatPollCreateScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { params } = useRoute<RouteProp<RootStackParamList, "ChatPollCreate">>();
  const navigation = useNavigation();
  const send = useSendChatMessage(params.kind, params.id);

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  // 마감 시각 — null이면 직접 마감할 때까지 열려 있다.
  const [closeAt, setCloseAt] = useState<Date | null>(null);
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(defaultCloseAt());
  const insets = useSafeAreaInsets();

  const filled = options.map((text) => text.trim()).filter(Boolean);
  const canSubmit = title.trim() !== "" && filled.length >= MIN_OPTIONS && !send.isPending;

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    if (closeAt && closeAt.getTime() <= Date.now()) {
      Alert.alert(t("마감 시각을 확인해주세요"), t("마감 시각은 지금보다 뒤여야 해요."));
      return;
    }
    try {
      await send.mutateAsync({
        content: "",
        poll: {
          title: title.trim(),
          options: filled,
          multiple,
          anonymous,
          allowAddOptions,
          ...(closeAt && { closesAt: closeAt.toISOString() }),
        },
      });
      navigation.goBack();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response
        ?.data?.message;
      Alert.alert(
        t("투표를 올리지 못했어요"),
        (Array.isArray(message) ? message[0] : message) ?? t("잠시 후 다시 시도해주세요."),
      );
    }
  };

  // 마감 시각 고르기 — 안드로이드는 날짜 → 시간 순서로 기본 다이얼로그를 띄우고, iOS는 아래에서
  // 올라오는 날짜·시간 휠을 쓴다 (카카오톡 투표 마감 설정과 같은 흐름).
  const handleCloseAtPress = () => {
    Keyboard.dismiss();
    const current = closeAt ?? defaultCloseAt();
    if (Platform.OS === "android") {
      const onDate = (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== "set" || !picked) return;
        DateTimePickerAndroid.open({
          value: picked,
          mode: "time",
          is24Hour: false,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== "set" || !time) return;
            const next = new Date(picked);
            next.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setCloseAt(next);
          },
        });
      };
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        minimumDate: new Date(),
        onChange: onDate,
      });
    } else {
      setIosDraft(current);
      setIosPickerOpen(true);
    }
  };

  const switchRows = [
    { label: t("복수 선택"), description: t("여러 항목을 고를 수 있어요"), value: multiple, set: setMultiple },
    { label: t("익명 투표"), description: t("누가 투표했는지 보이지 않아요"), value: anonymous, set: setAnonymous },
    {
      label: t("항목 추가 허용"),
      description: t("참여자가 항목을 추가할 수 있어요"),
      value: allowAddOptions,
      set: setAllowAddOptions,
    },
  ];

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pb-10 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text className="text-body-main text-text-normal">{t("투표 제목")}</Text>
            <TextInput
              className="mt-2 h-11 rounded-xl bg-background-muted px-4 text-body-medium text-text-normal"
              value={title}
              onChangeText={setTitle}
              placeholder={t("예: 이번 주 모임 요일")}
              placeholderTextColor={themeColors.text.alternative}
              maxLength={100}
            />
          </View>

          <View>
            <Text className="text-body-main text-text-normal">
              {t("항목 ({{count}}/{{max}})", { count: options.length, max: MAX_OPTIONS })}
            </Text>
            {options.map((text, index) => (
              <View key={index} className="mt-2 flex-row items-center gap-2">
                <TextInput
                  className="h-11 flex-1 rounded-xl bg-background-muted px-4 text-body-medium text-text-normal"
                  value={text}
                  onChangeText={(value) =>
                    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)))
                  }
                  placeholder={t("항목 {{n}}", { n: index + 1 })}
                  placeholderTextColor={themeColors.text.alternative}
                  maxLength={50}
                />
                {options.length > MIN_OPTIONS && (
                  <Pressable
                    onPress={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                    hitSlop={8}
                  >
                    <Icon name="close-square" size={22} />
                  </Pressable>
                )}
              </View>
            ))}
            {options.length < MAX_OPTIONS && (
              <Pressable
                className="mt-3 h-11 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-text-alternative active:opacity-60"
                onPress={() => setOptions((prev) => [...prev, ""])}
              >
                <Icon name="plus" size={16} />
                <Text className="text-body-small text-text-alternative">{t("항목 추가")}</Text>
              </Pressable>
            )}
          </View>

          <View>
            {switchRows.map((row) => (
              <View
                key={row.label}
                className="flex-row items-center justify-between border-b border-background-assistive py-3"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-body-main text-text-normal">{row.label}</Text>
                  <Text className="text-body-small text-text-alternative">{row.description}</Text>
                </View>
                <Switch value={row.value} onValueChange={row.set} />
              </View>
            ))}
          </View>

          {/* 마감 — 켜면 날짜와 시간을 정한다. 끄면 직접 마감할 때까지 열려 있다. */}
          <View>
            <View className="flex-row items-center justify-between border-b border-background-assistive py-3">
              <View className="flex-1 pr-3">
                <Text className="text-body-main text-text-normal">{t("마감 시각 설정")}</Text>
                <Text className="text-body-small text-text-alternative">
                  {t("정한 시각이 되면 자동으로 마감돼요")}
                </Text>
              </View>
              <Switch
                value={closeAt !== null}
                onValueChange={(on) => setCloseAt(on ? defaultCloseAt() : null)}
              />
            </View>
            {closeAt && (
              <Pressable
                className="mt-3 h-12 flex-row items-center justify-between rounded-xl bg-background-muted px-4 active:opacity-70"
                onPress={handleCloseAtPress}
              >
                <Text className="text-body-main text-primary-normal">{formatCloseAt(closeAt)}</Text>
                <Text className="text-body-small text-text-alternative">{t("변경")}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <View className="px-5 pb-12 pt-3">
          <Button
            label={t("투표 올리기")}
            disabled={!canSubmit}
            loading={send.isPending}
            onPress={() => void handleSubmitPress()}
          />
        </View>
      </KeyboardAvoidingContainer>

      {/* iOS 날짜·시간 선택 — 아래에서 올라오는 휠 */}
      <Modal
        visible={iosPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIosPickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-background-dark/50"
          onPress={() => setIosPickerOpen(false)}
        >
          <Pressable
            className="rounded-t-3xl bg-background-normal px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <DateTimePicker
              value={iosDraft}
              mode="datetime"
              display="spinner"
              minimumDate={new Date()}
              minuteInterval={5}
              onChange={(_, picked) => picked && setIosDraft(picked)}
            />
            <Button
              label={t("확인")}
              onPress={() => {
                setCloseAt(iosDraft);
                setIosPickerOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
