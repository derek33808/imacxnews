# 视频Poster自动填充逻辑修复

## 问题描述
用户上传视频后，系统自动将视频URL填入poster字段。这个设计存在逻辑错误。

## 原始设计意图
代码中的原始意图是作为备用方案：
```javascript
if (videoPosterInput && !videoPosterInput.value) {
  // Use video URL as poster if no custom poster is set
  videoPosterInput.value = result.data.url;
}
```

## 问题分析

### ❌ 为什么这是错误的
1. **类型不匹配**：视频文件（.mp4、.webm）不是图片，不能用作poster
2. **HTML5标准**：`<video poster="...">` 属性需要图片URL，不是视频URL
3. **显示异常**：会导致poster显示失败，影响用户体验
4. **语义错误**：poster应该是视频的预览图，不是视频本身

### 🎯 正确的设计应该是
1. **视频上传**：只设置videoUrl字段
2. **poster单独处理**：用户需要单独上传poster图片，或者留空使用占位图
3. **自动生成**：未来可以考虑实现视频首帧截图作为poster

## 修复内容

### 移除错误的自动填充逻辑
```javascript
// ❌ REMOVED: 不再自动用视频URL填充poster
// if (videoPosterInput && !videoPosterInput.value) {
//   videoPosterInput.value = result.data.url;  // 这是错误的
// }
```

### 现在的正确流程
1. **上传视频**：
   - ✅ 设置 `videoUrl` 字段
   - ✅ 设置 `videoDuration` 字段（如果有）
   - ❌ 不再错误地设置 `videoPoster` 字段

2. **上传Poster**：
   - ✅ 用户使用"Upload Poster..."按钮单独上传
   - ✅ 或者手动输入图片URL
   - ✅ 或者保持为空，使用占位图

3. **显示逻辑**：
   - ✅ 有poster时显示poster
   - ✅ 无poster时显示占位图
   - ✅ 不会出现显示异常

## 用户操作指南

### 创建视频文章的正确步骤：
1. 选择"Video Article"类型
2. 上传或输入视频URL → 只填充视频相关字段
3. **单独上传poster图片**：
   - 点击"Upload Poster..."按钮
   - 或在poster字段输入图片URL
   - 或留空使用默认占位图
4. 填写其他信息并保存

### ✅ 优势
- **逻辑正确**：每个字段都有正确的数据类型
- **显示正常**：poster不会出现异常
- **用户明确**：用户明确知道需要单独设置poster
- **扩展性好**：未来可以添加自动截图功能

## 技术影响
- **向后兼容**：不影响现有的poster显示逻辑
- **数据完整**：不会产生错误的数据
- **用户体验**：避免了显示异常问题

---
**修复时间**: 2025-09-11  
**影响**: 视频上传后不再错误地填充poster字段  
**用户操作**: 需要单独上传poster图片或使用占位图
