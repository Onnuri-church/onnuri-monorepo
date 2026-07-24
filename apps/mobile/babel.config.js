module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // react-native-worklets/plugin은 react-native-reanimated(@gorhom/bottom-sheet가 사용)가
    // 필요로 하는 babel 플러그인이며, 항상 마지막에 위치해야 한다.
    plugins: ["react-native-worklets/plugin"],
  };
};
