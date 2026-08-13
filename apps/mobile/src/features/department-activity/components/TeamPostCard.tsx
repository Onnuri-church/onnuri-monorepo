import {ComponentProps} from "react";
import {Pressable, Text, View} from "react-native";
import {Chip} from "../../../shared/components/base/Chip";
import {Icon} from "../../../shared/components/base/Icon";

type ChipColor = ComponentProps<typeof Chip>["color"];

const DEPARTMENT_COLOR: Record<string, ChipColor> = {
    sns: "purple",
    praise: "blue",
    broadcast: "red",
    futsal: "yellow",
    design: "green",
    intercession: "orange",
    video: "indigo",
};

// 서버에 새 부서가 생겨도 칩이 안 죽게 하는 폴백.
const FALLBACK_COLOR: ChipColor = "purple";

export interface TeamPost {
    id: string;
    // 부서 키. 서버가 주는 값이라 좁은 유니온으로 박지 않는다 — 모르는 값은 위 폴백으로 떨어진다.
    department: string;
    categoryName: string;
    date: string;
    title: string;
    description: string;
    time: string;
    view: number;
    comments: number;
    favorite: number;
}

interface TeamPostCardProps {
    post: TeamPost;
    onPress?: () => void;
}

export function TeamPostCard({post, onPress}: TeamPostCardProps) {
    return (
        <Pressable className="bg-background-normal p-6 shadow-card" onPress={onPress}>
            <View className="items-center justify-start row-auto flex-row gap-1">
                <Chip color={DEPARTMENT_COLOR[post.department] ?? FALLBACK_COLOR} text={post.categoryName}/>
                <Text className="text-caption-main text-text-alternative">{post.date}</Text>
            </View>
            <Text className="mt-1 text-heading-main">{post.title}</Text>
            <Text className="mt-1 text-body-main text-text-alternative">{post.description}</Text>
            <View className="mt-4 items-center justify-between flex-row pt-2 border-t border-t-text-assistive">
                <Text className="text-caption-main text-text-alternative">{post.time}</Text>
                <View className="items-center justify-end flex-row gap-3">
                    <View className="flex justify-end items-center flex-row gap-0.5">
                        <Icon name="view-light"/>
                        <Text className="text-caption-main text-text-alternative">{post.view}</Text>
                    </View>
                    <View className="flex justify-end items-center flex-row gap-0.5">
                        <Icon name="comment-light"/>
                        <Text className="text-caption-main text-text-alternative">{post.comments}</Text>
                    </View>
                    <View className="flex justify-end items-center flex-row gap-0.5">
                        <Icon name="favorite-light"/>
                        <Text className="text-caption-main text-text-alternative">{post.favorite}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
        )
}