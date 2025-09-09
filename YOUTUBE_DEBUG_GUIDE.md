# YouTube视频调试指南

## 问题诊断

YouTube视频无法播放可能有多种原因，我已经创建了一个调试工具来帮助您找出问题所在。

### 🔧 调试工具使用方法

1. **打开调试页面**
   ```
   http://localhost:4321/debug-youtube.html
   ```

2. **测试步骤**
   - 第一个测试会自动加载一个示例YouTube视频
   - 第二个测试让您输入自己的YouTube URL
   - 打开浏览器开发者工具（F12）查看详细日志

### 🎯 我已经做的修复

1. **简化YouTube embed URL**
   - 移除了可能导致问题的额外参数
   - 使用最基本的embed格式：`https://www.youtube.com/embed/VIDEO_ID`

2. **简化iframe属性**
   - 移除了复杂的`allow`属性
   - 保留最基本的必要属性

3. **增强CSP策略**
   - 添加了`frame-src`和`child-src`指令
   - 支持`youtube.com`和`youtube-nocookie.com`

4. **添加详细调试信息**
   - 控制台会显示URL处理过程
   - iframe加载状态监控
   - 详细的错误信息

### 🔍 问题排查清单

请按以下步骤检查：

#### 1. 检查YouTube URL格式
支持的格式：
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

#### 2. 检查浏览器控制台
1. 按F12打开开发者工具
2. 切换到Console标签
3. 粘贴YouTube URL时查看日志输出
4. 查找以下信息：
   ```
   🎯 iframe created: {...}
   ✅ iframe loaded successfully
   ✅ Video URL processed: {...}
   ```

#### 3. 检查网络连接
- 确保可以访问YouTube网站
- 检查防火墙或代理设置
- 尝试在新标签页直接打开embed URL

#### 4. 检查浏览器设置
- 确保启用了JavaScript
- 检查是否有广告拦截器阻止了iframe
- 尝试在隐私/无痕模式下测试

### 🐛 常见问题及解决方案

#### 问题1: iframe显示空白
**可能原因**: CSP策略阻止
**解决方案**: 检查控制台是否有CSP错误

#### 问题2: 显示"Video unavailable"
**可能原因**: 视频不允许嵌入或地区限制
**解决方案**: 尝试其他YouTube视频

#### 问题3: iframe不加载
**可能原因**: 网络问题或YouTube服务问题
**解决方案**: 检查网络连接，稍后重试

### 📋 如果问题仍然存在

请提供以下调试信息：

1. **测试YouTube URL**: （您尝试的具体URL）
2. **浏览器信息**: （Chrome/Firefox/Safari版本）
3. **控制台错误**: （F12中的错误信息）
4. **调试页面结果**: （debug-youtube.html的测试结果）

### 🔄 测试视频推荐

以下是一些测试用的YouTube视频URL：
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (经典测试视频)
- `https://youtu.be/dQw4w9WgXcQ` (短链接格式)
- `https://www.youtube.com/watch?v=jNQXAC9IVRw` (另一个测试视频)

---

**调试完成后请删除 `debug-youtube.html` 文件**
