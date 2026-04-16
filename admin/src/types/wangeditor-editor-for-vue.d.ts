declare module '@wangeditor/editor-for-vue' {
  // wangeditor 的 editor-for-vue 在某些构建/TS 解析场景下会出现声明文件不可解析问题。
  // 这里先做兜底声明，保证类型检查可通过；运行时依赖实际包导出的 Editor 组件。
  export const Editor: any;
}
