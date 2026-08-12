import type { ReactNode } from "react";
import { Pressable } from "react-native";

interface FloatingButtonProps {
  onPress: () => void;
  children: ReactNode;
}

export function FloatingButton({ onPress, children }: FloatingButtonProps) {
  return (
    <Pressable className="absolute bottom-5 right-5 flex items-center justify-center w-18 h-18 rounded-full bg-primary-normal" onPress={onPress}>
      {children}
    </Pressable>
  );
}
