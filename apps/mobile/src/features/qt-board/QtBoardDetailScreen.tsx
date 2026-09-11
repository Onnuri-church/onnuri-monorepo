import {RouteProp, useNavigation, useRoute} from "@react-navigation/native";
import type {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {useLayoutEffect, useRef} from "react";
import {ScrollView, View, Text, Image} from "react-native";
import {AppDialog, type AppDialogRef} from "../../shared/components/base/AppDialog";
import {FavoriteButton} from "../../shared/components/base/FavoriteButton";
import {Header} from "../../shared/components/base/Header";
import {Skeleton} from "../../shared/components/base/Skeleton";
import type {RootStackParamList} from "../../shared/types/navigation";
import {useQuery} from "@tanstack/react-query";
import {toTimeAgo} from "../../shared/utils/date";
import {fetchQtDetails} from "./api";
import {useToggleQtLike} from "./useToggleQtLike";
import {Icon} from "../../shared/components/base/Icon";

export function QtBoardDetailScreen() {
    const route = useRoute<RouteProp<RootStackParamList, "QtBoardDetail">>();
    const {id} = route.params
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const dialogRef = useRef<AppDialogRef>(null);
    // 서버 연동 전 목업 — API가 붙으면 글 작성자 id와 내 id 비교로 교체한다.
    const isMine = true;

    const { data, isPending, isError } = useQuery({
        queryKey: ["qt-share", id],
        queryFn: () => fetchQtDetails(id)
    })

    const toggleLike = useToggleQtLike();

    // ⋮는 내 글일 때만 보이고 항목이 화면 데이터(작성자)에 의존하므로,
    // 등록부(RootNavigator)가 아니라 화면이 헤더를 단독 등록한다.
    useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <Header
                    variant="sub"
                    title="큐티나눔"
                    rightAction={isMine ? "more" : "none"}
                    menuItems={[
                        {
                            icon: "edit",
                            label: "수정하기",
                            onPress: () => navigation.navigate("QtBoardWrite"),
                        },
                        {
                            icon: "trash-can",
                            label: "삭제하기",
                            onPress: () => dialogRef.current?.open(),
                        },
                    ]}
                />
            ),
        });
    }, [navigation, isMine]);

    const confirmDelete = () => {
        // 서버 연동 전 — 삭제 API가 붙으면 여기서 호출하고 목록 캐시를 갱신한다.
        dialogRef.current?.close();
        navigation.goBack();
    };

    // 훅을 다 부른 뒤에 분기한다. 여기서 걸러내야 아래에서 data가 undefined가 아니게 된다.
    if (isPending) {
        return (
            <View className="flex-1 bg-background-normal">
                <View className="gap-4 px-5 py-4">
                    <Skeleton className="h-100 rounded-3xl"/>
                    <Skeleton className="h-40 rounded-3xl"/>
                </View>
            </View>
        );
    }

    if (isError) {
        return (
            <View className="flex-1 items-center justify-center bg-background-normal">
                <Text className="text-body-medium text-text-alternative">
                    큐티나눔을 불러오지 못했어요
                </Text>
            </View>
        );
    }

    // data가 확정된 뒤에 만든다 — 위에 두면 로딩 중의 undefined까지 다뤄야 한다.
    const handleFavoritePress = () => {
        toggleLike({postId: id, likedByMe: data.likedByMe});
    };

    return (
        <View className="flex-1 bg-background-normal">
            <ScrollView>
                {/* 이 영역에는 padding을 주지 않는다 — Yoga는 absolute 자식을 부모의 content box
                    기준으로 놓아서, 부모에 padding이 있으면 배경사진이 그만큼 안쪽으로 밀려
                    가장자리가 잘린 것처럼 보인다 (CSS와 다른 점). 여백은 아래 래퍼가 맡는다. */}
                <View className="h-100 bg-background-assistive">
                    {/* 배경사진은 안 올린 글도 있어서(coverImageUrl이 null) 있을 때만 그린다. */}
                    {data.coverImageUrl && (
                        <Image
                            source={{uri: data.coverImageUrl}}
                            resizeMode="cover"
                            // 크기를 안 주면 RN이 0x0으로 그린다.
                            className="absolute inset-0 w-full h-full"
                        />
                    )}

                    <View className="flex-1 items-start justify-end pb-8 px-5">
                        <View className="flex flex-row items-center justify-between w-full">
                            <View className="flex flex-row items-center justify-start gap-2">
                                <View className="w-10 h-10 bg-background-assistive rounded-full"></View>
                                <View>
                                    <Text className="text-heading-small text-text-disable">{data.authorName}</Text>
                                    <Text className="text-body-small text-text-disable">
                                        {`${data.dateLabel} · ${toTimeAgo(data.createdAt)}`}
                                    </Text>
                                </View>
                            </View>

                            <FavoriteButton favorited={data.likedByMe} size="md" onPress={handleFavoritePress}/>
                        </View>
                    </View>
                </View>
                <View className="py-10 px-5">
                    <View className="flex items-center justify-center">
                        <Text className="text-heading-small text-text-normal text-center">{data.title}</Text>
                        {/* 말씀 구절은 비워둘 수 있다(QtShare.passage가 nullable) —
                            없을 때 아이콘만 덩그러니 남지 않게 줄째로 뺀다. */}
                        {data.passage && (
                            <View className="flex flex-row items-center justify-center gap-1 mt-1">
                                <Icon name="book-open-alt-light" size={16}/>
                                <Text className="text-body-main text-text-alternative text-center">{data.passage}</Text>
                            </View>
                        )}
                    </View>
                    <Text className="mt-12 text-body-regular text-text-neutral">{data.content}</Text>
                </View>

            </ScrollView>

            <AppDialog
                ref={dialogRef}
                title="정말 삭제하시겠습니까?"
                description="삭제된 데이터는 복구할 수 없습니다."
                confirmLabel="확인"
                cancelLabel="취소"
                onConfirm={confirmDelete}
            />
        </View>
    )
}
