import {RouteProp, useNavigation, useRoute} from "@react-navigation/native";
import type {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {useLayoutEffect, useRef} from "react";
import {useTranslation} from "react-i18next";
import {Alert, ScrollView, View, Text, Image, useWindowDimensions} from "react-native";
import {AppDialog, type AppDialogRef} from "../../shared/components/base/AppDialog";
import {FavoriteButton} from "../../shared/components/base/FavoriteButton";
import {Header} from "../../shared/components/base/Header";
import {Skeleton} from "../../shared/components/base/Skeleton";
import type {RootStackParamList} from "../../shared/types/navigation";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toTimeAgo} from "../../shared/utils/date";
import {deleteQtShare, fetchQtDetails} from "./api";
import {useToggleQtLike} from "./useToggleQtLike";
import {Icon} from "../../shared/components/base/Icon";
import { Avatar } from "../../shared/components/base/Avatar";

// 본문사진 캐러셀의 좌우 여백. 아래 ScrollView의 mx-5(한 칸 4px × 5)와 같은 값이어야 한다 —
// 사진 폭을 여기서 빼서 계산하므로 한쪽만 바꾸면 페이징이 어긋난다.
const CAROUSEL_MARGIN_X = 20;
const COVER_HEIGHT_RATIO = 0.35;

export function QtBoardDetailScreen() {
    const {t} = useTranslation();
    const route = useRoute<RouteProp<RootStackParamList, "QtBoardDetail">>();
    const {id} = route.params
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const dialogRef = useRef<AppDialogRef>(null);
    // 본문사진은 정사각형(시안)이고, 폭은 캐러셀 여백을 뺀 만큼이다. 훅을 쓰면
    // 회전·폴더블로 화면 폭이 바뀌어도 따라온다.
    const {width, height: windowHeight} = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // 배경사진 영역은 화면 높이의 약 35% — 예전엔 400px 고정이라 작은 화면에서 절반을 넘게 차지했다.
    const coverHeight = Math.max(260, Math.round(windowHeight * COVER_HEIGHT_RATIO));
    const imageSize = width - CAROUSEL_MARGIN_X * 2;

    const { data, isPending, isError } = useQuery({
        queryKey: ["qt-share", id],
        queryFn: () => fetchQtDetails(id)
    })

    // 수정·삭제 가능 여부(내 글 또는 관리자)는 서버가 판단해 내려준다(권한 판단을 앱에 두지 않는다).
    // 아직 못 받았으면 없는 것으로 본다 — 남의 글에 ⋮가 잠깐 보였다 사라지는 편보다 낫다.
    const canManage = data?.canManage ?? false;

    const toggleLike = useToggleQtLike();
    const queryClient = useQueryClient();

    const { mutate: remove } = useMutation({
        mutationFn: () => deleteQtShare(id),
        onSuccess: () => {
            // 지운 글의 상세 캐시는 버린다 — 남겨두면 뒤로 간 화면에서 잠깐 다시 보인다.
            void queryClient.invalidateQueries({ queryKey: ["qt-shares"] });
            queryClient.removeQueries({ queryKey: ["qt-share", id] });
            navigation.goBack();
        },
        onError: () => {
            Alert.alert(t("삭제하지 못했어요"), t("잠시 후 다시 시도해주세요."));
        },
    });

    // ⋮는 수정·삭제할 수 있을 때만 보이고 항목이 화면 데이터(작성자)에 의존하므로,
    // 등록부(RootNavigator)가 아니라 화면이 헤더를 단독 등록한다.
    useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <Header
                    variant="sub"
                    title={t("큐티나눔")}
                    rightAction={canManage ? "more" : "none"}
                    menuItems={[
                        {
                            icon: "edit",
                            label: t("수정하기"),
                            onPress: () => navigation.navigate("QtBoardWrite", {id}),
                        },
                        {
                            icon: "trash-can",
                            label: t("삭제하기"),
                            onPress: () => dialogRef.current?.open(),
                        },
                    ]}
                />
            ),
        });
    }, [navigation, canManage, id, t]);

    const confirmDelete = () => {
        dialogRef.current?.close();
        remove();
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
                    {t("큐티나눔을 불러오지 못했어요")}
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
            {/* 본문이 아무리 길어도 끝까지 스크롤되고, 안드로이드 내비 바에 마지막 줄이 가리지 않게
                바닥 여백에 안전영역을 더한다. */}
            <ScrollView contentContainerStyle={{paddingBottom: insets.bottom}}>
                {/* 이 영역에는 padding을 주지 않는다 — Yoga는 absolute 자식을 부모의 content box
                    기준으로 놓아서, 부모에 padding이 있으면 배경사진이 그만큼 안쪽으로 밀려
                    가장자리가 잘린 것처럼 보인다 (CSS와 다른 점). 여백은 아래 래퍼가 맡는다. */}
                <View className="bg-background-assistive" style={{height: coverHeight}}>
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
                                <Avatar imageUrl={data.authorAvatarUrl} size={40} />
                                <View>
                                    <Text className="text-heading-small text-text-onImage">{data.authorName}</Text>
                                    <Text className="text-body-small text-text-onImage">
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

                {/* 본문사진(작성 화면에서 최대 5장)을 한 장씩 넘겨 본다.
                    pagingEnabled는 스크롤뷰 폭 단위로 멈추므로 사진 한 장의 폭도 같아야
                    딱 떨어진다 — 안 맞으면 넘길 때마다 어긋난 만큼 밀린다. */}
                {data.imageUrls.length > 0 && (
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        className="mx-5 mb-20"
                        // 사진과 같은 높이를 직접 준다. 가로 스크롤뷰는 높이를 안 주면
                        // 내용에 맞춰지길 기대하게 되는데, 세로 스크롤뷰 안에서는 그 계산이
                        // 어긋나기 쉬워 정사각형이 깨진다.
                        style={{height: imageSize}}
                    >
                        {data.imageUrls.map((url) => (
                            <Image
                                key={url}
                                source={{uri: url}}
                                resizeMode="cover"
                                style={{width: imageSize, height: imageSize}}
                            />
                        ))}
                    </ScrollView>
                )}
            </ScrollView>

            <AppDialog
                ref={dialogRef}
                title={t("정말 삭제하시겠습니까?")}
                description={t("삭제된 데이터는 복구할 수 없습니다.")}
                confirmLabel={t("확인")}
                cancelLabel={t("취소")}
                onConfirm={confirmDelete}
            />
        </View>
    )
}
