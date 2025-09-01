// 整理现有图片文件到标准化目录结构
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';

async function organizeImages() {
  try {
    console.log('📂 开始整理图片文件...');
    
    // 检查public目录中的图片文件
    const publicDir = './public';
    const files = await fs.readdir(publicDir);
    
    console.log(`📊 发现 ${files.length} 个文件:`);
    files.forEach(file => console.log(`   ${file}`));
    
    // 筛选图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const imageFiles = files.filter(file => 
      imageExtensions.includes(extname(file).toLowerCase()) && !file.startsWith('.')
    );
    
    console.log(`\n📷 找到 ${imageFiles.length} 个图片文件:`);
    imageFiles.forEach(file => console.log(`   ${file}`));
    
    if (imageFiles.length === 0) {
      console.log('✅ 没有需要整理的图片文件');
      return;
    }
    
    // 移动图片到对应目录
    let movedCount = 0;
    
    for (const imageFile of imageFiles) {
      try {
        const sourcePath = join(publicDir, imageFile);
        const fileName = basename(imageFile);
        
        // 根据文件名判断目标目录
        let targetDir;
        if (fileName.toLowerCase().includes('img_')) {
          // IMG_开头的文件移动到today-news（这些通常是用户上传的图片）
          targetDir = 'images/articles/today-news';
        } else if (fileName.toLowerCase().includes('copy')) {
          // 包含copy的文件移动到uploads
          targetDir = 'images/uploads';
        } else {
          // 其他文件移动到featured
          targetDir = 'images/articles/featured';
        }
        
        const targetPath = join(publicDir, targetDir, fileName);
        
        // 确保目标目录存在
        await fs.mkdir(join(publicDir, targetDir), { recursive: true });
        
        // 移动文件
        await fs.rename(sourcePath, targetPath);
        movedCount++;
        
        console.log(`✅ 移动: ${fileName} → ${targetDir}/`);
        
      } catch (error) {
        console.error(`❌ 移动失败: ${imageFile} - ${error.message}`);
      }
    }
    
    console.log(`\n🎉 图片整理完成！共移动 ${movedCount} 个文件`);
    
    // 显示新的目录结构
    console.log('\n📂 当前图片目录结构:');
    await showImageStructure();
    
  } catch (error) {
    console.error('❌ 整理过程失败:', error.message);
  }
}

async function showImageStructure() {
  const imageDir = './public/images';
  
  try {
    await walkDirectory(imageDir, '');
  } catch (error) {
    console.log('⚠️  图片目录不存在或为空');
  }
}

async function walkDirectory(dir, prefix) {
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = join(dir, item.name);
      
      if (item.isDirectory()) {
        console.log(`${prefix}📁 ${item.name}/`);
        await walkDirectory(itemPath, prefix + '  ');
      } else {
        const size = await fs.stat(itemPath);
        const sizeKB = Math.round(size.size / 1024);
        console.log(`${prefix}📷 ${item.name} (${sizeKB}KB)`);
      }
    }
  } catch (error) {
    console.log(`${prefix}⚠️  无法读取目录: ${dir}`);
  }
}

// 运行整理
organizeImages();
