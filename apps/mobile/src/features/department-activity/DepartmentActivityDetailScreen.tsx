import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {FavoriteButton} from "../../shared/components/base/FavoriteButton";
import {CommentItem} from "../../shared/components/composed/CommentItem";
import {CommentInput} from "../../shared/components/composed/CommentInput";
import {CommentEmpty} from "../../shared/components/composed/CommentEmpty";
import {PostAuthor} from "./components/PostAuthor";

// API 연동 전 임시 데이터.
const comments = [
    {
        id: "1",
        authorName: "김서연",
        timeAgo: "12분 전",
        content: "내일까지 스토리 올릴게요! 사진은 단톡방에 공유해주세요.",
    },
    {
        id: "2",
        authorName: "이정민",
        timeAgo: "30분 전",
        content: "블로그 포스팅은 제가 초안 잡아볼게요.",
    },
    {
        id: "3",
        authorName: "원준호",
        timeAgo: "1시간 전",
        content: "저녁 예배 끝나고 잠깐 모여서 일정 정리하면 좋을 것 같아요.",
    },
    {
        id: "4",
        authorName: "박지우",
        timeAgo: "2시간 전",
        content: "확인했습니다. 필요한 이미지 있으면 말씀해주세요!",
    },
]

export function DepartmentActivityDetailScreen() {
    const insets = useSafeAreaInsets();
    const [comment, setComment] = useState("");

    const handleLikePress = () => {
        console.log("좋아요 버튼")
    }

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingBottom: insets.bottom }}>
      <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
          className="flex-1 h-full"
          contentContainerClassName="justify-start py-5 px-5"
          keyboardShouldPersistTaps="handled">
          <View className="w-full h-90 bg-background-assistive"></View>
          <PostAuthor
              authorName="조인승"
              department="sns"
              categoryName="sns팀"
              date="05월 27일 · 38분 전"
          />
          {/* 내용 */}
          <View className="flex justify-start">
              <Text className="mt-2 text-heading-medium text-text-normal">인스타 스토리, 블로그 포스팅 일정</Text>
              <Text className="mt-2 text-body-medium text-text-neutral">내용</Text>
              <FavoriteButton className="mt-5" count={14} onPress={handleLikePress}/>
          </View>
          <View className="mt-5 border-t border-t-text-assistive">
              <Text className="my-4 text-body-main text-text-normal">댓글 {comments.length}</Text>
              {comments.map((comment) => (
                  <CommentItem
                      key={comment.id}
                      authorName={comment.authorName}
                      timeAgo={comment.timeAgo}
                      content={comment.content}
                  />
              ))}

              {/* 데이터가 없을 경우 */}
              {/*<CommentEmpty/>*/}
          </View>
      </ScrollView>
        <View className="border-t border-t-text-assistive px-5 py-2">
            <CommentInput
                value={comment}
                onChangeText={setComment}
                onSubmit={() => setComment("")}
            />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
