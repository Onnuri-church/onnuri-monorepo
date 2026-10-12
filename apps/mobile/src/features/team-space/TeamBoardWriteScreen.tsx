import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { uploadAttachment, uploadImage } from "../../shared/api/upload";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { useTeam } from "../team-story/api";
import { useCreateBoardPost, useTeamBoardPost, useUpdateBoardPost } from "./api";

const MAX_IMAGES = 5;
const MAX_LINKS = 5;
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
}

// 팀 게시판 글쓰기·수정 — 밴드처럼 위에는 "공지로 등록", 가운데는 큰 입력칸, 키보드 위에는
// 사진·파일·링크 도구줄이 있고 헤더 오른쪽 "완료"로 올린다. postId가 있으면 수정 모드다.
export function TeamBoardWriteScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamBoardWrite">>();
  const navigation = useNavigation();
  const { teamId, postId } = params;
  const team = useTeam(teamId);
  const me = useMe();
  const createPost = useCreateBoardPost(teamId);
  const updatePost = useUpdateBoardPost(teamId, postId ?? "");
  const { data: editing } = useTeamBoardPost(teamId, postId);

  const [content, setContent] = useState("");
  // 사진은 이미 올라간 주소(http)와 새로 고른 로컬 파일이 섞여 있다 — 올릴 때 로컬 것만 업로드한다.
  const [photos, setPhotos] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [existingFiles, setExistingFiles] = useState<{ url: string; name: string; size: number }[]>([]);
  const [newFiles, setNewFiles] = useState<PickedFile[]>([]);
  const [isNotice, setIsNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // 공지로 등록은 팀장과 관리자만 보인다 (서버도 같은 규칙).
  const canNotice =
    me?.isAdmin === true ||
    (me?.teams ?? []).some((item) => item.id === teamId && item.role === "LEADER");

  useEffect(() => {
    if (prefilled || !editing) return;
    setContent(editing.content);
    setPhotos(editing.imageUrls);
    setLinks(editing.links);
    setExistingFiles(editing.files);
    setIsNotice(editing.isNotice);
    setPrefilled(true);
  }, [editing, prefilled]);

  const attachmentCount = photos.length + links.length + existingFiles.length + newFiles.length;
  const canSubmit = !saving && (content.trim() !== "" || attachmentCount > 0);

  const handlePickPhotos = async () => {
    const remaining = MAX_IMAGES - photos.length;
    if (remaining <= 0) {
      Alert.alert(t("사진은 최대 5장까지 올릴 수 있어요."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setPhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_IMAGES));
  };

  const handlePickFile = async () => {
    if (existingFiles.length + newFiles.length >= MAX_FILES) {
      Alert.alert(t("파일은 최대 3개까지 올릴 수 있어요."));
      return;
    }
    let DocumentPicker: typeof import("expo-document-picker");
    try {
      DocumentPicker = require("expo-document-picker");
    } catch {
      Alert.alert(t("앱 업데이트가 필요해요"), t("파일 보내기는 앱을 새로 설치한 뒤에 쓸 수 있어요."));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const picked: PickedFile[] = [];
    let skipped = 0;
    for (const asset of result.assets) {
      if ((asset.size ?? 0) > MAX_FILE_BYTES) {
        skipped += 1;
        continue;
      }
      picked.push({ uri: asset.uri, name: asset.name, size: asset.size ?? 0, mimeType: asset.mimeType ?? null });
    }
    setNewFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES - existingFiles.length));
    if (skipped > 0) {
      Alert.alert(t("파일은 10MB까지 보낼 수 있어요"), t("용량이 큰 파일 {{count}}개는 제외했어요.", { count: skipped }));
    }
  };

  const handleAddLink = () => {
    const link = linkDraft.trim();
    if (!link || links.length >= MAX_LINKS) return;
    // 주소 앞에 http(s)가 없으면 붙여 준다 — 서버는 http/https만 받는다.
    const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    setLinks((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setLinkDraft("");
  };

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const [imageUrls, uploadedFiles] = await Promise.all([
        Promise.all(photos.map((uri) => uploadImage(uri))),
        Promise.all(
          newFiles.map(async (file) => ({
            url: await uploadAttachment(file.uri, { name: file.name, mimeType: file.mimeType }),
            name: file.name,
            size: file.size,
          })),
        ),
      ]);
      const body = {
        content: content.trim(),
        imageUrls,
        links,
        files: [...existingFiles, ...uploadedFiles],
        ...(canNotice && { isNotice }),
      };
      if (postId) await updatePost.mutateAsync(body);
      else await createPost.mutateAsync(body);
      navigation.goBack();
    } catch {
      Alert.alert(postId ? t("수정 실패") : t("등록 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  // "완료"가 화면 상태(입력 내용·첨부)에 의존해서 화면이 헤더를 단독 등록한다.
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={postId ? t("글 수정") : t("글쓰기")}
          rightAction="text"
          rightLabel={saving ? t("올리는 중...") : t("완료")}
          onPressRightLabel={() => void handleSubmitPress()}
        />
      ),
    });
  });

  const fileCount = existingFiles.length + newFiles.length;

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        {/* 팀 이름 + 공지로 등록 */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <Text className="text-body-small text-text-alternative" numberOfLines={1}>
            {team?.name ?? ""}
          </Text>
          {canNotice && (
            <Pressable
              className="flex-row items-center gap-2 active:opacity-60"
              onPress={() => setIsNotice((prev) => !prev)}
              hitSlop={8}
            >
              <View
                className={
                  isNotice
                    ? "h-5 w-5 items-center justify-center rounded border border-primary-normal bg-primary-normal"
                    : "h-5 w-5 rounded border border-text-assistive"
                }
              >
                {isNotice && <Icon name="check" size={12} color={colors.icon.disable} />}
              </View>
              <Text className="text-body-small text-text-normal">{t("공지로 등록")}</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            className="min-h-48 text-body-regular text-text-normal"
            value={content}
            onChangeText={setContent}
            placeholder={t("여기를 눌러 새로운 소식을 남겨보세요.")}
            placeholderTextColor={themeColors.text.alternative}
            multiline
            textAlignVertical="top"
            autoFocus={!postId}
          />

          {/* 첨부 미리보기 */}
          {photos.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {photos.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 12 }} />
                  <Pressable
                    className="absolute right-1 top-1"
                    onPress={() => setPhotos((prev) => prev.filter((item) => item !== uri))}
                    hitSlop={8}
                  >
                    <Icon name="close-square" size={20} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {links.map((link) => (
            <View key={link} className="flex-row items-center rounded-xl bg-background-muted px-3 py-2">
              <Text className="flex-1 text-body-small text-primary-normal" numberOfLines={1}>
                {link}
              </Text>
              <Pressable onPress={() => setLinks((prev) => prev.filter((item) => item !== link))} hitSlop={8}>
                <Icon name="close-square" size={18} />
              </Pressable>
            </View>
          ))}
          {existingFiles.map((file) => (
            <View key={file.url} className="flex-row items-center rounded-xl bg-background-muted px-3 py-2">
              <Icon name="note" size={18} />
              <Text className="ml-2 flex-1 text-body-small text-text-normal" numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                onPress={() => setExistingFiles((prev) => prev.filter((item) => item.url !== file.url))}
                hitSlop={8}
              >
                <Icon name="close-square" size={18} />
              </Pressable>
            </View>
          ))}
          {newFiles.map((file) => (
            <View key={file.uri} className="flex-row items-center rounded-xl bg-background-muted px-3 py-2">
              <Icon name="note" size={18} />
              <Text className="ml-2 flex-1 text-body-small text-text-normal" numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                onPress={() => setNewFiles((prev) => prev.filter((item) => item.uri !== file.uri))}
                hitSlop={8}
              >
                <Icon name="close-square" size={18} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* 링크 입력줄 — 도구줄의 링크 버튼을 누르면 열린다 */}
        {linkInputOpen && (
          <View className="flex-row items-center gap-2 border-t border-background-assistive px-5 py-2">
            <TextInput
              className="h-10 flex-1 rounded-xl bg-background-muted px-3 text-body-small text-text-normal"
              value={linkDraft}
              onChangeText={setLinkDraft}
              placeholder="https://"
              placeholderTextColor={themeColors.text.alternative}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={handleAddLink}
            />
            <Pressable
              className="h-10 items-center justify-center rounded-xl bg-background-alternative px-4 active:opacity-60"
              onPress={handleAddLink}
            >
              <Text className="text-body-small text-primary-normal">{t("추가")}</Text>
            </Pressable>
          </View>
        )}

        {/* 도구줄 — 사진, 파일, 링크 */}
        <View className="flex-row items-center gap-6 border-t border-background-assistive px-5 py-3">
          <Pressable onPress={() => void handlePickPhotos()} hitSlop={8} className="active:opacity-60">
            <Icon name="image" size={26} />
          </Pressable>
          <Pressable onPress={() => void handlePickFile()} hitSlop={8} className="active:opacity-60">
            <Icon name="paperclip" size={26} />
          </Pressable>
          <Pressable
            onPress={() => setLinkInputOpen((prev) => !prev)}
            hitSlop={8}
            className="active:opacity-60"
          >
            <Icon name="link" size={26} />
          </Pressable>
          <View className="flex-1" />
          <Text className="text-caption-main text-text-alternative">
            {t("사진 {{photos}}/{{maxPhotos}} · 파일 {{files}}/{{maxFiles}} · 링크 {{links}}/{{maxLinks}}", {
              photos: photos.length,
              maxPhotos: MAX_IMAGES,
              files: fileCount,
              maxFiles: MAX_FILES,
              links: links.length,
              maxLinks: MAX_LINKS,
            })}
          </Text>
        </View>
      </KeyboardAvoidingContainer>
    </View>
  );
}
