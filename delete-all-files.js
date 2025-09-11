import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ihkdquydhciabhrwffkb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'imacx-media';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function getAllFiles(prefix = '', allFiles = []) {
    const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: 1000 });

    if (error) throw error;

    for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        
        if (item.id === null) {
            // 文件夹，递归扫描
            await getAllFiles(fullPath, allFiles);
        } else {
            // 文件
            allFiles.push(fullPath);
        }
    }

    return allFiles;
}

async function deleteAllFiles() {
    try {
        console.log('🗑️ 开始删除所有文件...');
        
        // 获取所有文件
        const allFiles = await getAllFiles();
        console.log(`📊 找到 ${allFiles.length} 个文件需要删除`);
        
        if (allFiles.length === 0) {
            console.log('✅ 存储桶已经是空的！');
            return;
        }
        
        // 分批删除
        const batchSize = 50;
        let deletedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < allFiles.length; i += batchSize) {
            const batch = allFiles.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(allFiles.length / batchSize);
            
            console.log(`\n🔄 处理批次 ${batchNum}/${totalBatches} (${batch.length} 个文件):`);
            
            try {
                const { error } = await supabaseAdmin.storage
                    .from(STORAGE_BUCKET)
                    .remove(batch);

                if (error) {
                    console.error(`❌ 批次 ${batchNum} 删除失败:`, error.message);
                    failedCount += batch.length;
                    batch.forEach(file => console.log(`  ❌ ${file}`));
                } else {
                    console.log(`✅ 批次 ${batchNum} 成功删除 ${batch.length} 个文件`);
                    deletedCount += batch.length;
                    batch.forEach(file => console.log(`  ✅ ${file}`));
                }
            } catch (error) {
                console.error(`💥 批次 ${batchNum} 执行异常:`, error.message);
                failedCount += batch.length;
            }
            
            // 显示进度
            const progress = ((i + batch.length) / allFiles.length * 100).toFixed(1);
            console.log(`📈 进度: ${progress}%`);
            
            // 小延迟避免API限制
            if (i + batchSize < allFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        console.log('\n📊 删除结果汇总:');
        console.log(`✅ 成功删除: ${deletedCount} 个文件`);
        console.log(`❌ 删除失败: ${failedCount} 个文件`);
        console.log(`📊 总计处理: ${deletedCount + failedCount} 个文件`);
        
        // 验证清理结果
        console.log('\n🔍 验证清理结果...');
        const remainingFiles = await getAllFiles();
        if (remainingFiles.length === 0) {
            console.log('🎉 存储桶已完全清理干净！');
        } else {
            console.log(`⚠️ 还有 ${remainingFiles.length} 个文件未删除:`);
            remainingFiles.forEach(file => console.log(`  - ${file}`));
        }
        
    } catch (error) {
        console.error('💥 删除过程出现错误:', error.message);
        process.exit(1);
    }
}

deleteAllFiles();
