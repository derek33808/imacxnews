# 图片预览DOM元素ID修复

## 问题描述
在添加图片文章时，图片没有直接生成预览，而是显示了占位图片。

## 根本原因
`updateImagePreview` 函数使用了错误的DOM元素ID：
- 旧：尝试使用 `#mediaPreview` 和 `#mediaPreviewWrap` 
- 问题：这些元素被设置为 `display:none !important`（标记为LEGACY）

## 解决方案
修复了以下函数中的元素ID引用：

1. **updateImagePreview函数** (行614-620)
   - `#mediaPreview` → `#imagePreview`
   - `#mediaPreviewWrap` → `#imagePreviewWrap`

2. **初始化函数** (行605-607)
   - `#mediaPreview` → `#imagePreview`
   - `#mediaPreviewWrap` → `#imagePreviewWrap`
   - `#mediaPreviewTitle` → `#imagePreviewTitle`

3. **Legacy上传函数**
   - `showLegacyImageUploadProgress`
   - `showLegacyImageUploadSuccess`  
   - `showLegacyImageUploadError`
   - 所有 `#mediaPreviewTitle` → `#imagePreviewTitle`

4. **媒体初始化函数** (行3491-3496)
   - 所有媒体预览元素ID更新为对应的图片预览元素ID

## 结果
- ✅ 图片URL输入时能正确显示预览
- ✅ 图片加载成功/失败都有正确的视觉反馈
- ✅ 所有图片预览功能恢复正常

## 测试状态
修复已完成，无语法错误，可以正常使用。
