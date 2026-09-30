import {Alert, KeyboardAvoidingView, ScrollView, View} from "react-native";
import {useEffect, useState} from "react";
import {useNavigation, useRoute, type RouteProp} from "@react-navigation/native";
import type {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {DateField, toDateString} from "../../shared/components/composed/DateField";
import {Field} from "../../shared/components/base/Field";
import {TextAreaField} from "../../shared/components/base/TextAreaField";
import {TextField} from "../../shared/components/base/TextField";
import {Button} from "../../shared/components/base/Button";
import {ImageUploadBoxSingle} from "../../shared/components/base/ImageUploadBoxSingle";
import {ImageUploadBoxMultiple} from "../../shared/components/base/ImageUploadBoxMultiple";
import {uploadImage} from "../../shared/api/upload";
import type {RootStackParamList} from "../../shared/types/navigation";
import {createQtShare, fetchQtDetails, updateQtShare} from "./api";

export function QtBoardWriteScreen () {
    const route = useRoute<RouteProp<RootStackParamList, "QtBoardWrite">>()
    // id가 있으면 수정 모드 — 기존 글을 불러와 필드를 채운 채 시작한다.
    const editingId = route.params?.id
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const queryClient = useQueryClient()

    const [selectDate, setSelectDate] = useState<string | null>(toDateString(new Date()))
    const [verse, setVerse] = useState("")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [backgroundPhotoUri, setBackgroundPhotoUri] = useState<string | null>(null)
    const [bodyPhotoUris, setBodyPhotoUris] = useState<string[]>([])

    // 상세 화면과 같은 캐시 키라, 상세에서 들어오면 이미 받아둔 글로 바로 채워진다.
    const {data: editingPost} = useQuery({
        queryKey: ["qt-share", editingId],
        queryFn: () => fetchQtDetails(editingId as string),
        enabled: editingId !== undefined,
    })

    useEffect(() => {
        if (!editingPost) return
        setSelectDate(editingPost.eventDate)
        setVerse(editingPost.passage ?? "")
        setTitle(editingPost.title)
        setContent(editingPost.content)
        setBackgroundPhotoUri(editingPost.coverImageUrl)
        setBodyPhotoUris(editingPost.imageUrls)
    }, [editingPost])

    const {mutate: submit, isPending} = useMutation({
        mutationFn: async (eventDate: string) => {
            // 사진은 기기 경로(file://)라 글에 담기 전에 URL로 바꾼다. 한 장이라도 실패하면
            // 글을 저장하지 않는다 — 사진이 빠진 채 올라가면 올린 줄 알고 그냥 넘어간다.
            const [coverImageUrl, imageUrls] = await Promise.all([
                backgroundPhotoUri ? uploadImage(backgroundPhotoUri) : null,
                Promise.all(bodyPhotoUris.map(uploadImage)),
            ])

            const body = {
                eventDate,
                title: title.trim(),
                content: content.trim(),
                passage: verse.trim() || null,
                coverImageUrl,
                imageUrls,
            }
            return editingId ? updateQtShare(editingId, body) : createQtShare(body)
        },

        onSuccess: (post) => {
            // 목록 카드의 날짜 문구·좋아요는 서버가 만드는 값이라 다시 받는다.
            // 상세는 방금 받은 글이 곧 최신이라 요청 없이 캐시에 바로 넣는다.
            void queryClient.invalidateQueries({queryKey: ["qt-shares"]})
            queryClient.setQueryData(["qt-share", post.id], post)
            navigation.goBack()
        },

        onError: () => {
            Alert.alert(
                editingId ? "수정하지 못했어요" : "등록하지 못했어요",
                "잠시 후 다시 시도해주세요.",
            )
        },
    })

    const canSubmit = selectDate !== null && title.trim().length > 0 && content.trim().length > 0

    const handleSubmitPress = () => {
        if (selectDate === null) return
        submit(selectDate)
    }

    return (
        <View className="flex-1 bg-background-normal">
            {/* 키보드 높이만큼 아래 패딩을 넣어 입력이 가려지지 않게 한다. Android도 필요하다 —
                SDK 57은 edge-to-edge가 항상 켜져 있어 OS가 화면을 줄여주지 않는다(adjustResize 무력화).
                (ProfileSetupScreen은 iOS만 처리하고 있어 같은 문제가 있을 것.) */}
            <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
                <ScrollView
                    className="flex-1 h-full"
                    contentContainerClassName="justify-start pt-8 pb-20 px-5 gap-8"
                    keyboardShouldPersistTaps="handled"
                >
                    <DateField label="날짜" placeholder="날짜를 입력해주세요" value={selectDate} onChange={setSelectDate}/>

                    <Field label="배경사진">
                        <ImageUploadBoxSingle imageUri={backgroundPhotoUri} onChange={setBackgroundPhotoUri}/>
                    </Field>

                    <Field label="본문사진(최대 5장)">
                        <ImageUploadBoxMultiple imageUris={bodyPhotoUris} onChange={setBodyPhotoUris}/>
                    </Field>

                    <TextField label="말씀" placeholder="예) 룻기 1:8-10" value={verse} onChangeText={setVerse}/>

                    <TextField label="제목" placeholder="제목을 입력해주세요." value={title} onChangeText={setTitle}/>

                    <TextAreaField
                        label="내용"
                        placeholder={"오늘 은혜받은 말씀을 기록해보세요!\n욕설 및 비방은 예고 없이 삭제될 수 있어요."}
                        value={content}
                        onChangeText={setContent}
                    />

                    <View className="mt-16">
                        {/* 등록 중에도 막는다 — 사진 업로드까지 끝나야 응답이 와서 두 번 눌리기 쉽다. */}
                        <Button label="등록하기" onPress={handleSubmitPress} disabled={!canSubmit || isPending}/>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
